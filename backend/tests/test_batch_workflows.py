from __future__ import annotations

import math
import unittest
from datetime import datetime, timedelta

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
            shift_paid_hours=8,
            unpaid_lunch_hours=0.5,
        )

        self.assertEqual(body["mode"], "daily-plan")
        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(body["summary"]["processedRows"], 3)
        self.assertEqual(body["summary"]["serviceDate"], "2026-03-08")
        self.assertGreaterEqual(body["summary"]["requiredDailyFte"], 1)
        self.assertEqual(len(body["results"]), 3)
        self.assertIn("shiftPlan", body)
        self.assertIn("scheduleCoverage", body)
        self.assertIn("agentSchedules", body)
        self.assertIsInstance(body["shiftPlan"], list)
        self.assertIsInstance(body["agentSchedules"], list)
        self.assertEqual(len(body["scheduleCoverage"]), 3)
        self.assertIn("serviceLevel", body["results"][0])
        self.assertIn("expectedOccupancy", body["results"][0])

    def test_daily_plan_accepts_interval_duration_minutes(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 120),
            self._row("2026-03-08T09:15:00Z", 120),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_paid_hours=8,
            unpaid_lunch_hours=0.5,
            interval_duration_minutes=15,
        )

        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(body["summary"]["intervalDurationMinutes"], 15.0)
        self.assertIn("optimizedShiftCount", body["summary"])
        self.assertIn("coverageRate", body["summary"])

    def test_daily_plan_with_multiple_dates_fails(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 120),
            self._row("2026-03-09T09:00:00Z", 140),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_paid_hours=8,
            unpaid_lunch_hours=0.5,
        )

        self.assertEqual(body["summary"]["successfulRows"], 0)
        self.assertEqual(len(body["results"]), 0)
        self.assertGreaterEqual(len(body["errors"]), 1)
        self.assertIn("exactly one service date", body["errors"][0]["message"])
        self.assertEqual(len(body["shiftPlan"]), 0)
        self.assertEqual(len(body["scheduleCoverage"]), 0)

    def test_daily_plan_rejects_negative_unpaid_lunch(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 120),
            self._row("2026-03-08T09:30:00Z", 140),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_paid_hours=8,
            unpaid_lunch_hours=-0.5,
        )

        self.assertEqual(body["summary"]["successfulRows"], 0)
        self.assertEqual(len(body["results"]), 0)
        self.assertGreaterEqual(len(body["errors"]), 1)
        self.assertIn("unpaid_lunch_hours", body["errors"][0]["message"])

    def test_daily_plan_rejects_invalid_lunch_window(self) -> None:
        rows = [
            self._row("2026-03-08T09:00:00Z", 120),
            self._row("2026-03-08T09:30:00Z", 140),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_paid_hours=8,
            unpaid_lunch_hours=0.5,
            lunch_window_start_hours=4.5,
            lunch_window_end_hours=3.5,
        )

        self.assertEqual(body["summary"]["successfulRows"], 0)
        self.assertEqual(len(body["results"]), 0)
        self.assertGreaterEqual(len(body["errors"]), 1)
        self.assertIn("lunch_window_end_hours", body["errors"][0]["message"])

    def test_daily_plan_does_not_create_incomplete_shifts(self) -> None:
        start = datetime(2026, 3, 8, 8, 0)
        rows = []
        for offset in range(25):  # 08:00 through 20:00 inclusive, 30-minute intervals
            interval_start = (start + timedelta(minutes=30 * offset)).strftime("%Y-%m-%dT%H:%M:%SZ")
            calls = 260 if interval_start.endswith("16:00:00Z") else 40
            rows.append(self._row(interval_start, calls_offered=calls))

        body = process_daily_plan_rows(
            rows,
            shift_paid_hours=8,
            unpaid_lunch_hours=0.5,
            interval_duration_minutes=30,
        )

        self.assertEqual(len(body["errors"]), 0)
        self.assertGreaterEqual(len(body["shiftPlan"]), 1)

        row_index_by_interval = {
            row["intervalStart"]: index for index, row in enumerate(body["results"])
        }
        expected_shift_span = math.ceil((8 + 0.5) / 0.5)
        for shift in body["shiftPlan"]:
            start_index = row_index_by_interval[shift["shiftStart"]]
            end_index = row_index_by_interval[shift["shiftEnd"]]
            self.assertEqual(end_index - start_index + 1, expected_shift_span)

        latest_start = datetime.strptime("2026-03-08T12:00:00Z", "%Y-%m-%dT%H:%M:%SZ")
        for shift in body["shiftPlan"]:
            shift_start = datetime.strptime(shift["shiftStart"], "%Y-%m-%dT%H:%M:%SZ")
            self.assertLessEqual(shift_start, latest_start)

    def test_daily_plan_lunch_assignments_match_interval_coverage(self) -> None:
        rows = [
            self._row("3/8/26 8:00", 82),
            self._row("3/8/26 8:30", 88),
            self._row("3/8/26 9:00", 95),
            self._row("3/8/26 9:30", 108),
            self._row("3/8/26 10:00", 124),
            self._row("3/8/26 10:30", 137),
            self._row("3/8/26 11:00", 149),
            self._row("3/8/26 11:30", 158),
            self._row("3/8/26 12:00", 166),
            self._row("3/8/26 12:30", 172),
            self._row("3/8/26 13:00", 176),
            self._row("3/8/26 13:30", 171),
            self._row("3/8/26 14:00", 165),
            self._row("3/8/26 14:30", 154),
            self._row("3/8/26 15:00", 147),
            self._row("3/8/26 15:30", 139),
            self._row("3/8/26 16:00", 128),
            self._row("3/8/26 16:30", 114),
            self._row("3/8/26 17:00", 101),
            self._row("3/8/26 17:30", 92),
            self._row("3/8/26 18:00", 75),
            self._row("3/8/26 18:30", 73),
            self._row("3/8/26 19:00", 65),
            self._row("3/8/26 19:30", 30),
            self._row("3/8/26 20:00", 15),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_paid_hours=8,
            unpaid_lunch_hours=0.5,
            lunch_window_start_hours=3.5,
            lunch_window_end_hours=4.5,
            interval_duration_minutes=30,
        )

        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(len(body["agentSchedules"]), body["summary"]["optimizedShiftCount"])

        expected_planned = [0] * len(body["scheduleCoverage"])
        for agent in body["agentSchedules"]:
            shift_start = int(agent["shiftStartIndex"])
            shift_end = int(agent["shiftEndIndex"])
            for interval_index in range(shift_start, shift_end + 1):
                expected_planned[interval_index] += 1

            lunch_start = agent["lunchStartIndex"]
            lunch_end = agent["lunchEndIndex"]
            if lunch_start is not None and lunch_end is not None:
                self.assertGreaterEqual((lunch_start - shift_start) * 0.5, 3.5)
                self.assertLessEqual((lunch_start - shift_start) * 0.5, 4.5)
                for interval_index in range(int(lunch_start), int(lunch_end) + 1):
                    expected_planned[interval_index] -= 1

        planned_from_coverage = [
            int(round(float(row["plannedHeadcount"]))) for row in body["scheduleCoverage"]
        ]
        self.assertEqual(expected_planned, planned_from_coverage)


    def test_daily_plan_shift_volume_not_pathologically_over_scheduled(self) -> None:
        rows = [
            self._row("3/8/26 8:00", 82),
            self._row("3/8/26 8:30", 88),
            self._row("3/8/26 9:00", 95),
            self._row("3/8/26 9:30", 108),
            self._row("3/8/26 10:00", 124),
            self._row("3/8/26 10:30", 137),
            self._row("3/8/26 11:00", 149),
            self._row("3/8/26 11:30", 158),
            self._row("3/8/26 12:00", 166),
            self._row("3/8/26 12:30", 172),
            self._row("3/8/26 13:00", 176),
            self._row("3/8/26 13:30", 171),
            self._row("3/8/26 14:00", 165),
            self._row("3/8/26 14:30", 154),
            self._row("3/8/26 15:00", 147),
            self._row("3/8/26 15:30", 139),
            self._row("3/8/26 16:00", 128),
            self._row("3/8/26 16:30", 114),
            self._row("3/8/26 17:00", 101),
            self._row("3/8/26 17:30", 92),
            self._row("3/8/26 18:00", 75),
            self._row("3/8/26 18:30", 73),
            self._row("3/8/26 19:00", 65),
            self._row("3/8/26 19:30", 30),
            self._row("3/8/26 20:00", 15),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_paid_hours=8,
            unpaid_lunch_hours=0.5,
            interval_duration_minutes=30,
        )

        self.assertEqual(len(body["errors"]), 0)
        self.assertLess(body["summary"]["optimizedShiftCount"], 100)

    def test_daily_plan_shift_count_matches_required_daily_fte_target(self) -> None:
        rows = [
            self._row("3/8/26 8:00", 82),
            self._row("3/8/26 8:30", 88),
            self._row("3/8/26 9:00", 95),
            self._row("3/8/26 9:30", 108),
            self._row("3/8/26 10:00", 124),
            self._row("3/8/26 10:30", 137),
            self._row("3/8/26 11:00", 149),
            self._row("3/8/26 11:30", 158),
            self._row("3/8/26 12:00", 166),
            self._row("3/8/26 12:30", 172),
            self._row("3/8/26 13:00", 176),
            self._row("3/8/26 13:30", 171),
            self._row("3/8/26 14:00", 165),
            self._row("3/8/26 14:30", 154),
            self._row("3/8/26 15:00", 147),
            self._row("3/8/26 15:30", 139),
            self._row("3/8/26 16:00", 128),
            self._row("3/8/26 16:30", 114),
            self._row("3/8/26 17:00", 101),
            self._row("3/8/26 17:30", 92),
            self._row("3/8/26 18:00", 75),
            self._row("3/8/26 18:30", 73),
            self._row("3/8/26 19:00", 65),
            self._row("3/8/26 19:30", 30),
            self._row("3/8/26 20:00", 15),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_paid_hours=8,
            unpaid_lunch_hours=0.5,
            interval_duration_minutes=30,
        )

        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(
            int(body["summary"]["requiredDailyFte"]),
            int(body["summary"]["hoursBasedRequiredDailyFte"]),
        )
        self.assertEqual(
            int(body["summary"]["optimizedShiftCount"]),
            int(body["summary"]["requiredDailyFte"]),
        )
        self.assertEqual(int(body["summary"]["shiftFteDelta"]), 0)
        self.assertAlmostEqual(
            float(body["summary"]["plannedHeadcountHours"]),
            float(body["summary"]["plannedPaidHeadcountHours"]),
            places=6,
        )

    def test_daily_plan_schedule_coverage_sorted_for_non_iso_intervals(self) -> None:
        rows = [
            self._row("3/8/26 10:00", 120),
            self._row("3/8/26 8:00", 140),
            self._row("3/8/26 9:00", 130),
        ]

        body = process_daily_plan_rows(
            rows,
            shift_paid_hours=8,
            unpaid_lunch_hours=0.5,
        )

        self.assertEqual(len(body["errors"]), 0)
        self.assertEqual(
            [row["intervalStart"] for row in body["scheduleCoverage"]],
            ["3/8/26 8:00", "3/8/26 9:00", "3/8/26 10:00"],
        )

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
