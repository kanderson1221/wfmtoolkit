# Forecast accuracy now shows stability across historical cutoffs

Run type: product improvement

## Capability, roadmap, and interview scope

- Capabilities: `CAP-FORE-002`, supporting `CAP-UX-001` and `CAP-GOV-001`.
- Roadmap: completed the fifth and final evidence slice of `NOW-005`; separated sponsor-specific acceptance governance into dependency-bound `NEXT-004`.
- Interview evidence: `INT-002` remains Open. It is now scoped to decision fields, evidence policy, and warning thresholds for `NEXT-004`; no answer text was present or changed.
- Planner persona: forecast analyst or capacity planner reviewing a modeled daily demand forecast before save or handoff.
- Planner decision: determine whether the model's advantage over a transparent weekday baseline repeats across historical cutoffs or depends on one favorable latest holdout.
- Desktop workflow: staffing group → Forecasts → modeled forecast → Contacts → Forecast accuracy review → Accuracy across historical cutoffs.

## Opportunity and evidence

`FCAST-001` supplied one leakage-safe latest holdout, but a single test period cannot show temporal stability. The capability assessment and in-progress `NOW-005` both named rolling-origin validation as the remaining safe evidence gap. Repository inspection found the backend constructed every metric, benchmark, row, and comparison inside one latest-window function; the result UI had no earlier-cutoff evidence even though analysts were already expected to compare saved configurations.

This slice was executable without `INT-002`: repeated historical scoring is neutral mathematical evidence, while acceptance thresholds and approval semantics depend on the sponsor's actual planning decision and remain intentionally unimplemented.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-FORE-002` | `5/3/4/4/4/4` | 25 | `5/4/4/4/4/4` | 20 | The workbench now covers contact/AHT holdouts, traceable adjustments, compatible saved candidates, and rolling-origin stability; governed acceptance remains separate. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | This dense result is contained and scanable at supported widths, but product-wide shortcuts, sticky context, focus, and zoom consistency remain uneven. |
| `CAP-GOV-001` | `4/3/4/3/3/4` | 26 | unchanged | 26 | Evidence is reproducible and retained, but no analyst identity, approval, event audit, or acceptance record exists. |

## Product disposition and WFM rationale

Disposition: improve and complete the retained forecast-evidence workflow; consolidate its scorer; defer organizational acceptance policy.

- Let `H` be configured holdout observations and `N` be available training-history observations after operating-day filtering.
- The latest fold scores rows `[N-H, N)`. Up to two earlier non-overlapping folds score `[N-2H, N-H)` and `[N-3H, N-2H)` when each leaves at least 14 preceding training rows.
- Every fold fits the configured model only on rows before its test start. The eight-week same-weekday benchmark also reads only that fold's training rows.
- Manual changepoints outside an individual fold's training range are excluded from that fit; they become applicable only after entering a later training window.
- Each fold uses `WAPE = 100 × Σ|F-A| / ΣA`, `MAE = Σ|F-A| / n`, `bias = Σ(F-A) / n`, and interval coverage from the configured modeled bounds.
- WAPE remains unavailable when a fold's total actual contacts are zero; such a fold is not counted as a model or benchmark win.
- The summary reports model-lower-WAPE frequency and the modeled WAPE range without averaging folds into false precision or accepting/rejecting the forecast.
- Contacts are daily observations, metrics retain contacts/day or percent units, and no AHT, workload, staffing, service-level, shrinkage, or planning formula changed.

## Standards reviewed and findings

- Reused `AppButton`, `AppStatusMessage`, and `AppTableShell`; no feature-level PrimeVue import, legacy semantic class, raw dialog, or new local primitive was added.
- Kept semantic native tables with text outcomes (`Model lower`, `Baseline lower`, `Same WAPE`, `WAPE unavailable`) so meaning does not depend on color.
- Units, tested dates, training cutoff, window count, and method limitations remain visible without a tooltip.
- The existing Contacts result structure remains primary; stability evidence follows the current holdout instead of becoming a dashboard or disconnected page.
- The backend's duplicated single-window metric and row construction was extracted into one fold scorer used by every cutoff, so current and historical evidence cannot drift.

