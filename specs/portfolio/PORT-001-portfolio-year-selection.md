---
id: PORT-001
title: Planning Portfolio and Year Selection
status: draft
owners: []
depends_on: [FOUND-002, ACT-006]
last_reviewed: 2026-06-14
---

# Purpose

Define the portfolio entry point and selected-year context for reviewing planning coverage and staffing risk.

# Functional Requirements

- The portfolio shall present one selected planning year at a time.
- Available years shall include years represented by plans or actuals plus a practical nearby range.
- Changing year shall update every portfolio metric, table, and chart consistently.
- The page shall provide creation and opening actions for call centers.
- Empty portfolios shall explain how to create the first call center.
- The selected year shall persist during the current navigation context.

# Portfolio Summary

The selected-year summary may include:

- call-center count
- staffing-group count
- groups with applicable plans
- groups with actuals
- annual plan contacts
- average or peak required headcount
- average staffing gap
- months below requirement

Metrics shall identify their scope and plan role.

# Scope Rules

- Records from other years shall not contribute.
- Current-plan mode and budget mode shall not be mixed.
- Groups without plans may contribute actuals coverage but not planned totals.
- Unknown or unavailable values shall remain distinct from zero.

# Acceptance Scenarios

## Switch Planning Year

**Given** portfolio data exists for 2026 and 2027  
**When** 2027 is selected  
**Then** all metrics and rows use only 2027 records.

## Show an Empty Portfolio

**Given** no call centers exist  
**When** the portfolio opens  
**Then** it shows a first-action empty state  
**And** does not show misleading zero performance metrics.

## Include Actuals Without Plan

**Given** a group has actuals but no selected-year plan  
**When** the portfolio loads  
**Then** actuals coverage may be shown  
**And** planned requirement remains unavailable.

# Open Questions

1. Should plan role be selectable at portfolio level?
2. How wide should the default year range be?
3. Should selected year persist across browser sessions?

# Implementation Traceability

- `src/components/PlanningHome.vue`
- `src/planner/annualPlanningRollup.js`
- `src/planner/shared.js`

