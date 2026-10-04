use crate::{
    math::Sum, negative_binomial::WaitingTimeScratch, Error, SolverLimits, StaffingMetrics,
};

/// Mode-centered birth/death probabilities. Rates are in units of service rate.
/// Starting at the mode bounds every unnormalized weight by one; neither
/// factorials nor the exponentially large p[n]/p[0] weights are formed.
pub(crate) fn distribution(
    load: f64,
    patience: f64,
    agents: usize,
    limits: SolverLimits,
    weights: &mut Vec<f64>,
) -> Result<(), Error> {
    let capacity = agents as f64;
    let mode = if load <= capacity {
        load.floor()
    } else {
        capacity + ((load - capacity) / patience).floor()
    };
    if !mode.is_finite() || mode >= limits.max_states as f64 {
        return Err(Error::StateLimit {
            limit: limits.max_states,
        });
    }
    let mode = mode as usize;
    weights.clear();
    weights.resize(mode + 1, 0.0);
    weights[mode] = 1.0;
    let departure = |state: usize| {
        if state <= agents {
            state as f64
        } else {
            capacity + (state - agents) as f64 * patience
        }
    };
    let mut normalizer = Sum::default();
    normalizer.add(1.0);
    for state in (1..=mode).rev() {
        let rate = departure(state);
        let ratio = if rate.is_finite() {
            rate / load
        } else {
            capacity / load + (state - agents) as f64 * (patience / load)
        };
        weights[state - 1] = weights[state] * ratio;
        normalizer.add(weights[state - 1]);
    }
    loop {
        let next_state = weights.len();
        let rate = departure(next_state);
        let ratio = if rate.is_finite() {
            load / rate
        } else {
            (load / patience) / (capacity / patience + (next_state - agents) as f64)
        };
        let next = weights[next_state - 1] * ratio;
        // Departure rates are nondecreasing, so remaining ratios cannot exceed
        // this one. This geometric bound includes every omitted state.
        if ratio < 1.0 && next / (1.0 - ratio) <= limits.tail_tolerance * normalizer.value() {
            break;
        }
        if next_state >= limits.max_states {
            return Err(Error::StateLimit {
                limit: limits.max_states,
            });
        }
        if !next.is_finite() {
            return Err(Error::NumericalFailure("non-finite stationary probability"));
        }
        weights.push(next);
        normalizer.add(next);
    }
    let total = normalizer.value();
    if !total.is_finite() || total <= 0.0 {
        return Err(Error::NumericalFailure("invalid stationary normalization"));
    }
    for weight in weights {
        *weight /= total;
    }
    Ok(())
}

/// Arrival-state probability of abandoning, summed directly to avoid 1-served
/// cancellation when abandonment is small. P(abandon | position j)=jθ/(c+jθ).
pub(crate) fn abandonment(weights: &[f64], patience: f64, agents: usize) -> f64 {
    let mut total = Sum::default();
    for (index, &probability) in weights.iter().enumerate().skip(agents) {
        let position = (index - agents + 1) as f64;
        let queue_rate = position * patience;
        let rate = agents as f64 + queue_rate;
        let abandon = if rate.is_finite() {
            queue_rate / rate
        } else {
            position / (agents as f64 / patience + position)
        };
        total.add(probability * abandon);
    }
    total.value().clamp(0.0, 1.0)
}

pub(crate) struct StateSummary {
    pub occupancy: f64,
    pub immediate: f64,
}

/// Cheap first stage for a staffing trial: no waiting-time arrays or ASA work.
pub(crate) fn state_summary(weights: &[f64], agents: usize) -> StateSummary {
    let capacity = agents as f64;
    let mut immediate = Sum::default();
    let mut occupancy = Sum::default();
    for (state, &probability) in weights.iter().enumerate() {
        occupancy.add(probability * (state.min(agents) as f64 / capacity));
        if state < agents {
            immediate.add(probability);
        }
    }
    StateSummary {
        occupancy: occupancy.value().clamp(0.0, 1.0),
        immediate: immediate.value(),
    }
}

fn served_probability(patience: f64, capacity: f64, position: usize) -> f64 {
    let rate = capacity + position as f64 * patience;
    if rate.is_finite() {
        capacity / rate
    } else {
        (capacity / patience) / (capacity / patience + position as f64)
    }
}

/// Second stage for trials that satisfy occupancy. Summation matches the full
/// metric path so the target comparison uses exactly the same numerical result.
pub(crate) fn service_level(
    weights: &[f64],
    patience: f64,
    agents: usize,
    immediate: f64,
    cdfs: &[f64],
) -> f64 {
    let mut total = Sum::default();
    total.add(immediate);
    for (state, &probability) in weights.iter().enumerate().skip(agents) {
        let position = state - agents + 1;
        total.add(
            probability * served_probability(patience, agents as f64, position) * cdfs[position],
        );
    }
    total.value().clamp(0.0, 1.0)
}

pub(crate) fn metrics(
    weights: &[f64],
    patience: f64,
    handle_time: f64,
    target_time: f64,
    agents: usize,
    waiting: &mut WaitingTimeScratch,
) -> Result<StaffingMetrics, Error> {
    let capacity = agents as f64;
    let summary = state_summary(weights, agents);
    let positions = weights.len().saturating_sub(agents);
    let cdfs = waiting.service_cdfs(capacity, patience, target_time, positions)?;
    let level = service_level(weights, patience, agents, summary.immediate, cdfs);
    let mut served = Sum::default();
    let mut wait_mass = Sum::default();
    let mut conditional_wait = Sum::default();
    served.add(summary.immediate);
    for (state, &probability) in weights.iter().enumerate().skip(agents) {
        let position = state - agents + 1;
        let total_rate = capacity + position as f64 * patience;
        // The product of progress probabilities telescopes to c/(c+jθ).
        // Conditioned on service, wait is a sum of exponentials c+kθ.
        let (served_probability, wait) = if total_rate.is_finite() {
            (capacity / total_rate, handle_time / total_rate)
        } else {
            let scaled_rate = capacity / patience + position as f64;
            (
                (capacity / patience) / scaled_rate,
                (handle_time / patience) / scaled_rate,
            )
        };
        conditional_wait.add(wait);
        served.add(probability * served_probability);
        wait_mass.add(probability * served_probability * conditional_wait.value());
    }
    let asa = wait_mass.value() / served.value();
    if !asa.is_finite() || !level.is_finite() {
        return Err(Error::NumericalFailure(
            "queue metrics exceed floating-point range",
        ));
    }
    Ok(StaffingMetrics {
        required_staff: agents,
        service_level: level,
        occupancy: summary.occupancy,
        average_speed_of_answer_seconds: asa,
        percent_answered_immediately: summary.immediate.clamp(0.0, 1.0),
        abandon_percent: abandonment(weights, patience, agents),
    })
}
