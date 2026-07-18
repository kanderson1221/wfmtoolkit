# Decision-safe partial portfolio scope

Run type: product improvement

## Scope and decision

- Capabilities: `CAP-REP-001`, `CAP-REP-002`, `CAP-UX-001`
- Roadmap: completed `NOW-003`; promoted side-by-side comparison from `NEXT-001` to ready `NOW-004`
- Interview evidence: no prior interview artifact existed. Added open `INT-001`; it does not block this safe reporting-integrity improvement.
- Planner persona: WFM planning lead or operations leader reviewing annual demand, staffing requirement, supply, and risk across call centers.
- Planner decision: determine whether selected-year portfolio totals and actual-versus-plan variance are authoritative enough to support staffing action.
- Desktop workflow: open Planning Portfolio, read plan coverage, inspect every excluded staffing group and reason, review explicitly scoped KPIs/table/chart, and open a missing group’s center from the same context.
- Product disposition: improve the current portfolio and centralize its scope evidence. Retain valid additive totals for modeled independent groups; withhold comparisons whose actual and plan populations differ.
- Review scope: selected-year current-plan inclusion, partial-coverage presentation, variance authority, missing-scope navigation, native-table containment, and desktop keyboard behavior. This was not a scheduled code-review run.

## Opportunity and evidence

`PlanningHome.vue` displayed a plan coverage fraction but still described portfolio plan totals as a rollup for “all call centers.” It did not name missing groups, and `annualPlanningRollup.js` exposed only counts. More importantly, actual contacts included actuals-only groups while expected contacts included only planned groups, so the partial portfolio could display an actual-minus-plan variance across different populations.

Repository and workflow evidence:

- `PORT-002` requires deterministic group inclusion and numerator/denominator coverage.
- `PORT-005` requires incomplete reports to name missing scope and forbids actuals-only groups from implying requirement coverage.
- The completed zero-plan state intentionally left partial coverage for `NOW-003`.
- Focused pre-change reasoning showed that a planned group plus an actuals-only group would produce a numeric variance even though the actual and plan scopes differed.
- The existing CSV already carries monthly `groups_planned` and `groups_total`, so export scope was self-describing and did not need another format.

## Calculation contract

- Plan coverage is `selected-year groups with an applicable current plan / all staffing groups`.
- Plan contacts, workload, requirement, and staffing remain additive across modeled independent groups.
- A zero-demand group with a valid plan remains included; coverage is not inferred from demand magnitude.
- Other-year plans remain excluded from the selected year and are reported as available-year evidence.
- Actuals-only contacts and AHT remain visible as actual operational truth.
- Actual-versus-plan variance remains `actual - plan` only when every staffing group has plan coverage. At partial coverage it is unavailable because the populations are not comparable.
- No stored data schema or calculation snapshot changed.

## Scores

| Capability | Before | Need before | After | Need after | Rationale |
|---|---:|---:|---:|---:|---|
| `CAP-REP-001` | `5/3/4/4/3/4` | 28 | `5/4/4/4/4/4` | 20 | Rollup/report scope evidence, reconciliation safety, and contributor review are now strong. |
| `CAP-REP-002` | `5/2/3/3/3/3` | 45 | `5/3/3/4/4/4` | 30 | Zero and partial plan states are decision-safe; broader stale/error consistency remains incomplete. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | The slice improves one desktop workflow but does not justify changing the cross-product UX score. |

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula in the capability assessment.

## Plan and acceptance criteria

1. Add centralized selected-year coverage evidence for every staffing group.
2. Identify each excluded group by center, group, actuals presence, available plan years, and exclusion reason.
3. Add an explicit partial-scope status above all portfolio report surfaces.
4. Label plan-derived KPIs, the monthly report, and the staffing chart with `N of M` scope.
5. Withhold aggregate and call-center actual-versus-plan variance until plan coverage is complete.
6. Preserve actuals-only visibility, zero-plan behavior, valid complete-coverage behavior, CSV scope, and contained native tables.
7. Verify actuals-only and out-of-year cases, keyboard disclosure behavior, 1280/1440/1920 layouts, build, tests, and standards.

Acceptance result: met. Every excluded group is named; the center action is visible and keyboard reachable; partial comparisons are unavailable; complete reports retain variance; and existing no-plan suppression remains intact.

## Implementation and removals

- Added deterministic `coverage` evidence to `buildAnnualPlanningRollup`, with sorted planned and missing group collections and stable reason codes.
- Added focused rollup regression coverage for an actuals-only group and a group with only a 2025 plan in a 2026 report.
- Added an open, keyboard-operable missing-scope review using `AppStatusMessage`, native `details/summary`, and `AppButton` center actions.
- Scoped KPI metadata, monthly-report description, chart description, and chart accessible name to the contributing group population.
- Withheld partial aggregate monthly variance and center-row variance; replaced the latter with `Full plan coverage required`.
- Preserved all-group actual contacts and AHT with explicit wording rather than pretending they are comparable to partial plan totals.
- Removed misleading “all call centers” and generic “year plan” report copy where coverage is partial.
- Removed one duplicate actuals-presence scan exposed while centralizing coverage evidence.
- Desktop browser review found and fixed the new `1 groups` copy defect.

