---
id: FIMP-004
title: Daily, Interval, and Monthly Forecast Granularity
status: draft
owners: []
depends_on: [FIMP-002, ORG-004]
last_reviewed: 2026-06-14
---

# Purpose

Define how supported source granularities behave and which planning methods they can support.

# Supported Granularities

## Monthly

- One row per month.
- Supports monthly workload-ratio planning.
- Does not support intraday Erlang because daily and interval shape are unavailable.
- Peak-day values remain unavailable unless separately supplied by an approved contract.

## Daily

- One row per service date.
- Supports monthly workload-ratio planning after aggregation.
- Supports intraday Erlang when combined with a valid staffing-group intraday profile.
- Preserves daily shape for open-day filtering and peak-day calculation.

## Interval

- One row per timestamped interval.
- Supports monthly workload-ratio and intraday Erlang planning.
- Shall preserve interval length and local-time ordering.
- Shall not be redistributed by the staffing-group intraday profile.

# Compatibility Requirements

| Planning capability | Monthly | Daily | Interval |
|---|---:|---:|---:|
| Monthly contact rollup | Yes | Yes | Yes |
| Weighted monthly AHT | Yes | Yes | Yes |
| Workload-ratio requirement | Yes | Yes | Yes |
| Peak-day calculation | No | Yes | Yes |
| Intraday Erlang | No | Yes, after profile distribution | Yes |

# Business Rules

- Granularity shall be declared or inferred before final validation.
- A single forecast version shall use one granularity.
- Mixed daily and monthly rows shall be rejected unless a future compound contract is approved.
- Aggregation shall never invent finer-grained source data.
- Conversion to coarser periods shall preserve contacts and contact-weighted AHT.
- Local date and time shall follow the owning call-center context.

# Acceptance Scenarios

## Block Monthly Intraday Use

**Given** a planning-ready monthly forecast  
**When** the planner selects intraday Erlang  
**Then** the system explains that daily or interval detail is required  
**And** does not fabricate interval demand.

## Aggregate Intervals

**Given** valid interval rows for one day  
**When** daily and monthly totals are produced  
**Then** contacts equal the source sum  
**And** AHT is contact-weighted.

## Distribute Daily Demand

**Given** a daily forecast and valid intraday profile  
**When** interval demand is built  
**Then** daily contacts are distributed by profile ratios  
**And** the interval sum equals the daily source value within tolerance.

# Open Questions

1. Is interval import required for the first implementation?
2. May different days use different interval lengths?
3. Should daily files optionally provide peak intervals directly?

# Implementation Traceability

- `src/planner/demandSources.js`
- `src/planner/intradayErlang.js`
- `src/forecasting/forecastProjection.js`

