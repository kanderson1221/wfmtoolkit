---
id: FIMP-007
title: Forecast Replacement, Selection, Deletion, and Dependency Warnings
status: draft
owners: []
depends_on: [FIMP-001, FIMP-005, FOUND-002]
last_reviewed: 2026-06-14
---

# Purpose

Define how planners manage multiple imported forecast versions without losing plan traceability.

# Version Selection

- Forecast lists shall identify version name, coverage, granularity, import time, readiness, and plan usage.
- A planner shall explicitly select the forecast used to create or update a plan.
- A new import shall not automatically replace the source of an existing plan.
- The most recently imported forecast may be highlighted but shall not be silently applied.

# Replacement

- Replacement shall require selection of the exact version being replaced.
- The system shall validate the new file before removing or superseding the old version.
- Replacement shall be atomic.
- Existing plan snapshots shall remain unchanged.
- Replacement may preserve the display name while creating a new source-version identifier.

# Deletion

- Unreferenced versions may be deleted after confirmation.
- Referenced versions shall show dependent plans before deletion.
- Deleting a referenced version shall not delete plans.
- Plans shall retain source metadata and snapshots after source deletion.
- A deleted source reference shall be displayed as unavailable, not redirected to another version.

# Dependency Warnings

Warnings shall identify:

- number and names of dependent plans
- whether each plan is draft or finalized
- whether the operation affects future selection only or removes source access
- that saved plan values remain unchanged

# Failure Behavior

- Failed replacement shall retain the original accepted version.
- Failed deletion shall leave the version selectable.
- Partial source-row deletion is not permitted.

# Acceptance Scenarios

## Select a Version

**Given** two planning-ready forecasts cover 2027  
**When** a budget is created  
**Then** the planner selects one exact version  
**And** the other remains unchanged.

## Replace Atomically

**Given** an accepted version exists  
**When** its replacement file fails validation  
**Then** the original remains accepted and selectable.

## Delete a Referenced Version

**Given** a finalized plan references a forecast  
**When** source deletion is confirmed  
**Then** the plan remains readable from its snapshot  
**And** its source status becomes unavailable.

# Open Questions

1. Should replacement keep one logical version lineage?
2. May referenced sources be archived instead of deleted?
3. Should drafts offer an explicit refresh action after a new version arrives?

# Implementation Traceability

- `src/composables/planning/usePlanningGroupForecastActions.js`
- `src/components/planning/PlanningCenterView.vue`
- `src/forecastingRepository.js`

