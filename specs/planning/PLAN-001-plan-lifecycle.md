---
id: PLAN-001
title: Plan Identity, Planning Year, Type, Status, and Lifecycle
status: draft
owners: []
depends_on: [FOUND-002, FOUND-003, ORG-003]
last_reviewed: 2026-06-14
---

# Purpose

Define annual plan identity, classifications, states, lineage, and allowed transitions.

# Plan Data

Every plan shall contain:

- stable identifier and required display name
- owning call-center and staffing-group identifiers
- planning year
- plan type
- status
- requirement method
- demand-source snapshot
- calendar and organization-setting snapshots
- monthly planning records
- staffing and training inputs
- summary outputs
- creation, update, save, and finalization timestamps as applicable
- current-plan flag or equivalent selection state

# Plan Types

| Type | Meaning |
|---|---|
| `budget` | Annual baseline plan for a staffing group and year. |
| `update` | Later operating plan derived from a budget or prior update. |

# Plan Status

| Status | Meaning |
|---|---|
| `draft` | Editable budget not yet established as a finalized baseline. |
| `finalized` | Saved plan whose historical basis is protected from silent mutation. |

Update plans shall be finalized when saved because they represent a dated operating view. Revisions to an update shall create another update unless a later specification allows controlled editing.

# Business Rules

- A staffing group shall have at most one budget plan per planning year.
- Saving the same plan identifier updates that plan.
- Creating another same-year plan shall not overwrite an existing plan.
- A budget may have multiple update descendants.
- A finalized budget shall not be silently converted back to draft.
- Exactly zero or one plan may be current per staffing group and year.
- The newest update may become current automatically according to `ACT-006`.
- Deleting a budget with update descendants is prohibited unless a supported cascade is explicitly confirmed.

# Lifecycle Transitions

```text
new budget -> draft budget -> finalized budget
finalized budget or update -> new finalized update
current plan -> replaced as current by explicit selection or newer update
```

# Acceptance Scenarios

## Preserve Same-Year Plans

**Given** a 2027 budget exists  
**When** a new 2027 update is saved  
**Then** the budget remains  
**And** the update receives a distinct identifier.

## Update the Same Record

**Given** a draft budget exists  
**When** it is saved again with the same identifier  
**Then** that record is updated rather than duplicated.

## Protect Update Lineage

**Given** an update derives from a budget  
**When** the budget deletion is requested  
**Then** deletion is blocked while the update exists.

# Open Questions

1. May finalized budgets ever be reopened?
2. May update plans be edited after save?
3. Is one budget per year sufficient for scenario planning?

# Implementation Traceability

- `src/planningStorage.js`
- `src/composables/useMonthlyPlanBuilder.js`
- `src/planner/planUpdates.js`

