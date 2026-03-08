from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .erlang import build_results_payload
from .models import StaffingInput


class ErlangCRequest(BaseModel):
    callsOffered: float = Field(ge=0)
    intervalLength: float = Field(gt=0)
    averageHandleTime: float = Field(gt=0)
    averageCustomerPatience: float = Field(gt=0)
    serviceLevelGoal: float = Field(gt=0, le=100)
    serviceLevelThreshold: float = Field(ge=0)
    maxOccupancy: float = Field(gt=0, le=100, default=85)


app = FastAPI(title="WFMToolkit API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/erlang-c/calculate")
@app.post("/api/erlang-c/mock-results")
def calculate_erlang_c(payload: ErlangCRequest) -> dict:
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
        return build_results_payload(inputs)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
