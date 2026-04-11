from __future__ import annotations

import unittest
from unittest.mock import patch

import pandas as pd

from backend.app.forecasting import ForecastRunRequest, run_daily_volume_forecast


class FakeProphet:
    instances: list["FakeProphet"] = []

    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs
        self.added_country_holidays = ""
        self.added_seasonalities: list[dict[str, object]] = []
        self.fitted_frame = pd.DataFrame()
        FakeProphet.instances.append(self)

    def add_country_holidays(self, country_name: str) -> None:
        self.added_country_holidays = country_name

    def add_seasonality(self, **kwargs) -> None:
        self.added_seasonalities.append(kwargs)

    def fit(self, frame: pd.DataFrame) -> "FakeProphet":
        self.fitted_frame = frame.copy()
        return self

    def make_future_dataframe(self, periods: int, freq: str = "D", include_history: bool = True) -> pd.DataFrame:
        history_dates = list(self.fitted_frame["ds"])
        last_date = history_dates[-1]
        future_dates = [last_date + pd.Timedelta(days=index + 1) for index in range(periods)]
        return pd.DataFrame({"ds": history_dates + future_dates})

    def predict(self, future: pd.DataFrame) -> pd.DataFrame:
        rows = []
        for index, ds_value in enumerate(future["ds"]):
            baseline = 100 + index
            rows.append(
                {
                    "ds": ds_value,
                    "yhat": baseline,
                    "yhat_lower": baseline - 5,
                    "yhat_upper": baseline + 5,
                    "trend": baseline - 2,
                    "weekly": float(index % 7),
                    "yearly": float(index) / 10.0,
                    "holidays": 0.0,
                }
            )
        return pd.DataFrame(rows)


class BrokenProphet:
    def __init__(self, **kwargs) -> None:
        raise AttributeError("stan backend unavailable")


