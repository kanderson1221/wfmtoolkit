---
id: PLAN-007
title: Intraday Erlang Staffing Requirement
status: draft
owners: []
depends_on: [PLAN-003, PLAN-004, PLAN-005, ORG-004]
last_reviewed: 2026-07-19
---

# Purpose

Define the plan-integrated interval staffing method that converts daily or interval forecast demand into monthly Erlang staffing hours and headcount.

# Scope

This specification covers:

- construction of planning intervals from imported daily or interval demand
- calculation of interval net staffing requirements
- aggregation of interval results into daily and monthly planning measures
- conformance with the packaged Erlang C and Erlang A numerical implementation

This specification does not add a standalone calculator, forecasting behavior, schedule generation, or employee assignment.

# Actors

- Planner: runs the requirement calculation and reviews the results.
- Implementation agent: builds or ports the calculation while preserving the numerical contract.

# Preconditions

- Forecast granularity is daily or interval.
- Required months have AHT.
- Operating hours and open-day calendar are valid.
- Staffing-group service-level percent and threshold are valid.
- Intraday profile is valid when daily demand requires distribution.
- Max occupancy and adherence assumptions are valid.

# Interval Input

Each calculated interval shall include:

- service date and interval start
- contacts offered
- AHT seconds
- interval length
- service-level target and threshold
- max occupancy
- caller patience default or approved input

# Model Contract

- The planning workspace shall use Erlang C for interval staffing.
- The planning adapter shall call behavior equivalent to
  `staff_for_interval(inputs, model="erlang_c")`.
- Erlang A shall remain available as a packaged engine capability through
  behavior equivalent to `staff_for_interval(inputs, model="erlang_a")`.
- The planning workspace shall not expose or select Erlang A unless a later
  approved specification adds that requirement.
- Both models shall preserve the packaged validation, zero-demand behavior,
  minimum-staff search, service-level calculation, occupancy constraint,
  average-speed-of-answer calculation, immediate-answer calculation, and
  abandonment calculation.

# Calculation Requirements

- Daily contacts shall be distributed by normalized intraday ratios.
- Interval-source contacts shall be used directly.
- Each planning interval shall calculate net required agents with Erlang C.
- Required agents shall be the lowest whole number that satisfies both the
  service-level target and the max-occupancy constraint.
- An interval with zero contacts shall require zero agents, have zero
  occupancy, and have a service level of one.
- Monthly Erlang staffed hours shall equal the sum of `required agents * interval hours`.
- Monthly workload hours shall equal source contacts times AHT.
- Weighted occupancy and service level shall use documented weighting.
- Peak interval requirement shall equal the maximum required agents in the month.
- Post-Erlang adherence overhead shall follow `PLAN-004`.
- Monthly required headcount shall equal adjusted Erlang staffed hours divided by paid hours per month.

# Normative Reference Implementation

The executable numerical contract is
[Erlang Staffing Reference Implementation](../reference-implementations/erlang/README.md),
version `1.0.0`.

- The four source snapshots listed in `SOURCE_SHA256SUMS` shall remain
  byte-for-byte unchanged for this reference version.
- `reference_erlang.staff_for_interval` defines Erlang C and Erlang A interval
  behavior.
- `reference_erlang.plan_intraday_monthly_rows` defines the planning adapter and
  interval, daily, and monthly output behavior.
- `test_vectors.json` defines representative golden results.
- `tests/test_reference_erlang.py` defines executable conformance and source
  integrity checks.
- An implementation may import the package, vendor it, or port it.
- A port shall pass all supplied vectors within the tolerance enforced by the
  conformance suite.
- For numerical behavior, the package and conformance suite are normative.
  For workflow and UI behavior, this specification and its dependencies are
  normative.
- A numerical change requires a new reference package version, updated vectors,
  and review of this specification.

# Execution Behavior

- Calculation shall be explicit and show running status.
- Input changes after a run shall mark results stale.
- Stale results shall not be treated as finalization-ready.
- Partial backend output shall not replace the last complete result.
- Error messages shall distinguish missing inputs, invalid rows, and service failure.
- Saved-plan reporting shall verify the stored result input signature against the
  current saved plan inputs before using monthly Erlang output.
- Missing, incomplete, or stale saved results shall not fall back to the
  workload-ratio requirement method in reports.
- Actual Erlang requirement shall remain unavailable in aggregate reporting
  unless matching actual calculation results are explicitly retained.

# Failure And Recovery

- Invalid numerical inputs shall fail with the validation behavior defined by
  the reference implementation.
- A failed calculation shall leave the last complete result available and mark
  it stale when its inputs no longer match.
- A checksum or conformance failure shall block implementation acceptance.
- The application shall not silently substitute a different Erlang formula,
  staffing search, rounding rule, or aggregation method.

# Acceptance Scenarios

## Distribute Daily Contacts

**Given** a day has 1,000 contacts and a valid profile  
**When** intervals are built  
**Then** interval contacts sum to 1,000 within tolerance.

## Aggregate Erlang Hours

**Given** two 30-minute intervals require 10 and 12 agents  
**When** daily staffed hours are calculated  
**Then** they contribute 5 and 6 hours respectively.

## Mark Results Stale

**Given** a completed Erlang run  
**When** service level or intraday ratios change  
**Then** results are marked stale  
**And** finalization is blocked until rerun.

## Conform To Erlang C Vector

**Given** 25 contacts in 30 minutes, 360-second AHT, an 80 percent service goal
within 40 seconds, 85 percent max occupancy, and 180-second caller patience  
**When** Erlang C staffing is calculated  
**Then** required staff is 8  
**And** every returned metric matches the `standard_c` vector within the
conformance tolerance.

## Preserve Erlang A Capability

**Given** the same inputs as the standard Erlang C vector  
**When** the packaged engine is called explicitly with Erlang A  
**Then** required staff is 7  
**And** every returned metric matches the `standard_a` vector within the
conformance tolerance.

## Conform To Planning Rollup

**Given** the two interval rows in the packaged planning vector  
**When** the planning adapter runs  
**Then** its interval, daily, and monthly results match the packaged expected
results.

## Verify Exact Source

**Given** reference version `1.0.0`  
**When** the conformance suite verifies the source snapshots  
**Then** every source hash matches `SOURCE_SHA256SUMS`.

# Open Questions

1. Is caller patience user-configurable or inherited from a planning default?
2. Should interval results be downloadable?

# Implementation Traceability

- `src/planner/intradayErlang.js`
- `backend/app/planner.py`
- `src/composables/monthlyPlanBuilder/usePlannerIntradayErlang.js`
