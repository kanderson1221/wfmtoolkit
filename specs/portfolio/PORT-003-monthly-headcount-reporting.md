---
id: PORT-003
title: Monthly Required, Roster, and Frontline Headcount Reporting
status: draft
owners: []
depends_on: [PORT-002, PLAN-008]
last_reviewed: 2026-07-18
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
- The selected-year monthly report shall be downloadable as CSV when at least one staffing group has an applicable plan.
- The CSV shall identify the planning year, current-plan role, planned-group coverage, monthly demand, requirement, staffing supply and movements, gaps, loaded actuals, and unavailable actual values as blank cells.
- CSV rows shall retain calculation precision beyond the rounded screen display and remain chronological.

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

## Export the Selected-Year Operating Plan

**Given** at least one staffing group has an applicable current plan for 2027
**When** the planner downloads the portfolio monthly CSV
**Then** the file contains twelve chronological 2027 rows
**And** identifies the plan role and plan coverage
**And** includes required, starting frontline, ending frontline, and ending roster headcount
**And** leaves missing actuals blank rather than reporting zero.

# Open Questions

1. Should the default gap use starting or ending frontline?
2. Are rounded operational requirements needed beside decimal values?
3. Should a future detail export include one row per contributing staffing group?

# Implementation Traceability

- `src/components/PlanningHome.vue`
- `src/components/planning/PlanningCenterView.vue`
- `src/planner/annualPlanningRollup.js`
