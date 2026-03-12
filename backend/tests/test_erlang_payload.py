from __future__ import annotations

import unittest

from backend.app.erlang import build_results_payload, staff_for_interval
from backend.app.models import StaffingInput


class ErlangPayloadTests(unittest.TestCase):
    def setUp(self) -> None:
        self.inputs = StaffingInput(
            calls_offered=25,
            interval_duration_seconds=30 * 60,
            avg_handle_time_seconds=360,
            target_service_level=0.80,
            service_level_answer_time_seconds=40,
            max_occupancy=0.85,
            avg_caller_patience_seconds=180,
        )

    def test_payload_includes_shrinkage_headcount(self) -> None:
        payload = build_results_payload(self.inputs, 0.30)
        summary = payload["summary"]

        self.assertEqual(
            list(summary.keys()),
            [
                "requiredAgents",
                "requiredHeadcount",
                "serviceLevel",
                "expectedAsa",
                "percentAnsweredImmediately",
                "estimatedOccupancy",
                "abandonPercent",
            ],
        )

        required_agents = int(summary["requiredAgents"])
        required_headcount = int(summary["requiredHeadcount"])
        self.assertGreaterEqual(required_headcount, required_agents)

        recommended_scenario = next(row for row in payload["scenarios"] if row["isRecommended"])
        self.assertEqual(
            list(recommended_scenario.keys()),
            [
                "agents",
                "requiredHeadcount",
                "serviceLevel",
                "asa",
                "percentAnsweredImmediately",
                "expectedOccupancy",
                "abandonment",
                "isRecommended",
            ],
        )
        self.assertEqual(int(recommended_scenario["agents"]), required_agents)
        self.assertEqual(int(recommended_scenario["requiredHeadcount"]), required_headcount)

    def test_invalid_shrinkage_raises(self) -> None:
        with self.assertRaises(ValueError):
            build_results_payload(self.inputs, 1.0)

    def test_payload_supports_erlang_a_model(self) -> None:
        payload = build_results_payload(self.inputs, 0.30, model="erlang_a")
        summary = payload["summary"]

        self.assertGreaterEqual(int(summary["requiredAgents"]), 1)
        self.assertEqual(len(payload["scenarios"]), 7)
        self.assertTrue(any(row["isRecommended"] for row in payload["scenarios"]))

    def test_higher_service_goal_requires_more_erlang_a_staff(self) -> None:
        baseline = self.inputs
        stricter = StaffingInput(
            calls_offered=baseline.calls_offered,
            interval_duration_seconds=baseline.interval_duration_seconds,
            avg_handle_time_seconds=baseline.avg_handle_time_seconds,
            target_service_level=0.90,
            service_level_answer_time_seconds=baseline.service_level_answer_time_seconds,
            max_occupancy=baseline.max_occupancy,
            avg_caller_patience_seconds=baseline.avg_caller_patience_seconds,
        )

        baseline_staff = staff_for_interval(baseline, model="erlang_a")["required_staff"]
        stricter_staff = staff_for_interval(stricter, model="erlang_a")["required_staff"]
        self.assertGreaterEqual(stricter_staff, baseline_staff)

    def test_invalid_model_raises(self) -> None:
        with self.assertRaises(ValueError):
            build_results_payload(self.inputs, 0.30, model="invalid-model")


if __name__ == "__main__":
    unittest.main()
