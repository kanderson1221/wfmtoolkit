import unittest
from unittest.mock import patch

from fastapi import HTTPException
from backend.app import forecast_service
from backend.app.forecasting import ForecastRunRequest


class PrivateForecastServiceTests(unittest.TestCase):
    def setUp(self):
        self.payload = ForecastRunRequest(history=[{"ds": "2026-01-01", "y": 10}])

    def test_worker_exposes_only_forecasting_and_health(self):
        self.assertEqual(
            {route.path for route in forecast_service.app.routes},
            {"/api/health", "/api/forecasting/daily-volume/run"},
        )

    def test_busy_fit_is_rejected_without_starting_another(self):
        self.assertTrue(forecast_service._jobs.acquire(blocking=False))
        try:
            with patch.object(forecast_service, "run_daily_volume_forecast") as run:
                with self.assertRaises(HTTPException) as raised:
                    forecast_service.daily_volume_forecast(self.payload)
                self.assertEqual(raised.exception.status_code, 503)
                run.assert_not_called()
        finally:
            forecast_service._jobs.release()

    def test_fit_errors_preserve_status_and_release_capacity(self):
        for error, status in [(ValueError("invalid history"), 422), (RuntimeError("unavailable"), 503)]:
            with patch.object(forecast_service, "run_daily_volume_forecast", side_effect=error):
                with self.assertRaises(HTTPException) as raised:
                    forecast_service.daily_volume_forecast(self.payload)
                self.assertEqual(raised.exception.status_code, status)
                self.assertEqual(raised.exception.detail, str(error))
            with patch.object(forecast_service, "run_daily_volume_forecast", return_value={"result": "ok"}):
                self.assertEqual(forecast_service.daily_volume_forecast(self.payload), {"result": "ok"})
