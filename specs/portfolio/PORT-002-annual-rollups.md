---
id: PORT-002
title: Call-Center and Staffing-Group Annual Rollups
status: draft
owners: []
depends_on: [PORT-001, PLAN-008, ACT-003]
last_reviewed: 2026-07-18
---

# Purpose

Define deterministic aggregation from staffing-group plans and actuals to call-center and portfolio totals.

# Rollup Levels

- staffing group by month
- call center by month and year
- full portfolio by month and year
- annual total or average summary

# Inclusion Rules

- Select one applicable plan per staffing group using the requested plan role.
- Include only records for the selected planning year.
- A group without a plan contributes no planned demand or staffing values.
- A group with actuals but no plan may contribute actual contacts, AHT, workload, and loaded days.
- Actual requirement requires a compatible plan basis.

# Aggregation Rules

- Contacts, workload hours, required hours, staffing movements, and loaded days are summed.
- Portfolio AHT is derived from aggregated workload and contacts, not averaged across groups.
- Headcount requirements and supply are summed for independent staffing groups.
- Variances are derived from aggregate values where possible.
- Coverage counts shall identify numerator and denominator.
- Rollups shall expose selected-year inclusion evidence for every staffing group, including center and group identity, whether actuals exist, available plan years, and why a group is excluded.
- Actual-versus-plan variance shall be presented only when the actual and plan group scopes are comparable; otherwise the variance shall remain unavailable.
- Annual averages shall state that they are monthly averages.

# Functional Requirements

- Every call-center row shall expose group count, plan coverage, actuals coverage, demand, requirement, and staffing risk.
- Drill-down shall reveal staffing-group contributions.
- Rollups shall be reproducible from saved plan snapshots and actuals.
- Reordering call centers shall not change totals.

# Acceptance Scenarios

## Sum Independent Requirements

**Given** two groups require 20.5 and 30.25 headcount in March  
**When** the center is rolled up  
**Then** March requirement is 50.75.

## Derive Aggregate AHT

**Given** groups have different contacts and AHT  
**When** portfolio AHT is shown  
**Then** it is contact-weighted through aggregate workload.

## Select Current Plan

**Given** a group has a budget and current update  
**When** current-plan rollup runs  
**Then** only the current update contributes planned values.

# Open Questions

1. Are any staffing groups non-additive due to shared staff?
2. Should rollups support currency or cost?
3. Which annual measures are sums versus monthly averages?

# Implementation Traceability

- `src/planner/annualPlanningRollup.js`
- `src/planningSummary.js`
- `src/components/PlanningHome.vue`