## Rotation and portfolio balance

The prior completed audits include `2026-07-19T11-09-07Z-focus-safe-confirmations.md` as a code-review/remediation run within the previous nine records, so this run is not the tenth-run review. The preceding strategic portfolio review was `2026-07-19T12-15-44Z-traceable-plan-updates.md`; only one ordinary run followed it before this run, so this is not the fifth-run portfolio review.

Recent non-review delivery includes traceable plan updates, saved-forecast comparison, and this user-facing validation workflow. This run supplies both a forecasting capability enhancement and substantive desktop evidence UX; it is not a defect-only or maintenance run.

## Scope, plan, and acceptance criteria

1. Generalize leakage-safe holdout scoring into a reusable fold contract.
2. Score the latest and up to two earlier equal, non-overlapping windows.
3. Expose chronological model/baseline evidence and a fold-level CSV beneath the current review.
4. Preserve zero-volume, limited-history, manual-changepoint, and legacy behavior.
5. Add backend, pure-domain, component, workspace, fixture, and Chromium regressions.
6. Update `FCAST-005`, capability scores, roadmap sequencing, interview scope, and the audit trail.

Acceptance criteria achieved:

- Three feasible folds use training counts `14`, `17`, and `20` with equal three-row test windows in the backend regression.
- The earliest fit excludes a later manual changepoint; the latest fit applies it after it enters training history.
- A one-fold run explains exactly how many earlier observations another cutoff requires and remains usable.
- Legacy results without `rollingOrigin` remain on the existing single-holdout review without fabricated evidence or migration.
- Every fold exposes tested dates, training cutoff, model/baseline WAPE, bias, interval coverage, and a text outcome.
- The CSV contains one reconciled row per fold and blanks unavailable numeric values through the shared exporter.
- No automatic acceptance state, threshold, route, entity, or stored decision is created.

## Implementation and removals

- Added a three-fold rolling-origin contract to `backend/app/forecasting.py`, retaining the current holdout as the latest fold and storing compact prior-fold summaries inside its diagnostics.
- Extracted shared accuracy calculation and fold construction from the prior monolithic latest-holdout function, removing repeated metric, benchmark, interval, row, and comparison mechanics.
- Added rolling-origin interpretation and CSV construction to `forecastAccuracyReview.js`.
- Added a chronological desktop table and `Download Stability CSV` action directly under the current holdout review.
- Expanded the synthetic saved-candidate fixture and Chromium flow so a restored real route proves the stability review and existing comparison workflow coexist.
- Added `FCAST-005`; completed `NOW-005`; moved acceptance governance to `NEXT-004` pending `INT-002`.
- Added no schema version, database table, API route, dependency, acceptance object, average score, phone layout, or compatibility layer.

## Files and migration impact

- Backend/domain: `backend/app/forecasting.py`, `src/forecasting/forecastAccuracyReview.js`.
- Desktop UI: `src/components/forecasting/ForecastAccuracyReview.vue`.
- Tests/fixture: backend unit suite; forecast review domain/component/workspace suites; `tests/fixtures/forecast-candidate-comparison.json`; `tests/smoke/planning.spec.js`.
- Product/specification: `FCAST-005`, `specs/README.md`, capability assessment, roadmap, `interviews.md`, and this audit.
- Migration impact: none. New runs retain `rollingOrigin` inside the already persisted diagnostics object. Older snapshots remain readable and unchanged.
- Pre-existing untracked `launch-wfmtoolkit.command` was preserved and excluded.

## Exact verification

