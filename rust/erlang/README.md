# Rust Erlang engine

Version `0.1.0` of the Erlang C/A engine. This is a self-contained,
dependency-free Rust library called directly by the native API in
[`../server`](../server/README.md). The library has no HTTP, Python, or UI
dependencies. The legacy Python implementation remains available for regression
comparisons; production calculation routes use Rust.

## Use and verification

The core requires Rust 1.85 or newer; the application workspace pins Rust 1.99
for its server dependencies. From the repository root:

```sh
cargo test --manifest-path rust/erlang/Cargo.toml --offline
cargo test --manifest-path rust/erlang/Cargo.toml --offline --release
cargo fmt --manifest-path rust/erlang/Cargo.toml --check
cargo clippy --manifest-path rust/erlang/Cargo.toml --all-targets --offline -- -D warnings
cargo doc --manifest-path rust/erlang/Cargo.toml --no-deps --offline
python3 rust/erlang/tools/compare_python.py
cargo run --manifest-path rust/erlang/Cargo.toml --release --offline --example benchmark -- 1000
cargo run --manifest-path rust/erlang/Cargo.toml --release --offline --example dataset
```

The Python comparison helper uses only the standard library and the frozen
reference implementation. Its CSV example is a manually invoked diagnostic,
not an application endpoint. Compilation and process startup are excluded from
its calculation timings. Benchmark timings are machine dependent.

```rust
use wfm_erlang::{Model, Solver, StaffingInput};

fn main() -> Result<(), wfm_erlang::Error> {
    let input = StaffingInput {
        calls_offered: 25.0,
        interval_duration_seconds: 1800.0,
        avg_handle_time_seconds: 360.0,
        target_service_level: 0.8,
        service_level_answer_time_seconds: 40.0,
        max_occupancy: 0.85,
        avg_caller_patience_seconds: 180.0,
    };
    let mut solver = Solver::default(); // Reuse for a batch; one solver per worker.
    let c = solver.staff_for_interval(&input, Model::ErlangC)?;
    let a = solver.staff_for_interval(&input, Model::ErlangA)?;
    assert_eq!(c.required_staff, 8);
    assert_eq!(a.required_staff, 7);
    Ok(())
}
```

Top-level `staff_for_interval` and `staffing_metrics_for_agents` convenience
functions construct a default solver. The latter evaluates a supplied staffing
level. `build_results_payload` returns typed display strings and surrounding
±3 scenarios; it uses Rust field names and deliberately provides no JSON
serialization. `apply_shrinkage` calculates gross headcount.

## Processing supplied dataset rows

Use an ordinary loop with one solver. Given already loaded rows containing an
identifier, input, and model:

```rust
let mut solver = Solver::default();
let mut results = Vec::with_capacity(rows.len());
for row in rows {
    results.push((row.id, solver.staff_for_interval(&row.input, row.model)));
}
```

Each row retains its numeric result or error, in input order; an invalid row does
not stop later rows. There is no calendar, fixed row count, or fixed interval
duration assumption. `examples/dataset.rs` is a complete executable example with
mixed models/durations and one clearly labeled invalid demonstration row. Replace
its sample vector with rows from your data source. It adds no streaming, worker
pool, or data-source dependency to the library.

For supplied staffing, call
`solver.staffing_metrics_for_agents(&row.input, agents, row.model)` in the same
loop. When only abandonment is needed, call
`solver.abandonment_for_agents(&row.input, agents)`: it returns the unrounded
Erlang A abandonment fraction used by both models, without calculating service
level, ASA, or a staffing recommendation. The full `StaffingInput` is still
validated consistently. A top-level `abandonment_for_agents` convenience
function is also available; reuse the solver method when processing many rows.

The solver retains all three numerical vectors (stationary weights, waiting
CDFs, and waiting probability masses). Repeated calculations fitting within
their capacities reuse those allocations. Each calculation resets the relevant
buffer contents, including after a failed row. To release retained memory while
keeping solver settings, call `solver.release_buffers()` between datasets or
after an unusually large row. Dropping the solver also releases its buffers.
Keep the buffers during the ordinary loop to avoid repeated allocation.

