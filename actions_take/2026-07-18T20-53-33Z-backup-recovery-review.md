# Backup restores now show a verified recovery point

## Selected opportunity and supporting evidence

The replacement-restore dialog previously showed only aggregate record counts. A planner could not verify which file was selected, when its recovery point was exported, which backup format and schema it used, or whether the import represented the complete local dataset before confirming a destructive replacement.

- `DATA-003` requires pre-import envelope, schema, format, collection, and count validation before any persisted data changes.
- `DATA-003` and Workflow 5 require the replacement confirmation to show the backup timestamp and record counts.
- `DATA-005` requires unsupported future schemas to be rejected without a destructive downgrade.
- `src/storage/localDataStore.js` already retained export timestamp, format, schema, and application version during validation, but discarded that identity data from `analyzeLocalDataBackup` results.
- `src/components/LocalDataStorageDialog.vue` therefore had no way to present the recovery point beyond five record counts, and backup validation accepted any positive integer schema, including future versions.

The bounded candidate set considered was:

1. Product capability: atomic imported-forecast replacement with draft impact preview.
2. Workflow/UI: verified backup recovery-point review before replacement restore.
3. Trust: exact affected-row counts for actuals month, year, and full-history deletion confirmations.
4. Engineering excellence: consolidate backup format compatibility rules and focused persistence tests.

The recovery-point review was selected because it closes a destructive workflow gap end to end, combines visible user value with required compatibility enforcement, and fits safely within the existing atomic restore architecture.

## Primary improvement category and recent-run portfolio assessment

Primary category: **Workflow quality and substantive UI/UX**, with a supporting trust/correctness improvement.

The last five completed runs covered actuals gap repair, invalid training-count blocking, decimal training headcount, forecast dependency warnings, and complete actuals cutoffs. That mix was weighted toward correctness and validation, with one workflow enhancement. This run deliberately adds a polished user-facing recovery review instead of another planner calculation guardrail.

## User and operational value

Planners can now verify the exact backup file, recovery timestamp, format, schema version, complete-data scope, and record inventory before replacing the browser's current planning data. Future-schema or explicitly unsupported-format backups stop before the confirmation and before any transaction, reducing wrong-file restores and destructive downgrade risk.

## Plan, scope, and acceptance criteria

Scope was limited to local backup analysis, pre-import compatibility, the existing replacement confirmation, relevant specifications, and focused tests. Export contents, stored-data structure, transaction behavior, clear-all behavior, planning workflows, and successful legacy table-backup import were not changed.

Acceptance criteria:

- Current and supported legacy backups retain their existing import paths.
- Analysis returns backup format, readable format label, schema version, export timestamp, application version, and complete-data scope alongside record counts.
- A future schema or explicitly unsupported format is rejected before confirmation and before persisted data changes.
- The confirmation names the selected file and shows recovery-point identity plus record counts.
- The confirmation states that replacement is atomic and current data remains intact on failure.
- Cancellation performs no import; explicit confirmation imports and emits the existing refresh event.
- The dialog remains readable and both actions remain reachable at desktop and 390-by-844 viewport sizes.
- Focused tests, `npm run verify`, `npm run test:e2e`, browser inspection, and `git diff --check` pass.

## Implementation summary

- Extended validated backup summaries with format, readable format label, schema, export timestamp, application version, and complete local-data scope.
- Added positive/current schema enforcement and explicit format compatibility checks before envelope data can reach the restore transaction.
- Expanded the replacement confirmation to name the selected file, show a compact recovery-point strip, separate the record inventory, and explain atomic failure protection.
- Preserved shape-based compatibility for legacy table backups without a historical `backupFormat` field.
- Added component coverage for review, cancellation, and confirmation plus storage coverage for metadata, future-schema rejection, format rejection, and data preservation.
- Updated the backup contract and screen workflow wireframe.

## Files changed

- `specs/data/DATA-003-backup-restore.md`
- `specs/design/SCREEN-WORKFLOWS.md`
- `src/components/LocalDataStorageDialog.vue`
- `src/components/__tests__/LocalDataStorageDialog.spec.js`
- `src/storage/localDataStore.js`
- `src/storage/__tests__/localDataStore.spec.js`
- `actions_take/2026-07-18T20-53-33Z-backup-recovery-review.md`

## Verification commands and exact outcomes

- `npm test -- --run src/storage/__tests__/localDataStore.spec.js src/components/__tests__/LocalDataStorageDialog.spec.js`
  - Passed: 2 test files, 18 tests.
- `npm run lint -- --quiet`
  - Passed with no ESLint errors.
- `npm run check:standards`
  - Passed: frontend standards check.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 71 test files, 381 tests.
  - Vite production build passed: 828 modules transformed.
- `npm run test:e2e`
  - Playwright passed: 15 Chromium tests.
- `git diff --check`
  - Passed with no whitespace errors.

The full Vitest run emitted the existing Node warning that `--localstorage-file` had no valid path. Playwright emitted the existing `NO_COLOR`/`FORCE_COLOR` warnings. Neither warning failed a check.

## Screens or interaction states reviewed

- Local Data Storage dialog in the empty-workspace state.
- Replacement confirmation with a populated valid schema-version-2 backup at the default desktop viewport.
- Recovery-point identity strip, five record counts, failure-protection message, and action hierarchy.
- Responsive replacement confirmation at a 390-by-844 viewport; both action buttons remained within the viewport and no horizontal overflow was present.
- Safe cancellation; the nested confirmation closed without importing.
- Browser console after the workflow; no errors were reported.

## Risks and follow-up considerations

- Backups declaring a schema newer than version 2 now intentionally require a newer WFM Toolkit version rather than attempting a destructive downgrade.
- Supported legacy table backups without a `backupFormat` field remain shape-detected and importable. An explicit format declaration must now match the envelope structure.
- Historical backups without an export timestamp remain analyzable and display an unavailable marker rather than inventing a recovery time.
- No stored schema or successful import transaction behavior changed.

## Next three high-value, non-duplicative candidates

1. Add an atomic imported-forecast replacement workflow that validates the new source before superseding the selected version and previews effects on editable drafts while preserving saved plan snapshots.
2. Add a selected-year portfolio CSV export for monthly required, starting, and ending headcount so planners can use the existing reporting view in downstream operating reviews.
3. Improve actuals deletion confirmations with exact affected daily-row counts and clearer month/year/full-history hierarchy so destructive scope is immediately scannable before confirmation.
