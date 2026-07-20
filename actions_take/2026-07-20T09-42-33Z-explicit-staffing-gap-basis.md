# Staffing plans distinguish opening and ending gaps

Run type: product improvement

## Capability, roadmap, interview, and planner scope

- Primary capability: `CAP-SUP-001`; supporting `CAP-SCEN-001`, `CAP-REP-001`, and `CAP-UX-001`.
- Roadmap: completed `NOW-016` — Explicit opening and ending staffing gaps.
- Interview evidence: applied `INT-005` keeps this work inside staffing-requirement and capacity planning rather than scheduling or same-day operations. Open `INT-004` concerns future shared-plan lock recovery and did not govern this local workflow. No new sponsor answer was detected, applied, or overwritten; no new interview question was justified.
- Planner persona: annual capacity planner reconciling monthly requirements with opening supply, hiring, training readiness, attrition, and the next opening position.
- Planner decision: identify whether a month opens short and whether planned movements produce an adequate ending position without mistaking either point-in-time value for time-weighted in-month capacity.
- Desktop workflow: open annual plan → Staffing Plan → reconcile the monthly supply roll-forward → compare saved Budget/Update positions → use explicitly based report/export evidence.

## Opportunity and evidence

`staffingModel.js` already calculated both:

```text
opening gap = opening frontline headcount - required headcount
ending gap = ending frontline headcount - required headcount
```

The worksheet exposed only `gapToRequirement`, an opening-gap compatibility alias, under the generic label “Gap to Req.” The plan library used “Avg Gap”; saved-plan comparison placed ending frontline supply beside a generic staffing gap; and CSVs exported `staffing_gap` without a basis. A plan could therefore appear to close a shortage by month end while the visible gap still described the opening position, or a downstream CSV consumer could assign the wrong supply basis.

Both values use headcount and the same saved monthly requirement. Negative means short; positive means surplus. They are point-in-time positions. The model does not date or time-weight hires, frontline readiness, or attrition within a month, so neither is presented as average in-month available capacity.

## Product disposition and WFM rationale

Disposition: improve and clarify the retained supply model; do not change its formulas or default reporting basis.

- Expose opening and ending gaps together in the native monthly supply worksheet.
- Keep `gapToRequirement` and `averageGapToRequirement` as opening-gap compatibility aliases so saved plans, drafts, IndexedDB rows, and backups require no migration.
- Continue existing reports on opening frontline supply, but name that basis explicitly.
- Add opening and ending annual/monthly evidence to saved-plan comparison and its complete CSV.
- Do not add employee, shift, activity, schedule, adherence, live actual, same-day recovery, or intraday-management behavior.

No contact, AHT, workload, paid-time, presence, occupancy, adherence, Erlang, requirement, roster, attrition, graduation, frontline-readiness, recommendation, handoff, or finalization calculation changed.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-SUP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | The two existing point-in-time positions are now explicit, but no time-weighted supply, skill mix, recruiting constraint, cost, or probabilistic yield capability was added. |
| `CAP-SCEN-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Saved comparison gains decision-safe gap evidence but still does not branch what-if plans or generate sensitivities. |
| `CAP-REP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Report and CSV semantics are clearer; shared pools and deeper contributor export remain unresolved. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | This slice improves one worksheet, plan list, report header, and dialog, but broader keyboard, focus, zoom, and remaining worksheet-context gaps remain. |

Scores remain calibrated rather than increasing a product-wide dimension for one bounded clarity slice.

## Standards and review findings

- `AGENTS.md`: retained a native worksheet, `AppTableShell`, and shared table fields; no direct PrimeVue feature import, legacy semantic class, generic data table, phone layout, or alternate visual dialect was added.
- `FRONTEND_STANDARDS.md`: preserved the existing page shells and contained desktop overflow; the Decision column group now semantically owns both gap columns.
- Accessibility: opening and ending gaps are separate column headers with explanatory title text; negative/positive text remains present in addition to color; native table scopes and the named keyboard-focusable region remain intact.
- WFM correctness: both formulas reconcile to the same monthly requirement, their time position is explicit, and neither is falsely described as average in-month capacity.
- Data safety: no persisted input, schema version, plan role, route, backup payload, or migration changed. The legacy summary alias remains readable.
- Removal: generic worksheet, plan-list, call-center, dialog, specification, and CSV gap labels were retired. Ambiguous generic comparison properties were replaced with explicit opening/ending fields.

