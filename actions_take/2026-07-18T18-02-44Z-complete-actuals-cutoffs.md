# Updated plans now require complete actuals cutoffs

## Selected problem and supporting evidence

The updated-plan workflow treated any month with at least one accepted actuals row as cutoff-ready. A planner could therefore actualize a month from one loaded day, replacing the full forecast month with a partial contact total and understating workload and staffing requirements.

- `specs/actuals/ACT-002-actuals-management-rollup.md` requires completeness to evaluate loaded actuals against expected open dates and to exclude configured closed dates.
- `specs/actuals/ACT-005-actualization-cutoff.md` requires earlier actualized months with missing required actual values to block update creation.
- `specs/organization/ORG-002-operating-calendar.md` defines an open date from operating weekdays and applicable closures.
- Before this change, `buildPlanUpdateActualsState` offered every month with any actual contacts or AHT, and `createUpdatedPlanDraft` only rejected positive-contact months with zero weighted AHT.
- A focused regression demonstrates the unsafe case: one row for January 2, 2026 left 21 expected Monday-through-Friday dates missing but previously made January selectable.

## User and operational value

Planners can no longer convert a partial actuals upload into an apparently complete operating update. The Plans workspace stops cutoff choices at the first gap and names the affected month, missing-day count, and first missing date so the source file can be corrected before demand and staffing are actualized.

## Plan, scope, and acceptance criteria

Scope was limited to actuals completeness for updated-plan cutoff selection and creation. Actuals import, stored schemas, finalized plan snapshots, and general actuals reporting did not change.

Acceptance criteria:

- Every expected open date from January through a proposed cutoff has an accepted actuals row.
- Staffing-group operating weekdays determine expected dates.
- Applicable center or group closures do not count as missing.
- Zero-contact daily rows count as valid observations.
- Cutoff options stop before the first incomplete month.
- Guidance identifies the first incomplete month, missing-day count, and first missing date.
- A stale or direct update route cannot bypass completeness validation.
- The existing positive-contact/zero-AHT blocker remains intact.
- Focused tests, `npm run verify`, and `npm run test:e2e` pass.

## Implementation summary

- Added calendar-aware expected-open-date evaluation to the plan update domain module.
- Compared normalized accepted daily actual dates with every expected open date through the latest loaded month.
- Limited actuals-through choices to the contiguous complete period before the first gap.
- Added corrective blocker text with the missing count and first missing date.
- Passed the active staffing group and call center into both cutoff presentation and update-draft creation so UI and domain enforcement use the same operating calendar.
- Added regression coverage for incomplete months, configured closures, Plans-workspace blocking, stale-route blocking, and compatibility with zero-contact and zero-AHT behavior.

## Files changed

- `src/planner/planUpdates.js`
- `src/planner/__tests__/planUpdates.spec.js`
- `src/composables/planning/usePlanningCenterWorkspace.js`
- `src/composables/usePlanningWorkspace.js`
- `src/composables/__tests__/usePlanningWorkspace.spec.js`
- `src/components/__tests__/PlanningCenterView.spec.js`
- `actions_take/2026-07-18T18-02-44Z-complete-actuals-cutoffs.md`

## Verification commands and exact outcomes

- `npm test -- --run src/planner/__tests__/planUpdates.spec.js src/components/__tests__/PlanningCenterView.spec.js src/composables/__tests__/usePlanningWorkspace.spec.js`
  - Passed: 3 test files, 46 tests.
- `npm run lint -- --quiet`
  - Passed with no ESLint errors.
- `git diff --check`
  - Passed with no whitespace errors.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 71 test files, 368 tests.
  - Vite production build passed: 828 modules transformed.
- `npm run test:e2e`
  - Passed: 15 Playwright tests in Chromium.

The full Vitest run emitted the existing Node warning that `--localstorage-file` had no valid path. Playwright emitted existing color-environment warnings. Neither warning failed verification.

## Risks and follow-up considerations

- No persisted schema changed, and existing finalized updates remain unchanged.
- Previously loaded partial months are intentionally no longer eligible as update cutoffs until missing open dates are imported.
- Eligibility uses the staffing group's current operating calendar. A later calendar correction can change eligibility for a future update, while saved plan snapshots remain stable.
- The message identifies the first missing date rather than listing every gap; the actuals coverage table remains the place to review period-level coverage.

## Next three high-value, non-duplicative candidate improvements

1. Add dependency-aware forecast deletion warnings that name affected draft and finalized plans while preserving saved forecast snapshots, as required by `FIMP-007`.
2. Preserve decimal training-class headcount instead of forcing every class to whole people, matching the staffing units decision and `PLAN-009`.
3. Add a missing-open-date detail view in actuals management so planners can see and export every coverage gap before attempting an updated plan.
