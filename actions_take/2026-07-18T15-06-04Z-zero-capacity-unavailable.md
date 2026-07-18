# Zero-capacity staffing results are now unavailable

## Selected problem

The monthly demand model silently clamped non-positive presence and utilization to 1%. A month whose losses consumed all available capacity therefore produced a very large but apparently valid staffing requirement, and the Budget finalization gate treated the month as complete.

## User and operational value

Planners can no longer finalize a Budget based on fabricated capacity. Impossible-capacity months stay visibly unresolved, their staffing and actuals comparisons remain unavailable, and downstream hiring recommendations do not treat the missing requirement as zero.

## Evidence

- `specs/README.md` says presence and utilization may reach zero and must create blocking invalid-capacity results rather than being silently clamped positive.
- `specs/planning/PLAN-003-agent-availability.md` requires losses that consume all capacity to create a blocking warning.
- `specs/planning/PLAN-011-completeness-finalization.md` lists zero paid capacity with demand and a non-positive design factor as finalization blockers.
- `src/planner/demandModel.js` previously clamped both presence and utilization to a 1% minimum, which converted a January test case with 1,000 absence hours into a 1,218.3-headcount requirement.
- The pre-change focused regression run failed all three new assertions: calculation availability, downstream staffing gaps, and Budget finalization gating.

## Plan and acceptance criteria

1. Add regression tests for zero presence, zero utilization, downstream staffing/actuals behavior, and Budget finalization.
2. Preserve zero capacity in the calculation and return `null` for unavailable ratios and requirements without producing `NaN` or `Infinity`.
3. Carry unavailable results through workload-ratio, intraday Erlang, actuals, staffing gaps, summaries, recommendations, and worksheet display.
4. Confirm that the existing availability workflow blocks Budget finalization and gives month-specific guidance.

Acceptance criteria:

- Presence and utilization can reach 0% without clamping.
- Invalid-capacity staffing ratios, required hours, and required headcount are unavailable rather than zero or non-finite.
- Actuals variances, staffing gaps, and hiring recommendations do not coerce an unavailable requirement to zero.
- Planner tables show an em dash for unavailable requirement outputs.
- A Budget with any invalid-capacity month cannot be finalized.
- Focused tests and `npm run verify` pass.

## Implementation summary

- Removed the 1% presence/utilization clamps and made reciprocal capacity factors nullable at zero.
- Made workload-ratio and plan-integrated Erlang requirement outputs nullable when monthly capacity or design factor is invalid.
- Updated warnings to explain that the staffing requirement is unavailable until capacity inputs are corrected.
- Preserved `null` through annual summaries, actuals requirements and variances, staffing gaps, shortage summaries, and training recommendations.
- Updated planner requirement and staffing tables to render unavailable values as em dashes.
- Added focused calculation, actuals, staffing, and finalization regression coverage.

## Files changed

- `src/planner/demandModel.js`
- `src/planner/intradayErlang.js`
- `src/planner/actualsModel.js`
- `src/planner/staffingModel.js`
- `src/components/planner/PlannerMonthlyPlanTab.vue`
- `src/components/planner/PlannerStaffingSupplyTable.vue`
- `src/planner/__tests__/demandModel.spec.js`
- `src/planner/__tests__/actualsModel.spec.js`
- `src/planner/__tests__/staffingModel.spec.js`
- `src/components/__tests__/MonthlyPlanBuilder.spec.js`
- `actions_take/2026-07-18T15-06-04Z-zero-capacity-unavailable.md`

## Verification

- `npm test -- --run src/planner/__tests__/demandModel.spec.js src/planner/__tests__/staffingModel.spec.js src/planner/__tests__/actualsModel.spec.js src/planner/__tests__/intradayErlang.spec.js src/components/__tests__/MonthlyPlanBuilder.spec.js src/components/__tests__/PlannerMonthlyPlanTab.spec.js src/components/__tests__/PlannerStaffingSupplyTable.spec.js`
  - Passed: 7 test files, 73 tests.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 70 test files, 349 tests.
  - Vite production build passed: 828 modules transformed.
- `git diff --check`
  - Passed with no whitespace errors.
- `npm run test:e2e` was not run because navigation, dialogs, and major workflows did not change.

The full test run emitted the existing Node warning that `--localstorage-file` had no valid path; it did not fail any test.

## Risks and follow-ups

- No stored-data schema changed. Previously saved inputs remain compatible and derived values are recalculated when a plan is opened; an older persisted summary remains unchanged until that plan is resaved.
- Requirement summary metrics now become unavailable if any month lacks a valid requirement, preventing a partial-year average from appearing complete.
- End-to-end tests were not required for this calculation and display correction.

## Next three non-duplicative candidate improvements

1. Reject zero occupancy or adherence inputs as blocking instead of allowing calculation code to clamp them to 1%, in line with `PLAN-004`.
2. Validate training-class ISO dates strictly so invalid dates such as `2026-02-30` cannot roll into a different month through JavaScript date normalization, in line with `FOUND-003`.
3. Add an explicit actualization blocker when positive-contact actuals have zero AHT, in line with the first-release decision and actuals specifications.
