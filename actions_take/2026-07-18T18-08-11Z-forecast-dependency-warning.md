# Forecast deletion now identifies dependent plans

## Selected problem and supporting evidence

The Forecasts workspace showed a `Used By` value, but its destructive confirmation only named the forecast and staffing group. A planner deleting a referenced forecast could not see which plans depended on it, whether those plans were draft or finalized, or whether their saved values would survive.

- `specs/forecast-import/FIMP-007-version-management.md` requires referenced-forecast deletion warnings to identify dependent plan names and states, distinguish lost source access from future selection, and explain that saved plan values remain unchanged.
- `specs/data/DATA-004-planning-data-destructive-actions.md` requires dependency analysis before confirmation and requires the confirmation to explain cascade impact and saved-plan protection.
- `src/composables/planning/usePlanningGroupForecastActions.js` previously displayed only `Delete the saved forecast ...?` for both referenced and unreferenced sources.
- The pre-change focused regression failed both the unreferenced-impact message and referenced-plan dependency assertions while the other four composable assertions passed.

## User and operational value

Planners now see the exact blast radius before removing a forecast source. The confirmation names every dependent saved plan, labels it as draft or finalized, and makes clear that source access is removed while saved plan demand values and snapshots remain protected.

## Plan, scope, and acceptance criteria

Scope was limited to the forecast deletion confirmation and focused tests. Forecast persistence, plan snapshots, storage schemas, and deletion execution were not changed.

Acceptance criteria:

- Dependency analysis uses the current selected staffing group's plans and the exact forecast identifier at confirmation time.
- Referenced forecasts list every matching plan name and its draft/finalized state.
- The warning explains that deletion removes future selection and source access but does not delete dependent plans or change their saved demand values and snapshots.
- Unreferenced forecasts explicitly state that no saved plans use the source and still describe the loss of future selection and access.
- Existing confirmation, cancellation, and deletion execution remain unchanged.
- Focused tests, `npm run verify`, `npm run test:e2e`, and `git diff --check` pass.

## Implementation summary

- Added exact forecast-to-plan dependency resolution to the shared staffing-group forecast action composable.
- Added stable plan labels with compatibility-aware draft/finalized status resolution and fallback Budget/Update names.
- Expanded the destructive confirmation with source-access impact and saved-plan protection language, including singular/plural wording.
- Added composable regressions for referenced and unreferenced forecasts and a rendered Planning Center regression proving the dependency warning reaches the confirmation dialog.

## Files changed

- `src/composables/planning/usePlanningGroupForecastActions.js`
- `src/composables/planning/__tests__/usePlanningGroupForecastActions.spec.js`
- `src/components/__tests__/PlanningCenterView.spec.js`
- `actions_take/2026-07-18T18-08-11Z-forecast-dependency-warning.md`

## Verification commands and exact outcomes

- Pre-change regression: `npm test -- --run src/composables/planning/__tests__/usePlanningGroupForecastActions.spec.js`
  - Expected failure: 1 test file failed; the 2 new dependency-impact assertions failed and 4 existing tests passed.
- Focused final run: `npm test -- --run src/composables/planning/__tests__/usePlanningGroupForecastActions.spec.js src/components/__tests__/PlanningCenterView.spec.js`
  - Passed: 2 test files, 31 tests.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 71 test files, 369 tests.
  - Vite production build passed: 828 modules transformed.
- `npm run test:e2e`
  - Passed: 15 Chromium tests.
- `git diff --check`
  - Passed with no whitespace errors.

The full unit test run emitted the existing Node warning that `--localstorage-file` had no valid path. The end-to-end run emitted the existing `NO_COLOR`/`FORCE_COLOR` warning. Neither warning failed a check.

## Risks and follow-up considerations

- No stored-data format or deletion semantics changed. Existing plans and forecasts remain compatible.
- The warning intentionally lists every dependent plan to satisfy the dependency contract. A staffing group with many plan versions may produce a long description; a structured dialog body could improve scanning if that becomes common.
- Dependency resolution is based on exact normalized forecast identifiers and ignores unrelated or manual demand sources.

## Next three high-value, non-duplicative candidate improvements

1. Preserve decimal training-class headcount throughout manual entry and staffing roll-forward instead of rounding to whole people, matching the first-release staffing decision in `PLAN-009`.
2. Add a detailed, exportable list of missing expected open dates when actuals completeness blocks an updated-plan cutoff, so planners can correct source files without searching month-by-month.
3. Add an explicit forecast replacement workflow that validates the replacement before changing source availability and clearly previews the effect on editable drafts while preserving saved plan snapshots.
