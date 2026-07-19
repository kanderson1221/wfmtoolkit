# Saved-plan comparison attributes monthly scenario drivers

Run type: product improvement

## Capability, roadmap, interview, and planner scope

- Capabilities: primary `CAP-SCEN-001`; supporting `CAP-LRP-001` and `CAP-UX-001`.
- Roadmap: completed `NOW-014` — Monthly scenario driver attribution.
- Interview evidence: `INT-001` through `INT-003` remain applied. Open `INT-004` concerns future shared-plan lock recovery and does not govern local immutable-snapshot comparison. No answer was detected or applied, and no new question was justified.
- Planner persona: planning lead or annual capacity planner reviewing Budget against the current or another saved Update.
- Planner decision: identify which monthly demand, calendar, availability, or random-loss assumptions explain a requirement, peak, supply, or staffing-gap movement before accepting an operating scenario.
- Desktop workflow: call center → staffing group → Plans → Compare Plans → select baseline and candidate → reconcile annual outcomes, lineage, monthly causes, and complete CSV evidence.

## Opportunity and evidence

The retained comparison already used immutable saved snapshots, defaulted Budget against the current Update, withheld incompatible requirement-method deltas, and showed annual outcomes plus material monthly outcome changes. Its capacity-assumption table flattened paid hours, presence, occupancy, and adherence into annual averages. An equal January decrease and February increase therefore appeared as `No change`, even though the capacity plan had moved between months. The monthly table showed contacts and outcome deltas but could not explain AHT, open-day, paid-time, presence, occupancy, adherence, or peak-day changes.

`PLAN-013` requires saved capacity evidence and material monthly exceptions. `CAP-SCEN-001` identifies sensitivity and what-if interpretation as the remaining scenario gap. Repository inspection of `planScenarioComparison.js`, `demandModel.js`, the dialog, and their focused/Chromium coverage showed that the required monthly values already existed in each saved-snapshot calculation and needed no new stored state.

## Product disposition and WFM rationale

Disposition: improve the retained saved-plan comparison and simplify its misleading summary layer.

- Attribute every material month to changed contacts, AHT, open days, paid hours per day, presence, occupancy, adherence, and peak-day uplift.
- Show average and peak-day required-headcount movement next to ending frontline and staffing-gap movement.
- Keep candidate minus baseline as the single delta direction.
- Use percentage points for percent assumptions, seconds for AHT, days for calendar capacity, hours per day for paid time, contacts for demand, and headcount for staffing outputs.
- Preserve demand/workload comparability across methods and continue withholding requirement, supply, and gap deltas when methods differ.
- Keep all twelve months and all exact baseline/candidate/delta fields in CSV even though the dialog filters to material exceptions.
- Remove annual-average capacity rows because averages can conceal when capacity moved and create false confidence.

Existing calculation semantics remain unchanged. Workload Ratio still derives `workload hours = contacts × AHT seconds ÷ 3600`, applies the saved availability/random-loss design factor, and converts required staff hours through saved paid capacity. Intraday Erlang comparison still uses complete saved plan results merged with saved overhead inputs. No value is recalculated from current staffing-group defaults.

