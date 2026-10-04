use crate::{
    error::ApiError,
    input::{number, object, range},
};
use serde_json::{json, Value};
use wfm_erlang::{build_results_payload, Model, StaffingInput};

pub fn calculate(payload: Value) -> Result<Value, ApiError> {
    let row = object(&payload)?;
    let model = match row.get("model") {
        None => Model::ErlangC,
        Some(Value::String(model)) if model == "erlang_c" || model == "erlang_a" => {
            model.parse()?
        }
        _ => return Err(ApiError::invalid("model must be erlang_c or erlang_a")),
    };
    let input = StaffingInput {
        calls_offered: number(row, "callsOffered", None)?,
        interval_duration_seconds: number(row, "intervalLength", None)? * 60.0,
        avg_handle_time_seconds: number(row, "averageHandleTime", None)?,
        target_service_level: number(row, "serviceLevelGoal", None)? / 100.0,
        service_level_answer_time_seconds: number(row, "serviceLevelThreshold", None)?,
        max_occupancy: number(row, "maxOccupancy", Some(85.0))? / 100.0,
        avg_caller_patience_seconds: number(row, "averageCustomerPatience", None)?,
    };
    let shrinkage = range(
        number(row, "shrinkageAssumption", Some(0.0))?,
        "shrinkageAssumption",
        0.0,
        100.0,
        false,
        true,
    )? / 100.0;
    let result = build_results_payload(&input, shrinkage, model)?;
    let s = result.summary;
    Ok(json!({
        "summary": {
            "requiredAgents": s.required_agents, "requiredHeadcount": s.required_headcount,
            "serviceLevel": s.service_level, "expectedAsa": s.expected_asa,
            "percentAnsweredImmediately": s.percent_answered_immediately,
            "estimatedOccupancy": s.estimated_occupancy, "abandonPercent": s.abandon_percent
        },
        "scenarios": result.scenarios.into_iter().map(|s| json!({
            "agents": s.agents, "requiredHeadcount": s.required_headcount,
            "serviceLevel": s.service_level, "asa": s.asa,
            "percentAnsweredImmediately": s.percent_answered_immediately,
            "expectedOccupancy": s.expected_occupancy, "abandonment": s.abandonment,
            "isRecommended": s.is_recommended
        })).collect::<Vec<_>>()
    }))
}
