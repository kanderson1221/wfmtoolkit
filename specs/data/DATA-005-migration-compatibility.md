---
id: DATA-005
title: Legacy Planning-Data Migration and Schema Compatibility
status: draft
owners: []
depends_on: [DATA-001, FOUND-002]
last_reviewed: 2026-06-14
---

# Purpose

Define safe evolution of relationally stored planning records and backups
across schema versions.

# Migration Requirements

- Every persistent schema shall have an integer version.
- Migration shall run before normal reads and writes.
- Each migration shall be idempotent.
- A successfully completed migration shall record its version and timestamp.
- Migration shall preserve stable identifiers where possible.
- Legacy standalone plans shall be placed into a valid call-center and staffing-group hierarchy.
- Legacy year-bucketed actuals shall become one deduplicated daily history.
- Legacy plan methods and statuses shall be inferred only through documented deterministic rules.

# Compatibility Requirements

- Current code shall read the current schema directly.
- Supported older schemas shall migrate forward without requiring manual editing.
- Unsupported future schemas shall be rejected without destructive downgrade.
- Backup validation shall occur before data replacement.
- Unknown fields may be preserved when safe or ignored explicitly; they shall not corrupt current records.

# Failure Behavior

- Migration shall be transactional.
- Failure shall leave the pre-migration data intact.
- Failure shall produce a recoverable error and recommend backup retention.
- Migration shall not repeat after its version is recorded successfully.
- Empty legacy storage shall not be reported as migrated data.
- Migration from document-based storage shall decompose supported records into
  relational tables without retaining an opaque document as the authoritative
  value.

# Verification Requirements

Each migration shall test:

- representative valid legacy records
- missing optional fields
- invalid or partial legacy records
- repeated execution
- rollback on failure
- round-trip through current persistence

# Acceptance Scenarios

## Migrate Once

**Given** legacy local data exists  
**When** the current schema first opens  
**Then** data is migrated  
**And** a second open does not duplicate records.

## Infer a Legacy Method

**Given** an older plan has saved intraday result fields but no requirement method  
**When** migrated  
**Then** the documented inference selects intraday Erlang.

## Reject a Future Schema

**Given** a backup declares a newer unsupported schema  
**When** validation runs  
**Then** import is blocked before current data changes.

# Open Questions

1. How many historical schemas require support?
2. Should migration create an automatic pre-migration backup?
3. Which unknown fields must be preserved for downgrade tolerance?

# Implementation Traceability

- `src/storage/localDataStore.js`
- `src/storage/wfmDexie.js`
- `src/planningStorage.js`
