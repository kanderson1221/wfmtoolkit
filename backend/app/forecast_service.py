"""Private forecasting worker used by the native Rust API during migration.

This service deliberately exposes only forecasting and a readiness endpoint.
Run it on loopback; public HTTP, Erlang, batch, and planning belong to Rust.
"""

from threading import BoundedSemaphore

from fastapi import FastAPI, HTTPException

from .forecasting import ForecastRunRequest, run_daily_volume_forecast

app = FastAPI(title="WFM Toolkit forecasting worker", docs_url=None, redoc_url=None, openapi_url=None)
_jobs = BoundedSemaphore(1)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/forecasting/daily-volume/run")
def daily_volume_forecast(payload: ForecastRunRequest) -> dict:
    # A disconnected proxy request must not allow a second Prophet fit to start
    # while the first fit is still running in a Python worker thread.
    if not _jobs.acquire(blocking=False):
        raise HTTPException(status_code=503, detail="Forecasting capacity is busy. Please retry shortly.")
    try:
        return run_daily_volume_forecast(payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    finally:
        _jobs.release()
