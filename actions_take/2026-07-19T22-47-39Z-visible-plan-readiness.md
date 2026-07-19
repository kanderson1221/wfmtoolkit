# Annual-plan readiness is visible in the workflow rail

## Run classification and scope

- Run type: **product improvement**.
- Primary capability: `CAP-UX-001`; supporting `CAP-LRP-001` and `CAP-GOV-001`.
- Roadmap: completed `NOW-012`; retired the speculative placeholder surface as `RET-004`; retained `EXP-001` for evidence-led labor-cost discovery.
- Interview evidence: `INT-001` through `INT-003` remain applied. Open `INT-004` concerns shared lock recovery and does not affect this local annual-plan workflow. No answer was applied and no new question was justified.
- Planner persona: annual capacity planner preparing or reviewing a Budget or Update.
- Planner decision: identify which demand, capacity, requirement, staffing-supply, and actuals areas are ready or need work before saving, finalizing, or reviewing the plan.
- Desktop workflow: open an annual plan, scan the persistent left workflow rail, select the area needing attention, and retain visible readiness while working in the selected section.

## Opportunity and repository evidence

`MonthlyPlanBuilder.vue` already computed a decision-specific `statusLabel`, readiness tone, detailed explanation, and first blocker for all six workflow destinations. It passed the labels and tones into `PlannerSectionNav`, but that component rendered only titles and ignored every status except an unused `upcoming` branch. The finalization banner named one next blocker, so planners had to open sections serially to reconstruct the wider readiness state.

This contradicted `PLAN-011`, which requires each section to expose status, detail, and first blocker. The gap was especially costly for inherited defaults: populated availability or occupancy inputs can look complete while still needing explicit review.

Repository inspection also found `PlannerBudgetPanel.vue`, a tracked but unreachable component promising future labor-cost behavior without rates, currency, burden, overtime, vendor, or Finance reconciliation semantics. `CAP-FIN-001` and `EXP-001` correctly classify that capability as strategically missing and discovery-only.

## Product disposition and WFM rationale

Disposition: **improve and simplify**.

- Retain the existing annual-plan navigation, readiness calculations, finalization rules, and saved review state.
- Expose the existing readiness labels in the persistent rail so incomplete forecast coverage, unreviewed defaults, Erlang rerun needs, requirement coverage, missing opening headcount, and actuals coverage are visible before selection.
- Use restrained ready, attention, and neutral treatment while retaining explicit text, so meaning never depends on color.
- Remove the unreachable financial placeholder rather than letting speculative UI imply that headcount metrics alone constitute a labor budget.

