from __future__ import annotations

import unittest

from backend.app.batch import process_file_processor_rows


class BatchWorkflowTests(unittest.TestCase):
    def _row(
        self, interval_start: str, calls_offered: float = 120, **overrides: float | str
    ) -> dict[str, float | str]:
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
        self.assertEqual(
            export_headers[0:8],
            [
                "queue_id",
                "interval_start",
                "calls_offered",
                "aht_seconds",
                "mean_patience_seconds",
                "service_level_threshold",
                "service_level_target_seconds",
                "max_occupancy",
            ],
        )
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


if __name__ == "__main__":
    unittest.main()
