# Python vs Rust calculation speed — 2026-10-02

Compared the current standalone Rust library with the original application engine in `backend/app/erlang.py` at the time of measurement (now retired; the historical Python engine is preserved in `specs/reference-implementations/erlang/reference_erlang/erlang.py`).

## Method

- Single-threaded local run on Apple arm64 / macOS 26.6.2, CPython 3.14.3 and Rust 1.99.0.
- Rust compiled in release-equivalent mode (`opt-level=3`, thin LTO); one solver reused across rows. No result cache.
- Each workload contains 12 varying inputs. Interval lengths, handle times, patience, service targets and occupancy caps vary. Fixed staffing includes below-load, at-load and above-load scenarios.
- Five timed rounds after warm-up. Each language repeats the same 12-row sequence; repetition counts are independently calibrated to at least 50 ms per round. Values below are the median time per calculated row.
- Rust uses `black_box` to retain the calculations and their complete results. Python results are calculated and discarded in an ordinary loop.
- Timings include calculation/validation and numerical-buffer work. Compilation, process startup, parsing, serialization, database access and network access are excluded.
- Python search uses `staff_for_interval`; fixed staffing uses `staffing_metrics_for_agents`; abandonment-only uses `_erlang_a_abandon_prob` with the original arrival/service/patience rate helpers. Rust uses the corresponding `Solver` methods.
- Runs are sequential so Python and Rust do not compete with each other during measurement.

## Results

| Workload | Python µs/row | Rust µs/row | Speedup |
| --- | ---: | ---: | ---: |
| C staffing, load 2–20 | 54.169 | 0.273 | 198.3× |
| A staffing, load 2–20 | 21,438.677 | 3.009 | 7,126.0× |
| C fixed staffing, load 2–20 | 9.147 | 0.139 | 66.0× |
| A fixed staffing, load 2–20 | 2,689.481 | 0.654 | 4,111.4× |
| Abandonment only, load 2–20 | 8.031 | 0.121 | 66.6× |
| C staffing, load 20–60 | 119.323 | 1.193 | 100.0× |
| A staffing, load 20–60 | 88,932.000 | 5.461 | 16,286.1× |

The large Erlang A gains include an algorithm change: Rust evaluates the analytic waiting distribution instead of Python’s RK4 time-stepping solver, and avoids unneeded work during staffing searches. These results are not a language-only comparison.

## Accuracy checks

All 84 operation/input cases passed. Required staffing matched exactly. Across finite values, maximum absolute differences were:

- `required_staff`: `0`
- `service_level`: `1.99918e-12`
- `occupancy`: `4.88498e-15`
- `average_speed_of_answer_seconds`: `1.98952e-12`
- `percent_answered_immediately`: `8.32667e-15`
- `abandon_percent`: `7.70911e-15`

Acceptance used exact equality for required staffing and `rel_tol=2e-10`, with absolute tolerance `2e-8` for service level and `2e-10` for other metrics. Identical infinite ASA values in unstable C scenarios are accepted. Actual discrepancies were much smaller than those limits.

## Scope

These are measured synthetic workloads, not an end-to-end application benchmark or a runtime guarantee for every dataset. Offered loads were limited to the stated ranges where the original Python calculation supplies valid comparison results; the known high-load Python overflow behavior was not counted as a speed win.

Raw per-round timings, repetition counts, all inputs, toolchain versions and source SHA-256 hashes are saved in [python-vs-rust-2026-10-02.json](python-vs-rust-2026-10-02.json). The calculation engines were not modified by this test.