No WFM formula changed. Contacts, AHT, workload, paid capacity, occupancy, adherence, Erlang outputs, required staff, scheduled supply, actuals, and finalization gates retain their existing units and interpretation.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Rationale |
|---|---:|---:|---:|---:|---|
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | Annual-plan readiness is materially easier to scan, but product-wide shortcuts, other persistent-context paths, focus restoration, and zoom review remain uneven. |
| `CAP-LRP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | The strong annual planning workflow exposes its existing completeness contract more effectively; calculations and feature breadth are unchanged. |
| `CAP-GOV-001` | `4/3/4/3/3/4` | 26 | unchanged | 26 | Explicit review state is more visible, but no user/event audit, approval, ownership, or shared governance capability was added. |
| `CAP-FIN-001` | `3/0/0/0/0/0` | 60 | unchanged | 60 | Removing a misleading placeholder improves product honesty but does not implement financial methodology. |

## Standards and review findings

- `AGENTS.md`: no direct PrimeVue feature import, legacy semantic class, generic data table, or page-local replacement for a shared primitive was introduced.
- `FRONTEND_STANDARDS.md`: the existing planner rail remains a focused feature component; the presentation is compact, operational, and aligned with the shared slate/steel-blue system.
- Accessibility: the current destination retains `aria-current="step"`; each native button remains keyboard-operable; readiness is included in visible button text; status meaning does not rely on the new green/amber support colors.
- Data safety: no saved payload, draft schema, migration, route, plan type, or financial data changed. The existing compatibility fallback from legacy `overview`, `budget`, or `review` draft sections to Forecast remains intact.
- WFM correctness: readiness labels are projections of existing domain checks, not a second completeness calculation.
- Dead code: deleted the 57-line unreachable `PlannerBudgetPanel` and removed the unused `upcoming` navigation dialect.
- Exposed edge: real Chromium evidence revealed `1 months`; the status formatter now emits `1 month` while retaining plural labels for other counts.

## Scope, plan, and acceptance criteria

1. Render every existing workflow `statusLabel` in the persistent section button.
2. Support ready, attention, active, and default presentation without making color authoritative.
3. Preserve selection events and current-step semantics.
4. Remove the unreachable financial placeholder and unused upcoming-state branch.
5. Update focused component coverage, annual-plan Chromium coverage, normative specifications, strategy, and audit evidence.

Acceptance criteria achieved:

- Forecasts, Agent Availability, Erlang/Variability, Demand Model, Staffing Plan, and Actuals each show a current text status before selection.
- A loaded fixture exposes mixed states including `Legacy manual`, `12/12 months`, `Defaults confirmed`, `0/2 required`, and `1 month`.
- The active step retains `aria-current="step"`, and selecting another step still emits the existing model and selection events.
- Finalization, reviewed-section state, calculations, save behavior, and persistence are unchanged.
- No page-level horizontal overflow occurs at 1280×900, 1440×900, 1920×1080, or 1152×720.

## Implementation and removals

- `PlannerSectionNav.vue`: renders status text, applies calm readiness tones, preserves active treatment, and exposes a stable status-tone hook for focused coverage.
- `MonthlyPlanBuilder.vue`: retains the existing six readiness projections and adds singular/plural month formatting for the newly visible actuals status.
- `PlannerSectionNav.spec.js`: verifies visible status, readiness tone projection, `aria-current`, selection, and `v-model` behavior.
- `MonthlyPlanBuilder.spec.js`: verifies fresh-plan readiness across all six destinations.
- `planning.spec.js`: verifies a real saved Update with mixed status at supported desktop widths and zoom-equivalent resizing.
- Deleted `PlannerBudgetPanel.vue` and the unused `upcoming` branch in planner navigation.
- Updated `PLAN-011`, `SCREEN-WORKFLOWS`, capability evidence, roadmap completion/retirement, and decision history.

## Files, migration, and compatibility

- Added: `src/components/__tests__/PlannerSectionNav.spec.js`.
- Deleted: `src/components/planner/PlannerBudgetPanel.vue`.
- Modified: planner navigation/builder, focused and Chromium tests, `PLAN-011`, workflow wireframe, capability assessment, roadmap, and this audit record.
- Migration: none.
- Stored data: unchanged.
- Compatibility: legacy draft UI sections named `overview`, `budget`, or `review` still normalize to `forecast`; Budget plan lifecycle terminology, Budget baselines, Updates, and comparison remain supported.

## Exact verification

- `npx vitest run src/components/__tests__/PlannerSectionNav.spec.js src/components/__tests__/MonthlyPlanBuilder.spec.js` — 2 files, 35 tests passed.
- `npm run check:standards` — passed.
- First focused Chromium run found a fixture expectation mismatch and the exposed singular-label defect (`1 months`); implementation and assertions were corrected.
- `npx playwright test tests/smoke/planning.spec.js --project=chromium --grep "annual-plan readiness"` — 1 test passed after correction.
- `npm run verify:full` — passed:
  - ESLint passed.
  - frontend standards check passed.
  - Vitest: 81 files, 427 tests passed.
  - Vite production build: 837 modules transformed successfully.
  - Playwright Chromium: 20 tests passed.

## Desktop, interaction, and state review

- 1280×900: six statuses remain visible in the persistent rail and the document does not overflow horizontally.
- 1440×900: the split rail/content workspace remains stable with all readiness text visible.
- 1920×1080: the compact rail does not expand into dashboard-like cards or waste the wide workspace.
- 1152×720 zoom-equivalent: statuses remain available and no page-level horizontal overflow appears.
- Dense state: a saved Update fixture simultaneously shows legacy demand, ready availability, confirmed random assumptions, complete demand-model coverage, missing opening headcount, and one month of actuals.
- Sparse state: a fresh plan shows `Not applied`, inherited defaults needing review, `0/12 months`, `2/2 required`, and `Not started` without requiring section entry.
- Keyboard/focus: native section buttons remain in the existing tab order; current step remains programmatically identified; no modal or focus-restoration path changed.
- Loading, error, and calculation states: existing labels such as `Calculating`, `Rerun needed`, `Daily rows missing`, and `AHT incomplete` now flow through the same visible projection. Their underlying state machines were not changed.

## Strategy, roadmap, and interview updates

- Completed `NOW-012` and recorded the planner outcome, evidence, scope, success measures, and dependencies.
- Retired only the speculative financial UI as `RET-004`; retained `EXP-001` because the real labor-cost capability still requires an accounting contract.
- Updated `CAP-UX-001` evidence without inflating its calibrated scores.
- `CAP-LRP-001`, `CAP-GOV-001`, and `CAP-FIN-001` scores remain unchanged.
- No interview answer was detected or applied. `INT-004` remains the single Open question; no duplicative question was added.

## Rotation and portfolio balance

- The most recent code-review run was `NOW-007`, six completed runs earlier; the one-in-ten review rule does not require this run to be a code review.
- The immediately preceding run was the fifth-run strategic portfolio review, so this run is not another portfolio review.
- Recent non-review delivery includes actual-Erlang evidence and substantive call-center desktop context. This run continues user-facing desktop workflow improvement while including justified deletion; it does not add maintenance-only churn or phone work.

## Compatibility, risks, limitations, and follow-ups

- Readiness remains only as correct as the existing section-specific checks. This run intentionally does not create a second readiness model.
- Supporting green/amber tones were not treated as authoritative; every state remains readable in text.
- Other dense worksheets still have uneven sticky context, shortcuts, focus review, and zoom evidence, which keeps `CAP-UX-001` at Need 32.
- Financial planning remains absent. No labor cost, budget amount, currency, vendor, or overtime conclusion should be inferred from a Budget plan's operational staffing results.
- Shared editing and lock recovery remain discovery-only under `NEXT-003`, `INT-003`, and `INT-004`.

## Three linked candidates considered

1. **Capability/workflow — `CAP-DATA-002`, `CAP-ADMIN-001`, `NEXT-003`:** prototype exclusive shared-plan locking. Deferred because identity, tenancy, renewal, authorized recovery, and abandoned-lock timing remain unresolved; `INT-004` is the explicit dependency.
2. **Desktop UX — selected `CAP-UX-001`, supporting `CAP-LRP-001`/`CAP-GOV-001`, `NOW-012`:** expose the annual planner's already-computed readiness map in its persistent navigation. It was executable, specification-backed, and directly reduces serial section inspection.
3. **Deletion/simplification — included as `RET-004`:** delete the unreachable financial placeholder and unused upcoming-state styling. Deleting Budget plan lifecycle or financial discovery was rejected because operational baselines remain core and cost planning still has strategic value once its methodology is defined.
