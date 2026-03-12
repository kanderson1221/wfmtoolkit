from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, TypedDict

from pydantic import BaseModel, Field, ValidationError

from .erlang import staff_for_interval
from .models import StaffingInput
from .planner import apply_shrinkage

DEFAULT_INTERVAL_DURATION_SECONDS = 30 * 60
DEFAULT_INTERVAL_DURATION_HOURS = DEFAULT_INTERVAL_DURATION_SECONDS / 3600.0
ENRICHED_COLUMN_NAMES = [
    "Required Agents",
    "Required Headcount",
    "Service Level",
    "Average Speed of Answer",
    "Answered Immediately",
    "Expected Occupancy",
    "Caller Abandonment",
]


class BatchIntervalRecord(BaseModel):
    queue_id: str = Field(min_length=1)
    interval_start: str = Field(min_length=1)
    calls_offered: float = Field(ge=0)
    aht_seconds: float = Field(gt=0)
    mean_patience_seconds: float = Field(gt=0)
    service_level_threshold: float = Field(gt=0)
    service_level_target_seconds: float = Field(ge=0)
    max_occupancy: float = Field(gt=0)
    shrinkage: float = Field(default=0.0, ge=0, lt=100)


class BatchRowError(TypedDict):
    rowIndex: int
    message: str


class BatchRowResult(TypedDict):
    rowIndex: int
    queueId: str
    intervalStart: str
    requiredStaffNet: int
    requiredStaffGross: int
    serviceLevel: float
    asaSeconds: float | None
    percentAnsweredImmediately: float
    expectedOccupancy: float
    abandonPercent: float


class BatchSummary(TypedDict):
    processedRows: int
    successfulRows: int
    failedRows: int
    avgServiceLevel: float
    avgAsaSeconds: float | None
    totalRequiredStaffMinutesNet: float
    totalRequiredStaffHoursNet: float
    totalRequiredStaffMinutesGross: float
    totalRequiredStaffHoursGross: float
    peakStaffNet: int
    peakStaffGross: int


class BatchPayload(TypedDict):
    results: list[BatchRowResult]
    summary: BatchSummary
    errors: list[BatchRowError]


class EnrichedBatchRow(TypedDict):
    rowIndex: int
    queueId: str
    serviceDate: str
    intervalStart: str
    sourceRow: dict[str, Any]
    requiredStaffNet: int
    requiredStaffGross: int
    serviceLevel: float
    asaSeconds: float | None
    percentAnsweredImmediately: float
    expectedOccupancy: float
    abandonPercent: float


def _ratio_from_percent_or_ratio(value: float, field_name: str) -> float:
    if value <= 1.0:
        return value
    if value <= 100.0:
        return value / 100.0
    raise ValueError(f"{field_name} must be in (0, 1] or (0, 100]")


def _shrinkage_from_percent_or_ratio(value: float) -> float:
    if value < 1.0:
        return value
    if value < 100.0:
        return value / 100.0
    raise ValueError("shrinkage must be in [0, 1) or [0, 100)")


def _validation_error_message(error: ValidationError) -> str:
    return "; ".join(issue["msg"] for issue in error.errors())


def _finite_or_none(value: float) -> float | None:
    if not math.isfinite(value):
        return None
    return value


def _service_date(interval_start: str) -> str:
    parsed = _parse_interval_start(interval_start)
    if parsed is not None:
        return parsed.date().isoformat()
    return interval_start.split(" ")[0].split("T")[0]


def _interval_sort_key(interval_start: str) -> tuple[int, datetime | str]:
    parsed = _parse_interval_start(interval_start)
    if parsed is not None:
        return (0, parsed)
    return (1, interval_start)


def _parse_interval_start(interval_start: str) -> datetime | None:
    value = interval_start.strip()
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        parsed = None

    if parsed is None:
        fallback_formats = (
            "%m/%d/%y %H:%M",
            "%m/%d/%Y %H:%M",
            "%m/%d/%y %I:%M %p",
            "%m/%d/%Y %I:%M %p",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d %I:%M %p",
            "%Y/%m/%d %H:%M",
            "%Y/%m/%d %I:%M %p",
        )
        for fmt in fallback_formats:
            try:
                parsed = datetime.strptime(value, fmt)
                break
            except ValueError:
                continue
        if parsed is None:
            return None

    # Convert timezone-aware datetimes to UTC-naive for stable sorting with naive values.
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed


def _insert_global_error(errors: list[BatchRowError], message: str) -> list[BatchRowError]:
    if not errors:
        return [{"rowIndex": 0, "message": message}]
    if errors[0]["rowIndex"] == 0:
        return errors
    return [{"rowIndex": 0, "message": message}, *errors]


def _empty_summary(processed_rows: int, failed_rows: int) -> BatchSummary:
    return {
        "processedRows": processed_rows,
        "successfulRows": 0,
        "failedRows": failed_rows,
        "avgServiceLevel": 0.0,
        "avgAsaSeconds": None,
        "totalRequiredStaffMinutesNet": 0.0,
        "totalRequiredStaffHoursNet": 0.0,
        "totalRequiredStaffMinutesGross": 0.0,
        "totalRequiredStaffHoursGross": 0.0,
        "peakStaffNet": 0,
        "peakStaffGross": 0,
    }


def _legacy_results_from_enriched(rows: list[EnrichedBatchRow]) -> list[BatchRowResult]:
    return [
        BatchRowResult(
            rowIndex=row["rowIndex"],
            queueId=row["queueId"],
            intervalStart=row["intervalStart"],
            requiredStaffNet=row["requiredStaffNet"],
            requiredStaffGross=row["requiredStaffGross"],
            serviceLevel=row["serviceLevel"],
            asaSeconds=row["asaSeconds"],
            percentAnsweredImmediately=row["percentAnsweredImmediately"],
            expectedOccupancy=row["expectedOccupancy"],
            abandonPercent=row["abandonPercent"],
        )
        for row in rows
    ]


