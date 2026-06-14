---
id: ORG-003
title: Staffing-Group Lifecycle, Service Goals, and Inherited Defaults
status: draft
owners: []
depends_on: [ORG-001, ORG-002, FOUND-002]
last_reviewed: 2026-06-14
---

# Purpose

Define the planning population beneath a call center and the settings inherited by forecasts, requirements, and plans.

# Staffing-Group Data

A staffing group shall include:

- stable identifier and required name
- owning call-center identifier
- service-level target percent
- service-level answer-time threshold in seconds
- holiday-calendar selection or inheritance
- applicable operating defaults
- intraday demand profile
- actuals history
- timestamps

# Functional Requirements

- A planner shall create a staffing group from a call-center workspace.
- The new group shall inherit defined defaults from its call center.
- The planner may override supported group-level values.
- The settings dialog shall expose service-level values with units.
- The group workspace shall organize data, imported forecasts, intraday inputs, and plans.
- Editing settings shall preserve forecasts, actuals, plans, and the group identifier.
- Delete shall identify affected descendant records and require confirmation.

# Inheritance Rules

- Inherited values shall remain identifiable as inherited.
- A group override shall take precedence over the corresponding call-center default.
- Removing an override shall restore inheritance.
- Changes to call-center defaults may affect future inherited calculations but shall not silently rewrite finalized plan snapshots.
- Holiday behavior shall follow the group's selected inheritance mode.

# Validation Rules

- Name is required after trimming.
- Service-level target shall be greater than zero and no greater than 100 percent.
- Answer-time threshold shall be a positive number of seconds.
- Inherited settings shall resolve to valid effective values before a dependent calculation runs.

# Acceptance Scenarios

## Create With Defaults

**Given** a call center has service and calendar defaults  
**When** a staffing group is created  
**Then** the group begins with effective inherited values  
**And** no finalized plan is created automatically.

## Override a Service Goal

**Given** the center default is 80 percent in 20 seconds  
**When** the group is changed to 90 percent in 30 seconds  
**Then** new group calculations use 90 percent in 30 seconds.

## Delete a Group

**Given** a group has forecasts, actuals, and plans  
**When** deletion is confirmed  
**Then** the group and its descendants are removed atomically.

# Open Questions

1. Which settings should support per-year overrides?
2. Must staffing-group names be unique within a call center?
3. Should inactive groups be archived instead of deleted?

# Implementation Traceability

- `src/components/planning/PlanningGroupSettingsModal.vue`
- `src/components/planning/PlanningCenterView.vue`
- `src/planningStorage.js`