- Focused backend: `.venv/bin/python -m unittest backend.tests.test_forecasting` — 15 tests passed.
- Focused frontend: 3 Vitest files, 41 tests passed.
- Backend regression suite: `.venv/bin/python -m unittest discover -s backend/tests` — 36 tests passed.
- Targeted Chromium: `compares saved forecast candidates on identical holdout actuals` — 1 test passed.
- `npm run verify:full` passed:
  - ESLint.
  - frontend standards check.
  - Vitest: 80 files, 417 tests passed.
  - production build: 837 modules transformed.
  - Playwright Chromium: 18 tests passed.
- `git diff --check` passed before audit creation and is rerun on the final tree.

The existing `NO_COLOR`/`FORCE_COLOR`, Node local-storage-path, and optional Plotly import warnings remained non-failing. The first attempted backend command used unavailable `python`; the configured `.venv/bin/python` runtime was then used for both backend suites.

## Desktop, interaction, and state review

The restored synthetic staffing-group forecast route was reviewed in the in-app browser:

- 1280×800: document `1265/1265` client/scroll width; review `1157` px wide; both table scrollers `1155/1155`.
- 1440×900: document `1425/1425`; review `1317` px; both table scrollers `1315/1315`.
- 1920×1080: document `1905/1905`; review `1789` px; both table scrollers `1787/1787`.
- 1152×720, representing a 1440 px desktop at 125% zoom: document `1137/1137`; review `1081` px; both table scrollers `1079/1079`.

No document or table overflow occurred at those widths. Populated current/earlier windows, long status copy, stable columns, text outcomes, export actions, and coexistence with the chart and model-parameter rail were inspected. The browser emitted no errors. Unit coverage verifies the one-fold limitation and legacy/no-stability state; loading and forecast-run errors are unchanged. Keyboard behavior is unchanged because the slice adds only a normal shared button and native table.

## Strategy, roadmap, and interview updates

- Improved `CAP-FORE-002` Completeness from 3 to 4 and Need from 25 to 20; WFM Correctness, Desktop UX, Trust, and Engineering Health remain 4.
- Completed `NOW-005` as the forecast evidence workflow rather than leaving an executable item blocked on unanswered organizational policy.
- Added `NEXT-004` for governed acceptance/rejection, explicitly dependent on `INT-002`.
- Narrowed `INT-002` decision scope without changing its empty `Answer:` field. No new question was added; Open questions remain at two.
- Scheduling, intraday, shared persistence, administration, finance, and retired phone/cross-center-reporting decisions are unchanged.

## Compatibility, risks, limitations, and follow-ups

- A modeled run now performs up to three validation fits plus the final production fit; runtime can increase for expensive Prophet or MCMC configurations. The three-fold cap bounds this cost, but no asynchronous progress breakdown is shown.
- Equal observation counts do not guarantee equal calendar duration when closed days are filtered; the UI discloses exact test dates and treats the rows as scored daily observations.
- Earlier folds preserve the configured model except for manual changepoints not yet inside training. Built-in and custom holiday configuration remains available to each fit; later actuals never enter training or the weekday benchmark.
- Three windows improve stability evidence but do not replace longer backtesting, a rolling-origin distribution, peak/workload/staffing consequence, or sponsor-specific acceptance criteria.
- `NEXT-004` remains blocked on `INT-002`; no threshold should be inferred from this run's model-win count.

## Three linked candidates considered

1. Capability/workflow — selected: `CAP-FORE-002`, `NOW-005`; add leakage-safe rolling-origin stability beneath the current holdout and complete the neutral evidence workflow.
2. Desktop UX/trust — `CAP-REP-002`, `CAP-UX-001`; standardize stale/error correction actions in retained call-center reports. Valuable and executable, but less directly connected to the active forecast gap and deferred to a future bounded slice.
3. Deletion/simplification — selected supporting cleanup: replace the monolithic latest-window scorer's repeated metric/benchmark/row mechanics with one reusable fold scorer. Broader forecast inspector or backend API deletion lacked evidence and was not pursued.
