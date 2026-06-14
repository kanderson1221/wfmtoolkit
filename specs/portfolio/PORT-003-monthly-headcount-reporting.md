---
id: PORT-003
title: Monthly Required, Roster, and Frontline Headcount Reporting
status: draft
owners: []
depends_on: [PORT-002, PLAN-008]
last_reviewed: 2026-06-14
---

# Purpose

Define the monthly operating-plan table and comparable headcount measures used for portfolio decisions.

# Required Monthly Columns

- month
- planned contacts
- actual contacts and variance when available
- planned and actual AHT
- required headcount
- starting frontline headcount
- ending frontline headcount
- ending roster headcount
- staffing gap
- actual loaded days

# Reporting Rules

- Required headcount shall identify decimal versus rounded form.
- Staffing gap shall identify the compared supply point.
- Negative gap means supply is below requirement.
- Values shall be aggregated only across groups with applicable plans.
- Missing actuals shall remain unavailable.
- Rows below requirement shall be identifiable without relying only on color.
- Month ordering shall be chronological.

# Detail Requirements

- A monthly portfolio row shall support drill-down to contributing staffing groups.
- Detail shall name call center, staffing group, and plan.
- Detail totals shall reconcile to the parent row within display rounding.
- Mixed requirement methods may be aggregated only when headcount definitions are compatible.

# Acceptance Scenarios

## Show a Shortage

**Given** required headcount is 150 and compared frontline is 142  
**When** the month is displayed  
**Then** staffing gap is -8  
**And** the shortage is textually identifiable.

## Reconcile Detail

**Given** a portfolio month is expanded  
**When** contributing groups are listed  
**Then** their displayed requirement totals reconcile to the portfolio requirement within rounding.

## Preserve Missing Actuals

**Given** no actuals exist for September  
**When** the table is shown  
**Then** actual contacts and variance are unavailable.

# Open Questions

1. Should the default gap use starting or ending frontline?
2. Are rounded operational requirements needed beside decimal values?
3. Should users export the monthly report?

# Implementation Traceability

- `src/components/PlanningHome.vue`
- `src/components/planning/PlanningCenterView.vue`
- `src/planner/annualPlanningRollup.js`

