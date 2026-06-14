---
id: ACT-005
title: Actualization Through a Selected Month
status: draft
owners: []
depends_on: [ACT-004, FIMP-008]
last_reviewed: 2026-06-14
---

# Purpose

Define how actual demand replaces planned demand through a cutoff while future periods remain forecast-based.

# Actualization Rules

For every month at or before the cutoff:

- monthly contacts come from accepted actuals
- monthly AHT comes from accepted actuals
- daily demand snapshot uses accepted actual daily rows
- forecast bounds, where present, collapse to actual contacts for the actualized month
- requirement is recalculated using the update's saved assumptions

For every month after the cutoff:

- demand comes from the selected imported forecast snapshot
- no actual rows are substituted
- future staffing assumptions may be revised in the update

# Coverage Rules

- The cutoff month shall have accepted actual data.
- Earlier actualized months with missing required actual values shall block update creation.
- Future forecast coverage begins with the month immediately after cutoff.
- A December cutoff requires no future forecast months.

# Source Preservation

- The update shall identify actualized months and source file metadata.
- The original source plan remains unchanged.
- Later actuals imports shall not silently change the saved update.
- A new update is required to incorporate later actuals.

# Acceptance Scenarios

## Actualize Through April

**Given** actuals exist January through April  
**When** April is selected as cutoff  
**Then** January through April use actual contacts and AHT  
**And** May through December use imported forecast values.

## Require Continuous Actuals

**Given** January and March actuals exist but February is missing  
**When** March is selected as cutoff  
**Then** update creation is blocked by missing February actuals.

## Handle December

**Given** actuals are complete through December  
**When** December is selected  
**Then** no future forecast coverage is required.

# Open Questions

1. What completeness threshold makes a month eligible for cutoff?
2. Can a planner intentionally actualize a partial month?
3. Should actualized staffing supply also be replaced by observed headcount?

# Implementation Traceability

- `src/planner/planUpdates.js`
- `src/planner/demandSources.js`
- `src/composables/useMonthlyPlanBuilder.js`

