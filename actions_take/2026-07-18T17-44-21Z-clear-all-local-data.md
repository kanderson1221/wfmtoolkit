# Clear-all local data is now safely available

## Selected problem and supporting evidence

The Local Data Storage screen could download and replace backups, but it offered no way to perform the clear-all operation required by `DATA-004`. The repository already had an atomic `clearLocalDataStore` transaction, but it was reachable only from tests and internal cleanup code, leaving users without a supported empty-workspace reset.

`DATA-004` requires clear-all to name the action and scope, explain cascade impact and saved-plan protection, recommend a backup, default safely to cancellation, remove planning records/imports/drafts transactionally, reload the empty application state on success, and report failure without implying partial success.

## User and operational value

Planners can now intentionally reset all WFM Toolkit data stored in the current browser without hunting through individual workspaces or relying on developer tooling. The confirmation makes the blast radius concrete, protects against a single accidental click, and points users to backup recovery before irreversible deletion.

## Plan, scope, and acceptance criteria

Scope was limited to wiring the existing transactional clear primitive into the Local Data Storage dialog and reloading application state after a successful clear. No storage schema, migration, individual-record deletion behavior, or backup format changed.

Acceptance criteria:

- The storage screen exposes one clearly separated danger action for clearing local data.
- Opening the action performs no write and cancellation leaves storage unchanged.
- Confirmation names the action, reports call-center, staffing-group, plan, forecast, and draft counts, explains that saved plans and drafts are deleted, and recommends downloading a backup.
- Confirming invokes the existing atomic clear operation exactly once.
- Success refreshes the storage summary and reloads the application into its empty state.
- Failure displays the storage error and does not emit a successful data-change signal.
- Focused tests, `npm run verify`, and `npm run test:e2e` pass.

## Implementation summary

- Added a calm, separated Data Removal panel to `LocalDataStorageDialog` with a danger-toned `Clear All Local Data` action.
- Added a shared confirmation dialog that lists the current affected record counts, states that plans and recoverable drafts are not protected, and recommends exporting a backup first.
- Connected confirmation to the existing transactional `clearLocalDataStore` operation, refreshed the storage summary on success, and surfaced failures through the existing status message.
- Added a `cleared` event and connected it in the application shell so routes and loaded planning data are refreshed after deletion.
- Added component regressions for cancellation, successful clearing/reload, and failure reporting.

## Files changed

- `src/App.vue`
- `src/components/LocalDataStorageDialog.vue`
- `src/components/__tests__/LocalDataStorageDialog.spec.js`
- `actions_take/2026-07-18T17-44-21Z-clear-all-local-data.md`

## Verification commands and exact outcomes

- Pre-change regression: `npm test -- --run src/components/__tests__/LocalDataStorageDialog.spec.js`
  - Expected failure: 1 test file failed; the 3 new clear-all regressions failed and 2 existing tests passed because the action did not yet exist.
- Final focused run: `npm test -- --run src/components/__tests__/LocalDataStorageDialog.spec.js`
  - Passed: 1 test file, 5 tests.
- `git diff --check`
  - Passed with no whitespace errors.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 70 test files, 359 tests.
  - Vite production build passed: 828 modules transformed.
- `npm run test:e2e`
  - Passed: 15 Playwright tests in Chromium.

The full Vitest run emitted the existing Node warning that `--localstorage-file` had no valid path. Playwright emitted existing color-environment warnings. Neither warning failed verification.

## Risks and follow-up considerations

- Clearing affects every WFM Toolkit workspace stored in the browser, which the confirmation states explicitly through the displayed aggregate counts.
- The storage transaction remains the source of atomicity; no lower-level deletion implementation changed in this run.
- Backup creation remains user-controlled. The confirmation recommends a backup but does not create an automatic recovery snapshot.
- All pre-existing uncommitted planner and model changes were preserved and excluded from this run's commit.

## Next three high-value, non-duplicative candidate improvements

1. Add dependency-aware forecast deletion warnings that name affected draft and finalized plans while preserving their saved snapshots, as required by `FIMP-007`.
2. Show the backup export timestamp alongside record counts before replacement import so planners can verify both age and scope, as required by `DATA-003`.
3. Allow training recommendations to use decimal class headcount where needed instead of always ceiling-rounding hires to a whole person, matching the first-release staffing decision and `PLAN-009`.
