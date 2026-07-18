---
id: FIMP-007
title: Forecast Replacement, Selection, Deletion, and Dependency Warnings
status: draft
owners: []
depends_on: [FIMP-001, FIMP-005, FOUND-002]
last_reviewed: 2026-07-18
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
- Replacement shall retain the selected forecast version identifier and lineage while replacing its accepted source rows, source metadata, and derived rollups in one local-database transaction.
- Existing plan snapshots shall remain unchanged.
- Replacement shall preserve the selected version's display name and ownership.
- The review shall compare current and candidate file identity, normalized row count, coverage, and total contacts.
- Every saved dependent plan shall be named with its draft or finalized state before replacement.
- Draft and finalized plan snapshots shall not refresh automatically; an editable plan may adopt the changed source only through its explicit forecast-application workflow.

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
- Failed persistence shall keep the validated candidate available for retry without replacing the current editor state.
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
**Then** the original remains accepted and selectable

**And** no persistence operation occurs.

## Review and Replace a Referenced Version

**Given** an imported forecast is used by an editable Budget and a finalized Update

**When** a valid replacement is reviewed

**Then** both dependent plan names and states are shown

**And** one atomic save replaces exactly that forecast version

**And** both plans retain their prior demand values and snapshots.

## Retry a Failed Replacement Save

**Given** a valid replacement candidate has been reviewed

**When** local persistence fails

**Then** the accepted forecast remains current and stored

**And** the parsed candidate remains in the dialog for retry.

## Delete a Referenced Version

**Given** a finalized plan references a forecast  
**When** source deletion is confirmed  
**Then** the plan remains readable from its snapshot  
**And** its source status becomes unavailable.

# Open Questions

1. May referenced sources be archived instead of deleted?
2. Should replacement history retain prior source checksums for audit?

# Implementation Traceability

- `src/composables/planning/usePlanningGroupForecastActions.js`
- `src/components/forecasting/ForecastImportDailyModal.vue`
- `src/composables/forecasting/useForecastProjectLibrary.js`
- `src/planner/forecastDependencies.js`
- `src/components/planning/PlanningCenterView.vue`
- `src/forecastingRepository.js`
