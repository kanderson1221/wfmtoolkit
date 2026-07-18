---
id: ACT-002
title: Actuals Validation, Replacement, Deletion, and Monthly Rollup
status: draft
owners: []
depends_on: [ACT-001, ORG-002, FOUND-003]
last_reviewed: 2026-06-14
---

# Purpose

Define persisted actuals history, scoped deletion, completeness, and monthly aggregation.

# Storage Rules

- Actuals shall be stored as one chronological daily history per staffing group.
- Rows shall be deduplicated by service date, with the confirmed imported row winning.
- Stored rows shall remain sorted by service date.
- Removing source-file metadata shall not remove accepted daily facts unless deletion is confirmed.

# Deletion Operations

The planner may delete:

- one selected month
- one selected year
- all actuals for the staffing group

Each operation shall:

- state affected period and row count
- require confirmation
- preserve rows outside the selected scope
- complete atomically

# Monthly Rollup

```text
monthly contacts = sum(daily contacts)

monthly AHT =
  sum(daily contacts * daily AHT) / sum(daily contacts)
```

If every included day has zero contacts, monthly AHT may use the simple mean of valid daily AHT values.

# Completeness

- Loaded-day count shall be shown per month.
- Completeness shall evaluate every expected open date in each loaded calendar month.
- Closed dates shall not count as missing.
- Missing open dates anywhere in the calendar month shall produce partial coverage.
- The actuals management view shall identify the exact missing open dates and provide a CSV gap template that can be completed and re-imported.
- The system shall not imply a full month merely because one row exists.

# Acceptance Scenarios

## Replace by Date

**Given** an actual row exists for March 10  
**When** another confirmed import contains March 10  
**Then** the new row replaces the old row exactly once.

## Delete One Month

**Given** history contains March and April  
**When** March deletion is confirmed  
**Then** April remains unchanged.

## Exclude Closed Dates

**Given** a configured holiday is closed  
**When** month completeness is evaluated  
**Then** absence of an actuals row for that date does not reduce completeness.

## Repair Missing Open Dates

**Given** a loaded month is missing one or more expected open dates
**When** the planner reviews its coverage gaps
**Then** every missing date is listed
**And** a CSV template containing those dates is available for download and re-import.

# Open Questions

1. Is a restore-after-delete window required?
2. Should imported actuals become immutable after use in an update?

# Implementation Traceability

- `src/planner/groupActuals.js`
- `src/planner/groupActualsDataSummary.js`
- `src/components/planning/PlanningGroupActualsView.vue`
