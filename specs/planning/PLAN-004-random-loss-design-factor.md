---
id: PLAN-004
title: Occupancy, Adherence, Random Loss, and Design Factor
status: draft
owners: []
depends_on: [PLAN-003, FOUND-003]
last_reviewed: 2026-06-14
---

# Purpose

Define the overhead assumptions that convert scheduled capacity into usable workload capacity.

# Inputs

- occupancy percent
- adherence percent
- shared annual defaults or monthly overrides

# Workload-Ratio Formulas

```text
adherence loss percent =
  (1 - adherence share) * scheduled percent

scheduled after adherence percent =
  scheduled percent - adherence loss percent

occupancy loss percent =
  (1 - occupancy share) * scheduled after adherence percent

total random loss percent =
  adherence loss percent + occupancy loss percent

design factor percent =
  scheduled percent - total random loss percent

workload staffing ratio =
  1 / design factor share
```

# Intraday Erlang Treatment

For intraday Erlang:

- occupancy is an Erlang interval constraint, not a second post-calculation loss.
- adherence loss may be applied as the post-Erlang overhead.
- occupancy loss in the post-Erlang design factor shall be zero to avoid double counting.

# Functional Requirements

- Planner may use one annual default or enable monthly overrides.
- All percentages shall be greater than zero and no greater than 100 unless a detailed rule states otherwise.
- The worksheet shall show scheduled percent, component losses, design factor, and staffing ratio.
- Switching modes shall not silently discard entered overrides without confirmation.
- Assumptions shall be marked reviewed before finalization.

# Warning Rules

- Design factor less than or equal to zero is blocking.
- Random loss consuming all scheduled capacity is blocking.
- Extremely low design factors should produce a non-blocking reasonableness warning.
- Invalid monthly overrides shall identify the month.

# Acceptance Scenarios

## Calculate Random Loss

**Given** scheduled capacity is 80 percent  
**And** adherence is 95 percent  
**And** occupancy is 90 percent  
**When** workload-ratio overhead is calculated  
**Then** adherence loss is 4 percentage points  
**And** occupancy loss is 7.6 percentage points  
**And** design factor is 68.4 percent.

## Avoid Double Counting Occupancy

**Given** intraday Erlang already enforces max occupancy  
**When** monthly required hours are finalized  
**Then** occupancy is not applied again as post-Erlang random loss.

# Open Questions

1. What reasonableness thresholds warrant warnings?
2. Should adherence be handled inside interval calculations later?
3. Should monthly overrides be copied from a selected range?

# Implementation Traceability

- `src/planner/demandModel.js`
- `src/planner/intradayErlang.js`
- `src/components/planner/PlannerRandomTab.vue`

