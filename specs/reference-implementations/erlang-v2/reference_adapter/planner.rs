use crate::{
    batch::{local_service_date, rows},
    error::ApiError,
    input::{integer, number, object, range, round, text},
};
use chrono::{Datelike, NaiveDate};
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap, HashSet};
use wfm_erlang::{Model, Solver, StaffingInput};

#[derive(Default)]
struct Daily {
    intervals: usize,
    minutes: f64,
    peak: usize,
}

#[derive(Default)]
struct Monthly {
    workload: f64,
    staffed: f64,
    occupied: f64,
    sl_calls: f64,
    calls: f64,
    peak: usize,
    minimum_applied: usize,
    dates: HashSet<String>,
}

pub fn calculate(payload: Value) -> Result<Value, ApiError> {
    let rows = rows(payload)?;
    let mut minimum = None;
    // Validate the common floor before any calculations, matching the planner contract.
    for raw in &rows {
        let row = object(raw)?;
        let floor = integer(row, "minimumHeadcount", Some(0.0), 100_000)?;
        if minimum.is_some_and(|previous| previous != floor) {
            return Err(ApiError::invalid(
                "minimum_headcount must be consistent across all rows",
            ));
        }
        minimum = Some(floor);
    }
    let floor = minimum.unwrap_or(0);
    let mut solver = Solver::default();
    let mut intervals = Vec::with_capacity(rows.len());
    let mut daily = BTreeMap::<(String, String), Daily>::new();
    let mut monthly = BTreeMap::<usize, Monthly>::new();
    let mut date_month = HashMap::new();
    for raw in rows {
        let row = object(&raw)?;
        let month = integer(row, "monthIndex", None, 11)?;
        let service_date = text(row, "serviceDate")?;
        let start = text(row, "intervalStart")?;
        let minutes = number(row, "intervalLengthMinutes", Some(30.0))?;
        let input = StaffingInput {
            calls_offered: number(row, "callsOffered", None)?,
            interval_duration_seconds: minutes * 60.0,
            avg_handle_time_seconds: number(row, "averageHandleTime", None)?,
            target_service_level: number(row, "serviceLevelGoal", None)? / 100.0,
            service_level_answer_time_seconds: number(row, "serviceLevelThreshold", None)?,
            max_occupancy: number(row, "maxOccupancy", Some(85.0))? / 100.0,
            avg_caller_patience_seconds: number(row, "averageCustomerPatience", Some(60.0))?,
        };
        range(minutes, "intervalLengthMinutes", 0.0, f64::MAX, true, false)?;
        let recommended = solver.staff_for_interval(&input, Model::ErlangC)?;
        let required = recommended.required_staff.max(floor);
        let metrics = if required == recommended.required_staff {
            recommended
        } else {
            solver.staffing_metrics_for_agents(&input, required, Model::ErlangC)?
        };
        let workload = input.calls_offered * input.avg_handle_time_seconds / 3600.0;
        let labor = required as f64 * (input.interval_duration_seconds / 3600.0);
        if !workload.is_finite() || !labor.is_finite() {
            return Err(ApiError::invalid(
                "interval hours exceed the numerical range",
            ));
        }
        intervals.push(json!({
            "monthIndex": month, "serviceDate": service_date, "intervalStart": start,
            "callsOffered": input.calls_offered, "averageHandleTimeSeconds": input.avg_handle_time_seconds,
            "workloadHours": round(workload, 6), "requiredStaffNet": required, "laborHoursNet": round(labor, 6),
            "serviceLevel": metrics.service_level, "occupancy": metrics.occupancy,
            "averageSpeedOfAnswerSeconds": metrics.average_speed_of_answer_seconds,
            "percentAnsweredImmediately": metrics.percent_answered_immediately, "abandonPercent": metrics.abandon_percent,
            "intervalLengthMinutes": input.interval_duration_seconds / 60.0,
            "erlangRequiredStaffNet": recommended.required_staff, "minimumHeadcount": floor,
            "minimumApplied": required > recommended.required_staff
        }));
        date_month.entry(service_date.to_string()).or_insert(month);
        let day = daily
            .entry((format!("month-{month}"), local_service_date(start)))
            .or_default();
        day.intervals += 1;
        // Preserve the reference adapter's summation order (minutes before hours).
        day.minutes += required as f64 * (input.interval_duration_seconds / 60.0);
        day.peak = day.peak.max(required);
        let month = monthly.entry(month).or_default();
        month.workload += workload;
        month.staffed += labor;
        month.occupied += labor * metrics.occupancy;
        month.sl_calls += input.calls_offered * metrics.service_level;
        month.calls += input.calls_offered;
        month.peak = month.peak.max(required);
        month.minimum_applied += usize::from(required > recommended.required_staff);
        month.dates.insert(service_date.into());
        if ![
            day.minutes,
            month.workload,
            month.staffed,
            month.occupied,
            month.sl_calls,
            month.calls,
        ]
        .iter()
        .all(|n| n.is_finite())
        {
            return Err(ApiError::invalid(
                "Dataset totals exceed the numerical range",
            ));
        }
    }
    let daily: Result<Vec<_>, ApiError> = daily
        .into_iter()
        .map(|((_queue, date), day)| {
            let month = if let Some(month) = date_month.get(&date) {
                *month
            } else {
                NaiveDate::parse_from_str(&date, "%Y-%m-%d")
                    .map_err(|_| ApiError::invalid("Invalid interval service date"))?
                    .month0() as usize
            };
            Ok(
                json!({"monthIndex": month, "serviceDate": date, "intervalCount": day.intervals,
            "totalLaborHoursNet": day.minutes / 60.0, "peakStaffNet": day.peak}),
            )
        })
        .collect();
    let monthly: Vec<_> = monthly.into_iter().map(|(index, m)| json!({
        "monthIndex": index, "workloadHours": round(m.workload, 4), "erlangStaffedHours": round(m.staffed, 4),
        "weightedOccupancyPercent": round(if m.staffed > 0.0 { m.occupied / m.staffed * 100.0 } else { 0.0 }, 4),
        "weightedServiceLevelPercent": round(if m.calls > 0.0 { m.sl_calls / m.calls * 100.0 } else { 0.0 }, 4),
        "peakIntervalRequiredHeadcount": m.peak, "openDayCount": m.dates.len(),
        "minimumHeadcount": floor, "minimumAppliedIntervalCount": m.minimum_applied
    })).collect();
    Ok(json!({"intervalPlans": intervals, "dailyPlans": daily?, "monthlyPlans": monthly}))
}
