from __future__ import annotations

from dataclasses import dataclass
from typing import TypedDict


class StaffingMetrics(TypedDict):
    required_staff: int
    service_level: float
    occupancy: float
    average_speed_of_answer_seconds: float
    percent_answered_immediately: float
    abandon_percent: float


@dataclass(frozen=True)
class StaffingInput:
    calls_offered: float
    interval_duration_seconds: float
    avg_handle_time_seconds: float
    target_service_level: float
    service_level_answer_time_seconds: float
    max_occupancy: float = 0.85
    avg_caller_patience_seconds: float = 60.0


@dataclass(frozen=True)
class IntervalForecast:
    queue_id: str
    interval_start: str
    calls_offered: float
    avg_handle_time_seconds: float
    shrinkage: float
    mean_patience_seconds: float
    min_occupancy: float
    max_occupancy: float
    service_level_threshold: float
    service_level_target_seconds: float
    interval_duration_seconds: float = 30 * 60


@dataclass(frozen=True)
class IntervalPlan:
    queue_id: str
    interval_start: str
    required_staff_net: int
    required_staff_gross: int
    service_level: float
    occupancy: float
    average_speed_of_answer_seconds: float
    percent_answered_immediately: float
    abandon_percent: float
    interval_duration_seconds: float = 30 * 60


@dataclass(frozen=True)
class DailyStaffingPlan:
    queue_id: str
    service_date: str
    interval_count: int
    total_labor_minutes_net: float
    total_labor_hours_net: float
    total_labor_minutes_gross: float
    total_labor_hours_gross: float
    peak_staff_net: int
    peak_staff_gross: int
    staff_to_cover_90pct_net: int
    staff_to_cover_90pct_gross: int
    staff_to_cover_95pct_net: int
    staff_to_cover_95pct_gross: int
