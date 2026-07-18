# Portfolio operating plans are now exportable

Run type: code review and remediation

## Planner persona, decision supported, and reviewed scope

- Planner persona: workforce planning lead preparing a selected-year operating review across call centers and staffing groups.
- Decision supported: identify monthly demand and staffing risk, then carry the reconciled requirement and supply record into finance, recruiting, and operations follow-up.
- Reviewed subsystem: the Planning Portfolio monthly operating report, its annual rollup inputs, export behavior, CSV serialization infrastructure, specification, focused tests, and desktop/mobile presentation.

## Selected opportunity and supporting evidence

The portfolio already presented the selected-year monthly demand, required headcount, staffing supply, movements, actuals, and gaps, but planners could not take that decision record outside the browser. `PORT-003` still listed export as an open question even though the same report is the natural source for downstream operating reviews.

The bounded code review also found:

- The report subtitle did not identify that its aggregation used the `current` plan role, despite `PORT-005` requiring plan role near report data.
- `PlannerMonthlyPlanTab.vue` owned 48 lines of generic CSV number formatting, escaping, serialization, filename sanitization, Blob creation, and object-URL cleanup. Adding another local implementation would have created a second copy of the same mechanics.
- CSV escaping and missing-value behavior had only indirect component coverage and no focused shared contract.
- The portfolio had no test proving that missing actuals remain blank in a portable report rather than becoming fabricated zeroes.

The candidate set was:

1. Product capability: selected-year portfolio monthly CSV export.
2. Workflow/UI: make current-plan scope and missing-actual treatment explicit in the report header.
3. Trust/correctness: block or blank misleading unavailable actual values in portable output.
4. Code deletion/simplification: remove component-local CSV infrastructure and consolidate it for both existing and new exports.
5. Engineering excellence: add focused serialization and portfolio-contract tests.

The coherent export/remediation slice was selected because it resolves all five findings without changing rollup calculations or persistence.

## Retain, improve, redesign, replace, consolidate, simplify, or remove decision

Retain the selected-year monthly operating report and annual-rollup methodology. Improve it with a self-describing export and explicit plan scope. Consolidate browser CSV mechanics into a shared utility. Remove the obsolete component-local helper implementations.

A report redesign was not warranted: the existing native table is operationally dense, chronological, and already reconciles with the staffing waterfall. No route, navigation, or stored-state migration was needed.

## WFM domain rationale, assumptions, and methodology

- The export uses the same `buildAnnualPlanningRollup` monthly rows as the visible table and chart; it does not recalculate staffing independently.
- Scope is one selected planning year and the `current` plan role. The existing rollup selects each staffing group's current plan, then falls back to its Budget or freshest saved plan when no current marker exists.
- Demand, workload, required staff hours, required headcount, peak requirement, starting frontline, hires, frontline-ready additions, attrition, ending frontline, ending roster, and staffing gaps retain their distinct meanings.
- `ending_frontline_minus_required_headcount` uses the existing gap convention: negative means supply is below planned requirement.
- `starting_frontline_minus_actual_required_headcount` remains a separate actual-requirement comparison.
- Missing actual contacts, AHT, workload, and actual requirement remain blank. Zero remains a valid observed or planned numeric value.
- CSV numeric output retains up to six decimal places so spreadsheet users receive calculation precision beyond the one-decimal screen presentation without false trailing precision.
- The export is unavailable when no staffing group has an applicable selected-year plan, preventing a twelve-row zero plan from being downloaded as an operating baseline.

## Standards reviewed and concrete findings

- `AGENTS.md` and `FRONTEND_STANDARDS.md`: the feature continues to use `AppButton`, native table markup, the existing `AppPanel` shell, Tailwind composition, and no direct PrimeVue imports or legacy semantic classes.
- Architecture: domain-specific export mapping is in `src/planner/portfolioCsv.js`; generic serialization/download behavior is in `src/csvExport.js`; `PlanningHome.vue` remains orchestration and composition.
- Accessibility: the export uses a visible, meaningful button name and native disabled state. The selected-year control and table semantics remain unchanged.
- Correctness and reporting trust: selected year and plan role are included on every row; coverage is explicit; missing actuals stay blank; row order is inherited from the chronological annual rollup.
- Data safety and compatibility: export is read-only and does not mutate IndexedDB, local storage, routes, plans, forecasts, or actuals.
- Error handling: the action is gated before serialization when no applicable plan exists; the shared browser download lifecycle revokes its object URL after the click.
- Performance: the 12-row CSV is constructed only on demand; no new watcher, persisted state, or background calculation was added.
- Test quality: shared escaping/formatting and portfolio semantics now have focused tests, while the existing planner monthly/interval download regressions prove consolidation compatibility.
- Dead and duplicate code: 48 component-local CSV helper lines and the component-local MIME constant were removed.

## Primary improvement category and recent-run portfolio/rotation assessment

Primary category: **code excellence and simplification**, delivering a planner-facing reporting capability and a trust improvement.

None of the previous nine audit records explicitly identified `Run type: code review and remediation`, so the rotation required this run to be the scheduled focused review. The immediately prior run improved backup recovery review; earlier runs were weighted toward actuals/training correctness. This remediation adds a user-facing portfolio capability while satisfying the required architecture, accessibility, correctness, test, and dead-code review of one subsystem.

## User and operational value

Planning leads can now download the same selected-year operating record they use on screen and reconcile monthly demand, requirement, staffing supply, hiring movements, actuals, and shortages with finance, talent acquisition, and operations. Explicit scope and blank unknowns make the file safer than copying rounded table values or rebuilding totals manually.

## Plan, scope, and acceptance criteria

