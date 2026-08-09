---
id: PLAN-014
title: Minimum Headcount Per Open Interval
status: implemented
owners: []
depends_on: [ORG-002, ORG-004, PLAN-007, PLAN-012, PLAN-013]
last_reviewed: 2026-08-09
---

# Feature Summary

Intraday Erlang plans shall support one staffing-group setting named **Minimum
Headcount per Open Interval**. The setting establishes an operational coverage
floor for every interval generated on an open operating date. It prevents low
or zero forecast demand from producing an impractically small staffed position.

The initial release uses one whole-number minimum across the full operating
window. It does not support different floors by interval, weekday, season, or
skill.

# Goal

Ensure every open interval carries at least the staffing group's configured
minimum while preserving the independently calculated Erlang requirement for
review and audit.

# Functional Requirements

- The setting shall appear on the staffing-group Intraday tab.
- The value shall be a whole number greater than or equal to zero.
- The default value shall be zero, meaning no staffing floor.
- The setting shall apply to every generated interval on an open operating
  date, including an interval with zero forecast contacts.
- The setting shall not create intervals on closed dates or outside configured
  operating hours.
- A new plan shall snapshot the staffing-group value.
- A saved plan shall continue using its snapshot when the staffing-group
  default later changes.
- Planned and actual Intraday Erlang calculations shall use the same saved
  plan value.

# Calculation

For each open interval:

`final required staff = max(Erlang required staff, minimum headcount)`

When the minimum raises the result, service level, occupancy, average speed of
answer, immediate-answer percentage, and abandonment shall be recalculated at
the final required staff. The final value shall drive interval labor hours,
daily labor hours, peak staffing, monthly staffed hours, required headcount,
staffing gaps, reports, comparisons, and exports.

Interval results shall retain:

- `erlangRequiredStaffNet`: requirement before the floor
- `minimumHeadcount`: saved floor
- `requiredStaffNet`: final requirement after the floor
- `minimumApplied`: whether the floor increased the interval requirement

# Recalculation And Reporting

- The minimum shall be part of the Intraday Erlang input signature.
- Changing a plan's saved minimum shall mark planned and actual results stale.
- Missing or stale results shall remain unavailable under the canonical saved
  plan resolver; reporting shall not substitute workload-ratio results.
- Monthly and interval exports shall identify the saved minimum and where it
  was applied.

# Data And Migration

- Staffing-group intraday profiles shall persist the value.
- Plan intraday snapshots shall persist the value.
- Existing groups and plans without the field shall normalize to zero.
- Results created before this feature shall require recalculation because they
  do not contain the floor-aware result contract.

# Implementation Plan

1. Extend intraday profile normalization and persistence with one non-negative
   whole-number `minimumHeadcount` field.
2. Add the labeled setting to the staffing-group Intraday tab and show its
   inherited, read-only value in the plan's Erlang Inputs review.
3. Snapshot the value into new plans and include it in every planned and actual
   interval payload and input signature.
4. Apply the floor in the backend planning adapter after the canonical Erlang C
   search, recalculate metrics at final staffing, and aggregate adjusted results.
5. Preserve raw and adjusted interval values and expose floor counts in monthly
   output and CSV exports.
6. Verify canonical reporting, comparisons, and actual variance continue to
   consume the floor-adjusted saved monthly results.
7. Cover normalization, UI save behavior, staleness, zero-volume intervals,
   non-reducing floors, rollups, persistence, and export output with tests.

# Acceptance Scenarios

## Apply The Floor

**Given** an open interval has an Erlang requirement of one  
**And** the saved minimum headcount is three  
**When** staffing is calculated  
**Then** the final required staff is three  
**And** the raw Erlang requirement remains one  
**And** the result identifies that the minimum was applied.

## Preserve A Higher Erlang Requirement

**Given** an open interval has an Erlang requirement of six  
**And** the saved minimum headcount is three  
**When** staffing is calculated  
**Then** the final required staff remains six  
**And** the result identifies that the minimum was not applied.

## Cover An Open Zero-Volume Interval

**Given** an interval belongs to an open operating date  
**And** it has zero forecast contacts  
**And** the saved minimum headcount is two  
**When** staffing is calculated  
**Then** the final required staff is two  
**And** interval labor hours and downstream rollups include those two staff.

## Exclude Closed Time

**Given** a date is closed or a clock interval is outside operating hours  
**When** the plan payload is built  
**Then** no interval row is generated  
**And** the minimum creates no staffing requirement for that time.

## Mark Saved Results Stale

**Given** a plan has complete saved Intraday Erlang results  
**When** its saved minimum headcount changes  
**Then** planned and actual result signatures no longer match  
**And** reports withhold requirement and gap values until recalculation.

# Out Of Scope

- different minimums by interval, weekday, date, season, queue, or skill
- employee scheduling or shift construction
- overriding the minimum within an individual interval result

# Implementation Traceability

- `src/planner/groupIntraday.js`
- `src/components/planning/PlanningGroupIntradayView.vue`
- `src/composables/useMonthlyPlanBuilder.js`
- `src/planner/intradayErlang.js`
- `src/composables/monthlyPlanBuilder/usePlannerIntradayErlang.js`
- `src/composables/monthlyPlanBuilder/usePlannerActualsIntradayErlang.js`
- `backend/app/main.py`
- `backend/app/planner.py`
- `src/components/planner/PlannerMonthlyPlanTab.vue`

