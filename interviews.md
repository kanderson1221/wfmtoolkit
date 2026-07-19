# WFM Toolkit Sponsor Interview

Type answers beneath each `Answer:` field and leave the question IDs intact. Answers are preserved verbatim; agent interpretation and resulting product actions are recorded separately.

## Open questions

### INT-002 — Forecast acceptance decision and error evidence

- Status: Open
- Date asked: 2026-07-18
- Priority: High
- Related capability IDs/roadmap items: `CAP-FORE-002`, `NOW-005`
- Decision this answer will influence: Which holdout periods, additional candidate configurations, acceptance record, and warning thresholds should govern the remaining `NOW-005` workflow after leakage-safe contact and AHT benchmark slices.
- Why repository evidence cannot answer it: The forecasting implementation exposes model outputs, but no repository artifact identifies the sponsor's real accept/reject decision, planning horizon, tolerance for bias, or whether forecast misses are evaluated primarily by volume, workload, peak, or staffing consequence.
- Question: Think of the last time you accepted or rejected a demand forecast for an annual staffing plan. What decision were you making, what comparison or error evidence did you inspect (for example bias, WAPE, peak-month miss, workload/AHT miss, or staffing impact), over what holdout period, and what result would have caused you to reject the forecast? An anonymized example or approximate range is enough.
- Answer:
- Date answered:
- Agent interpretation:
- Product/roadmap action:
- Applied date:

## Answers awaiting application

None.

## Applied/closed questions

### INT-001 — Decision threshold for partial portfolio totals

- Status: Applied
- Date asked: 2026-07-18
- Priority: High
- Related capability IDs/roadmap items: `CAP-REP-001`, `CAP-REP-002`, `CAP-UX-001`, completed-then-superseded `NOW-001` and `NOW-003`, `RET-002`
- Decision this answer will influence: Whether a future portfolio reporting policy should withhold explicitly scoped plan totals below a minimum plan-coverage threshold.
- Why repository evidence cannot answer it: The specifications require partial coverage disclosure but do not establish which leadership decisions, if any, become unsafe below a particular coverage level.
- Question: Think of a real annual portfolio review where only some staffing groups have selected-year current plans. Should WFM Toolkit (A) show plan-derived totals whenever at least one group is planned, provided every missing group is named and cross-scope comparisons are withheld, or (B) withhold those totals below a specific coverage threshold? If B, what threshold and which decision would be unsafe below it?
- Answer: I think the portfolio reporting on the portfolio homescreen should be deleted entirely. The only think that should remain is a list of call centers. The staffing groups have aggregate reporting already.
- Date answered: 07/18/2026 06:49p,
- Agent interpretation: The sponsor rejected the premise that cross-center reporting belongs on the home screen. The home should optimize organization selection and management; selected-year aggregate reporting remains inside the call-center/staffing-group planning workflow where scope and decisions are explicit.
- Product/roadmap action: Replaced the portfolio home with a call-center directory; removed its year selector, KPIs, partial-coverage review, monthly report, CSV, chart, risk ranking, report-specific tests and specifications; retained call-center aggregate reporting under `PLAN-012`; retired the cross-center reporting direction as `RET-002`.
- Applied date: 2026-07-18