## Scope, plan, and acceptance criteria

1. Expose both calculated gap positions in the staffing worksheet.
2. Compute and compare annual average ending gap from saved monthly snapshots.
3. Replace generic plan/report/dialog/CSV labels with explicit bases.
4. Preserve the opening-gap storage alias and existing report calculations.
5. Update focused unit/component and Chromium workflow/geometry regressions.
6. Update planning specifications, capability evidence, roadmap, and audit history.

Acceptance criteria achieved:

- Opening gap equals opening frontline HC minus required HC.
- Ending gap equals ending frontline HC minus required HC.
- Both values render independently with non-color negative/positive text.
- Plan-library and call-center labels identify opening position.
- Scenario annual outcomes, monthly exceptions, and all 12 CSV rows identify both bases.
- Generic `staffing_gap` CSV headers are absent.
- Incompatible requirement methods withhold both gap deltas.
- Stored plans and compatibility aliases remain migration-free.
- Worksheet and dialog overflow remain contained across tested desktop widths.

## Implementation and removals

- `PlannerStaffingSupplyTable.vue` now renders a 13-column native worksheet with Opening Gap and Ending Gap under the Decision group, retaining a fallback to the legacy opening alias.
- `staffingModel.js` summarizes average ending gap only when every monthly ending gap is valid.
- `planScenarioComparison.js` carries annual and monthly opening/ending evidence, withholds both across incompatible requirement methods, and exports six explicitly named gap fields.
- `PlanningPlanComparisonDialog.vue` displays both annual averages and monthly changes; `PlanningCenterView.vue` names the existing opening basis in its plan list and actual-requirement report.
- The staffing worksheet minimum width increased from 61rem to 66rem so the additional decision column remains readable; horizontal movement stays inside the shared shell.
- Removed generic comparison fields and `baseline_staffing_gap`, `candidate_staffing_gap`, and `staffing_gap_delta` export headers. No compatibility layer beyond the existing stored alias was added.

## Files, migration, and compatibility

- Product logic/UI/styles: `src/planner/staffingModel.js`, `src/planner/planScenarioComparison.js`, `src/components/planner/PlannerStaffingSupplyTable.vue`, `src/components/planning/PlanningPlanComparisonDialog.vue`, `src/components/planning/PlanningCenterView.vue`, `src/styles/planner.css`.
- Tests: focused planner/component specs and `tests/smoke/planning.spec.js`.
- Specifications: `PLAN-008`, `PLAN-012`, `PLAN-013`, and `SCREEN-WORKFLOWS.md`.
- Strategy: capability assessment, roadmap, and this audit.
- Interview: `interviews.md` was read; no owner answer or status changed.
- Migration impact: none. Existing `gapToRequirement` and `averageGapToRequirement` continue to mean opening gap. Older saved plans, drafts, and backups recompute ending gap from their retained monthly inputs and requirement snapshot.
- External CSV compatibility: generic staffing-gap columns were deliberately replaced with explicit opening/ending columns because the prior contract was ambiguous. Consumers must select the intended basis by header.
- The pre-existing untracked `launch-wfmtoolkit.command` was preserved and excluded.

## Exact verification

- Focused Vitest: `npx vitest run src/planner/__tests__/staffingModel.spec.js src/planner/__tests__/planScenarioComparison.spec.js src/components/__tests__/PlannerStaffingSupplyTable.spec.js src/components/__tests__/PlanningPlanComparisonDialog.spec.js src/components/__tests__/PlanningCenterView.spec.js` — 5 files, 48 tests passed.
- Focused Chromium: `npx playwright test tests/smoke/planning.spec.js --project=chromium --grep "keeps monthly staffing supply context visible|requires and exposes updated-plan decision reasons"` — 2 tests passed.
- `npm run verify:full` passed:
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest: 81 files, 433 tests passed.
  - Vite production build: 837 modules transformed successfully.
  - Playwright Chromium: 22 tests passed.
