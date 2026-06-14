---
id: PLAN-003
title: Agent Availability, Paid-Time, and Presence-Loss Assumptions
status: draft
owners: []
depends_on: [PLAN-001, ORG-002, FOUND-003]
last_reviewed: 2026-06-14
---

# Purpose

Define monthly paid capacity and the losses that determine how much scheduled time one frontline FTE can provide.

# Monthly Inputs

- paid hours per open day
- planned time-off hours per agent
- unplanned time-off hours per agent
- leave hours per agent
- meeting hours per agent
- training hours per agent
- coaching hours per agent
- paid-break hours per open day
- other away hours per open day

# Derived Values

```text
paid hours per month = open days * paid hours per day

absence loss hours =
  planned time off + unplanned time off + leave

presence share =
  1 - (absence loss hours / paid hours per month)

present hours =
  paid hours per month * presence share

scheduled loss hours =
  meetings + training + coaching

daily other loss hours =
  (paid breaks per day + other away per day)
  * open days
  * presence share

utilization share =
  1 - ((scheduled loss hours + daily other loss hours) / present hours)

scheduled share = presence share * utilization share

scheduled hours = paid hours per month * scheduled share
```

# Functional Requirements

- Inputs shall be editable by month in a dense worksheet.
- Defaults may be copied across months.
- Open days shall derive from the saved plan calendar.
- Derived hours and percentages shall update when inputs change.
- Negative hours are invalid.
- Paid hours per day shall not exceed 24.
- Loss values that consume all capacity shall create a blocking warning.

# Business Rules

- Presence loss is applied before utilization loss.
- Daily breaks and away time are reduced by the presence share.
- Missing or zero paid capacity with positive demand blocks valid headcount output.
- Intermediate calculations use unrounded values.
- Finalized plans preserve all monthly inputs and derived results.

# Acceptance Scenarios

## Calculate Scheduled Capacity

**Given** 20 open days at 8 paid hours  
**And** 16 absence hours  
**And** 8 meeting hours  
**When** no other loss applies  
**Then** paid hours are 160  
**And** presence is 90 percent  
**And** scheduled capacity reflects meeting loss against present hours.

## Block Excess Loss

**Given** monthly losses equal or exceed paid hours  
**When** the month is evaluated  
**Then** a blocking warning identifies the affected month.

## Preserve Calendar Basis

**Given** a finalized plan has 21 January open days  
**When** organization holidays later change  
**Then** the plan continues to use 21 days.

# Open Questions

1. Should all inputs be per-agent hours?
2. Are productive auxiliary activities required as a separate category?
3. What minimum positive clamp, if any, is allowed for presence and utilization?

# Implementation Traceability

- `src/planner/demandModel.js`
- `src/components/planner/PlannerPresenceTab.vue`
- `src/planner/shared.js`

