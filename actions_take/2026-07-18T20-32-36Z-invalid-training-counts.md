# Invalid training counts now block Budget finalization

## Selected problem and supporting evidence

Editable training classes with blank, zero, non-finite, or normalized negative hire counts were treated as valid zero-person classes. They could appear in the staffing pipeline and a Budget could be finalized without identifying the affected row.

- `specs/planning/PLAN-009-training-pipeline.md` requires an invalid hire count to identify the class row.
- `specs/planning/PLAN-011-completeness-finalization.md` lists an invalid training class as a blocking finalization condition.
- `src/planner/shared.js` normalized invalid and negative hire counts to zero, while no shared rule distinguished zero from a valid positive class size.
- `src/planner/staffingModel.js` considered class validity based only on the hire date, so a zero-person class still counted as a starting and active class.
- `src/components/MonthlyPlanBuilder.vue` only checked training-class dates before enabling Budget finalization.
- The pre-change regression run failed all three new assertions: the shared validator was absent, the worksheet showed a zero-person class as frontline-ready, and the Finalize Budget button remained enabled. The other 41 focused assertions passed.

## User and operational value

Planners can no longer finalize a Budget containing an accidental empty training row. The worksheet identifies the exact row and field, staffing outputs ignore the invalid class, and the finalization message tells the planner how to correct it. Valid decimal FTE class sizes remain supported.

## Plan, scope, and acceptance criteria

Scope was limited to editable training-class hire-count validation, staffing treatment, worksheet feedback, and the existing Budget finalization gate. Draft saving, training settings, recommendation sizing, stored-data shape, and inherited read-only classes were not changed.

Acceptance criteria:

- Only finite training-class hire counts greater than zero are valid.
- A zero-person class does not increment class activity or staffing movement.
- The affected worksheet row displays `Invalid Count`.
- The hire-count field has a minimum of `0.1`, an invalid accessible state, and a corrective accessible label.
- Budget finalization remains disabled and identifies the class number until the count is corrected.
- Decimal positive counts such as `10.5` remain valid.
- Focused tests, `npm run verify`, `npm run test:e2e`, and `git diff --check` pass.

## Implementation summary

- Added a shared finite-positive hire-count rule.
- Included hire-count validity in derived training-class metrics so invalid classes are excluded from monthly class activity and staffing roll-forward.
- Added row-level `Invalid Count` status and accessible field feedback to the native worksheet flow through `AppTableNumberField`.
- Extended the staffing completeness gate with a class-specific count blocker before date validation.
- Added focused shared-domain, component, and full planner finalization regressions.

## Files changed

- `src/planner/shared.js`
- `src/planner/staffingModel.js`
- `src/planner/__tests__/shared.spec.js`
- `src/components/planner/PlannerTrainingPipelineTable.vue`
- `src/components/MonthlyPlanBuilder.vue`
- `src/components/__tests__/PlannerTrainingPipelineTable.spec.js`
- `src/components/__tests__/MonthlyPlanBuilder.spec.js`
- `actions_take/2026-07-18T20-32-36Z-invalid-training-counts.md`

## Verification commands and exact outcomes

- Pre-change regression: `npm test -- --run src/planner/__tests__/shared.spec.js src/components/__tests__/PlannerTrainingPipelineTable.spec.js src/components/__tests__/MonthlyPlanBuilder.spec.js`
  - Expected failure: 3 test files failed; the 3 new assertions failed and 41 existing tests passed.
  - Evidence showed the shared validator was missing, the row displayed `Frontline This Month`, and Budget finalization remained enabled.
- Focused final run: `npm test -- --run src/planner/__tests__/shared.spec.js src/planner/__tests__/staffingModel.spec.js src/components/__tests__/PlannerTrainingPipelineTable.spec.js src/components/__tests__/MonthlyPlanBuilder.spec.js`
  - Passed: 4 test files, 53 tests.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 71 test files, 375 tests.
  - Vite production build passed: 828 modules transformed.
- `npm run test:e2e`
  - Passed: 15 Chromium tests.
- `git diff --check`
  - Passed with no whitespace errors.

The Vitest run emitted the existing `--localstorage-file` warning. Playwright emitted the existing `NO_COLOR`/`FORCE_COLOR` warning. Neither warning failed verification.

## Risks and follow-up considerations

- No persisted schema changed. Existing positive whole-person and decimal classes remain compatible. Previously stored blank, invalid, negative, or zero counts normalize to zero as before but now require correction before Budget finalization.
- Invalid editable classes remain in drafts so planners can repair rather than lose them.
- Inherited classes remain read-only and outside this editable-class blocker; legacy carry-in validation would require a separate recovery design because the current-year planner cannot edit prior finalized data.

## Next three high-value, non-duplicative candidate improvements

1. Add a detailed, exportable list of missing expected open dates when actuals completeness blocks an updated-plan cutoff, so planners can repair source files directly.
2. Add a forecast replacement workflow that validates the replacement before changing availability and previews the effect on editable drafts while preserving saved plan snapshots.
3. Show backup export time, schema version, and record scope before replacement restore so planners can verify the recovery point before overwriting local data.
