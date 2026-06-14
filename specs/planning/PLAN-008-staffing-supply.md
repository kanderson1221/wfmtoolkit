---
id: PLAN-008
title: Staffing Supply, Opening Headcount, and Attrition
status: draft
owners: []
depends_on: [PLAN-006, PLAN-007, FOUND-003]
last_reviewed: 2026-06-14
---

# Purpose

Define the monthly staffing-supply roll-forward used to compare available frontline staff with required headcount.

# Inputs

- January opening roster headcount
- January opening frontline headcount
- monthly frontline attrition headcount
- training-class hires, fallout, and frontline-ready outcomes
- monthly required headcount

# Monthly Roll-Forward

```text
starting roster = prior month ending roster
starting frontline = prior month ending frontline

ending roster =
  starting roster
  + hires
  - frontline attrition
  - training fallout

ending frontline =
  starting frontline
  + frontline-ready graduates
  - frontline attrition

starting gap = starting frontline - required headcount
ending gap = ending frontline - required headcount
```

# Business Rules

- Opening and ending headcount shall not be negative.
- Frontline headcount shall not exceed roster headcount.
- Frontline attrition shall not exceed starting frontline or roster headcount.
- Hires enter roster on hire date but not frontline until ready.
- Graduation alone does not make a class frontline-ready when nesting days remain.
- Training fallout reduces roster when the class completes training.
- The default staffing-gap metric shall identify whether it uses starting or ending frontline.

# Functional Requirements

- Planner shall enter opening headcount and monthly attrition.
- Derived hiring and training movements shall be visible by month.
- Worksheet shall show required, starting roster, starting frontline, hires, graduates, in-training, attrition, ending roster, ending frontline, and gap.
- Months below requirement shall be visibly identifiable.
- Saved plans shall preserve opening and movement inputs.

# Acceptance Scenarios

## Roll Forward Headcount

**Given** January starts with 100 roster and 90 frontline  
**And** 10 hires, 5 frontline-ready graduates, 3 attritions, and 2 fallout occur  
**When** January ends  
**Then** roster is 105  
**And** frontline is 92.

## Cap Attrition

**Given** starting frontline is 4  
**When** planned attrition is 10  
**Then** applied attrition is capped at 4  
**And** ending headcount is not negative.

# Open Questions

1. Should attrition be entered as headcount, percent, or either?
2. Are transfers and non-frontline exits required?
3. Which gap should drive portfolio risk: opening, ending, or both?

# Implementation Traceability

- `src/planner/staffingModel.js`
- `src/components/planner/PlannerStaffingSupplyTable.vue`
- `src/components/planner/PlannerStaffingPlanTab.vue`

