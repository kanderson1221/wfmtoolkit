---
id: FCAST-001
title: Modeled Daily-Volume Holdout Accuracy and Baseline Review
status: implemented
owners: []
depends_on: []
supersedes: []
last_reviewed: 2026-07-18
---

# Purpose

This specification defines how the adjacent WFM Toolkit forecasting workbench
scores a modeled daily-volume forecast on held-out history and compares it with
a transparent benchmark. It does not expand the Planning Workspace boundary in
`FOUND-001`; a modeled result must still enter an annual plan through the saved
forecast lifecycle.

# Planner Decision

A forecast analyst uses the review to decide whether the configured model adds
predictive value over a simple weekday pattern before saving or handing off the
result. The review supplies evidence. It does not automatically accept, reject,
or certify a forecast.

# Holdout Contract

- The configured `holdoutDays` shall identify the most recent daily history
  rows used for scoring.
- The statistical model shall be fitted on the earlier training rows only for
  the holdout prediction.
- A valid holdout shall leave at least 14 training rows.
- The scored date range, training date range, and number of test days shall be
  visible beside the metrics.
- When no holdout is configured, the application shall not display an accuracy
  review.

# Weekday Benchmark

For each scored date, the benchmark shall be the arithmetic mean of up to the
latest eight training observations with the same weekday. It shall never read
actual values from within the holdout period. If a weekday has no training
observation, the training-set mean is the fallback.

The UI shall name this method as `8-week weekday average` and explain that it
uses training data only. The benchmark is a comparison floor, not a production
forecast source and not a persisted planning version.

# Accuracy Measures

For actual contacts `A_t` and forecast contacts `F_t` across `n` test days:

- `absolute error_t = |F_t - A_t|`
- `signed error_t = F_t - A_t`
- `MAE = (1 / n) × Σ absolute error_t`, in contacts per test day
- `WAPE = 100 × Σ absolute error_t / Σ A_t`, in percent
- `mean bias = (1 / n) × Σ signed error_t`, in contacts per test day
- `interval coverage = 100 × count(A_t within [lower_t, upper_t]) / n`, in
  percent, for the modeled forecast only

Lower WAPE and MAE are better. Bias nearer zero is better. Positive bias means
over-forecasting; negative bias means under-forecasting. Interval coverage must
be interpreted against the configured interval width and shall not be
presented for the point-only weekday benchmark.

When total actual holdout contacts are zero, WAPE shall be unavailable rather
than zero. MAPE and RMSE may remain in the API diagnostics for compatibility,
but the first decision table shall emphasize WAPE, MAE, bias, and interval
coverage because these retain portfolio weighting, operational units, and
uncertainty evidence.

# Desktop Workflow

- The Contacts forecast view shall keep the demand chart primary and show the
  accuracy review directly beneath it.
- One comparison table shall align the modeled forecast and weekday benchmark
  for rapid horizontal scanning.
- The result statement may identify which result has lower WAPE and the
  difference in percentage points, but it shall explicitly state that this is
  not an automatic acceptance decision.
- Units and metric interpretation shall be visible without a tooltip.
- The table shall remain a semantic native table inside a contained horizontal
  scroller for desktop resizing and zoom.
- Older saved results without benchmark evidence shall remain readable and
  prompt a rerun rather than fabricate baseline values.

# Diagnostic Export

The accuracy CSV shall include every scored day with:

- date and actual contacts
- modeled point forecast, lower and upper bounds
- modeled absolute, signed, and percent error
- whether the actual fell within the modeled interval
- the configured modeled interval width
- benchmark method and point forecast
- benchmark absolute and signed error

Missing or unavailable numeric values shall export as blank fields. Downloading
the review shall not mutate the forecast or planning data.

# Acceptance Scenarios

1. Given positive actual volume and both forecasts, the table and CSV reconcile
   to the same WAPE, MAE, and bias evidence.
2. If the weekday benchmark has lower WAPE, the result statement names the
   benchmark and does not label the modeled forecast accepted.
3. If holdout actual volume totals zero, both WAPE values and the comparison
   winner are unavailable while MAE and bias remain usable.
4. Changing a holdout actual cannot change a benchmark prediction because the
   benchmark reads training rows only.
5. Loading an older saved run without benchmark fields shows the modeled
   evidence and a rerun message without a schema migration.

# Implementation Traceability

- Backend scoring: `backend/app/forecasting.py`
- Frontend review logic/export: `src/forecasting/forecastAccuracyReview.js`
- Desktop UI: `src/components/forecasting/ForecastAccuracyReview.vue`
- Backend tests: `backend/tests/test_forecasting.py`
- Frontend tests: `src/forecasting/__tests__/forecastAccuracyReview.spec.js`,
  `src/components/__tests__/ForecastingWorkspace.spec.js`
