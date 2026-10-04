use crate::StaffingMetrics;

/// Busy fraction in an M/M/s/s loss system: a lower bound on Erlang A occupancy
/// because immediately discarding every queued arrival minimizes carried load.
pub(crate) fn loss_system_occupancy(load: f64, agents: usize) -> f64 {
    let mut blocking = 1.0;
    for count in 1..agents {
        let numerator = load * blocking;
        blocking = numerator / (count as f64 + numerator);
    }
    // Algebraically a*(1-B_s)/s, without cancellation when B_s is almost one.
    (load / (agents as f64 + load * blocking)).clamp(0.0, 1.0)
}

/// Stable Erlang B recurrence: all intermediate probabilities stay in [0, 1].
pub(crate) fn waiting_probability(load: f64, agents: usize) -> f64 {
    if load == 0.0 {
        return 0.0;
    }
    if load >= agents as f64 {
        return 1.0;
    }
    let mut blocking = 1.0;
    for count in 1..=agents {
        let numerator = load * blocking;
        blocking = numerator / (count as f64 + numerator);
    }
    let idle_fraction = (agents as f64 - load) / agents as f64;
    blocking / (idle_fraction + (load / agents as f64) * blocking)
}

fn service_level_from_wait(load: f64, target_time: f64, agents: usize, wait: f64) -> f64 {
    let spare_capacity = agents as f64 - load;
    if spare_capacity <= 0.0 {
        return 0.0;
    }
    // expm1 preserves the small SL when wait is close to one and t is small.
    ((1.0 - wait) - wait * (-spare_capacity * target_time).exp_m1()).clamp(0.0, 1.0)
}

pub(crate) fn service_level(load: f64, target_time: f64, agents: usize) -> f64 {
    service_level_from_wait(load, target_time, agents, waiting_probability(load, agents))
}

/// Full C metrics for the selected staffing level or an explicit scenario.
pub(crate) fn metrics(
    load: f64,
    handle_time: f64,
    target_time: f64,
    agents: usize,
) -> StaffingMetrics {
    let wait = waiting_probability(load, agents);
    let spare_capacity = agents as f64 - load;
    let asa = if spare_capacity <= 0.0 {
        f64::INFINITY
    } else {
        wait * (handle_time / spare_capacity)
    };
    StaffingMetrics {
        required_staff: agents,
        service_level: service_level_from_wait(load, target_time, agents, wait),
        occupancy: load / agents as f64,
        average_speed_of_answer_seconds: asa,
        percent_answered_immediately: 1.0 - wait,
        abandon_percent: 0.0,
    }
}
