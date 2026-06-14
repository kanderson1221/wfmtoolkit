---
id: ACT-001
title: Daily Actuals File Contract and Import
status: draft
owners: []
depends_on: [FOUND-003, ORG-003, FOUND-005]
last_reviewed: 2026-06-14
---

# Purpose

Define the daily actuals file and interactive import workflow for observed demand and handle time.

# File Contract

The initial supported format shall be CSV with:

| Logical field | Requirement |
|---|---|
| Service date | Valid date normalized to `YYYY-MM-DD` |
| Contacts | Finite, non-negative observed contacts |
| Average handle time | Finite, non-negative seconds per contact |

Extra columns shall be ignored unless mapped by a later specification.

# Import Flow

1. Planner opens a staffing group's data area.
2. Planner selects a CSV file.
3. System parses headers and guesses required mappings.
4. Planner reviews mappings.
5. System validates rows across all represented years.
6. System shows accepted rows, affected date range, additions, and replacements.
7. Planner confirms.
8. System merges rows by service date atomically.

# Functional Requirements

- Common date, contacts, and AHT header names shall be recognized.
- Mapping changes shall rerun validation.
- Row errors shall identify the source row.
- Files may span multiple years.
- Existing dates shall be counted as replacements before confirmation.
- New dates shall be counted as additions.
- Import metadata shall preserve file name, headers, mapping, and timestamp.

# Business Rules

- One staffing group shall have at most one accepted actuals row per service date.
- A later confirmed import for the same date replaces the prior row.
- Actuals are observed facts and shall not be edited through forecast-import workflows.
- Invalid imports shall not partially merge.

# Acceptance Scenarios

## Import Multiple Years

**Given** a valid file contains dates in 2026 and 2027  
**When** it is confirmed  
**Then** all rows enter one staffing-group actuals history.

## Preview Replacements

**Given** five imported dates already exist  
**When** a new file is validated  
**Then** the preview identifies five replacements separately from additions.

## Reject a Bad Row

**Given** row 12 has non-numeric contacts  
**When** validation runs  
**Then** import is blocked  
**And** row 12 is identified.

# Open Questions

1. Should zero AHT be accepted or treated as missing?
2. Is partial import ever allowed?
3. Should source file checksums be stored?

# Implementation Traceability

- `src/planner/groupActualsImport.js`
- `src/components/planning/PlanningGroupActualsImportModal.vue`
- `src/components/planning/PlanningGroupActualsUploadSection.vue`

