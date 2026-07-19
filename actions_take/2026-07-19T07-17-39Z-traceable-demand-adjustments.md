# Manual demand adjustments now reconcile to a recorded planning reason

Run type: product improvement

## Scope and planner decision

- Capabilities: `CAP-FORE-002`; supporting `CAP-GOV-001`, `CAP-UX-001`, and `CAP-WORK-001`
- Roadmap: third production slice of `NOW-005`
- Interview evidence: `INT-002` remains Open. It governs forecast acceptance thresholds, candidate configurations, and the eventual accept/reject record; it does not block traceable manual overrides.
- Planner persona: forecast analyst preparing future contact demand for annual staffing planning
- Planner decision: determine whether a known business event or approved assumption justifies changing baseline demand, then understand the exact monthly consequence before saving or handing off the forecast
- Desktop workflow: enter one date-range rule with a non-zero value and rationale; review the rule ledger; scan baseline, manual change, and final contacts in the monthly rollup
- Product disposition: improve and simplify the retained adjustment workflow; require rationale for new decisions, preserve legacy data honestly, and replace unreconciled/estimated presentation with exact derived results
- Review scope: manual-rule schema normalization, daily and monthly calculation derivation, dense desktop editor, validation/accessibility, legacy compatibility, monthly comparison table, focused/full tests, specifications, strategy, interview queue, and removable adjacent UI logic

## Opportunity and evidence

The project schema and projection engine already retained an optional `reason` on manual adjustments, but the desktop editor did not capture or display it. As a result, a planner could materially alter future contacts and downstream workload while the workbench retained only dates, type, and value. The Monthly Rollup displayed the adjusted Contacts total without the model baseline or exact net change, so another reviewer could not reconcile the judgment.

Repository evidence:

- `createForecastManualAdjustment` and `normalizeForecastManualAdjustments` already supported `reason`, making a backward-compatible vertical slice possible without schema migration.
- `getForecastProjectDailyRows` already derived `baselineYhat`, `manualAdjustmentDelta`, and adjusted final rows, but the monthly aggregation discarded the baseline/change trace.
- `ForecastingManualAdjustmentsDock.vue` created rules without a reason and showed a per-rule `Estimated Impact`. That standalone estimate could fail to reconcile when rules overlap or a set-value rule determines the final result.
- `ForecastMonthlyRollupView.vue` showed only final Contacts, even while manual rules were active.
- `NOW-005` explicitly retained override trace as a remaining decision-trust gap after the leakage-safe contact and AHT evidence slices.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health.

| Capability | Before | Need | After | Need | Rationale |
|---|---:|---:|---:|---:|---|
| `CAP-FORE-002` | `5/3/4/4/4/4` | 25 | unchanged | 25 | This closes the manual-override trace gap inside already-strong dimensions, but saved candidate comparison, rolling-origin validation, and governed forecast acceptance remain absent, so Completeness stays 3 and other scores remain calibrated at 4. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | The editor and reconciliation are materially better, but keyboard/focus/zoom consistency remains uneven product-wide. |
| `CAP-GOV-001` | `4/3/4/3/3/4` | 26 | unchanged | 26 | One override workflow gains rationale and traceability; full event history, ownership, and approvals remain absent. |

## WFM rationale, formulas, units, and interpretation

- Baseline demand is the modeled daily contact forecast before manual rules.
- `daily manual change = final daily contacts - baseline daily contacts`.
- `monthly baseline contacts = Σ baseline daily contacts`.
- `monthly manual change = Σ daily manual change`.
- `monthly final contacts = monthly baseline contacts + monthly manual change`.
- All values are contacts; positive change increases workload and negative change decreases it.
- The exact trace is derived from the same adjusted daily rows used by the chart and downstream monthly rollup. It is not independently estimated.
- Delta, percent, and set-value semantics remain unchanged. This slice does not reinterpret saved adjustments or retroactively assign business reasons.
- Legacy blank reasons remain a visible governance limitation, not a zero, valid rationale, or migration default.

## Plan and acceptance criteria

