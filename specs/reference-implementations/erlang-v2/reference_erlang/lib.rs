//! Dependency-free Erlang C/A engine used by the native Rust API. See the crate README for metric
//! definitions, numerical differences from the reference, and resource bounds.
//!
//! ```
//! use wfm_erlang::{staff_for_interval, Model, StaffingInput};
//! let input = StaffingInput {
//!     calls_offered: 25.0, interval_duration_seconds: 1800.0,
//!     avg_handle_time_seconds: 360.0, target_service_level: 0.8,
//!     service_level_answer_time_seconds: 40.0, max_occupancy: 0.85,
//!     avg_caller_patience_seconds: 180.0,
//! };
//! assert_eq!(staff_for_interval(&input, Model::ErlangC)?.required_staff, 8);
//! # Ok::<(), wfm_erlang::Error>(())
//! ```

mod erlang_a;
mod erlang_c;
mod math;
mod negative_binomial;
mod payload;
mod types;

pub use payload::{apply_shrinkage, build_results_payload, ResultsPayload, Scenario, Summary};
pub use types::{Error, Model, SolverLimits, StaffingInput, StaffingMetrics};

struct Prepared {
    load: f64,
    patience: f64,
    target_time: f64,
}

impl Prepared {
    fn new(input: &StaffingInput) -> Result<Self, Error> {
        for (value, name) in [
            (input.calls_offered, "calls_offered must be finite and >= 0"),
            (
                input.service_level_answer_time_seconds,
                "service_level_answer_time_seconds must be finite and >= 0",
            ),
        ] {
            if !value.is_finite() || value < 0.0 {
                return Err(Error::InvalidInput(name));
            }
        }
        for (value, name) in [
            (
                input.interval_duration_seconds,
                "interval_duration_seconds must be finite and > 0",
            ),
            (
                input.avg_handle_time_seconds,
                "avg_handle_time_seconds must be finite and > 0",
            ),
            (
                input.avg_caller_patience_seconds,
                "avg_caller_patience_seconds must be finite and > 0",
            ),
        ] {
            if !value.is_finite() || value <= 0.0 {
                return Err(Error::InvalidInput(name));
            }
        }
        for (value, name) in [
            (
                input.target_service_level,
                "target_service_level must be in (0, 1]",
            ),
            (input.max_occupancy, "max_occupancy must be in (0, 1]"),
        ] {
            if !value.is_finite() || value <= 0.0 || value > 1.0 {
                return Err(Error::InvalidInput(name));
            }
        }
        let load =
            input.calls_offered / input.interval_duration_seconds * input.avg_handle_time_seconds;
        let patience = input.avg_handle_time_seconds / input.avg_caller_patience_seconds;
        let target_time = input.service_level_answer_time_seconds / input.avg_handle_time_seconds;
        if !load.is_finite()
            || (input.calls_offered > 0.0 && load <= 0.0)
            || !patience.is_finite()
            || patience <= 0.0
            || !target_time.is_finite()
        {
            return Err(Error::NumericalFailure(
                "derived load or time ratios exceed floating-point range",
            ));
        }
        Ok(Self {
            load,
            patience,
            target_time,
        })
    }
}

/// Reuses stationary-distribution and waiting-time storage across dataset rows.
/// It has no global state; use one solver per worker for parallel calculations.
/// Custom limits allow 1..=1,000,000 agents, 2..=10,000,000 stationary states,
/// and a stationary tail tolerance in [1e-15, 1e-6]. Waiting-time calculations
/// independently cap queue positions and extra tail terms at 1,000,000 each.
#[derive(Default)]
pub struct Solver {
    limits: SolverLimits,
    weights: Vec<f64>,
    waiting: negative_binomial::WaitingTimeScratch,
}

impl Solver {
    pub fn new(limits: SolverLimits) -> Result<Self, Error> {
        if limits.max_agents == 0
            || limits.max_agents > 1_000_000
            || limits.max_states < 2
            || limits.max_states > 10_000_000
            || !limits.tail_tolerance.is_finite()
            || limits.tail_tolerance < 1e-15
            || limits.tail_tolerance > 1e-6
        {
            return Err(Error::InvalidInput(
                "invalid solver limits (see Solver documentation)",
            ));
        }
        Ok(Self {
            limits,
            weights: Vec::new(),
            waiting: negative_binomial::WaitingTimeScratch::default(),
        })
    }

    /// Release retained numerical buffers after a dataset or an unusually large
    /// row. The solver remains usable with the same limits. Ordinary row loops
    /// should keep the buffers to avoid repeated allocation.
    pub fn release_buffers(&mut self) {
        self.weights = Vec::new();
        self.waiting.release_buffers();
    }

