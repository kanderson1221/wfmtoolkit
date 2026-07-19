# Saved annual plans now compare decision-grade scenario evidence

Run type: strategic portfolio review + product improvement

## Scope and decision

- Capabilities: `CAP-SCEN-001`, `CAP-UX-001`; supporting `CAP-LRP-001`, `CAP-REP-001`, and `CAP-IO-001`
- Roadmap: completed `NOW-004`; promoted forecast accuracy and uncertainty review from `NEXT-002` to ready `NOW-005`
- Interview evidence: retained applied `INT-001`; added open `INT-002` for the forecast acceptance decision that will shape `NOW-005`
- Planner persona: long-range WFM planner or planning lead maintaining Budget and Update plans
- Planner decision: determine whether a saved Update materially changes Budget demand, workload, requirement, supply, or staffing risk and whether the operating plan should remain current
- Desktop workflow: open one staffing group's Plans tab, select Compare Plans, review Budget versus current Update by default, change either saved plan if needed, and export the complete monthly evidence
- Product disposition: improve the retained saved-plan library with a read-only same-year comparison; do not add speculative free-form branching in this slice
- Review scope: complete capability inventory and dependencies; scenario strategy; saved calculation semantics; Plans desktop UI; dialog accessibility; CSV output; obsolete inline variance surface; specifications and sponsor queue

## Opportunity and evidence

`NOW-004` was the highest-value executable item after the sponsor-directed home simplification. Versioned plan snapshots, Budget/Update lineage, current-plan selection, monthly demand/requirement records, staffing supply, and CSV primitives already existed, but planners had to open plans serially. The library offered only a cramped four-line `Vs Budget` cell per Update and no assumption lineage, monthly exception review, method-compatibility boundary, or export.

Repository evidence:

- `PLAN-001`, `ACT-004`, and `ACT-006` define immutable Budget/Update lineage and Budget comparisons.
- `usePlanningCenterWorkspace.js` already rebuilt row summaries from saved snapshot inputs but discarded monthly comparison evidence.
- Workload Ratio and Intraday Erlang requirements have different semantics; a raw delta across methods would create false comparability.
- `csvExport.js` already owns safe browser CSV generation and download lifecycle.
- The last audit explicitly identified `NOW-004` as the next capability candidate and stated that this run is the fifth non-review run, requiring a strategic portfolio review plus product improvement.

## Strategic portfolio review

The complete canonical inventory, missing capabilities, dependencies, roadmap order, desktop gaps, recent rotation, and interview queue were reassessed.

- Scheduling (`CAP-SCHED-001`, Need 100) remains Later because no employee, labor-rule, shift, skill, or optimizer model exists.
- Intraday management (`CAP-INTRA-001`, Need 80) remains dependency-blocked by interval actuals, schedules/capacity feeds, shared data, and action ownership.
- Shared persistence (`CAP-DATA-002`, Need 71), administration (`CAP-ADMIN-001`, Need 60), and financial planning (`CAP-FIN-001`, Need 60) remain outside Now because tenancy/conflict, identity, or accounting semantics are unresolved.
- Forecast accuracy (`CAP-FORE-002`, Need 40) is the highest-value executable gap after comparison and was promoted to `NOW-005`.
- The sponsor queue had zero open questions. `INT-002` now asks for the real forecast accept/reject decision, holdout period, evidence, and rejection threshold; it does not block other safe work.
- No score was inflated for broad desktop UX: `CAP-UX-001` remains Need 32 because keyboard shortcuts, zoom consistency, focus restoration, and sticky context remain uneven across the product.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need before | After | Need after | Rationale |
|---|---:|---:|---:|---:|---|
| `CAP-SCEN-001` | `5/3/4/3/4/3` | 32 | `5/4/4/4/4/4` | 20 | Saved plans now compare lineage, assumptions, annual outcomes, material monthly exceptions, and complete monthly export with explicit method compatibility. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | The dialog is a substantive desktop improvement, but the score is product-wide. |
| `CAP-LRP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Comparison deepens the strong annual workflow; explicit what-if branching and cost remain gaps. |
| `CAP-REP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Saved-plan reconciliation improves, while contributor export and shared-pool semantics remain limited. |

## WFM rationale, formulas, units, and interpretation