## Standards findings

- No PrimeVue import was added outside `src/components/ui`.
- Existing shared wrappers were used; no page-local control primitive or legacy semantic class was introduced.
- Dense reporting remains native table markup with contained horizontal overflow.
- Missing scope and unavailable variance are communicated in text, not color alone.
- The disclosure is keyboard operable and the repeated center action has visible text.
- Chart scope is present in both visible description and accessible name.
- The page remains desktop-first; no phone layout or touch-only behavior was added.

## Files and compatibility

- Product UI and behavior: `src/components/PlanningHome.vue`, `src/components/planning/PlanningPortfolioHeadcountChart.vue`
- Pure rollup logic: `src/planner/annualPlanningRollup.js`
- Tests: `src/components/__tests__/PlanningHome.spec.js`, `src/components/__tests__/PlanningPortfolioHeadcountChart.spec.js`, `src/planner/__tests__/annualPlanningRollup.spec.js`
- Specifications: `specs/portfolio/PORT-002-annual-rollups.md`, `specs/portfolio/PORT-005-reporting-states.md`
- Strategy and sponsor channel: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, `interviews.md`
- Migration: none. The added rollup evidence is derived at runtime and does not change persistence.
- Compatibility: complete-coverage and valid zero-demand plans retain their existing calculations; zero-plan reports remain withheld; CSV columns and stored data are unchanged.

## Verification

- Focused final regression: `npm test -- --run src/components/__tests__/PlanningHome.spec.js` — passed, 1 file / 10 tests.
- Final `npm run verify` — passed:
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed, 74 files / 394 tests.
  - Production build passed, 831 modules transformed.
- `npm run test:e2e` — passed, 15 Chromium tests. This completed before the final copy-only pluralization correction; the affected focused component test and full verify then passed on the final tree.
- `git diff --check` — passed before the audit record and repeated afterward.

## Desktop review

The Browser skill was used for a real partial-coverage state with one planned group and one actuals-only unplanned group.

- 1280 × 900: no page-level horizontal overflow; partial scope and missing group were visible above the report; the 76rem monthly table overflow stayed inside its scroll container; command table containment remained intact.
- 1440 × 900: both report tables fit without horizontal overflow; scope list remained open and readable; the browser review caught and verified the singular `1 group` correction.
- 1920 × 1080: wide layout used the available width; the center action remained visible; both tables fit without horizontal overflow.
- Keyboard: Enter collapsed and re-expanded the native missing-scope disclosure; the `Open Center` action was enabled.
- Console: no errors. The existing chart wrapper emitted Vue/ECharts warnings about the default slot and disposed instances during reload; this run did not broaden into chart-wrapper remediation.
- Zoom: specific browser zoom controls were unavailable in the review surface. The 1280px containment check and existing semantic/relative layout were used as the practical resizing proxy.

## Rotation and portfolio balance

The required code-review audit remains within the previous two completed records, so this run was not due for code review. This is the third non-review run in the active strategy cadence, not the fifth-run portfolio review. Recent non-review work includes the no-plan portfolio redesign and imported-forecast replacement; this run is a user-facing reporting/workflow improvement and keeps the rolling balance above the required threshold.

## Strategy and interview updates

- Completed `NOW-003` and promoted side-by-side plan comparison to ready `NOW-004`.
- Updated `CAP-REP-001` and `CAP-REP-002` scores and evidence without overstating broader stale/error-state maturity.
- Created the previously missing root `interviews.md` artifact.
- Added one open high-priority question, `INT-001`, asking whether explicitly scoped plan totals should be withheld below a sponsor-defined coverage threshold. No answer was available or applied this run.

## Risks, limitations, and follow-up

- Partial plan totals remain visible at any nonzero coverage. `INT-001` may justify a future decision-specific minimum threshold.
- Staffing groups are still assumed additive; shared pools and multi-skill routing remain an explicit exploration dependency.
- Actual contacts remain an all-actuals operational total while plan contacts are partial. The UI now explains this and withholds variance, but a future report may add separately labeled comparable-actual and all-actual series if planners need both.
- Existing chart-wrapper console warnings remain outside this bounded product slice.

## Linked candidates considered

1. Capability/workflow — ready `NOW-004`, `CAP-SCEN-001`, `CAP-UX-001`: side-by-side Budget/Update comparison with assumption deltas and monthly exceptions.
2. Desktop UX/trust — `CAP-REP-002`: systematic stale/error-state labeling and retry behavior beyond the portfolio.
3. Deletion/simplification — `CAP-IO-001`: consolidate the remaining duplicate backup and actuals-gap Blob/object-URL download lifecycles into the shared browser-download primitive and remove their local cleanup code.
