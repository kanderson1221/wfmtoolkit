//! A plain loop over already loaded rows, retaining numeric results and row IDs.
//! Run with `cargo run --release --example dataset`.
//! Replace the sample rows with inputs from your own data source. This example
//! is standalone and is not loaded or invoked by the application.

use std::time::Instant;
use wfm_erlang::{Error, Model, Solver, StaffingInput, StaffingMetrics};

struct InputRow {
    id: String,
    input: StaffingInput,
    model: Model,
}

struct ResultRow {
    id: String,
    result: Result<StaffingMetrics, Error>,
}

fn main() {
    let standard = StaffingInput {
        calls_offered: 25.0,
        interval_duration_seconds: 1800.0,
        avg_handle_time_seconds: 360.0,
        target_service_level: 0.8,
        service_level_answer_time_seconds: 40.0,
        max_occupancy: 0.85,
        avg_caller_patience_seconds: 180.0,
    };
    // Rows can come from any dataset and can have different interval durations.
    // The invalid row deliberately demonstrates retaining an error and continuing.
    let rows = vec![
        InputRow {
            id: "support-001".into(),
            input: standard,
            model: Model::ErlangC,
        },
        InputRow {
            id: "support-002".into(),
            input: StaffingInput {
                calls_offered: 40.0,
                interval_duration_seconds: 900.0,
                ..standard
            },
            model: Model::ErlangA,
        },
        InputRow {
            id: "invalid-example".into(),
            input: StaffingInput {
                avg_handle_time_seconds: 0.0,
                ..standard
            },
            model: Model::ErlangA,
        },
        InputRow {
            id: "support-003".into(),
            input: StaffingInput {
                calls_offered: 75.0,
                interval_duration_seconds: 3600.0,
                ..standard
            },
            model: Model::ErlangA,
        },
    ];

    let mut solver = Solver::default();
    let mut results = Vec::with_capacity(rows.len());
    let start = Instant::now();
    for row in rows {
        results.push(ResultRow {
            id: row.id,
            result: solver.staff_for_interval(&row.input, row.model),
        });
    }
    let elapsed = start.elapsed();

    // Keep the unrounded numeric results. Format only when displaying or exporting.
    let succeeded = results.iter().filter(|row| row.result.is_ok()).count();
    println!(
        "Processed {} rows: {} succeeded, {} failed in {:.6} seconds",
        results.len(),
        succeeded,
        results.len() - succeeded,
        elapsed.as_secs_f64(),
    );
    for row in &results {
        match &row.result {
            Ok(metrics) => println!(
                "{}: required_staff={}, service_level={}, abandonment_fraction={}",
                row.id, metrics.required_staff, metrics.service_level, metrics.abandon_percent,
            ),
            Err(error) => eprintln!("{}: {error}", row.id),
        }
    }
}
