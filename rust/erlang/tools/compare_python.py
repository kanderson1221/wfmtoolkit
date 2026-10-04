#!/usr/bin/env python3
"""Compare the isolated Rust implementation with the pinned Python reference.

Run from any directory:
    python3 rust/erlang/tools/compare_python.py [--cargo /path/to/cargo]

Uses only the Python standard library and the crate's own CSV example. Cargo's
release build happens before the Rust per-operation timers start. The timing
summary excludes process startup, parsing, serialization, and compilation; it
is a local diagnostic rather than a reproducible performance guarantee.

Python's RK4 service-level calculation has discretization error. Absolute
service-level tolerance is 2e-8 here (1e-12 for the pinned vectors in Rust tests).
Other metrics use a tighter tolerance; differing staffing counts always fail.
High-load numerical cases are tested analytically in Rust because Python's raw
stationary probabilities can overflow and cannot supply a trustworthy oracle.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cargo", default=os.environ.get("CARGO", "cargo"))
    args = parser.parse_args()

    crate = Path(__file__).resolve().parents[1]
    repository = crate.parents[1]
    reference = repository / "specs/reference-implementations/erlang"
    sys.path.insert(0, str(reference))
    from reference_erlang.erlang import (  # pylint: disable=import-outside-toplevel
        _metrics_for_agents,
        staff_for_interval,
    )
    from reference_erlang.models import StaffingInput

    vectors = json.loads((reference / "test_vectors.json").read_text())["staffingCases"]
    cases = [(case["name"], case["model"], case["input"], None) for case in vectors]
    for case in (vectors[0], vectors[3]):
        for model in ("erlang_c", "erlang_a"):
            for agents in (2, case["expected"]["required_staff"], 30):
                cases.append((f"{case['name']}_{model}_{agents}_agents", model, case["input"], agents))

    field_names = (
        "calls_offered",
        "interval_duration_seconds",
        "avg_handle_time_seconds",
        "target_service_level",
        "service_level_answer_time_seconds",
        "max_occupancy",
        "avg_caller_patience_seconds",
    )
    requests = io.StringIO()
    writer = csv.writer(requests)
    for _, model, inputs, agents in cases:
        writer.writerow([model, *(inputs[field] for field in field_names), "auto" if agents is None else agents])
    try:
        completed = subprocess.run(
            [args.cargo, "run", "--quiet", "--release", "--offline", "--manifest-path", str(crate / "Cargo.toml"), "--example", "metrics_csv"],
            input=requests.getvalue(),
            capture_output=True,
            text=True,
            check=True,
        )
    except FileNotFoundError:
        parser.error("Cargo was not found; install Rust or pass --cargo /path/to/cargo")
    except subprocess.CalledProcessError as error:
        print(error.stderr, file=sys.stderr)
        return 1
    rust_results = list(csv.DictReader(io.StringIO(completed.stdout)))
    if len(rust_results) != len(cases):
        raise RuntimeError(f"expected {len(cases)} Rust results, received {len(rust_results)}")

    timings = {model: [0.0, 0.0, 0] for model in ("erlang_c", "erlang_a")}
    maximum_errors: dict[str, float] = {}
    failures = []
    for (name, model, inputs, agents), rust in zip(cases, rust_results):
        input_object = StaffingInput(**inputs)
        started = time.perf_counter()
        python = (
            staff_for_interval(input_object, model)
            if agents is None
            else _metrics_for_agents(input_object, agents, model)
        )
        python_seconds = time.perf_counter() - started
        timings[model][0] += python_seconds
        timings[model][1] += int(rust["elapsed_ns"]) / 1e9
        timings[model][2] += 1
        for field, expected in python.items():
            actual = float(rust[field])
            if field == "required_staff":
                matches = actual == expected
            else:
                tolerance = 2e-8 if field == "service_level" else 2e-10
                matches = math.isclose(actual, expected, rel_tol=2e-10, abs_tol=tolerance)
                if math.isfinite(actual) and math.isfinite(expected):
                    maximum_errors[field] = max(maximum_errors.get(field, 0.0), abs(actual - expected))
            if not matches:
                failures.append(f"{name}: {field}: Rust {actual:.17g}, Python {expected:.17g}")

    for failure in failures:
        print(f"FAIL {failure}")
    print(f"Compared {len(cases)} cases; {len(failures)} mismatched fields.")
    print("Maximum absolute errors:")
    for field, error in maximum_errors.items():
        print(f"  {field}: {error:.3g}")
    print("Local calculation timings (compilation/startup/serialization excluded):")
    for model, (python_seconds, rust_seconds, count) in timings.items():
        print(
            f"  {model}: {int(count)} cases, Python {python_seconds * 1000:.3f} ms, "
            f"Rust {rust_seconds * 1000:.3f} ms, ratio {python_seconds / rust_seconds:.1f}x"
        )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
