---
id: ACT-003
title: Planned-Versus-Actual Demand and Requirement Variance
status: draft
owners: []
depends_on: [ACT-002, PLAN-006, PLAN-007, PLAN-008]
last_reviewed: 2026-06-14
---

# Purpose

Define comparable monthly planned and actual demand, workload, requirement, and staffing-gap measures.

# Monthly Measures

- planned and actual contacts
- contact variance
- planned and actual AHT
- AHT variance seconds
- planned and actual workload hours
- planned and actual required headcount
- required-headcount variance
- selected planned staffing headcount
- staffing gap to actual requirement
- loaded actual days

# Formulas

```text
contact variance = actual contacts - planned contacts

AHT variance = actual AHT - planned AHT

actual workload hours =
  actual contacts * actual AHT seconds / 3600

actual required headcount =
  actual required staff hours / planned paid hours per month

requirement variance =
  actual required headcount - planned required headcount

staffing gap to actual requirement =
  selected planned staffing headcount - actual required headcount
```

# Requirement Method Rules

- Workload-ratio plans shall use the saved plan's staffing ratio with actual workload.
- Intraday Erlang plans require an explicit actual-data Erlang run.
- Until that run completes, actual intraday requirement shall remain unavailable.
- Actual calculation shall use the saved plan's calendar, service goal, profile, and overhead basis.

# Presentation Rules

- Positive and negative signs shall remain visible.
- Missing actual values shall not display as zero.
- Selected staffing comparison metric shall be named.
- Summary averages shall include only months with applicable actual values.
- Peak actual requirement shall consider only calculated months.

# Acceptance Scenarios

## Calculate Workload Variance

**Given** planned contacts are 10,000 and actual contacts are 11,000  
**When** variance is displayed  
**Then** contact variance is +1,000.

## Delay Intraday Requirement

**Given** actual daily rows exist for an intraday plan  
**When** no actual Erlang run has completed  
**Then** actual requirement is unavailable  
**And** the user is offered an explicit calculation action.

## Preserve Missing Month

**Given** no July actuals exist  
**When** the comparison is shown  
**Then** July actual values and variances are unavailable, not zero.

# Open Questions

1. Which staffing headcount is the default comparison metric?
2. Are variance percentages required for every measure?
3. Should actual requirement use actual availability when available?

# Implementation Traceability

- `src/planner/actualsModel.js`
- `src/components/planner/PlannerActualsPanel.vue`
- `src/components/planner/PlannerActualsComparisonChart.vue`

