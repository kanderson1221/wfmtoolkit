---
id: ORG-004
title: Staffing-Group Intraday Demand Distribution
status: draft
owners: []
depends_on: [ORG-002, ORG-003, FOUND-003]
last_reviewed: 2026-08-09
---

# Purpose

Define the reusable intraday profile that distributes daily forecast contacts across operating intervals for intraday requirement calculations.

# Data Contract

An intraday profile shall include:

- interval length in minutes
- ordered intervals derived from the effective operating window
- one non-negative demand ratio per interval
- normalized total ratio of 100 percent
- one non-negative whole-number minimum headcount applied to all open intervals
- last-updated metadata

# Functional Requirements

- The initial supported interval length shall be 30 minutes.
- A default profile shall distribute demand evenly across all intervals in the operating window.
- The planner shall be able to edit each interval ratio.
- The system shall display the running total.
- The planner shall be able to normalize entered ratios to 100 percent.
- The planner shall be able to import interval ratios from CSV and download a sample template.
- Saving shall persist business values without UI-only labels or state.
- The planner shall be able to set one minimum headcount for every open interval; zero shall disable the floor.
- Changing operating hours shall reconcile matching interval ratios and identify added or removed intervals.

# Business Rules

- Ratios shall be finite and non-negative.
- A profile with a zero total is invalid.
- A profile used for intraday planning must total 100 percent within defined numeric tolerance.
- Interval ordering shall follow local call-center time.
- Applying the profile to a daily total shall preserve that total within rounding tolerance.
- Profile changes shall not silently rewrite finalized plan interval snapshots.
- Existing profiles without a minimum shall normalize to zero.

# Interval Ratio Import

The CSV import contract shall contain:

- `interval_start`: the local interval start in 24-hour `HH:MM` format
- `ratio_percent`: the percentage of daily contacts assigned to that interval,
  between 0 and 100

The file shall contain every active interval exactly once. Duplicate starts,
missing active intervals, intervals outside the current operating window,
invalid times, and invalid percentages shall reject the import without changing
the current draft. A structurally valid import may be loaded when its ratios do
not yet total 100 percent, but save shall remain blocked until the planner edits
or normalizes the values.

# Failure Behavior

- Invalid ratios shall block save.
- Normalization shall not run when all ratios are zero.
- If operating hours invalidate a saved profile, intraday calculations shall be blocked until the profile is reconciled.
- A failed save shall preserve edits for correction or retry.

# Acceptance Scenarios

## Build an Even Profile

**Given** an eight-hour operating window and 30-minute intervals  
**When** a profile is initialized  
**Then** it contains 16 ordered intervals  
**And** each receives an equal share totaling 100 percent.

## Normalize Ratios

**Given** valid non-negative ratios total 125 percent  
**When** the planner normalizes them  
**Then** proportional values total 100 percent.

## Preserve Matching Intervals

**Given** a saved profile and an expanded operating window  
**When** intervals are rebuilt  
**Then** matching interval ratios are retained  
**And** new intervals are clearly initialized.

## Import Interval Ratios

**Given** the planner downloads the sample template and supplies every active
interval exactly once
**When** the CSV is imported
**Then** the worksheet ratios are replaced in operating-time order
**And** the planner reviews and saves the imported profile.

# Open Questions

1. Are multiple profiles by weekday or season required?
2. Should profiles support 15-minute intervals?
3. What numeric tolerance is allowed around 100 percent?

# Implementation Traceability

- `src/planner/groupIntraday.js`
- `src/components/planning/PlanningGroupIntradayView.vue`
- `src/components/__tests__/PlanningGroupIntradayView.spec.js`
