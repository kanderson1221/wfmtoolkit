from __future__ import annotations

import math
from typing import Any, TypedDict

from pydantic import BaseModel, Field, ValidationError

from .erlang import staff_for_interval
from .models import StaffingInput
from .planner import apply_shrinkage

INTERVAL_DURATION_SECONDS = 30 * 60


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


def process_batch_rows(raw_rows: list[dict[str, Any]]) -> BatchPayload:
    normalized_rows: list[tuple[int, BatchIntervalRecord, float, float, float]] = []
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
            max_occupancy = _ratio_from_percent_or_ratio(
                row.max_occupancy, "max_occupancy"
            )
            shrinkage = _shrinkage_from_percent_or_ratio(row.shrinkage)
        except ValueError as error:
            errors.append({"rowIndex": row_index, "message": str(error)})
            continue

        normalized_rows.append((row_index, row, target_service_level, max_occupancy, shrinkage))

    processed_rows = len(raw_rows)
    if errors:
        errors.insert(
            0,
            {
                "rowIndex": 0,
                "message": "Batch contains validation errors. Fix all rows and upload again.",
            },
        )
        return {
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": errors,
        }

    results: list[BatchRowResult] = []
    for row_index, row, target_service_level, max_occupancy, shrinkage in normalized_rows:

        try:
            metrics = staff_for_interval(
                StaffingInput(
                    calls_offered=row.calls_offered,
                    interval_duration_seconds=INTERVAL_DURATION_SECONDS,
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

        results.append(
            BatchRowResult(
                rowIndex=row_index,
                queueId=row.queue_id,
                intervalStart=row.interval_start,
                requiredStaffNet=required_staff_net,
                requiredStaffGross=required_staff_gross,
                serviceLevel=metrics["service_level"],
                asaSeconds=_finite_or_none(metrics["average_speed_of_answer_seconds"]),
                percentAnsweredImmediately=metrics["percent_answered_immediately"],
                expectedOccupancy=metrics["occupancy"],
                abandonPercent=metrics["abandon_percent"],
            )
        )

    if errors:
        errors.insert(
            0,
            {
                "rowIndex": 0,
                "message": "Batch processing failed. Fix all rows and upload again.",
            },
        )
        return {
            "results": [],
            "summary": _empty_summary(processed_rows, processed_rows),
            "errors": errors,
        }

    successful_rows = len(results)
    failed_rows = processed_rows - successful_rows

    total_minutes_net = sum(
        result["requiredStaffNet"] * (INTERVAL_DURATION_SECONDS / 60.0) for result in results
    )
    total_minutes_gross = sum(
        result["requiredStaffGross"] * (INTERVAL_DURATION_SECONDS / 60.0) for result in results
    )

    finite_asa_values = [
        value for value in (result["asaSeconds"] for result in results) if value is not None
    ]
    avg_asa_seconds = (
        (sum(finite_asa_values) / len(finite_asa_values)) if finite_asa_values else None
    )

    summary: BatchSummary = {
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

    return {"results": results, "summary": summary, "errors": errors}
