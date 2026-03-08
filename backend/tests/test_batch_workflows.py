from __future__ import annotations

import math
import unittest

from backend.app.batch import (
    process_daily_plan_rows,
    process_file_processor_rows,
    process_weekly_plan_rows,
)


class BatchWorkflowTests(unittest.TestCase):
    def _row(self, interval_start: str, calls_offered: float = 120, **overrides: float | str) -> dict[str, float | str]:
        row: dict[str, float | str] = {
            "queue_id": "sales",
            "interval_start": interval_start,
            "calls_offered": calls_offered,
            "aht_seconds": 240,
            "mean_patience_seconds": 180,
            "service_level_threshold": 80,
            "service_level_target_seconds": 20,
            "max_occupancy": 85,
            "shrinkage": 0.3,
        }
        row.update(overrides)
        return row

    def test_file_processor_valid_flow(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 180),
            self._row("2026-03-08T09:30:00Z", 150),
        ]

        body = process_file_processor_rows(rows)

        self.assertEqual(body["mode"], "file-processor")
        self.assertEqual(body["summary"]["processedRows"], 2)
        self.assertEqual(body["summary"]["successfulRows"], 2)
        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(len(body["results"]), 2)

        export_headers = body["export"]["enrichedFile"]["headers"]
        self.assertEqual(export_headers[0:8], [
            "queue_id",
            "interval_start",
            "calls_offered",
            "aht_seconds",
            "mean_patience_seconds",
            "service_level_threshold",
            "service_level_target_seconds",
            "max_occupancy",
        ])
        self.assertEqual(
            export_headers[-7:],
            [
                "Required Agents",
                "Required Headcount",
                "Service Level",
                "Average Speed of Answer",
                "Answered Immediately",
                "Expected Occupancy",
                "Caller Abandonment",
            ],
        )

    def test_daily_plan_with_one_service_date(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 120),
            self._row("2026-03-08T09:30:00Z", 140),
            self._row("2026-03-08T10:00:00Z", 130),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_length_hours=8,
            productive_hours_per_day=6.5,
        )

        self.assertEqual(body["mode"], "daily-plan")
        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(body["summary"]["processedRows"], 3)
        self.assertEqual(body["summary"]["serviceDate"], "2026-03-08")
        self.assertGreaterEqual(body["summary"]["requiredDailyFte"], 1)
        self.assertEqual(len(body["results"]), 3)
        self.assertNotIn("shiftStarts", body)
        self.assertIn("serviceLevel", body["results"][0])
        self.assertIn("expectedOccupancy", body["results"][0])

    def test_daily_plan_accepts_interval_duration_minutes(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 120),
            self._row("2026-03-08T09:15:00Z", 120),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_length_hours=8,
            productive_hours_per_day=6.5,
            interval_duration_minutes=15,
        )

        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(body["summary"]["intervalDurationMinutes"], 15.0)

    def test_daily_plan_with_multiple_dates_fails(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 120),
            self._row("2026-03-09T09:00:00Z", 140),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_length_hours=8,
            productive_hours_per_day=6.5,
        )

        self.assertEqual(body["summary"]["successfulRows"], 0)
        self.assertEqual(len(body["results"]), 0)
        self.assertGreaterEqual(len(body["errors"]), 1)
        self.assertIn("exactly one service date", body["errors"][0]["message"])

    def test_weekly_plan_with_multiple_dates(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 120),
            self._row("2026-03-08T09:30:00Z", 130),
            self._row("2026-03-09T09:00:00Z", 140),
            self._row("2026-03-09T09:30:00Z", 150),
        ]

        body = process_weekly_plan_rows(
            rows,
            shift_length_hours=8,
            productive_hours_per_day=6.5,
        )

        self.assertEqual(body["mode"], "weekly-plan")
        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(body["summary"]["dayCount"], 2)
        self.assertEqual(len(body["results"]), 2)
        self.assertGreater(body["summary"]["totalRequiredHeadcountHours"], 0)
        self.assertNotIn("shiftStarts", body)
        self.assertIn("callsOffered", body["dailyBreakdown"][0])

    def test_invalid_schema_and_range_fails(self) -> None:
        rows = [
            {
                "queue_id": "sales",
                "interval_start": "2026-03-08T09:00:00Z",
                "calls_offered": 120,
                "mean_patience_seconds": 180,
                "service_level_threshold": 80,
                "service_level_target_seconds": 20,
                "max_occupancy": 85,
            },
            self._row("2026-03-08T09:30:00Z", 140, max_occupancy=120),
        ]

        body = process_file_processor_rows(rows)

        self.assertEqual(body["summary"]["successfulRows"], 0)
        self.assertEqual(len(body["results"]), 0)
        self.assertGreaterEqual(len(body["errors"]), 2)

    def test_extreme_volume_remains_numeric(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 5000),
            self._row("2026-03-09T09:00:00Z", 5000),
        ]

        body = process_weekly_plan_rows(
            rows,
            shift_length_hours=8,
            productive_hours_per_day=6.5,
        )

        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(body["summary"]["successfulRows"], 2)

        for row in body["calculatedRows"]:
            self.assertFalse(math.isnan(row["serviceLevel"]))
            self.assertFalse(math.isnan(row["percentAnsweredImmediately"]))
            self.assertFalse(math.isnan(row["expectedOccupancy"]))
            self.assertFalse(math.isnan(row["abandonPercent"]))
            if row["asaSeconds"] is not None:
                self.assertFalse(math.isnan(row["asaSeconds"]))


if __name__ == "__main__":
    unittest.main()
