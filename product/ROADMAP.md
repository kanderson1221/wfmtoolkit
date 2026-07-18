# WFM Toolkit Product Roadmap

Canonical strategy established 2026-07-18. Items are ordered for a desktop-first WFM planning product; Improvement Need comes from `WFM_CAPABILITY_ASSESSMENT.md`. Now stays small and executable. High-Need missing domains may remain Later when prerequisites or product-boundary decisions are unresolved.

## Now

### `NOW-001` — Honest empty and incomplete portfolio states — Completed

- Capability: `CAP-REP-002` (Need 45 after this run; 52 before)
- Planner outcome: a planning lead immediately knows whether selected-year portfolio outputs are authoritative and where to establish coverage.
- Problem/opportunity: centers with no applicable plans produced eight zero KPI tiles, twelve zero monthly rows, and an empty staffing chart that looked like a zero-demand plan.
- Rationale/evidence: `PORT-005` requires unknown headcount to remain unknown and groups without plans to stay distinct from zero demand; `PlanningHome.vue` previously rendered rollup initializer zeroes.
- Dependencies: organization hierarchy and plan-role selection.
- Proposed scope: withhold report-only surfaces when zero plans contribute, state coverage and actuals context, retain the command list, and provide a direct center action.
- Success measures: no report KPI/table/chart or export appears at 0-plan coverage; state says `0 of N`; one action opens the next setup center; populated report behavior is unchanged.
- Status: completed 2026-07-18, then superseded by sponsor direction `INT-001`; the portfolio report was removed under `RET-002`.
- Last reviewed: 2026-07-18.

### `NOW-002` — Atomic imported-forecast replacement preview — Completed

- Capability: `CAP-FORE-001` (Need 20 after this run; 32 before), `CAP-GOV-001` (Need 26)
- Planner outcome: a planner can replace an imported forecast only after seeing validation results and the exact impact on editable drafts while saved plan snapshots remain protected.
- Problem/opportunity: version deletion warnings are strong, but replacement acceptance and dependent-draft impact are not yet one explicit atomic review workflow.
- Rationale/evidence: `FIMP-007` and Workflow 2 require dependency review and atomic persistence; recent audit candidates repeatedly identify this gap.
- Dependencies: forecast repository contract, plan dependency lookup, immutable saved snapshots.
- Proposed scope: full pre-validation, version/draft impact preview, single atomic accept, failure recovery, focused persistence and UI tests; remove obsolete replacement branches exposed by the consolidation.
- Success measures: invalid imports write nothing; every affected draft is named; final plans remain unchanged; success replaces exactly one version and returns to its selected library row.
- Status: completed 2026-07-18. Replacement retains the selected forecast ID, names all dependent saved plans and states, preserves every plan snapshot, and keeps a failed candidate available for retry.
- Last reviewed: 2026-07-18.

### `NOW-003` — Portfolio partial-coverage decision state — Completed

- Capability: `CAP-REP-002` (Need 30 after this run; 45 before), `CAP-REP-001` (Need 20 after this run; 28 before)
- Planner outcome: leaders see which totals are partial, which groups are missing, and whether a metric is safe to use.
- Problem/opportunity: a portfolio with some plans still presents full totals; coverage is visible but the contributing and missing scope is not actionable near every authority-sensitive result.
- Rationale/evidence: `PORT-005` requires numerator, denominator, and missing scope; the new 0-plan state establishes the presentation boundary but not partial coverage.
- Dependencies: contributor identity from annual rollups and plan-role semantics.
- Delivered scope: centralized group-level inclusion evidence; open missing-group review with center actions and exclusion reasons; scoped KPI/table/chart language; invalid cross-scope variance withholding; actuals-only and out-of-year regressions.
- Success measures: users can name every excluded group from the report; no total implies full coverage; incomparable variance is unavailable; keyboard access and wide-table flow remain intact.
- Status: completed 2026-07-18, then superseded by `INT-001`; the portfolio report was removed under `RET-002` rather than extended with a threshold.
- Last reviewed: 2026-07-18.

### `NOW-004` — Side-by-side plan scenario comparison — Ready

- Capability: `CAP-SCEN-001` (Need 32), `CAP-UX-001` (Need 32)
- Planner outcome: compare Budget and Updates across assumptions, demand, requirement, supply, and gaps without opening plans serially.
- Problem/opportunity: version lineage exists, but comparison is row-summary level rather than decision-grade.
- Rationale/evidence: plan library and current-plan roles are implemented; comparison is the highest-leverage extension of the annual planning core.
- Dependencies: stable plan snapshots and comparable requirement semantics.
- Proposed scope: desktop split comparison, assumption deltas, monthly exceptions, explicit incompatible-method handling, CSV export.
- Success measures: two plans reconcile to their saved snapshots; changed assumptions and top staffing-gap movements are visible without tab switching.
- Status: ready; promoted from `NEXT-001` after `NOW-003` completed.
- Last reviewed: 2026-07-18.