1. Require a visible, trimmed planning reason for every new or edited non-zero rule.
2. Surface invalid draft state as text rather than relying on a disabled button or color.
3. Preserve saved rules with blank reasons, identify them as legacy records, and require a reason only when edited.
4. Display each rule's rationale and affected-day count in the native rule table.
5. Remove standalone per-rule impact estimates whose totals may not reconcile under overlap semantics.
6. Derive monthly baseline contacts, exact manual change, adjusted-day count, and final contacts from adjusted daily rows.
7. Show Baseline Contacts, Manual Change, and Final Contacts only while rules exist; retain the ordinary Contacts column when none exist.
8. Preserve result snapshots and storage compatibility without migration or silent rewriting.
9. Keep visible labels, accessible numeric input naming, semantic tables, contained overflow, and reason-before-action keyboard order.
10. Pass focused/full frontend, build, lint, standards, and end-to-end verification and review 1280, 1440, and 1920 px desktop widths.

Acceptance result: met.

## Implementation and removals

- Added a Decision Reason field to the shared-wrapper-based adjustment editor and persisted its trimmed value through the existing rule schema.
- Added textual validation for missing rationale and a visible status message for saved legacy rules without rationale.
- Reordered the action after the reason field in DOM and visual order after live browser review found the initial draft would make keyboard submission inefficient.
- Changed the number field binding from root `id` to PrimeVue `input-id`, exposing the visible Value label as the spinbutton's accessible name.
- Added Decision Reason to the rule ledger and retained `Not recorded (legacy rule)` for historical blanks.
- Extended monthly derivation with `baselineContacts`, exact `manualAdjustmentDelta`, and `adjustedDayCount` while preserving `contacts` as final demand.
- Added conditional Baseline Contacts / Manual Change / Final Contacts columns to the monthly rollup.
- Removed the per-rule Estimated Impact calculation and column because standalone values can be non-additive when rules overlap.
- Removed a redundant empty worksheet-summary branch exposed by the editor change.

No route, dependency, backend API, persisted schema, or data migration was added. No phone-specific layout or breakpoint was introduced.

## Standards and review findings

- No direct PrimeVue import was added outside `src/components/ui`; feature code composes `AppButton`, `AppFieldGroup`, `AppNumberField`, `AppSelect`, `AppStatusMessage`, and `AppTextField`.
- The rule ledger and monthly reconciliation remain native semantic tables with visible headers and contained horizontal overflow.
- Validation and missing legacy rationale are communicated with text and do not rely on color.
- Date, type, value, and reason controls expose visible labels; the adjusted Value input now exposes the matching accessible name.
- The live browser review changed action placement so the DOM order is value, reason, then Add/Save rather than presenting the action before its required reason.
- No legacy semantic class, direct PrimeVue feature import, generic data table, mobile-only complexity, or new visual dialect was introduced.
- The initial temporary harness omitted PrimeVue installation and produced one bootstrap error; the harness was corrected, reloaded, and produced no new runtime warning/error timestamps. All temporary harness files and the local server were removed before final verification.

## Files and compatibility

- Projection and reconciliation: `src/forecasting/forecastProjection.js`
- Desktop editor and composition: `src/components/forecasting/ForecastingManualAdjustmentsDock.vue`, `src/components/forecasting/ForecastingWorkbench.vue`, `src/components/forecasting/ForecastingResultsPanel.vue`, `src/components/forecasting/results/ForecastMonthlyRollupView.vue`
- Tests: `src/forecasting/__tests__/shared.spec.js`, `src/components/__tests__/ForecastingWorkspace.spec.js`
- Specification: `specs/forecasting/FCAST-003-manual-adjustment-trace.md`
- Strategy/interview: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, `interviews.md`
- Audit: this file

Data compatibility is additive and backward compatible. Existing project IDs, run snapshots, model inputs, manual-rule IDs/dates/types/values, planning handoff, and saved plans are unchanged. Legacy rules with blank reasons continue to apply and can be removed; editing them now requires a reason. Monthly trace fields are derived in memory from retained daily rows and are not written back into old run snapshots.

## Exact verification

- Focused frontend before the final layout correction: `npm test -- --run src/forecasting/__tests__/shared.spec.js src/components/__tests__/ForecastingWorkspace.spec.js`
  - Passed: 2 files, 35 tests.
- `npm run lint -- --quiet`
  - Passed before implementation review and again on the final source tree with no ESLint errors.
- `npm run check:standards`
  - Passed before implementation review and again on the final source tree.
- `npm run build`
  - Passed: Vite production build; 834 modules transformed.
- `npm test`
  - Passed: 77 files, 400 tests.
  - Emitted the existing Node warning that `--localstorage-file` had no valid path; no test failed.
