# Decimal training headcount now remains precise

## Selected problem and supporting evidence

Manual training classes are allowed to represent decimal headcount, but the shared training-class normalizer rounded every hire count to a whole person. A planner entering `10.5` therefore received an 11-person class in derived staffing calculations, inflating an 80% yield from the correct 8.4 frontline-ready people to 8.8. The worksheet also used a whole-number step, which made the supported precision undiscoverable.

- `specs/README.md` defines training classes as whole or decimal headcount.
- `specs/foundation/FOUND-003-numeric-date-conventions.md` allows decimal headcount during calculations and requires unrounded inputs to remain distinct from display rounding.
- `specs/planning/PLAN-009-training-pipeline.md` defines projected frontline-ready headcount as hire count multiplied by graduation yield.
- `src/planner/shared.js` previously applied `Math.round` while normalizing `hireCount`.
- The pre-change regression showed `10.5` becoming 11, with 8.8 projected graduates and 2.2 fallout instead of 8.4 and 2.1.

## User and operational value

Planners can now model fractional FTE training cohorts without silently overstating or understating the staffing supply. Hiring, yield, fallout, roster, frontline, and gap calculations all use the entered decimal headcount, making small-team plans and shared-capacity staffing assumptions more trustworthy.

## Plan, scope, and acceptance criteria

Scope was limited to manual training-class headcount normalization and the worksheet input precision. Recommendation sizing and trainer/class-capacity settings remain whole-seat behavior, and no stored schema or migration changed.

Acceptance criteria:

- A manual hire count of 10.5 remains 10.5 after shared normalization.
- At 80% yield, the class produces 8.4 frontline-ready headcount and 2.1 fallout.
- Monthly staffing roll-forward uses 10.5 hires and ends at 8.4 roster/frontline headcount after fallout.
- The worksheet accepts and advertises one-decimal increments with consistent fraction-digit behavior.
- Existing negative-count protection remains intact.
- Focused tests, `npm run verify`, and `git diff --check` pass.

## Implementation summary

- Removed whole-person rounding from shared training-class normalization while retaining non-negative numeric normalization.
- Configured the shared worksheet number field for 0.1 steps and zero-to-one displayed fraction digits.
- Added domain coverage for normalization, yield, fallout, and staffing roll-forward precision.
- Added component coverage for the decimal input value and precision contract.

## Files changed

- `src/planner/shared.js`
- `src/planner/__tests__/shared.spec.js`
- `src/planner/__tests__/staffingModel.spec.js`
- `src/components/planner/PlannerTrainingPipelineTable.vue`
- `src/components/__tests__/PlannerTrainingPipelineTable.spec.js`
- `actions_take/2026-07-18T18-16-51Z-decimal-training-headcount.md`

## Verification commands and exact outcomes

- Pre-change regression: `npm test -- --run src/planner/__tests__/shared.spec.js src/planner/__tests__/staffingModel.spec.js src/components/__tests__/PlannerTrainingPipelineTable.spec.js`
  - Expected failure: 3 test files failed; the 3 new decimal-headcount assertions failed and 14 existing tests passed.
  - Evidence showed 10.5 normalized to 11, staffing outputs derived from 11, and the worksheet step remained 1.
- Focused final run: `npm test -- --run src/planner/__tests__/shared.spec.js src/planner/__tests__/staffingModel.spec.js src/components/__tests__/PlannerTrainingPipelineTable.spec.js`
  - Passed: 3 test files, 17 tests.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 71 test files, 372 tests.
  - Vite production build passed: 828 modules transformed.
- `git diff --check`
  - Passed with no whitespace errors.
- `npm run test:e2e` was not run because navigation, dialogs, and major workflow interactions did not change.

The full Vitest run emitted the existing Node warning that `--localstorage-file` had no valid path; it did not fail verification.

## Risks and follow-up considerations

- No persisted schema changed. Existing whole-person training classes remain unchanged, and previously stored decimal counts now retain their original precision instead of being rounded on load.
- Derived training outcomes continue to use the existing one-decimal headcount boundary, consistent with the current worksheet presentation.
- Automated recommendations still produce whole-person class sizes; allowing fractional recommended seats would be a separate product decision and is outside this correction.

## Next three high-value, non-duplicative candidate improvements

1. Add a detailed, exportable list of missing expected open dates when actuals completeness blocks an updated-plan cutoff, so planners can repair source files directly.
2. Add a forecast replacement workflow that validates the new source before changing availability and previews the effect on editable drafts while preserving saved plan snapshots.
3. Mark zero, non-finite, or otherwise invalid manual training-class counts on the affected row and block Budget finalization until corrected, as required by `PLAN-009` failure behavior.
