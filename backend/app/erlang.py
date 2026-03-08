from __future__ import annotations

import math
from typing import Any

from .models import StaffingInput, StaffingMetrics
from .rates import arrival_rate, occupancy, patience_rate, service_rate, traffic_intensity

UNSTABLE_DELAY_RATE_EPSILON = 1e-9
ASA_TIME_BUCKETS_MINUTES = (1, 2, 5, 10, 20, 30, 60)


def _apply_shrinkage(net_staff: int, shrinkage: float) -> int:
    if net_staff < 0:
        raise ValueError("net_staff must be >= 0")
    if not 0 <= shrinkage < 1:
        raise ValueError("shrinkage must be in [0, 1)")
    if net_staff == 0:
        return 0
    return math.ceil(net_staff / (1.0 - shrinkage))


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


def _erlang_a_abandon_prob(
    arrival_rate_value: float,
    service_rate_value: float,
    patience_rate_value: float,
    num_agents: int,
    tol: float = 1e-12,
    max_terms: int = 10_000,
) -> float:
    state_prob = [1.0]
    n = 0
    while n < max_terms:
        n += 1
        if n <= num_agents:
            capacity = n * service_rate_value
        else:
            capacity = num_agents * service_rate_value + (n - num_agents) * patience_rate_value

        state_prob.append(state_prob[-1] * arrival_rate_value / capacity)
        if state_prob[-1] < tol and n > num_agents + 50:
            break

    normalisation = sum(state_prob)
    normalized = [p / normalisation for p in state_prob]
    abandonment_flow = sum(
        (n - num_agents) * patience_rate_value * normalized[n]
        for n in range(num_agents + 1, len(normalized))
    )
    return abandonment_flow / arrival_rate_value if arrival_rate_value > 0 else 0.0


def _metrics_for_agents(inputs: StaffingInput, num_agents: int) -> StaffingMetrics:
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


def staff_for_interval(inputs: StaffingInput) -> StaffingMetrics:
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
        return _metrics_for_agents(inputs, 0)

    lambda_rate = arrival_rate(inputs.calls_offered, inputs.interval_duration_seconds)
    offered_load = traffic_intensity(lambda_rate, inputs.avg_handle_time_seconds)
    num_agents = max(1, math.ceil(offered_load))

    while True:
        metrics = _metrics_for_agents(inputs, num_agents)
        if metrics["occupancy"] > inputs.max_occupancy:
            num_agents += 1
            continue
        if metrics["service_level"] < inputs.target_service_level:
            num_agents += 1
            continue
        return metrics


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


def build_results_payload(inputs: StaffingInput, shrinkage: float = 0.0) -> dict[str, Any]:
    if not 0 <= shrinkage < 1:
        raise ValueError("shrinkage must be in [0, 1)")

    recommended = staff_for_interval(inputs)
    recommended_agents = recommended["required_staff"]
    recommended_headcount = _apply_shrinkage(recommended_agents, shrinkage)

    scenarios = []
    lower_bound = max(0, recommended_agents - 3)
    upper_bound = recommended_agents + 3

    for staff_count in range(lower_bound, upper_bound + 1):
        metrics = _metrics_for_agents(inputs, staff_count)
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
