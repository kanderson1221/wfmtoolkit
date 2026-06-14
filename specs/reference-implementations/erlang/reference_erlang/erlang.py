from __future__ import annotations

import math
from typing import Any

from .models import StaffingInput, StaffingMetrics
from .rates import arrival_rate, occupancy, patience_rate, service_rate, traffic_intensity

UNSTABLE_DELAY_RATE_EPSILON = 1e-9
ASA_TIME_BUCKETS_MINUTES = (1, 2, 5, 10, 20, 30, 60)
ERLANG_C_MODEL = "erlang_c"
ERLANG_A_MODEL = "erlang_a"
SUPPORTED_STAFFING_MODELS = {ERLANG_C_MODEL, ERLANG_A_MODEL}


def _apply_shrinkage(net_staff: int, shrinkage: float) -> int:
    if net_staff < 0:
        raise ValueError("net_staff must be >= 0")
    if not 0 <= shrinkage < 1:
        raise ValueError("shrinkage must be in [0, 1)")
    if net_staff == 0:
        return 0
    return math.ceil(net_staff / (1.0 - shrinkage))


def _normalize_model(model: str | None) -> str:
    if model is None:
        return ERLANG_C_MODEL

    normalized = model.strip().lower().replace("-", "_").replace(" ", "_")
    if normalized not in SUPPORTED_STAFFING_MODELS:
        raise ValueError("model must be 'erlang_c' or 'erlang_a'")
    return normalized


def _erlang_b_prob(traffic_intensity_value: float, num_agents: int) -> float:
    """Compute Erlang B recursively to avoid factorial/power overflow."""
    if num_agents <= 0:
        raise ValueError("num_agents must be > 0")
    if traffic_intensity_value <= 0:
        return 0.0

    blocking_prob = 1.0
    for staff_count in range(1, num_agents + 1):
        numerator = traffic_intensity_value * blocking_prob
        blocking_prob = numerator / (staff_count + numerator)

    return blocking_prob


def _erlang_c_prob(traffic_intensity_value: float, num_agents: int) -> float:
    if num_agents <= 0:
        raise ValueError("num_agents must be > 0")
    if traffic_intensity_value <= 0:
        return 0.0
    if traffic_intensity_value >= num_agents:
        return 1.0

    erlang_b = _erlang_b_prob(traffic_intensity_value, num_agents)
    occupancy_ratio = traffic_intensity_value / num_agents
    denominator = 1.0 - occupancy_ratio + occupancy_ratio * erlang_b
    if denominator <= 0:
        return 1.0
    queue_wait_prob = erlang_b / denominator
    return max(0.0, min(1.0, queue_wait_prob))


def _erlang_a_state_probabilities(
    arrival_rate_value: float,
    service_rate_value: float,
    patience_rate_value: float,
    num_agents: int,
    tol: float = 1e-12,
    max_terms: int = 10_000,
) -> list[float]:
    if num_agents < 0:
        raise ValueError("num_agents must be >= 0")
    if arrival_rate_value <= 0:
        return [1.0]

    state_probabilities = [1.0]
    for state in range(1, max_terms + 1):
        if state <= num_agents:
            departure_rate = state * service_rate_value
        else:
            departure_rate = num_agents * service_rate_value + (state - num_agents) * patience_rate_value

        if departure_rate <= 0:
            break

        next_probability = state_probabilities[-1] * arrival_rate_value / departure_rate
        state_probabilities.append(next_probability)

        if next_probability < tol and state > num_agents + 50:
            break

    normalisation = sum(state_probabilities)
    if normalisation <= 0:
        return [1.0]

    return [probability / normalisation for probability in state_probabilities]


def _erlang_a_waiting_rates(
    service_rate_value: float, patience_rate_value: float, num_agents: int, queue_position: int
) -> tuple[float, float]:
    progress_rate = num_agents * service_rate_value + (queue_position - 1) * patience_rate_value
    total_rate = progress_rate + patience_rate_value
    return progress_rate, total_rate


