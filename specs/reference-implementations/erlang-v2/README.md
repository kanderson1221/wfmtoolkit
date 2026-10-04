# Native Erlang reference contract

Version: `2.0.0`

This package replaces version 1.0.0 as the numerical contract for PLAN-007.
The original Python package remains byte-for-byte intact for historical
conformance checks. Version 2 retains the standard Erlang models and metric
definitions, and adopts the reviewed Rust implementation's analytical waiting
distribution, overflow-safe stationary probabilities, and explicit work bounds.

## Frozen contents

- `reference_erlang/`: dependency-free Rust engine source snapshots.
- `reference_adapter/`: Rust calculator and planning adapter/helper snapshots.
- `test_vectors.json`: original staffing/planning vectors plus a unit-scale
  invariant case that intentionally differs from Python's absolute epsilon.
- `api_vectors.json`: 16 independently generated Python HTTP contract cases
  covering both models, zero demand, CSV export shapes, and staffing floors.
- `tests/*.rs`: independent closed-form, flow-conservation, staffing-minimality,
  validation, and working-buffer regression tests.
- `SOURCE_SHA256SUMS` and `source_map.json`: frozen source integrity and live
  implementation mapping, checked by the Python conformance tests.

The frozen source files and vectors shall not be edited for this reference
version. Future numerical changes require another reference version.
The adapter snapshots record its executable logic; the native server's API
tests execute that adapter against the frozen HTTP vectors. The standalone
reference crate executes the engine tests without the HTTP server.

## Accepted changes from version 1

- Erlang A evaluates the conditional wait CDF analytically using an
  incomplete-beta/negative-binomial recurrence rather than a time grid.
  Floating-point evaluation and bounded tails remain numerical approximations.
- Erlang C stability depends on agents exceeding offered load, independent of
  absolute time units. Python's fixed `1e-9` departure-rate epsilon is removed.
- All numerical inputs must be finite. Invalid fixed-agent inputs receive the
  same validation as staffing search.
- Default limits are 100,000 agents, 1,000,000 stationary states, and a relative
  omitted-mass tolerance of `1e-14`. Exhausted limits return explicit errors.
- Shrinkage rejects overflow and headcounts outside exact f64 integer range.
- Erlang C abandonment intentionally remains an Erlang A estimate at the
  same demand and staffing; other C metrics ignore abandonment.
- Planning continues to select Erlang C and recalculate metrics after a staffing
  floor. API defaults include minimum-headcount fields, matching the existing
  Python HTTP adapter. Internal reference-v1 planning vectors omit those fields
  when no floor is supplied directly.

Original representative vectors retain `1e-12` absolute/relative tolerances.
Broader Python differential checks allow `2e-8` for Erlang A service level due
to its RK4 discretization; staffing counts must match. Closed forms and model
invariants, rather than overflowing Python outputs, validate extreme inputs.

## Verify

From the repository root:

```sh
python3 -m unittest discover -s specs/reference-implementations/erlang-v2/tests -v
cargo test --manifest-path specs/reference-implementations/erlang-v2/Cargo.toml --locked
cargo test --manifest-path rust/Cargo.toml --workspace --locked
```

The live source map blocks accepting an implementation that differs from the
frozen contract. Source hashes do not replace the independent analytical and
API conformance tests.