def _summary_from_results(
    results: list[BatchRowResult],
    processed_rows: int,
    interval_duration_seconds: float = DEFAULT_INTERVAL_DURATION_SECONDS,
) -> BatchSummary:
    successful_rows = len(results)
    failed_rows = processed_rows - successful_rows

    total_minutes_net = sum(
        result["requiredStaffNet"] * (interval_duration_seconds / 60.0) for result in results
    )
    total_minutes_gross = sum(
        result["requiredStaffGross"] * (interval_duration_seconds / 60.0) for result in results
    )

    finite_asa_values = [
        value for value in (result["asaSeconds"] for result in results) if value is not None
    ]
    avg_asa_seconds = (
        (sum(finite_asa_values) / len(finite_asa_values)) if finite_asa_values else None
    )

    return {
        "processedRows": processed_rows,
        "successfulRows": successful_rows,
        "failedRows": failed_rows,
        "avgServiceLevel": (
            sum(result["serviceLevel"] for result in results) / successful_rows
            if successful_rows
            else 0.0
        ),
        "avgAsaSeconds": avg_asa_seconds,
        "totalRequiredStaffMinutesNet": total_minutes_net,
        "totalRequiredStaffHoursNet": total_minutes_net / 60.0,
        "totalRequiredStaffMinutesGross": total_minutes_gross,
        "totalRequiredStaffHoursGross": total_minutes_gross / 60.0,
        "peakStaffNet": max((result["requiredStaffNet"] for result in results), default=0),
        "peakStaffGross": max((result["requiredStaffGross"] for result in results), default=0),
    }


def _validate_and_calculate(
    raw_rows: list[dict[str, Any]],
    interval_duration_seconds: float = DEFAULT_INTERVAL_DURATION_SECONDS,
) -> tuple[list[EnrichedBatchRow], list[BatchRowError], list[str]]:
    if not raw_rows:
        return [], [{"rowIndex": 0, "message": "rows must contain at least one item"}], []

    original_headers = list(raw_rows[0].keys())
    enriched_rows: list[EnrichedBatchRow] = []
    errors: list[BatchRowError] = []

    for row_index, raw_row in enumerate(raw_rows, start=1):
        try:
            row = BatchIntervalRecord.model_validate(raw_row)
        except ValidationError as error:
            errors.append({"rowIndex": row_index, "message": _validation_error_message(error)})
            continue

        try:
            target_service_level = _ratio_from_percent_or_ratio(
                row.service_level_threshold, "service_level_threshold"
            )
            max_occupancy = _ratio_from_percent_or_ratio(row.max_occupancy, "max_occupancy")
            shrinkage = _shrinkage_from_percent_or_ratio(row.shrinkage)
            metrics = staff_for_interval(
                StaffingInput(
                    calls_offered=row.calls_offered,
                    interval_duration_seconds=interval_duration_seconds,
                    avg_handle_time_seconds=row.aht_seconds,
                    target_service_level=target_service_level,
                    service_level_answer_time_seconds=row.service_level_target_seconds,
                    max_occupancy=max_occupancy,
                    avg_caller_patience_seconds=row.mean_patience_seconds,
                )
            )
            required_staff_net = metrics["required_staff"]
            required_staff_gross = apply_shrinkage(required_staff_net, shrinkage)
        except ValueError as error:
            errors.append({"rowIndex": row_index, "message": str(error)})
            continue

        enriched_rows.append(
            EnrichedBatchRow(
                rowIndex=row_index,
                queueId=row.queue_id,
                serviceDate=_service_date(row.interval_start),
                intervalStart=row.interval_start,
                sourceRow=raw_row,
                requiredStaffNet=required_staff_net,
                requiredStaffGross=required_staff_gross,
                serviceLevel=metrics["service_level"],
                asaSeconds=_finite_or_none(metrics["average_speed_of_answer_seconds"]),
                percentAnsweredImmediately=metrics["percent_answered_immediately"],
                expectedOccupancy=metrics["occupancy"],
                abandonPercent=metrics["abandon_percent"],
            )
        )

    return enriched_rows, errors, original_headers


def _format_percent_for_export(value: float) -> float:
    return round(value * 100.0, 2)


def _build_file_export(headers: list[str], rows: list[EnrichedBatchRow]) -> dict[str, Any]:
    export_headers = [*headers, *ENRICHED_COLUMN_NAMES]
    export_rows: list[list[Any]] = []

    for row in rows:
        source = row["sourceRow"]
        export_rows.append(
            [
                *(source.get(header, "") for header in headers),
                row["requiredStaffNet"],
                row["requiredStaffGross"],
                _format_percent_for_export(row["serviceLevel"]),
                row["asaSeconds"],
                _format_percent_for_export(row["percentAnsweredImmediately"]),
                _format_percent_for_export(row["expectedOccupancy"]),
                _format_percent_for_export(row["abandonPercent"]),
            ]
        )

    return {"headers": export_headers, "rows": export_rows}


def process_file_processor_rows(raw_rows: list[dict[str, Any]]) -> dict[str, Any]:
    processed_rows = len(raw_rows)
    enriched_rows, validation_errors, original_headers = _validate_and_calculate(raw_rows)
    if validation_errors:
        errors = _insert_global_error(
            validation_errors,
            "Batch contains validation errors. Fix all rows and upload again.",
        )
        return {
            "mode": "file-processor",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": errors,
            "export": {"enrichedFile": {"headers": [], "rows": []}},
        }

    results = _legacy_results_from_enriched(enriched_rows)
    summary = _summary_from_results(results, processed_rows)
    return {
        "mode": "file-processor",
        "results": results,
        "summary": summary,
        "errors": [],
        "export": {"enrichedFile": _build_file_export(original_headers, enriched_rows)},
    }


def _number_or_none(value: Any) -> float | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(numeric):
        return None
    return numeric


def _build_daily_plan_rows(
    rows: list[EnrichedBatchRow],
) -> list[dict[str, Any]]:
    interval_rows: list[dict[str, Any]] = []
    sorted_rows = sorted(
        rows,
        key=lambda row: (_interval_sort_key(row["intervalStart"]), row["queueId"], row["rowIndex"]),
    )

    for row in sorted_rows:
        source = row["sourceRow"]
        interval_rows.append(
            {
                "rowIndex": row["rowIndex"],
                "queueId": row["queueId"],
                "serviceDate": row["serviceDate"],
                "intervalStart": row["intervalStart"],
                "callsOffered": _number_or_none(source.get("calls_offered")) or 0.0,
                "ahtSeconds": _number_or_none(source.get("aht_seconds")) or 0.0,
                "requiredAgents": row["requiredStaffNet"],
                "requiredHeadcount": row["requiredStaffGross"],
                "serviceLevel": row["serviceLevel"],
                "asaSeconds": row["asaSeconds"],
                "expectedOccupancy": row["expectedOccupancy"],
            }
        )

    return interval_rows