## Next

### `NEXT-002` — Forecast accuracy and uncertainty review

- Capability: `CAP-FORE-002` (Need 40)
- Planner outcome: forecast analysts can judge model fit, holdout performance, interval uncertainty, and manual overrides before saving a planning source.
- Problem/opportunity: the workbench is capable but does not provide a compact, governed accuracy decision record.
- Rationale/evidence: forecasting modules expose model components and validation; uncertainty and model comparison remain gaps in the assessment.
- Dependencies: stable historical-data quality and forecast result schema.
- Proposed scope: holdout metrics, bias/accuracy by period, uncertainty bands or scenarios, override reason trace, and exportable diagnostics.
- Success measures: users can compare at least two candidate models or configurations and identify bias/coverage limitations without reading implementation details.
- Status: sequenced.
- Last reviewed: 2026-07-18.

### `NEXT-003` — Shared planning persistence discovery and migration design

- Capability: `CAP-DATA-002` (Need 71), `CAP-ADMIN-001` (Need 60)
- Planner outcome: teams can evaluate a safe path from device-local planning to governed shared work without risking current data.
- Problem/opportunity: runtime planning is local while relational schema artifacts exist; implementing authentication first would create a shell without collaboration semantics.
- Rationale/evidence: IndexedDB is robust for one user, but no concurrency, ownership, conflict, or tenancy model exists.
- Dependencies: product tenancy decision, event/audit model, offline stance.
- Proposed scope: architecture decision record, repository boundary, migration/reconciliation prototype, threat model, and explicit non-goals—not a cosmetic sign-in screen.
- Success measures: validated migration round-trip, conflict policy, ownership model, and staged rollout plan.
- Status: discovery.
- Last reviewed: 2026-07-18.

## Later

### `LATER-001` — Intraday variance and recovery workspace

- Capability: `CAP-INTRA-001` (Need 80)
- Planner outcome: intraday managers see interval demand/capacity deviation and can record recovery decisions.
- Problem/opportunity: interval sizing exists, but same-day operational management does not.
- Rationale/evidence: this is valuable but depends on near-real-time actuals, schedules, and shared persistence.
- Dependencies: `NEXT-003`, employee/schedule or aggregate capacity feeds, interval actuals contract.
- Proposed scope: integration-boundary discovery first, then dense exception table, reforecast, recovery actions, and audit trail.
- Success measures: agreed data latency and ownership; actionable deviations reconcile to source feeds.
- Status: dependency-blocked, not currently executable.
- Last reviewed: 2026-07-18.

### `LATER-002` — Employee scheduling product boundary

- Capability: `CAP-SCHED-001` (Need 100)
- Planner outcome: determine whether WFM Toolkit should optimize shifts or hand requirements to a scheduling platform.
- Problem/opportunity: scheduling is strategically important but entirely absent and materially larger than an annual-planning enhancement.
- Rationale/evidence: no employee, skill, labor-rule, activity, or optimizer model exists; blindly building schedule UI would fragment the product.
- Dependencies: shared persistence, skills, contracts/rules, demand granularity, integration strategy.
- Proposed scope: practitioner discovery, build-versus-integrate decision, and minimum interoperable requirement export before implementation.
- Success measures: documented decision, validated planner workflow, and scoped data model with no speculative UI.
- Status: explore-before-build.
- Last reviewed: 2026-07-18.

### `LATER-003` — Governed collaboration and administration

- Capability: `CAP-ADMIN-001` (Need 60), `CAP-GOV-001` (Need 26)
- Planner outcome: role-appropriate access, approvals, ownership, and change history for shared plans.
- Problem/opportunity: local-device storage has no identity or separation of duties.
- Rationale/evidence: administration has little standalone value before shared persistence and tenancy exist.
- Dependencies: `NEXT-003` and audit/event model.
- Proposed scope: identity, roles, ownership, approvals, immutable audit events, recovery administration.
- Success measures: least-privilege policies and traceable plan changes pass security and data-recovery tests.
- Status: dependency-blocked.
- Last reviewed: 2026-07-18.

## Explore

### `EXP-001` — Labor cost and budget scenarios