Keep `StaffingMetrics` numeric in dataset results. `build_results_payload` is a
display adapter that calculates surrounding scenarios and formats strings;
those extra outputs are usually unnecessary when processing a dataset.

## Metric definitions

- Inputs use seconds and fractions in `[0, 1]`, not percentages. Staffing search
  requires positive target service level and maximum occupancy.
- Erlang C uses an M/M/s queue without abandonment for service level, occupancy,
  ASA, and immediate-answer probability. **Its abandonment output intentionally
  comes from a separate Erlang A calculation at the same demand, staffing,
  handle time, and caller patience.** That estimate does not affect C staffing.
- Erlang A uses an M/M/s+M queue with exponential caller patience. Service level
  is the fraction of all offered calls answered by the threshold. Abandoned
  calls remain in that denominator. ASA is the mean wait among answered calls,
  including calls answered immediately.
- Positive-demand C scenarios at or above capacity have zero service level,
  zero immediate-answer probability, and infinite ASA. Their occupancy may
  exceed 100%. A positive-demand zero-agent scenario has occupancy 100%,
  abandonment 100%, and infinite ASA, matching the existing convention.
- Zero demand produces 100% service level/immediate answers and zero occupancy,
  abandonment, and ASA. Automatic staffing is zero; explicit staffing is retained.
- Shrinkage affects gross headcount only: `ceil(net / (1 - shrinkage))`.
  Display percentages and ASA buckets match the Python adapter's conventions.

## Numerical improvements

1. **Overflow-safe stationary probabilities.** A's birth/death recurrence begins
   at the distribution's mode, with weight one, and expands in both directions.
   This avoids the enormous unnormalized `p[n]/p[0]` terms in Python. Compensated
   sums retain small contributions. A geometric upper-tail bound controls
   truncation; reaching a resource limit returns an error instead of silently
   normalizing an incomplete distribution. Rate ratios are scaled if their
   intermediate products overflow.
