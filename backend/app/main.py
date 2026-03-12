from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .batch import (
    process_batch_rows,
    process_daily_plan_rows,
    process_file_processor_rows,
    process_weekly_plan_rows,
)
from .erlang import build_results_payload
from .models import StaffingInput


class ErlangCRequest(BaseModel):
    model: Literal["erlang_c", "erlang_a"] = "erlang_c"
    callsOffered: float = Field(ge=0)
    intervalLength: float = Field(gt=0)
    averageHandleTime: float = Field(gt=0)
    averageCustomerPatience: float = Field(gt=0)
    serviceLevelGoal: float = Field(gt=0, le=100)
    serviceLevelThreshold: float = Field(ge=0)
    maxOccupancy: float = Field(gt=0, le=100, default=85)
    shrinkageAssumption: float = Field(ge=0, lt=100, default=0)


class ErlangCBatchRequest(BaseModel):
    rows: list[dict[str, Any]]


class ErlangCFileProcessorRequest(BaseModel):
    rows: list[dict[str, Any]]


class ErlangCDailyPlanRequest(BaseModel):
    rows: list[dict[str, Any]]
    shift_paid_hours: float = Field(default=8, gt=0)
    unpaid_lunch_minutes: float = Field(default=30, ge=0)
    lunch_window_start_hours: float = Field(default=3.5, ge=0)
    lunch_window_end_hours: float = Field(default=4.5, ge=0)
    interval_duration_minutes: float = Field(gt=0, default=30)


class ErlangCWeeklyPlanRequest(BaseModel):
    rows: list[dict[str, Any]]
    shift_length_hours: float = Field(gt=0)
    productive_hours_per_day: float = Field(gt=0)


app = FastAPI(title="WFMToolkit API")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DIST_DIR = PROJECT_ROOT / "dist"


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/erlang-c/calculate")
@app.post("/api/erlang-c/mock-results")
def calculate_erlang_c(payload: ErlangCRequest) -> dict[str, Any]:
    try:
        inputs = StaffingInput(
            calls_offered=payload.callsOffered,
            interval_duration_seconds=payload.intervalLength * 60,
            avg_handle_time_seconds=payload.averageHandleTime,
            target_service_level=payload.serviceLevelGoal / 100.0,
            service_level_answer_time_seconds=payload.serviceLevelThreshold,
            max_occupancy=payload.maxOccupancy / 100.0,
            avg_caller_patience_seconds=payload.averageCustomerPatience,
        )
        return build_results_payload(
            inputs,
            payload.shrinkageAssumption / 100.0,
            model=payload.model,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/api/erlang-c/batch-calculate")
def calculate_erlang_c_batch(payload: ErlangCBatchRequest) -> dict[str, Any]:
    if not payload.rows:
        raise HTTPException(status_code=422, detail="rows must contain at least one item")

    return process_batch_rows(payload.rows)


@app.post("/api/erlang-c/batch/file-processor")
def file_processor(payload: ErlangCFileProcessorRequest) -> dict[str, Any]:
    if not payload.rows:
        raise HTTPException(status_code=422, detail="rows must contain at least one item")

    return process_file_processor_rows(payload.rows)


@app.post("/api/erlang-c/batch/daily-plan")
def daily_plan(payload: ErlangCDailyPlanRequest) -> dict[str, Any]:
    if not payload.rows:
        raise HTTPException(status_code=422, detail="rows must contain at least one item")

    return process_daily_plan_rows(
        payload.rows,
        shift_paid_hours=payload.shift_paid_hours,
        unpaid_lunch_hours=payload.unpaid_lunch_minutes / 60.0,
        lunch_window_start_hours=payload.lunch_window_start_hours,
        lunch_window_end_hours=payload.lunch_window_end_hours,
        interval_duration_minutes=payload.interval_duration_minutes,
    )


@app.post("/api/erlang-c/batch/weekly-plan")
def weekly_plan(payload: ErlangCWeeklyPlanRequest) -> dict[str, Any]:
    if not payload.rows:
        raise HTTPException(status_code=422, detail="rows must contain at least one item")

    return process_weekly_plan_rows(
        payload.rows,
        shift_length_hours=payload.shift_length_hours,
        productive_hours_per_day=payload.productive_hours_per_day,
    )


@app.get("/", include_in_schema=False)
def serve_frontend_root() -> FileResponse:
    index_path = DIST_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")
    return FileResponse(index_path)


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str) -> FileResponse:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")

    index_path = DIST_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    candidate = (DIST_DIR / full_path).resolve()
    dist_resolved = DIST_DIR.resolve()
    if dist_resolved in candidate.parents and candidate.is_file():
        return FileResponse(candidate)

    return FileResponse(index_path)
