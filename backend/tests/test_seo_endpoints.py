from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.responses import FileResponse, PlainTextResponse, Response

from backend.app import main


class FakeRequest:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url


class SeoEndpointTests(unittest.TestCase):
    def test_robots_includes_live_sitemap_url(self) -> None:
        response = main.robots(FakeRequest("https://example.com/"))

        self.assertIsInstance(response, PlainTextResponse)
        self.assertIn("User-agent: *", response.body.decode("utf-8"))
        self.assertIn(
            f"Sitemap: {main.CANONICAL_BASE_URL}/sitemap.xml",
            response.body.decode("utf-8"),
        )

    def test_sitemap_lists_crawlable_pages(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir, patch.object(main, "DIST_DIR", Path(tmpdir)):
            Path(tmpdir, "index.html").write_text("<html></html>", encoding="utf-8")
            Path(tmpdir, "planning-workspace").mkdir()
            Path(tmpdir, "planning-workspace", "index.html").write_text("<html></html>", encoding="utf-8")
            Path(tmpdir, "erlang-tools").mkdir()
            Path(tmpdir, "erlang-tools", "index.html").write_text("<html></html>", encoding="utf-8")
            Path(tmpdir, "terms").mkdir()
            Path(tmpdir, "terms", "index.html").write_text("<html></html>", encoding="utf-8")

            response = main.sitemap(FakeRequest("https://example.com/"))

        self.assertIsInstance(response, Response)
        body = response.body.decode("utf-8")
        self.assertIn(f"<loc>{main.CANONICAL_BASE_URL}/</loc>", body)
        self.assertIn(f"<loc>{main.CANONICAL_BASE_URL}/planning-workspace/</loc>", body)
        self.assertIn(f"<loc>{main.CANONICAL_BASE_URL}/erlang-tools/</loc>", body)
        self.assertIn(f"<loc>{main.CANONICAL_BASE_URL}/terms/</loc>", body)

    def test_directory_index_is_served_before_spa_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir, patch.object(main, "DIST_DIR", Path(tmpdir)):
            Path(tmpdir, "index.html").write_text("<html>spa</html>", encoding="utf-8")
            Path(tmpdir, "planning-workspace").mkdir()
            directory_index = Path(tmpdir, "planning-workspace", "index.html")
            directory_index.write_text("<html>planning</html>", encoding="utf-8")

            response = main.serve_frontend("planning-workspace")

        self.assertIsInstance(response, FileResponse)
        self.assertEqual(Path(response.path).resolve(), directory_index.resolve())
