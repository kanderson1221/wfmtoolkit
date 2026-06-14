---
id: PLAN-011
title: Plan Warnings, Completeness, and Finalization Gates
status: draft
owners: []
depends_on: [PLAN-002, PLAN-003, PLAN-004, PLAN-005, PLAN-006, PLAN-007, PLAN-008, PLAN-009]
last_reviewed: 2026-06-14
---

# Purpose

Define how the system determines whether a plan is started, reviewable, saveable, and ready to finalize.

# Severity Model

| Severity | Effect |
|---|---|
| Information | Explains a value or inherited default. |
| Warning | Plan may be saved and finalized after explicit review. |
| Blocking | Plan may be saved as draft but cannot be finalized. |
| Error | Operation or calculation failed; affected result is unavailable. |

# Required Sections

A budget shall evaluate at least:

- imported forecast and required coverage
- agent availability
- occupancy, adherence, and design factor
- demand and requirement calculation
- staffing supply
- training pipeline where staffing movement is used
- opening and next-year handoff values where applicable

# Review Requirements

- Inherited defaults shall not count as reviewed merely because they are populated.
- The planner shall explicitly review required assumption sections.
- Each section shall expose status, detail, and first blocker.
- The workspace shall identify the next incomplete section.
- Section status shall persist in drafts.

# Blocking Conditions

Finalization shall be blocked when any applicable condition exists:

- missing or incompatible forecast coverage
- missing AHT
- invalid calendar or zero paid capacity with demand
- non-positive design factor
- stale or failed intraday Erlang result
- missing opening headcount
- invalid training class
- failed persistence
- any unresolved domain error defined by dependent specs

# Finalization Summary

Before finalization, the system shall show:

- plan name, year, type, and requirement method
- demand source and coverage
- annual contacts and workload
- average and peak requirement
- opening and ending headcount
- months below requirement
- unresolved non-blocking warnings

# Acceptance Scenarios

## Require Review of Defaults

**Given** availability defaults populate all months  
**When** the planner has not reviewed the section  
**Then** the section shows **Using defaults**  
**And** finalization remains blocked.

## Block Stale Erlang Output

**Given** intraday results exist  
**When** an Erlang input changes  
**Then** results become stale  
**And** finalization is blocked until rerun.

## Allow Draft Save

**Given** blocking completeness issues remain  
**When** the planner saves a draft  
**Then** save succeeds if persistence succeeds  
**And** blockers remain visible.

# Open Questions

1. Which warnings require explicit acknowledgment?
2. Should finalized plans permit known blocking exceptions?
3. Is a signed review record required later?

# Implementation Traceability

- `src/components/MonthlyPlanBuilder.vue`
- `src/planner/demandModel.js`
- `src/composables/useMonthlyPlanBuilder.js`

