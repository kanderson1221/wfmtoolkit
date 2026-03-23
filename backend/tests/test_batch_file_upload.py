from __future__ import annotations

import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.responses import FileResponse

from backend.app import batch, main


class FakeRequest:
    def __init__(self, body: bytes, headers: dict[str, str] | None = None) -> None:
        self._body = body
        self.headers = headers or {}

    async def stream(self):
        yield self._body
        yield b""


class BatchFileUploadTests(unittest.TestCase):
    def _csv_text(self, rows: list[dict[str, str | int | float]]) -> str:
        headers = [
            "queue_id",
            "interval_start",
            "calls_offered",
            "aht_seconds",
            "mean_patience_seconds",
            "service_level_threshold",
            "service_level_target_seconds",
            "max_occupancy",
            "shrinkage",
        ]
        lines = [",".join(headers)]
        for row in rows:
            lines.append(",".join(str(row.get(header, "")) for header in headers))
        return "\n".join(lines) + "\n"

    def _upload(self, csv_text: str, filename: str = "sample.csv") -> dict[str, object]:
        body = csv_text.encode("utf-8")
        request = FakeRequest(
            body,
            headers={
                "content-type": "text/csv",
                "content-length": str(len(body)),
                "x-upload-filename": filename,
            },
        )
        return asyncio.run(main.file_processor_upload(request))

    def test_valid_upload_returns_summary_and_enriched_download(self) -> None:
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
                "shrinkage": 25,
            },
        ]

        with tempfile.TemporaryDirectory() as tmpdir, patch.object(
            batch,
            "DOWNLOAD_STORAGE_DIR",
            Path(tmpdir),
        ):
            body = self._upload(self._csv_text(rows), filename="large_upload.csv")
            self.assertEqual(body["processedRows"], 2)
            self.assertEqual(body["successfulRows"], 2)
            self.assertEqual(body["failedRows"], 0)
            self.assertEqual(body["errorCount"], 0)
            self.assertIn("enrichedFile", body["downloads"])
            self.assertAlmostEqual(body["summary"]["totalCallsOffered"], 330.0)

            download_info = body["downloads"]["enrichedFile"]
            artifact = batch.get_download_artifact(download_info["fileId"])
            self.assertEqual(download_info["fileName"], "large_upload_enriched.csv")
            self.assertIn("Required Agents", Path(artifact["path"]).read_text())
            self.assertIn("sales", Path(artifact["path"]).read_text())

            download_response = main.file_processor_download(download_info["fileId"])
            self.assertIsInstance(download_response, FileResponse)
            self.assertTrue(Path(download_response.path).exists())

    def test_invalid_rows_return_error_preview_and_error_report_download(self) -> None:
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
                "shrinkage": 25,
            },
        ]

        with tempfile.TemporaryDirectory() as tmpdir, patch.object(
            batch,
            "DOWNLOAD_STORAGE_DIR",
            Path(tmpdir),
        ):
            body = self._upload(self._csv_text(rows), filename="invalid.csv")
            self.assertEqual(body["processedRows"], 2)
            self.assertEqual(body["successfulRows"], 1)
            self.assertEqual(body["failedRows"], 1)
            self.assertEqual(body["errorCount"], 1)
            self.assertEqual(len(body["errorsPreview"]), 1)
            self.assertIn("errorReport", body["downloads"])
            self.assertNotIn("enrichedFile", body["downloads"])

            error_info = body["downloads"]["errorReport"]
            error_report = Path(batch.get_download_artifact(error_info["fileId"])["path"]).read_text()
            self.assertIn("row_index,message", error_report)
            self.assertIn("support", error_report)

    def test_row_limit_is_enforced(self) -> None:
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
                "shrinkage": 25,
            },
        ]

        with tempfile.TemporaryDirectory() as tmpdir, patch.object(
            batch,
            "DOWNLOAD_STORAGE_DIR",
            Path(tmpdir),
        ), patch.object(batch, "MAX_UPLOAD_ROWS", 1):
            with self.assertRaises(HTTPException) as raised:
                self._upload(self._csv_text(rows), filename="too_many_rows.csv")
            self.assertEqual(raised.exception.status_code, 422)
            self.assertIn("maximum supported row count", raised.exception.detail)

    def test_file_size_limit_is_enforced(self) -> None:
        csv_text = self._csv_text(
            [
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
        )

        with patch.object(main, "MAX_UPLOAD_BYTES", 10):
            with self.assertRaises(HTTPException) as raised:
                self._upload(csv_text, filename="too_large.csv")
            self.assertEqual(raised.exception.status_code, 413)
            self.assertIn("50 MB upload limit", raised.exception.detail)

    def test_download_returns_404_after_expiry(self) -> None:
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

        with tempfile.TemporaryDirectory() as tmpdir, patch.object(
            batch,
            "DOWNLOAD_STORAGE_DIR",
            Path(tmpdir),
        ), patch.object(batch, "FILE_DOWNLOAD_TTL_SECONDS", -1):
            body = self._upload(self._csv_text(rows), filename="expired.csv")
            file_id = body["downloads"]["enrichedFile"]["fileId"]

            with self.assertRaises(HTTPException) as raised:
                main.file_processor_download(file_id)
            self.assertEqual(raised.exception.status_code, 404)
            self.assertIn("expired", raised.exception.detail)

    def test_upload_summary_matches_existing_row_processor_math(self) -> None:
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
                "shrinkage": 25,
            },
        ]

        with tempfile.TemporaryDirectory() as tmpdir, patch.object(
            batch,
            "DOWNLOAD_STORAGE_DIR",
            Path(tmpdir),
        ):
            upload_summary = self._upload(self._csv_text(rows), filename="compare.csv")["summary"]

        legacy_summary = batch.process_file_processor_rows(rows)["summary"]
        self.assertAlmostEqual(upload_summary["avgServiceLevel"], legacy_summary["avgServiceLevel"])
        self.assertAlmostEqual(upload_summary["avgAsaSeconds"], legacy_summary["avgAsaSeconds"])
        self.assertAlmostEqual(
            upload_summary["totalRequiredStaffHoursGross"],
            legacy_summary["totalRequiredStaffHoursGross"],
        )
        self.assertEqual(upload_summary["peakStaffGross"], legacy_summary["peakStaffGross"])


if __name__ == "__main__":
    unittest.main()
