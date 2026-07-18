# Unmodeled portfolios no longer look like zero-demand plans

Run type: product improvement

## Capability IDs and roadmap items

- Primary capability: `CAP-REP-002` Reporting state integrity.
- Supporting capabilities: `CAP-REP-001` Portfolio reporting and `CAP-UX-001` Desktop operational UX.
- Roadmap: established the missing strategy baseline and completed `NOW-001` Honest empty and incomplete portfolio states.

## Planner persona, decision, and desktop workflow

- Persona: workforce planning lead establishing or reviewing an annual operating plan.
- Decision: determine whether the selected-year portfolio is decision-ready and which call center needs plan setup next.
- Desktop workflow: open Planning Portfolio, confirm selected year/current-plan scope, assess plan coverage, and move directly into the first call center requiring setup.
- Review scope: the portfolio state boundary when call centers exist but no applicable selected-year plan contributes. This was not a scheduled code-review run.

## Selected opportunity and evidence

`buildAnnualPlanningRollup` correctly initializes twelve monthly buckets, but `PlanningHome.vue` presented those initializer zeroes as an operating report even when `plannedGroupCount` was zero. The screen showed eight KPI tiles, twelve zero-valued plan rows, an empty staffing chart, and a disabled export control. A planner could read that state as zero demand and zero required headcount rather than no model.

The product evidence was explicit:

- `PORT-001` requires unknown and unavailable values to remain distinct from zero.
- `PORT-005` requires groups without plans to remain distinct from zero-demand groups and permits non-decision-useful metrics to be omitted.
- The immediately prior code-review audit identified the zero-valued no-plan portfolio as its highest desktop UI/trust follow-up.
- The pre-change regression failed because the rendered screen contained `Expected Contacts`, `Peak Required HC`, `Portfolio Monthly Operating Plan`, `Jan 2026`, and `Monthly Staffing Waterfall` at zero plan coverage.

## Capability scores before and after

`CAP-REP-002` moved from **5/2/3/2/2/3** with Improvement Need **52** to **5/2/3/3/3/3** with Improvement Need **45** (Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health).

Desktop UX and trust improved because the portfolio now withholds non-authoritative report surfaces, states scope and coverage, preserves actuals truth, and provides a direct action. Completeness remains 2: partial-coverage thresholds, mixed-scope handling, stale labels, and report-error consistency are not yet systematic.

## Product decision

Desktop-redesign the no-applicable-plan presentation while retaining the populated portfolio report and command list. Do not change rollup calculations or rewrite valid zero-demand behavior.

The change removes misleading product surface from this state rather than converting domain initializer values to `null`, because the zero buckets remain useful internal aggregation structures and valid populated plans can contain real zero demand.

## WFM rationale, assumptions, and methodology

- No applicable current plan means planned demand, workload, required headcount, staffing supply, and staffing gap are unavailable at portfolio scope; it does not mean zero.
- Actuals may exist without a plan. They remain truthful observed data, but the application cannot derive a compatible staffing requirement or actual-vs-plan variance without the planning basis.
- The direct action opens the first sorted call center with a plan gap or no groups. It does not silently create a group, forecast, or plan.
- Plan role stays `current`, matching the annual rollup and export behavior.
- No formula changed. The reporting-state predicate is `plannedGroupCount > 0`.

## Recent-run rotation and portfolio assessment

The immediately prior run was the required code review and remediation run, so consecutive review work was neither required nor appropriate. Recent non-review runs included the actuals gap-repair capability and backup recovery UX; this run continues the required user-facing balance with a substantive portfolio decision-state improvement.

This repository had no `product/WFM_CAPABILITY_ASSESSMENT.md` or `product/ROADMAP.md`. The run therefore established the required evidence-based baseline before implementation, inventoried implemented and strategically missing domains, calibrated scores, sequenced dependencies, and still completed this bounded UI improvement. This was not a fifth-run portfolio-review cadence event, so the audit type remains `product improvement`.

## User value, scope, plan, and acceptance criteria

Operational value: planning leads can distinguish “not modeled” from “zero demand” immediately and enter setup without scanning a fabricated annual report.

Scope:

- zero-applicable-plan state on `PlanningHome.vue`
- actuals-without-plan wording in the command list/state
- `PORT-005`
- focused component regression
- first capability assessment and roadmap baseline

Acceptance criteria:

- The state names selected year and current-plan scope.
- It identifies `0 of N` staffing groups when groups exist, or explains that no groups exist.
- Actuals-only groups are counted without implying staffing requirements.
- KPI strip, monthly operating table, staffing chart, and export action are absent when no plan contributes.
- The call-center command list remains available.
- A visible setup action opens the next call center needing work.
- No-plan variance and staffing-gap cells say `Plan required` rather than `Waiting for actuals` or `0 months below`.
- Populated portfolios retain their existing report, chart, and CSV behavior.

## Implementation summary

