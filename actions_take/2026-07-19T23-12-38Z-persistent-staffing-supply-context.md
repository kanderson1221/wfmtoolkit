# Staffing-supply worksheet retains monthly decision context

Run type: product improvement

## Capability, roadmap, interview, and planner scope

- Capabilities: primary `CAP-UX-001`; supporting `CAP-SUP-001` and `CAP-LRP-001`.
- Roadmap: completed `NOW-013` — Persistent staffing-supply decision context.
- Interview evidence: applied `INT-001` through `INT-003` are unchanged. Open `INT-004` concerns future shared-plan lock recovery and does not govern this local read/edit workflow. No answer was detected or applied, and no new question was justified.
- Planner persona: annual capacity planner reconciling a staffing plan with recruiting and training partners.
- Planner decision: determine which months have enough starting frontline supply after hires, training progression, graduation yield, and attrition to cover the selected requirement method.
- Desktop workflow: open annual plan → Staffing Plan → reconcile the twelve-month supply roll-forward → select a month or adjust opening headcount/attrition in an editable draft.

## Opportunity and evidence

The retained supply worksheet already presented average and peak required headcount, opening roster/frontline, hires, graduating and in-training headcount, attrition, ending roster/frontline, and opening gap. Its 12 columns used one flat row of abbreviations inside an ad hoc horizontal shell. Planners had to reconstruct the roll-forward stages from column order and tooltips, and the headings disappeared while the 614 px annual table moved below the first desktop viewport.

`PLAN-008` requires the monthly requirement and all supply movements to remain visible. `CAP-UX-001` explicitly identifies uneven persistent context in dense worksheets. Live review at 1280×900 measured the original table at 581 px high beginning 556 px below the document top, leaving less than seven months visible before page movement separated rows from headings.

## Product disposition and WFM rationale

Disposition: desktop-redesign and retain the native worksheet; simplify its shell.

- Group columns into the actual operating sequence: Requirement, Opening Supply, Pipeline and Loss, Ending Supply, and Decision.
- Keep both heading tiers visible during contained vertical review.
- Keep Month visible when a reduced desktop window needs horizontal movement.
- Put the native table inside one named keyboard-focusable region rather than shifting the page.
- Preserve the existing row selection, editable/read-only state, inputs, plan persistence, recommendations, and next-year handoff.
- Preserve the formulas and units: headcount remains HC; `starting gap = starting frontline HC - required HC`; ending roster/frontline and attrition caps continue to come only from `staffingModel.js`.

No contacts, AHT, workload, open-day, occupancy, adherence, Erlang, requirement, staffing-supply, training, attrition, graduation, gap, recommendation, finalization, or saved-plan calculation changed.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | One core worksheet is materially easier to scan, but Agent Availability, Demand Model, Actuals, and other dense tables still have uneven persistent context; product-wide shortcuts and focus review remain incomplete. |
| `CAP-SUP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | The complete roll-forward is easier to reconcile, but no new supply method, skill mix, recruiting constraint, cost, or probabilistic yield capability was added. |
| `CAP-LRP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | The retained annual-planning workflow improves without changing its breadth, correctness, or saved lifecycle. |

Scores remain calibrated rather than raising a product-wide dimension for one desktop slice.

## Standards and review findings

- `AGENTS.md`: retained the native worksheet and shared input wrappers; no direct PrimeVue feature import, legacy semantic class, generic data table, or mobile UI was added.
- `FRONTEND_STANDARDS.md`: replaced the one-off worksheet shell with shared `AppTableShell`; local CSS now owns only staffing-specific table geometry and sticky offsets.
- Accessibility: the scroll region has a visible focus ring, `tabindex="0"`, and the name `Monthly staffing supply worksheet`; group and detail headers use `scope="colgroup"` and `scope="col"`; editable attrition inputs now name their month.
- WFM correctness: group headings mirror the existing roll-forward stages and do not introduce a second calculation or reinterpret gap semantics.
- Data safety: no persisted field, schema version, backup payload, IndexedDB row, route, API, or migration changed.
- Removal: the staffing worksheet no longer uses the duplicate `assumption-table-shell`; the shared table shell owns border, rounding, background, and shadow.

## Scope, plan, and acceptance criteria

1. Establish a readable grouped-header contract for the monthly roll-forward.
2. Add one contained keyboard scroll region with sticky two-tier headings and Month context.
3. Preserve native table semantics and all edit/read-only behavior.
4. Replace the one-off shell and improve row-specific input names.
5. Add focused component and Chromium geometry regressions.
6. Update specifications, capability evidence, roadmap, and audit history.

Acceptance criteria achieved:

- All twelve months remain in one native table.
- Five semantic groups describe the requirement-to-gap decision path.
- The 614 px content scrolls inside a bounded region; both header tiers remain pinned.
- Month remains pinned during contained horizontal review at a 1024 px reduced desktop window.
- The document has no horizontal overflow at 1280, 1440, 1920, 1152, or 1024 px.
- Editable attrition controls expose the month in their accessible names.
- Read-only values, editable values, selection, plan calculations, and saved data are unchanged.

## Implementation and removals

- `PlannerStaffingSupplyTable.vue` now composes `AppTableShell`, a named focusable scroll region, semantic column groups, sticky-heading hooks, and month-specific attrition names.
- `planner.css` supplies a 61rem readable table minimum, viewport-bounded region height, two sticky heading tiers, pinned Month header layering, and focus-visible treatment.
- Component coverage verifies region semantics, the five column groups, editable month naming, requirement-method labels, inherited opening positions, next-year targets, and read-only rendering.
- Chromium coverage restores a saved plan, enters Staffing Plan, verifies every supported desktop/zoom width plus a reduced desktop window, and checks sticky group/detail/Month geometry after both-axis movement.
- Removed the worksheet's use of its one-off assumption table shell. No state, watcher, composable, helper, dependency, compatibility layer, mobile breakpoint, or calculation path was added.

