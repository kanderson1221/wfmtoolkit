---
id: PORT-004
title: Staffing Waterfall and Variance Presentation
status: draft
owners: []
depends_on: [PORT-003, PLAN-009, ACT-003]
last_reviewed: 2026-06-14
---

# Purpose

Define visual and textual presentation of monthly staffing movement and planned-versus-actual variance.

# Staffing Waterfall

The monthly waterfall shall distinguish:

- opening frontline headcount
- frontline additions
- frontline attrition as a negative movement
- ending frontline headcount
- required headcount
- roster headcount

# Variance Presentation

Applicable views shall distinguish:

- actual minus planned demand
- actual minus planned AHT
- actual minus planned requirement
- planned staffing minus actual requirement

The sign convention shall be stated and consistent.

# Functional Requirements

- Chart values shall derive from the same rollup records as tables.
- Tooltips shall name measure, month, value, and sign meaning.
- Attrition shall be represented as subtraction.
- Required and supply series shall not be visually confused with movement bars.
- A textual or tabular equivalent shall be available.
- Empty chart states shall explain whether movement data or plans are missing.

# Accessibility and Formatting

- Charts shall have meaningful accessible names.
- Color shall not be the only differentiator.
- Negative values shall retain signs.
- Display rounding shall reconcile with table values.
- Hidden series shall not alter underlying totals.

# Acceptance Scenarios

## Show Attrition as Negative

**Given** 10 frontline attritions occur  
**When** the waterfall renders  
**Then** attrition is shown as -10 movement.

## Reconcile Ending Frontline

**Given** opening frontline, additions, and attrition  
**When** the month is displayed  
**Then** ending frontline equals opening plus additions minus attrition.

## Show Empty State

**Given** no selected-year staffing movement exists  
**When** the chart area opens  
**Then** a useful empty state appears instead of an empty plotting frame.

# Open Questions

1. Should hiring and frontline-ready additions be separate movements?
2. Which variance charts are required at portfolio versus plan level?
3. Is image or PDF export required?

# Implementation Traceability

- `src/components/planning/PlanningPortfolioHeadcountChart.vue`
- `src/components/planner/PlannerActualsComparisonChart.vue`

