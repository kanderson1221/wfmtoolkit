from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, TypedDict

from pydantic import BaseModel, Field, ValidationError

from .erlang import staff_for_interval
from .models import StaffingInput
from .planner import apply_shrinkage

DEFAULT_INTERVAL_DURATION_SECONDS = 30 * 60
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


def process_batch_rows(raw_rows: list[dict[str, Any]]) -> BatchPayload:
    file_payload = process_file_processor_rows(raw_rows)
    return {
        "results": file_payload["results"],
        "summary": file_payload["summary"],
        "errors": file_payload["errors"],
    }
