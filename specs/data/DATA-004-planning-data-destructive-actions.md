---
id: DATA-004
title: Planning-Data Clearing and Destructive-Action Confirmation
status: draft
owners: []
depends_on: [DATA-001, DATA-003, FOUND-005]
last_reviewed: 2026-07-19
---

# Purpose

Define clear-data behavior and a common safety contract for destructive
planning-data operations.

# Covered Actions

- clear all planning data in the selected workspace
- replacement backup restore
- delete call center
- delete staffing group
- delete plan
- delete imported forecast
- delete actuals month, year, or full history
- replace holiday schedule

# Confirmation Requirements

Every destructive confirmation shall:

- name the action
- identify affected record or scope
- explain cascade or replacement impact
- identify whether saved plans remain protected
- use a specific confirmation label
- offer cancellation as the safe default
- place initial keyboard focus on cancellation

# Clear-All Requirements

- Clear-all shall remove all supported planning records, imports, and drafts in
  the selected workspace.
- It shall not run from a single accidental click.
- The user should be encouraged to download a backup first.
- Clearing shall be transactional.
- Success shall return the application to a defined empty state.
- Failure shall report that clearing did not complete.

# Safety Rules

- Confirmation shall occur after dependency analysis.
- Invalid or stale UI counts shall not weaken actual dependency checks.
- Cancellation shall perform no write.
- Destructive operations shall not silently fall back to partial deletion.
- Operations shall be keyboard accessible.
- Closing through cancellation or confirmation shall restore focus to the initiating control when it remains available.

# Acceptance Scenarios

## Cancel Clear All

**Given** planning data exists  
**When** clear-all is opened and canceled  
**Then** no records are changed.

## Complete Clear All

**Given** the planner confirms clear-all  
**When** the transaction succeeds  
**Then** planning records, imported forecasts, and drafts are removed  
**And** the call-center directory shows its empty state.

## Preserve Data on Failure

**Given** a destructive transaction fails  
**When** the error is handled  
**Then** the prior committed data remains available.

# Open Questions

1. Is typed confirmation required for clear-all?
2. Should a temporary undo backup be created automatically?
3. Which destructive actions may support cascade?

# Implementation Traceability

- `specs/database/postgresql-schema.sql`
- application confirmation workflows
