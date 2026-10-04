//! Run manually with `cargo run --release --example benchmark -- 1000`.
//! Reports average wall time per operation; results are machine dependent.
//! These examples are not loaded or invoked by the application.

use std::error::Error;
use std::hint::black_box;
use std::time::Instant;
use wfm_erlang::{Model, Solver, StaffingInput};

fn measure<T>(
    name: &str,
    iterations: u32,
    mut calculate: impl FnMut() -> Result<T, wfm_erlang::Error>,
) -> Result<(), wfm_erlang::Error> {
    // Warm up the same solver used by the measured loop. black_box retains all
    // returned metrics; constructing a solver is not part of each row's work.
    for _ in 0..10 {
        black_box(calculate()?);
    }
    let start = Instant::now();
    for _ in 0..iterations {
        black_box(calculate()?);
    }
    let mean_us = start.elapsed().as_secs_f64() * 1e6 / f64::from(iterations);
    println!("{name},{iterations},{mean_us:.3}");
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    let iterations = std::env::args()
        .nth(1)
        .map(|value| value.parse::<u32>())
        .transpose()?
        .unwrap_or(1000);
    if iterations == 0 {
        return Err("iterations must be greater than zero".into());
    }
    let standard = StaffingInput {
        calls_offered: 25.0,
        interval_duration_seconds: 1800.0,
        avg_handle_time_seconds: 360.0,
        target_service_level: 0.8,
        service_level_answer_time_seconds: 40.0,
        max_occupancy: 0.85,
        avg_caller_patience_seconds: 180.0,
    };
    let high_load = StaffingInput {
        calls_offered: 6000.0,
        ..standard
    };
    println!("workload,iterations,mean_microseconds");
    for (name, input, model, agents) in [
        ("standard_c_search", &standard, Model::ErlangC, None),
        ("standard_a_search", &standard, Model::ErlangA, None),
        ("high_load_c_search", &high_load, Model::ErlangC, None),
        ("high_load_a_search", &high_load, Model::ErlangA, None),
        ("overloaded_a_metrics", &standard, Model::ErlangA, Some(2)),
        (
            "high_load_a_metrics",
            &high_load,
            Model::ErlangA,
            Some(1200),
        ),
    ] {
        let mut solver = Solver::default();
        measure(name, iterations, || match agents {
            Some(agents) => solver.staffing_metrics_for_agents(black_box(input), agents, model),
            None => solver.staff_for_interval(black_box(input), model),
        })?;
    }
    for (name, input, agents) in [
        ("overloaded_abandonment_only", &standard, 2),
        ("high_load_abandonment_only", &high_load, 1200),
    ] {
        let mut solver = Solver::default();
        measure(name, iterations, || {
            solver.abandonment_for_agents(black_box(input), agents)
        })?;
    }
    Ok(())
}
