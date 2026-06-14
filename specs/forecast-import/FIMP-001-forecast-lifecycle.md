---
id: FIMP-001
title: Imported Forecast Identity, Ownership, Version, and Lifecycle
status: draft
owners: []
depends_on: [FOUND-002, ORG-003]
last_reviewed: 2026-06-14
---

# Purpose

Define an imported forecast as a versioned, externally produced planning input owned by one staffing group.

# Scope

This specification covers identity, provenance, states, ownership, naming, and lifecycle. File fields and validation are defined separately.

# Forecast Record

Each imported forecast version shall contain:

- stable unique identifier
- owning call-center and staffing-group identifiers
- display name
- planning period or coverage window
- declared granularity
- original file name
- source label or description when provided
- import timestamp
- normalized row count
- validation and readiness status
- normalized data and source metadata
- created and last-updated timestamps

# Lifecycle States

| State | Meaning |
|---|---|
| `importing` | File is being read or validated and is not selectable. |
| `invalid` | Blocking issues prevent acceptance. Invalid transient imports need not be persisted. |
| `accepted` | Source data was accepted and stored. |
| `planning-ready` | Accepted data satisfies the selected planning workflow's coverage and value requirements. |
| `referenced` | One or more saved plans identify this version as their source. |
| `deleted` | Source record is removed; existing plan snapshots remain. |

# Functional Requirements

- Import shall create a new version unless the planner explicitly chooses replacement.
- Two imports with the same file name shall still receive distinct identifiers.
- Accepted source values shall be read-only.
- Editable metadata may include display name and source description without changing source values.
- The forecast library shall show ownership, granularity, coverage, import time, and readiness.
- A forecast shall be selectable only within its owning staffing group.
- No state shall imply that the Planning Workspace generated the forecast.

# Business Rules

- A forecast version shall never belong to multiple staffing groups.
- Accepted source values shall not be mutated by plan-specific adjustments.
- Revalidation after a calendar or requirement change may change readiness but not source rows.
- Plan references shall identify the exact source version.
- Deletion shall follow `FIMP-007`.

# Acceptance Scenarios

## Import Two Versions

**Given** a staffing group already has an accepted forecast  
**When** another file is imported without choosing replacement  
**Then** a second version is created  
**And** the first version remains available.

## Rename Metadata

**Given** an accepted forecast  
**When** its display name is edited  
**Then** its identifier, source rows, coverage, and import timestamp remain unchanged.

## Prevent Cross-Group Selection

**Given** a forecast belongs to Group A  
**When** a plan is created for Group B  
**Then** the Group A forecast is not selectable.

# Open Questions

1. Should accepted forecasts support archive status?
2. Which metadata fields may be edited?
3. Should exact duplicate imports be warned or blocked?

# Implementation Traceability

- `src/forecasting/forecastProjectSchema.js`
- `src/forecastingRepository.js`
- `src/components/planning/PlanningGroupForecastsView.vue`

