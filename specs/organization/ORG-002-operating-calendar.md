---
id: ORG-002
title: Operating Days, Hours, Holiday Calendars, and Closures
status: draft
owners: []
depends_on: [ORG-001, FOUND-003]
last_reviewed: 2026-06-14
---

# Purpose

Define the operating calendar used to determine open days, interval availability, forecast applicability, and training dates.

# Scope

This specification covers call-center operating weekdays, daily operating window, year-specific holidays, custom closures, and inherited group behavior.

# Functional Requirements

- A call center shall define one or more operating weekdays.
- New call centers shall default to Monday through Friday.
- A call center shall define an opening and closing time for interval-based planning.
- Close time shall be later than open time unless overnight operation is later approved.
- Holiday schedules shall be stored by calendar year.
- The planner may load a supported holiday template and retain custom dates.
- The planner may add, edit, and remove custom closed dates.
- The planner may copy a prior-year holiday schedule into another year.
- Replacing an existing target-year schedule shall require confirmation.

# Open-Day Rules

- A date is open only when its weekday is selected and it is not an applicable closed date.
- Weekend holidays shall not reduce open days unless the date itself is otherwise open.
- Duplicate closure dates shall count once.
- Plan calculations shall prefer the plan's saved holiday snapshot over later organization changes.
- Actuals completeness shall exclude configured closed dates.
- Training workday calculations shall skip non-operating weekdays and applicable closures.

# Year Coverage

- The settings workflow shall permit historical and future holiday years needed by actuals and plans.
- Applying a recurring holiday template shall project rules into the selected year.
- Custom holiday names and dates shall remain distinguishable from template entries.

# Failure Behavior

- Invalid dates shall block save.
- Duplicate dates shall be merged or clearly identified before save.
- A failed template or copy operation shall not erase the existing schedule.
- Missing holiday data shall not silently imply that every weekday is a holiday.

# Acceptance Scenarios

## Calculate Open Days

**Given** Monday through Friday operation  
**And** one Wednesday is a closed holiday  
**When** monthly open days are calculated  
**Then** that Wednesday is excluded exactly once.

## Copy Prior Year

**Given** the target year already has closures  
**When** the planner copies the prior year  
**Then** replacement is confirmed  
**And** cancellation preserves the target schedule.

## Preserve a Plan Snapshot

**Given** a plan saved its calendar basis  
**When** the call-center holiday schedule later changes  
**Then** reopening the saved plan uses its saved snapshot.

# Open Questions

1. Are partial-day closures required?
2. Should holiday templates support countries beyond the initial supported set?
3. How should overnight operating windows assign intervals to service dates?

# Implementation Traceability

- `src/planner/holidayCalendars.js`
- `src/planner/planOpenDays.js`
- `src/components/planning/CallCenterSettingsModal.vue`
- `src/planningStorage.js`

