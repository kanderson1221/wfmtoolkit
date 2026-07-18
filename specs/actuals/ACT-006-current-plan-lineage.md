---
id: ACT-006
title: Current-Plan Selection and Update-Plan Lineage
status: draft
owners: []
depends_on: [ACT-004, PLAN-001]
last_reviewed: 2026-06-14
---

# Purpose

Define the plan selected as the operational view and preserve traceable update ancestry.

# Current-Plan Rules

- Each staffing group and year may have at most one current plan.
- A newly saved update shall become current by default.
- Saving another update shall remove current status from the prior current plan.
- The planner may explicitly select another same-year finalized plan as current.
- If the current update is deleted, current status falls back to the next newest update or budget.
- A draft budget shall not replace a finalized current plan.

# Lineage Requirements

Every update shall retain:

- immediate source plan identifier
- budget baseline identifier
- actuals-through month
- actualization timestamp
- created and updated timestamps

The system shall be able to show update order and ancestry even when an intermediate plan is not current.

# Reporting Integration

- Current-plan call-center reports shall use the current plan.
- Budget comparisons shall use the budget baseline.
- Reports shall name the plan role used.
- Missing current selection shall fall back deterministically and report the fallback.

# Deletion Rules

- Deleting an update shall not delete descendants automatically.
- If deletion would break lineage, the system shall block it or preserve sufficient lineage metadata.
- Deleting the budget while updates exist is prohibited.

# Acceptance Scenarios

## Newest Update Becomes Current

**Given** an April update is current  
**When** a June update is saved  
**Then** June becomes current  
**And** April remains in history.

## Select an Older Update

**Given** multiple updates exist  
**When** the planner selects an older finalized update as current  
**Then** exactly that update is used in current-plan reports.

## Fall Back After Delete

**Given** the current update is deleted  
**When** another update exists  
**Then** the next newest update becomes current.

# Open Questions

1. Should manual current selection be protected from automatic newer updates?
2. Is a full lineage graph required in the UI?
3. May a non-current update be the source of a later update?

# Implementation Traceability

- `src/planningStorage.js`
- `src/planner/annualPlanningRollup.js`
- `src/components/planning/PlanningCenterView.vue`
