---
id: FIMP-006
title: Forecast Contacts and Handle-Time Normalization and Aggregation
status: draft
owners: []
depends_on: [FOUND-003, FIMP-004, FIMP-005]
last_reviewed: 2026-06-14
---

# Purpose

Define deterministic transformation of accepted source rows into planning demand measures.

# Normalized Measures

Every required month shall be able to expose:

- contacts
- contact-weighted AHT seconds
- workload hours
- source-row count
- available open-day count
- average daily contacts when daily detail exists
- peak daily contacts when daily detail exists

# Formulas

```text
monthly contacts = sum(source contacts)

monthly weighted AHT seconds =
  sum(source contacts * source AHT seconds) / sum(source contacts)

monthly workload hours =
  sum(source contacts * source AHT seconds) / 3600

average daily contacts =
  monthly open-day contacts / included open service days

peak-day uplift percent =
  max((peak daily contacts / average daily contacts) - 1, 0) * 100
```

# Business Rules

- Rows on configured closed dates shall not contribute to open-day plan demand.
- Zero-contact rows may be retained but shall not add weight to AHT.
- If every row has zero contacts, weighted AHT shall use the defined fallback or remain unavailable; it shall not divide by zero.
- Source contacts shall remain unrounded during aggregation.
- Plan-facing monthly contacts may be rounded only according to `FOUND-003`.
- Lower and upper forecast bounds shall remain informational unless a later planning spec explicitly uses them.

# Source Preservation

- Normalization shall not alter persisted raw source values.
- Normalized output shall retain a traceable relationship to source rows.
- Recalculation with unchanged source and calendar inputs shall produce the same result.

# Acceptance Scenarios

## Weight AHT by Contacts

**Given** 100 contacts at 300 seconds and 300 contacts at 500 seconds  
**When** aggregated  
**Then** monthly AHT is 450 seconds  
**And** workload is approximately 50 hours.

## Exclude a Closure

**Given** a daily row falls on a configured closed date  
**When** open-day demand is calculated  
**Then** its contacts do not contribute to plan demand.

## Preserve Monthly Totals

**Given** interval rows sum to 12,345.5 contacts  
**When** aggregated to month  
**Then** the unrounded normalized monthly total remains 12,345.5.

# Open Questions

1. What fallback applies when all contacts are zero but AHT is populated?
2. Should closed-date demand generate a warning?
3. Are forecast bounds required in plan reporting?

# Implementation Traceability

- `src/planner/demandSources.js`
- `src/forecasting/sourceArtifacts.js`
- `src/forecasting/forecastProjection.js`

