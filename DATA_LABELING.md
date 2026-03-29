# Data Labeling Model

This file defines the canonical user-facing data labels for WFM Toolkit.

The goal is simple:
- use the same business terms everywhere
- make planner, dashboard, actuals, and calculator labels line up
- keep abbreviations limited to dense worksheets only

## Core Terms

- `Required Headcount`
  Use for demand-derived staffing requirement.

- `Roster Headcount`
  Use for the full roster / total staffed population.

- `Frontline Headcount`
  Use for productive frontline supply.

- `Required Agents`
  Use only in Erlang calculator surfaces for net staffing before shrinkage.

## Canonical Full Labels

Use these in cards, chart legends, section headers, dropdowns, helper text, empty states, dialogs, and non-dense tables:

- `Required Headcount`
- `Average Required Headcount`
- `Peak Required Headcount`
- `Peak Day Required Headcount`
- `Planned Required Headcount`
- `Actual Required Headcount`
- `Required Headcount Variance`
- `Required Staff Hours`
- `Starting Roster Headcount`
- `Starting Frontline Headcount`
- `Ending Roster Headcount`
- `Ending Frontline Headcount`
- `Hire Headcount`
- `Graduating Headcount`
- `Attrition Headcount`
- `In-Training Headcount`
- `Gap to Requirement`
- `Gap vs Actual Required Headcount`
- `Next January Starting Frontline Headcount Target`

## Dense Worksheet Short Forms

Use abbreviations only in narrow worksheet column headers where space is limited.

Allowed abbreviations:
- `Headcount` -> `HC`
- `Required` -> `Req`
- `Starting` -> `Start`
- `Ending` -> `End`

Canonical dense headers:
- `Avg Req HC`
- `Peak Req HC`
- `Peak Day Req HC`
- `Start Roster HC`
- `Start Frontline HC`
- `End Roster HC`
- `End Frontline HC`
- `Hire HC`
- `Graduating HC`
- `Attrition HC`
- `Req HC Variance`

## Terminology Rules

- Use `Required`, not `Needed`, for staffing requirement labels.
- Use `Roster`, not `Total`, when the metric represents the full staffed population.
- Use `Frontline`, not `Agents`, in planner surfaces.
- Keep `Agents` only for Erlang calculator outputs where the distinction between net staffing and shrinkage-adjusted headcount matters.
- Do not use `Headcount` in hour-based metrics. Use `Required Hours` language instead.

## Current Applied Examples

- Portfolio/dashboard:
  - `Average Required Headcount`
  - `Peak Required Headcount`
  - `Required Staff Hours`

- Planner requirement:
  - `Required Headcount`
  - `Peak Day Required Headcount`

- Staffing supply:
  - `Start Roster HC`
  - `End Frontline HC`
  - `Gap to Req`

- Actuals:
  - `Starting Frontline Headcount`
  - `Peak Actual Required Headcount`
  - `Peak Planned Required Headcount`

- Erlang/batch:
  - `Required Agents`
  - `Required Headcount`
  - `Peak Required Headcount`
  - `Total Required Hours (With Shrinkage)`

## If You Add New Labels

Before adding a new label, check whether the concept is already covered by one of the canonical terms above.

If a screen is dense enough to need shortened headers, use the approved short forms rather than inventing a new abbreviation.
