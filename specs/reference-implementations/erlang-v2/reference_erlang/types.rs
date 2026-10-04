use std::{error, fmt, str::FromStr};

/// Queue model. Erlang C intentionally uses Erlang A to estimate abandonment.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum Model {
    #[default]
    ErlangC,
    ErlangA,
}

impl FromStr for Model {
    type Err = Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value
            .trim()
            .to_ascii_lowercase()
            .replace(['-', ' '], "_")
            .as_str()
        {
            "erlang_c" => Ok(Self::ErlangC),
            "erlang_a" => Ok(Self::ErlangA),
            _ => Err(Error::InvalidInput("model must be erlang_c or erlang_a")),
        }
    }
}

impl fmt::Display for Model {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::ErlangC => "erlang_c",
            Self::ErlangA => "erlang_a",
        })
    }
}

/// Times are in seconds; service level and occupancy are fractions, not percentages.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct StaffingInput {
    pub calls_offered: f64,
    pub interval_duration_seconds: f64,
    pub avg_handle_time_seconds: f64,
    pub target_service_level: f64,
    pub service_level_answer_time_seconds: f64,
    pub max_occupancy: f64,
    pub avg_caller_patience_seconds: f64,
}

/// Unrounded metrics. Erlang A service level uses all offered calls as denominator;
/// ASA uses answered calls, including immediately answered calls.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct StaffingMetrics {
    pub required_staff: usize,
    pub service_level: f64,
    /// May exceed 1 for an overloaded Erlang C scenario.
    pub occupancy: f64,
    /// Positive infinity denotes unstable Erlang C or positive demand with no agents.
    pub average_speed_of_answer_seconds: f64,
    pub percent_answered_immediately: f64,
    /// For C this is a separate Erlang A estimate with the same offered demand,
    /// handle time, patience, and staffing; C's other metrics ignore abandonment.
    pub abandon_percent: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SolverLimits {
    pub max_agents: usize,
    pub max_states: usize,
    /// Relative bound on omitted stationary probability mass.
    pub tail_tolerance: f64,
}

impl Default for SolverLimits {
    fn default() -> Self {
        Self {
            max_agents: 100_000,
            max_states: 1_000_000,
            tail_tolerance: 1e-14,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum Error {
    InvalidInput(&'static str),
    AgentLimit { limit: usize },
    StateLimit { limit: usize },
    NoFeasibleStaffing { max_agents: usize },
    NumericalFailure(&'static str),
    HeadcountOverflow,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput(message) | Self::NumericalFailure(message) => f.write_str(message),
            Self::AgentLimit { limit } => write!(f, "staffing exceeds the {limit} agent limit"),
            Self::StateLimit { limit } => write!(
                f,
                "queue distribution did not converge within {limit} states"
            ),
            Self::NoFeasibleStaffing { max_agents } => {
                write!(f, "no feasible staffing within {max_agents} agents")
            }
            Self::HeadcountOverflow => {
                f.write_str("shrinkage-adjusted headcount exceeds the integer range")
            }
        }
    }
}

impl error::Error for Error {}