- Delta direction is always `candidate - baseline`; the dialog and specification state this explicitly.
- Default baseline is the same-year Budget; default candidate is the current Update, falling back to another same-year plan.
- Annual contacts are contacts; workload and required capacity are hours; requirement, supply, and gaps are decimal headcount.
- Each snapshot is recalculated from its saved operating calendar, demand source, paid-time/presence inputs, occupancy/adherence, staffing roll-forward, training inputs, and starting headcount.
- Saved Intraday Erlang monthly outputs are merged before summarization so the comparison does not substitute workload-ratio requirements.
- Contacts and workload remain comparable across requirement methods. Required hours, required headcount, ending frontline supply, and staffing-gap deltas are withheld when methods differ because their operating interpretation is not equivalent.
- Missing and withheld values remain unavailable, not zero. CSV fields for incompatible deltas are blank.
- Material monthly exceptions use absolute thresholds of 1 contact or 0.05 headcount; export retains all 12 rows for reconciliation and avoids hiding sub-threshold evidence.
- The comparison is read-only: it writes no plan, forecast, current-plan flag, actuals, or settings data.

## Plan and acceptance criteria

1. Add a visible Compare Plans action only when a year contains at least two saved plans.
2. Default selectors to Budget and current Update while allowing any two same-year saved plans.
3. Show saved lineage/assumptions, annual demand/requirement/supply outcomes, and material monthly exceptions with explicit units.
4. Reconcile Workload Ratio and stored Intraday Erlang snapshots without reading current group defaults in place of saved plan values.
5. Name and withhold method-dependent deltas when requirement methods differ.
6. Export the complete 12-month comparison through the shared CSV primitive.
7. Use shared wrappers, native tables, contained horizontal overflow, text-based change states, autofocus, keyboard-operable selectors/actions, and a fixed dialog footer.
8. Remove the redundant per-row `Vs Budget` block and unused row-level variance calculations.
9. Update normative specifications, capability evidence/scores, roadmap, interview queue, tests, and the audit trail.
10. Pass focused tests, build, full tests, lint, standards, end-to-end smoke tests, diff checks, and 1280/1440/1920 desktop review.

Acceptance result: met.

## Implementation and removals

- Added `planScenarioComparison.js` as pure planner logic for snapshot reconstruction, saved Erlang-result merging, annual/monthly deltas, compatibility withholding, and CSV rows.
- Added `PlanningPlanComparisonDialog.vue` using `AppDialog`, `AppSelect`, `AppButton`, `AppStatusMessage`, `AppTableShell`, `AppEmptyState`, and native tables.
- Added Compare Plans to each eligible year header in `PlanningCenterView.vue`; single-plan years remain unchanged.
- Defaulted focus to the labeled Baseline plan selector after browser review found that the opener initially retained focus outside the modal.
- Replaced the list's seven-column metrics grid with a calmer six-column grid and removed the repeated four-line `Vs Budget` cell.
- Removed plan-row contacts, required-hours, required-headcount, and gap variance calculations/labels that became unreachable. Call-center summary Budget comparisons remain because they support a different retained report.
- Replaced stale specification text that still described retired portfolio report modes with the current call-center current-plan/Budget-fallback contract.
- Added `PLAN-013` and updated specification index, scope traceability, screen inventory, and Plan Library wireframe.

No dependency, route, persisted schema, migration, or compatibility layer was added. Existing saved plans need no migration; comparison falls back to saved summary metrics when an older snapshot lacks fully reconstructable fields.

## Standards and review findings

- No PrimeVue import exists outside `src/components/ui`; the new feature composes shared wrappers.
- Annual outcomes, assumption lineage, and monthly exceptions use semantic native tables with scoped headers and contained horizontal overflow.
- Candidate-minus-baseline direction, units, Changed/No change states, and Not comparable states are textual and do not rely on color.
- The modal's first select has a visible label and autofocus; actions have meaningful names; the footer stays reachable while the content scrolls.
- No legacy semantic class, page-local PrimeVue styling, phone-only transformation, touch-only action, or mobile navigation work was introduced.
- The in-app browser review found and fixed one focus defect before final verification; the browser console reported no errors.

## Files and data compatibility

- Planner logic/tests: `src/planner/planScenarioComparison.js`, `src/planner/__tests__/planScenarioComparison.spec.js`
- UI/tests: `src/components/planning/PlanningPlanComparisonDialog.vue`, `src/components/planning/PlanningCenterView.vue`, `src/components/__tests__/PlanningPlanComparisonDialog.spec.js`, `src/components/__tests__/PlanningCenterView.spec.js`
- Simplified orchestration: `src/composables/planning/usePlanningCenterWorkspace.js`
- Specifications: `specs/planning/PLAN-013-plan-scenario-comparison.md`, `specs/README.md`, `specs/foundation/FOUND-001-planning-workspace-scope.md`, `specs/design/SCREEN-WORKFLOWS.md`
- Strategy/sponsor: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, `interviews.md`
- Audit: this file

