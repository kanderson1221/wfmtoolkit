# Invalid training dates now block staffing and finalization

## Selected problem

Training hire dates were parsed with JavaScript date normalization. An impossible value such as `2026-02-30` therefore became March 2, contributed hires and graduates to the staffing roll-forward, and still allowed a Budget to be finalized.

## User and operational value

Planners can no longer create staffing supply from a nonexistent calendar date or lock that corrupted supply into a Budget baseline. Invalid training rows remain visible and actionable while drafts stay saveable.

## Evidence

- `specs/foundation/FOUND-003-numeric-date-conventions.md` requires ISO `YYYY-MM-DD` dates and rejection of invalid calendar dates.
- `specs/planning/PLAN-009-training-pipeline.md` requires an invalid hire date to identify the affected class row.
- `specs/planning/PLAN-011-completeness-finalization.md` defines an invalid training class as a finalization blocker.
- `src/planner/dateValues.js` already provided strict, time-zone-safe ISO calendar parsing, but `src/planner/staffingModel.js` and the training table used permissive `new Date(...)` parsing instead.
- The pre-change regression converted `2026-02-30` into `2026-03-02`, marked the class valid, and left Finalize Budget enabled.

## Plan and acceptance criteria

1. Capture domain, planner-finalization, and training-row regressions for an impossible ISO date.
2. Reuse the shared strict ISO parser in staffing calculations and training-table presentation.
3. Include the first invalid owned training class in Staffing Plan status and Budget finalization gating.

Acceptance criteria:

- Training dates must represent real ISO calendar dates; valid leap days remain accepted by the shared parser.
- An invalid hire date produces no hire, graduation, fallout, or frontline-ready staffing movement.
- The training pipeline marks the affected row as invalid and does not display a normalized date.
- Budget finalization is disabled with a row-specific corrective message.
- Valid stored training dates retain existing behavior and draft saving remains available.
- Focused tests and `npm run verify` pass.

## Implementation summary

- Replaced permissive string parsing in the staffing model with the existing strict `buildDateFromIso` helper while retaining internal `Date` support for recommendation boundaries.
- Applied the same strict parser to training-table sorting and read-only date formatting so impossible dates are not presented as normalized valid dates.
- Extended Staffing Plan completeness to report `Invalid class`, identify the first affected row, and block Budget finalization until its hire date is corrected.
- Added focused regressions proving invalid dates do not affect March staffing, remain visibly invalid, and prevent Budget finalization.

## Files changed

- `src/planner/staffingModel.js`
- `src/components/MonthlyPlanBuilder.vue`
- `src/components/planner/PlannerTrainingPipelineTable.vue`
- `src/planner/__tests__/staffingModel.spec.js`
- `src/components/__tests__/MonthlyPlanBuilder.spec.js`
- `src/components/__tests__/PlannerTrainingPipelineTable.spec.js`
- `actions_take/2026-07-18T17-35-46Z-strict-training-dates.md`

## Verification

- Pre-change regression: `npm test -- --run src/planner/__tests__/staffingModel.spec.js src/components/__tests__/MonthlyPlanBuilder.spec.js`
  - Expected failure: 2 test files failed; the 2 new regressions failed and 39 existing tests passed.
  - Evidence showed the domain model normalized the date to March 2 and the Finalize Budget button remained enabled.
- Final focused run: `npm test -- --run src/planner/__tests__/staffingModel.spec.js src/components/__tests__/MonthlyPlanBuilder.spec.js src/components/__tests__/PlannerTrainingPipelineTable.spec.js`
  - Passed: 3 test files, 44 tests.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 70 test files, 356 tests.
  - Vite production build passed: 828 modules transformed.
- `git diff --check`
  - Passed with no whitespace errors.
- `npm run test:e2e` was not run because navigation, dialogs, and major interaction flows did not change.

The full test run emitted the existing Node warning that `--localstorage-file` had no valid path; it did not fail any test.

## Risks and follow-ups

- No stored-data schema changed. Valid existing ISO dates are parsed as before; invalid saved dates now remain invalid and require correction instead of silently moving to another month.
- Internally supplied `Date` objects remain supported for training recommendation bounds, while persisted string dates are strict.
- The worktree also contains the two prior independently documented calculation-integrity improvements. Those changes were preserved and remained green in full verification.

## Next three non-duplicative candidate improvements

1. Add an explicit actualization blocker when positive-contact actuals have zero AHT, as required by the first-release decision and actuals specifications.
2. Audit planning-data deletion against `DATA-004` and add the smallest missing confirmation or recovery safeguard for any destructive action that can currently bypass it.
3. Preserve decimal training-class headcount instead of rounding every hire count to a whole person, matching the first-release staffing decision and `PLAN-009`.
