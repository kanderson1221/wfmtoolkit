---
id: FOUND-002
title: Domain Hierarchy and Record Relationships
status: draft
owners: []
depends_on: [FOUND-001]
last_reviewed: 2026-06-14
---

# Purpose

Define the canonical planning entities, ownership hierarchy, cardinalities, and deletion relationships.

# Scope

This specification covers record identity and relationships. It does not define calculations, file formats, or screen layout.

# Domain Hierarchy

```text
Planning Portfolio
  Call Center
    Staffing Group
      Imported Forecast Version
      Actuals Dataset
      Annual Plan
        Monthly Demand Records
        Monthly Availability Records
        Monthly Requirement Records
        Monthly Staffing Records
        Training Classes
```

# Entity Requirements

## Call Center

- Shall have a stable unique identifier and display name.
- Shall own zero or more staffing groups.
- Shall own operating-calendar defaults and year-specific holiday profiles.
- Shall preserve creation and last-updated timestamps.

## Staffing Group

- Shall belong to exactly one call center.
- Shall have a stable unique identifier and display name.
- Shall own service goals, intraday distribution, actuals, imported forecasts, and plans.
- Shall inherit applicable call-center defaults unless explicitly overridden.

## Imported Forecast Version

- Shall belong to exactly one staffing group.
- Shall have its own identifier, source metadata, import timestamp, granularity, and coverage.
- Shall not be shared by reference across staffing groups.

## Actuals Dataset

- Shall belong to exactly one staffing group.
- Shall represent one logical daily history keyed by service date.
- May contain rows spanning multiple calendar years.

## Annual Plan

- Shall belong to exactly one staffing group and one planning year.
- Shall identify plan type, status, lineage, demand basis, and requirement method.
- Shall contain twelve calendar-month positions unless a future fiscal-period specification supersedes this rule.

# Relationship Rules

- A call center may exist without staffing groups.
- A staffing group may exist without forecasts, actuals, or plans.
- A plan shall not exist without its owning call center and staffing group.
- A plan may reference one imported forecast version as its source, while retaining an independent snapshot of applied demand.
- Multiple forecast versions and multiple plan updates may exist for the same staffing group and year.
- At most one budget baseline may exist for a staffing group and planning year.
- Exactly zero or one plan shall be designated current for a staffing group and year.

# Identity Rules

- User-editable names shall not serve as record identifiers.
- Moving a staffing group between call centers is not supported unless explicitly specified later.
- Importing a file shall create or replace a forecast version only through an explicit workflow.
- Updating a record shall preserve its identifier.
- Duplicating a record shall create a new identifier and lineage reference where applicable.

# Deletion Rules

- Deleting a call center shall delete its staffing groups and all descendants after confirmation.
- Deleting a staffing group shall delete its forecasts, actuals, plans, and drafts after confirmation.
- A budget plan with dependent updates shall not be deleted until dependencies are removed or an approved cascade operation is confirmed.
- Deleting an imported forecast shall not delete or mutate saved plan snapshots.
- Failed deletion shall leave the original hierarchy intact.

# Acceptance Scenarios

## Create a Hierarchy

**Given** an empty portfolio  
**When** a planner creates a call center and staffing group  
**Then** both receive stable identifiers  
**And** the staffing group belongs only to that call center.

## Preserve Plan Basis

**Given** a plan references an imported forecast  
**When** the forecast is deleted  
**Then** the plan remains readable from its stored snapshot  
**And** its source is marked unavailable rather than silently reassigned.

## Protect Dependent Updates

**Given** a budget has one or more update plans  
**When** the planner requests budget deletion  
**Then** deletion is blocked or requires an explicit supported cascade  
**And** no orphaned updates are created.

# Open Questions

1. Should staffing groups support archival as an alternative to deletion?
2. Should names be unique within their parent scope?
3. Is moving or copying a staffing group between call centers required later?

# Implementation Traceability

- `src/planningStorage.js`
- `src/storage/localDataStore.js`
- `src/storage/wfmDexie.js`

