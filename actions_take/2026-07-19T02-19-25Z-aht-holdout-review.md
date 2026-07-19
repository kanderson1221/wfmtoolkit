# Handle-time assumptions now prove holdout accuracy without leakage

Run type: product improvement

## Scope and decision

- Capabilities: `CAP-FORE-002`; supporting `CAP-WORK-001`, `CAP-UX-001`, `CAP-IO-001`, and `CAP-GOV-001`
- Roadmap: second production slice of `NOW-005`
- Interview evidence: `INT-002` remains Open. It will govern acceptance thresholds, holdout policy, candidate configurations, and the eventual analyst decision record; this run did not invent those semantics.
- Planner persona: forecast analyst preparing demand and handle-time assumptions for an annual staffing plan
- Planner decision: determine whether the configured monthly AHT method improves on a transparent training-only assumption and understand its workload consequence before saving or handing off the forecast
- Desktop workflow: review historical AHT, scan aligned holdout evidence, export scored dates, then edit future monthly AHT overrides in the same result tab
- Product disposition: improve and correct the retained AHT workflow; reuse the contact accuracy presentation instead of building a second local table dialect
- Review scope: contact/AHT training-window boundaries, monthly AHT assumptions, holdout formulas, partial/zero evidence, AHT result composition, CSV, persisted-project compatibility, desktop resizing/zoom, specifications, strategy, interview queue, and exposed comparison rendering

## Opportunity and evidence

The prior `NOW-005` slice made contact accuracy leakage-safe but explicitly left AHT accuracy absent. Inspection found a more serious adjacent issue: `buildForecastMonthlyAhtHistory` called `getForecastTrainingAhtHistoryRows`, which returned the entire selected contact window. When `holdoutDays` was enabled, the backend removed the final dates from contact training, but AHT assumptions still learned from AHT actuals on those validation dates. The AHT tab then labeled that history as training evidence and presented future assumptions without any out-of-sample check.

Repository and workflow evidence:

- `forecastTrainingWindow.js` selected the configured date window but had no shared contact holdout partition.
- `handleTimeAssumptions.js` used all in-window AHT rows for weighted, seasonal, and blended assumptions.
- The saved project already retains contact history, AHT history, holdout configuration, and run data, so the fix requires no migration or API round trip.
- AHT error affects workload as `contacts × AHT`; unweighted daily error would understate misses on high-volume days.
- `INT-002` is needed for governance thresholds, not for preventing leakage or showing objective comparison evidence.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health.

| Capability | Before | Need | After | Need | Rationale |
|---|---:|---:|---:|---:|---|
| `CAP-FORE-002` | `5/3/4/4/4/4` | 25 | unchanged | 25 | This closes a material leakage and AHT-evidence gap inside already-strong dimensions, but one fixed holdout is still not a governed multi-configuration or rolling-origin workflow, so Completeness remains 3 and the other scores stay calibrated at 4. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | The AHT tab gains a substantive desktop decision surface, but keyboard/focus/zoom consistency remains uneven product-wide. |

## WFM formulas, assumptions, units, and interpretation

- The configured contact `holdoutDays` partitions the selected contact rows. A valid partition must leave at least 14 model-training rows, matching the backend contract.
- AHT training rows stop at the last contact model-training date. AHT actuals on holdout dates cannot affect the configured method or benchmark.
- Only holdout dates with valid AHT and positive contacts are scored. The UI reports `scored days of contact holdout days`; exclusions are not converted to zero error.
- Candidate AHT follows the configured `Weighted Average`, `Seasonal By Month`, or `Blend Recent + Seasonal` method using training months only.
- The benchmark is one contact-weighted average AHT across the training window.
- `weighted MAE = Σ(contacts × |candidate AHT - actual AHT|) / Σ contacts`, seconds.
- `weighted bias = Σ(contacts × (candidate AHT - actual AHT)) / Σ contacts`, seconds. Positive bias overstates AHT/workload; negative bias understates it.
- `AHT workload error = 100 × Σ(contacts × |candidate AHT - actual AHT|) / Σ(contacts × actual AHT)`, percent.
- Workload error is unavailable when actual scored workload is zero. Lower workload error/MAE is better; bias nearer zero is better. Lower error is evidence, not automatic acceptance.

