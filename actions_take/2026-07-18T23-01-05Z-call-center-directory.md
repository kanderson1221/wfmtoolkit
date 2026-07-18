# Call-center directory replaces portfolio reporting

Run type: product improvement

## Scope and decision

- Capabilities: `CAP-REP-001`, `CAP-REP-002`, `CAP-UX-001`, `CAP-IO-001`
- Roadmap: implemented `RET-002`; preserved completed-then-superseded `NOW-001` and `NOW-003`; retained ready `NOW-004`
- Interview evidence: applied sponsor answer `INT-001` verbatim and moved it from Open to Applied
- Planner persona: workforce planner managing operating units and opening the correct staffing-group planning context
- Planner decision: identify and open the call center that owns the forecasts, actuals, and annual plans to be managed
- Desktop workflow: scan an alphabetized call-center directory, compare identity and operating context, then Open, edit, delete, or create a center
- Product disposition: remove cross-center portfolio reporting from the planning home and retain selected-year aggregate reporting inside the call-center/staffing-group workflow
- Review scope: home page composition, report-only calculation and export paths, navigation/dialog regressions, specifications, strategy, and sponsor history

## Opportunity and evidence

The prior run asked `INT-001` whether partial portfolio totals needed a minimum coverage threshold. The sponsor answered that the portfolio reporting on the home screen should be deleted entirely, leaving only the call-center list because aggregate reporting already exists with staffing groups. The answer changes the product boundary rather than merely tuning a reporting policy.

Repository evidence supported a coherent deletion:

- `PlanningHome.vue` had grown to 849 lines and combined organization management with an annual year selector, eight KPIs, incomplete-scope review, a 12-month report, CSV export, a staffing waterfall, and risk-ranked center reporting.
- `PlanningCenterView.vue` and `usePlanningCenterWorkspace.js` already use `annualPlanningRollup.js` for selected-year call-center/staffing-group aggregate reporting.
- `PlanningPortfolioHeadcountChart.vue`, `portfolioCsv.js`, their focused tests, and the group-level `coverage` evidence branch were used only by the rejected home report.
- `PORT-001` through `PORT-005` specified the retired surface and conflicted with the sponsor direction.

The planner decision is organizational selection, not cross-center staffing action. The home therefore needs stable identity, operating context, and visible management actions; selected-year staffing metrics belong after the planner opens a center.

## Product decision and WFM rationale

Decision: **simplify and remove**.

- Cross-center totals can imply false comparability when staffing groups use different operating contexts, planning readiness, or potentially shared capacity.
- A global year selector and partial-coverage policy add decision overhead before the planner has selected an operating scope.
- Call-center and staffing-group reports preserve the relevant ownership, current-plan lineage, actuals context, and reconciliation path.
- The retained directory shows staffing-group count and operating schedule because those are organizational identifiers, not portfolio performance measures.
- Call centers are sorted by name rather than staffing risk, peak requirement, or volume; the directory no longer embeds an unrequested prioritization model.

No calculation formula, unit, plan snapshot, actuals record, current-plan selection, or persisted schema changed. `annualPlanningRollup.js` remains the retained call-center aggregation engine.

## Scores

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need before | After | Need after | Rationale |
|---|---:|---:|---:|---:|---|
| `CAP-REP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Strong reporting remains in the accepted call-center/staffing-group scope; rejected home duplication is not capability completeness. |
| `CAP-REP-002` | `5/3/3/4/4/4` | 30 | unchanged | 30 | Removing the ambiguous home report improves coherence but does not resolve stale/error consistency in retained reports. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | The home workflow is materially simpler, but one surface does not justify a cross-product score change. |
| `CAP-IO-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | The unneeded portfolio export was removed; retained import/export workflows remain strong. |

## Plan and acceptance criteria

