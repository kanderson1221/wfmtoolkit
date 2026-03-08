from __future__ import annotations

import csv
import math
from collections import defaultdict
from dataclasses import asdict, fields
from datetime import datetime
from pathlib import Path
from typing import TypeVar

from .erlang import staff_for_interval
from .models import DailyStaffingPlan, IntervalForecast, IntervalPlan, StaffingInput

DataClassType = TypeVar("DataClassType")


def apply_shrinkage(net_staff: int, shrinkage: float) -> int:
    if net_staff < 0:
        raise ValueError("net_staff must be >= 0")
    if not 0 <= shrinkage < 1:
        raise ValueError("shrinkage must be in [0, 1)")
    if net_staff == 0:
        return 0
    return math.ceil(net_staff / (1.0 - shrinkage))


def plan_interval(forecast: IntervalForecast) -> IntervalPlan:
    result = staff_for_interval(
        StaffingInput(
            calls_offered=forecast.calls_offered,
            interval_duration_seconds=forecast.interval_duration_seconds,
            avg_handle_time_seconds=forecast.avg_handle_time_seconds,
            target_service_level=forecast.service_level_threshold,
            service_level_answer_time_seconds=forecast.service_level_target_seconds,
            max_occupancy=forecast.max_occupancy,
            avg_caller_patience_seconds=forecast.mean_patience_seconds,
        )
    )

    gross_staff = apply_shrinkage(result["required_staff"], forecast.shrinkage)

    return IntervalPlan(
        queue_id=forecast.queue_id,
        interval_start=forecast.interval_start,
        required_staff_net=result["required_staff"],
        required_staff_gross=gross_staff,
        service_level=result["service_level"],
        occupancy=result["occupancy"],
        average_speed_of_answer_seconds=result["average_speed_of_answer_seconds"],
        percent_answered_immediately=result["percent_answered_immediately"],
        abandon_percent=result["abandon_percent"],
        interval_duration_seconds=forecast.interval_duration_seconds,
    )


def plan_intervals(forecasts: list[IntervalForecast]) -> list[IntervalPlan]:
    return [plan_interval(forecast) for forecast in forecasts]


def _service_date(interval_start: str) -> str:
    normalized = interval_start.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized).date().isoformat()
    except ValueError:
        return interval_start.split(" ")[0].split("T")[0]


def _coverage_staff(levels: list[int], coverage: float) -> int:
    if not 0 < coverage <= 1:
        raise ValueError("coverage must be in (0, 1]")
    if not levels:
        return 0
    ordered = sorted(levels)
    required_rank = math.ceil(coverage * len(ordered))
    return ordered[required_rank - 1]


def plan_daily(interval_plans: list[IntervalPlan]) -> list[DailyStaffingPlan]:
    grouped: dict[tuple[str, str], list[IntervalPlan]] = defaultdict(list)
    for plan in interval_plans:
        key = (plan.queue_id, _service_date(plan.interval_start))
        grouped[key].append(plan)

    daily_rows: list[DailyStaffingPlan] = []
    for (queue_id, service_date), plans in sorted(grouped.items()):
        net_levels = [plan.required_staff_net for plan in plans]
        gross_levels = [plan.required_staff_gross for plan in plans]

        total_minutes_net = sum(
            plan.required_staff_net * (plan.interval_duration_seconds / 60.0) for plan in plans
        )
        total_minutes_gross = sum(
            plan.required_staff_gross * (plan.interval_duration_seconds / 60.0) for plan in plans
        )

        daily_rows.append(
            DailyStaffingPlan(
                queue_id=queue_id,
                service_date=service_date,
                interval_count=len(plans),
                total_labor_minutes_net=total_minutes_net,
                total_labor_hours_net=total_minutes_net / 60.0,
                total_labor_minutes_gross=total_minutes_gross,
                total_labor_hours_gross=total_minutes_gross / 60.0,
                peak_staff_net=max(net_levels, default=0),
                peak_staff_gross=max(gross_levels, default=0),
                staff_to_cover_90pct_net=_coverage_staff(net_levels, 0.90),
                staff_to_cover_90pct_gross=_coverage_staff(gross_levels, 0.90),
                staff_to_cover_95pct_net=_coverage_staff(net_levels, 0.95),
                staff_to_cover_95pct_gross=_coverage_staff(gross_levels, 0.95),
            )
        )

    return daily_rows


def load_forecasts_csv(path: str | Path, interval_duration_seconds: float = 30 * 60) -> list[IntervalForecast]:
    rows: list[IntervalForecast] = []
    with Path(path).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(
                IntervalForecast(
                    queue_id=row["queue_id"],
                    interval_start=row["interval_start"],
                    calls_offered=float(row["calls_offered"]),
                    avg_handle_time_seconds=float(row["aht_seconds"]),
                    shrinkage=float(row["shrinkage"]),
                    mean_patience_seconds=float(row["mean_patience_seconds"]),
                    min_occupancy=float(row["min_occupancy"]),
                    max_occupancy=float(row["max_occupancy"]),
                    service_level_threshold=float(row["service_level_threshold"]),
                    service_level_target_seconds=float(row["service_level_target_seconds"]),
                    interval_duration_seconds=interval_duration_seconds,
                )
            )

    return rows


def _write_dataclass_csv(
    path: str | Path,
    rows: list[DataClassType],
    row_type: type[DataClassType],
) -> Path:
    output_path = Path(path)
    field_names = [field.name for field in fields(row_type)]
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=field_names)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))

    return output_path


def export_interval_plan_csv(
    forecast_csv_path: str | Path,
    output_csv_path: str | Path = "plan.csv",
    interval_duration_seconds: float = 30 * 60,
) -> Path:
    forecasts = load_forecasts_csv(forecast_csv_path, interval_duration_seconds)
    interval_plans = plan_intervals(forecasts)
    return _write_dataclass_csv(output_csv_path, interval_plans, IntervalPlan)


def export_daily_plan_csv(
    forecast_csv_path: str | Path,
    output_csv_path: str | Path = "daily_plan.csv",
    interval_duration_seconds: float = 30 * 60,
) -> Path:
    forecasts = load_forecasts_csv(forecast_csv_path, interval_duration_seconds)
    interval_plans = plan_intervals(forecasts)
    daily_plans = plan_daily(interval_plans)
    return _write_dataclass_csv(output_csv_path, daily_plans, DailyStaffingPlan)