def _erlang_a_service_within_target_probabilities(
    service_rate_value: float,
    patience_rate_value: float,
    num_agents: int,
    max_queue_position: int,
    threshold_seconds: float,
) -> list[float]:
    probabilities = [1.0] + [0.0] * max_queue_position
    if max_queue_position <= 0 or threshold_seconds <= 0:
        return probabilities

    progress_rates = [0.0] * (max_queue_position + 1)
    total_rates = [0.0] * (max_queue_position + 1)
    max_total_rate = 0.0

    for queue_position in range(1, max_queue_position + 1):
        progress_rate, total_rate = _erlang_a_waiting_rates(
            service_rate_value, patience_rate_value, num_agents, queue_position
        )
        progress_rates[queue_position] = progress_rate
        total_rates[queue_position] = total_rate
        max_total_rate = max(max_total_rate, total_rate)

    if max_total_rate <= 0:
        return probabilities

    steps = max(80, min(5000, int(math.ceil(threshold_seconds * max_total_rate * 12.0))))
    dt = threshold_seconds / steps
    state = [0.0] * (max_queue_position + 1)
    state[0] = 1.0

    def derivative(current: list[float]) -> list[float]:
        result = [0.0] * (max_queue_position + 1)
        for queue_position in range(1, max_queue_position + 1):
            result[queue_position] = (
                progress_rates[queue_position] * current[queue_position - 1]
                - total_rates[queue_position] * current[queue_position]
            )
        return result

    for _ in range(steps):
        k1 = derivative(state)
        temp_state = [state[index] + 0.5 * dt * k1[index] for index in range(max_queue_position + 1)]
        k2 = derivative(temp_state)
        temp_state = [state[index] + 0.5 * dt * k2[index] for index in range(max_queue_position + 1)]
        k3 = derivative(temp_state)
        temp_state = [state[index] + dt * k3[index] for index in range(max_queue_position + 1)]
        k4 = derivative(temp_state)

        for queue_position in range(1, max_queue_position + 1):
            state[queue_position] += (dt / 6.0) * (
                k1[queue_position]
                + (2.0 * k2[queue_position])
                + (2.0 * k3[queue_position])
                + k4[queue_position]
            )
            state[queue_position] = max(0.0, min(1.0, state[queue_position]))

    for queue_position in range(1, max_queue_position + 1):
        probabilities[queue_position] = state[queue_position]

    return probabilities


def _erlang_a_queue_metrics(
    arrival_rate_value: float,
    service_rate_value: float,
    patience_rate_value: float,
    num_agents: int,
    answer_time_seconds: float,
) -> tuple[float, float, float, float, float]:
    state_probabilities = _erlang_a_state_probabilities(
        arrival_rate_value, service_rate_value, patience_rate_value, num_agents
    )

    if num_agents > 0:
        busy_agents = sum(
            min(state, num_agents) * probability
            for state, probability in enumerate(state_probabilities)
        )
        occupancy_ratio = busy_agents / num_agents
        immediate_answer_probability = sum(state_probabilities[:num_agents])
    else:
        occupancy_ratio = 1.0 if arrival_rate_value > 0 else 0.0
        immediate_answer_probability = 0.0

    max_queue_position = max(0, len(state_probabilities) - num_agents)
    eventual_service_probabilities = [1.0] + [0.0] * max_queue_position
    wait_time_mass = [0.0] * (max_queue_position + 1)

    for queue_position in range(1, max_queue_position + 1):
        progress_rate, total_rate = _erlang_a_waiting_rates(
            service_rate_value, patience_rate_value, num_agents, queue_position
        )
        if total_rate <= 0 or progress_rate <= 0:
            continue

        move_probability = progress_rate / total_rate
        eventual_service_probabilities[queue_position] = (
            move_probability * eventual_service_probabilities[queue_position - 1]
        )
        wait_time_mass[queue_position] = (
            (progress_rate * eventual_service_probabilities[queue_position - 1])
            / (total_rate * total_rate)
            + move_probability * wait_time_mass[queue_position - 1]
        )

    service_within_target_probabilities = _erlang_a_service_within_target_probabilities(
        service_rate_value,
        patience_rate_value,
        num_agents,
        max_queue_position,
        answer_time_seconds,
    )

    delayed_state_start = num_agents if num_agents > 0 else 0
    served_fraction = immediate_answer_probability
    service_level = immediate_answer_probability
    answer_wait_seconds_mass = 0.0

    for state in range(delayed_state_start, len(state_probabilities)):
        probability = state_probabilities[state]
        queue_position = state - num_agents + 1
        served_fraction += probability * eventual_service_probabilities[queue_position]
        service_level += probability * service_within_target_probabilities[queue_position]
        answer_wait_seconds_mass += probability * wait_time_mass[queue_position]

    asa_seconds = float("inf") if served_fraction <= 0 else answer_wait_seconds_mass / served_fraction
    abandon_fraction = max(0.0, min(1.0, 1.0 - served_fraction))

    return (
        max(0.0, min(1.0, service_level)),
        max(0.0, min(1.0, occupancy_ratio)),
        asa_seconds,
        max(0.0, min(1.0, immediate_answer_probability)),
        abandon_fraction,
    )


