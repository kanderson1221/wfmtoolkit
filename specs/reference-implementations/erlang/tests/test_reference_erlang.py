from __future__ import annotations

import hashlib
import json
import math
import sys
import unittest
from pathlib import Path
from typing import Any

REFERENCE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REFERENCE_ROOT))

from reference_erlang import StaffingInput, plan_intraday_monthly_rows, staff_for_interval


class ErlangReferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        vector_path = REFERENCE_ROOT / "test_vectors.json"
        cls.vectors = json.loads(vector_path.read_text(encoding="utf-8"))

    def assert_conformant(self, actual: Any, expected: Any, path: str = "result") -> None:
        if isinstance(expected, dict):
            self.assertIsInstance(actual, dict, path)
            self.assertEqual(set(actual), set(expected), path)
            for key, value in expected.items():
                self.assert_conformant(actual[key], value, f"{path}.{key}")
            return

        if isinstance(expected, list):
            self.assertIsInstance(actual, list, path)
            self.assertEqual(len(actual), len(expected), path)
            for index, value in enumerate(expected):
                self.assert_conformant(actual[index], value, f"{path}[{index}]")
            return

        if isinstance(expected, float):
            self.assertIsInstance(actual, (int, float), path)
            self.assertTrue(
                math.isclose(float(actual), expected, rel_tol=1e-12, abs_tol=1e-12),
                f"{path}: expected {expected!r}, got {actual!r}",
            )
            return

        self.assertEqual(actual, expected, path)

    def test_source_snapshots_match_declared_hashes(self) -> None:
        checksum_path = REFERENCE_ROOT / "SOURCE_SHA256SUMS"
        for line in checksum_path.read_text(encoding="utf-8").splitlines():
            expected_hash, relative_path = line.split(maxsplit=1)
            source_path = REFERENCE_ROOT / relative_path
            actual_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
            self.assertEqual(actual_hash, expected_hash, relative_path)

    def test_staffing_vectors_conform(self) -> None:
        for case in self.vectors["staffingCases"]:
            with self.subTest(case=case["name"]):
                inputs = StaffingInput(**case["input"])
                actual = staff_for_interval(inputs, model=case["model"])
                self.assert_conformant(actual, case["expected"])

    def test_monthly_planning_vector_conforms(self) -> None:
        case = self.vectors["planningCase"]
        actual = plan_intraday_monthly_rows(case["rows"])
        self.assert_conformant(actual, case["expected"])

    def test_planning_adapter_uses_erlang_c(self) -> None:
        case = self.vectors["planningCase"]
        first_row = case["rows"][0]
        direct_result = staff_for_interval(
            StaffingInput(
                calls_offered=first_row["calls_offered"],
                interval_duration_seconds=first_row["interval_duration_seconds"],
                avg_handle_time_seconds=first_row["average_handle_time_seconds"],
                target_service_level=first_row["service_level_goal"],
                service_level_answer_time_seconds=first_row[
                    "service_level_threshold_seconds"
                ],
                max_occupancy=first_row["max_occupancy"],
                avg_caller_patience_seconds=first_row["mean_patience_seconds"],
            ),
            model="erlang_c",
        )
        planned = plan_intraday_monthly_rows([first_row])["intervalPlans"][0]
        self.assertEqual(planned["requiredStaffNet"], direct_result["required_staff"])


if __name__ == "__main__":
    unittest.main()
