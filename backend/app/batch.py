from __future__ import annotations

import csv
import json
import math
import tempfile
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, TypedDict

from pydantic import BaseModel, Field, ValidationError

from .erlang import staff_for_interval
from .models import StaffingInput
from .planner import apply_shrinkage

DEFAULT_INTERVAL_DURATION_SECONDS = 30 * 60
MAX_UPLOAD_ROWS = 25_000
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ERROR_PREVIEW_LIMIT = 100
FILE_DOWNLOAD_TTL_SECONDS = 60 * 60
DOWNLOAD_STORAGE_DIR = Path(tempfile.gettempdir()) / "wfmtoolkit_file_processor"
FILE_PROCESSOR_REQUIRED_HEADERS = [
    "queue_id",
    "interval_start",
    "calls_offered",
    "aht_seconds",
    "mean_patience_seconds",
    "service_level_threshold",
    "service_level_target_seconds",
    "max_occupancy",
]
ENRICHED_COLUMN_NAMES = [
    "Required Agents",
    "Required Headcount",
    "Service Level",
    "Average Speed of Answer",
    "Answered Immediately",
    "Expected Occupancy",
    "Caller Abandonment",
]
ERROR_REPORT_PREFIX = ["row_index", "message"]


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
    totalCallsOffered: float
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
    callsOffered: float
    sourceRow: dict[str, Any]
    requiredStaffNet: int
    requiredStaffGross: int
    serviceLevel: float
    asaSeconds: float | None
    percentAnsweredImmediately: float
    expectedOccupancy: float
    abandonPercent: float


class BatchDownloadInfo(TypedDict):
    fileId: str
    fileName: str
    downloadUrl: str
    expiresAt: str


class DownloadArtifactMeta(TypedDict):
    fileId: str
    fileName: str
    mediaType: str
    path: str
    expiresAt: str


class FileProcessorUploadPayload(TypedDict):
    mode: str
    summary: BatchSummary
    processedRows: int
    successfulRows: int
    failedRows: int
    errorCount: int
    errorsPreview: list[BatchRowError]
    downloads: dict[str, BatchDownloadInfo]


@dataclass
class SummaryAccumulator:
    total_calls_offered: float = 0.0
    total_service_level: float = 0.0
    total_asa_seconds: float = 0.0
    finite_asa_count: int = 0
    total_required_staff_minutes_net: float = 0.0
    total_required_staff_minutes_gross: float = 0.0
    peak_staff_net: int = 0
    peak_staff_gross: int = 0

    def add_row(
        self,
        row: EnrichedBatchRow,
        interval_duration_seconds: float = DEFAULT_INTERVAL_DURATION_SECONDS,
    ) -> None:
        interval_minutes = interval_duration_seconds / 60.0
        self.total_calls_offered += row["callsOffered"]
        self.total_service_level += row["serviceLevel"]
        if row["asaSeconds"] is not None:
            self.total_asa_seconds += row["asaSeconds"]
            self.finite_asa_count += 1
        self.total_required_staff_minutes_net += row["requiredStaffNet"] * interval_minutes
        self.total_required_staff_minutes_gross += row["requiredStaffGross"] * interval_minutes
        self.peak_staff_net = max(self.peak_staff_net, row["requiredStaffNet"])
        self.peak_staff_gross = max(self.peak_staff_gross, row["requiredStaffGross"])

    def build(
        self,
        processed_rows: int,
        successful_rows: int,
        failed_rows: int,
    ) -> BatchSummary:
        avg_asa_seconds = (
            self.total_asa_seconds / self.finite_asa_count if self.finite_asa_count else None
        )
        return {
            "processedRows": processed_rows,
            "successfulRows": successful_rows,
            "failedRows": failed_rows,
            "totalCallsOffered": self.total_calls_offered,
            "avgServiceLevel": (
                self.total_service_level / successful_rows if successful_rows else 0.0
            ),
            "avgAsaSeconds": avg_asa_seconds,
            "totalRequiredStaffMinutesNet": self.total_required_staff_minutes_net,
            "totalRequiredStaffHoursNet": self.total_required_staff_minutes_net / 60.0,
            "totalRequiredStaffMinutesGross": self.total_required_staff_minutes_gross,
            "totalRequiredStaffHoursGross": self.total_required_staff_minutes_gross / 60.0,
            "peakStaffNet": self.peak_staff_net,
            "peakStaffGross": self.peak_staff_gross,
        }


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
        "totalCallsOffered": 0.0,
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


