from __future__ import annotations


def arrival_rate(calls_offered: float, interval_seconds: float) -> float:
    if calls_offered < 0:
        raise ValueError("calls_offered must be non-negative")
    if interval_seconds <= 0:
        raise ValueError("interval_seconds must be positive")
    return calls_offered / interval_seconds


def service_rate(avg_handle_time_seconds: float) -> float:
    if avg_handle_time_seconds <= 0:
        raise ValueError("avg_handle_time_seconds must be positive")
    return 1.0 / avg_handle_time_seconds


def patience_rate(avg_patience_seconds: float) -> float:
    if avg_patience_seconds <= 0:
        raise ValueError("avg_patience_seconds must be positive")
    return 1.0 / avg_patience_seconds


def traffic_intensity(arrival_rate_value: float, avg_handle_time_seconds: float) -> float:
    if arrival_rate_value < 0:
        raise ValueError("arrival_rate_value must be non-negative")
    if avg_handle_time_seconds <= 0:
        raise ValueError("avg_handle_time_seconds must be positive")
    return arrival_rate_value * avg_handle_time_seconds


def occupancy(traffic_intensity_value: float, num_agents: int) -> float:
    if traffic_intensity_value < 0:
        raise ValueError("traffic_intensity_value must be non-negative")
    if num_agents <= 0:
        raise ValueError("num_agents must be positive")
    return traffic_intensity_value / num_agents
