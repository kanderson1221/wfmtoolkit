use wfm_erlang::{abandonment_for_agents, Error, Model, Solver, SolverLimits, StaffingInput};

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

#[test]
fn abandonment_only_matches_both_full_models_at_supplied_staffing() {
    let standard = standard_input();
    let mut solver = Solver::default();
    for (calls, agents, patience, threshold) in [
        (0.0, 0, 180.0, 40.0),
        (0.0, 20, 180.0, 40.0),
        (25.0, 0, 180.0, 40.0),
        (25.0, 1, 180.0, 0.0),
        (25.0, 8, 180.0, 40.0),
        (25.0, 20, 180.0, 100_000.0),
        (0.01, 1, 360.0, 1e-8),
        (25.0, 8, 1_800_000.0, 40.0),
        (6000.0, 800, 180.0, 40.0),
        (6000.0, 1200, 180.0, 40.0),
        (6000.0, 1500, 180.0, 40.0),
    ] {
        let input = StaffingInput {
            calls_offered: calls,
            avg_caller_patience_seconds: patience,
            service_level_answer_time_seconds: threshold,
            ..standard
        };
        let abandonment = solver.abandonment_for_agents(&input, agents).unwrap();
        assert!((0.0..=1.0).contains(&abandonment));
        assert_eq!(abandonment, abandonment_for_agents(&input, agents).unwrap());
        for model in [Model::ErlangC, Model::ErlangA] {
            let metrics = solver
                .staffing_metrics_for_agents(&input, agents, model)
                .unwrap();
            assert_eq!(abandonment, metrics.abandon_percent);
        }
        if calls == 0.0 {
            assert_eq!(abandonment, 0.0);
        } else if agents == 0 {
            assert_eq!(abandonment, 1.0);
        }
    }
}

#[test]
fn abandonment_only_validates_all_input_fields_and_agent_limits() {
    type Setter = fn(&mut StaffingInput, f64);
    let fields: [(Setter, f64); 7] = [
        (|i, v| i.calls_offered = v, -1.0),
        (|i, v| i.interval_duration_seconds = v, 0.0),
        (|i, v| i.avg_handle_time_seconds = v, 0.0),
        (|i, v| i.target_service_level = v, 0.0),
        (|i, v| i.service_level_answer_time_seconds = v, -1.0),
        (|i, v| i.max_occupancy = v, 1.01),
        (|i, v| i.avg_caller_patience_seconds = v, 0.0),
    ];
    let mut solver = Solver::default();
    for (set, invalid) in fields {
        for value in [invalid, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let mut input = standard_input();
            set(&mut input, value);
            assert!(matches!(
                solver.abandonment_for_agents(&input, 8),
                Err(Error::InvalidInput(_))
            ));
            assert!(matches!(
                abandonment_for_agents(&input, 0),
                Err(Error::InvalidInput(_))
            ));
        }
    }
    let mut limited = Solver::new(SolverLimits {
        max_agents: 8,
        ..SolverLimits::default()
    })
    .unwrap();
    for calls in [0.0, 25.0] {
        let input = StaffingInput {
            calls_offered: calls,
            ..standard_input()
        };
        assert_eq!(
            limited.abandonment_for_agents(&input, 9),
            Err(Error::AgentLimit { limit: 8 })
        );
    }
}

#[test]
fn reused_solver_matches_fresh_solvers_across_sizes_models_and_errors() {
    let standard = standard_input();
    let limits = SolverLimits {
        max_states: 8000,
        ..SolverLimits::default()
    };
    let mut solver = Solver::new(limits).unwrap();
    // The large distribution grows scratch storage; the two state-limit errors
    // occur before and during distribution construction. Small later rows must
    // not observe any stale values left by a larger or failed calculation.
    for (calls, agents, patience) in [
        (25.0, 8, 180.0),
        (6000.0, 800, 180.0),
        (0.0, 0, 180.0),
        (0.01, 1, 360.0),
        (25.0, 1, 1_000_000.0),
        (39_500.0, 7900, 180.0),
        (-1.0, 8, 180.0),
        (25.0, 0, 180.0),
        (25.0, 8, 180.0),
        (25.0, 20, 180.0),
    ] {
        let input = StaffingInput {
            calls_offered: calls,
            avg_caller_patience_seconds: patience,
            ..standard
        };
        assert_eq!(
            solver.abandonment_for_agents(&input, agents),
            Solver::new(limits)
                .unwrap()
                .abandonment_for_agents(&input, agents)
        );
        for model in [Model::ErlangC, Model::ErlangA] {
            assert_eq!(
                solver.staffing_metrics_for_agents(&input, agents, model),
                Solver::new(limits)
                    .unwrap()
                    .staffing_metrics_for_agents(&input, agents, model)
            );
        }
    }
}

