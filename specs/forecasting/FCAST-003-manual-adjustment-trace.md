---
id: FCAST-003
title: Traceable Manual Demand Adjustments
status: implemented
owners: []
depends_on: [FCAST-001]
supersedes: []
last_reviewed: 2026-07-19
---

# Purpose

This specification defines how a forecast analyst records and reviews manual
changes to future modeled daily contacts. Manual adjustments are planning
judgments rather than model evidence, so the workbench must preserve their
rationale and reconcile baseline demand to the final forecast used downstream.

# Planner Decision

The analyst decides whether a known future event or approved assumption
justifies changing baseline contacts. The workflow must answer what changed,
why it changed, which dates it affects, and how the change alters each monthly
contact total.

# Adjustment Rule Contract

- A new or edited rule shall require a non-zero value, an in-horizon date
  range, and a visible decision reason.
- The decision reason shall describe the business event or approved assumption;
  it is not a model-training input.
- Existing stored rules without a reason shall remain applied and readable.
  The application shall label them as legacy records with missing rationale and
  shall not invent, backfill, or silently discard a reason.
- Delta, percent, and set-value rules shall continue to apply to the retained
  baseline daily forecast using the existing deterministic rule semantics.
- Editing a legacy rule shall require a reason before it can be saved again.

# Monthly Reconciliation

For each forecast month:

- `baseline contacts = Σ baseline daily forecast`
- `manual change = Σ(final daily forecast - baseline daily forecast)`
- `final contacts = baseline contacts + manual change`

The monthly rollup shall display all three values whenever at least one manual
rule exists. Values shall be derived from the same adjusted daily rows used by
the chart and downstream monthly rollup; a separate estimate is not
authoritative.

# Desktop Workflow and Accessibility

- The range-rule editor shall keep visible labels for start, end, type, value,
  and decision reason.
- Invalid draft state shall be explained as text and not by a disabled action
  or color alone.
- The rule list shall show each stored reason and affected-day count in a native
  semantic table with contained horizontal overflow.
- Exact total impact remains in the workbench summary. A per-rule estimated
  impact shall not be shown because overlapping rule semantics can make
  standalone estimates fail to reconcile to the final forecast.
- Monthly baseline, manual change, and final contacts shall use stable,
  right-aligned numeric columns for desktop comparison.

# Acceptance Scenarios

1. A non-zero rule without a reason cannot be added and the missing reason is
   stated in text.
2. Adding or editing a rule preserves its trimmed reason and displays it in the
   rule table.
3. A saved legacy rule without a reason continues to affect results, is labeled
   `Not recorded (legacy rule)`, and cannot be resaved without a reason.
4. Positive and negative monthly manual changes reconcile exactly from
   baseline contacts to final contacts.
5. Removing all rules restores the ordinary single Contacts column and does
   not mutate the retained model run.

# Implementation Traceability

- Rule normalization and monthly reconciliation:
  `src/forecasting/forecastProjection.js`
- Desktop rule editor:
  `src/components/forecasting/ForecastingManualAdjustmentsDock.vue`
- Monthly trace:
  `src/components/forecasting/results/ForecastMonthlyRollupView.vue`
- Domain and workflow tests: `src/forecasting/__tests__/shared.spec.js`,
  `src/components/__tests__/ForecastingWorkspace.spec.js`
