---
id: FIMP-003
title: Forecast Upload, Column Mapping, Parsing, and Validation
status: draft
owners: []
depends_on: [FIMP-002, FOUND-005]
last_reviewed: 2026-06-14
---

# Purpose

Define the interactive import workflow from file selection through accepted normalized rows.

# Primary Flow

1. Planner selects a supported forecast file.
2. System parses headers and rows without persisting them.
3. System guesses mappings for required logical fields.
4. Planner reviews or changes mappings.
5. System validates schema, rows, duplicates, and coverage.
6. System presents file summary, accepted-row count, and issues.
7. Planner confirms import.
8. System persists the accepted version atomically.

# Mapping Requirements

- Mapping controls shall list available file headers.
- A source column shall not satisfy two incompatible required fields.
- Guessed mappings shall be visibly reviewable.
- Changing a mapping shall rerun dependent validation.
- Unmapped extra columns shall not produce row errors.
- Mapping shall be stored as source metadata for traceability.

# Validation Levels

## File-Level

- supported file type and size
- readable header
- at least one data row
- unique or distinguishable headers

## Schema-Level

- every required logical field mapped
- compatible declared granularity
- valid units or conversion choice

## Row-Level

- valid date or interval
- finite non-negative contacts
- valid positive AHT
- valid interval length where required
- no duplicate row key

## Dataset-Level

- coherent chronological coverage
- ownership and planning-period compatibility
- granularity-specific completeness

# Issue Presentation

- Every issue shall identify severity and corrective action.
- Row issues shall identify source row number.
- Blocking and non-blocking issues shall be separated.
- The planner shall be able to replace the file without closing the workflow.
- Confirmation shall remain disabled while blocking issues exist.

# Failure and Recovery

- Parsing failure shall not persist a forecast.
- Persistence failure shall preserve the parsed import state for retry.
- Cancel shall discard transient import state only.
- Revalidation shall be deterministic for the same file, mappings, and context.

# Acceptance Scenarios

## Guess Common Headers

**Given** headers `date`, `volume`, and `aht_seconds`  
**When** the file is loaded  
**Then** the system proposes the corresponding required mappings.

## Identify a Bad Row

**Given** row 18 has a negative contact value  
**When** validation runs  
**Then** row 18 is identified  
**And** import remains blocked.

## Retry a Failed Save

**Given** validation passes but local persistence fails  
**When** the error is displayed  
**Then** the selected file, mappings, and validation summary remain available.

# Open Questions

1. What maximum file size and row count are supported?
2. Should valid rows be accepted when other rows fail?
3. Is an error-report download required?

# Implementation Traceability

- `src/forecasting/csv.js`
- `src/forecasting/sourceArtifacts.js`
- `src/components/forecasting/ForecastImportDailyModal.vue`