#[test]
fn reused_staffing_search_matches_full_metrics_at_the_minimum_staffing() {
    let mut solver = Solver::default();
    for (calls, goal, occupancy, threshold, patience) in [
        (25.0, 0.8, 0.85, 40.0, 180.0),
        (6000.0, 0.9, 0.9, 20.0, 180.0),
        (0.0, 0.8, 0.85, 40.0, 180.0),
        (25.0, 0.95, 0.99, 0.0, 180.0),
        (80.0, 0.9, 0.6, 20.0, 120.0),
        (0.01, 0.8, 0.85, 40.0, 180.0),
        (25.0, 0.8, 0.85, 40.0, 1_800_000.0),
    ] {
        let input = StaffingInput {
            calls_offered: calls,
            target_service_level: goal,
            max_occupancy: occupancy,
            service_level_answer_time_seconds: threshold,
            avg_caller_patience_seconds: patience,
            ..standard_input()
        };
        for model in [Model::ErlangC, Model::ErlangA] {
            let result = solver.staff_for_interval(&input, model).unwrap();
            assert_eq!(
                result,
                Solver::default().staff_for_interval(&input, model).unwrap()
            );
            assert_eq!(
                result,
                solver
                    .staffing_metrics_for_agents(&input, result.required_staff, model)
                    .unwrap()
            );
            assert!(result.service_level >= goal);
            assert!(result.occupancy <= occupancy);
            if result.required_staff > 0 {
                let prior = solver
                    .staffing_metrics_for_agents(&input, result.required_staff - 1, model)
                    .unwrap();
                assert!(prior.service_level < goal || prior.occupancy > occupancy);
            }
        }
    }
}

#[test]
fn releasing_buffers_preserves_limits_and_results_after_successes_and_errors() {
    let limits = SolverLimits {
        max_agents: 120,
        max_states: 200,
        tail_tolerance: 1e-12,
    };
    let mut solver = Solver::new(limits).unwrap();
    let standard = standard_input();
    let large_queue = StaffingInput {
        calls_offered: 6000.0,
        ..standard
    };
    let invalid = StaffingInput {
        avg_handle_time_seconds: 0.0,
        ..standard
    };
    for (input, agents) in [
        (standard, 8),
        (large_queue, 1),
        (invalid, 8),
        (standard, 121),
    ] {
        let before = solver.staffing_metrics_for_agents(&input, agents, Model::ErlangA);
        let abandonment_before = solver.abandonment_for_agents(&input, agents);
        solver.release_buffers();
        assert_eq!(
            solver.staffing_metrics_for_agents(&input, agents, Model::ErlangA),
            before
        );
        assert_eq!(
            solver.abandonment_for_agents(&input, agents),
            abandonment_before
        );
        assert_eq!(
            solver.staff_for_interval(&standard, Model::ErlangA),
            Solver::new(limits)
                .unwrap()
                .staff_for_interval(&standard, Model::ErlangA)
        );
    }
    solver.release_buffers();
    solver.release_buffers();
    assert_eq!(
        solver.abandonment_for_agents(&standard, 121),
        Err(Error::AgentLimit { limit: 120 })
    );
    assert_eq!(
        solver.abandonment_for_agents(&large_queue, 1),
        Err(Error::StateLimit { limit: 200 })
    );
}

#[test]
fn plain_row_loop_preserves_identifiers_errors_and_later_results() {
    let standard = standard_input();
    let rows = vec![
        ("before-error", standard),
        (
            "invalid-duration",
            StaffingInput {
                interval_duration_seconds: 0.0,
                ..standard
            },
        ),
        (
            "after-error",
            StaffingInput {
                calls_offered: 40.0,
                interval_duration_seconds: 900.0,
                ..standard
            },
        ),
    ];
    let mut solver = Solver::default();
    let mut results = Vec::with_capacity(rows.len());
    for (id, input) in rows {
        results.push((id, solver.staff_for_interval(&input, Model::ErlangA)));
    }
    assert_eq!(results.len(), 3);
    assert_eq!(results[0].0, "before-error");
    assert!(results[0].1.is_ok());
    assert_eq!(results[1].0, "invalid-duration");
    assert!(matches!(results[1].1, Err(Error::InvalidInput(_))));
    assert_eq!(results[2].0, "after-error");
    assert!(results[2].1.is_ok());
    assert_eq!(
        results[2].1,
        Solver::default().staff_for_interval(
            &StaffingInput {
                calls_offered: 40.0,
                interval_duration_seconds: 900.0,
                ..standard
            },
            Model::ErlangA,
        )
    );
}