## Plan and acceptance criteria

1. Partition contact training/holdout once and keep at least 14 training rows.
2. Exclude every holdout AHT value from future AHT assumption history.
3. Score only positive-contact holdout days with valid AHT and expose the numerator/denominator.
4. Compare the configured method with a training-only weighted benchmark using workload error, weighted MAE, and weighted bias.
5. Keep zero-workload evidence unavailable rather than perfect.
6. Export every scored day with contacts, actual AHT, both candidates, and signed/absolute errors.
7. Reuse one semantic native comparison table with visible units and methodology; keep its overflow contained during desktop resize and zoom.
8. Preserve existing projects without a migration and leave acceptance thresholds pending `INT-002`.
9. Update adjacent specifications, capability evidence, roadmap progress, interview decision scope, tests, and this audit.
10. Pass frontend/backend/build/lint/standards/e2e verification and 1280/1440/1920 desktop review.

Acceptance result: met.

## Implementation and removals

- Added a shared contact holdout partition and leakage-safe AHT model-training selector.
- Switched all future AHT summaries and assumptions to the model-training subset, removing validation-period AHT from the candidate basis.
- Added pure AHT accuracy calculation and scored-day CSV generation with contact-weighted workload measures.
- Generalized the retained `ForecastAccuracyReview` presentation contract so contacts and AHT use one aligned semantic table, status pattern, export lifecycle, units formatter, and contained scroller.
- Inserted AHT evidence between the historical chart and monthly assumption worksheet, preserving the existing operational sequence.
- Removed the need for a duplicate AHT-specific metrics table and duplicated download implementation.
- Added `FCAST-002` and updated `NOW-005`, capability evidence, and `INT-002` decision scope.

No route, dependency, backend schema, persisted field, migration, threshold, acceptance state, or planning calculation was added. Existing project history is reinterpreted safely at read time.

## Files and compatibility

- Training and assumptions: `src/forecasting/forecastTrainingWindow.js`, `src/forecasting/handleTimeAssumptions.js`, `src/forecasting/shared.js`
- Accuracy logic/export: `src/forecasting/forecastAhtAccuracyReview.js`, `src/forecasting/forecastAccuracyReview.js`
- UI: `src/components/forecasting/ForecastAccuracyReview.vue`, `ForecastingResultsPanel.vue`, `results/ForecastAhtResultsView.vue`
- Tests: `src/forecasting/__tests__/forecastAhtAccuracyReview.spec.js`, `src/components/__tests__/ForecastAccuracyReview.spec.js`
- Contract: `specs/forecasting/FCAST-002-handle-time-holdout-review.md`
- Strategy/sponsor: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, `interviews.md`
- Audit: this file

Compatibility: additive/read-time and backward compatible. Projects without a valid holdout simply omit the AHT review. Projects with insufficient selected history do not fabricate a split. Forecast IDs, history, configuration, last-run schema, manual adjustments, AHT overrides, saved sources, and downstream plan snapshots are unchanged.

## Standards and review findings

- No direct PrimeVue import was introduced outside `src/components/ui`.
- The feature composes existing `AppButton`, `AppStatusMessage`, and `AppTableShell` wrappers plus a native semantic table.
- Candidate labels, units, error direction, missing evidence, excluded-day coverage, and non-acceptance language are textual and not color-only.
- The export has a visible accessible name and retained focus after activation.
- The wide table scrolls inside its own container at zoom-equivalent widths; the body remains stable.
- No legacy semantic class, phone-only transformation, touch-only path, dependency, or new visual dialect was introduced.
- Browser review caught one missing inter-sentence space in the status message; it was fixed before final verification.

## Exact verification

