---
id: ACT-004
title: Updated-Plan Creation From a Budget or Prior Update
status: draft
owners: []
depends_on: [PLAN-001, ACT-002, ACT-003]
last_reviewed: 2026-07-19
---

# Purpose

Define how a planner creates a new operating plan from an established same-year baseline.

# Preconditions

- A finalized budget or prior update exists.
- Actuals exist for at least one month in the planning year.
- Planner selects a valid actuals-through month.
- A planning-ready forecast covers all required future months.

# Creation Flow

1. Planner chooses a source plan.
2. System offers actuals-through months supported by loaded actuals.
3. Planner selects cutoff month, enters or accepts an update name, and records the decision reason.
4. Planner selects a forecast for months after the cutoff.
5. System previews lineage, actualized months, and future forecast coverage.
6. System creates a new update draft with a new identifier.
7. Planner reviews recalculated requirement and staffing supply.
8. Update is saved as a finalized operating plan.

# Functional Requirements

- Source plan shall remain unchanged.
- Update shall retain budget identifier and immediate source-plan identifier.
- Default name shall identify year and update period.
- Every newly created update shall require a concise decision reason naming the business event, approved assumption, or operating decision that requires the update.
- The system shall trim the decision reason, reject blank values, and limit new reasons to 240 characters.
- Legacy updates without a stored reason shall remain usable and shall be labeled as missing historical rationale; the system shall not invent a reason.
- Opening the update dialog shall place keyboard focus on the actuals-through selector; dialog close shall restore the retained trigger.
- All source assumptions shall be copied unless explicitly changed.
- Actualized and future months shall be visibly distinguishable.
- Update creation shall not overwrite another same-year update.

# Business Rules

- The source plan must belong to the same staffing group and planning year.
- Actuals-through month shall fall within that year.
- Update shall include a timestamp identifying when actualization occurred.
- Update shall become current according to `ACT-006`.

# Acceptance Scenarios

## Create From Budget

**Given** a finalized 2027 budget and actuals through March  
**When** an update is created  
**Then** it references the budget  
**And** actualizes January through March
**And** preserves future months for forecast application
**And** retains the planner's decision reason in saved plan lineage.

## Require Decision Reason

**Given** a planner has selected a valid source and actuals cutoff
**When** the decision reason is blank
**Then** the update cannot be created.

## Preserve Legacy Update

**Given** a saved update predates decision-reason capture
**When** the plan library or comparison is opened
**Then** the update remains available
**And** its reason is labeled `Not recorded (legacy plan)`.

## Create From Prior Update

**Given** an April update exists  
**When** a June update is created from it  
**Then** the new update references the April update  
**And** retains the original budget identifier.

## Prevent Overwrite

**Given** a June update already exists  
**When** another update is created  
**Then** it receives a new identifier.

# Open Questions

1. May an update use a budget rather than the current plan as source?
2. Should update names be unique?
3. Are scenario updates that do not become current required?

# Implementation Traceability

- `src/planner/planUpdates.js`
- `src/components/planning/PlanningPlanUpdateModal.vue`
- `src/components/planning/PlanningCenterView.vue`
- `src/components/planning/PlanningPlanComparisonDialog.vue`
- `src/storage/localDataStore.js`