    /// Erlang A abandonment fraction for a supplied staffing level. This is
    /// also the abandonment estimate reported by Erlang C. No staffing search,
    /// service-level CDF, or ASA is calculated. The whole input record is
    /// validated consistently with `staffing_metrics_for_agents`.
    pub fn abandonment_for_agents(
        &mut self,
        input: &StaffingInput,
        agents: usize,
    ) -> Result<f64, Error> {
        let prepared = Prepared::new(input)?;
        self.check_agents(agents)?;
        if input.calls_offered == 0.0 {
            return Ok(0.0);
        }
        if agents == 0 {
            return Ok(1.0);
        }
        erlang_a::distribution(
            prepared.load,
            prepared.patience,
            agents,
            self.limits,
            &mut self.weights,
        )?;
        Ok(erlang_a::abandonment(
            &self.weights,
            prepared.patience,
            agents,
        ))
    }

    pub fn staffing_metrics_for_agents(
        &mut self,
        input: &StaffingInput,
        agents: usize,
        model: Model,
    ) -> Result<StaffingMetrics, Error> {
        let prepared = Prepared::new(input)?;
        self.metrics(input, &prepared, agents, model)
    }

    pub fn staff_for_interval(
        &mut self,
        input: &StaffingInput,
        model: Model,
    ) -> Result<StaffingMetrics, Error> {
        let prepared = Prepared::new(input)?;
        if input.calls_offered == 0.0 {
            return self.metrics(input, &prepared, 0, model);
        }
        // Necessary occupancy bound: C serves all demand. A must at least serve
        // the target fraction of arrivals. floor deliberately errs downward.
        let fraction = if model == Model::ErlangC {
            1.0
        } else {
            input.target_service_level
        };
        let bound = (prepared.load * fraction / input.max_occupancy).floor();
        if bound > self.limits.max_agents as f64 {
            return Err(Error::NoFeasibleStaffing {
                max_agents: self.limits.max_agents,
            });
        }
        let mut lower = (bound as usize).saturating_sub(1);
        let mut upper = (lower + 1).max(1);
        loop {
            if self.feasible_candidate(input, &prepared, upper, model)? {
                break;
            }
            lower = upper;
            if upper == self.limits.max_agents {
                return Err(Error::NoFeasibleStaffing {
                    max_agents: self.limits.max_agents,
                });
            }
            upper = upper.saturating_mul(2).min(self.limits.max_agents);
        }
        while lower + 1 < upper {
            let candidate = lower + (upper - lower) / 2;
            if self.feasible_candidate(input, &prepared, candidate, model)? {
                upper = candidate;
            } else {
                lower = candidate;
            }
        }
        // Trial calculations only determine feasibility. Compute the complete
        // result once, at the verified minimum staffing level.
        self.metrics(input, &prepared, upper, model)
    }

    fn feasible_candidate(
        &mut self,
        input: &StaffingInput,
        prepared: &Prepared,
        agents: usize,
        model: Model,
    ) -> Result<bool, Error> {
        if model == Model::ErlangC {
            return Ok(prepared.load / agents as f64 <= input.max_occupancy
                && erlang_c::service_level(prepared.load, prepared.target_time, agents)
                    >= input.target_service_level);
        }
        match erlang_a::distribution(
            prepared.load,
            prepared.patience,
            agents,
            self.limits,
            &mut self.weights,
        ) {
            Ok(()) => (),
            Err(Error::StateLimit { .. })
                if erlang_c::loss_system_occupancy(prepared.load, agents)
                    > input.max_occupancy + 64.0 * f64::EPSILON =>
            {
                // Very patient callers can create millions of queued states
                // at an infeasible trial staffing level. The loss-system lower
                // bound proves this trial fails without enumerating its queue.
                return Ok(false);
            }
            Err(error) => return Err(error),
        }
        let summary = erlang_a::state_summary(&self.weights, agents);
        if summary.occupancy > input.max_occupancy {
            return Ok(false);
        }
        let positions = self.weights.len().saturating_sub(agents);
        let cdfs = self.waiting.service_cdfs(
            agents as f64,
            prepared.patience,
            prepared.target_time,
            positions,
        )?;
        Ok(erlang_a::service_level(
            &self.weights,
            prepared.patience,
            agents,
            summary.immediate,
            cdfs,
        ) >= input.target_service_level)
    }

    fn check_agents(&self, agents: usize) -> Result<(), Error> {
        if agents > self.limits.max_agents {
            return Err(Error::AgentLimit {
                limit: self.limits.max_agents,
            });
        }
        Ok(())
    }

