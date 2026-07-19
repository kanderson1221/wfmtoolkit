# Destructive confirmations now keep keyboard focus safe

Run type: code review and remediation

## Capability, roadmap, and interview scope

- Capabilities: `CAP-UX-001`, supporting `CAP-GOV-001` and `CAP-DATA-001`.
- Roadmap: completed `NOW-007` — Focus-safe destructive confirmations.
- Interview evidence: `INT-002` remains Open and governs forecast acceptance, not confirmation behavior. No answer was detected, applied, or changed; no new sponsor question was warranted.
- Planner persona: a desktop WFM planner reviewing a destructive or replacement action while working by keyboard and mouse.
- Decision supported: inspect the named consequence, choose the safe cancellation path or confirm deliberately, and continue from the initiating control without losing context.
- Reviewed subsystem: shared `AppDialog` / `AppConfirmDialog` behavior, confirmation tests, the nested local-data confirmation workflow, and `FOUND-005`, `DATA-004`, and `SCREEN-WORKFLOWS` contracts.

## Rotation assessment

This run was required to be `code review and remediation`. The previous nine completed audit records, from `honest-unmodeled-portfolio` through `consolidated-browser-downloads`, contained no code-review run; the prior review had fallen outside that window. This is not a strategic portfolio review. The next non-review run is the fifth non-review cadence identified in automation memory and should therefore be `strategic portfolio review + product improvement`.

## Selected opportunity and repository evidence

The shared confirmation wrapper contradicted its documented keyboard-safety contract in two connected ways:

1. `AppDialog` delegates initial focus to PrimeVue, whose implementation searches the dialog slots for an explicit `[autofocus]` target. `AppConfirmDialog` supplied none and disables the built-in close button, so opening a destructive modal could leave focus on a control behind the modal.
2. `AppConfirmDialog` rendered `AppDialog` behind `v-if="visible"`. Setting the model false removed the managed dialog instance before PrimeVue's leave transition could run its built-in focus restoration. This affected both cancel and confirm paths.

`FOUND-005` already required dialogs to move focus inside and restore their initiator. `DATA-004` required keyboard-accessible destructive operations and safe cancellation. `SCREEN-WORKFLOWS` explicitly required destructive confirmation focus restoration. The nested Local Data Storage clear-data workflow provided a retained, visible initiating control suitable for an end-to-end regression.

## Candidate set and selection

1. Capability/workflow — `CAP-FORE-002`, `NOW-005`: add saved configuration or rolling-origin forecast comparison. This remains the highest direct forecast capability opportunity, but `INT-002` still governs the real acceptance decision, holdout policy, and warning semantics.
2. Desktop UX/trust — selected: `CAP-UX-001`, `CAP-GOV-001`, `NOW-007`; repair shared destructive-confirmation initial focus and focus restoration because the defect was cross-workflow, standards-backed, reproducible, and safely bounded.
3. Deletion/simplification — `CAP-UX-001`: review feature-level modal `v-if` gates outside `AppConfirmDialog` and remove only those proven to pre-empt managed close/focus lifecycles. This is broader than the shared confirmation defect and needs initiator-specific regressions before changing feature ownership.

## Product disposition and WFM rationale

Retain the shared PrimeVue-unstyled/Tailwind wrapper architecture. Improve the shared confirmation's focus policy and managed lifecycle. Remove the obsolete local visibility gate that duplicated the model's responsibility and prevented the behavioral primitive from completing its close work.

No WFM formula, unit, assumption, interval granularity, staffing interpretation, or calculation edge case changed. The operational value is safe execution: destructive call-center, staffing-group, forecast, plan, actuals, backup, holiday, and local-data decisions should not strand keyboard users behind a modal or force them to rediscover their position after closing it.

