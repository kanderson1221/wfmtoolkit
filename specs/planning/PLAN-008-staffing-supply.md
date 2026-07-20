---
id: PLAN-008
title: Staffing Supply, Opening Headcount, and Attrition
status: draft
owners: []
depends_on: [PLAN-006, PLAN-007, FOUND-003]
last_reviewed: 2026-07-20
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
- Opening gap is the current default opening-position measure because it uses frontline supply available before monthly hiring, graduation, and attrition movements are applied.
- Ending gap is a forward-looking close-position measure and shall not silently replace opening gap in reports, recommendations, or risk states.
- Neither point-in-time gap shall be presented as average in-month available capacity; the monthly model does not time-weight hires, readiness, or attrition.

# Functional Requirements

- Planner shall enter opening headcount and monthly attrition.
- Derived hiring and training movements shall be visible by month.
- Worksheet shall show required, starting roster, starting frontline, hires, graduates, in-training, attrition, ending roster, ending frontline, opening gap, and ending gap.
- Worksheet columns shall be grouped as Requirement, Opening Supply, Pipeline and Loss, Ending Supply, and Decision so planners can follow the monthly roll-forward without reconstructing abbreviated headings.
- The annual worksheet shall own a named keyboard-focusable scroll region and keep its two-tier headings and Month column visible while contained scrolling is required.
- Editable worksheet fields shall expose the month, measure, and unit in their accessible name when table context alone is insufficient.
- Months below requirement shall be visibly identifiable.
- Saved plans shall preserve opening and movement inputs.
- Existing `gapToRequirement` summary fields remain an opening-gap compatibility alias; interfaces and new exports shall name that basis explicitly.

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

## Retain Monthly Decision Context

**Given** a planner reviews all twelve staffing-supply rows in a resized desktop window

**When** the worksheet scrolls vertically or horizontally

**Then** the requirement, opening supply, pipeline and loss, ending supply, and decision headings remain visible

**And** each visible row's Month identity remains visible during horizontal movement

**And** the document does not acquire horizontal overflow.

## Distinguish Opening And Ending Exposure

**Given** a month opens with 90 frontline headcount against a requirement of 100

**And** planned movements produce 105 ending frontline headcount

**When** the planner reviews staffing supply

**Then** opening gap is shown as -10

**And** ending gap is shown as +5

**And** downstream reporting continues to name the opening-position basis it uses.

# Open Questions

1. Should attrition be entered as headcount, percent, or either?
2. Are transfers and non-frontline exits required?
3. Should a future in-month risk measure time-weight dated supply movements rather than use either point-in-time gap?

# Implementation Traceability

- `src/planner/staffingModel.js`
- `src/components/planner/PlannerStaffingSupplyTable.vue`
- `src/components/planner/PlannerStaffingPlanTab.vue`
