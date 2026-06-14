# Erlang Staffing Reference Implementation

Version: `1.0.0`

This package is the executable numerical contract for `PLAN-007`. It removes
ambiguity about formulas, search behavior, edge cases, rounding, and monthly
aggregation.

## Normative Scope

The following entry points are normative for the planning workspace:

- `staff_for_interval(inputs, model="erlang_c")`
- `staff_for_interval(inputs, model="erlang_a")`
- `plan_intraday_monthly_rows(rows)`

The planning adapter uses Erlang C. Erlang A is included as an exact supported
engine capability, but the planning workspace shall not select it unless an
approved specification adds that choice.

`build_results_payload` and CSV helpers remain in the source snapshots so the
copied modules stay exact. Their presence does not add standalone calculators
or CSV planning commands to the product scope.

## Package Contents

- `reference_erlang/erlang.py`: Erlang C and Erlang A calculations, staffing
  search, validation, and metrics.
- `reference_erlang/models.py`: input, metric, interval, and rollup contracts.
- `reference_erlang/rates.py`: arrival, service, patience, load, and occupancy
  helpers.
- `reference_erlang/planner.py`: interval, daily, and monthly planning adapter.
- `test_vectors.json`: representative expected results for both Erlang models
  and a monthly planning rollup.
- `tests/test_reference_erlang.py`: executable conformance and integrity tests.
- `SOURCE_SHA256SUMS`: hashes of the four exact source snapshots.

The four source snapshots were copied without modification on June 14, 2026.
Their hashes are checked by the conformance suite.

## Integration Rule

An implementation shall use one of these approaches:

1. Import or vendor this package without changing the four source snapshots.
2. Port the algorithms to another language or architecture and demonstrate
   conformance with every supplied vector and invariant.

A port shall preserve:

- input validation and zero-demand behavior
- Erlang C and Erlang A model selection
- the minimum-staff search that satisfies service level and max occupancy
- all returned metric definitions
- the planning adapter's interval, daily, and monthly aggregation behavior
- rounding only where the reference adapter rounds

For numerical behavior, this package and its conformance tests are normative.
For workflow, persistence, and UI behavior, the feature specifications are
normative. A proposed numerical change requires a new package version,
updated vectors, and review of `PLAN-007`.

## Run The Conformance Suite

From the repository root:

```bash
python3 -m unittest discover \
  -s specs/reference-implementations/erlang/tests \
  -p "test_*.py" \
  -v
```

The package uses only the Python standard library.