- Focused frontend after the calculation slice: `npm test -- --run src/forecasting/__tests__/handleTimeAssumptions.spec.js src/forecasting/__tests__/forecastAhtAccuracyReview.spec.js src/components/__tests__/ForecastAccuracyReview.spec.js src/components/__tests__/ForecastingWorkspace.spec.js`
  - Passed: 4 files, 38 tests.
- Final `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 77 files, 399 tests.
  - Production build passed: 834 modules transformed.
  - Vitest emitted the existing `--localstorage-file` warning; no test failed.
- Full backend: `.venv/bin/python -m unittest discover -s backend/tests -p 'test_*.py' -v`
  - Passed: 35 tests.
  - Emitted the existing informative Plotly import message; no test failed.
- `npm run test:e2e`
  - Passed: 15 Chromium tests.
  - Emitted the existing `NO_COLOR`/`FORCE_COLOR` warning; no test failed.
- `git diff --check`
  - Passed before the audit and shall be repeated on the final tree.

## Desktop review

The in-app browser-control skill was used with the real component in an isolated temporary Vite harness. The harness and development server were removed/stopped before final checks.

- 1280 × 900: body client/scroll width `1280/1280`; review `1206/1206`; table scroller `1204/1204`; export visible above the fold. The heading, scored-day scope, decision statement, three aligned measures, and methodology were readable in one calm surface.
- 1440 × 900: body `1440/1440`; review `1366/1366`; table scroller `1364/1364`; no overflow.
- 1920 × 1000: body `1920/1920`; review `1838/1838`; table scroller `1836/1836`; the table used the wide desktop surface without excessive cards or gaps.
- 150%-zoom equivalent (`853` CSS px for a 1280px window): body `853/853`; review `787/787`; table scroller `785/820`. Horizontal overflow stayed contained in the table scroller and the export remained visible.
- Accessibility/keyboard: the section exposed the `Handle time accuracy review` region, semantic row/column headers, status text, and uniquely named export button. The button retained focus after activation.
- Browser console: no warnings or errors.

## Rotation and portfolio balance

The last `code review and remediation` run is six completed runs back, so the one-in-ten rotation does not require a review. The previous run followed the required fifth-run strategic portfolio review; this run is the second ordinary non-review run in the new cadence.

Recent work already satisfies the rolling user-facing balance through call-center directory simplification, saved-plan comparison, contact forecast evidence, and this AHT correctness/workflow slice. This run is a user-facing forecasting capability and desktop decision improvement, not maintenance-only work.

## Strategy and interview updates

- `CAP-FORE-002` remains Need 25 with calibrated scores `5/3/4/4/4/4`; its evidence and gaps now reflect contact and AHT review while governed comparison remains absent.
- `NOW-005` remains In progress and records two completed production slices. Remaining work is multi-configuration/rolling-origin comparison, an acceptance record, and override trace.
- `INT-002` remains the only Open question. Its answer was not changed; only the decision scope was updated to recognize that both safe benchmark slices now exist.
- No new interview question was added because the existing high-priority question already covers the active ambiguity.

## Risks, limitations, and follow-ups

- One fixed holdout can be period-sensitive; rolling-origin validation remains necessary before governed acceptance.
- The weighted-average benchmark is transparent, not a production seasonal challenger.
- AHT validation isolates handle-time error with actual contacts; it does not combine contact and AHT forecast errors into a single joint staffing simulation.
- Manual future-month AHT overrides are intentionally excluded from historical method validation; override provenance remains a separate roadmap gap.
- Saved analyst accept/reject decisions and thresholds remain pending `INT-002`.

## Linked candidates considered

1. Capability/workflow — `CAP-FORE-002`, `NOW-005`, `INT-002`: make AHT assumptions leakage-safe and add workload-weighted holdout comparison (selected).
2. Desktop UX/trust — `CAP-REP-002`, `CAP-UX-001`: standardize retained call-center stale/error states with correction actions and focus restoration.
3. Deletion/simplification — `CAP-IO-001`: consolidate backup and actuals-gap Blob/object-URL lifecycles into the shared download primitive and remove duplicate cleanup tests.