def _daily_summary(
    base_summary: BatchSummary,
    interval_rows: list[dict[str, Any]],
    shift_paid_hours: float,
    unpaid_lunch_hours: float,
    lunch_window_start_hours: float,
    lunch_window_end_hours: float,
    service_date: str,
    interval_duration_hours: float = DEFAULT_INTERVAL_DURATION_HOURS,
) -> dict[str, Any]:
    total_shift_length_hours = shift_paid_hours + unpaid_lunch_hours
    total_required_agent_hours = sum(
        row["requiredAgents"] * interval_duration_hours for row in interval_rows
    )
    total_required_headcount_hours = sum(
        row["requiredHeadcount"] * interval_duration_hours for row in interval_rows
    )
    hours_based_required_daily_fte = (
        math.ceil(total_required_headcount_hours / shift_paid_hours)
        if total_required_headcount_hours > 0
        else 0
    )

    return {
        **base_summary,
        "serviceDate": service_date,
        "shiftPaidHours": shift_paid_hours,
        "unpaidLunchMinutes": unpaid_lunch_hours * 60.0,
        "totalShiftLengthHours": total_shift_length_hours,
        # Legacy aliases used by older UI payload readers.
        "shiftLengthHours": total_shift_length_hours,
        "intervalDurationMinutes": interval_duration_hours * 60.0,
        "productiveHoursPerDay": shift_paid_hours,
        "lunchWindowStartHours": lunch_window_start_hours,
        "lunchWindowEndHours": lunch_window_end_hours,
        "totalRequiredAgentHours": total_required_agent_hours,
        "totalRequiredHeadcountHours": total_required_headcount_hours,
        "hoursBasedRequiredDailyFte": hours_based_required_daily_fte,
        "requiredDailyFte": hours_based_required_daily_fte,
    }


def _coverage_penalty(coverage_diff: float) -> float:
    # Negative means gap; heavily penalize gaps so lunch placement prefers consuming overage.
    if coverage_diff < 0:
        return (abs(coverage_diff) ** 2) * 9.0
    return coverage_diff**2


