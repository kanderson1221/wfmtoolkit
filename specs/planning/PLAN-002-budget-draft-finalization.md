---
id: PLAN-002
title: Budget Plan Creation, Draft Autosave, Validation, and Finalization
status: draft
owners: []
depends_on: [PLAN-001, FIMP-008, DATA-002]
last_reviewed: 2026-06-14
---

# Purpose

Define the end-to-end workflow for creating and establishing an annual budget baseline.

# Preconditions

- A call center and staffing group exist.
- A planning year is selected.
- No other budget plan exists for that staffing group and year.
- A planning-ready imported forecast is available for the selected requirement method.

# Creation Flow

1. Planner selects **New Plan**.
2. Planner chooses planning year and requirement method.
3. Planner selects a planning-ready forecast.
4. System creates a transient draft and applies the forecast snapshot.
5. System loads applicable organization defaults and prior-year handoff.
6. Planner reviews each required section.
7. System autosaves recoverable draft state.
8. Planner saves as draft or finalizes when gates pass.

# Draft Requirements

- A budget may be saved before finalization gates pass.
- Saving shall create or update one persistent draft record.
- Draft status, incomplete sections, warnings, and source metadata shall be preserved.
- Draft edits shall not modify a finalized budget.
- Canceling a never-saved plan shall return to the owning group without creating a budget record.

# Autosave Requirements

- Autosave shall be debounced and shall not run while bootstrap or manual save is incomplete.
- Status shall distinguish saving, saved, restored, failed, and idle.
- Manual save shall flush or supersede queued autosave work.
- Failed autosave shall not erase the last persisted draft.
- Recovery behavior is defined by `DATA-002`.

# Finalization Requirements

- Finalization shall be an explicit action distinct from draft save.
- The system shall summarize blockers before finalization.
- Finalization shall persist status and timestamp atomically.
- A finalized budget shall preserve demand, calendar, settings, and calculation snapshots.
- Finalization shall establish the budget baseline without deleting drafts for other years.

# Acceptance Scenarios

## Save an Incomplete Draft

**Given** required sections remain incomplete  
**When** the planner selects **Save Draft**  
**Then** the plan is persisted as draft  
**And** finalization remains unavailable.

## Finalize a Complete Budget

**Given** all finalization gates pass  
**When** the planner confirms finalization  
**Then** status becomes finalized  
**And** the baseline timestamp and snapshots are persisted.

## Recover After Save Failure

**Given** manual save fails  
**When** the error appears  
**Then** the editable state remains  
**And** recoverable draft autosave resumes.

# Open Questions

1. Is a final confirmation dialog required?
2. Should finalization create a downloadable review packet?
3. How long should draft autosave history be retained?

# Implementation Traceability

- `src/components/MonthlyPlanBuilder.vue`
- `src/composables/useMonthlyPlanBuilder.js`
- `src/composables/monthlyPlanBuilder/usePlannerAutosave.js`

