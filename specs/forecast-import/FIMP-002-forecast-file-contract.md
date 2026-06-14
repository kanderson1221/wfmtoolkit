---
id: FIMP-002
title: Forecast File Contract, Required Columns, Units, and Templates
status: draft
owners: []
depends_on: [FOUND-003, FIMP-001]
last_reviewed: 2026-06-14
---

# Purpose

Define supported forecast files and the minimum data required to use them in planning.

# File Requirements

- The initial file format shall be CSV with a header row.
- Text shall be decoded as UTF-8, with optional byte-order mark support.
- Blank trailing rows shall be ignored.
- Extra unmapped columns may be retained as source metadata but shall not affect calculations.
- A downloadable template shall be provided for every supported granularity.

# Required Logical Fields

## Daily Forecast

| Field | Requirement |
|---|---|
| Service date | Valid ISO date or mappable date value |
| Contacts | Finite, non-negative daily demand |
| Average handle time | Positive seconds per contact |

## Interval Forecast

| Field | Requirement |
|---|---|
| Interval start | Valid date and local time |
| Contacts | Finite, non-negative interval demand |
| Average handle time | Positive seconds per contact |
| Interval length | Positive minutes when not fixed by the selected template |

## Monthly Forecast

| Field | Requirement |
|---|---|
| Month | Valid month represented by its first day or accepted month label |
| Contacts | Finite, non-negative monthly demand |
| Average handle time | Positive seconds per contact |

# Optional Fields

Supported optional fields may include:

- source record identifier
- source queue or workstream label
- lower and upper contact bounds
- source notes
- external version label

Optional values shall not override required ownership selected in the application.

# Unit Rules

- Contacts are counts in the staffing group's consistent demand unit.
- AHT is normalized to seconds.
- Interval length is normalized to minutes.
- Dates are normalized to `YYYY-MM-DD`.
- Month identity is normalized to `YYYY-MM-01`.
- Percent values, when introduced by a later contract, shall declare ratio or percent form.

# Template Requirements

- Templates shall use canonical column names.
- Templates shall include a header and at least one clearly identified sample row or separate instructions.
- Templates shall state units.
- Import shall not require users to retain optional template columns.

# Acceptance Scenarios

## Accept Extra Columns

**Given** a daily file contains the three required fields and extra source columns  
**When** required fields map successfully  
**Then** the extra columns do not block import.

## Reject Missing AHT

**Given** a file contains contacts but no mappable AHT  
**When** validation runs  
**Then** the file is not planning-ready  
**And** the message identifies the missing AHT field and unit.

## Normalize Monthly Identity

**Given** a monthly value labeled `Jan 2027`  
**When** it is accepted  
**Then** the stored month identity is `2027-01-01`.

# Open Questions

1. Should contact-only files be accepted as incomplete drafts?
2. Which date formats beyond ISO are supported?
3. Is XLSX support required?

# Implementation Traceability

- `src/forecasting/csv.js`
- `src/forecasting/sourceArtifacts.js`
- `public/`