## Scores before and after

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | Shared confirmations now satisfy their keyboard-focus contract, but product-wide shortcuts, sticky context, non-confirmation focus restoration, and zoom consistency remain uneven. |
| `CAP-GOV-001` | `4/3/4/3/3/4` | 26 | unchanged | 26 | Destructive safeguards are safer to operate, but shared audit events, approvals, ownership, and formal decision reasons remain absent. |
| `CAP-DATA-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | The local clear/replace interaction is safer; persistence, recovery, schemas, and data contents did not change. |

## Standards reviewed and findings

- `AGENTS.md`: the fix stays in the shared wrapper layer, introduces no feature-level PrimeVue import, no legacy semantic class, and preserves accessible keyboard behavior.
- `FRONTEND_STANDARDS.md`: the existing `AppDialog` and `AppConfirmDialog` primitives remain the single styling/behavior path. Footer actions retain the shared `AppButton` hierarchy.
- Accessibility: Cancel is the explicit safe initial focus; the existing PrimeVue focus trap remains active; both cancel and confirm now reach PrimeVue's focus-restoration transition.
- Data safety: cancellation still emits no confirm event or write; confirmed clear-data behavior remains explicit and was exercised only against an empty isolated browser test database.
- Error handling and performance: no async operation, watcher, stored state, or calculation was added. Keeping the lightweight hidden dialog wrapper mounted removes churn rather than adding runtime work.
- Architecture and dead code: the `v-if` lifecycle gate was redundant with `v-model:visible` and harmful, so it was removed with no compatibility layer.
- Test quality: wrapper tests now lock the safe autofocus target and persistent managed instance; Chromium proves initial focus and restoration for both cancel and confirm in a real nested-dialog workflow.

## Scope, plan, and acceptance criteria

Scope was limited to the shared confirmation wrapper, its focused unit contract, one representative nested destructive workflow, affected accessibility/destructive-action specifications, strategy, and audit records.

Acceptance criteria:

- Cancel is the initially focused control in every shared confirmation.
- The managed `AppDialog` remains mounted while hidden so PrimeVue can finish its leave/focus lifecycle.
- Cancellation closes without emitting confirmation or changing data.
- Cancellation and confirmation both return focus to a still-available initiating control.
- Existing confirmation titles, descriptions, labels, variants, backdrop policy, and data behavior remain unchanged.
- The nested confirmation remains contained without horizontal or vertical overflow at 1280, 1440, and 1920 px and at a 125%-zoom-equivalent CSS viewport.
- Focused tests, lint, standards, all Vitest tests, production build, all Chromium smoke tests, and whitespace checks pass.

## Implementation and removals

- Added `autofocus` to the shared Cancel action, making the safe action PrimeVue's initial focus target.
- Removed `v-if="visible"` from `AppConfirmDialog`, leaving visibility to the existing model and allowing managed close transitions to restore focus.
- Added a unit regression for the Cancel autofocus contract and one proving the underlying dialog stays mounted while hidden.
- Added a Chromium regression that opens nested clear-data confirmation, verifies Cancel focus, cancels and verifies trigger restoration, reopens, confirms against an empty test database, and verifies trigger restoration plus success feedback.
- Clarified foundation, destructive-action, and screen-workflow contracts for initial safe focus and both close paths.
- Removed one redundant/harmful lifecycle branch. No file, dependency, route, data field, migration, or compatibility layer became obsolete.

## Files and migration impact

- `src/components/ui/AppConfirmDialog.vue`
- `src/components/ui/__tests__/AppConfirmDialog.spec.js`
- `tests/smoke/planning.spec.js`
- `specs/foundation/FOUND-005-planning-ui-accessibility.md`
- `specs/data/DATA-004-planning-data-destructive-actions.md`
- `specs/design/SCREEN-WORKFLOWS.md`
- `product/WFM_CAPABILITY_ASSESSMENT.md`
- `product/ROADMAP.md`
- `actions_take/2026-07-19T11-09-07Z-focus-safe-confirmations.md`

Migration impact: none. Stored centers, groups, forecasts, actuals, plans, drafts, backups, IndexedDB schemas, routes, and WFM calculations are unchanged.

## Exact verification

- `npm test -- --run src/components/ui/__tests__/AppConfirmDialog.spec.js`
  - Passed: 1 file, 4 tests.
- `npx playwright test tests/smoke/planning.spec.js --grep "keeps destructive confirmation focus"`
  - Passed: 1 Chromium test, including cancel and confirmed-close focus restoration.
- `npm run verify:full`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 78 files, 403 tests.
  - Vite production build passed: 835 modules transformed.
  - Playwright passed: 16 Chromium tests.
- `git diff --check`
  - Passed with no whitespace errors.

The full Vitest run emitted the existing Node warning that `--localstorage-file` had no valid path. Playwright emitted the existing `NO_COLOR`/`FORCE_COLOR` warning. Neither warning failed verification.

## Desktop review

The live nested Local Data Storage confirmation was reviewed with an empty workspace and no console warning/error at:

- 1280×800: 672×362 px confirmation, Cancel focused, no horizontal/vertical overflow, trigger focus restored.
- 1440×900: 672×362 px confirmation, Cancel focused, no horizontal/vertical overflow, trigger focus restored.
- 1920×1080: 672×362 px confirmation, Cancel focused, no horizontal/vertical overflow.
- 1152×720 CSS viewport, equivalent to a 1440-wide window at 125% browser zoom: 672×362 px confirmation, Cancel focused, no horizontal/vertical overflow.

The layout is sparse-data independent because the confirmation uses concise scope/status content and a fixed maximum width. Loading and failure behavior were not changed. The automated nested workflow covers both successful confirmed close and safe cancellation; keyboard focus and visible success text are asserted.

## Strategy, roadmap, and interview updates

- Added focus-safe confirmation evidence and a 2026-07-19 review date to `CAP-UX-001` and `CAP-GOV-001`; scores remain calibrated.
- Added the capability change record for the shared confirmation remediation.
- Added and completed `NOW-007`; recorded the code-review decision in the roadmap log.
- `INT-002` remains the only Open question. No owner answer was present, no status changed, and no new question was added.

## Compatibility, risks, limitations, and follow-ups

- The shared wrapper instance now remains mounted while hidden, matching PrimeVue's intended visibility lifecycle; slot state also remains mounted instead of being destroyed on each close. Current confirmation content is declarative and has no incompatible reset-on-unmount dependency.
- Focus restoration is possible only while the initiating element still exists. The specification now says so explicitly. Menu items that disappear when their popup closes require a separate policy for returning focus to the menu trigger.
- Feature modal components outside `AppConfirmDialog` still sometimes combine parent or local `v-if` ownership with managed dialogs. This run does not claim those paths are fixed.
- Initial-focus safety is now guaranteed for shared confirmations, not every non-destructive dialog. Dialogs with forms continue to own their workflow-specific autofocus target.
- No phone layout work was added; the review targets professional desktop widths, window resizing, and zoom-equivalent CSS space.
