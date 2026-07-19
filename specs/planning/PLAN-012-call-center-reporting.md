---
id: PLAN-012
title: Call-Center Annual Rollup and Reporting
status: draft
owners: []
depends_on: [PLAN-008, ACT-003, ACT-006]
last_reviewed: 2026-07-19
---

# Purpose

Define selected-year aggregate reporting inside one call center. The global planning home is a call-center directory and shall not present cross-center portfolio reporting (`INT-001`).

# Scope and Inclusion

- Reporting belongs to the open call-center workspace and aggregates its staffing groups only.
- Select one applicable current plan per staffing group for the requested planning year.
- A group without a selected-year plan contributes no planned demand, requirement, or staffing values.
- A group with actuals but no plan may contribute actual contacts, AHT, workload, and loaded days; actual requirement remains unavailable.
- Records from another year shall not contribute.
- Missing values shall remain distinct from zero.

# Aggregation Rules

- Contacts, workload hours, required hours, staffing movements, and loaded days are summed across independent staffing groups.
- AHT is derived from aggregate workload and contacts rather than averaged across groups.
- Headcount requirement and supply are summed only where groups are independently additive.
- Annual headcount measures shall state when they are monthly averages.
- Variances are derived from aggregate values only when their planned and actual scopes are comparable.
- Intraday Erlang plans contribute planned requirement only from complete saved results whose input signature matches the current saved inputs.
- Missing, incomplete, or stale Intraday Erlang results shall withhold affected monthly requirement and staffing-gap totals rather than silently substituting workload-ratio outputs.
- Actual Intraday Erlang requirement shall contribute only from complete saved actual results whose input signature matches the current saved actuals and plan inputs.
- Missing, incomplete, or stale actual Intraday Erlang results shall withhold affected actual requirement and cross-method variance totals; other actual demand and workload values remain reportable.
- Monthly rows remain chronological and expose contributing staffing-group rows for reconciliation.

# Required Presentation

- The report shall identify the call center, planning year, and current-plan scope.
- Summary values shall include plan and actuals coverage, contacts, required headcount, staffing gap, and AHT where available.
- Monthly rows shall distinguish planned and actual contacts, AHT, workload, requirement, opening frontline, and staffing gap.
- Shortage, missing, incomplete, stale, mixed-scope, and error states shall be communicated as text rather than color alone.
- Requirement-integrity messages shall name each affected staffing group and plan and link to the owning plan workflow.
- Dense monthly results shall remain a native table with contained horizontal overflow.
- The call-center directory shall not duplicate these summary values or rank centers using report results.

# Acceptance Scenarios

## Sum Independent Requirements

**Given** two staffing groups in one call center require 20.5 and 30.25 headcount in March
**When** the center is rolled up
**Then** March requirement is 50.75.

## Preserve Missing Actuals

**Given** no actuals exist for September
**When** the selected-year report is shown
**Then** actual contacts and variance remain unavailable rather than zero.

## Withhold Stale Intraday Requirement

**Given** a current Intraday Erlang plan whose saved result signature no longer matches its saved inputs
**When** the selected-year call-center report is shown
**Then** contacts and workload remain available
**And** the affected planned requirement and staffing-gap totals are unavailable
**And** the staffing group and plan are named with a recalculation action
**And** workload-ratio outputs are not substituted.

## Preserve Requirement Scope Across Methods

**Given** actual demand exists for both a workload-ratio group and an Intraday Erlang group
**And** no matching actual Intraday Erlang result is retained
**When** actual requirement is aggregated
**Then** the partial workload-ratio requirement is not presented as the call-center total.

## Use Retained Actual Intraday Requirement

**Given** a current Intraday Erlang plan has complete saved planned and actual result sets
**And** both signatures match their current saved inputs
**When** actual requirement is aggregated
**Then** actual required headcount is derived from the saved actual Erlang staffed hours and the plan's saved overhead and paid-capacity basis
**And** planned-versus-actual requirement and staffing-gap variance may be reported.

## Keep the Directory Non-Reporting

**Given** multiple call centers contain plans and actuals
**When** the planner opens the call-center directory
**Then** it lists center identity, staffing-group count, operating schedule, and actions
**And** does not show cross-center KPIs, charts, year filters, report tables, or exports.

# Open Questions

1. Are any staffing groups non-additive because staff are shared?
2. Should call-center reports support a staffing-group contribution export?

# Implementation Traceability

- `src/planner/annualPlanningRollup.js`
- `src/components/planning/PlanningCenterView.vue`
- `src/composables/planning/usePlanningCenterWorkspace.js`
- `src/components/PlanningHome.vue`
