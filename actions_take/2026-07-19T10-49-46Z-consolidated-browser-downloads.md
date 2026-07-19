# Browser downloads now share one failure-safe lifecycle

Run type: product improvement

## Scope and planner decision

- Capabilities: `CAP-IO-001`; supporting `CAP-DATA-001` and `CAP-UX-001`
- Roadmap: completed `NOW-006`; `NOW-005` remains the active forecast capability and is not reinterpreted while `INT-002` is Open
- Interview evidence: `INT-002` is unrelated to export mechanics and remains Open; no owner answer was changed and no new question was added
- Planner personas: planning data owner protecting local work; forecast analyst and planner exporting decision evidence; operations analyst repairing actuals coverage gaps
- Planner decision: trust that the selected export was created with the expected content, content type, and filename without leaving browser resources allocated after a failed click dispatch
- Desktop workflow: download a local backup or actuals-gap CSV from the retained desktop dialog/table workflow; other CSV exports continue through the same shared path
- Product disposition: consolidate and simplify; retain planner-visible export contracts while removing feature-owned browser mechanics
- Review scope: every runtime Blob/object-URL download, filename sanitation, backup and actuals-gap component behavior, focused tests, live desktop smoke, specifications, strategy, and obsolete duplicate code

## Opportunity and evidence

`src/csvExport.js` already centralized CSV construction and some downloads, but the local-data backup dialog and actuals-gap repair workflow independently recreated the same Blob, object-URL, temporary anchor, click, and cleanup sequence. The actuals view also carried a duplicate filename sanitizer. Runtime search found exactly three object-URL implementations, so one small primitive could own the full browser lifecycle without changing WFM calculations, persisted data, or planner-visible workflow.

The prior implementation revoked object URLs only after `link.click()` returned. If browser click dispatch threw, cleanup was skipped. Component-level tests verified ordinary success, but no direct contract covered failure cleanup.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health.

| Capability | Before | Need | After | Need | Rationale |
|---|---:|---:|---:|---:|---|
| `CAP-IO-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | All runtime text/CSV/JSON downloads now share one tested path and cleanup is failure-safe, but scheduled integrations and exported-file checksum evidence remain absent. |
| `CAP-DATA-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Local backup export is less duplicative without changing backup coverage, schema, restore, or single-device limitations. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | Download behavior is consistent, but product-wide keyboard, focus, zoom, and sticky-context gaps are unchanged. |

## WFM rationale and interpretation

- Backup JSON protects the complete supported local planning workspace; the shared primitive does not create or mutate its data.
- Actuals-gap CSV retains the exact missing open dates so planners can fill and re-import missing contacts and AHT values.
- Forecast, plan-comparison, and worksheet CSV exports retain their existing generation logic and filenames.
- No demand, workload, staffing, service-level, shrinkage, forecast, or aggregation formula changed. Units and interpretation are therefore unchanged.
- The improvement is operational reliability and engineering simplification, not a new export format or integration promise.

## Plan and acceptance criteria

1. Introduce one generic text-file download primitive accepting filename, text, and MIME type.
2. Delegate CSV downloads through that primitive.
3. Move backup JSON and actuals-gap CSV to the shared path without changing file contents, MIME type, or naming.
4. Reuse the shared filename sanitizer and preserve the `staffing-group` fallback.
5. Guarantee object-URL cleanup when click dispatch throws.
6. Remove every duplicate runtime Blob/object-URL implementation and local sanitizer exposed by the change.
7. Preserve visible success/error states and existing component contracts.
8. Pass focused component/utility tests, lint, frontend standards, full unit tests, build, and end-to-end smoke tests.

Acceptance result: met.

## Implementation and removals

- Added `src/fileDownload.js` as the single runtime owner of Blob creation, object-URL creation, anchor setup, click dispatch, and `finally` cleanup.
- Reduced `downloadCsv` to a typed delegation through the shared primitive.
- Replaced the backup dialog's local Blob/URL/anchor sequence with `downloadTextFile(..., 'application/json')`.
- Replaced the actuals-gap view's local Blob/URL/anchor sequence with `downloadCsv` and reused `sanitizeFileNamePart` with the existing fallback.
- Added direct tests for content/name/type delivery and cleanup when click dispatch throws.
- Removed two feature-level browser-download implementations and one duplicate filename sanitizer. Runtime source now contains one `createObjectURL` and one `revokeObjectURL` call.
- The edited runtime surface is net smaller: existing runtime files removed 36 lines and added 11; the 17-line shared primitive leaves a net reduction of 8 runtime lines while centralizing the contract.

No route, component layout, dependency, backend API, calculation, persisted schema, data migration, or phone-specific code was added.

## Standards and review findings

