use crate::error::ApiError;
use serde_json::{Map, Value};

pub fn object(value: &Value) -> Result<&Map<String, Value>, ApiError> {
    value
        .as_object()
        .ok_or_else(|| ApiError::invalid("Expected an object"))
}

pub fn number(row: &Map<String, Value>, key: &str, default: Option<f64>) -> Result<f64, ApiError> {
    let value = match row.get(key) {
        None => return default.ok_or_else(|| ApiError::invalid(format!("{key}: Field required"))),
        Some(value) => value,
    };
    let parsed = value
        .as_f64()
        .or_else(|| value.as_str().and_then(|s| s.trim().parse().ok()));
    match parsed {
        Some(number) if number.is_finite() => Ok(number),
        _ => Err(ApiError::invalid(format!("{key} must be a finite number"))),
    }
}

pub fn text<'a>(row: &'a Map<String, Value>, key: &str) -> Result<&'a str, ApiError> {
    row.get(key)
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| ApiError::invalid(format!("{key} must be a nonempty string")))
}

pub fn range(
    value: f64,
    key: &str,
    min: f64,
    max: f64,
    open_min: bool,
    open_max: bool,
) -> Result<f64, ApiError> {
    if value < min || value > max || (open_min && value == min) || (open_max && value == max) {
        Err(ApiError::invalid(format!(
            "{key} is outside its allowed range"
        )))
    } else {
        Ok(value)
    }
}

pub fn integer(
    row: &Map<String, Value>,
    key: &str,
    default: Option<f64>,
    max: usize,
) -> Result<usize, ApiError> {
    let value = number(row, key, default)?;
    if value < 0.0 || value.fract() != 0.0 || value > max as f64 {
        return Err(ApiError::invalid(format!(
            "{key} must be a whole number between 0 and {max}"
        )));
    }
    Ok(value as usize)
}

pub fn round(value: f64, digits: i32) -> f64 {
    // Above this magnitude f64 has no fractional digits to round; multiplying
    // by the decimal scale could otherwise overflow a finite input.
    if value.abs() >= 4_503_599_627_370_496.0 {
        return value;
    }
    let scale = 10f64.powi(digits);
    (value * scale).round_ties_even() / scale
}
