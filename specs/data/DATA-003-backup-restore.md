---
id: DATA-003
title: Backup Export, Validation, and Replacement Import
status: draft
owners: []
depends_on: [DATA-001, DATA-005, FOUND-005]
last_reviewed: 2026-06-14
---

# Purpose

Define user-controlled export and restore of supported relational planning data.

# Backup Envelope

A backup shall include:

- backup format identifier
- schema version
- export timestamp
- optional application-version metadata
- planning workspaces
- imported forecast versions
- planner drafts
- migration metadata required for safe restore

# Export Requirements

- Export shall read a consistent PostgreSQL transaction snapshot.
- The downloaded file shall be valid JSON.
- Export shall include all supported local planning records.
- Export shall not mutate planning records.
- Last successful export time may be stored and displayed.
- Export failure shall not produce a partial file reported as valid.

# Pre-Import Validation

Before changing persisted planning data, the system shall:

- parse the file
- validate envelope and schema version
- validate required collections
- inspect supported format
- calculate summary counts
- report incompatibilities

Validation failure shall leave existing planning data intact.

# Replacement Import

- Restore shall clearly state that current planning data will be replaced.
- The confirmation shall identify the selected file and show its backup timestamp, format, schema version, complete-data scope, and record counts.
- An unsupported future schema or explicitly unsupported backup format shall be rejected before confirmation.
- Replacement shall execute in one database transaction.
- On success, the restored hierarchy shall be reloaded.
- On failure, the prior committed database state shall remain intact.
- Supported legacy backup formats may be migrated during restore.

# Acceptance Scenarios

## Export Complete Data

**Given** centers, groups, forecasts, plans, and drafts exist  
**When** backup is downloaded  
**Then** the envelope includes all supported records and a schema version.

## Reject Before Replacement

**Given** a selected file lacks required backup data  
**When** validation runs  
**Then** restore is blocked  
**And** current data remains intact.

## Restore Atomically

**Given** a valid backup  
**When** replacement restore succeeds  
**Then** current data is replaced by the backup as one operation.

# Open Questions

1. Should backups be encrypted or password protected?
2. Is merge import required in addition to replacement?
3. How many prior schema versions must remain restorable?

# Implementation Traceability

- `src/storage/localDataStore.js`
- `src/components/LocalDataStorageDialog.vue`
- `src/fileDownload.js`
