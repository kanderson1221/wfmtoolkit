//! Optional display adapter corresponding to Python's build_results_payload.
//! Field names are idiomatic Rust; no JSON, HTTP, Python, or UI binding is added.
use crate::{Error, Model, Solver, StaffingInput, StaffingMetrics};

#[derive(Clone, Debug, PartialEq)]
pub struct Summary {
    pub required_agents: String,
    pub required_headcount: String,
    pub service_level: String,
    pub expected_asa: String,
    pub percent_answered_immediately: String,
    pub estimated_occupancy: String,
    pub abandon_percent: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Scenario {
    pub agents: String,
    pub required_headcount: String,
    pub service_level: String,
    pub asa: String,
    pub percent_answered_immediately: String,
    pub expected_occupancy: String,
    pub abandonment: String,
    pub is_recommended: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ResultsPayload {
    pub summary: Summary,
    pub scenarios: Vec<Scenario>,
}

/// Gross headcount = ceil(net staff / (1 - shrinkage)). Shrinkage is a fraction.
pub fn apply_shrinkage(net_staff: usize, shrinkage: f64) -> Result<usize, Error> {
    if !shrinkage.is_finite() || !(0.0..1.0).contains(&shrinkage) {
        return Err(Error::InvalidInput(
            "shrinkage must be finite and in [0, 1)",
        ));
    }
    if net_staff == 0 || shrinkage == 0.0 {
        return Ok(net_staff);
    }
    const MAX_EXACT_INTEGER: f64 = 9_007_199_254_740_992.0;
    if (net_staff as u128) > (1_u128 << 53) {
        return Err(Error::NumericalFailure(
            "headcount exceeds exact floating-point integer range",
        ));
    }
    let gross = (net_staff as f64 / (1.0 - shrinkage)).ceil();
    // usize::MAX rounds up to 2^64 when represented by f64 on 64-bit systems.
    // Conservative >= avoids silently saturating an out-of-range cast.
    if !gross.is_finite() || gross >= usize::MAX as f64 {
        return Err(Error::HeadcountOverflow);
    }
    if gross > MAX_EXACT_INTEGER {
        return Err(Error::NumericalFailure(
            "headcount exceeds exact floating-point integer range",
        ));
    }
    Ok(gross as usize)
}

fn percent(value: f64) -> String {
    format!("{:.1}%", value * 100.0)
}

fn seconds(value: f64) -> String {
    if value.is_infinite() {
        return "Unstable".to_owned();
    }
    let buckets = [1, 2, 5, 10, 20, 30, 60];
    for (index, minutes) in buckets.iter().enumerate() {
        if value < f64::from(*minutes) * 60.0 {
            return if index == 0 {
                format!("{value:.1} sec")
            } else {
                format!("> {} min", buckets[index - 1])
            };
        }
    }
    "> 60 min".to_owned()
}

/// Recommended staffing and the surrounding ±3 scenarios with Python's display
/// conventions. Shrinkage changes gross headcount, never queue performance.
pub fn build_results_payload(
    input: &StaffingInput,
    shrinkage: f64,
    model: Model,
) -> Result<ResultsPayload, Error> {
    apply_shrinkage(0, shrinkage)?;
    let mut solver = Solver::default();
    let recommended = solver.staff_for_interval(input, model)?;
    let agents = recommended.required_staff;
    let mut scenarios = Vec::with_capacity(7);
    // The additional three rows are subject to the same explicit agent limit.
    // Return an error rather than silently dropping a requested scenario.
    for count in agents.saturating_sub(3)..=agents + 3 {
        let metrics = if count == agents {
            recommended
        } else {
            solver.staffing_metrics_for_agents(input, count, model)?
        };
        scenarios.push(scenario(metrics, shrinkage, count == agents)?);
    }
    Ok(ResultsPayload {
        summary: Summary {
            required_agents: agents.to_string(),
            required_headcount: apply_shrinkage(agents, shrinkage)?.to_string(),
            service_level: percent(recommended.service_level),
            expected_asa: seconds(recommended.average_speed_of_answer_seconds),
            percent_answered_immediately: percent(recommended.percent_answered_immediately),
            estimated_occupancy: percent(recommended.occupancy),
            abandon_percent: percent(recommended.abandon_percent),
        },
        scenarios,
    })
}

fn scenario(
    metrics: StaffingMetrics,
    shrinkage: f64,
    is_recommended: bool,
) -> Result<Scenario, Error> {
    Ok(Scenario {
        agents: metrics.required_staff.to_string(),
        required_headcount: apply_shrinkage(metrics.required_staff, shrinkage)?.to_string(),
        service_level: percent(metrics.service_level),
        asa: seconds(metrics.average_speed_of_answer_seconds),
        percent_answered_immediately: percent(metrics.percent_answered_immediately),
        expected_occupancy: percent(metrics.occupancy),
        abandonment: percent(metrics.abandon_percent),
        is_recommended,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn asa_bucket_boundaries_match_python() {
        for (value, expected) in [
            (0.0, "0.0 sec"),
            (59.9, "59.9 sec"),
            (60.0, "> 1 min"),
            (120.0, "> 2 min"),
            (300.0, "> 5 min"),
            (3600.0, "> 60 min"),
            (f64::INFINITY, "Unstable"),
        ] {
            assert_eq!(seconds(value), expected);
        }
    }

    #[test]
    fn summary_and_scenarios_share_the_recommendation() {
        let input = StaffingInput {
            calls_offered: 25.0,
            interval_duration_seconds: 1800.0,
            avg_handle_time_seconds: 360.0,
            target_service_level: 0.8,
            service_level_answer_time_seconds: 40.0,
            max_occupancy: 0.85,
            avg_caller_patience_seconds: 180.0,
        };
        for model in [Model::ErlangC, Model::ErlangA] {
            let result = build_results_payload(&input, 0.3, model).unwrap();
            assert_eq!(result.scenarios.len(), 7);
            let recommended: Vec<_> = result
                .scenarios
                .iter()
                .filter(|row| row.is_recommended)
                .collect();
            assert_eq!(recommended.len(), 1);
            assert_eq!(recommended[0].agents, result.summary.required_agents);
            assert_eq!(
                recommended[0].required_headcount,
                result.summary.required_headcount
            );
            assert_eq!(recommended[0].service_level, result.summary.service_level);
            assert_eq!(recommended[0].abandonment, result.summary.abandon_percent);
        }
    }
}