def _summary_from_enriched(
    rows: list[EnrichedBatchRow],
    processed_rows: int,
    interval_duration_seconds: float = DEFAULT_INTERVAL_DURATION_SECONDS,
) -> BatchSummary:
    accumulator = SummaryAccumulator()
    for row in rows:
        accumulator.add_row(row, interval_duration_seconds)
    successful_rows = len(rows)
    failed_rows = processed_rows - successful_rows
    return accumulator.build(processed_rows, successful_rows, failed_rows)


def _validate_and_calculate_row(
    raw_row: dict[str, Any],
    row_index: int,
    interval_duration_seconds: float = DEFAULT_INTERVAL_DURATION_SECONDS,
) -> tuple[EnrichedBatchRow | None, BatchRowError | None]:
    try:
        row = BatchIntervalRecord.model_validate(raw_row)
    except ValidationError as error:
        return None, {"rowIndex": row_index, "message": _validation_error_message(error)}

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
        return None, {"rowIndex": row_index, "message": str(error)}

    return (
        EnrichedBatchRow(
            rowIndex=row_index,
            queueId=row.queue_id,
            serviceDate=_service_date(row.interval_start),
            intervalStart=row.interval_start,
            callsOffered=row.calls_offered,
            sourceRow=raw_row,
            requiredStaffNet=required_staff_net,
            requiredStaffGross=required_staff_gross,
            serviceLevel=metrics["service_level"],
            asaSeconds=_finite_or_none(metrics["average_speed_of_answer_seconds"]),
            percentAnsweredImmediately=metrics["percent_answered_immediately"],
            expectedOccupancy=metrics["occupancy"],
            abandonPercent=metrics["abandon_percent"],
        ),
        None,
    )


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
        enriched_row, row_error = _validate_and_calculate_row(
            raw_row,
            row_index,
            interval_duration_seconds,
        )
        if row_error:
            errors.append(row_error)
            continue

        if enriched_row is not None:
            enriched_rows.append(enriched_row)

    return enriched_rows, errors, original_headers


def _format_percent_for_export(value: float) -> float:
    return round(value * 100.0, 2)


def _build_export_row(headers: list[str], row: EnrichedBatchRow) -> list[Any]:
    source = row["sourceRow"]
    return [
        *(source.get(header, "") for header in headers),
        row["requiredStaffNet"],
        row["requiredStaffGross"],
        _format_percent_for_export(row["serviceLevel"]),
        row["asaSeconds"],
        _format_percent_for_export(row["percentAnsweredImmediately"]),
        _format_percent_for_export(row["expectedOccupancy"]),
        _format_percent_for_export(row["abandonPercent"]),
    ]


def _build_file_export(headers: list[str], rows: list[EnrichedBatchRow]) -> dict[str, Any]:
    export_headers = [*headers, *ENRICHED_COLUMN_NAMES]
    export_rows = [_build_export_row(headers, row) for row in rows]
    return {"headers": export_headers, "rows": export_rows}


