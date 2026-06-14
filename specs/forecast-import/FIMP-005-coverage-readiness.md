---
id: FIMP-005
title: Forecast Coverage, Gaps, Duplicates, Invalid Dates, and Readiness
status: draft
owners: []
depends_on: [FIMP-003, FIMP-004, ORG-002]
last_reviewed: 2026-06-14
---

# Purpose

Define when an accepted forecast has sufficient valid coverage for a budget or updated plan.

# Coverage Requirements

- A budget plan requires all twelve months of its planning year.
- An updated plan requires forecast coverage for every month after its actuals-through month.
- Coverage shall be evaluated by normalized month identity, not metadata label alone.
- A forecast may contain a wider period, but only required months shall be applied.
- Coverage status shall state matched and missing required months.

# Granularity-Specific Completeness

## Monthly

- Exactly one accepted row per required month.

## Daily

- Rows shall fall within the declared coverage window.
- Missing open service dates shall be identified.
- Closed dates may be present but shall not contribute to open-day demand calculations.
- Duplicate service dates are blocking.

## Interval

- Duplicate interval timestamps are blocking.
- Required open dates shall contain a coherent interval set.
- Gaps within an operating window shall be identified and classified.

# Date Validation

- Dates shall be real calendar dates.
- Coverage start shall not follow coverage end.
- Monthly coverage shall align to complete calendar months.
- Rows outside the selected staffing group's intended planning context shall be reported.
- Time-zone conversion shall not move a row to a different service date.

# Readiness Status

A forecast is planning-ready for a workflow only when:

- required fields and units are valid
- no blocking duplicate or row issue remains
- all required months are covered
- AHT is available for each required month
- granularity supports the selected requirement method

Readiness shall be contextual. A forecast may be ready for workload-ratio planning but not intraday Erlang.

# Acceptance Scenarios

## Full Budget Coverage

**Given** a monthly file contains January through December 2027 exactly once  
**When** evaluated for a 2027 budget  
**Then** it reports 12 of 12 required months.

## Update Coverage

**Given** actuals are applied through April 2027  
**And** the forecast covers May through December  
**When** evaluated for the update  
**Then** it is complete for that update even without January through April forecast rows.

## Reject Duplicate Day

**Given** a daily file contains two rows for `2027-03-10`  
**When** validation runs  
**Then** duplicate coverage is blocking.

# Open Questions

1. May daily imports omit closed dates entirely?
2. Are missing open days always blocking or configurable?
3. How should daylight-saving interval duplication be represented?

# Implementation Traceability

- `src/planner/demandSources.js`
- `src/forecasting/sourceArtifacts.js`
- `src/forecasting/forecastResultPolicy.js`