- No PrimeVue import, wrapper bypass, semantic table change, legacy class, or ad hoc UI pattern was introduced.
- The actuals-gap control remains within its native-table workflow; backup remains in `AppDialog` with visible status text.
- Feature components no longer own repeated browser mechanics; shared non-UI behavior lives in a focused source module.
- Browser cleanup is now deterministic under both successful and failed click dispatch.
- Specifications retain the product behavior and now trace the shared implementation.

## Exact verification

- Initial focused run: `npm test -- --run src/__tests__/fileDownload.spec.js src/__tests__/csvExport.spec.js src/components/__tests__/PlanningGroupActualsView.spec.js src/components/__tests__/LocalDataStorageDialog.spec.js`
  - Existing component/CSV tests passed, but both new utility tests failed because jsdom does not define `URL.createObjectURL`; the test harness was corrected to install configurable URL mocks.
- Corrected focused run: same command
  - Passed: 4 files, 18 tests.
- `npm run lint -- --quiet`
  - Passed after implementation.
- `npm run check:standards`
  - Passed after implementation.
- `npm run verify:full`
  - Passed ESLint.
  - Passed frontend standards.
  - Passed Vitest: 78 files, 402 tests.
  - Passed production build: 835 modules transformed.
  - Passed Playwright: 15 Chromium tests.
  - Unit tests emitted the existing invalid `--localstorage-file` warning; end-to-end emitted the existing `NO_COLOR`/`FORCE_COLOR` warning. No check failed.
- `git diff --check`
  - Passed before full verification and is repeated on the final tree.

No Python or backend behavior changed, so backend unit tests were not applicable.

## Desktop browser review

The browser-control skill was used against the real Vite application and retained local planning data. The Call Centers workspace loaded with one center and the Local Data Storage dialog reported one center, two staffing groups, and one annual plan. Activating Download Backup produced the visible `Backup downloaded.` status, advanced Last Backup Export to the current run time, and produced no console warning or error.

The in-app browser's download-event observer timed out even though the application completed the programmatic anchor workflow and showed the authoritative success state. File content, MIME type, click dispatch, filename construction, and URL cleanup are covered by the focused utility/component tests. No layout or responsive CSS changed, so separate 1280/1440/1920 visual comparisons would not add evidence for this non-visual slice; existing end-to-end desktop flows all passed.

## Strategy, roadmap, and interview updates

- Completed `NOW-006` and recorded the consolidated-download decision.
- Updated `CAP-IO-001` evidence, gap, recommendation, and review date while keeping its calibrated `5/4/4/4/4/4` score and Need 20.
- Added the shared implementation to `DATA-003` and `ACT-002` traceability.
- `INT-002` remains the only Open interview question. It is not duplicated or used to block this safe simplification.

## Rotation and portfolio balance

The last `code review and remediation` record is within the prior nine completed audits, so this run is not the required review. It is the fourth ordinary non-review run after the latest strategic portfolio review; the next non-review cadence milestone remains the fifth-run strategic review, while the next overall audit must also respect the one-in-ten code-review rule.

The prior three non-review runs delivered user-facing forecast/scenario capability and desktop decision evidence. This bounded engineering-excellence/deletion slice restores portfolio balance without displacing the active `NOW-005` acceptance workflow or treating code volume as progress.

## Compatibility, risks, limitations, and follow-ups

- Backup JSON envelope, export date naming, actuals-gap CSV schema, forecast CSVs, plan-comparison CSV, and worksheet CSV remain unchanged.
- Browser downloads remain client-side and do not add checksums, encryption, scheduled integration, or server delivery.
- Immediate object-URL revocation preserves existing browser semantics; the new guarantee specifically covers cleanup when click dispatch throws.
- The browser download-event hook could not independently observe the programmatic anchor download in the in-app browser, so file-level assertions remain automated in Vitest rather than duplicated in browser automation.
- No sponsor question was warranted because this change does not alter workflow methodology, product scope, or acceptance semantics.

## Three linked candidates considered

1. Capability/workflow — `CAP-FORE-002`, `NOW-005`: add saved configuration-to-configuration or rolling-origin acceptance comparison. Highest direct forecast value, but `INT-002` still governs the real acceptance decision, thresholds, holdout policy, and candidate semantics.
2. Desktop UX/trust — `CAP-REP-002`, `CAP-UX-001`: standardize retained call-center stale/error states with correction actions and reliable focus restoration. Valuable, but broader than a coherent safe slice without a bounded stale-state contract.
3. Deletion/simplification — selected: `CAP-IO-001`, completed `NOW-006`; consolidate all browser download lifecycles and filename sanitation because repository evidence proved exact duplication, no product ambiguity was involved, and recent runs already exceeded the required user-facing improvement balance.
