# Saved forecast candidates now compare on identical holdout evidence

Run type: product improvement

## Capability, roadmap, and interview scope

- Capabilities: `CAP-FORE-002`, supporting `CAP-UX-001`.
- Roadmap: delivered the fourth production slice of in-progress `NOW-005` — Forecast accuracy and uncertainty review.
- Interview evidence: `INT-002` remains Open. Its decision scope now covers rolling-origin evidence, warning thresholds, and the governed acceptance record; this run deliberately supplied neutral comparison without inventing that policy.
- Planner persona: forecast analyst or capacity planner evaluating which saved modeled configuration deserves further review or handoff.
- Planner decision: compare two saved contact models on the same actual test days, understand accuracy and bias tradeoffs, and see which model settings changed.
- Desktop workflow: staffing group → Forecasts → open a saved modeled forecast → Compare Forecasts → choose reference and candidate.

## Opportunity and evidence

The workbench already compared one modeled run with a leakage-safe weekday baseline, but analysts could only inspect saved model configurations serially. Duplicate Forecast supported experimentation, yet the saved result library supplied no safe candidate-to-candidate review. Comparing the existing summary metrics without a compatibility gate would have been misleading because two runs can have different holdout dates or actual values.

Repository evidence spanned `FCAST-001`, `ForecastAccuracyReview.vue`, saved project snapshots, the forecast library, `createForecastProject`, and the prior `NOW-005` change record. `INT-002` still withholds sponsor-specific accept/reject semantics, but it does not prevent a mathematically neutral comparison on identical test actuals.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-FORE-002` | `5/3/4/4/4/4` | 25 | unchanged | 25 | Saved configuration comparison is now implemented, but rolling-origin evidence and a governed acceptance/rejection record remain absent. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | This dialog is keyboard-safe and contained across desktop widths, but product-wide shortcuts, sticky context, and unreviewed focus/zoom workflows remain uneven. |

The slice closes the saved-candidate gap without overstating the entire capability.

## Product disposition and WFM rationale

Disposition: improve the retained saved-forecast workflow and simplify unused state.

- Only persisted modeled-daily runs with complete scored holdout rows are eligible.
- Two eligible runs compare only when row counts, dates, and actual contacts match in order within stored three-decimal precision.
- `delta = candidate - reference` for WAPE, MAE, mean bias, interval coverage, and weekday-benchmark WAPE.
- Lower WAPE and MAE are favorable; bias is interpreted by distance from zero; coverage is descriptive against each candidate's own interval width.
- The WAPE summary may name the lower candidate and absolute percentage-point difference, but never accepts, rejects, approves, or certifies it.
- Imported daily, manual monthly, unsaved, no-holdout, and incomplete legacy runs remain usable elsewhere and are simply ineligible for this comparison.
- No demand, AHT, workload, staffing, service-level, shrinkage, or planning calculation changed.

## Standards reviewed and findings

- Used existing `AppDialog`, `AppFieldGroup`, `AppSelect`, `AppStatusMessage`, `AppTableShell`, `AppEmptyState`, and `AppButton`; no feature-level PrimeVue import, legacy semantic class, or new visual dialect was added.
- Metrics and configurations use semantic native tables with contained horizontal overflow.
- Reference and candidate selectors have visible labels; initial focus lands on the reference selector; changed settings state `Changed`/`Same` in text.
- Comparison remains available inside the staffing-group forecast route even though generic New/Open library actions are intentionally hidden there.
- Incompatible actuals produce an explicit correction message and no metric table.
- The edited forecast header exposed a dead `isDirty` prop chain. Repository-wide search proved it had no consumer, so its ref, deep watcher, manual assignment, composable return, workspace wiring, and component prop were removed.

## Rotation and portfolio balance

The preceding run was the required fifth-run `strategic portfolio review + product improvement`. A `code review and remediation` record remains inside the previous nine completed audits, so this run is correctly classified as an ordinary `product improvement`.

Recent non-review work includes one engineering consolidation and one user-facing plan-governance workflow. This run adds a user-facing forecasting decision workflow and substantive desktop comparison UX, maintaining the rolling-five balance. It is not the next fifth-run portfolio review.

## Scope, plan, and acceptance criteria

1. Define a pure eligibility and identical-holdout contract.
2. Compare aligned metrics, deltas, and meaningful model settings without acceptance policy.
3. Add a desktop dialog reachable wherever two eligible saved forecasts are available.
4. Preserve legacy/no-holdout behavior and stored data.
5. Remove dead state exposed by the edited forecast header.
6. Add domain, component, integration, backup-fixture, and Chromium regressions.

Acceptance criteria achieved:

- Different dates or actual contacts withhold every side-by-side metric.
- The current eligible saved forecast defaults as reference; a compatible different run defaults as candidate.
- WAPE, MAE, bias, interval coverage, weekday benchmark, test scope, and changed settings are visible together.
- No automatic acceptance state is created or persisted.
- Reference autofocus and comparison-trigger restoration pass Chromium and live browser review.
- The dialog stays horizontally contained and owns one vertical scroll region at 1280, 1440, 1920, and 1152 px CSS width.

## Implementation and removals

- Added `forecastCandidateComparison.js` with saved-run eligibility, exact scored-actual compatibility, stable deltas, neutral WAPE summary, metric rows, and configuration evidence.
- Added `ForecastCandidateComparisonDialog.vue` with two labeled selectors, explicit test scope, native metric/configuration tables, incompatibility withholding, and keyboard-safe close behavior.
- Added `Compare Forecasts` to the workbench whenever two eligible saved candidates exist, independent of generic library-action visibility.
- Added `FCAST-004` and refreshed the previously stale adjacent-forecasting specification index through `FCAST-004`.
- Removed the unused forecast `isDirty` ref, deep watcher, assignments, composable exposure, workspace prop binding, and workbench prop.
- Removed obsolete capability/roadmap language claiming saved configuration comparison was missing.
- Added no acceptance entity, schema version, API, backend dependency, migration, route, phone layout, or compatibility layer.

## Files and migration impact

- Domain/UI: `src/forecasting/forecastCandidateComparison.js`, `src/components/forecasting/ForecastCandidateComparisonDialog.vue`, `src/components/ForecastingWorkspace.vue`, `src/components/forecasting/ForecastingWorkbench.vue`.
- Simplification: `src/composables/forecasting/useForecastProjectLibrary.js`, `src/composables/useForecastingWorkspace.js`.
- Tests/fixture: focused domain, dialog, workspace suites; `tests/smoke/planning.spec.js`; `tests/fixtures/forecast-candidate-comparison.json`.
- Product/specification: `FCAST-004`, `specs/README.md`, capability assessment, roadmap, `interviews.md`, and this audit.
- Migration impact: none. Comparison reads existing saved snapshots. Legacy projects without complete holdout rows remain readable and editable.
- Pre-existing untracked `launch-wfmtoolkit.command` was preserved and excluded.

## Exact verification

- Focused Vitest: 3 files, 36 tests passed after the workspace integration and empty-state tests were added.
- Targeted Chromium: `compares saved forecast candidates on identical holdout actuals` — 1 test passed.
- `npm run verify:full` passed:
  - ESLint.
  - frontend standards check.
  - Vitest: 80 files, 413 tests passed.
  - production build: 837 modules transformed.
  - Playwright Chromium: 18 tests passed.
- `git diff --check` passed before audit creation and is rerun on the final tree.
- No Python/backend behavior changed, so backend unit tests were not applicable.

The existing Playwright `NO_COLOR`/`FORCE_COLOR` warning remained non-failing.

## Desktop, interaction, and state review

The real restored staffing-group forecast workflow was reviewed in the in-app browser at:

- 1280×800: 1152×768 px dialog; one contained content scroller (`570` px client / `1241` px scroll); no document horizontal overflow.
- 1440×900: 1152×868 px dialog; one contained content scroller (`670` / `1241`); no document horizontal overflow.
- 1920×1080: 1152×1048 px dialog; one contained content scroller (`850` / `1241`); no document horizontal overflow.
- 1152×720, representing a 1440 px desktop at 125% zoom: 1120×688 px dialog; one contained content scroller (`490` / `1241`); no document horizontal overflow.

Verified comparable populated state, exact test-scope disclosure, metric/configuration alignment, changed/same text, reference autofocus, close restoration to `Compare Forecasts`, and normal resizing. Unit coverage verifies empty eligibility and incompatible actuals. Loading and persistence behavior are unchanged. The live browser emitted the pre-existing `vue-echarts` invalid default-slot warning; it did not originate in the comparison dialog and no error was emitted.

## Strategy, roadmap, and interview updates

- Updated `CAP-FORE-002` evidence and gap language through `FCAST-004`; scores remain `5/3/4/4/4/4` (Need 25).
- Recorded the fourth `NOW-005` slice and narrowed remaining scope to rolling-origin evidence plus governed acceptance/rejection.
- Updated `INT-002` decision scope without changing its empty `Answer:` field. No answer was detected or applied, and no duplicate question was added.
- `INT-003`, `NEXT-003`, Later, Explore, and Retired decisions are unchanged.

## Compatibility, risks, limitations, and follow-ups

- Identical holdout actuals make the displayed accuracy metrics comparable, but they do not prove the same training data provenance; training-period labels and each candidate's benchmark remain visible to aid review.
- Interval coverage can differ partly because interval widths differ; each saved width is shown and coverage interpretation warns against treating the delta alone as quality.
- Comparison does not yet include rolling-origin stability, staffing consequence, an analyst decision reason, approval, or threshold. Those remain dependent on `INT-002`.
- Candidate names are not immutable versions; the workflow compares the saved snapshots currently stored on the device.
- The backup fixture is test-only and contains synthetic data.

## Three linked candidates considered

1. Capability/workflow — selected: `CAP-FORE-002`, `NOW-005`; compare saved model configurations on identical holdout actuals with neutral metrics and settings. This was executable without inventing `INT-002` policy.
2. Desktop UX/trust — `CAP-REP-002`, `CAP-UX-001`; standardize stale/error correction actions in retained call-center reporting. Valuable, but broader and less directly supported by the active roadmap slice.
3. Deletion/simplification — selected supporting cleanup: remove the forecast `isDirty` state and deep watcher because no component, save guard, route, or status message consumed it. A repository-backed transient draft replacement remains deferred until it can preserve recovery behavior.
