---
id: PLAN-009
title: Hiring and Training Pipeline
status: draft
owners: []
depends_on: [PLAN-008, ORG-002]
last_reviewed: 2026-06-14
---

# Purpose

Define training-class inputs, derived dates and outcomes, and optional recommendations used to close staffing gaps.

# Training Settings

- training duration in workdays
- graduation yield percent
- available trainer count
- maximum class size
- post-training nesting workdays
- preference to start on the first business day of a week

# Training-Class Data

- stable class identifier
- hire date
- hire count
- source: manual, recommended, or inherited
- derived graduation date
- derived frontline-ready date
- graduating headcount
- projected frontline-ready headcount
- training fallout

# Date and Outcome Rules

- Hire date adds the full class to roster.
- Graduation date is derived by counting configured workdays and skipping closures.
- Frontline-ready date follows graduation plus nesting workdays.
- Projected frontline-ready headcount equals hire count times graduation yield unless an explicit preserved outcome applies.
- Fallout equals graduating headcount minus projected frontline-ready headcount, not below zero.
- Class size and trainer constraints apply to recommendations.

# Recommendation Requirements

- Recommendations shall be generated only on explicit action.
- Existing manual classes shall be included before gaps are evaluated.
- Recommendations shall target readiness before the affected requirement month.
- Recommended classes shall respect workdays, closures, class-size, trainer, yield, and date bounds.
- Planner may accept, edit, or remove recommendations.
- Re-running recommendations shall not delete manual classes.

# Failure Behavior

- Invalid hire date or count shall identify the class row.
- Zero trainers, class size, duration, or yield shall prevent recommendations.
- Derived dates shall remain reproducible from saved settings and calendar.

# Acceptance Scenarios

## Derive Readiness

**Given** a class starts on a valid workday  
**And** training lasts 20 workdays with 5 nesting workdays  
**When** dates are derived  
**Then** weekends and closures are skipped.

## Apply Yield

**Given** 20 hires and 80 percent graduation yield  
**When** the class becomes frontline-ready  
**Then** 16 enter frontline supply  
**And** 4 are recorded as fallout.

## Preserve Manual Classes

**Given** manual classes exist  
**When** recommendations are regenerated  
**Then** manual classes remain unchanged.

# Open Questions

1. How do multiple trainers constrain concurrent classes?
2. Are part-time or mixed-capacity graduates required?
3. Should recommendations optimize cost, shortage, or earliest readiness?

# Implementation Traceability

- `src/planner/staffingModel.js`
- `src/components/planner/PlannerTrainingPipelineTable.vue`
- `src/components/planner/PlannerTrainingSettingsModal.vue`

