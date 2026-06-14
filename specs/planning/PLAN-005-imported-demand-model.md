---
id: PLAN-005
title: Imported-Forecast Monthly Demand Model
status: draft
owners: []
depends_on: [FIMP-008, PLAN-003, PLAN-004]
last_reviewed: 2026-06-14
---

# Purpose

Define how a plan presents and uses the imported forecast snapshot as its monthly demand basis.

# Monthly Demand Record

Each month shall contain:

- month identity
- imported contacts
- imported or aggregated AHT seconds
- workload hours
- average daily contacts when available
- peak daily contacts and uplift when available
- source coverage status
- requirement-method outputs

# Functional Requirements

- Forecast-backed contacts and AHT shall be read-only within the plan.
- The plan shall identify the source forecast version and snapshot time.
- Daily source demand shall be filtered to plan open days.
- Monthly-only forecasts shall use their accepted monthly totals without fabricated daily shape.
- Source gaps or unavailable AHT shall block dependent calculation and finalization.
- Update plans shall distinguish actualized months from forecast months.

# Demand Formulas

```text
workload hours = contacts * AHT seconds / 3600

average daily contacts =
  open-day contacts / included open forecast days

peak daily contacts =
  maximum included open-day contacts
```

For monthly-only input, average and peak daily measures remain unavailable unless the import contract provides them.

# Traceability Requirements

- Every displayed month shall be traceable to a snapshot month.
- The plan shall state whether demand came from forecast or actuals.
- Replacing an external forecast shall not alter saved monthly records.
- Manual editing of forecast-backed contacts is not supported.

# Acceptance Scenarios

## Use Open-Day Demand

**Given** a daily forecast contains demand on a closed holiday  
**When** monthly plan demand is calculated  
**Then** the closed-date contacts are excluded  
**And** source data remains unchanged.

## Keep Forecast Values Read-Only

**Given** a plan uses an imported snapshot  
**When** the planner reviews monthly demand  
**Then** contacts and AHT cannot be edited as manual plan inputs.

## Identify Incomplete AHT

**Given** July has contacts but no accepted AHT  
**When** requirement is evaluated  
**Then** July is blocked with an AHT-specific message.

# Open Questions

1. Are explicit plan-level demand adjustments ever allowed?
2. Should closed-date source demand be reported separately?
3. How should forecast bounds appear in the demand worksheet?

# Implementation Traceability

- `src/planner/demandSources.js`
- `src/planner/demandModel.js`
- `src/components/planner/PlannerForecastPanel.vue`
- `src/components/planner/PlannerMonthlyPlanTab.vue`

