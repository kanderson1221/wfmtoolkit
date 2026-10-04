"""Private forecasting API. Each fit runs in a process with a hard deadline."""

import asyncio
import json
import os
from pathlib import Path
import signal
import sys
import tempfile
from threading import BoundedSemaphore

from fastapi import FastAPI, HTTPException

from .forecast_models import ForecastRunRequest, configured_limit

app = FastAPI(title="WFM Toolkit forecasting worker", docs_url=None, redoc_url=None, openapi_url=None)
_jobs = BoundedSemaphore(1)
JOB_TIMEOUT_SECONDS = configured_limit("WFM_FORECAST_TIMEOUT_SECONDS", 540)
if JOB_TIMEOUT_SECONDS > 540:
    raise ValueError("WFM_FORECAST_TIMEOUT_SECONDS must not exceed 540 (the proxy deadline is 600 seconds)")
MAX_RESULT_BYTES = 50 * 1024 * 1024


async def _stop_job(process):
    # CmdStan creates children. Stop the whole job session, including children
    # whose parent may already have exited, rather than just the Python process.
    if os.name == "posix":
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    elif process.returncode is None:
        process.kill()
    await process.wait()


async def _execute_job(command, timeout):
    process = await asyncio.create_subprocess_exec(*command, start_new_session=os.name == "posix")
    try:
        await asyncio.wait_for(process.wait(), timeout=timeout)
        if process.returncode != 0:
            raise RuntimeError("Forecast calculation process failed. Please retry.")
    except TimeoutError as error:
        raise RuntimeError("Forecast exceeded its execution time limit. Reduce model complexity and retry.") from error
    finally:
        # Also handles HTTP task cancellation and graceful service shutdown.
        await _stop_job(process)


async def _run_isolated_forecast(payload):
    with tempfile.TemporaryDirectory(prefix="wfm-forecast-") as directory:
        source = Path(directory) / "request.json"
        target = Path(directory) / "result.json"
        source.write_text(payload.model_dump_json(), encoding="utf-8")
        await _execute_job([sys.executable, "-m", "backend.app.forecast_job", str(source), str(target)], JOB_TIMEOUT_SECONDS)
        if not target.is_file() or target.stat().st_size > MAX_RESULT_BYTES:
            raise RuntimeError("Forecast results exceed the supported size or are unavailable.")
        envelope = json.loads(target.read_text(encoding="utf-8"))
        if "error" in envelope:
            error = envelope["error"]
            raise HTTPException(status_code=error["status"], detail=error["detail"])
        return envelope["result"]


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/forecasting/daily-volume/run")
async def daily_volume_forecast(payload: ForecastRunRequest) -> dict:
    if not _jobs.acquire(blocking=False):
        raise HTTPException(status_code=503, detail="Forecasting capacity is busy. Please retry shortly.")
    try:
        return await _run_isolated_forecast(payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except (RuntimeError, OSError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    finally:
        _jobs.release()