1. Replace the reporting home with a call-center directory composed from shared wrappers and a native table.
2. Keep call-center identity, staffing-group count, operating days/hours, visible Open, and accessible edit/delete actions.
3. Remove the planning-year selector, KPIs, partial-coverage disclosure, monthly report, CSV, chart, reporting empty states, risk status, and report-derived sorting/columns.
4. Remove report-only components, utilities, tests, and annual-rollup coverage evidence while preserving call-center aggregation.
5. Replace retired portfolio specifications with a bounded `PLAN-012` call-center reporting contract and update foundation, organization, navigation, actuals, data, screen, strategy, and interview references.
6. Preserve call-center creation, edit, deletion, deep links, local data, aggregate reports, and desktop accessibility.
7. Pass focused tests, full build, full unit tests, lint, standards, smoke flows, `git diff --check`, and 1280/1440/1920 desktop review.

Acceptance result: met. The home contains only the directory and its management workflow; call-center reporting remains unchanged; report-only code has no remaining runtime reference.

## Implementation and removals

- Rebuilt `PlanningHome.vue` as a compact page header plus `AppTableShell` native table.
- Added alphabetic center ordering and visible operating-day/hour context without derived staffing metrics.
- Preserved wrapped Create/Edit settings and shared delete confirmation; create-dialog entry focus remains on Call Center Name.
- Replaced ten portfolio-oriented component tests with four directory-focused behavior tests and updated smoke terminology/headings.
- Removed the annual rollup's portfolio-only group inclusion-evidence branch while retaining summary/monthly aggregation for call-center reporting.
- Added `PLAN-012` as the retained call-center annual rollup/reporting contract.
- Applied `INT-001`, added `RET-002`, and recalibrated reporting evidence without inflating or lowering scores.

Removed product/code surface:

- planning-home year selector, eight KPI cards, partial-coverage disclosure, report-specific empty state, 12-month operating table, CSV action, waterfall chart, and risk-ranked command columns
- `PlanningPortfolioHeadcountChart.vue` and its 109-line test
- `portfolioCsv.js` and its 51-line test
- obsolete rollup coverage-entry/finalization logic and its focused test
- retired `PORT-001` through `PORT-005` specifications
- report-only icons, formatters, state, imports, helpers, and browser-download path

The run changes 29 existing files, adds `PLAN-012` and this audit, and removes approximately 2,284 lines while adding approximately 230 before this audit record.

## Standards and review findings

- No PrimeVue import exists outside `src/components/ui`.
- `AppPageHeader`, `AppPanel`, `AppEmptyState`, `AppTableShell`, `AppButton`, `AppMenu`, and `AppConfirmDialog` supply shared behavior and styling.
- The directory remains a semantic native table with scoped headers and contained horizontal overflow.
- Visible Open actions support frequent navigation; icon-only overflow actions have center-specific accessible names.
- The create dialog retains visible labels, keyboard focus, wrapped fields, dialog focus containment, and text validation.
- No legacy semantic class, phone-only transformation, touch-only interaction, or page-local PrimeVue styling was introduced.
- Existing local browser data was not cleared or mutated during visual review; the create dialog was opened and canceled without save.

## Files and compatibility

- Product UI: `src/components/PlanningHome.vue`
- Retained aggregate logic: `src/planner/annualPlanningRollup.js`
- Tests: `src/components/__tests__/PlanningHome.spec.js`, `src/planner/__tests__/annualPlanningRollup.spec.js`, `tests/smoke/planning.spec.js`, `tests/smoke/calculator.spec.js`
- Removed code/tests: `src/components/planning/PlanningPortfolioHeadcountChart.vue`, `src/components/__tests__/PlanningPortfolioHeadcountChart.spec.js`, `src/planner/portfolioCsv.js`, `src/planner/__tests__/portfolioCsv.spec.js`
- Specifications: added `specs/planning/PLAN-012-call-center-reporting.md`; removed `specs/portfolio/PORT-001` through `PORT-005`; updated the specification index and affected foundation, organization, navigation, actuals, planning, data, and workflow contracts
- Strategy/sponsor channel: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, `interviews.md`

Migration impact: none. Center IDs, group descendants, plans, actuals, forecasts, backups, Dexie schema, route hashes, and call-center reporting records are unchanged. The removed CSV was derived on demand and stored no user data.

## Verification

- Focused regression: `npm test -- --run src/components/__tests__/PlanningHome.spec.js src/planner/__tests__/annualPlanningRollup.spec.js`
  - Passed: 2 files, 7 tests.
- `npm run build`
  - Passed: Vite production build, 829 modules transformed.