class ForecastingTests(unittest.TestCase):
    def setUp(self) -> None:
        FakeProphet.instances.clear()

    def _payload(self, **overrides) -> ForecastRunRequest:
        base_payload = {
            "timezone": "America/New_York",
            "forecastHorizonDays": 3,
            "history": [
                {"ds": "2025-01-01", "y": 100, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-02", "y": 105, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-03", "y": 110, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-04", "y": 95, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-05", "y": 90, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-06", "y": 108, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-07", "y": 115, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-08", "y": 112, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-09", "y": 118, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-10", "y": 121, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-11", "y": 93, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-12", "y": 88, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-13", "y": 116, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-14", "y": 119, "cap": 500, "floor": 0, "holidayLabel": ""},
            ],
            "modelConfig": {
                "growth": "logistic",
                "defaultCap": 500,
                "defaultFloor": 0,
                "changepointPriorScale": 0.05,
                "changepointRange": 0.8,
                "changepointCount": 20,
                "manualChangepoints": [],
                "seasonalityMode": "additive",
                "weeklySeasonality": {"enabled": True, "fourierOrder": 3, "priorScale": 10},
                "yearlySeasonality": {"enabled": True, "fourierOrder": 8, "priorScale": 12},
                "builtInHolidayCountry": "US",
                "holidaysPriorScale": 10,
                "customSeasonalities": [
                    {
                        "name": "billing_cycle",
                        "periodDays": 30.5,
                        "fourierOrder": 4,
                        "priorScale": 5,
                        "mode": "additive",
                    }
                ],
                "customHolidays": [
                    {
                        "name": "Launch Day",
                        "date": "2025-02-01",
                        "lowerWindow": -1,
                        "upperWindow": 1,
                        "priorScale": 8,
                    }
                ],
                "intervalWidth": 0.8,
                "mcmcSamples": 0,
                "holdoutDays": 0,
            },
        }
        base_payload.update(overrides)
        return ForecastRunRequest.model_validate(base_payload)

    @patch("backend.app.forecasting.Prophet", FakeProphet)
    def test_forecast_run_returns_daily_rows_and_monthly_rollup(self) -> None:
        result = run_daily_volume_forecast(self._payload())

        self.assertEqual(result["summary"]["observationsUsed"], 14)
        self.assertEqual(len(result["dailyForecast"]), 17)
        self.assertTrue(result["monthlyRollup"])
        self.assertIn("peakDailyDate", result["monthlyRollup"][0])
        self.assertTrue(result["monthlyRollup"][0]["peakDailyDate"])
        self.assertIn("trend", result["components"])
        self.assertEqual(result["diagnostics"]["holdout"], None)

        fake_model = FakeProphet.instances[0]
        self.assertEqual(fake_model.kwargs["growth"], "logistic")
        self.assertEqual(fake_model.added_country_holidays, "US")
        self.assertTrue(any(item["name"] == "weekly" for item in fake_model.added_seasonalities))
        self.assertTrue(any(item["name"] == "billing_cycle" for item in fake_model.added_seasonalities))
        self.assertIn("cap", fake_model.fitted_frame.columns)
        self.assertIn("floor", fake_model.fitted_frame.columns)

    def test_logistic_forecast_requires_a_default_cap(self) -> None:
        base_payload = self._payload()
        payload = self._payload(modelConfig={**base_payload.modelConfig.model_dump(), "defaultCap": None})

        with self.assertRaises(ValueError) as raised:
            run_daily_volume_forecast(payload)

        self.assertIn("defaultCap", str(raised.exception))

    def test_forecast_run_rejects_duplicate_history_dates(self) -> None:
        base_payload = self._payload()
        payload = self._payload(
            history=[
                *[row.model_dump() for row in base_payload.history[:-1]],
                {"ds": "2025-01-13", "y": 140, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-13", "y": 119, "cap": 500, "floor": 0, "holidayLabel": ""},
            ]
        )

        with self.assertRaises(ValueError) as raised:
            run_daily_volume_forecast(payload)

        self.assertIn("one row per date", str(raised.exception))

    @patch("backend.app.forecasting.Prophet", FakeProphet)
    def test_holdout_returns_accuracy_metrics_and_rows(self) -> None:
        base_payload = self._payload()
        extended_history = [row.model_dump() for row in base_payload.history]
        extended_history.extend(
            [
                {"ds": "2025-01-15", "y": 122, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-16", "y": 124, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-17", "y": 126, "cap": 500, "floor": 0, "holidayLabel": ""},
            ]
        )
        payload = self._payload(
            history=extended_history,
            modelConfig={**base_payload.modelConfig.model_dump(), "holdoutDays": 3, "growth": "linear"}
        )

        result = run_daily_volume_forecast(payload)
        holdout = result["diagnostics"]["holdout"]

        self.assertIsNotNone(holdout)
        self.assertEqual(holdout["holdoutDays"], 3)
        self.assertEqual(holdout["trainingRows"], 14)
        self.assertEqual(holdout["testRows"], 3)
        self.assertEqual(holdout["trainingDateRange"], "2025-01-01 to 2025-01-14")
        self.assertEqual(holdout["testDateRange"], "2025-01-15 to 2025-01-17")
        self.assertEqual(len(holdout["rows"]), 3)
        self.assertIn("rmse", holdout)
        self.assertIn("wape", holdout)
        self.assertIn("bias", holdout)
        self.assertIn("intervalCoverage", holdout)
        self.assertEqual(result["summary"]["trainingObservations"], 14)
        self.assertEqual(result["summary"]["testObservations"], 3)

    @patch("backend.app.forecasting.Prophet", FakeProphet)
    def test_holdout_allows_exactly_fourteen_training_rows(self) -> None:
        base_payload = self._payload()
        extended_history = [row.model_dump() for row in base_payload.history]
        extended_history.extend(
            [
                {"ds": "2025-01-15", "y": 122, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-16", "y": 124, "cap": 500, "floor": 0, "holidayLabel": ""},
                {"ds": "2025-01-17", "y": 126, "cap": 500, "floor": 0, "holidayLabel": ""},
            ]
        )
        payload = self._payload(
            history=extended_history,
            modelConfig={**base_payload.modelConfig.model_dump(), "holdoutDays": 3, "growth": "linear"}
        )

        result = run_daily_volume_forecast(payload)

        self.assertEqual(result["summary"]["trainingObservations"], 14)
        self.assertEqual(result["summary"]["testObservations"], 3)

    @patch("backend.app.forecasting.Prophet", FakeProphet)
    def test_budget_forecast_returns_full_year_rollup_for_plan_year(self) -> None:
        payload = self._payload(
            planningYear=2025,
            forecastType="budget",
            coverageStartDate="2025-01-01",
            coverageEndDate="2025-12-31",
            modelConfig={**self._payload().modelConfig.model_dump(), "growth": "linear", "holdoutDays": 0},
        )

        result = run_daily_volume_forecast(payload)

        self.assertTrue(result["summary"]["planningReady"])
        self.assertEqual(result["summary"]["planningYear"], 2025)
        self.assertEqual(result["summary"]["forecastType"], "budget")
        self.assertEqual(len(result["monthlyRollup"]), 12)
        self.assertEqual(result["monthlyRollup"][0]["monthStart"], "2025-01-01")
        self.assertEqual(result["monthlyRollup"][-1]["monthStart"], "2025-12-01")

    @patch("backend.app.forecasting.Prophet", FakeProphet)
    def test_reforecast_blends_start_month_actuals_with_forecast_remainder(self) -> None:
        base_payload = self._payload()
        august_history = []

        for index, row in enumerate(base_payload.history):
            row_snapshot = row.model_dump()
            row_snapshot["ds"] = f"2025-08-{index + 1:02d}"
            august_history.append(row_snapshot)

        payload = self._payload(
            history=august_history,
            planningYear=2025,
            forecastType="reforecast",
            coverageStartDate="2025-08-01",
            coverageEndDate="2025-12-31",
            modelConfig={**base_payload.modelConfig.model_dump(), "growth": "linear", "holdoutDays": 0},
        )

        result = run_daily_volume_forecast(payload)
        august_contacts = next(
            month["contacts"]
            for month in result["monthlyRollup"]
            if month["monthStart"] == "2025-08-01"
        )
        actual_august_total = sum(row["y"] for row in august_history)
        forecast_august_remainder = sum(100 + index for index in range(14, 31))

        self.assertEqual(result["summary"]["forecastType"], "reforecast")
        self.assertTrue(result["summary"]["planningReady"])
        self.assertEqual(result["summary"]["coverageStartMonthIndex"], 7)
        self.assertEqual(len(result["monthlyRollup"]), 5)
        self.assertEqual(result["monthlyRollup"][0]["monthStart"], "2025-08-01")
        self.assertEqual(august_contacts, actual_august_total + forecast_august_remainder)

    @patch("backend.app.forecasting.Prophet", BrokenProphet)
    def test_forecast_run_surfaces_backend_initialization_errors(self) -> None:
        with self.assertRaises(RuntimeError) as raised:
            run_daily_volume_forecast(self._payload())

        self.assertIn("could not initialize Prophet", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
