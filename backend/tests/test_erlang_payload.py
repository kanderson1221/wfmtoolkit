from __future__ import annotations

import unittest

from backend.app.erlang import build_results_payload
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


if __name__ == "__main__":
    unittest.main()