Data compatibility: read-only and backward compatible. Stored IDs, plan lineage, snapshots, current selection, forecasts, actuals, drafts, and Dexie schemas are unchanged. No data was imported, cleared, or saved during browser review.

## Exact verification

- Focused comparison and integration tests: `npm test -- --run src/planner/__tests__/planScenarioComparison.spec.js src/components/__tests__/PlanningPlanComparisonDialog.spec.js src/components/__tests__/PlanningCenterView.spec.js`
  - Passed: 3 files, 31 tests.
- `npm run build`
  - Passed: Vite production build; 831 modules transformed.
- `npm test`
  - Passed: 74 files, 388 tests.
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

The in-app browser-control skill was used against the real local application. The saved plan library was reviewed with existing local data; a temporary development-only, read-only duplicate snapshot supplied the second scenario solely for dialog visual review and was removed before final checks. It did not write browser planning data.

- 1280 × 900 plan library: body client/scroll width was 1265/1265 px; the six-column list and visible actions fit without page overflow.
- 1280 × 900 comparison: dialog client/scroll width was 1246/1246 px and height was 866/866 px; header, two selectors, annual table, assumption table, scrollable content, and fixed export/close footer were usable.
- 1440 × 900 comparison: body width was 1440/1440 px; dialog width was 1278/1278 px; all three table scrollers were 1213/1213 px with no hidden horizontal overflow.
- 1920 × 1000 comparison: body width was 1920/1920 px; dialog remained a readable 1278 px; all tables remained 1213/1213 px rather than stretching across the monitor.
- Dense state: six monthly exceptions, seven annual outcomes, and nine lineage/assumption rows were reviewed. Same-plan selection produced a text warning and disabled export. Sparse/no-change state is covered by focused component tests.
- Keyboard/focus: initial review found focus on the background opener; adding autofocus moved focus into the dialog's labeled Baseline plan selector. Both selectors are native keyboard controls. Dialog footer actions remain visible.
- Console: no browser errors. Temporary viewport overrides were reset and the review tab was finalized.

## Rotation and portfolio balance

The last code-review-and-remediation run is four completed runs back, so the one-in-ten rotation does not require a review. This is the fifth non-review run in the active cadence and is therefore correctly classified as `strategic portfolio review + product improvement`.

Recent non-review runs include reporting integrity, atomic forecast replacement, explicit partial scope, sponsor-directed home simplification, and now a substantive planner capability/desktop workflow. The rolling five contain multiple user-facing workflow and desktop UX improvements plus meaningful deletion; this run is not maintenance-only.

## Strategy and interview updates

- `CAP-SCEN-001` moved from Adequate/Need 32 to Strong saved-plan workflow/Need 20.
- `NOW-004` is completed with delivered scope and success evidence.
- Forecast accuracy/uncertainty moved from `NEXT-002` to ready `NOW-005`; the decision log preserves the promotion.
- `INT-002` was added as the only open question. No owner answer was changed or overwritten; `INT-001` remains verbatim and Applied.
- High-Need capabilities with unresolved prerequisites remain sequenced outside Now with explicit rationale rather than being promoted by score alone.

## Risks, limitations, and follow-ups

- This compares existing saved scenarios; it does not create free-form branches, perturb assumptions, or record a planner decision note.
- Comparison is intentionally same staffing group and same planning year. Cross-group or cross-year deltas have different scope and are not offered.
- Fixed exception thresholds are presentation filters, not materiality policy; the complete CSV preserves all rows.
- Financial cost, multi-skill/shared-pool effects, uncertainty, and governed audit history remain outside this slice.
- Older incomplete snapshots may rely on saved annual summaries while monthly rows reconstruct from available saved inputs; the UI does not claim precision beyond available fields.

## Linked candidates considered

1. Capability/workflow — `CAP-FORE-002`, `NOW-005`, `INT-002`: add forecast holdout accuracy, bias, uncertainty, and an acceptance decision record after clarifying the sponsor's real rejection evidence.
2. Desktop UX/trust — `CAP-REP-002`, `CAP-UX-001`: standardize retained call-center report stale/error states with visible correction actions and focus restoration.
3. Deletion/simplification — `CAP-IO-001`: consolidate backup and actuals-gap Blob/object-URL download lifecycles into the shared browser-download primitive and remove duplicate cleanup/test setup.
