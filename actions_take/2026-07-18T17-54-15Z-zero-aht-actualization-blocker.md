# Zero-AHT actuals now block updated-plan cutoffs

## Selected problem and supporting evidence

Daily actuals correctly accept zero AHT as an observed value, but the updated-plan workflow treated every loaded month as an eligible actuals cutoff. A month with positive contacts and zero weighted AHT could therefore be copied into an update even though it cannot produce workload or a staffing requirement.

- `specs/README.md` makes the first-release decision that positive contacts with zero AHT cannot produce a requirement and must block use as an actualized planning month.
- `specs/actuals/ACT-001-actuals-import.md` allows non-negative observed AHT, so import must continue to preserve valid zero observations.
- `specs/actuals/ACT-005-actualization-cutoff.md` requires missing required actual values in any month through the cutoff to block update creation.
- `specs/foundation/FOUND-005-planning-ui-accessibility.md` requires validation to identify the affected field or row and a corrective action.
- Before this change, `buildActualsThroughMonthOptions` offered the zero-AHT month and every later loaded month, while `createUpdatedPlanDraft` copied the zero AHT into the new plan without validation.

## User and operational value

Planners can still import and review truthful zero-AHT observations, but they can no longer create an operational update whose actualized demand has no valid staffing requirement. The Plans workspace names the first affected month, explains how to correct it, and still permits earlier valid cutoffs.

## Plan, scope, and acceptance criteria

Scope was limited to positive-contact monthly actuals whose contact-weighted AHT is zero. Actuals file validation, general calendar completeness, future forecast coverage, and stored schemas did not change.

Acceptance criteria:

- Zero AHT remains accepted and stored as an observed actual.
- Zero AHT remains eligible when the month has zero contacts.
- The cutoff list stops before the first positive-contact month with zero weighted AHT.
- The Plans workspace and update dialog show a month-specific corrective message.
- A stale or crafted update route cannot bypass the same domain rule.
- A blocked route renders a recoverable error state with a return-to-Plans action.
- Valid existing update creation behavior remains unchanged.
- Focused tests, `npm run verify`, and `npm run test:e2e` pass.

## Implementation summary

- Added a shared actuals-cutoff state builder that returns eligible cutoff options plus the first zero-AHT blocker.
- Limited cutoff options to months before the blocker and surfaced the corrective message beside the plan action and inside the update dialog.
- Made the update dialog validate that its selected cutoff still exists in the eligible option set.
- Added domain enforcement in `createUpdatedPlanDraft` so direct or stale routes cannot actualize the invalid month.
- Caught domain validation in the planning workspace and rendered an error state that returns the planner to the Plans tab.
- Added focused regressions for cutoff filtering, zero-contact compatibility, dialog gating, plan-list guidance, and stale-route handling.

## Files changed

- `src/planner/planUpdates.js`
- `src/planner/__tests__/planUpdates.spec.js`
- `src/composables/planning/usePlanningCenterWorkspace.js`
- `src/composables/usePlanningWorkspace.js`
- `src/composables/__tests__/usePlanningWorkspace.spec.js`
- `src/components/planning/PlanningCenterView.vue`
- `src/components/planning/PlanningPlanUpdateModal.vue`
- `src/components/__tests__/PlanningCenterView.spec.js`
- `src/components/__tests__/PlanningPlanUpdateModal.spec.js`
- `src/App.vue`
- `actions_take/2026-07-18T17-54-15Z-zero-aht-actualization-blocker.md`

## Verification commands and exact outcomes

- `npm test -- --run src/planner/__tests__/planUpdates.spec.js src/components/__tests__/PlanningCenterView.spec.js src/components/__tests__/PlanningPlanUpdateModal.spec.js src/composables/__tests__/usePlanningWorkspace.spec.js`
  - Passed: 4 test files, 43 tests.
- `npm run lint -- --quiet`
  - Passed with no ESLint errors.
- `git diff --check`
  - Passed with no whitespace errors.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 71 test files, 364 tests.
  - Vite production build passed: 828 modules transformed.
- `npm run test:e2e`
  - Passed: 15 Playwright tests in Chromium.

The full Vitest run emitted the existing Node warning that `--localstorage-file` had no valid path. Playwright emitted existing color-environment warnings. Neither warning failed verification.

## Risks and follow-up considerations

- No stored-data schema or accepted actuals row changed. Existing zero-AHT observations remain intact and become usable after a corrected replacement import.
- The first invalid month intentionally prevents every later cutoff because actualization includes all months through the selected cutoff.
- General monthly completeness against expected open dates is still a separate gap; this run addresses only the explicit positive-contacts/zero-AHT rule.
- The message is visible in the Plans workspace even when an earlier valid cutoff remains available so planners understand why later months are absent.

## Next three high-value, non-duplicative candidate improvements

1. Validate actuals cutoff completeness against every expected open date through the selected month, with closed dates excluded, as required by `ACT-002` and `ACT-005`.
2. Add dependency-aware forecast deletion warnings that name affected draft and finalized plans while preserving their saved snapshots, as required by `FIMP-007`.
3. Preserve decimal training-class headcount instead of forcing every class to a whole-person count, matching the first-release staffing decision and `PLAN-009`.
