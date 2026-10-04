use crate::{
    error::ApiError,
    input::{number, object, range, round, text},
};
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::Serialize;
use serde_json::{json, Map, Value};
use wfm_erlang::{apply_shrinkage, Model, Solver, StaffingInput};

pub const REQUIRED_HEADERS: &[&str] = &[
    "queue_id",
    "interval_start",
    "calls_offered",
    "aht_seconds",
    "mean_patience_seconds",
    "service_level_threshold",
    "service_level_target_seconds",
    "max_occupancy",
];
pub const ENRICHED_HEADERS: &[&str] = &[
    "Required Agents",
    "Required Headcount",
    "Service Level",
    "Average Speed of Answer",
    "Answered Immediately",
    "Expected Occupancy",
    "Caller Abandonment",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RowError {
    pub row_index: usize,
    pub message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RowResult {
    pub row_index: usize,
    pub queue_id: String,
    pub interval_start: String,
    pub required_staff_net: usize,
    pub required_staff_gross: usize,
    pub service_level: f64,
    pub asa_seconds: Option<f64>,
    pub percent_answered_immediately: f64,
    pub expected_occupancy: f64,
    pub abandon_percent: f64,
    #[serde(skip)]
    pub calls: f64,
}

#[derive(Default)]
pub struct Summary {
    calls: f64,
    sl: f64,
    asa: f64,
    asa_calls: f64,
    minutes_net: f64,
    minutes_gross: f64,
    peak_net: usize,
    peak_gross: usize,
}

impl Summary {
    pub fn add(&mut self, row: &RowResult) {
        self.calls += row.calls;
        self.sl += row.service_level * row.calls;
        if let Some(asa) = row.asa_seconds {
            self.asa += asa * row.calls;
            self.asa_calls += row.calls;
        }
        self.minutes_net += row.required_staff_net as f64 * 30.0;
        self.minutes_gross += row.required_staff_gross as f64 * 30.0;
        self.peak_net = self.peak_net.max(row.required_staff_net);
        self.peak_gross = self.peak_gross.max(row.required_staff_gross);
    }

    pub fn build(&self, processed: usize, successful: usize, failed: usize) -> Value {
        json!({
            "processedRows": processed, "successfulRows": successful, "failedRows": failed,
            "totalCallsOffered": self.calls,
            "avgServiceLevel": if self.calls > 0.0 { self.sl / self.calls } else { 0.0 },
            "avgAsaSeconds": if self.asa_calls > 0.0 { Some(self.asa / self.asa_calls) } else { None },
            "totalRequiredStaffMinutesNet": self.minutes_net, "totalRequiredStaffHoursNet": self.minutes_net / 60.0,
            "totalRequiredStaffMinutesGross": self.minutes_gross, "totalRequiredStaffHoursGross": self.minutes_gross / 60.0,
            "peakStaffNet": self.peak_net, "peakStaffGross": self.peak_gross
        })
    }
}

fn ratio(value: f64, key: &str) -> Result<f64, ApiError> {
    if value > 0.0 && value <= 1.0 {
        Ok(value)
    } else if value > 1.0 && value <= 100.0 {
        Ok(value / 100.0)
    } else {
        Err(ApiError::invalid(format!(
            "{key} must be in (0, 1] or (0, 100]"
        )))
    }
}

pub fn calculate_row(
    raw: &Value,
    index: usize,
    solver: &mut Solver,
) -> Result<RowResult, ApiError> {
    let row = object(raw)?;
    let queue_id = text(row, "queue_id")?;
    let interval_start = text(row, "interval_start")?;
    let calls = range(
        number(row, "calls_offered", None)?,
        "calls_offered",
        0.0,
        f64::MAX,
        false,
        false,
    )?;
    let shrinkage = range(
        number(row, "shrinkage", Some(0.0))?,
        "shrinkage",
        0.0,
        100.0,
        false,
        true,
    )?;
    let shrinkage = if shrinkage < 1.0 {
        shrinkage
    } else {
        shrinkage / 100.0
    };
    let input = StaffingInput {
        calls_offered: calls,
        interval_duration_seconds: 1800.0,
        avg_handle_time_seconds: number(row, "aht_seconds", None)?,
        target_service_level: ratio(
            number(row, "service_level_threshold", None)?,
            "service_level_threshold",
        )?,
        service_level_answer_time_seconds: number(row, "service_level_target_seconds", None)?,
        max_occupancy: ratio(number(row, "max_occupancy", None)?, "max_occupancy")?,
        avg_caller_patience_seconds: number(row, "mean_patience_seconds", None)?,
    };
    let metrics = solver.staff_for_interval(&input, Model::ErlangC)?;
    Ok(RowResult {
        row_index: index,
        queue_id: queue_id.into(),
        interval_start: interval_start.into(),
        calls,
        required_staff_net: metrics.required_staff,
        required_staff_gross: apply_shrinkage(metrics.required_staff, shrinkage)?,
        service_level: metrics.service_level,
        asa_seconds: metrics
            .average_speed_of_answer_seconds
            .is_finite()
            .then_some(metrics.average_speed_of_answer_seconds),
        percent_answered_immediately: metrics.percent_answered_immediately,
        expected_occupancy: metrics.occupancy,
        abandon_percent: metrics.abandon_percent,
    })
}

pub fn export_row(headers: &[String], raw: &Value, row: &RowResult) -> Vec<Value> {
    let mut values: Vec<_> = headers
        .iter()
        .map(|h| raw.get(h).cloned().unwrap_or(json!("")))
        .collect();
    values.extend([
        json!(row.required_staff_net),
        json!(row.required_staff_gross),
        json!(round(row.service_level * 100.0, 2)),
        json!(row.asa_seconds),
        json!(round(row.percent_answered_immediately * 100.0, 2)),
        json!(round(row.expected_occupancy * 100.0, 2)),
        json!(round(row.abandon_percent * 100.0, 2)),
    ]);
    values
}

pub fn rows(payload: Value) -> Result<Vec<Value>, ApiError> {
    let Value::Object(mut obj) = payload else {
        return Err(ApiError::invalid("Expected an object"));
    };
    match obj.remove("rows") {
        Some(Value::Array(rows)) if !rows.is_empty() && rows.iter().all(Value::is_object) => {
            Ok(rows)
        }
        Some(Value::Array(rows)) if rows.is_empty() => {
            Err(ApiError::invalid("rows must contain at least one item"))
        }
        _ => Err(ApiError::invalid("rows must be an array of objects")),
    }
}

pub fn calculate(payload: Value, file_processor: bool) -> Result<Value, ApiError> {
    let rows = rows(payload)?;
    let processed = rows.len();
    let headers: Vec<_> = rows[0]
        .as_object()
        .expect("validated object")
        .keys()
        .cloned()
        .collect();
    let mut solver = Solver::default();
    let mut summary = Summary::default();
    let mut results = Vec::new();
    let mut errors = Vec::new();
    let mut export_rows = Vec::new();
    for (offset, raw) in rows.into_iter().enumerate() {
        match calculate_row(&raw, offset + 1, &mut solver) {
            Ok(row) => {
                summary.add(&row);
                if file_processor {
                    export_rows.push(export_row(&headers, &raw, &row));
                }
                results.push(row);
            }
            Err(error) => errors.push(RowError {
                row_index: offset + 1,
                message: error.1,
            }),
        }
    }
    // JSON batch workflows are all-or-nothing, including their summary.
    if !errors.is_empty() {
        results.clear();
        export_rows.clear();
        summary = Summary::default();
        errors.insert(
            0,
            RowError {
                row_index: 0,
                message: "Batch contains validation errors. Fix all rows and upload again.".into(),
            },
        );
    }
    let successful = results.len();
    let mut payload = json!({"results": results, "summary": summary.build(processed, successful, processed - successful), "errors": errors});
    if file_processor {
        let export_headers = if successful > 0 {
            headers
                .into_iter()
                .chain(ENRICHED_HEADERS.iter().map(|s| s.to_string()))
                .collect::<Vec<_>>()
        } else {
            Vec::new()
        };
        payload["mode"] = json!("file-processor");
        payload["export"] =
            json!({"enrichedFile": {"headers": export_headers, "rows": export_rows}});
    }
    Ok(payload)
}

pub fn csv_row(headers: &[String], record: &csv::StringRecord) -> Value {
    let mut row = Map::new();
    for (index, header) in headers.iter().enumerate() {
        if header.is_empty() {
            continue;
        }
        let value = record.get(index).map(str::trim);
        if header == "shrinkage" && value == Some("") {
            continue;
        }
        row.insert(header.clone(), value.map_or(Value::Null, |s| json!(s)));
    }
    Value::Object(row)
}

/// Dates for monthly daily groups keep the interval's local date, as Python did.
pub fn local_service_date(value: &str) -> String {
    if let Ok(dt) = DateTime::parse_from_rfc3339(value) {
        return dt.date_naive().to_string();
    }
    for format in [
        "%Y-%m-%dT%H:%M:%S%.f",
        "%Y-%m-%d %H:%M:%S%.f",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M",
    ] {
        if let Ok(dt) = NaiveDateTime::parse_from_str(value, format) {
            return dt.date().to_string();
        }
    }
    if let Ok(date) = NaiveDate::parse_from_str(value, "%Y-%m-%d") {
        return date.to_string();
    }
    value.split([' ', 'T']).next().unwrap_or(value).into()
}

pub fn utc_now() -> DateTime<Utc> {
    Utc::now()
}
