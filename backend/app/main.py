from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .batch import (
    process_batch_rows,
    process_file_processor_rows,
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
