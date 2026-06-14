---
id: DATA-002
title: Draft Recovery and Autosave Failure Behavior
status: draft
owners: []
depends_on: [DATA-001, PLAN-002]
last_reviewed: 2026-06-14
---

# Purpose

Protect editable plan work from accidental navigation, reload, and non-destructive save failures.

# Draft Identity

- Existing plans shall use a draft key derived from their stable plan identifier.
- New-plan workflows shall receive a stable temporary draft key before autosave begins.
- Empty draft keys shall not create shared or ambiguous drafts.

# Autosave Requirements

- Autosave shall begin only after initial hydration completes.
- Changes shall be debounced.
- Queued autosave shall flush before supported unload or unmount when possible.
- Autosave shall persist the editable plan's relational rows and timestamp in
  one transaction.
- Status shall communicate saving, saved, restored, unavailable, and idle.
- Manual save shall suspend autosave, persist the plan, then clear the recoverable draft.

# Recovery Requirements

- On open, the system shall compare saved plan state and recoverable draft.
- A newer compatible draft shall be restorable.
- Restored status shall identify the autosave time.
- Incompatible drafts shall not overwrite the saved plan.
- Dismissing a draft shall require explicit action when unsaved changes would be lost.

# Failure Behavior

- Failed autosave shall preserve in-memory edits.
- The error shall state that changes remain only in the current tab until saved.
- Manual save failure shall allow autosave to resume.
- Failure to clear a draft after manual save shall be reported to prevent later confusion.

# Acceptance Scenarios

## Restore a Draft

**Given** a newer recoverable draft exists  
**When** the plan reopens  
**Then** the draft is restored or offered for restoration  
**And** its timestamp is shown.

## Handle Autosave Failure

**Given** the database becomes unavailable  
**When** autosave runs  
**Then** in-memory edits remain  
**And** the user is warned that leaving may lose them.

## Clear After Manual Save

**Given** a recoverable draft exists  
**When** manual save succeeds  
**Then** the plan is committed  
**And** the draft is removed.

# Open Questions

1. Should restoration be automatic or user-confirmed?
2. Is multi-version draft history required?
3. What happens when two tabs edit the same plan?

# Implementation Traceability

- `src/composables/monthlyPlanBuilder/usePlannerAutosave.js`
- `src/plannerDraftRepository.js`
- `src/storage/localDataStore.js`
