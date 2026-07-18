# Imported forecasts now replace atomically with plan-impact review

Run type: product improvement

## Capability IDs and roadmap items

- Primary capability: `CAP-FORE-001` imported forecast lifecycle and readiness.
- Supporting capabilities: `CAP-GOV-001` lineage and destructive safeguards; `CAP-UX-001` desktop operational workflow.
- Roadmap: completed `NOW-002` Atomic imported-forecast replacement preview and promoted `NOW-003` Portfolio partial-coverage decision state to Ready.

## Planner persona, decision, desktop workflow, and review scope

- Personas: forecast analyst and long-range WFM planner.
- Decision: determine whether a fully validated daily forecast candidate should replace one exact accepted staffing-group version without changing any plan already built from that version.
- Desktop workflow: open the saved imported forecast, choose `Replace Data`, upload and map a candidate CSV, compare accepted and candidate scope, review every dependent saved plan and state, then confirm one replacement save or retry after failure.
- Review scope: imported daily source replacement, dependency explanation, input validation, focus entry, and persistence behavior. This was not a scheduled code-review run.

## Selected opportunity and evidence

`NOW-002` was the highest ordered executable roadmap item. The repository had partial implementation but no complete planner workflow:

- `PlanningGroupForecastsView.vue` explicitly hid the read-only source action, so staffing-group users could not reach `Replace Data` after accepting an imported forecast.
- `ForecastImportDailyModal.vue` initialized a replacement with the already accepted file and enabled the old `Load` path without requiring a new candidate or showing current-versus-candidate scope.
- No replacement surface named dependent draft/finalized plans or explained that their snapshots would remain unchanged.
- `ForecastingWorkspace.vue` replaced `currentProject` before persistence and closed the dialog before save success, so a local-database failure displaced the accepted editor state and removed the parsed retry surface even though the Dexie transaction protected storage.
- Imported AHT validation accepted zero seconds despite `FIMP-002` requiring positive AHT.
- The replacement persistence contract already used one Dexie transaction across the forecast workspace tables, so a safe detached-candidate save could complete this slice without a schema change.

The pre-change focused regression run failed four new assertions across three files while 34 tests passed. It proved zero AHT was accepted, the source action remained hidden, and replacement review/confirmation was absent. The initial test fixture also exposed a jsdom `File.text()` incompatibility and was corrected to model the browser file contract directly.

## Capability scores before and after

`CAP-FORE-001` moved from **5/3/4/3/4/3** with Improvement Need **32** to **5/4/4/4/4/4** with Improvement Need **20** (Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health).

- Completeness moved to 4 because imported daily replacement is now an end-to-end accepted workflow rather than a hidden editor branch.
- Desktop UX moved to 4 because planners get one reachable command, a dense accepted-versus-candidate comparison, named dependency impact, autofocus, and retry feedback.
- Engineering Health moved to 4 because replacement persists a detached snapshot, plan dependency normalization is shared, and failure behavior is covered end to end.
- Trust remains 4 rather than 5 because prior replacement checksums/history and governed event auditing are not retained.

`CAP-GOV-001` and `CAP-UX-001` evidence improved, but their repository-wide scores did not change on one bounded workflow.

## Product decision

Improve and desktop-redesign the existing imported-source edit while retaining one stable forecast version identifier. The accepted source rows, metadata, derived monthly values, and run timestamp are replaced atomically; the forecast name, ownership, ID, and plan references remain stable.

No plan refreshes automatically. Draft and finalized plan demand snapshots remain unchanged. An editable plan may use its existing explicit `Replace Forecast` action to reapply the newly accepted source; a finalized plan remains immutable.

## WFM rationale, assumptions, and methodology

- Contacts are finite, non-negative daily demand counts; zero contacts are valid.
- AHT is workload time in seconds per contact and must be finite and greater than zero. A zero-second AHT would erase workload while preserving contacts and is therefore blocking.
- Coverage requires exactly one normalized daily row for every calendar date from the selected start through end. Sorting, missing dates, duplicate dates, and out-of-window rows are validated before acceptance.
- Candidate total contacts are the sum of normalized daily `yhat` values. Monthly AHT remains contact-weighted, falling back to a simple mean only when every day in a month has zero contacts.
- Replacement review compares file identity, normalized daily row count, exact date coverage, and total contacts. It does not imply that equal totals mean equal daily shape.
- Existing plans retain the source ID and their immutable monthly/daily demand snapshots; replacement affects future source access and explicit reapplication only.

## Standards reviewed and findings