2. **Analytic waiting-time distribution.** For service capacity `c=s*mu`, patience
   rate `theta`, and queue position `j>=1`, eventual service probability is
   `c/(c+j*theta)`. Conditioned on service, wait is the sum of independent
   exponentials with rates `c+theta, ..., c+j*theta`. Its CDF is
   `I_(1-exp(-theta*t))(j, 1+c/theta)`, a negative-binomial survival probability.
   Log probabilities, compensated summation, and positive upper-tail summation
   replace the RK4 grid and its repeated allocations. `expm1` preserves small
   time thresholds. See the [NIST incomplete-beta recurrence](https://dlmf.nist.gov/8.17.E20).
3. **Cheaper minimum-staff search.** Necessary throughput/occupancy bounds narrow
   the search. Exponential bracketing and binary search evaluate each trial
   once, include the configured maximum, and retain the best feasible staffing.
   Trials check occupancy first, then service level only if occupancy passes.
   ASA and abandonment are calculated only for the final recommendation;
   A's trials reuse the same service-level calculation as the full metric path.
   C computes A abandonment only after finding its staffing level. Very long
   patience can exceed the state limit at an infeasible trial; a conservative
   Erlang B loss-system occupancy bound can prove that trial infeasible without
   enumerating its queue. If that proof is unavailable, the resource error is
   preserved instead of claiming an unverified minimum.
4. **Explicit API contracts.** Typed models/results, consistent finite-input
   validation, checked headcount conversion, structured errors, bounded work,
   and no unsafe code or third-party dependencies. Reusing `Solver` retains its
   stationary-distribution and waiting-time allocations between calculations.

Stationary distribution construction is linear in the represented state count.
Waiting CDFs are linear in queue positions plus the bounded extra upper tail,
instead of RK4's state-count × time-step work. Erlang C's recurrence is linear
in agent count; staffing search uses logarithmically many trials.

## Bounds and intentional differences

The default solver permits 100,000 agents and 1,000,000 stationary states, with
an omitted stationary probability-mass bound of `1e-14` relative to represented
mass. `SolverLimits` can change these within the documented API bounds. The
waiting-time calculation independently permits up to 1,000,000 queue positions
and 1,000,000 additional tail terms, with a relative tail bound of `2e-15`.
These bounds control truncation, not all floating-point error or relative error
in arbitrarily tiny probabilities. Extreme inputs may return `StateLimit` or
`NumericalFailure` rather than a plausible but unreliable result.

This port follows the existing models and metric definitions, with deliberate
corrections to numerical behavior:

- A's analytic solver removes RK4 discretization error. It need not reproduce
  Python's integration or overflow artifacts bit for bit. All five supplied
  staffing cases satisfy the reference's `1e-12` absolute/relative tolerance;
  broader Python comparisons allow RK4 error. Independent closed-form and
  high-precision tests check the Rust calculation separately.
- C stability is determined by `agents > offered_load`, rather than an absolute
  `1e-9` cutoff on departure rate. This preserves results under changes in time
  scale and correctly handles stable systems very close to capacity.
- All public calculation entry points reject invalid/non-finite inputs,
  including invalid targets on fixed-staff calculations. Unrepresentable
  derived ratios produce an error. The original Python fixed-staff helper did
  not validate all these fields consistently.
- Shrinkage retains Python floating-point division and ceiling for ordinary
  inputs. With nonzero shrinkage, net/gross values beyond the exact `f64`
  integer range (`2^53`) are rejected; integer overflow is also checked. Zero
  shrinkage returns the original integer exactly. A display payload whose
  +3 scenario exceeds the agent limit returns an error.
- A requested 100% target is compared in floating-point arithmetic, as in the
  Python implementation; a rounded value of one is not a mathematical guarantee
  that every arrival receives service. No finite-staff stochastic model can
  provide that guarantee for positive demand and a finite target time.

This crate does not port planning/monthly aggregation or replace the normative
`specs/reference-implementations/erlang` package. Any future integration must
explicitly review these numerical differences and the PLAN-007 versioning
contract. The frozen source snapshots and their hashes remain unchanged.

## Files

| File | Responsibility |
| --- | --- |
| `src/lib.rs` | Validation, public solver API, staffing search |
| `src/erlang_c.rs` | Erlang B recurrence and Erlang C metrics |
| `src/erlang_a.rs` | Stationary distribution and Erlang A metrics |
| `src/negative_binomial.rs` | Analytic waiting-time CDFs |
| `src/types.rs` | Inputs, models, metrics, limits, errors |
| `src/payload.rs` | Shrinkage and optional display adapter |
| `tests/staffing.rs` | Reference, analytical, invariant, and regression tests |
| `tests/reuse.rs` | Reused buffers, abandonment-only parity, and dataset error handling |
| `examples/dataset.rs` | Plain loop over supplied rows with numeric results and errors |
| `examples/benchmark.rs` | Manual performance benchmark |
| `tools/compare_python.py` | Differential check against the frozen Python engine |

## Validation recorded on 2026-10-02

Validated with Rust 1.99.0 on Apple arm64: 44 Rust tests (including the doc test),
Clippy with warnings denied, formatting, and documentation generation passed.
The unchanged Python reference's four conformance/integrity tests also passed.
The 17-case Python/Rust comparison had no mismatches; maximum service-level
difference was `1.92e-13` and maximum ASA difference was `4.65e-13` seconds.
The buffer-reuse/selective-calculation update was additionally compared with
the prior Rust release executable on 1,024 deterministic mixed-model,
mixed-duration search/fixed-staff rows: every returned metric was identical.
Tests verify allocation reuse, skipped waiting buffers for abandonment-only
and occupancy-rejected trials, recovery after failed rows, and buffer release.

A local release benchmark over 5,000 iterations with a reused solver measured the following mean
times. These are observations on this machine, not throughput guarantees.

| Calculation | Mean time |
| --- | ---: |
| Standard C staffing search, load 5 | 0.227 µs |
| Standard A staffing search, load 5 | 2.658 µs |
| High-load C staffing search, load 1,200 | 74.205 µs |
| High-load A staffing search, load 1,200 | 61.635 µs |
| Overloaded A full metrics, load 5 / 2 agents | 0.601 µs |
| Abandonment only, load 5 / 2 agents | 0.111 µs |
| A full metrics, load 1,200 / 1,200 agents | 8.052 µs |
| Abandonment only, load 1,200 / 1,200 agents | 2.531 µs |

No frontend code or navigation changed, so frontend build/unit/e2e suites were
not run for this isolated library.
