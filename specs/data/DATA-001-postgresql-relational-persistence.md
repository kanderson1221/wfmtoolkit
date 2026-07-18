---
id: DATA-001
title: PostgreSQL Relational Persistence
status: draft
owners: []
depends_on: [FOUND-002, FOUND-003]
last_reviewed: 2026-06-14
---

# Purpose

Define PostgreSQL as the system of record for planning data and establish
relational, transactional, and migration requirements.

# Scope

The database shall persist:

- call centers and holiday profiles
- staffing groups and intraday profiles
- actuals
- imported forecast versions and normalized rows
- annual plans and monthly records
- training classes
- recoverable planner drafts
- schema and migration metadata

# Relational Storage Requirements

- Persistent business data shall use normalized relational tables.
- Business entities, snapshots, source rows, monthly records, and calculation
  results shall not be stored as JSON or JSONB documents.
- Repeating values shall use child tables rather than arrays or serialized
  columns.
- Imported extra CSV fields may use relational name/value rows when retained.
- JSON may be generated as an external backup or API representation, but shall
  not be the database system of record.
- The initial PostgreSQL schema is defined by
  `specs/database/postgresql-schema.sql`.

# Functional Requirements

- The database shall use stable identifiers and ownership keys.
- Loading shall reconstruct the domain hierarchy defined by `FOUND-002`.
- Saving a planning workspace shall be transactional across affected planning
  tables.
- Child rows removed from the current hierarchy shall not remain as active
  orphans.
- Persistence shall preserve requirement method, plan type, status, lineage,
  and snapshots.
- Data shall be scoped so one workspace does not overwrite another supported
  scope.
- Concurrent updates shall use an explicit optimistic-lock or equivalent
  conflict strategy.
- Successful commits shall emit or enable a data-changed signal for interested
  views.

# Draft Persistence

- A draft plan shall use the same relational tables as a finalized plan.
- Autosave shall commit the draft and its affected child rows in one
  transaction.
- New plans shall receive stable identifiers before autosave begins.
- Finalization shall not copy an opaque serialized draft into another column.

# Snapshot And Deletion Rules

- Finalized plan snapshots shall be immutable at the database boundary.
- Forecast deletion shall preserve referenced plan source identity and snapshot
  values.
- Actuals deletion shall not mutate daily or monthly values already copied into
  a saved update plan.
- Call-center and staffing-group deletion shall cascade only through an
  explicitly confirmed transaction.

# Failure Behavior

- Connection failure, constraint failure, transaction failure, read failure,
  and write failure shall be distinguishable.
- A failed transaction shall leave the prior committed state intact.
- The UI shall not report success before commit.
- Read failure shall not silently replace data with an empty workspace.
- Unsupported records shall be handled by migration or surfaced as errors.

# Database Boundary

- PostgreSQL is the system of record for planning entities and saved
  calculations.
- A calculation service response shall not become authoritative until its
  transaction commits to the planning database.
- Authentication, authorization, tenancy, hosting, and replication policy are
  deployment concerns unless later specifications add product requirements.
- Backup and restore behavior remains governed by `DATA-003`.

# Acceptance Scenarios

## Round-Trip a Plan

**Given** a plan contains monthly records, training classes, and imported demand
snapshot  
**When** it is saved and reloaded  
**Then** its hierarchy and calculation method are preserved.

## Roll Back a Failed Transaction

**Given** existing planning data  
**When** a multi-table save fails  
**Then** the prior committed workspace remains readable.

## Distinguish Missing From Failure

**Given** database access fails  
**When** the workspace loads  
**Then** an error is shown  
**And** an empty call-center directory is not substituted.

## Persist Without Document Columns

**Given** the PostgreSQL schema is inspected  
**When** persistent planning columns are listed  
**Then** no business-data column uses JSON or JSONB  
**And** repeating records are represented by related rows.

# Open Questions

1. Is encryption at rest required?
2. What deployment-level tenant or owner key will scope workspaces?
3. What retention and archival policies apply to imports and calculation runs?

# Implementation Traceability

- `specs/database/postgresql-schema.sql`
- `specs/database/README.md`

The current browser-local persistence implementation is legacy behavior and is
not normative for the next implementation.
