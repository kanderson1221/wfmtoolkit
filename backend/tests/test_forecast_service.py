import asyncio
from datetime import date, timedelta
import sys
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from backend.app import forecast_service
from backend.app.forecast_models import ForecastRunRequest
from pydantic import ValidationError


class PrivateForecastServiceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.payload = ForecastRunRequest(history=[{"ds": "2026-01-01", "y": 10}])

    async def test_worker_exposes_only_forecasting_and_health(self):
        self.assertEqual(
            {route.path for route in forecast_service.app.routes},
            {"/api/health", "/api/forecasting/daily-volume/run"},
        )

    async def test_busy_fit_is_rejected_without_starting_another(self):
        self.assertTrue(forecast_service._jobs.acquire(blocking=False))
        try:
            with patch.object(forecast_service, "_run_isolated_forecast") as run:
                with self.assertRaises(HTTPException) as raised:
                    await forecast_service.daily_volume_forecast(self.payload)
                self.assertEqual(raised.exception.status_code, 503)
                run.assert_not_called()
        finally:
            forecast_service._jobs.release()

    async def test_fit_errors_preserve_status_and_release_capacity(self):
        for error, status in [(ValueError("invalid history"), 422), (RuntimeError("unavailable"), 503)]:
            with patch.object(forecast_service, "_run_isolated_forecast", side_effect=error):
                with self.assertRaises(HTTPException) as raised:
                    await forecast_service.daily_volume_forecast(self.payload)
                self.assertEqual(raised.exception.status_code, status)
                self.assertEqual(raised.exception.detail, str(error))
            with patch.object(forecast_service, "_run_isolated_forecast", return_value={"result": "ok"}):
                self.assertEqual(await forecast_service.daily_volume_forecast(self.payload), {"result": "ok"})

    async def test_timeout_and_cancellation_stop_the_actual_job_process(self):
        spawned = []
        started = asyncio.Event()
        original = asyncio.create_subprocess_exec

        async def start(*args, **kwargs):
            process = await original(*args, **kwargs)
            spawned.append(process)
            started.set()
            return process

        command = [sys.executable, "-c", "import time; time.sleep(60)"]
        with patch.object(forecast_service.asyncio, "create_subprocess_exec", side_effect=start):
            with self.assertRaisesRegex(RuntimeError, "time limit"):
                await forecast_service._execute_job(command, 0.2)
            self.assertIsNotNone(spawned[-1].returncode)
            started.clear()
            task = asyncio.create_task(forecast_service._execute_job(command, 60))
            await asyncio.wait_for(started.wait(), 5)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
            self.assertIsNotNone(spawned[-1].returncode)

    async def test_valid_forecast_runs_in_an_isolated_process(self):
        payload = ForecastRunRequest(
            history=[{"ds": (date(2025, 1, 1) + timedelta(days=i)).isoformat(), "y": 100 + i % 7} for i in range(30)],
            forecastHorizonDays=7,
            modelConfig={"holdoutDays": 0, "yearlySeasonality": {"enabled": False}},
        )
        result = await forecast_service.daily_volume_forecast(payload)
        self.assertTrue(result["runAt"])
        self.assertEqual(len(result["dailyForecast"]), 37)

    async def test_resource_limits_reject_expensive_and_nonfinite_inputs(self):
        for config in [
            {"mcmcSamples": 1000000},
            {"changepointCount": 1000000},
            {"weeklySeasonality": {"fourierOrder": 1000000}},
            {"customSeasonalities": [{"name": str(i), "periodDays": 7, "fourierOrder": 30, "priorScale": 10} for i in range(4)]},
            {"changepointPriorScale": float("inf")},
        ]:
            with self.subTest(config=config), self.assertRaises(ValidationError):
                ForecastRunRequest(history=[{"ds": "2025-01-01", "y": 10}], modelConfig=config)
        with self.assertRaises(ValidationError):
            ForecastRunRequest(history=[
                {"ds": (date(2020, 1, 1) + timedelta(days=i)).isoformat(), "y": 10, "holidayLabel": f"event-{i}"}
                for i in range(1500)
            ])
