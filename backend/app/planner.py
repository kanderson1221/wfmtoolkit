from __future__ import annotations

import csv
import math
from collections import defaultdict
from dataclasses import asdict, fields, replace
from datetime import datetime
from pathlib import Path
from typing import TypeVar

from .erlang import staff_for_interval, staffing_metrics_for_agents
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
    result = staff_for_interval(_staffing_input_for_forecast(forecast))

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


def _staffing_input_for_forecast(forecast: IntervalForecast) -> StaffingInput:
    return StaffingInput(
        calls_offered=forecast.calls_offered,
        interval_duration_seconds=forecast.interval_duration_seconds,
        avg_handle_time_seconds=forecast.avg_handle_time_seconds,
        target_service_level=forecast.service_level_threshold,
        service_level_answer_time_seconds=forecast.service_level_target_seconds,
        max_occupancy=forecast.max_occupancy,
        avg_caller_patience_seconds=forecast.mean_patience_seconds,
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


def plan_intraday_monthly_rows(
    rows: list[dict[str, float | int | str]],
) -> dict[str, list[dict[str, float | int | str]]]:
    interval_forecasts: list[IntervalForecast] = []
    normalized_rows: list[dict[str, float | int | str]] = []

    for row in rows:
        month_index = int(row["month_index"])
        interval_duration_seconds = float(row.get("interval_duration_seconds") or 30 * 60)
        minimum_headcount_value = float(row.get("minimum_headcount") or 0)
        if (
            not math.isfinite(minimum_headcount_value)
            or minimum_headcount_value < 0
            or not minimum_headcount_value.is_integer()
        ):
            raise ValueError("minimum_headcount must be a whole number >= 0")
        minimum_headcount = int(minimum_headcount_value)
        interval_forecasts.append(
            IntervalForecast(
                queue_id=f"month-{month_index}",
                interval_start=str(row["interval_start"]),
                calls_offered=float(row["calls_offered"]),
                avg_handle_time_seconds=float(row["average_handle_time_seconds"]),
                shrinkage=0.0,
                mean_patience_seconds=float(row.get("mean_patience_seconds") or 60.0),
                min_occupancy=0.0,
                max_occupancy=float(row["max_occupancy"]),
                service_level_threshold=float(row["service_level_goal"]),
                service_level_target_seconds=float(row["service_level_threshold_seconds"]),
                interval_duration_seconds=interval_duration_seconds,
            )
        )
        normalized_rows.append(
            {
                "month_index": month_index,
                "service_date": str(row["service_date"]),
                "interval_start": str(row["interval_start"]),
                "interval_duration_seconds": interval_duration_seconds,
                "calls_offered": float(row["calls_offered"]),
                "average_handle_time_seconds": float(row["average_handle_time_seconds"]),
                "minimum_headcount": minimum_headcount,
                "minimum_headcount_configured": "minimum_headcount" in row,
            }
        )

    configured_minimum_headcounts = {
        int(row["minimum_headcount"]) for row in normalized_rows
    }
    if len(configured_minimum_headcounts) > 1:
        raise ValueError("minimum_headcount must be consistent across all rows")

    erlang_interval_plans = plan_intervals(interval_forecasts)
    interval_plans: list[IntervalPlan] = []
    for forecast, metadata, erlang_plan in zip(
        interval_forecasts,
        normalized_rows,
        erlang_interval_plans,
        strict=False,
    ):
        erlang_required_staff_net = erlang_plan.required_staff_net
        minimum_headcount = int(metadata["minimum_headcount"])
        final_required_staff_net = max(erlang_required_staff_net, minimum_headcount)
        metadata["erlang_required_staff_net"] = erlang_required_staff_net

        if final_required_staff_net == erlang_required_staff_net:
            interval_plans.append(erlang_plan)
            continue

        metrics = staffing_metrics_for_agents(
            _staffing_input_for_forecast(forecast),
            final_required_staff_net,
            model="erlang_c",
        )
        interval_plans.append(
            replace(
                erlang_plan,
                required_staff_net=final_required_staff_net,
                required_staff_gross=apply_shrinkage(
                    final_required_staff_net,
                    forecast.shrinkage,
                ),
                service_level=metrics["service_level"],
                occupancy=metrics["occupancy"],
                average_speed_of_answer_seconds=metrics[
                    "average_speed_of_answer_seconds"
                ],
                percent_answered_immediately=metrics[
                    "percent_answered_immediately"
                ],
                abandon_percent=metrics["abandon_percent"],
            )
        )
    daily_plans = plan_daily(interval_plans)

    interval_payload_rows = []
    monthly_rollups: dict[int, dict[str, float | int | str]] = {}

    for metadata, interval_plan in zip(normalized_rows, interval_plans):
        month_index = int(metadata["month_index"])
        service_date = str(metadata["service_date"])
        interval_duration_hours = float(metadata["interval_duration_seconds"]) / 3600.0
        calls_offered = float(metadata["calls_offered"])
        average_handle_time_seconds = float(metadata["average_handle_time_seconds"])
        workload_hours = calls_offered * average_handle_time_seconds / 3600.0
        interval_hours = interval_plan.required_staff_net * interval_duration_hours

        interval_payload_row = {
            "monthIndex": month_index,
            "serviceDate": service_date,
            "intervalStart": interval_plan.interval_start,
            "callsOffered": calls_offered,
            "averageHandleTimeSeconds": average_handle_time_seconds,
            "workloadHours": round(workload_hours, 6),
            "requiredStaffNet": interval_plan.required_staff_net,
            "laborHoursNet": round(interval_hours, 6),
            "serviceLevel": interval_plan.service_level,
            "occupancy": interval_plan.occupancy,
            "averageSpeedOfAnswerSeconds": interval_plan.average_speed_of_answer_seconds,
            "percentAnsweredImmediately": interval_plan.percent_answered_immediately,
            "abandonPercent": interval_plan.abandon_percent,
            "intervalLengthMinutes": interval_plan.interval_duration_seconds / 60.0,
        }
        if bool(metadata["minimum_headcount_configured"]):
            erlang_required_staff_net = int(metadata["erlang_required_staff_net"])
            minimum_headcount = int(metadata["minimum_headcount"])
            interval_payload_row.update(
                {
                    "erlangRequiredStaffNet": erlang_required_staff_net,
                    "minimumHeadcount": minimum_headcount,
                    "minimumApplied": interval_plan.required_staff_net
                    > erlang_required_staff_net,
                }
            )
        interval_payload_rows.append(interval_payload_row)

        monthly_summary = monthly_rollups.setdefault(
            month_index,
            {
                "monthIndex": month_index,
                "workloadHours": 0.0,
                "erlangStaffedHours": 0.0,
                "occupiedHours": 0.0,
                "serviceLevelWeightedCalls": 0.0,
                "callsOffered": 0.0,
                "peakIntervalRequiredHeadcount": 0,
                "openDayCount": 0,
                "minimumAppliedIntervalCount": 0,
                "serviceDateSet": set(),
            },
        )
        monthly_summary["workloadHours"] = float(monthly_summary["workloadHours"]) + (
            float(metadata["calls_offered"]) * float(metadata["average_handle_time_seconds"]) / 3600.0
        )
        monthly_summary["erlangStaffedHours"] = float(
            monthly_summary["erlangStaffedHours"]
        ) + interval_hours
        monthly_summary["occupiedHours"] = float(monthly_summary["occupiedHours"]) + (
            interval_hours * float(interval_plan.occupancy)
        )
        monthly_summary["serviceLevelWeightedCalls"] = float(
            monthly_summary["serviceLevelWeightedCalls"]
        ) + (float(metadata["calls_offered"]) * float(interval_plan.service_level))
        monthly_summary["callsOffered"] = float(monthly_summary["callsOffered"]) + float(
            metadata["calls_offered"]
        )
        monthly_summary["peakIntervalRequiredHeadcount"] = max(
            int(monthly_summary["peakIntervalRequiredHeadcount"]),
            interval_plan.required_staff_net,
        )
        if interval_plan.required_staff_net > int(metadata["erlang_required_staff_net"]):
            monthly_summary["minimumAppliedIntervalCount"] = int(
                monthly_summary["minimumAppliedIntervalCount"]
            ) + 1
        service_date_set = monthly_summary["serviceDateSet"]
        service_date_set.add(service_date)
        monthly_summary["openDayCount"] = len(service_date_set)

    daily_payload_rows = []
    for daily_plan in daily_plans:
        month_index = next(
            (
                int(metadata["month_index"])
                for metadata in normalized_rows
                if metadata["service_date"] == daily_plan.service_date
            ),
            datetime.fromisoformat(daily_plan.service_date).month - 1,
        )
        daily_payload_rows.append(
            {
                "monthIndex": month_index,
                "serviceDate": daily_plan.service_date,
                "intervalCount": daily_plan.interval_count,
                "totalLaborHoursNet": daily_plan.total_labor_hours_net,
                "peakStaffNet": daily_plan.peak_staff_net,
            }
        )

    monthly_payload_rows = []
    minimum_headcount_configured = any(
        bool(row["minimum_headcount_configured"]) for row in normalized_rows
    )
    configured_minimum_headcount = max(
        (int(row["minimum_headcount"]) for row in normalized_rows),
        default=0,
    )
    for month_index, summary in sorted(monthly_rollups.items()):
        monthly_payload_row = {
            "monthIndex": month_index,
            "workloadHours": round(float(summary["workloadHours"]), 4),
            "erlangStaffedHours": round(float(summary["erlangStaffedHours"]), 4),
            "weightedOccupancyPercent": round(
                (
                    float(summary["occupiedHours"]) / float(summary["erlangStaffedHours"]) * 100.0
                    if float(summary["erlangStaffedHours"]) > 0
                    else 0.0
                ),
                4,
            ),
            "weightedServiceLevelPercent": round(
                (
                    float(summary["serviceLevelWeightedCalls"]) / float(summary["callsOffered"]) * 100.0
                    if float(summary["callsOffered"]) > 0
                    else 0.0
                ),
                4,
            ),
            "peakIntervalRequiredHeadcount": int(
                summary["peakIntervalRequiredHeadcount"]
            ),
            "openDayCount": int(summary["openDayCount"]),
        }
        if minimum_headcount_configured:
            monthly_payload_row.update(
                {
                    "minimumHeadcount": configured_minimum_headcount,
                    "minimumAppliedIntervalCount": int(
                        summary["minimumAppliedIntervalCount"]
                    ),
                }
            )
        monthly_payload_rows.append(monthly_payload_row)

    return {
        "intervalPlans": interval_payload_rows,
        "dailyPlans": daily_payload_rows,
        "monthlyPlans": monthly_payload_rows,
    }


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
