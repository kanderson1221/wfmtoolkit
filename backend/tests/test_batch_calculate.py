from __future__ import annotations

import math
import unittest

from backend.app.batch import process_batch_rows


class BatchCalculateTests(unittest.TestCase):
    def test_valid_batch_rows(self) -> None:
        rows = [
            {
                "queue_id": "sales",
                "interval_start": "2026-03-08T09:00:00Z",
                "calls_offered": 180,
                "aht_seconds": 240,
                "mean_patience_seconds": 180,
                "service_level_threshold": 80,
                "service_level_target_seconds": 20,
                "max_occupancy": 85,
                "shrinkage": 0.3,
            },
            {
                "queue_id": "support",
                "interval_start": "2026-03-08T09:30:00Z",
                "calls_offered": 150,
                "aht_seconds": 210,
                "mean_patience_seconds": 160,
                "service_level_threshold": 80,
                "service_level_target_seconds": 20,
                "max_occupancy": 85,
                "shrinkage": 0.25,
            },
        ]
        body = process_batch_rows(rows)
        self.assertEqual(body["summary"]["processedRows"], 2)
        self.assertEqual(body["summary"]["successfulRows"], 2)
        self.assertEqual(body["summary"]["failedRows"], 0)
        self.assertEqual(len(body["results"]), 2)
        self.assertEqual(len(body["errors"]), 0)

    def test_shrinkage_accepts_percent(self) -> None:
        rows = [
            {
                "queue_id": "sales",
                "interval_start": "2026-03-08T09:00:00Z",
                "calls_offered": 180,
                "aht_seconds": 240,
                "mean_patience_seconds": 180,
                "service_level_threshold": 80,
                "service_level_target_seconds": 20,
                "max_occupancy": 85,
                "shrinkage": 30,
            }
        ]
        body = process_batch_rows(rows)
        self.assertEqual(body["summary"]["successfulRows"], 1)
        self.assertEqual(len(body["errors"]), 0)
        result = body["results"][0]
        self.assertGreater(result["requiredStaffGross"], result["requiredStaffNet"])

    def test_mixed_valid_and_invalid_rows(self) -> None:
        rows = [
            {
                "queue_id": "sales",
                "interval_start": "2026-03-08T09:00:00Z",
                "calls_offered": 180,
                "aht_seconds": 240,
                "mean_patience_seconds": 180,
                "service_level_threshold": 80,
                "service_level_target_seconds": 20,
                "max_occupancy": 85,
            },
            {
                "queue_id": "support",
                "interval_start": "2026-03-08T09:30:00Z",
                "calls_offered": 150,
                "aht_seconds": 0,
                "mean_patience_seconds": 160,
                "service_level_threshold": 80,
                "service_level_target_seconds": 20,
                "max_occupancy": 85,
            },
        ]
        body = process_batch_rows(rows)
        self.assertEqual(body["summary"]["processedRows"], 2)
        self.assertEqual(body["summary"]["successfulRows"], 0)
        self.assertEqual(body["summary"]["failedRows"], 2)
        self.assertEqual(len(body["results"]), 0)
        self.assertGreaterEqual(len(body["errors"]), 2)

    def test_extreme_volume_stays_numeric(self) -> None:
        rows = [
            {
                "queue_id": "enterprise",
                "interval_start": "2026-03-08T10:00:00Z",
                "calls_offered": 5000,
                "aht_seconds": 360,
                "mean_patience_seconds": 180,
                "service_level_threshold": 80,
                "service_level_target_seconds": 40,
                "max_occupancy": 85,
            }
        ]
        body = process_batch_rows(rows)
        self.assertEqual(body["summary"]["successfulRows"], 1)
        row = body["results"][0]

        self.assertFalse(math.isnan(row["serviceLevel"]))
        self.assertFalse(math.isnan(row["percentAnsweredImmediately"]))
        self.assertFalse(math.isnan(row["expectedOccupancy"]))
        self.assertFalse(math.isnan(row["abandonPercent"]))
        if row["asaSeconds"] is not None:
            self.assertFalse(math.isnan(row["asaSeconds"]))


if __name__ == "__main__":
    unittest.main()