- Read `AGENTS.md` and `FRONTEND_STANDARDS.md` completely before implementation.
- Feature code uses only shared wrappers (`AppDialog`, `AppFileDropzone`, `AppButton`, `AppSelect`, `AppStatusMessage`, and `AppTableShell`); no feature-level PrimeVue import was added.
- The comparison remains a native table with contained overflow and semantic row/column headers.
- No legacy semantic class, phone-only state, generic data-table dependency, route, or local styling system was introduced.
- `AppFileDropzone` gained a generic autofocus option rather than a page-local focus hack.

## Recent-run rotation and portfolio assessment

The prior audit was a product improvement and the scheduled code-review record remains within the prior nine completed runs, so this run was not due for code review. This was not the fifth non-review run in the active strategy cadence.

Recent work had improved actuals repair, backup recovery, portfolio export, and no-plan reporting. This slice delivers a user-facing forecast governance capability rather than another defect-only or test-only change and follows the roadmap order established in the prior run.

## User value, scope, plan, and acceptance criteria

Operational value: planners can replace an external demand source with the confidence that the file is complete, the exact accepted version is targeted, every saved plan relationship is visible, plan snapshots will not move, and a storage error cannot displace either the accepted source or the retry candidate.

Scope:

- imported daily replacement only
- staffing-group forecast workspace source action
- accepted-versus-candidate review and plan dependency explanation
- positive-AHT enforcement
- detached-candidate save and failure retry
- shared dependency normalization
- focused specs, tests, strategy, and audit record

Acceptance criteria met:

- Invalid input performs no persistence call; zero AHT is blocking.
- Opening replacement requires a new file and never preloads the accepted file as the candidate.
- A valid candidate shows file, rows, coverage, total contacts, and every dependent saved plan with draft/finalized state.
- One repository persistence call replaces one project with the same forecast ID.
- Draft/finalized plan data is never mutated by replacement.
- Persistence failure keeps the accepted editor and stored source while the parsed candidate and error remain in the open dialog.
- Success emits the existing return-to-library event; the updated run timestamp makes the replaced version the selected first row under the existing recent-activity ordering.
- Dialog entry focus is visible on `Choose CSV`; standard dialog focus trapping and Escape behavior remain provided by `AppDialog`.

## Implementation summary

- Exposed `Replace Data` for read-only staffing-group forecasts while keeping library and duplicate actions suppressed.
- Added a replacement-only review table and dependent-plan impact section to the imported daily dialog.
- Cleared accepted source data from the replacement candidate and retained a validated candidate after persistence failure.
- Added detached project-snapshot persistence so current editor state changes only after the Dexie transaction succeeds.
- Centralized plan dependency filtering, naming, and state normalization in `forecastDependencies.js` and reused it for deletion warnings and replacement preview.
- Required strictly positive imported AHT values.
- Added a generic `autofocus` option to `AppFileDropzone` and used it for modal entry.
- Added pure dependency, source validation, view wiring, successful replacement, and failed replacement regressions.

## Removed code and product surface

- Removed the hidden-source-action configuration that made accepted imported forecasts unreachable for replacement.
- Removed 37 lines of duplicated dependency filtering, plan naming, and draft/finalized state logic from `usePlanningGroupForecastActions.js`; the shared domain helper now supplies both deletion and replacement workflows.
- Removed pre-save mutation of `currentProject` for read-only source persistence.
- Removed the modal's unconditional close-on-apply behavior that discarded retry context before persistence completed.
- No file, route, dependency, or stored-data compatibility layer became fully obsolete.

## Files changed and migration impact

- `product/WFM_CAPABILITY_ASSESSMENT.md`
- `product/ROADMAP.md`
- `specs/forecast-import/FIMP-007-version-management.md`
- `src/components/ForecastingWorkspace.vue`
- `src/components/forecasting/ForecastImportDailyModal.vue`
- `src/components/planning/PlanningGroupForecastsView.vue`
- `src/components/ui/AppFileDropzone.vue`
- `src/composables/forecasting/useForecastProjectLibrary.js`
- `src/composables/planning/usePlanningGroupForecastActions.js`
- `src/composables/useForecastingWorkspace.js`
- `src/forecasting/sourceArtifacts.js`
- `src/planner/forecastDependencies.js`
- focused tests under `src/components/__tests__`, `src/forecasting/__tests__`, and `src/planner/__tests__`
- this audit record

Migration impact: none. Forecast IDs, scopes, Dexie schema, backups, plan records, plan snapshots, routes, and local-data versions are unchanged. Previously accepted imported rows with zero AHT remain readable; they must be replaced with positive AHT before a new candidate can be accepted.

## Verification outcomes

- Pre-change focused regression: `npm test -- --run src/forecasting/__tests__/sourceArtifacts.spec.js src/components/__tests__/PlanningGroupForecastsView.spec.js src/components/__tests__/ForecastingWorkspace.spec.js`
  - Expected failure: 3 files failed; 4 new assertions failed and 34 tests passed.
  - The run also exposed and led to correction of the jsdom file-fixture `text()` contract.
