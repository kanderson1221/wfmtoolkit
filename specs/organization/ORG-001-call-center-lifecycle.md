---
id: ORG-001
title: Call-Center Lifecycle and Defaults
status: draft
owners: []
depends_on: [FOUND-002, FOUND-005]
last_reviewed: 2026-06-14
---

# Purpose

Define creation, editing, display, and deletion of the top-level planning unit.

# Actors and Preconditions

The workforce planner manages call centers from the call-center directory. No prior organization data is required to create the first call center.

# Call-Center Data

A call center shall include:

- stable identifier
- required display name
- time zone
- operating weekdays and hours
- year-specific holiday profiles
- default paid hours per day
- default occupancy and adherence
- default service-level percent and answer-time threshold
- creation and last-updated timestamps

# Functional Requirements

- The call-center directory shall provide a clear create action and first-record empty state.
- Create shall require a non-blank name.
- New records shall receive defined defaults without requiring hidden input.
- Edit shall preserve the record identifier and descendants.
- Updated defaults shall apply to new plans or inherited values as specified, not silently rewrite finalized plan snapshots.
- The call-center workspace shall expose its staffing groups and selected-year planning information.
- Delete shall identify how many staffing groups and descendants will be removed.

# Business Rules

- Names shall be trimmed before persistence.
- A blank name shall not be persisted.
- Time zone shall use a supported IANA identifier.
- Default percentages shall remain within their defined ranges.
- Deleting a call center is a cascading destructive operation.
- A failed save or delete shall leave the last persisted record intact.

# Primary Flow

1. Planner selects **New Center**.
2. System opens a labeled settings dialog with defaults.
3. Planner enters a name and optional settings.
4. System validates and persists the record.
5. System opens the new call-center workspace.

# Alternate and Failure Flows

- Invalid operating hours block save and preserve the dialog.
- Storage failure displays an actionable message and keeps the draft.
- Cancel closes the dialog without creating a record.
- Delete requires confirmation and returns to the call-center directory after success.

# Acceptance Scenarios

## Create the First Call Center

**Given** the call-center directory is empty
**When** the planner creates a call center with a valid name  
**Then** it appears in the directory
**And** opens with default settings and no staffing groups.

## Edit Without Reparenting

**Given** a call center has staffing groups  
**When** its name or defaults are edited  
**Then** the same identifier and descendants are preserved.

## Confirm Cascading Delete

**Given** a call center contains staffing groups  
**When** deletion is requested  
**Then** the confirmation identifies the cascade  
**And** cancellation leaves all data intact.

# Open Questions

1. Must call-center names be unique?
2. Should call centers support archival?
3. Which defaults belong at call-center level versus staffing-group level?

# Implementation Traceability

- `src/components/PlanningHome.vue`
- `src/components/planning/CallCenterSettingsModal.vue`
- `src/planningStorage.js`