def _optimize_daily_shift_plan(
    interval_rows: list[dict[str, Any]],
    shift_paid_hours: float,
    unpaid_lunch_hours: float,
    lunch_window_start_hours: float,
    lunch_window_end_hours: float,
    interval_duration_hours: float,
    target_total_shifts: int | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    total_shift_length_hours = shift_paid_hours + unpaid_lunch_hours
    if not interval_rows:
        return (
            [],
            [],
            [],
            {
                "optimizedShiftCount": 0,
                "optimizedShiftStarts": 0,
                "coverageRate": 0.0,
                "totalCoverageGap": 0.0,
                "totalCoverageOverage": 0.0,
                "plannedHeadcountHours": 0.0,
                "plannedPaidHeadcountHours": 0.0,
                "plannedShiftSpanHours": 0.0,
                "scheduleProductivityRatio": 0.0,
                "feasibleStartWindowIntervals": 0,
                "totalLunchAssignments": 0,
                "unassignedLunchCount": 0,
            },
        )

    # Aggregate by interval start so multi-queue files produce one staffing demand point per interval.
    interval_totals: dict[str, dict[str, float]] = {}
    for row in interval_rows:
        interval_start = row["intervalStart"]
        if interval_start not in interval_totals:
            interval_totals[interval_start] = {"requiredAgents": 0.0, "requiredHeadcount": 0.0}
        interval_totals[interval_start]["requiredAgents"] += float(row["requiredAgents"])
        interval_totals[interval_start]["requiredHeadcount"] += float(row["requiredHeadcount"])

    schedule_intervals = [
        {
            "intervalStart": interval_start,
            "requiredAgents": totals["requiredAgents"],
            "requiredHeadcount": totals["requiredHeadcount"],
        }
        for interval_start, totals in interval_totals.items()
    ]
    schedule_intervals.sort(key=lambda row: _interval_sort_key(row["intervalStart"]))

    # Treat each row as one schedulable interval slot.
    # Shift span should map to total shift length, while paid coverage is produced by
    # removing unpaid lunch intervals from that span.
    shift_span_intervals = max(1, math.ceil(total_shift_length_hours / interval_duration_hours))
    lunch_span_intervals = (
        0
        if unpaid_lunch_hours <= 0
        else max(1, math.ceil(unpaid_lunch_hours / interval_duration_hours))
    )
    earliest_lunch_start_offset = max(
        0, math.ceil(lunch_window_start_hours / interval_duration_hours)
    )
    latest_lunch_start_offset = max(
        earliest_lunch_start_offset,
        math.floor(lunch_window_end_hours / interval_duration_hours),
    )
    interval_count = len(schedule_intervals)
    latest_full_shift_start_index = interval_count - shift_span_intervals

    start_counts = [0] * interval_count
    feasible_start_indexes = (
        list(range(latest_full_shift_start_index + 1))
        if latest_full_shift_start_index >= 0
        else []
    )

    required_by_interval = [
        float(schedule_intervals[index]["requiredAgents"]) for index in range(interval_count)
    ]
    required_headcount_by_interval = [
        float(schedule_intervals[index]["requiredHeadcount"]) for index in range(interval_count)
    ]

    def _simulate_from_start_counts(
        counts: list[int],
    ) -> tuple[list[dict[str, Any]], list[int], list[int], list[int], int]:
        expanded_agents: list[dict[str, Any]] = []
        agent_id = 1
        for start_index, agents in enumerate(counts):
            if agents <= 0:
                continue
            end_index = start_index + shift_span_intervals - 1
            for _agent in range(agents):
                expanded_agents.append(
                    {
                        "agentId": f"A{agent_id:03d}",
                        "shiftStartIndex": start_index,
                        "shiftEndIndex": end_index,
                        "lunchStartIndex": None,
                        "lunchEndIndex": None,
                    }
                )
                agent_id += 1

        shift_delta = [0] * (interval_count + 1)
        for start_index, agents in enumerate(counts):
            if agents <= 0:
                continue
            shift_delta[start_index] += agents
            end_exclusive = min(interval_count, start_index + shift_span_intervals)
            shift_delta[end_exclusive] -= agents

        active_shifts = [0] * interval_count
        running_active_shifts = 0
        for idx in range(interval_count):
            running_active_shifts += shift_delta[idx]
            active_shifts[idx] = running_active_shifts

        if lunch_span_intervals <= 0:
            return expanded_agents, active_shifts.copy(), active_shifts, [0] * interval_count, 0

        lunch_delta = [0] * (interval_count + 1)
        working_projection = active_shifts.copy()
        unassigned_lunches = 0

        # Assign constrained agents first (fewest legal lunch windows).
        agents_with_ranges: list[tuple[int, int, int, dict[str, Any]]] = []
        for agent in expanded_agents:
            shift_start = int(agent["shiftStartIndex"])
            shift_end = int(agent["shiftEndIndex"])
            earliest = shift_start + earliest_lunch_start_offset
            latest = shift_start + latest_lunch_start_offset
            latest = min(latest, shift_end - lunch_span_intervals + 1, interval_count - lunch_span_intervals)
            range_count = max(0, latest - earliest + 1) if latest >= earliest else 0
            agents_with_ranges.append((range_count, shift_start, latest, agent))

        agents_with_ranges.sort(key=lambda item: (item[0], item[1]))

        for range_count, shift_start, _latest_hint, agent in agents_with_ranges:
            if range_count <= 0:
                unassigned_lunches += 1
                continue

            shift_end = int(agent["shiftEndIndex"])
            earliest = shift_start + earliest_lunch_start_offset
            latest = shift_start + latest_lunch_start_offset
            latest = min(latest, shift_end - lunch_span_intervals + 1, interval_count - lunch_span_intervals)
            if earliest > latest:
                unassigned_lunches += 1
                continue

            best_start = earliest
            best_delta_penalty = float("inf")
            best_overage_capture = float("-inf")
            for lunch_start in range(earliest, latest + 1):
                delta_penalty = 0.0
                overage_capture = 0.0
                for interval_index in range(lunch_start, lunch_start + lunch_span_intervals):
                    before_diff = working_projection[interval_index] - required_by_interval[interval_index]
                    after_diff = before_diff - 1.0
                    delta_penalty += _coverage_penalty(after_diff) - _coverage_penalty(before_diff)
                    overage_capture += max(0.0, before_diff)
                if (
                    delta_penalty < best_delta_penalty
                    or (
                        abs(delta_penalty - best_delta_penalty) <= 1e-9
                        and overage_capture > best_overage_capture
                    )
                ):
                    best_start = lunch_start
                    best_delta_penalty = delta_penalty
                    best_overage_capture = overage_capture

            lunch_start = best_start
            lunch_end = lunch_start + lunch_span_intervals - 1
            agent["lunchStartIndex"] = lunch_start
            agent["lunchEndIndex"] = lunch_end
            lunch_delta[lunch_start] += 1
            if lunch_end + 1 <= interval_count:
                lunch_delta[lunch_end + 1] -= 1
            for interval_index in range(lunch_start, lunch_end + 1):
                working_projection[interval_index] -= 1

        running_lunch = 0
        active_lunch = [0] * interval_count
        for idx in range(interval_count):
            running_lunch += lunch_delta[idx]
            active_lunch[idx] = running_lunch

        working_projection = [
            max(0, active_shifts[idx] - active_lunch[idx]) for idx in range(interval_count)
        ]
        return expanded_agents, working_projection, active_shifts, active_lunch, unassigned_lunches

    final_agents: list[dict[str, Any]] = []
    planned_working_by_interval = [0] * interval_count
    planned_shift_by_interval = [0] * interval_count
    active_lunch_by_interval = [0] * interval_count
    unassigned_lunch_count = 0

    def _alignment_score(working_by_interval: list[int], unassigned_lunches: int) -> float:
        gross_gap_penalty = 0.0
        net_gap_penalty = 0.0
        over_penalty = 0.0
        smoothness_penalty = 0.0
        prev: float | None = None
        late_interval_weight_scale = 0.5
        for interval_index, planned in enumerate(working_by_interval):
            planned_float = float(planned)
            net_required = required_by_interval[interval_index]
            gross_required = required_headcount_by_interval[interval_index]
            late_weight = (
                1.0 + late_interval_weight_scale * (interval_index / (interval_count - 1))
                if interval_count > 1
                else 1.0
            )
            gross_diff = planned_float - gross_required
            if gross_diff < 0:
                gross_gap_penalty += late_weight * (gross_diff * gross_diff)
            else:
                over_penalty += gross_diff * gross_diff
            if planned_float < net_required:
                diff = net_required - planned_float
                net_gap_penalty += diff * diff
            if prev is not None:
                delta = planned_float - prev
                smoothness_penalty += delta * delta
            prev = planned_float

        return (
            (gross_gap_penalty * 1_000_000.0)
            + (net_gap_penalty * 75_000.0)
            + (unassigned_lunches * 25_000.0)
            + (over_penalty * 140.0)
            + (smoothness_penalty * 5.0)
        )

    target_shift_count = max(0, int(target_total_shifts or 0))
    if target_total_shifts is None:
        total_required_headcount_hours = (
            sum(required_headcount_by_interval) * interval_duration_hours
        )
        target_shift_count = (
            math.ceil(total_required_headcount_hours / shift_paid_hours)
            if total_required_headcount_hours > 0
            else 0
        )

    if feasible_start_indexes and target_shift_count > 0:
        # Stage 1: fixed-count constructive allocation against gross requirement.
        projected_active = [0] * interval_count
        for _ in range(target_shift_count):
            best_index = feasible_start_indexes[0]
            best_delta = float("inf")
            best_shortfall_capture = float("-inf")
            for candidate_index in feasible_start_indexes:
                end_index = min(interval_count - 1, candidate_index + shift_span_intervals - 1)
                delta_penalty = 0.0
                shortfall_capture = 0.0
                for interval_index in range(candidate_index, end_index + 1):
                    gross_required = required_headcount_by_interval[interval_index]
                    before_diff = projected_active[interval_index] - gross_required
                    after_diff = before_diff + 1.0
                    delta_penalty += _coverage_penalty(after_diff) - _coverage_penalty(before_diff)
                    shortfall_capture += max(0.0, gross_required - projected_active[interval_index])
                if (
                    delta_penalty < best_delta
                    or (
                        abs(delta_penalty - best_delta) <= 1e-9
                        and shortfall_capture > best_shortfall_capture
                    )
                ):
                    best_index = candidate_index
                    best_delta = delta_penalty
                    best_shortfall_capture = shortfall_capture

            start_counts[best_index] += 1
            end_index = min(interval_count - 1, best_index + shift_span_intervals - 1)
            for interval_index in range(best_index, end_index + 1):
                projected_active[interval_index] += 1

    (
        final_agents,
        planned_working_by_interval,
        planned_shift_by_interval,
        active_lunch_by_interval,
        unassigned_lunch_count,
    ) = _simulate_from_start_counts(start_counts)

    # Stage 2: local search with fixed total shifts and full lunch-aware scoring.
    if feasible_start_indexes and sum(start_counts) > 0:
        current_score = _alignment_score(planned_working_by_interval, unassigned_lunch_count)
        max_balance_iterations = max(
            20, min(140, max(target_shift_count, sum(start_counts)) * 2)
        )
        for _ in range(max_balance_iterations):
            best_move_score = current_score
            best_move_index_pair: tuple[int, int] | None = None
            best_move_trial: tuple[list[dict[str, Any]], list[int], list[int], list[int], int] | None = None

            for source_index in feasible_start_indexes:
                if start_counts[source_index] <= 0:
                    continue
                for target_index in feasible_start_indexes:
                    if source_index == target_index:
                        continue
                    trial_counts = start_counts.copy()
                    trial_counts[source_index] -= 1
                    trial_counts[target_index] += 1
                    trial_result = _simulate_from_start_counts(trial_counts)
                    (
                        _trial_agents,
                        trial_working,
                        _trial_shift,
                        _trial_lunch,
                        trial_unassigned,
                    ) = trial_result
                    trial_score = _alignment_score(trial_working, trial_unassigned)
                    if trial_score + 1e-6 < best_move_score:
                        best_move_score = trial_score
                        best_move_index_pair = (source_index, target_index)
                        best_move_trial = trial_result

            if best_move_index_pair is None or best_move_trial is None:
                break

            source_index, target_index = best_move_index_pair
            start_counts[source_index] -= 1
            start_counts[target_index] += 1
            (
                final_agents,
                planned_working_by_interval,
                planned_shift_by_interval,
                active_lunch_by_interval,
                unassigned_lunch_count,
            ) = best_move_trial
            current_score = best_move_score

    # Always refresh derived views from final counts.
    if interval_count > 0:
        (
            final_agents,
            planned_working_by_interval,
            planned_shift_by_interval,
            active_lunch_by_interval,
            unassigned_lunch_count,
        ) = _simulate_from_start_counts(start_counts)

    shift_plan: list[dict[str, Any]] = []
    for start_index, agents in enumerate(start_counts):
        if agents <= 0:
            continue
        end_index = start_index + shift_span_intervals - 1
        shift_plan.append(
            {
                "shiftStart": schedule_intervals[start_index]["intervalStart"],
                "shiftEnd": schedule_intervals[end_index]["intervalStart"],
                "agents": agents,
                "effectiveAgentsPerInterval": round(float(agents), 3),
                "shiftPaidHours": shift_paid_hours,
                "unpaidLunchHours": unpaid_lunch_hours,
                "totalShiftLengthHours": total_shift_length_hours,
                # Legacy aliases used by older UI payload readers.
                "shiftLengthHours": total_shift_length_hours,
                "productiveHoursPerDay": shift_paid_hours,
            }
        )

    coverage_rows: list[dict[str, Any]] = []
    intervals_covered = 0
    total_gap = 0.0
    total_overage = 0.0
    total_planned_headcount_hours = 0.0
    for index, row in enumerate(schedule_intervals):
        required_agents = float(row["requiredAgents"])
        required_headcount = float(row["requiredHeadcount"])
        shrinkage_overhead = max(0.0, required_headcount - required_agents)
        planned_headcount = float(planned_working_by_interval[index])
        coverage_gap = max(0.0, required_agents - planned_headcount)
        coverage_overage = max(0.0, planned_headcount - required_agents)
        if coverage_gap <= 1e-9:
            intervals_covered += 1
        total_gap += coverage_gap
        total_overage += coverage_overage
        total_planned_headcount_hours += planned_headcount * interval_duration_hours
        coverage_rows.append(
            {
                "intervalStart": row["intervalStart"],
                "requiredAgents": required_agents,
                "requiredHeadcount": required_headcount,
                "shrinkageOverhead": round(shrinkage_overhead, 3),
                "plannedHeadcount": round(planned_headcount, 3),
                "coverageGap": round(coverage_gap, 3),
                "coverageOverage": round(coverage_overage, 3),
                "activeShiftAgents": int(planned_working_by_interval[index]),
                "activeScheduledAgents": int(planned_shift_by_interval[index]),
                "activeLunchAgents": int(active_lunch_by_interval[index]),
            }
        )

    agent_schedules: list[dict[str, Any]] = []
    for agent in final_agents:
        shift_start_index = int(agent["shiftStartIndex"])
        shift_end_index = int(agent["shiftEndIndex"])
        lunch_start_index = (
            int(agent["lunchStartIndex"]) if agent["lunchStartIndex"] is not None else None
        )
        lunch_end_index = (
            int(agent["lunchEndIndex"]) if agent["lunchEndIndex"] is not None else None
        )
        agent_schedules.append(
            {
                "agentId": str(agent["agentId"]),
                "shiftStart": schedule_intervals[shift_start_index]["intervalStart"],
                "shiftEnd": schedule_intervals[shift_end_index]["intervalStart"],
                "lunchStart": (
                    schedule_intervals[lunch_start_index]["intervalStart"]
                    if lunch_start_index is not None
                    else None
                ),
                "lunchEnd": (
                    schedule_intervals[lunch_end_index]["intervalStart"]
                    if lunch_end_index is not None
                    else None
                ),
                "shiftStartIndex": shift_start_index,
                "shiftEndIndex": shift_end_index,
                "lunchStartIndex": lunch_start_index,
                "lunchEndIndex": lunch_end_index,
            }
        )

    schedule_summary = {
        "optimizedShiftCount": sum(start_counts),
        "optimizedShiftStarts": sum(1 for count in start_counts if count > 0),
        "coverageRate": intervals_covered / interval_count if interval_count else 0.0,
        "totalCoverageGap": total_gap,
        "totalCoverageOverage": total_overage,
        "plannedHeadcountHours": total_planned_headcount_hours,
        "plannedPaidHeadcountHours": sum(start_counts) * shift_paid_hours,
        "plannedShiftSpanHours": sum(start_counts) * total_shift_length_hours,
        "scheduleProductivityRatio": (
            shift_paid_hours / total_shift_length_hours if total_shift_length_hours > 0 else 0.0
        ),
        "feasibleStartWindowIntervals": max(0, latest_full_shift_start_index + 1),
        "totalLunchAssignments": sum(
            1 for agent in agent_schedules if agent["lunchStartIndex"] is not None
        ),
        "unassignedLunchCount": unassigned_lunch_count,
    }

    return shift_plan, coverage_rows, agent_schedules, schedule_summary


def _daily_exports(
    interval_rows: list[dict[str, Any]],
    shift_plan: list[dict[str, Any]],
    coverage_rows: list[dict[str, Any]],
    agent_schedules: list[dict[str, Any]],
) -> dict[str, Any]:
    daily_headers = [
        "queue_id",
        "service_date",
        "interval_start",
        "calls_offered",
        "aht_seconds",
        "Required Agents",
        "Required Headcount",
        "Service Level",
        "Average Speed of Answer",
        "Expected Occupancy",
    ]
    daily_rows = [
        [
            row["queueId"],
            row["serviceDate"],
            row["intervalStart"],
            row["callsOffered"],
            row["ahtSeconds"],
            row["requiredAgents"],
            row["requiredHeadcount"],
            _format_percent_for_export(row["serviceLevel"]),
            row["asaSeconds"],
            _format_percent_for_export(row["expectedOccupancy"]),
        ]
        for row in interval_rows
    ]

    shift_headers = [
        "shift_start",
        "shift_end",
        "agents",
        "effective_agents_per_interval",
        "shift_paid_hours",
        "unpaid_lunch_minutes",
        "total_shift_length_hours",
    ]
    shift_rows = [
        [
            row["shiftStart"],
            row["shiftEnd"],
            row["agents"],
            row["effectiveAgentsPerInterval"],
            row["shiftPaidHours"],
            row["unpaidLunchHours"] * 60.0,
            row["totalShiftLengthHours"],
        ]
        for row in shift_plan
    ]

    coverage_headers = [
        "interval_start",
        "required_agents",
        "required_headcount",
        "shrinkage_overhead",
        "planned_headcount",
        "coverage_gap",
        "coverage_overage",
        "active_shift_agents",
        "active_scheduled_agents",
        "active_lunch_agents",
    ]
    coverage_export_rows = [
        [
            row["intervalStart"],
            row["requiredAgents"],
            row["requiredHeadcount"],
            row["shrinkageOverhead"],
            row["plannedHeadcount"],
            row["coverageGap"],
            row["coverageOverage"],
            row["activeShiftAgents"],
            row["activeScheduledAgents"],
            row["activeLunchAgents"],
        ]
        for row in coverage_rows
    ]

    schedule_headers = [
        "agent_id",
        "shift_start",
        "shift_end",
        "lunch_start",
        "lunch_end",
        "shift_start_index",
        "shift_end_index",
        "lunch_start_index",
        "lunch_end_index",
    ]
    schedule_rows = [
        [
            row["agentId"],
            row["shiftStart"],
            row["shiftEnd"],
            row["lunchStart"] or "",
            row["lunchEnd"] or "",
            row["shiftStartIndex"],
            row["shiftEndIndex"],
            row["lunchStartIndex"] if row["lunchStartIndex"] is not None else "",
            row["lunchEndIndex"] if row["lunchEndIndex"] is not None else "",
        ]
        for row in agent_schedules
    ]

    return {
        "dailyPlan": {"headers": daily_headers, "rows": daily_rows},
        "shiftPlan": {"headers": shift_headers, "rows": shift_rows},
        "scheduleCoverage": {"headers": coverage_headers, "rows": coverage_export_rows},
        "agentSchedules": {"headers": schedule_headers, "rows": schedule_rows},
    }


def process_daily_plan_rows(
    raw_rows: list[dict[str, Any]],
    shift_paid_hours: float,
    unpaid_lunch_hours: float,
    lunch_window_start_hours: float = 3.5,
    lunch_window_end_hours: float = 4.5,
    interval_duration_minutes: float = 30.0,
) -> dict[str, Any]:
    processed_rows = len(raw_rows)
    total_shift_length_hours = shift_paid_hours + unpaid_lunch_hours
    if shift_paid_hours <= 0:
        return {
            "mode": "daily-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [{"rowIndex": 0, "message": "shift_paid_hours must be > 0"}],
            "calculatedRows": [],
            "shiftPlan": [],
            "scheduleCoverage": [],
            "agentSchedules": [],
            "export": _daily_exports([], [], [], []),
        }
    if unpaid_lunch_hours < 0:
        return {
            "mode": "daily-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [{"rowIndex": 0, "message": "unpaid_lunch_hours must be >= 0"}],
            "calculatedRows": [],
            "shiftPlan": [],
            "scheduleCoverage": [],
            "agentSchedules": [],
            "export": _daily_exports([], [], [], []),
        }
    if total_shift_length_hours <= 0:
        return {
            "mode": "daily-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [
                {
                    "rowIndex": 0,
                    "message": "total shift length must be > 0",
                }
            ],
            "calculatedRows": [],
            "shiftPlan": [],
            "scheduleCoverage": [],
            "agentSchedules": [],
            "export": _daily_exports([], [], [], []),
        }
    if lunch_window_start_hours < 0:
        return {
            "mode": "daily-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [{"rowIndex": 0, "message": "lunch_window_start_hours must be >= 0"}],
            "calculatedRows": [],
            "shiftPlan": [],
            "scheduleCoverage": [],
            "agentSchedules": [],
            "export": _daily_exports([], [], [], []),
        }
    if lunch_window_end_hours < lunch_window_start_hours:
        return {
            "mode": "daily-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [
                {
                    "rowIndex": 0,
                    "message": "lunch_window_end_hours must be >= lunch_window_start_hours",
                }
            ],
            "calculatedRows": [],
            "shiftPlan": [],
            "scheduleCoverage": [],
            "agentSchedules": [],
            "export": _daily_exports([], [], [], []),
        }
    if unpaid_lunch_hours > 0 and lunch_window_end_hours + unpaid_lunch_hours > total_shift_length_hours:
        return {
            "mode": "daily-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [
                {
                    "rowIndex": 0,
                    "message": "lunch window plus unpaid lunch must fit inside total shift length",
                }
            ],
            "calculatedRows": [],
            "shiftPlan": [],
            "scheduleCoverage": [],
            "agentSchedules": [],
            "export": _daily_exports([], [], [], []),
        }
    if interval_duration_minutes <= 0:
        return {
            "mode": "daily-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [{"rowIndex": 0, "message": "interval_duration_minutes must be > 0"}],
            "calculatedRows": [],
            "shiftPlan": [],
            "scheduleCoverage": [],
            "agentSchedules": [],
            "export": _daily_exports([], [], [], []),
        }

    interval_duration_seconds = interval_duration_minutes * 60.0
    interval_duration_hours = interval_duration_minutes / 60.0

    enriched_rows, validation_errors, _ = _validate_and_calculate(
        raw_rows, interval_duration_seconds
    )
    if validation_errors:
        errors = _insert_global_error(
            validation_errors,
            "Batch contains validation errors. Fix all rows and upload again.",
        )
        return {
            "mode": "daily-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": errors,
            "calculatedRows": [],
            "shiftPlan": [],
            "scheduleCoverage": [],
            "agentSchedules": [],
            "export": _daily_exports([], [], [], []),
        }

    service_dates = sorted({row["serviceDate"] for row in enriched_rows})
    if len(service_dates) != 1:
        return {
            "mode": "daily-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [
                {
                    "rowIndex": 0,
                    "message": "Daily Plan Builder requires exactly one service date in the file.",
                }
            ],
            "calculatedRows": [],
            "shiftPlan": [],
            "scheduleCoverage": [],
            "agentSchedules": [],
            "export": _daily_exports([], [], [], []),
        }

    interval_rows = _build_daily_plan_rows(enriched_rows)
    total_required_headcount_hours = sum(
        float(row["requiredHeadcount"]) * interval_duration_hours for row in interval_rows
    )
    hours_based_required_fte = (
        math.ceil(total_required_headcount_hours / shift_paid_hours)
        if total_required_headcount_hours > 0
        else 0
    )
    shift_plan, coverage_rows, agent_schedules, schedule_summary = _optimize_daily_shift_plan(
        interval_rows,
        shift_paid_hours,
        unpaid_lunch_hours,
        lunch_window_start_hours,
        lunch_window_end_hours,
        interval_duration_hours,
        target_total_shifts=hours_based_required_fte,
    )

    calculated_rows = _legacy_results_from_enriched(enriched_rows)
    daily_summary = _daily_summary(
        _summary_from_results(calculated_rows, processed_rows, interval_duration_seconds),
        interval_rows,
        shift_paid_hours,
        unpaid_lunch_hours,
        lunch_window_start_hours,
        lunch_window_end_hours,
        service_dates[0],
        interval_duration_hours,
    )
    hours_based_required_fte = int(
        daily_summary.get("hoursBasedRequiredDailyFte", daily_summary["requiredDailyFte"])
    )
    required_daily_fte = hours_based_required_fte
    planned_shift_fte = int(schedule_summary["optimizedShiftCount"])
    shift_delta = planned_shift_fte - required_daily_fte
    schedule_notes = []
    if planned_shift_fte != required_daily_fte:
        schedule_notes.append(
            f"Hours-based Daily FTE target is {required_daily_fte}, but only {planned_shift_fte} full-shift starts could be placed."
        )
    if schedule_summary["totalCoverageGap"] > 0:
        schedule_notes.append(
            "Coverage gaps remain after optimizing to required daily FTE and shrinkage-aware interval demand."
        )
    if schedule_summary["feasibleStartWindowIntervals"] == 0 and interval_rows:
        schedule_notes.append(
            "No full-shift starts fit inside the uploaded horizon; extend interval coverage."
        )
    if schedule_summary["unassignedLunchCount"] > 0:
        schedule_notes.append(
            "Some agents could not be assigned lunch within the configured lunch window."
        )

    summary = {
        **daily_summary,
        **schedule_summary,
        "requiredDailyFte": required_daily_fte,
        "hoursBasedRequiredDailyFte": hours_based_required_fte,
        "plannedShiftFte": planned_shift_fte,
        "shiftFteDelta": shift_delta,
        "scheduleNotes": schedule_notes,
    }

    return {
        "mode": "daily-plan",
        "results": interval_rows,
        "summary": summary,
        "errors": [],
        "calculatedRows": calculated_rows,
        "shiftPlan": shift_plan,
        "scheduleCoverage": coverage_rows,
        "agentSchedules": agent_schedules,
        "export": _daily_exports(interval_rows, shift_plan, coverage_rows, agent_schedules),
    }


