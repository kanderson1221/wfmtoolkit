---
id: FCAST-004
title: Saved Modeled-Forecast Candidate Comparison
status: implemented
owners: []
depends_on: [FCAST-001]
supersedes: []
last_reviewed: 2026-07-19
---

# Purpose

This specification defines how a forecast analyst compares two saved modeled
daily forecasts without treating runs scored on different actuals as if they
were interchangeable. It extends the neutral holdout evidence in `FCAST-001`;
it does not define an organizational acceptance threshold or approval record.

# Planner Decision

A forecast analyst uses the comparison to decide which saved model
configuration deserves further review or handoff. The workflow must make the
tested actuals, accuracy tradeoffs, and changed settings visible together.

# Eligibility

A saved forecast is eligible when it:

- uses the modeled daily source
- has a persisted identifier and completed run timestamp
- contains a non-empty scored holdout with a date and finite actual contacts
  for every scored row

Imported daily forecasts, manual monthly forecasts, unsaved runs, unscored
runs, and legacy runs without complete holdout rows remain usable elsewhere but
shall not enter candidate comparison.

# Comparable-Holdout Contract

Two eligible forecasts are comparable only when their scored rows have:

- the same number of rows
- the same dates in the same order
- the same actual contacts for every date, within stored three-decimal
  precision

If any condition fails, the application shall withhold all side-by-side metric
values and instruct the analyst to rerun both candidates with the same history
and holdout window. Matching date-range labels alone are insufficient.

# Measures And Interpretation

For reference value `R` and candidate value `C`:

`displayed delta = C - R`

The comparison shall align:

- WAPE, in percent; lower is better
- MAE, in contacts per scored day; lower is better
- mean bias, in signed contacts per scored day; nearer zero is better
- interval coverage, in percent; interpreted against each candidate's own
  configured interval width
- training-only weekday benchmark WAPE, in percent, for context

The summary may name the candidate with lower WAPE and the absolute percentage-
point difference. It shall not label a forecast accepted, approved, certified,
or production-ready. Bias shall explicitly be interpreted by distance from
zero rather than the sign of `C - R`.

# Configuration Evidence

The same review shall show the saved training period, scored-day count, growth
model, seasonality mode and enabled seasonalities, built-in holiday calendar,
changepoint flexibility, and prediction interval width. Every row shall state
`Changed` or `Same`; differences shall not rely on color.

# Desktop And Accessibility Contract

- `Compare Forecasts` appears when at least two eligible saved candidates are
  available, including inside a staffing-group forecast route where generic
  library-management actions are hidden.
- The current saved forecast is the default reference when it is eligible.
- The default candidate is a different forecast with an identical holdout when
  one exists.
- The reference selector receives initial focus.
- Closing returns focus to the retained comparison trigger.
- Metric and configuration evidence use semantic native tables inside contained
  horizontal scrollers.
- The dialog owns one contained vertical scroll region at supported desktop
  widths and zoom-equivalent resizing; the document shall not overflow
  horizontally.

# Data Safety And Compatibility

Comparison is read-only. It shall not mutate, rerun, save, accept, reject, or
reorder forecasts. No schema migration is required. Ineligible legacy forecasts
remain readable and editable through their existing workflows.

# Acceptance Scenarios

1. Two saved model runs scored against identical dated actuals show aligned
   metrics, deltas, settings, and explicit change status.
2. The lower-WAPE statement remains neutral and includes no acceptance claim.
3. Different scored dates or actual contacts produce an incompatibility message
   and no metric table.
4. Imported, manual, unsaved, and no-holdout forecasts do not count toward the
   two-candidate requirement.
5. The dialog focuses the reference selector on open and restores the trigger
   on close.

# Implementation Traceability

- Domain contract: `src/forecasting/forecastCandidateComparison.js`
- Desktop dialog: `src/components/forecasting/ForecastCandidateComparisonDialog.vue`
- Workspace action: `src/components/ForecastingWorkspace.vue`,
  `src/components/forecasting/ForecastingWorkbench.vue`
- Tests: `src/forecasting/__tests__/forecastCandidateComparison.spec.js`,
  `src/components/__tests__/ForecastCandidateComparisonDialog.spec.js`,
  `src/components/__tests__/ForecastingWorkspace.spec.js`,
  `tests/smoke/planning.spec.js`
