use wfm_erlang::{
    apply_shrinkage, staff_for_interval, staffing_metrics_for_agents, Error, Model, Solver,
    SolverLimits, StaffingInput, StaffingMetrics,
};

fn standard_input() -> StaffingInput {
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

fn close(actual: f64, expected: f64, tolerance: f64) {
    assert!(
        actual.is_finite() && (actual - expected).abs() <= tolerance,
        "actual {actual:.17e}, expected {expected:.17e}, tolerance {tolerance:.2e}"
    );
}

fn probabilities_are_valid(metrics: &StaffingMetrics) {
    for value in [
        metrics.service_level,
        metrics.percent_answered_immediately,
        metrics.abandon_percent,
    ] {
        assert!(value.is_finite() && (0.0..=1.0).contains(&value));
    }
    assert!(metrics.occupancy.is_finite() && metrics.occupancy >= 0.0);
    assert!(!metrics.average_speed_of_answer_seconds.is_nan());
    assert!(metrics.average_speed_of_answer_seconds >= 0.0);
}

// Expected values were recorded from the original Python engine.
// Keep these independent of the live solver, with 1e-12 absolute/relative tolerance.
#[test]
fn supplied_reference_staffing_vectors() {
    let cases = [
        (
            Model::ErlangC,
            false,
            8,
            [
                0.8801483107665521,
                0.625,
                20.071980799410795,
                0.8327334933382433,
                0.03388132409467233,
            ],
        ),
        (
            Model::ErlangA,
            false,
            7,
            [
                0.8558403249585248,
                0.6664094124555114,
                9.136773632491865,
                0.7891002544153936,
                0.06702682256228387,
            ],
        ),
        (
            Model::ErlangC,
            true,
            19,
            [
                0.9291722045822274,
                0.7017543859649124,
                5.470967268662409,
                0.8966595071474879,
                0.01464791507877412,
            ],
        ),
        (
            Model::ErlangA,
            true,
            18,
            [
                0.9334394265626961,
                0.7232408024599135,
                2.3348216891551137,
                0.8905782184505971,
                0.023624916679117036,
            ],
        ),
    ];
    for (model, strict, expected_staff, expected) in cases {
        let mut input = standard_input();
        if strict {
            input.calls_offered = 80.0;
            input.avg_handle_time_seconds = 300.0;
            input.target_service_level = 0.9;
            input.service_level_answer_time_seconds = 20.0;
            input.avg_caller_patience_seconds = 120.0;
        }
        let result = staff_for_interval(&input, model).unwrap();
        assert_eq!(result.required_staff, expected_staff);
        close(result.service_level, expected[0], 1e-12);
        close(result.occupancy, expected[1], 1e-12);
        close(
            result.average_speed_of_answer_seconds,
            expected[2],
            1e-12 * expected[2].abs().max(1.0),
        );
        close(result.percent_answered_immediately, expected[3], 1e-12);
        close(result.abandon_percent, expected[4], 1e-12);
    }
}

#[test]
fn zero_demand_and_zero_agents_have_explicit_semantics() {
    for model in [Model::ErlangC, Model::ErlangA] {
        let mut input = standard_input();
        let no_agents = staffing_metrics_for_agents(&input, 0, model).unwrap();
        assert_eq!(no_agents.required_staff, 0);
        assert_eq!(no_agents.service_level, 0.0);
        assert_eq!(no_agents.occupancy, 1.0);
        assert_eq!(no_agents.percent_answered_immediately, 0.0);
        assert_eq!(no_agents.abandon_percent, 1.0);
        assert_eq!(no_agents.average_speed_of_answer_seconds, f64::INFINITY);

        input.calls_offered = 0.0;
        assert_eq!(staff_for_interval(&input, model).unwrap().required_staff, 0);
        for agents in [0, 7] {
            let zero = staffing_metrics_for_agents(&input, agents, model).unwrap();
            assert_eq!(zero.required_staff, agents);
            assert_eq!(zero.service_level, 1.0);
            assert_eq!(zero.occupancy, 0.0);
            assert_eq!(zero.percent_answered_immediately, 1.0);
            assert_eq!(zero.abandon_percent, 0.0);
            assert_eq!(zero.average_speed_of_answer_seconds, 0.0);
        }
    }
}

#[test]
fn erlang_c_matches_the_single_server_closed_form() {
    let mut input = standard_input();
    input.calls_offered = 2.0;
    input.interval_duration_seconds = 100.0;
    input.avg_handle_time_seconds = 20.0;
    input.service_level_answer_time_seconds = 15.0;
    let result = staffing_metrics_for_agents(&input, 1, Model::ErlangC).unwrap();
    let load: f64 = 0.4;
    let delay_rate: f64 = 0.05 - 0.02;
    close(result.occupancy, load, 1e-14);
    close(result.percent_answered_immediately, 1.0 - load, 1e-14);
    close(
        result.service_level,
        1.0 - load * (-delay_rate * 15.0).exp(),
        1e-14,
    );
    close(
        result.average_speed_of_answer_seconds,
        load / delay_rate,
        1e-12,
    );
}

#[test]
fn erlang_a_equal_service_and_patience_rates_match_poisson_closed_form() {
    // With one server and mu == theta the total departure rate in state n is
    // n * mu, so the stationary population is Poisson with mean offered_load.
    // P(immediate) = P(N=0); served flow = mu * P(N>0).
    for load in [0.001, 0.4, 1.0, 5.0, 50.0] {
        let mut input = standard_input();
        input.calls_offered = load;
        input.interval_duration_seconds = 60.0;
        input.avg_handle_time_seconds = 60.0;
        input.avg_caller_patience_seconds = 60.0;
        let result = staffing_metrics_for_agents(&input, 1, Model::ErlangA).unwrap();
        let busy = -(-load).exp_m1();
        close(result.percent_answered_immediately, (-load).exp(), 2e-12);
        close(result.occupancy, busy, 2e-12);
        close(result.abandon_percent, 1.0 - busy / load, 2e-12);
    }
}

#[test]
fn a_single_server_service_level_matches_an_independent_closed_form() {
    // When mu == theta and there is one server, P(N=n) is Poisson(load).
    // Summing the conditional waiting CDF over that population gives
    // SL(t) = y * exp(-load*y) + (exp(-load*y) - exp(-load)) / load,
    // where y = exp(-mu*t). exp_m1 keeps the subtraction accurate near t=0.
    for load in [0.001, 0.4, 1.0, 5.0, 50.0] {
        for threshold in [0.0, 1e-8, 1.0, 40.0, 300.0, 100_000.0] {
            let mut input = standard_input();
            input.calls_offered = load;
            input.interval_duration_seconds = 60.0;
            input.avg_handle_time_seconds = 60.0;
            input.avg_caller_patience_seconds = 60.0;
            input.service_level_answer_time_seconds = threshold;
            let y = (-threshold / 60.0).exp();
            let x = -(-threshold / 60.0).exp_m1();
            let expected = (-load * y).exp() * (y - (-load * x).exp_m1() / load);
            let result = staffing_metrics_for_agents(&input, 1, Model::ErlangA).unwrap();
            close(result.service_level, expected, 2e-12);
        }
    }
}

#[test]
fn c_uses_a_abandonment_while_other_c_metrics_ignore_patience() {
    for agents in [1, 5, 8, 20] {
        let input = standard_input();
        let c = staffing_metrics_for_agents(&input, agents, Model::ErlangC).unwrap();
        let a = staffing_metrics_for_agents(&input, agents, Model::ErlangA).unwrap();
        close(c.abandon_percent, a.abandon_percent, 2e-12);

        let mut more_patient = standard_input();
        more_patient.avg_caller_patience_seconds *= 10.0;
        let patient = staffing_metrics_for_agents(&more_patient, agents, Model::ErlangC).unwrap();
        assert_eq!(c.service_level, patient.service_level);
        assert_eq!(c.occupancy, patient.occupancy);
        assert_eq!(
            c.average_speed_of_answer_seconds,
            patient.average_speed_of_answer_seconds
        );
        assert_eq!(
            c.percent_answered_immediately,
            patient.percent_answered_immediately
        );
        assert!(patient.abandon_percent <= c.abandon_percent + 1e-12);
    }
}

#[test]
fn high_load_that_overflowed_python_is_finite_and_conserves_flow() {
    let mut input = standard_input();
    input.calls_offered = 6000.0; // Offered load 1200; raw stationary weights overflow.
    for agents in [800, 1200, 1500] {
        for model in [Model::ErlangC, Model::ErlangA] {
            let result = staffing_metrics_for_agents(&input, agents, model).unwrap();
            probabilities_are_valid(&result);
            if matches!(model, Model::ErlangA) {
                assert!(result.average_speed_of_answer_seconds.is_finite());
                assert!(result.occupancy <= 1.0);
                let served_fraction = result.occupancy * agents as f64 / 1200.0;
                close(served_fraction + result.abandon_percent, 1.0, 2e-11);
                assert!(result.service_level <= served_fraction + 2e-11);
            }
        }
    }
}

#[test]
fn a_conserves_flow_and_improves_with_more_agents() {
    for (calls, patience) in [(2.0, 2.0), (25.0, 180.0), (100.0, 900.0)] {
        let mut input = standard_input();
        input.calls_offered = calls;
        input.avg_caller_patience_seconds = patience;
        let load = calls * input.avg_handle_time_seconds / input.interval_duration_seconds;
        let mut previous = staffing_metrics_for_agents(&input, 0, Model::ErlangA).unwrap();
        for agents in 1..=35 {
            let result = staffing_metrics_for_agents(&input, agents, Model::ErlangA).unwrap();
            probabilities_are_valid(&result);
            close(
                result.occupancy * agents as f64 / load + result.abandon_percent,
                1.0,
                2e-11,
            );
            assert!(result.service_level + 2e-11 >= previous.service_level);
            assert!(result.occupancy <= previous.occupancy + 2e-11);
            assert!(result.abandon_percent <= previous.abandon_percent + 2e-11);
            assert!(
                result.average_speed_of_answer_seconds
                    <= previous.average_speed_of_answer_seconds + 2e-9
            );
            assert!(result.service_level <= 1.0 - result.abandon_percent + 2e-11);
            previous = result;
        }
    }
}

#[test]
fn staffing_search_returns_the_minimum_feasible_integer() {
    for model in [Model::ErlangC, Model::ErlangA] {
        for (calls, goal, max_occupancy, threshold) in [
            (0.01, 0.8, 0.85, 40.0),
            (25.0, 0.8, 0.85, 40.0),
            (25.0, 0.95, 0.99, 0.0),
            (80.0, 0.9, 0.6, 20.0),
            (300.0, 0.7, 0.9, 100.0),
        ] {
            let mut input = standard_input();
            input.calls_offered = calls;
            input.target_service_level = goal;
            input.max_occupancy = max_occupancy;
            input.service_level_answer_time_seconds = threshold;
            let result = staff_for_interval(&input, model).unwrap();
            assert!(result.service_level >= goal);
            assert!(result.occupancy <= max_occupancy);
            assert!(result.required_staff > 0);
            for agents in 0..result.required_staff {
                let lower = staffing_metrics_for_agents(&input, agents, model).unwrap();
                assert!(lower.service_level < goal || lower.occupancy > max_occupancy);
            }
        }
    }
}

#[test]
fn a_threshold_probability_starts_at_immediate_and_approaches_served() {
    let mut input = standard_input();
    let mut previous = 0.0;
    for threshold in [0.0, 1e-8, 0.1, 40.0, 300.0, 100_000.0] {
        input.service_level_answer_time_seconds = threshold;
        let result = staffing_metrics_for_agents(&input, 5, Model::ErlangA).unwrap();
        assert!(result.service_level >= previous - 1e-12);
        assert!(result.service_level <= 1.0 - result.abandon_percent + 2e-11);
        if threshold == 0.0 {
            assert_eq!(result.service_level, result.percent_answered_immediately);
        }
        if threshold == 100_000.0 {
            close(result.service_level, 1.0 - result.abandon_percent, 2e-11);
        }
        previous = result.service_level;
    }
}

#[test]
fn changing_time_units_preserves_probabilities_and_scales_asa() {
    for model in [Model::ErlangC, Model::ErlangA] {
        let original = staffing_metrics_for_agents(&standard_input(), 8, model).unwrap();
        for scale in [0.001, 60.0, 1e6] {
            let mut input = standard_input();
            input.interval_duration_seconds *= scale;
            input.avg_handle_time_seconds *= scale;
            input.avg_caller_patience_seconds *= scale;
            input.service_level_answer_time_seconds *= scale;
            let scaled = staffing_metrics_for_agents(&input, 8, model).unwrap();
            close(scaled.service_level, original.service_level, 2e-12);
            close(scaled.occupancy, original.occupancy, 2e-12);
            close(scaled.abandon_percent, original.abandon_percent, 2e-12);
            close(
                scaled.percent_answered_immediately,
                original.percent_answered_immediately,
                2e-12,
            );
            close(
                scaled.average_speed_of_answer_seconds / scale,
                original.average_speed_of_answer_seconds,
                2e-9,
            );
        }
    }
}

#[test]
fn c_is_unstable_at_or_above_capacity_but_a_can_still_serve() {
    for agents in [2, 5] {
        let c = staffing_metrics_for_agents(&standard_input(), agents, Model::ErlangC).unwrap();
        assert_eq!(c.service_level, 0.0);
        assert_eq!(c.percent_answered_immediately, 0.0);
        assert_eq!(c.average_speed_of_answer_seconds, f64::INFINITY);
        assert!(c.occupancy >= 1.0);
        let a = staffing_metrics_for_agents(&standard_input(), agents, Model::ErlangA).unwrap();
        assert!(a.service_level > 0.0);
        assert!(a.average_speed_of_answer_seconds.is_finite());
    }
}

#[test]
fn invalid_and_non_finite_inputs_are_rejected_by_both_entrypoints() {
    type Setter = fn(&mut StaffingInput, f64);
    let fields: [(Setter, &[f64]); 7] = [
        (|i, v| i.calls_offered = v, &[-1.0]),
        (|i, v| i.interval_duration_seconds = v, &[0.0, -1.0]),
        (|i, v| i.avg_handle_time_seconds = v, &[0.0, -1.0]),
        (|i, v| i.target_service_level = v, &[0.0, -1.0, 1.01]),
        (|i, v| i.service_level_answer_time_seconds = v, &[-1.0]),
        (|i, v| i.max_occupancy = v, &[0.0, -1.0, 1.01]),
        (|i, v| i.avg_caller_patience_seconds = v, &[0.0, -1.0]),
    ];
    for (set, invalid) in fields {
        for value in invalid
            .iter()
            .copied()
            .chain([f64::NAN, f64::INFINITY, f64::NEG_INFINITY])
        {
            let mut input = standard_input();
            set(&mut input, value);
            for model in [Model::ErlangC, Model::ErlangA] {
                assert!(staff_for_interval(&input, model).is_err());
                assert!(staffing_metrics_for_agents(&input, 8, model).is_err());
            }
        }
    }
}

#[test]
fn shrinkage_rounds_up_and_rejects_invalid_values() {
    assert_eq!(apply_shrinkage(0, 0.3).unwrap(), 0);
    assert_eq!(apply_shrinkage(8, 0.0).unwrap(), 8);
    assert_eq!(apply_shrinkage(8, 0.3).unwrap(), 12);
    assert_eq!(apply_shrinkage(12, 0.25).unwrap(), 16);
    for value in [-0.1, 1.0, 1.1, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
        assert!(apply_shrinkage(8, value).is_err());
    }
    assert!(apply_shrinkage(usize::MAX, 0.5).is_err());
}

#[test]
fn staffing_search_evaluates_the_exact_agent_limit() {
    for (model, required) in [(Model::ErlangC, 8), (Model::ErlangA, 7)] {
        let input = standard_input();
        let limits = SolverLimits {
            max_agents: required,
            ..SolverLimits::default()
        };
        let mut solver = Solver::new(limits).unwrap();
        assert_eq!(
            solver
                .staff_for_interval(&input, model)
                .unwrap()
                .required_staff,
            required
        );
        assert_eq!(
            solver.staffing_metrics_for_agents(&input, required + 1, model),
            Err(Error::AgentLimit { limit: required })
        );
        let mut insufficient = Solver::new(SolverLimits {
            max_agents: required - 1,
            ..limits
        })
        .unwrap();
        assert_eq!(
            insufficient.staff_for_interval(&input, model),
            Err(Error::NoFeasibleStaffing {
                max_agents: required - 1
            })
        );
    }
}

#[test]
fn invalid_solver_limits_and_unconverged_distributions_return_errors() {
    let defaults = SolverLimits::default();
    for limits in [
        SolverLimits {
            max_agents: 0,
            ..defaults
        },
        SolverLimits {
            max_agents: usize::MAX,
            ..defaults
        },
        SolverLimits {
            max_states: 0,
            ..defaults
        },
        SolverLimits {
            max_states: usize::MAX,
            ..defaults
        },
        SolverLimits {
            tail_tolerance: 0.0,
            ..defaults
        },
        SolverLimits {
            tail_tolerance: f64::NAN,
            ..defaults
        },
        SolverLimits {
            tail_tolerance: f64::INFINITY,
            ..defaults
        },
        SolverLimits {
            tail_tolerance: 0.1,
            ..defaults
        },
    ] {
        assert!(Solver::new(limits).is_err());
    }
    let mut limited = Solver::new(SolverLimits {
        max_states: 2,
        ..defaults
    })
    .unwrap();
    assert_eq!(
        limited.staffing_metrics_for_agents(&standard_input(), 8, Model::ErlangA),
        Err(Error::StateLimit { limit: 2 })
    );
}

#[test]
fn high_load_staffing_search_is_feasible_and_minimal() {
    let mut input = standard_input();
    input.calls_offered = 18_000.0;
    for model in [Model::ErlangC, Model::ErlangA] {
        let result = staff_for_interval(&input, model).unwrap();
        probabilities_are_valid(&result);
        assert!(result.service_level >= input.target_service_level);
        assert!(result.occupancy <= input.max_occupancy);
        assert!(result.average_speed_of_answer_seconds.is_finite());
        let lower = staffing_metrics_for_agents(&input, result.required_staff - 1, model).unwrap();
        assert!(
            lower.service_level < input.target_service_level
                || lower.occupancy > input.max_occupancy
        );
        let explicit = staffing_metrics_for_agents(&input, result.required_staff, model).unwrap();
        assert_eq!(result, explicit);
    }
}

#[test]
fn long_patience_search_skips_provably_infeasible_enormous_queues() {
    let input = StaffingInput {
        calls_offered: 100.0,
        interval_duration_seconds: 1.0,
        avg_handle_time_seconds: 1.0,
        target_service_level: 0.8,
        service_level_answer_time_seconds: 0.1,
        max_occupancy: 0.85,
        avg_caller_patience_seconds: 10_000_000.0,
    };
    let result = staff_for_interval(&input, Model::ErlangA).unwrap();
    assert_eq!(result.required_staff, 118);
    let previous = staffing_metrics_for_agents(&input, 117, Model::ErlangA).unwrap();
    assert!(previous.occupancy > input.max_occupancy);
}

#[test]
fn extreme_finite_rates_do_not_overflow_intermediate_departures() {
    let input = StaffingInput {
        calls_offered: 1e308,
        interval_duration_seconds: 1.0,
        avg_handle_time_seconds: 1.0,
        target_service_level: 0.8,
        service_level_answer_time_seconds: 1.0,
        max_occupancy: 0.85,
        avg_caller_patience_seconds: 1e-308,
    };
    for model in [Model::ErlangC, Model::ErlangA] {
        let result = staffing_metrics_for_agents(&input, 1, model).unwrap();
        probabilities_are_valid(&result);
        close(result.abandon_percent, 1.0, 1e-14);
        if model == Model::ErlangA {
            close(result.occupancy, 1.0, 1e-14);
        }
    }
}

#[test]
fn stable_near_capacity_c_is_independent_of_absolute_time_scale() {
    let input = StaffingInput {
        calls_offered: 0.99999,
        interval_duration_seconds: 1e6,
        avg_handle_time_seconds: 1e6,
        target_service_level: 0.8,
        service_level_answer_time_seconds: 100.0,
        max_occupancy: 1.0,
        avg_caller_patience_seconds: 1e6,
    };
    let result = staffing_metrics_for_agents(&input, 1, Model::ErlangC).unwrap();
    assert!(result.average_speed_of_answer_seconds.is_finite());
    assert!(result.service_level > 0.0);

    // Preserve the corrected small-rate case formerly held in the v2 reference.
    let scaled = StaffingInput {
        calls_offered: 0.5,
        interval_duration_seconds: 1e12,
        avg_handle_time_seconds: 1e12,
        service_level_answer_time_seconds: 0.0,
        avg_caller_patience_seconds: 1e12,
        ..input
    };
    let result = staffing_metrics_for_agents(&scaled, 1, Model::ErlangC).unwrap();
    close(result.service_level, 0.5, 1e-12);
    close(result.occupancy, 0.5, 1e-12);
    close(result.percent_answered_immediately, 0.5, 1e-12);
    close(result.average_speed_of_answer_seconds, 1e12, 1.0);
    close(result.abandon_percent, 0.21306131942526685, 1e-12);
}

#[test]
#[cfg(target_pointer_width = "64")]
fn shrinkage_rejects_unrepresentable_integers_without_changing_zero_shrinkage() {
    assert_eq!(apply_shrinkage(usize::MAX, 0.0).unwrap(), usize::MAX);
    assert!(apply_shrinkage((1_usize << 53) + 1, 0.01).is_err());
    assert!(apply_shrinkage(1_usize << 53, 0.5).is_err());
    // Retain Python floating-point rounding before ceil at common boundaries.
    assert_eq!(apply_shrinkage(7, 0.3).unwrap(), 10);
}
