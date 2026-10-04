//! Small, deliberately unconnected evaluation program used by tools/compare_python.py.
//! Stdin contains one headerless CSV row per calculation:
//! model,calls,interval,aht,target,answer_time,max_occupancy,patience,agents
//! Use "auto" for agents to request a staffing search, or an integer for metrics.

use std::error::Error;
use std::io::{self, BufRead, Write};
use std::time::Instant;
use wfm_erlang::{Model, Solver, StaffingInput};

fn main() -> Result<(), Box<dyn Error>> {
    let stdout = io::stdout();
    let mut output = io::BufWriter::new(stdout.lock());
    let mut solver = Solver::default();
    writeln!(output, "required_staff,service_level,occupancy,average_speed_of_answer_seconds,percent_answered_immediately,abandon_percent,elapsed_ns")?;
    for (index, line) in io::stdin().lock().lines().enumerate() {
        let line = line?;
        let fields: Vec<_> = line.split(',').map(str::trim).collect();
        if fields.len() != 9 {
            return Err(format!("line {}: expected 9 fields", index + 1).into());
        }
        let model = match fields[0] {
            "erlang_c" => Model::ErlangC,
            "erlang_a" => Model::ErlangA,
            _ => return Err(format!("line {}: unknown model", index + 1).into()),
        };
        let input = StaffingInput {
            calls_offered: fields[1].parse()?,
            interval_duration_seconds: fields[2].parse()?,
            avg_handle_time_seconds: fields[3].parse()?,
            target_service_level: fields[4].parse()?,
            service_level_answer_time_seconds: fields[5].parse()?,
            max_occupancy: fields[6].parse()?,
            avg_caller_patience_seconds: fields[7].parse()?,
        };
        let agents = if fields[8] == "auto" {
            None
        } else {
            Some(fields[8].parse::<usize>()?)
        };
        let start = Instant::now();
        let result = match agents {
            None => solver.staff_for_interval(&input, model)?,
            Some(agents) => solver.staffing_metrics_for_agents(&input, agents, model)?,
        };
        let elapsed = start.elapsed().as_nanos();
        writeln!(
            output,
            "{},{:.17e},{:.17e},{:.17e},{:.17e},{:.17e},{}",
            result.required_staff,
            result.service_level,
            result.occupancy,
            result.average_speed_of_answer_seconds,
            result.percent_answered_immediately,
            result.abandon_percent,
            elapsed
        )?;
    }
    Ok(())
}