- Capability: `CAP-FIN-001` (Need 60)
- Planner outcome: WFM and finance compare hiring, attrition, overtime, and vendor scenarios in labor-cost terms.
- Problem/opportunity: staffing decisions lack cost consequences, but currency, rate, burden, and vendor semantics are undefined.
- Rationale/evidence: add cost only after scenario comparison supplies a trusted operational basis.
- Dependencies: `NOW-004`, organization/currency decisions, data governance.
- Proposed scope: discovery and calculation contract; no implementation commitment yet.
- Success measures: finance-approved semantics and reconciled example scenarios.
- Status: explore.
- Last reviewed: 2026-07-18.

### `EXP-002` — Shared-pool and multi-skill staffing semantics

- Capability: `CAP-ORG-001` (Need 20), `CAP-REQ-002` (Need 24)
- Planner outcome: understand when staffing groups can be added independently and when shared capacity requires a network model.
- Problem/opportunity: call-center rollups assume independent additive groups.
- Rationale/evidence: `PLAN-012` carries this as an open question; changing it affects organization, Erlang, reporting, and scenarios.
- Dependencies: practitioner evidence and real routing examples.
- Proposed scope: domain research and reference cases only.
- Success measures: explicit supported/unsupported pooling rules and validated calculation direction.
- Status: explore.
- Last reviewed: 2026-07-18.

## Retired / Declined

### `RET-001` — Phone planning layouts and navigation — Declined

- Capability: `CAP-UX-001` (Need 32, for desktop improvement—not phone support)
- Planner outcome: preserve desktop information density and avoid complexity that does not serve professional planning work.
- Problem/opportunity: phone-only breakpoints, hamburger navigation, card transformations, and touch states would add code while degrading dense worksheets.
- Rationale/evidence: the supported strategy is desktop/laptop at approximately 1280–1920 px with normal window resizing and zoom.
- Dependencies: none.
- Proposed scope: do not add phone planning work; remove mobile-only complexity when encountered and safe.
- Success measures: roadmap and tests stay focused on desktop workflows; no supported desktop behavior regresses.
- Status: declined by product direction.
- Last reviewed: 2026-07-18.

### `RET-002` — Cross-center portfolio reporting on planning home — Retired

- Capability: `CAP-REP-001` (Need 20), `CAP-REP-002` (Need 30), `CAP-UX-001` (Need 32)
- Planner outcome: reach and manage call centers without an unrelated cross-center report competing for attention; review aggregate results inside the owning call-center/staffing-group workflow.
- Problem/opportunity: the planning home accumulated a year selector, KPIs, incomplete-scope policy, monthly table, CSV, chart, and risk-ranked center rows even though the sponsor does not use this surface for portfolio reporting.
- Rationale/evidence: sponsor answer `INT-001` explicitly directs deletion and identifies existing staffing-group aggregate reporting as the right reporting location. `PlanningCenterView.vue` already provides selected-year aggregate reporting.
- Dependencies: retained call-center reporting contract `PLAN-012`.
- Retired scope: cross-center KPIs, selected-year home filter, partial-coverage disclosure, monthly operating report, portfolio CSV, staffing waterfall chart, report-derived center ranking/status/columns, and obsolete `PORT-001`–`PORT-005` specifications.
- Success measures: home contains only call-center identity, staffing-group count, operating schedule, and management actions; no cross-center report logic or orphaned report code remains; call-center aggregates are unchanged.
- Status: retired 2026-07-18 and implemented in response to `INT-001`.
- Last reviewed: 2026-07-18.

## Decision log

| Date | Decision |
|---|---|
| 2026-07-18 | Established the first capability baseline and roadmap because the required strategy artifacts were absent. |
| 2026-07-18 | Completed `NOW-001`: no-plan portfolio initializer zeroes are no longer presented as an operating report. |
| 2026-07-18 | Completed `NOW-002`: imported daily forecast replacement now validates and previews one exact version, names dependent plan states, persists atomically, and never refreshes plan snapshots automatically. |
| 2026-07-18 | Promoted `NOW-003` partial portfolio coverage to Ready after the forecast-replacement dependency and workflow slice completed. |
| 2026-07-18 | Completed `NOW-003`: partial portfolio reports now name excluded groups, scope plan-derived outputs, and withhold cross-scope variance. |
| 2026-07-18 | Promoted side-by-side plan scenario comparison from `NEXT-001` to ready `NOW-004`; stable plan snapshots now support the work. |
| 2026-07-18 | Kept employee scheduling and intraday management out of Now despite high Need scores because data/integration prerequisites and product-boundary decisions are unresolved. |
| 2026-07-18 | Declined phone-specific planning work; desktop/laptop workflow quality is the supported UX target. |
| 2026-07-18 | Applied `INT-001` and retired cross-center portfolio reporting from the planning home. Earlier `NOW-001`/`NOW-003` integrity work remains preserved as completed history but its product surface was superseded; aggregate reporting stays inside call centers under `PLAN-012`. |
