# Modeled forecasts now prove value against a leakage-safe benchmark

Run type: product improvement

## Scope and decision

- Capabilities: `CAP-FORE-002`, supporting `CAP-UX-001`, `CAP-IO-001`, and `CAP-GOV-001`
- Roadmap: first production slice of `NOW-005`
- Interview evidence: `INT-002` remains Open; it will govern acceptance thresholds, comparison candidates, and the decision record, but did not block objective benchmark evidence
- Planner persona: forecast analyst preparing a modeled daily-volume source for annual planning
- Planner decision: determine whether the configured modeled forecast improves on a transparent weekday pattern and understand bias/uncertainty limitations before saving or handing off the result
- Desktop workflow: review the demand chart, scan modeled-versus-benchmark evidence directly beneath it, interpret WAPE/MAE/bias/coverage in operational units, and export all scored days
- Product disposition: improve and simplify the retained workbench; replace the three MAPE/MAE pills with a decision-grade accuracy table and do not invent an acceptance threshold
- Review scope: FastAPI holdout scoring, result persistence compatibility, Contacts result composition, accuracy CSV, desktop accessibility/overflow, adjacent forecasting specification, strategy, sponsor queue, and obsolete metric-summary plumbing

## Opportunity and evidence

`NOW-005` was the highest-value executable roadmap item after saved-plan comparison. The backend already calculated model-only MAE, RMSE, MAPE, WAPE, bias, interval coverage, and daily holdout rows, but the product surfaced only Test Set, MAPE, and MAE as small pills. A planner could not tell whether the statistical model added value over a simple demand pattern, see bias or interval performance, or export the scored evidence.

Repository evidence:

