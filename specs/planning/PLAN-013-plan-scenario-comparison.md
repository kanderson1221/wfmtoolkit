---
id: PLAN-013
title: Saved Annual Plan Scenario Comparison
status: draft
owners: []
depends_on: [PLAN-001, PLAN-006, PLAN-007, PLAN-008, ACT-004, ACT-006]
last_reviewed: 2026-07-18
---

# Purpose

Define a decision-safe comparison between two saved annual plans for the same staffing group and planning year.

# Comparison Scope

- Comparison shall use saved plan snapshots and shall not mutate, refresh, or re-save either plan.
- The default baseline shall be the Budget plan.
- The default candidate shall be the current Update when one exists, otherwise another same-year saved plan.
- The planner may select any two saved plans within that planning year.
- Candidate-minus-baseline shall be the stated delta direction.

# Required Evidence

The comparison shall identify:

- plan names, types, current status, planning year, actuals-through month, and demand-source lineage
- requirement method and saved capacity assumptions, including paid hours, presence, occupancy, adherence, and starting headcount
- annual demand, workload, required hours, required headcount, ending frontline headcount, and staffing gap
- monthly exceptions in demand, required headcount, ending frontline supply, and staffing gap
- the unit for each measure and whether a value is unavailable

Monthly calculations shall reconcile to each saved snapshot, including stored intraday Erlang results where applicable. The comparison shall not silently use current staffing-group defaults in place of saved plan inputs.

# Method Compatibility

- Contacts and workload may be compared across requirement methods.
- Requirement, supply-gap, and staffing-risk deltas shall be shown only when both plans use the same requirement method.
- When methods differ, the interface and export shall explicitly withhold those deltas rather than implying mathematical comparability.
- Withheld values shall remain blank or named as not comparable; they shall not be exported as zero.

# Desktop Presentation And Export

- The plan library shall provide a visible comparison action when at least two same-year plans exist.
- Comparison shall use a keyboard-operable dialog with visible baseline and candidate labels.
- Annual outcomes, assumptions, and monthly exceptions shall use native tables with contained horizontal overflow.
- Changed assumptions shall be named with text and shall not rely on color alone.
- CSV export shall include all 12 monthly rows so a planner can reconcile displayed exceptions to the complete saved comparison.

# Acceptance Scenarios

## Compare Budget To Current Update

**Given** a Budget and a current March Update exist for one staffing group and year  
**When** the planner opens Compare Plans  
**Then** Budget is selected as baseline  
**And** the current Update is selected as candidate  
**And** annual, assumption, and material monthly changes are visible without opening either plan.

## Withhold Incompatible Requirement Deltas

**Given** the Budget uses Workload Ratio and the Update uses Intraday Erlang  
**When** the plans are compared  
**Then** demand and workload deltas remain available  
**And** requirement, staffing supply, and staffing-gap deltas are named as not comparable  
**And** the CSV leaves those delta fields blank.

## Preserve Saved Plans

**Given** two finalized saved plans  
**When** a comparison is reviewed and exported  
**Then** neither plan, current-plan selection, forecast snapshot, nor staffing input is written or changed.

# Implementation Traceability

- `src/planner/planScenarioComparison.js`
- `src/components/planning/PlanningPlanComparisonDialog.vue`
- `src/components/planning/PlanningCenterView.vue`
- `src/planner/__tests__/planScenarioComparison.spec.js`
- `src/components/__tests__/PlanningPlanComparisonDialog.spec.js`