Display materiality is presentation-only: contacts 1, AHT 0.1 seconds, open days 0.5 day, paid time 0.01 hour/day, percent drivers 0.01 point, and staffing outputs 0.05 HC. The export retains values regardless of display thresholds. Missing values remain unavailable; they are never coerced to zero.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-SCEN-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Monthly scenario causes are materially more explainable, but explicit what-if branching and parameter-sensitivity generation remain absent. |
| `CAP-LRP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Saved annual planning comparison is stronger without expanding the breadth of requirement, supply, or plan lifecycle capability. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | The dialog is efficient and contained across supported widths, but remaining worksheet context, shortcuts, and unreviewed focus/zoom paths keep the product-wide score calibrated. |

## Standards and review findings

- `AGENTS.md`: retained native tables, `AppDialog`, `AppSelect`, `AppTableShell`, and existing Tailwind composition; no direct PrimeVue feature import, generic data table, legacy class, or phone UI was added.
- `FRONTEND_STANDARDS.md`: preserved visible baseline/candidate labels, native comparison tables, contained overflow, keyboard focus, and a restrained operational layout.
- Accessibility: the driver column uses text and units rather than color; table headers describe average versus peak-day HC; baseline receives initial focus; Close restores the retained Compare Plans trigger.
- WFM correctness: driver values come from each saved monthly snapshot; percentage changes are points; candidate-minus-baseline remains explicit; incompatible staffing outputs remain named `Not comparable` and export blank.
- Data safety: comparison remains read-only. No plan, current selection, forecast snapshot, draft, IndexedDB row, backup schema, or backend object is written.
- Removal: four masking annual-average rows, the comparison-only averaging helper, and the redundant contacts-only exception column were deleted.

## Scope, plan, and acceptance criteria

1. Extend saved-snapshot monthly rows with exact demand/capacity drivers and peak-day requirement.
2. Calculate baseline, candidate, and delta evidence without mutating either plan.
3. Replace outcome-only monthly rows with cause-plus-outcome review and explicit units.
4. Preserve method compatibility and complete 12-month CSV behavior.
5. Prove offsetting monthly capacity changes cannot disappear behind an annual average.
6. Update focused tests, Chromium flow, specification, capability evidence, roadmap, and audit history.

Acceptance criteria achieved:

- A driver-only month appears even if staffing output rounds below the display threshold.
- Equal and opposite monthly paid-time changes remain independently visible.
- Contact, AHT, calendar, paid-time, presence, occupancy, adherence, and peak-day changes use explicit units.
- Average and peak-day requirement, ending frontline, and gap changes remain aligned by month.
- Different requirement methods continue to withhold requirement/supply/gap deltas.
- CSV contains all twelve months and every exact baseline/candidate/delta field.
- Dialog selection, focus, close restoration, immutable plans, and saved data are unchanged.

## Implementation and removals

- `planScenarioComparison.js` now carries monthly AHT, open days, paid hours, presence, occupancy, adherence, peak-day uplift, and peak-day requirement through saved snapshots; it builds candidate-minus-baseline deltas and exports each baseline/candidate/delta field.
- `PlanningPlanComparisonDialog.vue` creates concise month driver summaries, includes any material driver-only month, adds average and peak-day HC outcome columns, and states every unit near the table.
- Focused domain coverage verifies exact driver and peak deltas plus method-withheld CSV fields.
- Component coverage verifies readable driver text and the equal/opposite paid-time case that annual averages hid.
- Chromium coverage verifies the real plan-library dialog exposes driver attribution with the saved fixture.
- Removed the four annual-average assumption properties/rows and local averaging/percent formatting paths. No state, watcher, composable, dependency, migration, compatibility layer, or alternate mobile presentation was added.

## Files, migration, and compatibility

- Product logic/UI: `src/planner/planScenarioComparison.js`, `src/components/planning/PlanningPlanComparisonDialog.vue`.
- Tests: `src/planner/__tests__/planScenarioComparison.spec.js`, `src/components/__tests__/PlanningPlanComparisonDialog.spec.js`, `tests/smoke/planning.spec.js`.
- Specification: `specs/planning/PLAN-013-plan-scenario-comparison.md`.
- Strategy: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, and this audit.
- Interview: `interviews.md` was read; no owner answer or status changed.
- Migration impact: none. Existing saved plans, drafts, backups, legacy Updates, and requirement results render through the same normalized snapshot path.
- The pre-existing untracked `launch-wfmtoolkit.command` was preserved and excluded.

## Exact verification

- Focused Vitest: `npx vitest run src/planner/__tests__/planScenarioComparison.spec.js src/components/__tests__/PlanningPlanComparisonDialog.spec.js` — 2 files, 7 tests passed.
- Focused Chromium: `npx playwright test tests/smoke/planning.spec.js --project=chromium --grep "requires and exposes updated-plan decision reasons"` — 1 test passed.
- `npm run verify:full` passed:
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest: 81 files, 428 tests passed.
  - Vite production build: 837 modules transformed successfully.
  - Playwright Chromium: 21 tests passed.
- `git diff --check` passes on the implementation and strategy tree and is rerun after this audit.
- No Python/backend behavior changed, so backend unit tests were not applicable.

The existing non-failing `NO_COLOR`/`FORCE_COLOR` Playwright warning and Vitest local-storage warning remain unrelated to this slice.

## Desktop, interaction, and state review

The in-app browser restored the persisted three-plan comparison fixture, opened Customer Care Plans, and reviewed Budget against the current Spring Outlook:

- 1280×900: dialog 1248×868 px; all three table scrollers 1181 px wide; no contained or document horizontal overflow.
- 1440×900: dialog 1280×868 px; tables 1213 px wide; no document overflow.
- 1920×1080: dialog 1280×1048 px; wide desktop margins remain calm and no document overflow occurs.
- 1152×720 zoom-equivalent/reduced desktop: dialog 1120×688 px; the 1100 px monthly table scrolls only inside its 1053 px shell; the page does not overflow.
- Initial focus lands on Baseline plan. Candidate selection updates the lineage and monthly evidence. Close restores focus to Compare Plans.
- Populated comparison, incompatible-method focused tests, driver-only change, missing/method-withheld values, and immutable export paths were covered. Loading is not applicable to this synchronous local comparison; empty/one-plan state remains owned by the plan library action gate.
- Live review found no visible runtime or layout issue attributable to the dialog.

## Strategy, roadmap, and interview updates

- Completed `NOW-014` with outcome, evidence, dependencies, delivered/removed scope, and measurable success criteria.
- Refreshed `CAP-SCEN-001`, `CAP-LRP-001`, and `CAP-UX-001` evidence while retaining calibrated Need scores of 20, 20, and 32.
- Updated `PLAN-013` to require monthly cause attribution, explicit units, and preservation of offsetting monthly changes.
- No sponsor answer was detected. `INT-004` remains the only Open question; no duplicative or unrelated question was added.
- High-Need shared persistence, administration, intraday, scheduling, and financial capabilities remain in their evidence-backed horizons.

## Rotation and portfolio balance

The preceding nine completed audits still include `2026-07-19T11-09-07Z-focus-safe-confirmations.md` as the required code-review/remediation run, so this run is not the one-in-ten review. The preceding strategic portfolio review was `NOW-011`; `NOW-012` and `NOW-013` followed it, so this run is the third non-review run after that review rather than the fifth.

Recent delivery already included two substantive desktop UI improvements. This run shifts balance to scenario capability and decision explainability while retaining a focused desktop presentation and meaningful code deletion. It is not defect-only maintenance, another sticky-table treatment, or phone polish.

## Compatibility, risks, limitations, and follow-ups

- Driver labels are presentation summaries; the CSV is the exact reconciliation artifact when several drivers move in one month.
- Display thresholds intentionally hide noise but never remove CSV evidence. A future organization-specific materiality policy would require sponsor evidence rather than silently changing these neutral defaults.
- Peak-day requirement is comparable only under the same requirement method, consistent with other staffing outputs.
- The comparison still reviews saved scenarios; it does not branch a what-if plan, isolate causal contribution with counterfactual recomputation, or generate sensitivity curves.
- Legacy Updates without decision reasons remain explicit and usable.
- Shared editing and lock recovery remain discovery-only under `NEXT-003`, `INT-003`, and `INT-004`.

## Three linked candidates considered

1. Capability/workflow — selected `CAP-SCEN-001`, supporting `CAP-LRP-001`, completed `NOW-014`: attribute monthly outcome movement to exact saved demand and capacity drivers. It was immediately executable, corrected a decision-blind spot, and needed no policy or data migration.
2. Desktop UX — `CAP-UX-001`: add persistent headings to the Actuals worksheet. Deferred because the previous two runs already delivered sticky worksheet context; repeating that treatment would worsen portfolio balance while scenario explainability remained weaker.
3. Deletion/simplification — included in `NOW-014`: remove annual-average capacity rows, the comparison-only averaging helper, and the contacts-only exception column because they masked monthly movement or duplicated the new driver summary.