- `npm test`
  - Passed: 72 files, 382 tests.
  - Emitted the existing Node warning that `--localstorage-file` had no valid path; it did not fail the run.
- `npm run lint -- --quiet`
  - Passed with no ESLint errors.
- `npm run check:standards`
  - Passed: frontend standards check.
- `npm run test:e2e`
  - Passed: 15 Chromium tests.
  - Emitted the existing `NO_COLOR`/`FORCE_COLOR` warning; it did not fail the run.
- `git diff --check`
  - Passed before audit creation and shall be repeated on the final tree.

## Desktop review

The in-app browser control skill was used against the real local application with an existing one-center/two-group directory state. Existing browser data was left untouched.

- 1280 × 900: body client/scroll width was 1265/1265 px; table container client/scroll width was 1231/1231 px. Header action, five headers, row identity, Open, and overflow action were visible with no horizontal overflow.
- 1440 × 900: body width was 1425/1425 px; app frame was 1408 px; table was 1406 px; table container was 1391/1391 px. The directory used the full desktop width without oversized report surfaces.
- 1920 × 1000: body width was 1905/1905 px; app frame was 1865 px; table container was 1863/1863 px. The wide workspace remained calm and readable.
- Content/state: `Planning Year` and `Portfolio Monthly Operating Plan` were absent. Empty state is covered by focused component tests; populated state was visually reviewed.
- Keyboard/focus: opening New Center focused the labeled Call Center Name field. Cancel closed the dialog without saving. Row Open and overflow controls expose meaningful accessible names.
- Console: no errors.
- Browser viewport override was reset and the temporary review tab was finalized.

## Rotation and portfolio balance

The last code-review-and-remediation audit is three completed runs back, so the one-in-ten rotation does not require a review. This is the fourth non-review run in the active strategy cadence, so the fifth-run strategic portfolio review is not yet due.

Recent non-review runs delivered a no-plan reporting state, atomic forecast replacement, partial-coverage reporting, and now a sponsor-directed desktop simplification. This run is a substantive user-facing workflow and desktop UX improvement with first-class code deletion, satisfying rolling portfolio balance rather than adding another maintenance-only change.

## Strategy and interview updates

- Preserved the sponsor's `INT-001` answer verbatim, marked it Applied, recorded interpretation/action separately, and added no new question.
- Added `RET-002` for the retired cross-center home report.
- Preserved `NOW-001` and `NOW-003` as completed historical decisions, then explicitly marked them superseded by `INT-001` rather than rewriting history.
- Reframed `CAP-REP-001` evidence around retained call-center/staffing-group reporting and kept Need at 20.
- Kept `CAP-REP-002` Need at 30 and `CAP-UX-001` Need at 32 because broader stale/error integrity and cross-product desktop consistency remain unresolved.
- Added the transition to the roadmap decision log and retained ready `NOW-004` scenario comparison.

## Risks, limitations, and follow-ups

- Cross-center reporting and its CSV are intentionally no longer available. A future request for leadership portfolio reporting should first establish a distinct evidence-backed workflow rather than reusing the directory.
- `annualPlanningRollup.js` retains its historical name because it is used by call-center reporting; renaming the module would create churn without changing planner behavior.
- Shared-pool and multi-skill non-additivity remain unresolved. `PLAN-012` makes independent-group aggregation explicit.
- Retained call-center reporting still has uneven stale/error and mixed-scope handling, reflected in `CAP-REP-002` rather than hidden by this deletion.
- The next non-review run is the fifth in the current cadence and must be a strategic portfolio review plus one product improvement unless a code-review rotation or urgent risk supersedes it.

## Linked candidates considered

1. Capability/workflow — ready `NOW-004`, `CAP-SCEN-001`, `CAP-UX-001`: side-by-side Budget/Update comparison with assumption deltas and monthly staffing exceptions inside a selected staffing-group context.
2. Desktop UX/trust — `CAP-REP-002`, `CAP-UX-001`: standardize retained report stale/error states and keep correction actions visible beside the affected call-center or staffing-group result.
3. Deletion/simplification — `CAP-IO-001`: consolidate the remaining duplicate backup and actuals-gap Blob/object-URL download lifecycles into the shared browser-download primitive and remove local cleanup code.