- Added an explicit `hasApplicablePlan` presentation boundary.
- Added a context-aware no-plan description for zero-group, no-actuals, and actuals-only cases.
- Added a primary call-center setup action and current-plan/year scope label.
- Reworded command-list variance and gap metadata to `Plan required` for unplanned centers.
- Replaced the obsolete disabled-export regression with a vertical state/action regression that covers actuals without a plan.
- Updated `PORT-005` with functional and acceptance requirements.
- Created the canonical capability assessment and roadmap, including missing scheduling, intraday management, shared persistence, administration, and financial planning capabilities.

## Removed code and product surface

- Removed eight KPI tiles, twelve monthly zero rows, the disabled CSV action, and the empty staffing chart from the rendered zero-plan state.
- Removed misleading `Waiting for actuals` and `0 months below` metadata from unplanned command rows.
- No source file or dependency became obsolete; the same report/chart code remains required for populated portfolios.
- No phone-specific state or styling was added.

## Files changed and migration impact

- `src/components/PlanningHome.vue`
- `src/components/__tests__/PlanningHome.spec.js`
- `specs/portfolio/PORT-005-reporting-states.md`
- `product/WFM_CAPABILITY_ASSESSMENT.md`
- `product/ROADMAP.md`
- `actions_take/2026-07-18T21-24-04Z-honest-unmodeled-portfolio.md`

Migration impact: none. No route, persisted record, backup schema, calculation, plan snapshot, forecast, actual, or local-data version changed.

## Verification outcomes

- Pre-change focused regression: 1 of 9 `PlanningHome` tests failed as expected because the actionable state was absent and zero report surfaces were present.
- Focused final: `npm test -- --run src/components/__tests__/PlanningHome.spec.js`
  - Passed: 1 file, 9 tests.
- Full: `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 73 files, 386 tests.
  - Vite production build passed: 830 modules transformed.
- End to end: `npm run test:e2e`
  - Passed: 15 Chromium smoke tests.
- `git diff --check`
  - Passed with no whitespace errors.

The existing Vitest `--localstorage-file` warning and Playwright `NO_COLOR`/`FORCE_COLOR` warnings were emitted; neither failed a check.

## Desktop, interaction, state, and accessibility review

The real local screen was inspected in the in-app browser with a temporary empty call center, then the temporary record was removed through the product's confirmation flow.

- 1280×900: state/action and full command row were readable; the wide native table remained contained; viewport had no page-level horizontal overflow.
- 1440×900: app frame measured 1393 px; table client and scroll widths both measured 1391 px, so no contained overflow was needed for the single sparse row.
- 1920×1000: app frame measured 1865 px; table client and scroll widths both measured 1863 px; wide space was used without stretching the message into a card stack.
- Empty workspace, center-with-no-groups, direct setup navigation, delete confirmation cleanup, and command-row no-plan labels were reviewed.
- Keyboard traversal kept the standard button focus ring visible. The setup action and row actions remained semantic buttons; the table retained native headers.
- Window resizing across 1280–1920 was reviewed. Browser zoom was not separately changed; 1280 px provided the supported constrained-laptop/zoom-like layout check.
- Console warnings/errors during browser review: none.
- Populated and actuals-only behavior was covered by component regression; a dense populated portfolio was not manually reconstructed in the browser during this bounded run.

## Strategy and roadmap updates

- Created the canonical assessment with 21 stable capabilities spanning data, organization, forecasting, workload, requirements, shrinkage, staffing supply, scheduling, scenarios, intraday, long-range planning, reporting, import/export, governance, administration, financial planning, and desktop UX.
- Included strategically missing capabilities and recorded why high-Need scheduling/intraday work is not executable Now.
- Created Now/Next/Later/Explore/Retired horizons and a decision log.
- Completed `NOW-001`; selected `NOW-002` atomic imported-forecast replacement preview as the next ready item; retained `NOW-003` partial portfolio coverage as the next reporting-state slice.
- Declined phone-specific planning work under `RET-001`.

## Compatibility, risks, limitations, and follow-ups

- Valid zero-demand plans still render normally because the boundary is plan coverage, not demand magnitude.
- A partially planned portfolio still shows totals. Coverage is visible, but the exact missing contributing scope and authority threshold need `NOW-003`.
- The next setup center follows existing command-list ordering; it is deterministic but not yet prioritized by forecast readiness.
- No explicit load or storage error was introduced into this component; portfolio-level error-state consistency remains part of `CAP-REP-002`.

## Next three non-duplicative candidates

1. Product capability — `NOW-002`, `CAP-FORE-001`: atomic imported-forecast replacement with full pre-validation and editable-draft impact preview.
2. Desktop UX — `NOW-003`, `CAP-REP-002`: partial portfolio coverage review naming missing groups and scoping every authority-sensitive total.
3. Deletion/simplification — `CAP-IO-001`: consolidate remaining backup and actuals-gap Blob/object-URL lifecycles into the shared browser-download primitive and remove duplicates.
