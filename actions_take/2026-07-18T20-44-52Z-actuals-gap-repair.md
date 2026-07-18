# Actuals coverage gaps are now visible and repairable

## Selected problem and supporting evidence

The staffing-group Data screen measured monthly coverage only between the first and last loaded dates. A small mid-month slice could therefore display 100% coverage even though the Update Plan workflow correctly rejected that same month as incomplete. The screen also exposed only aggregate loaded/expected counts, so planners could not see or export the exact missing open dates needed to repair the source data.

- The first-release decision in `specs/README.md` requires actuals completeness to evaluate the whole calendar month against expected open dates.
- `ACT-002` requires loaded-day completeness to exclude configured closed dates and not imply that one loaded row makes a month complete.
- `ACT-005` requires continuous complete actuals through the selected update cutoff.
- `src/planner/groupActualsDataSummary.js` previously bounded each month's expected dates to that month's first and last loaded rows.
- `src/planner/planUpdates.js` independently evaluated every expected open date in the full calendar month, creating a visible disagreement between Data coverage and Update Plan eligibility.
- The pre-change focused regression run failed five new assertions: three calendar-month completeness cases, the corrected UI percentage, and the missing-date review action. Ten existing assertions still passed.

## User and operational value

Planners now see the same actuals-readiness result on the Data screen that Update Plan enforces. For any incomplete month, they can review every missing expected open date and download a ready-to-fill CSV template with the application's recognized actuals headers. This removes guesswork, prevents false confidence in partial data, and shortens the repair-and-reimport workflow.

## Plan, scope, and acceptance criteria

Scope was limited to actuals completeness presentation and repair guidance. No actuals import rules, stored-data shape, plan actualization rules, deletion behavior, or forecast behavior changed.

Acceptance criteria:

- A loaded month is measured against every expected open date in that calendar month.
- Configured closed dates and non-operating weekdays remain excluded.
- Annual coverage aggregates the same monthly readiness values shown beneath it.
- Incomplete month rows expose an accessible review action with the exact missing dates.
- The gap download contains `service_date`, `contacts`, and `average_handle_time_seconds` columns and only missing dates.
- Complete months show a complete state without a gap-review action.
- Existing year/month selection and deletion behavior remains intact.
- Focused tests, `npm run verify`, `npm run test:e2e`, and `git diff --check` pass.

## Implementation summary

- Added a reusable ISO date-range enumeration helper and reused it in both Data completeness and Update Plan eligibility calculations.
- Changed actuals month summaries to score the full calendar month, retain the exact missing-open-date list, and aggregate those values consistently at year level.
- Added a Readiness column to the native actuals table with calm complete states and compact month-level gap actions.
- Added an `AppDialog` gap review containing every missing date, closed-date guidance, and a downloadable re-import template.
- Updated `ACT-002` to resolve the loaded-span ambiguity in favor of the normative whole-calendar-month decision and document the repair workflow.
- Added focused calculation, holiday, complete-month, component, and CSV export regressions.

## Files changed

- `specs/actuals/ACT-002-actuals-management-rollup.md`
- `src/components/planning/PlanningGroupActualsView.vue`
- `src/components/__tests__/PlanningGroupActualsView.spec.js`
- `src/planner/dateValues.js`
- `src/planner/groupActualsDataSummary.js`
- `src/planner/planUpdates.js`
- `src/planner/__tests__/groupActuals.spec.js`
- `actions_take/2026-07-18T20-44-52Z-actuals-gap-repair.md`

## Verification commands and exact outcomes

- Pre-change regression: `npm test -- --run src/planner/__tests__/groupActuals.spec.js src/components/__tests__/PlanningGroupActualsView.spec.js`
  - Expected failure: 2 test files failed; 5 new regressions failed and 10 existing tests passed.
- Final focused run: `npm test -- --run src/planner/__tests__/groupActuals.spec.js src/planner/__tests__/planUpdates.spec.js src/components/__tests__/PlanningGroupActualsView.spec.js`
  - Passed: 3 test files, 22 tests.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 71 test files, 377 tests.
  - Vite production build passed: 828 modules transformed.
- `npm run test:e2e`
  - Playwright passed: 15 tests in Chromium.
- `git diff --check`
  - Passed with no whitespace errors.

The full Vitest run emitted the existing Node warning that `--localstorage-file` had no valid path. Playwright emitted the existing `NO_COLOR`/`FORCE_COLOR` warning. Neither warning failed a check.

## Risks and follow-up considerations

- No persisted schema changed. Existing daily actuals remain compatible; coverage is recalculated from stored rows whenever the Data screen opens.
- Coverage percentages will intentionally decrease for previously partial boundary months because days before the first row and after the last row now count when they are expected open dates.
- Gap templates deliberately leave contacts and AHT blank, so the existing all-or-nothing importer will require planners to fill every row before applying the file.
- The dialog lists and downloads gaps one month at a time to keep the workflow bounded and the target period explicit.

## Next three high-value, non-duplicative candidate improvements

1. Add an atomic forecast replacement workflow that validates the new source before superseding the selected version and previews the effect on editable drafts while preserving saved plan snapshots.
2. Show backup export time, schema version, and record scope before replacement restore so planners can verify the recovery point before overwriting local data.
3. Include exact affected row counts in month, year, and all-actuals deletion confirmations so destructive actions meet `ACT-002` and communicate their full scope.