- `backend/app/forecasting.py` correctly fitted the holdout model on training rows only but returned no comparison benchmark.
- `ForecastingResultsPanel.vue` discarded WAPE, bias, coverage, and detailed scored rows after chart enrichment.
- `ForecastContactsResultsView.vue` presented MAPE/MAE as context-free pills with no units explanation or baseline.
- The workbench already retained the full diagnostics object in saved snapshots, so additive fields are backward compatible.
- `INT-002` asks for the sponsor's real accept/reject policy. That ambiguity affects thresholds and governance, not whether objective comparison evidence should exist.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need before | After | Need after | Rationale |
|---|---:|---:|---:|---:|---|
| `CAP-FORE-002` | `5/3/3/3/3/3` | 40 | `5/3/4/4/4/4` | 25 | Leakage-safe benchmark comparison, WFM-relevant metrics, explicit units/limits, complete daily export, and isolated pure/UI/backend tests materially improve correctness, workflow, trust, and engineering health. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | The results view is materially better, but the score is product-wide. |
| `CAP-IO-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | One new export uses the existing shared CSV/download primitive; the known backup/actuals duplicate download lifecycles remain. |

Completeness stays 3 because saved configuration-to-configuration or rolling-origin comparison, a governed acceptance record, override trace in diagnostics, and AHT accuracy are still absent.

## WFM rationale, formulas, units, and interpretation

- The most recent configured `holdoutDays` are scored; the earlier rows are the only training data available to either candidate.
- For each holdout date, the benchmark is the arithmetic mean of up to the latest eight training observations with the same weekday. A training-set mean is the defensive fallback when no matching weekday exists.
- `absolute error = |forecast - actual|` contacts.
- `signed error = forecast - actual` contacts; positive bias is over-forecasting and negative bias is under-forecasting.
- `MAE = mean(absolute error)` contacts per test day.
- `WAPE = 100 × sum(absolute error) / sum(actual contacts)` percent. WAPE remains unavailable when total actual contacts are zero rather than appearing as perfect accuracy.
- `interval coverage = 100 × days with actual inside modeled lower/upper bounds / test days` percent. The point-only benchmark has no interval coverage.
- Lower WAPE/MAE is better; bias nearer zero is better. The UI may name the lower-WAPE result and the difference in percentage points, but explicitly says this is evidence, not automatic acceptance.
- The benchmark is intentionally a transparent low bar, not a production forecast, holiday-aware challenger, or substitute planning version.

## Plan and acceptance criteria

1. Fit the model and compute the weekday benchmark from training rows only; holdout actuals must not affect benchmark predictions.
2. Preserve existing top-level model diagnostics while adding benchmark metrics, comparison direction, and row-level benchmark evidence.
3. Keep WAPE unavailable for zero-total-actual holdouts.
4. Replace the MAPE/MAE pills with one aligned semantic table showing WAPE, MAE, bias, and interval coverage with visible units and interpretation.
5. State which result has lower WAPE without declaring a forecast acceptable or rejected.
6. Export every scored day with actual, modeled interval/error, configured interval width, interval hit, benchmark method/value, and benchmark error through the shared CSV primitive.
7. Keep older saved results readable, show model evidence, and request a rerun for missing benchmark fields without a migration.
8. Preserve the chart's held-out-row behavior and keep all new UI composed from shared wrappers and native tables.
9. Remove obsolete accuracy-pill construction and prop plumbing.
10. Pass backend/frontend/build/lint/standards/e2e verification and desktop review at 1280, 1440, and 1920 widths.

Acceptance result: met.

## Implementation and removals

- Added an eight-week weekday benchmark inside the existing holdout calculation; its predictions are fixed from training data and returned beside model metrics.
- Refactored metric calculation so modeled and benchmark MAE/RMSE/MAPE/WAPE/bias use one implementation.
- Changed zero-total-actual WAPE/MAPE handling from misleading `0.0` to unavailable values.
- Added `forecastAccuracyReview.js` for backward-compatible review normalization, result statements, metric rows, and daily CSV output.
- Added `ForecastAccuracyReview.vue` with shared `AppButton`, `AppStatusMessage`, `AppTableShell`, a native semantic comparison table, contained overflow, visible methodology, and a reachable download action.
- Kept the daily demand chart primary and placed the review immediately beneath it in the Contacts view.
- Removed `dailyAccuracyHighlights`, the old Test Set/MAPE/MAE pill construction, its prop, and its repeated pill rendering.
- Added backend, pure frontend, integrated workbench, and focused component/export tests.
- Added adjacent forecasting contract `FCAST-001` without changing the imported-forecast-only boundary of the Planning Workspace specifications.

No route, dependency, persisted schema, or migration was added. The diagnostics object is additive; older snapshots remain usable.

## Standards and review findings

- No direct PrimeVue import was introduced outside `src/components/ui`; the feature composes shared wrappers.
- The metrics comparison is a native table with scoped row/column headers and contained horizontal overflow.
- Units, lower-is-better guidance, bias direction, Not available states, and the non-acceptance boundary are textual and do not rely on color.
- The export action has a meaningful visible/accessibility name and uses the shared CSV/Blob lifecycle.
- No legacy semantic class, new visual dialect, phone-only transformation, touch-only behavior, or mobile navigation work was added.
- The backend keeps candidate and benchmark formulas together, while the UI normalization stays pure and independently testable.
- The browser review found no current component error; one retained console warning came from an initial temporary harness attempt using Vue runtime templates and disappeared after switching the harness to render functions.

## Files and compatibility

- Backend scoring/tests: `backend/app/forecasting.py`, `backend/tests/test_forecasting.py`
- Review logic/tests: `src/forecasting/forecastAccuracyReview.js`, `src/forecasting/__tests__/forecastAccuracyReview.spec.js`
- UI/tests: `src/components/forecasting/ForecastAccuracyReview.vue`, `src/components/forecasting/ForecastingResultsPanel.vue`, `src/components/forecasting/results/ForecastContactsResultsView.vue`, `src/components/__tests__/ForecastAccuracyReview.spec.js`, `src/components/__tests__/ForecastingWorkspace.spec.js`
- Specifications: `specs/forecasting/FCAST-001-holdout-accuracy-review.md`, `specs/README.md`
- Strategy/sponsor: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, `interviews.md`
- Audit: this file

Data compatibility: additive and backward compatible. Saved forecast IDs, source kinds, history, model configuration, runs, planning coverage, manual adjustments, and downstream plan snapshots are unchanged. Old saved runs without `benchmark` show model evidence and rerun guidance.

## Exact verification

- Initial `python -m unittest ...` did not start because `python` was not on PATH.
- Initial `python3 -m unittest ...` started but could not import pandas because this checkout had no backend virtual environment.
- Created the documented ignored `.venv` and installed `backend/requirements.txt`; this changed no version-controlled dependency.
- Focused backend: `.venv/bin/python -m unittest backend.tests.test_forecasting.ForecastingTests.test_holdout_returns_accuracy_metrics_and_rows backend.tests.test_forecasting.ForecastingTests.test_holdout_wape_is_unavailable_when_actual_volume_is_zero -v`
  - Passed: 2 tests.
- Full backend: `.venv/bin/python -m unittest discover -s backend/tests -p "test_*.py" -v`
  - Passed: 35 tests.
  - Emitted the existing informative message that Plotly interactive plots are unavailable; no test failed.
- Focused frontend after final component test: `npm test -- --run src/components/__tests__/ForecastAccuracyReview.spec.js src/forecasting/__tests__/forecastAccuracyReview.spec.js src/components/__tests__/ForecastingWorkspace.spec.js`
  - Passed: 3 files, 34 tests.
- `npm run build`
  - Passed: Vite production build; 833 modules transformed.
- `npm test`
  - Passed on the final source/test tree: 76 files, 394 tests.
  - Emitted the existing Node warning that `--localstorage-file` had no valid path; it did not fail the run.
- `npm run lint -- --quiet`
  - Passed after final source/test changes with no ESLint errors.
- `npm run check:standards`
  - Passed: frontend standards check.
- `npm run test:e2e`
  - Passed: 15 Chromium tests.
  - Emitted the existing `NO_COLOR`/`FORCE_COLOR` warning; it did not fail the run.
- `git diff --check`
  - Passed after temporary review artifacts were removed; it shall be repeated on the final tree.

## Desktop review

The in-app browser-control skill was used against the real component through a temporary ignored Vite harness at an isolated local origin. The real app's navigation was also exercised through an existing and an isolated call-center workspace. The browser file chooser timed out twice, so the harness supplied representative read-only scored evidence rather than mutating or inspecting user browser storage. The harness, isolated temporary CSV, and secondary Vite process were removed before final checks.

- 1280 × 900: body client/scroll width was 1280/1280 px; review section width was 1190 px; table scroller client/scroll width was 1188/1188 px; the download action was above the fold. The title, 60-day scope, decision statement, four aligned metrics, methodology, and units were clear in one calm operational surface.
- 1440 × 900: body was 1440/1440 px; table scroller was 1348/1348 px with no horizontal overflow.
- 1920 × 1000: body was 1920/1920 px; table scroller was 1828/1828 px with no horizontal overflow. The comparison used available desktop width while preserving stable metric columns.
- Keyboard/accessibility: the review is a named region; the export is a native wrapped button with a meaningful name; table headers and row headers were exposed semantically. The button remained focusable after activation.
- Export: the browser runtime did not surface the programmatic download event before timeout. The final focused component test verifies Blob creation, anchor activation, URL revocation, and button wiring; pure tests verify exact CSV columns and scored row content.
- Empty/compatibility state: no-holdout behavior remains the existing empty review; older saved results, zero-actual WAPE, model-better, and benchmark-better logic are covered by pure/component/backend tests.
- Viewport override was reset and all temporary browser tabs were finalized.

## Rotation and portfolio balance

The last `code review and remediation` run is five completed runs back, so the one-in-ten rotation does not require a review yet. The prior run was the required fifth-run strategic portfolio review plus a user-facing scenario capability; this sixth non-review run is correctly classified as `product improvement`.

Recent non-review work includes reporting integrity, atomic forecast replacement, scope simplification, saved-plan comparison, and now a forecast decision workflow. This run is both a user-facing capability and substantive desktop UX improvement, not a maintenance-only slice.

## Strategy and interview updates

- `CAP-FORE-002` moved from Adequate/Need 40 to Adequate-improving/Need 25 with correctness, desktop UX, trust, and engineering scores increasing from 3 to 4.
- `NOW-005` moved from Ready to In progress; its first benchmark/diagnostics/export slice is complete, while governed multi-configuration comparison remains.
- `INT-002` remains the only Open question. Its decision field now targets holdout policy, additional candidate configurations, acceptance record, and thresholds after this safe first slice. No owner answer was changed or overwritten, and no new question was added.
- Added `FCAST-001` as the normative adjacent forecasting contract; Planning Workspace scope still treats forecasts as imported inputs.

## Risks, limitations, and follow-ups

- The eight-week same-weekday average is a transparent benchmark, not a holiday-, trend-, promotion-, or change-point-aware challenger. Beating it is necessary evidence, not sufficient acceptance.
- One fixed holdout can be sensitive to the chosen period. Rolling-origin or multiple-window evidence remains in `NOW-005`.
- The comparison does not yet persist an analyst's accept/reject decision or reason; `INT-002` should define that governance.
- Forecast AHT accuracy is not scored. Current AHT assumptions and overrides remain a separate retained workbench workflow.
- Interval coverage is reported against the configured prediction width but does not yet show calibration by month or demand regime.
- Existing saved results need a rerun to gain benchmark fields; they are not silently recalculated.

## Linked candidates considered

1. Capability/workflow — `CAP-FORE-002`, `NOW-005`, `INT-002`: compare saved model configurations or rolling-origin windows and persist a governed analyst decision after sponsor acceptance semantics are available.
2. Desktop UX/trust — `CAP-REP-002`, `CAP-UX-001`: standardize retained call-center stale/error states with visible correction actions and reliable focus restoration.
3. Deletion/simplification — `CAP-IO-001`: consolidate backup and actuals-gap Blob/object-URL download lifecycles into the shared browser-download primitive and remove duplicate cleanup/test setup.
