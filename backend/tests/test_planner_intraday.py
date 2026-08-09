from __future__ import annotations

import unittest

from backend.app.planner import plan_intraday_monthly_rows


class PlannerIntradayMinimumHeadcountTests(unittest.TestCase):
    def build_row(self, **overrides: float | int | str) -> dict[str, float | int | str]:
        row: dict[str, float | int | str] = {
            "month_index": 0,
            "service_date": "2026-01-02",
            "interval_start": "2026-01-02T00:00:00",
            "calls_offered": 0,
            "average_handle_time_seconds": 300,
            "interval_duration_seconds": 30 * 60,
            "service_level_goal": 0.80,
            "service_level_threshold_seconds": 20,
            "max_occupancy": 0.85,
            "mean_patience_seconds": 60,
            "minimum_headcount": 3,
        }
        row.update(overrides)
        return row

    def test_floor_applies_to_an_open_zero_volume_interval_and_rollups(self) -> None:
        result = plan_intraday_monthly_rows([self.build_row()])

        interval = result["intervalPlans"][0]
        self.assertEqual(interval["erlangRequiredStaffNet"], 0)
        self.assertEqual(interval["minimumHeadcount"], 3)
        self.assertEqual(interval["requiredStaffNet"], 3)
        self.assertTrue(interval["minimumApplied"])
        self.assertEqual(interval["laborHoursNet"], 1.5)
        self.assertEqual(interval["serviceLevel"], 1.0)
        self.assertEqual(interval["occupancy"], 0.0)

        daily = result["dailyPlans"][0]
        self.assertEqual(daily["totalLaborHoursNet"], 1.5)
        self.assertEqual(daily["peakStaffNet"], 3)

        monthly = result["monthlyPlans"][0]
        self.assertEqual(monthly["erlangStaffedHours"], 1.5)
        self.assertEqual(monthly["peakIntervalRequiredHeadcount"], 3)
        self.assertEqual(monthly["minimumHeadcount"], 3)
        self.assertEqual(monthly["minimumAppliedIntervalCount"], 1)

    def test_floor_does_not_reduce_the_erlang_requirement(self) -> None:
        without_floor = plan_intraday_monthly_rows(
            [self.build_row(calls_offered=100, minimum_headcount=0)]
        )["intervalPlans"][0]
        with_floor = plan_intraday_monthly_rows(
            [self.build_row(calls_offered=100, minimum_headcount=1)]
        )["intervalPlans"][0]

        self.assertGreater(without_floor["requiredStaffNet"], 1)
        self.assertEqual(with_floor["erlangRequiredStaffNet"], without_floor["requiredStaffNet"])
        self.assertEqual(with_floor["requiredStaffNet"], without_floor["requiredStaffNet"])
        self.assertFalse(with_floor["minimumApplied"])
        self.assertEqual(with_floor["serviceLevel"], without_floor["serviceLevel"])
        self.assertEqual(with_floor["occupancy"], without_floor["occupancy"])

    def test_negative_floor_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "minimum_headcount must be a whole number >= 0"):
            plan_intraday_monthly_rows([self.build_row(minimum_headcount=-1)])

    def test_fractional_or_inconsistent_floors_are_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "minimum_headcount must be a whole number >= 0"):
            plan_intraday_monthly_rows([self.build_row(minimum_headcount=1.5)])

        with self.assertRaisesRegex(ValueError, "minimum_headcount must be consistent"):
            plan_intraday_monthly_rows(
                [
                    self.build_row(minimum_headcount=2),
                    self.build_row(
                        interval_start="2026-01-02T00:30:00",
                        minimum_headcount=3,
                    ),
                ]
            )


if __name__ == "__main__":
    unittest.main()
