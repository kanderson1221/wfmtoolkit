---
id: FCAST-005
title: Rolling-Origin Forecast Stability Review
status: implemented
owners: []
depends_on: [FCAST-001]
supersedes: []
last_reviewed: 2026-07-19
---

# Purpose

This specification defines how the adjacent forecasting workbench tests whether
a modeled daily forecast's accuracy is stable across multiple historical
cutoffs. It extends the latest holdout review in `FCAST-001` without defining an
organizational threshold, acceptance decision, or approval record.

# Planner Decision

A forecast analyst uses this evidence to determine whether a favorable current
holdout is repeated across earlier operating periods or depends on one selected
test window. The review supports further investigation; it does not accept,
reject, certify, or hand off a forecast.

# Fold Contract

- The configured `holdoutDays` defines the number of scored observations in
  every fold.
- The current holdout is the most recent fold.
- Up to two immediately preceding, non-overlapping holdout windows shall be
  scored when each leaves at least 14 earlier training observations.
- Every fold shall fit the configured model using only observations before its
  own test window. No actual value from that or a later test window may enter
  its model or weekday benchmark.
- Training grows toward the current cutoff; the model configuration otherwise
  remains unchanged.
- Manual changepoints later than an individual fold's training cutoff shall be
  excluded from that fold rather than leaking later configuration into it.
- When history supports only the current fold, the review shall say how many
  additional earlier observations are needed for another cutoff. Forecasting
  remains available.

# Measures And Interpretation

Each fold shall expose:

- training date range and observation count
- test date range and observation count
- modeled WAPE, MAE, mean bias, and prediction-interval coverage
- training-only eight-week weekday benchmark WAPE, MAE, and mean bias
- which candidate has lower WAPE, or that WAPE is unavailable

The summary shall state the number of comparable windows where the model has
lower WAPE than the weekday benchmark and the range of modeled WAPE across
folds. Zero-total-actual windows keep WAPE unavailable. They shall not count as
a model or benchmark win.

The comparison does not average away individual windows or define a pass/fail
threshold. Bias nearer zero is better, regardless of sign. Interval coverage
must still be interpreted against the configured interval width.

# Desktop Workflow And Export

- Rolling-origin evidence shall appear directly beneath the current holdout
  comparison in the Contacts result view.
- One semantic native table shall align windows chronologically, with the
  current window named explicitly.
- The table shall remain inside a contained horizontal scroller during desktop
  resizing and zoom.
- The result shall communicate lower-WAPE outcomes in text rather than color
  alone.
- A stability CSV shall contain one reconciled row per fold with training/test
  ranges, both candidates' metrics, interval coverage, and lower-WAPE outcome.

# Data Safety And Compatibility

Rolling-origin evidence is generated during a normal modeled-forecast run and
stored inside its existing diagnostics snapshot. It does not change future
forecast values, planning demand, AHT, workload, staffing, or saved-source
selection. Older saved runs without this evidence remain readable and keep
their existing single-holdout review; no migration is required.

# Acceptance Scenarios

1. With enough history, three folds use progressively larger training sets and
   three equal, non-overlapping test windows in chronological order.
2. Changing an actual in a later window cannot change predictions or benchmark
   values in an earlier fold.
3. A manual changepoint after an earlier fold's cutoff is absent from that fit
   but remains applicable to later fits once it enters their training history.
4. A zero-volume window exports blank WAPE and does not count toward either
   candidate's lower-WAPE total.
5. A run with only one feasible fold explains the history limitation without
   blocking the forecast or fabricating prior evidence.
6. A legacy saved run without rolling-origin diagnostics retains the existing
   `FCAST-001` review and shows no invented stability result.

# Implementation Traceability

- Backend folds and scoring: `backend/app/forecasting.py`
- Frontend review logic/export: `src/forecasting/forecastAccuracyReview.js`
- Desktop UI: `src/components/forecasting/ForecastAccuracyReview.vue`
- Backend tests: `backend/tests/test_forecasting.py`
- Frontend tests: `src/forecasting/__tests__/forecastAccuracyReview.spec.js`,
  `src/components/__tests__/ForecastAccuracyReview.spec.js`,
  `src/components/__tests__/ForecastingWorkspace.spec.js`