    fn metrics(
        &mut self,
        input: &StaffingInput,
        prepared: &Prepared,
        agents: usize,
        model: Model,
    ) -> Result<StaffingMetrics, Error> {
        self.check_agents(agents)?;
        if input.calls_offered == 0.0 {
            return Ok(StaffingMetrics {
                required_staff: agents,
                service_level: 1.0,
                occupancy: 0.0,
                average_speed_of_answer_seconds: 0.0,
                percent_answered_immediately: 1.0,
                abandon_percent: 0.0,
            });
        }
        if agents == 0 {
            return Ok(StaffingMetrics {
                required_staff: 0,
                service_level: 0.0,
                occupancy: 1.0,
                average_speed_of_answer_seconds: f64::INFINITY,
                percent_answered_immediately: 0.0,
                abandon_percent: 1.0,
            });
        }
        match model {
            Model::ErlangC => {
                let mut metrics = erlang_c::metrics(
                    prepared.load,
                    input.avg_handle_time_seconds,
                    prepared.target_time,
                    agents,
                );
                erlang_a::distribution(
                    prepared.load,
                    prepared.patience,
                    agents,
                    self.limits,
                    &mut self.weights,
                )?;
                metrics.abandon_percent =
                    erlang_a::abandonment(&self.weights, prepared.patience, agents);
                Ok(metrics)
            }
            Model::ErlangA => {
                erlang_a::distribution(
                    prepared.load,
                    prepared.patience,
                    agents,
                    self.limits,
                    &mut self.weights,
                )?;
                erlang_a::metrics(
                    &self.weights,
                    prepared.patience,
                    input.avg_handle_time_seconds,
                    prepared.target_time,
                    agents,
                    &mut self.waiting,
                )
            }
        }
    }
}

pub fn staffing_metrics_for_agents(
    input: &StaffingInput,
    agents: usize,
    model: Model,
) -> Result<StaffingMetrics, Error> {
    Solver::default().staffing_metrics_for_agents(input, agents, model)
}

pub fn staff_for_interval(input: &StaffingInput, model: Model) -> Result<StaffingMetrics, Error> {
    Solver::default().staff_for_interval(input, model)
}

/// Convenience form of [`Solver::abandonment_for_agents`]. Reuse a `Solver`
/// directly when evaluating multiple rows to retain its calculation buffers.
pub fn abandonment_for_agents(input: &StaffingInput, agents: usize) -> Result<f64, Error> {
    Solver::default().abandonment_for_agents(input, agents)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input() -> StaffingInput {
        StaffingInput {
            calls_offered: 25.0,
            interval_duration_seconds: 1800.0,
            avg_handle_time_seconds: 360.0,
            target_service_level: 0.8,
            service_level_answer_time_seconds: 40.0,
            max_occupancy: 0.85,
            avg_caller_patience_seconds: 180.0,
        }
    }

    #[test]
    fn abandonment_only_never_allocates_waiting_buffers() {
        let mut solver = Solver::default();
        let input = input();
        for agents in [0, 2, 7, 30] {
            let actual = solver.abandonment_for_agents(&input, agents).unwrap();
            let expected = staffing_metrics_for_agents(&input, agents, Model::ErlangA).unwrap();
            assert_eq!(actual, expected.abandon_percent);
            assert_eq!(solver.waiting.capacities(), (0, 0));
        }
    }

    #[test]
    fn occupancy_rejected_trials_do_not_allocate_waiting_buffers() {
        let mut solver = Solver::default();
        let input = input();
        let prepared = Prepared::new(&input).unwrap();
        assert!(!solver
            .feasible_candidate(&input, &prepared, 2, Model::ErlangA)
            .unwrap());
        assert_eq!(solver.waiting.capacities(), (0, 0));
        assert!(solver
            .feasible_candidate(&input, &prepared, 8, Model::ErlangA)
            .unwrap());
        assert!(solver.waiting.capacities().0 > 0);
    }

    #[test]
    fn reused_solver_retains_then_releases_all_numerical_buffers() {
        let input = input();
        let mut solver = Solver::default();
        let expected = solver
            .staffing_metrics_for_agents(&input, 2, Model::ErlangA)
            .unwrap();
        let pointer = solver.weights.as_ptr();
        let capacity = solver.weights.capacity();
        let waiting_capacity = solver.waiting.capacities();
        assert!(waiting_capacity.0 > 0 && waiting_capacity.1 > 0);
        for _ in 0..10 {
            assert_eq!(
                solver
                    .staffing_metrics_for_agents(&input, 2, Model::ErlangA)
                    .unwrap(),
                expected
            );
            assert_eq!(solver.weights.as_ptr(), pointer);
            assert_eq!(solver.weights.capacity(), capacity);
            assert_eq!(solver.waiting.capacities(), waiting_capacity);
        }
        solver.release_buffers();
        assert_eq!(solver.weights.capacity(), 0);
        assert_eq!(solver.waiting.capacities(), (0, 0));
        assert_eq!(
            solver
                .staffing_metrics_for_agents(&input, 2, Model::ErlangA)
                .unwrap(),
            expected
        );
    }
}