def _weekly_exports(
    day_summaries: list[dict[str, Any]],
    breakdown_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    weekly_headers = [
        "service_date",
        "Required Agent Hours",
        "Required Headcount Hours",
        "Peak Required Agents",
        "Peak Required Headcount",
        "Recommended Daily FTE",
    ]

    weekly_rows = [
        [
            row["serviceDate"],
            row["requiredAgentHours"],
            row["requiredHeadcountHours"],
            row["peakRequiredAgents"],
            row["peakRequiredHeadcount"],
            row["recommendedDailyFte"],
        ]
        for row in day_summaries
    ]

    breakdown_headers = [
        "queue_id",
        "service_date",
        "interval_start",
        "calls_offered",
        "aht_seconds",
        "Required Agents",
        "Required Headcount",
        "Service Level",
        "Average Speed of Answer",
        "Expected Occupancy",
    ]
    breakdown_export_rows = [
        [
            row["queueId"],
            row["serviceDate"],
            row["intervalStart"],
            row["callsOffered"],
            row["ahtSeconds"],
            row["requiredAgents"],
            row["requiredHeadcount"],
            _format_percent_for_export(row["serviceLevel"]),
            row["asaSeconds"],
            _format_percent_for_export(row["expectedOccupancy"]),
        ]
        for row in breakdown_rows
    ]

    return {
        "weeklyPlan": {"headers": weekly_headers, "rows": weekly_rows},
        "dailyBreakdown": {"headers": breakdown_headers, "rows": breakdown_export_rows},
    }


def process_weekly_plan_rows(
    raw_rows: list[dict[str, Any]],
    shift_length_hours: float,
    productive_hours_per_day: float,
) -> dict[str, Any]:
    processed_rows = len(raw_rows)
    if productive_hours_per_day <= 0:
        return {
            "mode": "weekly-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [{"rowIndex": 0, "message": "productive_hours_per_day must be > 0"}],
            "dailyBreakdown": [],
            "calculatedRows": [],
            "export": _weekly_exports([], []),
        }

    enriched_rows, validation_errors, _ = _validate_and_calculate(raw_rows)
    if validation_errors:
        errors = _insert_global_error(
            validation_errors,
            "Batch contains validation errors. Fix all rows and upload again.",
        )
        return {
            "mode": "weekly-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": errors,
            "dailyBreakdown": [],
            "calculatedRows": [],
            "export": _weekly_exports([], []),
        }

    service_dates = sorted({row["serviceDate"] for row in enriched_rows})
    if len(service_dates) < 2:
        return {
            "mode": "weekly-plan",
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": [
                {
                    "rowIndex": 0,
                    "message": "Weekly Plan Builder requires at least two service dates in the file.",
                }
            ],
            "dailyBreakdown": [],
            "calculatedRows": [],
            "export": _weekly_exports([], []),
        }

    calculated_rows = _legacy_results_from_enriched(enriched_rows)
    base_summary = _summary_from_results(calculated_rows, processed_rows)

    day_summaries: list[dict[str, Any]] = []
    breakdown_rows: list[dict[str, Any]] = []

    for service_date in service_dates:
        day_rows = [row for row in enriched_rows if row["serviceDate"] == service_date]

        interval_rows = _build_daily_plan_rows(day_rows)
        breakdown_rows.extend(interval_rows)

        required_agent_hours = sum(
            row["requiredAgents"] * DEFAULT_INTERVAL_DURATION_HOURS for row in interval_rows
        )
        required_headcount_hours = sum(
            row["requiredHeadcount"] * DEFAULT_INTERVAL_DURATION_HOURS for row in interval_rows
        )
        recommended_daily_fte = (
            math.ceil(required_headcount_hours / productive_hours_per_day)
            if required_headcount_hours > 0
            else 0
        )

        day_summaries.append(
            {
                "serviceDate": service_date,
                "requiredAgentHours": required_agent_hours,
                "requiredHeadcountHours": required_headcount_hours,
                "peakRequiredAgents": max((row["requiredAgents"] for row in interval_rows), default=0),
                "peakRequiredHeadcount": max(
                    (row["requiredHeadcount"] for row in interval_rows), default=0
                ),
                "recommendedDailyFte": recommended_daily_fte,
            }
        )

    total_required_agent_hours = sum(day["requiredAgentHours"] for day in day_summaries)
    total_required_headcount_hours = sum(day["requiredHeadcountHours"] for day in day_summaries)
    day_count = len(day_summaries)
    avg_daily_fte = (
        sum(day["recommendedDailyFte"] for day in day_summaries) / day_count if day_count else 0.0
    )

    fte_values = [day["recommendedDailyFte"] for day in day_summaries]
    fte_max = max(fte_values, default=0)
    fte_min = min(fte_values, default=0)
    staffing_variability = (fte_max - fte_min) / avg_daily_fte if avg_daily_fte > 0 else 0.0

    peak_day_row = max(day_summaries, key=lambda day: day["requiredHeadcountHours"])
    planning_notes = []
    if day_count != 7:
        planning_notes.append(
            f"Weekly plan includes {day_count} service dates; seven-day horizon is recommended."
        )

    summary = {
        **base_summary,
        "dayCount": day_count,
        "shiftLengthHours": shift_length_hours,
        "productiveHoursPerDay": productive_hours_per_day,
        "totalRequiredAgentHours": total_required_agent_hours,
        "totalRequiredHeadcountHours": total_required_headcount_hours,
        "averageDailyFte": avg_daily_fte,
        "peakDay": peak_day_row["serviceDate"],
        "peakDayRequiredHeadcountHours": peak_day_row["requiredHeadcountHours"],
        "staffingVariability": staffing_variability,
        "idealSevenDayHorizon": day_count == 7,
        "planningNotes": planning_notes,
    }

    day_summaries.sort(key=lambda day: day["serviceDate"])
    breakdown_rows.sort(key=lambda row: (_interval_sort_key(row["intervalStart"]), row["queueId"]))

    return {
        "mode": "weekly-plan",
        "results": day_summaries,
        "summary": summary,
        "errors": [],
        "dailyBreakdown": breakdown_rows,
        "calculatedRows": calculated_rows,
        "export": _weekly_exports(day_summaries, breakdown_rows),
    }


def process_batch_rows(raw_rows: list[dict[str, Any]]) -> BatchPayload:
    file_payload = process_file_processor_rows(raw_rows)
    return {
        "results": file_payload["results"],
        "summary": file_payload["summary"],
        "errors": file_payload["errors"],
    }