def _erlang_a_abandon_prob(
    arrival_rate_value: float,
    service_rate_value: float,
    patience_rate_value: float,
    num_agents: int,
    tol: float = 1e-12,
    max_terms: int = 10_000,
) -> float:
    normalized = _erlang_a_state_probabilities(
        arrival_rate_value,
        service_rate_value,
        patience_rate_value,
        num_agents,
        tol=tol,
        max_terms=max_terms,
    )
    abandonment_flow = sum(
        (n - num_agents) * patience_rate_value * normalized[n]
        for n in range(num_agents + 1, len(normalized))
    )
    return abandonment_flow / arrival_rate_value if arrival_rate_value > 0 else 0.0


def _metrics_for_agents(inputs: StaffingInput, num_agents: int, model: str = ERLANG_C_MODEL) -> StaffingMetrics:
    model_name = _normalize_model(model)
    if num_agents < 0:
        raise ValueError("num_agents must be >= 0")

    if inputs.calls_offered == 0:
        return StaffingMetrics(
            required_staff=num_agents,
            service_level=1.0,
            occupancy=0.0,
            average_speed_of_answer_seconds=0.0,
            percent_answered_immediately=1.0,
            abandon_percent=0.0,
        )

    if num_agents == 0:
        return StaffingMetrics(
            required_staff=0,
            service_level=0.0,
            occupancy=1.0,
            average_speed_of_answer_seconds=float("inf"),
            percent_answered_immediately=0.0,
            abandon_percent=1.0,
        )

    lambda_rate = arrival_rate(inputs.calls_offered, inputs.interval_duration_seconds)
    mu_rate = service_rate(inputs.avg_handle_time_seconds)
    theta_rate = patience_rate(inputs.avg_caller_patience_seconds)
    offered_load = traffic_intensity(lambda_rate, inputs.avg_handle_time_seconds)

    if model_name == ERLANG_A_MODEL:
        service_level, occupancy_ratio, asa_seconds, answered_immediately, abandon_pct = (
            _erlang_a_queue_metrics(
                lambda_rate,
                mu_rate,
                theta_rate,
                num_agents,
                inputs.service_level_answer_time_seconds,
            )
        )
        return StaffingMetrics(
            required_staff=num_agents,
            service_level=service_level,
            occupancy=occupancy_ratio,
            average_speed_of_answer_seconds=asa_seconds,
            percent_answered_immediately=answered_immediately,
            abandon_percent=abandon_pct,
        )

    queue_wait_prob = _erlang_c_prob(offered_load, num_agents)
    delay_rate = num_agents * mu_rate - lambda_rate

    if delay_rate <= UNSTABLE_DELAY_RATE_EPSILON:
        service_level = 0.0
        asa_seconds = float("inf")
    else:
        service_level = 1.0 - queue_wait_prob * math.exp(
            -delay_rate * inputs.service_level_answer_time_seconds
        )
        asa_seconds = queue_wait_prob / delay_rate

    abandon_pct = _erlang_a_abandon_prob(lambda_rate, mu_rate, theta_rate, num_agents)

    return StaffingMetrics(
        required_staff=num_agents,
        service_level=max(0.0, min(1.0, service_level)),
        occupancy=max(0.0, occupancy(offered_load, num_agents)),
        average_speed_of_answer_seconds=asa_seconds,
        percent_answered_immediately=max(0.0, min(1.0, 1.0 - queue_wait_prob)),
        abandon_percent=max(0.0, min(1.0, abandon_pct)),
    )


def _meets_staffing_targets(inputs: StaffingInput, metrics: StaffingMetrics) -> bool:
    return (
        metrics["occupancy"] <= inputs.max_occupancy
        and metrics["service_level"] >= inputs.target_service_level
    )


