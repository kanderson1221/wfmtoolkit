import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = ROOT.parents[2]


class NativeReferenceIntegrityTests(unittest.TestCase):
    def test_frozen_sources_and_vectors(self):
        for line in (ROOT / "SOURCE_SHA256SUMS").read_text().splitlines():
            expected, relative = line.split(maxsplit=1)
            self.assertEqual(hashlib.sha256((ROOT / relative).read_bytes()).hexdigest(), expected, relative)

    def test_live_implementation_matches_numerical_contract(self):
        for source, snapshot in json.loads((ROOT / "source_map.json").read_text()).items():
            self.assertEqual((REPOSITORY / source).read_bytes(), (ROOT / snapshot).read_bytes(), source)

    def test_api_fixtures_match_versioned_contract(self):
        self.assertEqual(
            json.loads((REPOSITORY / "rust/server/tests/fixtures/python_contract.json").read_text()),
            json.loads((ROOT / "api_vectors.json").read_text()),
        )

    def test_original_reference_is_retained(self):
        legacy = ROOT.parent / "erlang"
        self.assertEqual((legacy / "VERSION").read_text().strip(), "1.0.0")
        for line in (legacy / "SOURCE_SHA256SUMS").read_text().splitlines():
            expected, relative = line.split(maxsplit=1)
            self.assertEqual(hashlib.sha256((legacy / relative).read_bytes()).hexdigest(), expected, relative)