def _normalize_csv_value(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip()
    return value


def _normalize_csv_row(
    raw_row: dict[str | None, Any],
    header_pairs: list[tuple[str, str]],
) -> dict[str, Any]:
    normalized = {
        normalized_header: _normalize_csv_value(raw_row.get(raw_header))
        for raw_header, normalized_header in header_pairs
    }
    if normalized.get("shrinkage") == "":
        normalized.pop("shrinkage")
    extras = raw_row.get(None)
    if extras:
        normalized["__extra_columns__"] = extras
    return normalized


def _ensure_required_headers(headers: list[str]) -> None:
    missing_headers = [header for header in FILE_PROCESSOR_REQUIRED_HEADERS if header not in headers]
    if missing_headers:
        missing_text = ", ".join(missing_headers)
        raise ValueError(f"Missing required columns for File Processor: {missing_text}")


def _build_download_file_name(original_filename: str, suffix: str) -> str:
    source_name = Path(original_filename or "file_processor.csv").name
    stem = Path(source_name).stem or "file_processor"
    return f"{stem}_{suffix}.csv"


def _create_temp_csv_path() -> Path:
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
    temp_file.close()
    return Path(temp_file.name)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _downloads_dir() -> Path:
    DOWNLOAD_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return DOWNLOAD_STORAGE_DIR


def _metadata_path(file_id: str) -> Path:
    return _downloads_dir() / f"{file_id}.json"


def _download_path(file_id: str) -> Path:
    return _downloads_dir() / f"{file_id}.csv"


def _remove_download_artifact(file_id: str) -> None:
    _metadata_path(file_id).unlink(missing_ok=True)
    _download_path(file_id).unlink(missing_ok=True)


def cleanup_download_artifacts(now: datetime | None = None) -> None:
    current_time = now or _utc_now()
    for metadata_path in _downloads_dir().glob("*.json"):
        try:
            metadata = json.loads(metadata_path.read_text())
            expires_at = datetime.fromisoformat(metadata["expiresAt"])
            file_id = str(metadata["fileId"])
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            metadata_path.unlink(missing_ok=True)
            continue

        if expires_at <= current_time:
            _remove_download_artifact(file_id)


def _register_download_artifact(
    source_path: Path,
    file_name: str,
    media_type: str = "text/csv",
) -> BatchDownloadInfo:
    file_id = uuid.uuid4().hex
    destination_path = _download_path(file_id)
    expires_at = _utc_now() + timedelta(seconds=FILE_DOWNLOAD_TTL_SECONDS)
    source_path.replace(destination_path)

    metadata: DownloadArtifactMeta = {
        "fileId": file_id,
        "fileName": file_name,
        "mediaType": media_type,
        "path": str(destination_path),
        "expiresAt": expires_at.isoformat(),
    }
    _metadata_path(file_id).write_text(json.dumps(metadata))
    return {
        "fileId": file_id,
        "fileName": file_name,
        "downloadUrl": f"/api/erlang-c/batch/file-processor/download/{file_id}",
        "expiresAt": metadata["expiresAt"],
    }


def get_download_artifact(file_id: str) -> DownloadArtifactMeta:
    cleanup_download_artifacts()
    metadata_file = _metadata_path(file_id)
    if not metadata_file.exists():
        raise FileNotFoundError("Processed file download has expired or is unavailable.")

    try:
        metadata = json.loads(metadata_file.read_text())
        expires_at = datetime.fromisoformat(metadata["expiresAt"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        _remove_download_artifact(file_id)
        raise FileNotFoundError("Processed file download has expired or is unavailable.") from error

    if expires_at <= _utc_now():
        _remove_download_artifact(file_id)
        raise FileNotFoundError("Processed file download has expired or is unavailable.")

    artifact_path = Path(str(metadata["path"]))
    if not artifact_path.exists():
        _remove_download_artifact(file_id)
        raise FileNotFoundError("Processed file download has expired or is unavailable.")

    return DownloadArtifactMeta(
        fileId=str(metadata["fileId"]),
        fileName=str(metadata["fileName"]),
        mediaType=str(metadata.get("mediaType", "text/csv")),
        path=str(artifact_path),
        expiresAt=str(metadata["expiresAt"]),
    )


def process_uploaded_file(
    upload_path: Path,
    original_filename: str,
    interval_duration_seconds: float = DEFAULT_INTERVAL_DURATION_SECONDS,
) -> FileProcessorUploadPayload:
    cleanup_download_artifacts()
    enriched_temp = _create_temp_csv_path()
    error_temp: Path | None = None

    processed_rows = 0
    successful_rows = 0
    failed_rows = 0
    errors_preview: list[BatchRowError] = []
    accumulator = SummaryAccumulator()

    try:
        with upload_path.open("r", encoding="utf-8-sig", newline="") as source_file:
            reader = csv.DictReader(source_file)
            raw_headers = reader.fieldnames or []
            header_pairs = [
                (header, header.strip()) for header in raw_headers if header and header.strip()
            ]
            headers = [normalized_header for _, normalized_header in header_pairs]
            if not headers:
                raise ValueError("CSV is empty.")
            _ensure_required_headers(headers)

            enriched_writer_file = enriched_temp.open("w", encoding="utf-8", newline="")
            error_writer_file = None
            try:
                enriched_writer = csv.writer(enriched_writer_file)
                enriched_writer.writerow([*headers, *ENRICHED_COLUMN_NAMES])

                error_writer = None

                for raw_row in reader:
                    processed_rows += 1
                    if processed_rows > MAX_UPLOAD_ROWS:
                        raise ValueError(
                            f"File exceeds the maximum supported row count of {MAX_UPLOAD_ROWS:,}."
                        )

                    normalized_row = _normalize_csv_row(raw_row, header_pairs)
                    enriched_row, row_error = _validate_and_calculate_row(
                        normalized_row,
                        processed_rows,
                        interval_duration_seconds,
                    )
                    if row_error:
                        failed_rows += 1
                        if len(errors_preview) < ERROR_PREVIEW_LIMIT:
                            errors_preview.append(row_error)
                        if error_writer is None:
                            error_temp = _create_temp_csv_path()
                            error_writer_file = error_temp.open(
                                "w",
                                encoding="utf-8",
                                newline="",
                            )
                            error_writer = csv.writer(error_writer_file)
                            error_writer.writerow([*ERROR_REPORT_PREFIX, *headers])
                        error_writer.writerow(
                            [row_error["rowIndex"], row_error["message"]]
                            + [normalized_row.get(header, "") for header in headers]
                        )
                        continue

                    if enriched_row is None:
                        continue

                    successful_rows += 1
                    accumulator.add_row(enriched_row, interval_duration_seconds)
                    enriched_writer.writerow(_build_export_row(headers, enriched_row))

                if error_writer_file is not None:
                    error_writer_file.close()
            finally:
                enriched_writer_file.close()
                if error_writer_file is not None and not error_writer_file.closed:
                    error_writer_file.close()

        if processed_rows == 0:
            raise ValueError("No data rows found in CSV.")

        summary = accumulator.build(processed_rows, successful_rows, failed_rows)
        if failed_rows > 0:
            enriched_temp.unlink(missing_ok=True)
            if error_temp is None:
                raise ValueError("Batch contains validation errors. Fix all rows and upload again.")

            error_report = _register_download_artifact(
                error_temp,
                _build_download_file_name(original_filename, "error_report"),
            )
            return {
                "mode": "file-processor",
                "summary": summary,
                "processedRows": processed_rows,
                "successfulRows": successful_rows,
                "failedRows": failed_rows,
                "errorCount": failed_rows,
                "errorsPreview": errors_preview,
                "downloads": {"errorReport": error_report},
            }

        enriched_file = _register_download_artifact(
            enriched_temp,
            _build_download_file_name(original_filename, "enriched"),
        )
        return {
            "mode": "file-processor",
            "summary": summary,
            "processedRows": processed_rows,
            "successfulRows": successful_rows,
            "failedRows": failed_rows,
            "errorCount": 0,
            "errorsPreview": [],
            "downloads": {"enrichedFile": enriched_file},
        }
    except (UnicodeDecodeError, csv.Error) as error:
        raise ValueError("Unable to parse CSV file.") from error
    finally:
        upload_path.unlink(missing_ok=True)
        enriched_temp.unlink(missing_ok=True)
        if error_temp is not None:
            error_temp.unlink(missing_ok=True)


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
    summary = _summary_from_enriched(enriched_rows, processed_rows)
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