- Focused implementation run: `npm test -- --run src/forecasting/__tests__/sourceArtifacts.spec.js src/components/__tests__/PlanningGroupForecastsView.spec.js src/components/__tests__/ForecastingWorkspace.spec.js src/composables/planning/__tests__/usePlanningGroupForecastActions.spec.js`
  - Passed: 4 files, 44 tests.
- First `npm run verify`
  - Lint and frontend standards passed.
  - Vitest had one timing-only failure after 390 tests passed: persistence completed before the async emitted-event assertion observed completion. Build did not run because the chained command stopped.
  - Replaced the fixed microtask loop with `vi.waitFor`; the focused 28-test `ForecastingWorkspace` file then passed.
- Final `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 74 files, 391 tests.
  - Vite production build passed: 831 modules transformed.
- `npm run test:e2e`
  - Passed: 15 Chromium tests.
- `git diff --check`
  - Passed after removing Markdown hard-break trailing spaces.

Vitest emitted the existing `--localstorage-file` warning. Playwright emitted the existing `NO_COLOR`/`FORCE_COLOR` warnings. Neither failed verification.

## Desktop widths, states, keyboard behavior, zoom, and resizing reviewed

The real local workflow was exercised in the in-app browser using a temporary center, staffing group, one-month imported forecast, and replacement candidate. All temporary browser data was removed through the verified clear-all confirmation flow after inspection.

- 1280×900: body client/scroll widths were both 1280 px; dialog client/scroll widths were both 1022 px. The 960 px file-definition table had a deliberate 3 px contained overflow inside its 957 px wrapper; the replacement comparison fit at 957 px.
- 1440×900: body widths were 1440/1440 and dialog widths 1022/1022. Table containment remained 957/960 and 957/957.
- 1920×1000: body widths were 1920/1920 and dialog widths 1022/1022. The modal stayed compact rather than stretching across the wide desktop; vertical scrolling retained the action footer.
- Empty candidate, fully validated candidate, current-versus-candidate comparison, no-dependent-plan copy, save-enabled state, modal cancel, successful initial import, return to forecast library, and destructive test-data cleanup were reviewed.
- Dependent draft/finalized rendering and persistence-failure retry were covered by component regressions with exact names and state labels.
- `Choose CSV` received focus on modal open and displayed the standard visible focus ring. Native mapping selects, semantic tables, buttons, and dialog focus containment remained keyboard operable.
- Browser zoom was not changed independently; the 1280 px constrained-laptop check covered the supported narrow desktop/zoom-like layout. Window resizing across 1280, 1440, and 1920 was explicit.
- Browser console: no errors. Three existing `vue-echarts` warnings reported an invalid default slot while forecast charts rendered; they are unrelated to this dialog change.

## Strategy and roadmap updates

- Completed `NOW-002` and recorded stable forecast-ID replacement as the accepted lineage decision.
- Improved `CAP-FORE-001` Need from 32 to 20 with calibrated score/evidence updates.
- Kept Trust at 4 because replacement checksum history and governed event auditing remain absent.
- Promoted `NOW-003` partial portfolio coverage from Candidate to Ready as the next executable reporting-integrity item.
- Added decision-log entries without removing prior sequencing decisions.

## Compatibility, risks, limitations, and follow-ups

- Existing forecast and plan records require no migration. Plan snapshots are not rewritten or redirected.
- Replacement is implemented for imported daily sources. Manual monthly source editing still uses its existing update path and does not receive this dependency preview.
- The dependency review covers saved plan records, including saved Budget drafts. Separate autosaved recovery records are not independently queried; they restore into the plan workflow and remain governed by its explicit source-application behavior.
- The comparison shows aggregate contacts and coverage, not daily shape deltas. Side-by-side forecast version comparison belongs with later scenario/comparison work.
- Stable-ID replacement does not retain the superseded source rows or checksum as an audit event. A future governance slice should add history before server collaboration.
- AHT values previously stored as zero remain display-compatible but are now rejected on new import/replacement, as required by the workload contract.

## Next three non-duplicative candidates

1. Product capability — `NOW-003`, `CAP-REP-002`: make partial portfolio coverage decision-safe by naming every excluded staffing group and scoping authority-sensitive totals.
2. Desktop UX — `NEXT-001`, `CAP-SCEN-001`/`CAP-UX-001`: build side-by-side annual plan comparison with assumption deltas and monthly exceptions on one wide desktop surface.
3. Deletion/simplification — `CAP-IO-001`: consolidate the remaining backup and actuals-gap Blob/object-URL download lifecycles into the shared browser-download primitive and remove duplicate cleanup code.
