---
id: FIMP-008
title: Forecast-to-Plan Handoff and Immutable Demand Snapshots
status: draft
owners: []
depends_on: [FIMP-005, FIMP-006, FIMP-007, PLAN-001]
last_reviewed: 2026-06-14
---

# Purpose

Define the boundary where an imported forecast becomes the preserved demand basis of a plan.

# Handoff Preconditions

- The forecast belongs to the plan's staffing group.
- Required coverage is complete for the plan type.
- Required AHT is available.
- Forecast granularity supports the selected requirement method.
- No blocking import issue remains.

# Snapshot Content

The plan shall persist:

- forecast version identifier
- forecast display name and source metadata
- import timestamp
- applied planning year and required months
- one monthly contacts and AHT record per applied month
- daily or interval demand required by the selected method
- normalized peak-day measures when available
- snapshot creation timestamp
- calendar context required to interpret applied demand

# Functional Requirements

- Applying a forecast shall be an explicit planner action.
- The system shall preview coverage and summary totals before application.
- Only months required by the plan shall be copied.
- Applying to a new plan shall seed its demand records.
- Existing saved plans shall not refresh automatically.
- Reapplying a different version to an editable draft shall require confirmation when values will change.
- A finalized plan's snapshot shall be immutable.

# Update-Plan Rules

- Months through the actuals-through month shall use actualized demand as defined by `ACT-005`.
- Only remaining months shall be copied from the selected imported forecast.
- Forecast coverage evaluation shall use only those remaining months.

# Failure and Recovery

- Snapshot creation and plan persistence shall succeed atomically.
- Failure shall leave the plan's prior demand basis intact.
- Missing source records after handoff shall not prevent plan display.

# Acceptance Scenarios

## Apply to a Budget

**Given** a planning-ready 2027 forecast  
**When** it is applied to a new 2027 budget  
**Then** twelve monthly demand records are copied  
**And** the plan identifies the exact source version.

## Preserve a Finalized Plan

**Given** a finalized plan uses version A  
**When** version B is imported  
**Then** the plan continues to use its version A snapshot.

## Apply Remaining Update Months

**Given** an update actualized through April  
**When** a forecast covering May through December is applied  
**Then** only May through December are copied from the forecast.

# Open Questions

1. May an editable draft refresh from the same source version automatically?
2. Which source metadata must remain after source deletion?
3. Should source row checksums be stored for audit?

# Implementation Traceability

- `src/planner/demandSources.js`
- `src/composables/monthlyPlanBuilder/usePlannerForecastDemandSource.js`
- `src/composables/useMonthlyPlanBuilder.js`