- `npm run test:e2e`
  - Passed: 15 Chromium tests.
  - Emitted the existing `NO_COLOR`/`FORCE_COLOR` warning; no test failed.
- `git diff --check`
  - Passed before the audit record and is repeated on the final tree.

No Python calculation or backend API changed, so backend unit tests were not applicable to this slice.

## Desktop review

The in-app browser-control skill was used on the real editor and monthly-rollup components through a temporary isolated Vite harness. It caused a material keyboard-order correction and an accessible-name correction before finalization. The viewport override was reset, browser tabs were finalized, the harness was deleted, and the local Vite process was stopped.

- 1280 × 900: body client/scroll width was 1280/1280 px. The rule-table container was 1206/1206 px client/scroll width and the monthly table was 1180/1180 px. The reason input was approximately 1129 px wide. The editor, two-row ledger, and both monthly reconciliations fit without page or contained-table overflow.
- 1440 × 900: body was 1440/1440 px; rule table 1366/1366 px; monthly table 1340/1340 px; reason input approximately 1289 px.
- 1920 × 1000: body was 1920/1920 px; rule table 1838/1838 px; monthly table 1812/1812 px; reason input approximately 1761 px.
- Dense/legacy evidence: two rules, a long business rationale, and one missing legacy rationale remained aligned and scannable. The exact monthly examples reconciled `3,150 + 250 = 3,400` and `2,450 - 120 = 2,330`.
- Sparse/validation evidence: zero-value Add was disabled; entering a non-zero value without a reason produced `Enter the planning reason for this adjustment.`; after both fields were valid the Add action enabled.
- Accessibility: the DOM snapshot exposed Start Date, End Date, Adjustment Type, Value, and Decision Reason by name; both tables exposed row/column semantics; text identifies legacy gaps; final DOM order places Decision Reason before Add/Save.
- Browser zoom was not programmatically changed; contained-table behavior and the three supported desktop widths provide the resizing evidence for this bounded slice.

## Strategy, roadmap, and interview updates

- Added normative adjacent forecasting contract `FCAST-003`.
- Updated `CAP-FORE-002` evidence and gap language but kept scores calibrated at `5/3/4/4/4/4` (Need 25).
- Recorded the third delivered `NOW-005` slice and removed override trace from its remaining scope. Saved configuration/rolling-origin comparison and governed acceptance remain.
- Updated `INT-002` decision language to reflect the three safe delivered slices. It remains the only Open question; no owner answer was changed and no new question was added.

## Rotation and portfolio balance

The latest `code review and remediation` record is seven completed runs back, so one is present within the prior nine and the one-in-ten rule does not require a review. The required fifth-run strategic portfolio review occurred two non-review runs before this one, so this run is correctly classified as `product improvement`.

The prior two non-review runs delivered user-facing contact and AHT forecast-evidence workflows. This run is also user-facing but emphasizes trust, workflow efficiency, desktop comparison, and code deletion rather than adding another calculation method. Recent balance therefore remains above the minimum user-facing target without treating code volume as progress.

## Risks, limitations, and follow-ups

- Multiple overlapping rules retain existing deterministic semantics. This slice removes misleading per-rule impact estimates but does not add conflict prevention or attribution between overlapping rules.
- Legacy rules can remain without a reason until a planner edits or removes them; fabricating or blocking their prior effect would be less data-safe.
- Reasons are local project data, not immutable audit events. Shared identity, approval, and event history still depend on future governed persistence.
- The monthly trace covers contact overrides. Monthly AHT overrides are already identified separately in the AHT workflow and were not merged into this contact rule ledger.
- `INT-002` is still required to choose rolling holdout policy, candidate configurations, warning thresholds, and the eventual accept/reject record.

## Three linked candidates considered

1. Capability/workflow — selected: `CAP-FORE-002`, `NOW-005`; capture manual override rationale and reconcile baseline-to-final demand now because the schema and daily calculation already support a safe vertical slice without waiting for `INT-002`.
2. Desktop UX/trust — `CAP-REP-002`, `CAP-UX-001`; standardize retained call-center stale/error states with correction actions and reliable focus restoration. Valuable, but less directly aligned with the active Now item.
3. Deletion/simplification — `CAP-IO-001`; consolidate remaining backup and actuals-gap Blob/object-URL download lifecycles into the shared browser-download primitive and remove duplicate cleanup/test scaffolding. Safe but lower planner-decision value than closing ungoverned demand overrides.