## Files, migration, and compatibility

- UI/styles: `src/components/planner/PlannerStaffingSupplyTable.vue`, `src/styles/planner.css`.
- Tests: `src/components/__tests__/PlannerStaffingSupplyTable.spec.js`, `tests/smoke/planning.spec.js`.
- Specifications: `specs/planning/PLAN-008-staffing-supply.md`, `specs/design/SCREEN-WORKFLOWS.md`.
- Strategy: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, and this audit.
- Interview: `interviews.md` was read; no owner answer or status changed.
- Migration impact: none. Existing plans, drafts, backups, and legacy snapshots render through the same props and models.
- The pre-existing untracked `launch-wfmtoolkit.command` was preserved and excluded.

## Exact verification

- Focused Vitest: `npx vitest run src/components/__tests__/PlannerStaffingSupplyTable.spec.js` — 1 file, 5 tests passed.
- Focused Chromium: `npx playwright test tests/smoke/planning.spec.js --project=chromium --grep "keeps monthly staffing supply context visible"` — 1 test passed.
- `npm run verify:full` passed:
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest: 81 files, 427 tests passed.
  - Vite production build: 837 modules transformed successfully.
  - Playwright Chromium: 21 tests passed.
- `git diff --check` passed before audit creation and is rerun on the final tree.
- No Python/backend behavior changed, so backend unit tests were not applicable.

The existing non-failing `NO_COLOR`/`FORCE_COLOR` Playwright warning and Vitest local-storage warning remain unrelated to this slice.

## Desktop, interaction, and state review

The in-app browser reviewed a persisted finalized Budget with all twelve requirement and supply rows:

- 1280×900: region 978×468 px; content 978×614 px; contained vertical review; no document overflow.
- 1440×900: region 1138×468 px; content 1138×614 px; no horizontal compression or document overflow.
- 1920×1080: region 1610×544 px; content 1610×598 px; wide columns expand without card-like whitespace; no document overflow.
- 1152×720, representing a zoom-equivalent/reduced laptop view: region 1046×352 px; content 1046×614 px; contained vertical review and no document overflow.
- 1024×768 reduced desktop window: region 918×337 px; content 976×614 px; both axes remain contained and the pinned Month context remains aligned.

Focused Chromium verified the group header at the region top, the measure tier immediately below it, and Month header/body cells at the region left after `scrollTop = 240` and horizontal movement. Read-only populated state and editable field semantics were covered. Loading, empty, error, validation, success, calculation, and save behavior did not change. Browser review found no new console error attributable to the worksheet.

## Strategy, roadmap, and interview updates

- Completed `NOW-013` with outcome, evidence, dependencies, delivered/removed scope, and measurable success criteria.
- Refreshed `CAP-SUP-001` and `CAP-UX-001` evidence while retaining calibrated Need scores of 20 and 32.
- Updated `PLAN-008` and the annual-workspace screen contract to require grouped, named, contained, sticky supply review.
- No sponsor answer was detected. `INT-004` remains the only Open question; no duplicative or unrelated question was added.
- High-Need shared persistence, administration, intraday, scheduling, and financial capabilities remain in their evidence-backed horizons.

## Rotation and portfolio balance

The preceding nine completed audits still include `2026-07-19T11-09-07Z-focus-safe-confirmations.md` as a code-review/remediation run, so this run is not the required one-in-ten review. The preceding strategic portfolio review was `NOW-011`; only `NOW-012` followed it, so this run is not the fifth non-review portfolio review.

Recent non-review delivery contains substantial call-center reporting UX, annual-plan readiness, and this staffing-supply worksheet redesign. This run is planner-facing desktop workflow work with a justified shared-shell simplification, not defect-only maintenance or phone polish.

## Compatibility, risks, limitations, and follow-ups

- Sticky detail-heading offset depends on the 2rem semantic group row; the Chromium geometry regression will flag typography changes that break alignment.
- At 1024 px the 61rem minimum intentionally creates contained horizontal movement rather than compressing 12 operational measures; 1280–1920 px keeps the full worksheet visible horizontally.
- The table does not add a row observer or frozen gap column. The Month column is the required identity anchor; the Decision group remains on the right in normal roll-forward order.
- The existing gap is explicitly starting frontline minus required HC. Changing the risk lens to ending gap remains an unresolved `PLAN-008` product decision and was not inferred here.
- Persistent context in Agent Availability, Demand Model, and Actuals remains uneven and keeps `CAP-UX-001` at Need 32.
- Shared editing and lock recovery remain discovery-only under `NEXT-003`, `INT-003`, and `INT-004`.

## Three linked candidates considered

1. Capability/workflow — `CAP-DATA-002`, `CAP-ADMIN-001`, `NEXT-003`: prototype shared-plan exclusive locks. Deferred because identity, tenancy, timeout, takeover authority, recovery evidence, and migration safety remain unresolved; `INT-004` is the explicit sponsor dependency.
2. Desktop UX — selected `CAP-UX-001`, supporting `CAP-SUP-001`/`CAP-LRP-001`, completed `NOW-013`: group and retain decision context in the monthly staffing-supply roll-forward. Repository and live geometry evidence made this immediately executable without calculation or policy invention.
3. Deletion/simplification — included: remove the staffing worksheet's one-off assumption table shell in favor of shared `AppTableShell`. A broader all-worksheet sticky abstraction was rejected because each table has different tier heights, decision anchors, and horizontal requirements; this run keeps one bounded production slice.
