---
id: PORT-005
title: Empty, Incomplete, Stale, and Mixed-Scope Reporting States
status: draft
owners: []
depends_on: [PORT-001, PORT-002, FOUND-005]
last_reviewed: 2026-06-14
---

# Purpose

Prevent reports from presenting incomplete or incompatible information as trustworthy totals.

# State Definitions

| State | Meaning |
|---|---|
| Empty | No applicable records exist. |
| Incomplete | Some expected records or values are missing. |
| Stale | Inputs changed after a dependent calculation or snapshot. |
| Mixed scope | Records use incompatible year, plan role, or measure definition. |
| Error | Data could not be read or calculated. |

# Functional Requirements

- Every report shall evaluate its state before presenting summary metrics.
- Empty states shall identify the first useful action.
- Incomplete states shall identify numerator, denominator, and missing scope.
- Stale calculated values shall be labeled and excluded from authoritative totals when necessary.
- Mixed-year values shall never be combined.
- Budget and current-plan values shall not be mixed in one unlabeled total.
- Errors shall not collapse into empty states.

# Portfolio Rules

- Summary metrics may be omitted when coverage is too incomplete to be decision-useful.
- Groups without plans shall be counted separately from zero-demand groups.
- Actuals-only groups shall not imply requirement coverage.
- Unknown headcount shall remain unknown rather than zero.
- A report shall state the selected year and plan role near its data.

# Acceptance Scenarios

## Distinguish Empty From Error

**Given** storage read fails  
**When** the portfolio opens  
**Then** an error state appears  
**And** it is not described as having no plans.

## Show Partial Coverage

**Given** 7 of 10 groups have plans  
**When** coverage is displayed  
**Then** it states 7 of 10  
**And** totals identify that only planned groups contribute.

## Reject Mixed Scope

**Given** selected year is 2027  
**When** a 2026 plan is encountered  
**Then** it is excluded and reported as out of scope.

# Open Questions

1. What minimum coverage is needed before showing portfolio averages?
2. Should stale values remain visible with a warning?
3. Which errors should offer retry?

# Implementation Traceability

- `src/components/PlanningHome.vue`
- `src/components/ui/AppEmptyState.vue`
- `src/components/ui/AppStatusMessage.vue`