- `git diff --check` passed before audit creation and is rerun on the final tree.
- No Python/backend behavior changed, so backend unit tests were not applicable.

The existing non-failing `NO_COLOR`/`FORCE_COLOR` Playwright warning and Vitest local-storage warning remain unrelated to this slice.

## Desktop, interaction, and state review

Automated Chromium restored the populated multi-plan fixture and verified:

- 1280×900, 1440×900, 1920×1080, and 1152×720: all 13 worksheet columns retain contained vertical review; document horizontal overflow remains absent.
- 1024×768 reduced desktop window: the wider worksheet scrolls on both axes inside its region; the grouped/detail header tiers and Month column remain pinned after movement.
- Saved-plan comparison exposes both annual gap rows and both monthly change columns; its 1260px table remains inside the dialog's horizontal shell.
- Keyboard region naming, table header scopes, dialog focus, plan selection, populated saved evidence, and incompatible-method withholding are covered. Loading, empty, validation, save, and persistence behavior did not change.

No phone view, phone navigation, card transformation, or touch-only interaction was added or reviewed.

## Strategy, roadmap, and interview updates

- Completed `NOW-016` with outcome, evidence, dependencies, delivered/removed scope, and measurable success criteria.
- Refreshed `CAP-SUP-001`, `CAP-SCEN-001`, `CAP-REP-001`, and `CAP-UX-001` evidence and review dates while retaining calibrated Need scores.
- Updated `PLAN-008` to distinguish both point-in-time gaps and explicitly record the lack of time-weighted monthly supply; updated `PLAN-012` and `PLAN-013` to require basis-specific reporting and exports.
- No sponsor answer was detected. `INT-004` remains the only Open interview question; no duplicative or unrelated question was added.

## Rotation and portfolio balance

The immediately preceding run, `NOW-015`, was the required code-review/remediation run, so this run is not another review. The last strategic portfolio review was `NOW-011`; `NOW-012`, `NOW-013`, and `NOW-014` are the three subsequent non-review runs, making this the fourth rather than the fifth. The next non-review run is therefore the strategic portfolio review.

Recent delivery includes substantive desktop UX and scenario work. This slice is a user-facing staffing-supply correctness/trust enhancement with a contained desktop presentation and meaningful ambiguous-surface removal, not defect-only maintenance or phone polish.

## Compatibility, risks, limitations, and follow-ups

- Opening and ending gaps are point-in-time positions. Without dated monthly movements, neither represents average in-month available frontline capacity. `PLAN-008` retains that as an explicit future methodology question.
- The retained report default remains opening position for compatibility; the new ending position is evidence, not a silent change to shortage ranking, training recommendations, or finalization.
- Renamed CSV headers are intentionally clearer but require downstream consumers of the previous generic headers to choose a basis.
- Shared pools, multi-skill routing, transfers, non-frontline exits, recruiting constraints, costs, and probabilistic training yield remain outside this slice.
- Shared editing and lock recovery remain discovery-only under `NEXT-003`, `INT-003`, and `INT-004`.

## Three linked candidates considered

1. Capability/workflow — selected `CAP-SUP-001`, supporting `CAP-SCEN-001`/`CAP-REP-001`, completed `NOW-016`: expose opening and ending staffing positions and remove ambiguous downstream gap semantics. Existing formulas and saved snapshots made this immediately executable without policy invention.
2. Desktop UX — `CAP-UX-001`: add another grouped/sticky treatment to Agent Availability or Demand Model. Deferred because recent runs already improved three dense worksheets; another context-only redesign would repeat portfolio emphasis while staffing-gap trust remained weaker.
3. Deletion/simplification — included in `NOW-016`: remove generic Gap to Req, Avg Gap, Staffing gap change, and generic CSV fields. Shared-persistence prototyping was also considered but deferred because authorized lock recovery remains unresolved under `INT-004`.