Scope was limited to the portfolio monthly report, reusable CSV infrastructure exposed by the change, `PORT-003`, and focused tests. Annual rollup calculations, drill-down, plan selection behavior, persistence, routes, navigation, and other download formats were not changed.

Acceptance criteria:

- The selected-year export contains exactly 12 chronological monthly rows.
- Every row identifies the planning year, `current` plan role, planned-group coverage, and actuals coverage.
- Demand, AHT, workload, required staff hours/headcount, staffing supply, movements, planned and actual gaps, shortage state, and loaded actual days are included.
- Missing actuals are blank, while numeric zero remains zero.
- The filename identifies WFM portfolio, current-plan scope, and selected year.
- The action is disabled with no applicable plan and absent with the existing no-center empty state.
- Generic CSV behavior is shared with the existing planner exports, and obsolete local helpers are removed.
- Lint, standards, all tests, production build, end-to-end smoke tests, responsive browser review, console review, and whitespace checks pass.

## Implementation summary

- Added a `Download Portfolio CSV` action to the monthly operating report header with an explicit current-plan/missing-actuals description.
- Added a pure portfolio CSV mapper containing 29 self-describing fields and six-decimal calculation precision.
- Added shared CSV formatting, escaping, serialization, filename sanitization, Blob download, and object-URL cleanup.
- Migrated the existing staffing-ratio and intraday Erlang downloads to the shared utility.
- Added shared utility, portfolio domain, enabled-download, exact filename, twelve-row, and no-plan disabled regressions.
- Updated `PORT-003` to make selected-year export a requirement and replace the resolved open question with a future detail-export question.

## Code and product surface removed

- Removed 48 lines of generic CSV implementation from `PlannerMonthlyPlanTab.vue`, including its local MIME constant, formatter, escaping, serializer, downloader, and filename sanitizer.
- Removed the obsolete open question asking whether the monthly portfolio report should be exportable.
- No files or dependencies became fully obsolete. No compatibility layer was introduced.
- The reviewed planner component changed by net -46 lines; the repository grew overall because the new reusable utility, portfolio contract, capability, tests, specification, and audit record are new production-worthy surface.

## Files changed and migration impact

- `src/components/PlanningHome.vue`
- `src/components/__tests__/PlanningHome.spec.js`
- `src/components/planner/PlannerMonthlyPlanTab.vue`
- `src/csvExport.js`
- `src/__tests__/csvExport.spec.js`
- `src/planner/portfolioCsv.js`
- `src/planner/__tests__/portfolioCsv.spec.js`
- `specs/portfolio/PORT-003-monthly-headcount-reporting.md`
- `actions_take/2026-07-18T21-08-34Z-portfolio-csv-review.md`

Migration impact: none. The change adds a read-only download and refactors in-memory serialization. Stored plans, forecasts, actuals, local-data schemas, and backups remain unchanged.

## Verification commands and exact outcomes

- Focused: `npm test -- --run src/__tests__/csvExport.spec.js src/planner/__tests__/portfolioCsv.spec.js src/components/__tests__/PlanningHome.spec.js src/components/__tests__/PlannerMonthlyPlanTab.spec.js`
  - Passed: 4 test files, 23 tests.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 73 test files, 386 tests.
  - Vite production build passed: 830 modules transformed.
- `npm run test:e2e`
  - Passed: 15 Chromium smoke tests.
- `git diff --check`
  - Passed with no whitespace errors after correcting Markdown acceptance-scenario trailing spaces.

The full unit run emitted the existing Node warning that `--localstorage-file` had no valid path. Playwright emitted the existing `NO_COLOR`/`FORCE_COLOR` warning. Neither warning failed verification.

## Screens and interaction states reviewed

- Existing no-center empty state at the default desktop viewport; the new action is correctly absent with the report.
- Center-with-no-plan state at the default desktop viewport; current-plan scope is visible and the download button is semantically disabled.
- The same no-plan report header and horizontally scrollable native table at 390-by-844; the full-width export action remains visible and reachable.
- Enabled populated-plan behavior through the rendered component regression, including exact filename, 12 rows, required/start/end/roster measures, and Blob cleanup.
- Existing staffing-ratio and intraday Erlang plan exports through their component regressions after shared-helper migration.
- Browser console throughout desktop/mobile review; no errors were reported.
- Temporary empty review-center data created for visual inspection was removed through the product's confirmation flow, returning the browser workspace to its original empty state.

## Data compatibility, risks, and follow-up considerations

- No persisted format changed and no user data is mutated by export.
- The CSV is an aggregate portfolio report, not a staffing-group detail extract. It cannot yet reconcile contributing group rows outside the application.
- The export intentionally follows existing current-plan fallback behavior and mixed-method compatibility assumptions in `annualPlanningRollup.js`; changing those rules requires a separate WFM methodology decision.
- The browser-native download has no success toast because completion is surfaced by the browser download itself; download failure feedback could be added if browser error telemetry becomes available.
- The existing center-with-no-plan portfolio still renders zero-valued monthly rows and KPI summaries. Export is blocked, but replacing that report with a stronger incomplete state is a separate high-value UI/trust improvement.

## Next three high-value, non-duplicative candidates

1. Product capability: add atomic imported-forecast replacement with full pre-validation and a preview of editable-draft impact while preserving saved plan snapshots.
2. UI/UX: replace the zero-valued portfolio KPI/table presentation for centers with no applicable selected-year plans with a scoped incomplete state and direct next actions.
3. Deletion/simplification: consolidate the remaining component-local Blob/object-URL download lifecycles in backup and actuals-gap workflows into one tested browser-download primitive and remove the duplicates.
