---
id: PLAN-006
title: Workload-Ratio Staffing Requirement
status: draft
owners: []
depends_on: [PLAN-003, PLAN-004, PLAN-005]
last_reviewed: 2026-06-14
---

# Purpose

Define the monthly requirement method that converts forecast workload into required hours and headcount through the design factor.

# Preconditions

- Planning month has valid contacts and AHT.
- Paid monthly hours are positive.
- Design factor is positive.
- Calendar and availability inputs are valid.

# Formulas

```text
monthly workload hours =
  contacts * AHT seconds / 3600

required staff hours =
  monthly workload hours * workload staffing ratio

required headcount =
  required staff hours / paid hours per month

rounded required headcount =
  ceiling(required headcount)

peak-day workload hours =
  peak-day contacts * AHT seconds / 3600

peak-day required headcount =
  peak-day workload hours
  * workload staffing ratio
  / paid hours per day
```

# Functional Requirements

- The worksheet shall display inputs, intermediate factors, required hours, decimal headcount, and rounded headcount.
- The unrounded requirement shall drive analytical comparisons unless a metric explicitly uses operational rounded headcount.
- Peak-day requirement shall be shown only when supported by source data.
- Calculation shall update deterministically when an input changes.
- Saved plans shall preserve calculated month records or sufficient inputs to reproduce them.

# Warning and Error Rules

- Positive demand with zero paid hours is blocking.
- Non-positive design factor is blocking.
- Zero contacts with positive AHT produces zero workload and a reasonableness warning.
- Missing peak-day shape shall not fabricate a peak-day requirement.

# Acceptance Scenarios

## Calculate Monthly Requirement

**Given** 36,000 contacts at 300 seconds AHT  
**And** a workload staffing ratio of 1.5  
**And** 160 paid hours per FTE  
**When** requirement is calculated  
**Then** workload is 3,000 hours  
**And** required hours are 4,500  
**And** required headcount is 28.125  
**And** rounded required headcount is 29.

## Preserve Decimal Requirement

**Given** calculated requirement is 28.125  
**When** call-center averages are calculated
**Then** the decimal value is used unless the metric explicitly states rounded headcount.

# Open Questions

1. Which downstream metrics use rounded versus decimal requirement?
2. Is a concurrency factor needed for non-voice work?
3. Should peak-day requirement gate finalization?

# Implementation Traceability

- `src/planner/demandModel.js`
- `src/components/planner/PlannerMonthlyPlanTab.vue`