def staff_for_interval(inputs: StaffingInput, model: str = ERLANG_C_MODEL) -> StaffingMetrics:
    model_name = _normalize_model(model)
    if not 0 < inputs.target_service_level <= 1:
        raise ValueError("target_service_level must be in (0, 1]")
    if not 0 < inputs.max_occupancy <= 1:
        raise ValueError("max_occupancy must be in (0, 1]")
    if inputs.service_level_answer_time_seconds < 0:
        raise ValueError("service_level_answer_time_seconds must be >= 0")
    if inputs.calls_offered < 0:
        raise ValueError("calls_offered must be >= 0")
    if inputs.interval_duration_seconds <= 0:
        raise ValueError("interval_duration_seconds must be > 0")
    if inputs.avg_handle_time_seconds <= 0:
        raise ValueError("avg_handle_time_seconds must be > 0")
    if inputs.avg_caller_patience_seconds <= 0:
        raise ValueError("avg_caller_patience_seconds must be > 0")

    if inputs.calls_offered == 0:
        return _metrics_for_agents(inputs, 0, model_name)

    lambda_rate = arrival_rate(inputs.calls_offered, inputs.interval_duration_seconds)
    offered_load = traffic_intensity(lambda_rate, inputs.avg_handle_time_seconds)
    upper_bound = max(1, math.ceil(offered_load)) if model_name == ERLANG_C_MODEL else 1
    metrics_by_agents: dict[int, StaffingMetrics] = {}

    def metrics_for(agent_count: int) -> StaffingMetrics:
        if agent_count not in metrics_by_agents:
            metrics_by_agents[agent_count] = _metrics_for_agents(inputs, agent_count, model_name)
        return metrics_by_agents[agent_count]

    while not _meets_staffing_targets(inputs, metrics_for(upper_bound)):
        upper_bound *= 2
        if upper_bound > 100_000:
            raise ValueError("unable to find feasible staffing level for the provided inputs")

    lower_bound = 0
    while lower_bound + 1 < upper_bound:
        candidate = (lower_bound + upper_bound) // 2
        if _meets_staffing_targets(inputs, metrics_for(candidate)):
            upper_bound = candidate
        else:
            lower_bound = candidate

    return metrics_for(upper_bound)


def _percent_str(value: float) -> str:
    return f"{value * 100:.1f}%"


def _seconds_str(value: float) -> str:
    if math.isinf(value):
        return "Unstable"

    for index, bucket_minutes in enumerate(ASA_TIME_BUCKETS_MINUTES):
        bucket_seconds = bucket_minutes * 60.0
        if value >= bucket_seconds:
            continue
        if index == 0:
            return f"{value:.1f} sec"
        previous_bucket = ASA_TIME_BUCKETS_MINUTES[index - 1]
        return f"> {previous_bucket} min"

    return f"> {ASA_TIME_BUCKETS_MINUTES[-1]} min"


def build_results_payload(
    inputs: StaffingInput, shrinkage: float = 0.0, model: str = ERLANG_C_MODEL
) -> dict[str, Any]:
    if not 0 <= shrinkage < 1:
        raise ValueError("shrinkage must be in [0, 1)")
    model_name = _normalize_model(model)

    recommended = staff_for_interval(inputs, model_name)
    recommended_agents = recommended["required_staff"]
    recommended_headcount = _apply_shrinkage(recommended_agents, shrinkage)

    scenarios = []
    lower_bound = max(0, recommended_agents - 3)
    upper_bound = recommended_agents + 3

    for staff_count in range(lower_bound, upper_bound + 1):
        metrics = _metrics_for_agents(inputs, staff_count, model_name)
        scenarios.append(
            {
                "agents": str(staff_count),
                "requiredHeadcount": str(_apply_shrinkage(staff_count, shrinkage)),
                "serviceLevel": _percent_str(metrics["service_level"]),
                "asa": _seconds_str(metrics["average_speed_of_answer_seconds"]),
                "percentAnsweredImmediately": _percent_str(
                    metrics["percent_answered_immediately"]
                ),
                "expectedOccupancy": _percent_str(metrics["occupancy"]),
                "abandonment": _percent_str(metrics["abandon_percent"]),
                "isRecommended": staff_count == recommended_agents,
            }
        )

    return {
        "summary": {
            "requiredAgents": str(recommended["required_staff"]),
            "requiredHeadcount": str(recommended_headcount),
            "serviceLevel": _percent_str(recommended["service_level"]),
            "expectedAsa": _seconds_str(recommended["average_speed_of_answer_seconds"]),
            "percentAnsweredImmediately": _percent_str(
                recommended["percent_answered_immediately"]
            ),
            "estimatedOccupancy": _percent_str(recommended["occupancy"]),
            "abandonPercent": _percent_str(recommended["abandon_percent"]),
        },
        "scenarios": scenarios,
    }
