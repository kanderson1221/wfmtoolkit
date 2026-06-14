---
id: PLAN-010
title: Cross-Year Headcount and Training-Class Handoff
status: draft
owners: []
depends_on: [PLAN-008, PLAN-009, PLAN-001]
last_reviewed: 2026-06-14
---

# Purpose

Define how one year's ending staffing position and cross-year training activity seed the next annual plan.

# Opening Position Rules

The next plan shall resolve opening values in this order:

1. explicit next-year opening values saved on the prior plan
2. prior plan ending roster and frontline summary
3. locally entered opening values when no prior plan is available

Frontline opening shall not exceed roster opening.

# Training Carry-In Rules

- A class hired in the prior year and not frontline-ready before the next year shall carry into the next plan.
- Inherited classes shall retain source plan and source year.
- Prior-year hires shall not be counted as new-year hires.
- Their graduation, fallout, in-training, and frontline-ready movements shall appear in the applicable new-year months.
- Classes fully frontline-ready before the new year shall not carry in.
- A class shall not be inherited twice.

# Functional Requirements

- The planner shall be told when opening values are inherited.
- Explicit overrides shall be distinguishable from derived values.
- Changing the prior plan shall not silently rewrite an already saved next-year plan.
- Handoff recalculation for an editable draft shall require an explicit refresh or recreation.
- Cross-year dates and outcomes shall be persisted when needed for deterministic carry-in.

# Acceptance Scenarios

## Use Explicit Handoff

**Given** the prior plan saves next-year opening roster 120 and frontline 105  
**When** the next plan is created  
**Then** those values take precedence over the prior December summary.

## Carry a Late Class

**Given** a December class becomes frontline-ready in January  
**When** the next-year plan is created  
**Then** the class appears as inherited  
**And** does not add new-year hire headcount.

## Preserve a Saved Next-Year Plan

**Given** a next-year plan already exists  
**When** the prior plan changes  
**Then** the existing plan remains unchanged until explicit refresh.

# Open Questions

1. Which prior plan is used when multiple updates exist?
2. May planners break the inherited linkage?
3. Should explicit next-year targets generate late-year training recommendations?

# Implementation Traceability

- `src/planner/annualPlanHandoff.js`
- `src/planner/staffingModel.js`
- `src/composables/useMonthlyPlanBuilder.js`

