# WFM Toolkit Sponsor Interview

Type answers beneath each `Answer:` field and leave the question IDs intact. Answers are preserved verbatim; agent interpretation and resulting product actions are recorded separately.

## Open questions

### INT-004 — Abandoned plan-lock recovery and takeover

- Status: Open
- Date asked: 2026-07-19
- Priority: High
- Related capability IDs/roadmap items: `CAP-DATA-002`, `CAP-ADMIN-001`, `CAP-GOV-001`, `NEXT-003`
- Decision this answer will influence: Who may recover a shared plan from an abandoned exclusive edit lock, whether a lock may expire automatically, and which warning or evidence must precede takeover.
- Why repository evidence cannot answer it: `INT-003` established exclusive editing, but the product has no user system or operational evidence for acceptable lock duration, administrator authority, crash recovery, or the risk of taking control from a planner who is still working.
- Question: Imagine a planner loses connection or closes their laptop while a plan is locked. How long may that plan remain unavailable, who should be allowed to release or take over the lock (the same planner, a WFM administrator, or an automatic timeout), and what warning or evidence should appear before takeover? An approximate duration and anonymized example are enough.
- Answer:
- Date answered:
- Agent interpretation: Pending owner answer; no timeout or takeover policy should be invented from the current local-only implementation.
- Product/roadmap action: Keep lock recovery and authorized release as explicit discovery gates in `NEXT-003`; continue safe local improvements without blocking on this answer.
- Applied date:

## Answers awaiting application

None.

## Applied/closed questions

### INT-005 — Scheduling and intraday product boundary

- Status: Applied
- Date asked: Sponsor supplied direction without a pending question on 2026-07-19
- Priority: Critical
- Related capability IDs/roadmap items: `CAP-SCHED-001`, `CAP-INTRA-001`, retired `LATER-001`, retired `LATER-002`, `RET-005`, `RET-006`
- Decision this answer will influence: Whether WFM Toolkit should expand into employee shift scheduling or same-day intraday operations management.
- Why repository evidence cannot answer it: These are strategic product-boundary decisions; their absence could otherwise be mis-scored as a high-priority capability gap.
- Question: Should WFM Toolkit provide employee scheduling or intraday management?
- Answer: I do not want this tool to schedule or do intra day management.
- Date answered: 2026-07-19
- Agent interpretation: Employee-level shift scheduling and same-day operational management are explicitly outside product scope. Interval-level Erlang calculations remain in scope only as a staffing-requirement method supporting capacity and longer-range planning.
- Product/roadmap action: Set both capability Need scores to 0 as out-of-scope, retired `LATER-001` and `LATER-002` as `RET-005` and `RET-006`, and instructed the scheduled agent not to revive them without new explicit sponsor direction.
- Applied date: 2026-07-19

### INT-003 — Shared planning ownership and conflict handling

- Status: Applied
- Date asked: 2026-07-19
- Priority: High
- Related capability IDs/roadmap items: `CAP-DATA-002`, `CAP-ADMIN-001`, `CAP-GOV-001`, `NEXT-003`
- Decision this answer will influence: Whether shared planning should enforce one active owner per staffing group/plan, support concurrent edits with conflict resolution, or preserve an explicit check-out/handoff workflow; it will also shape audit events and offline expectations.
- Why repository evidence cannot answer it: Runtime data is device-local and the relational artifacts define tables but not how real planners divide ownership, hand off work, recover competing edits, or decide which version is authoritative.
- Question: Think of a real annual-planning cycle where two planners or teams might touch the same staffing group or plan. Who owns the plan at each stage, how is work handed off today, what should happen if two people edit it at once, and does anyone need to work offline? An anonymized example is enough.
- Answer: This is a good question but we have not designed the user system yet. When a planner opens and edits a plan it should remain locked for others.
- Date answered: 7-19-2026
- Agent interpretation: Shared-user and tenancy design remains open, but the sponsor supplied one firm concurrency rule: opening a plan for editing must acquire an exclusive lock so other users cannot edit it concurrently. Lock ownership, timeout/renewal, crash recovery, administrator release, handoff, and offline behavior still require design and safety evidence.
- Product/roadmap action: Updated `NEXT-003` to require an exclusive edit-lock contract and recovery prototype before shared persistence implementation; kept cosmetic authentication and speculative role UI out of scope.
- Applied date: 2026-07-19

### INT-002 — Forecast acceptance decision and error evidence

- Status: Superseded
- Date asked: 2026-07-18
- Priority: High
- Related capability IDs/roadmap items: `CAP-FORE-002`, completed `NOW-005`, retired `RET-003`
- Decision this answer will influence: Which evidence, decision fields, and warning thresholds should govern a forecast acceptance workflow now that `NOW-005` supplies leakage-safe contact/AHT evidence, traceable overrides, saved-candidate comparison, and three-window rolling-origin stability.
- Why repository evidence cannot answer it: The forecasting implementation exposes model outputs, but no repository artifact identifies the sponsor's real accept/reject decision, planning horizon, tolerance for bias, or whether forecast misses are evaluated primarily by volume, workload, peak, or staffing consequence.
- Question: Think of the last time you accepted or rejected a demand forecast for an annual staffing plan. What decision were you making, what comparison or error evidence did you inspect (for example bias, WAPE, peak-month miss, workload/AHT miss, or staffing impact), over what holdout period, and what result would have caused you to reject the forecast? An anonymized example or approximate range is enough.
- Answer: I do not like this question. Skip it.
- Date answered: 2026-07-19
- Agent interpretation: The sponsor explicitly declined this interview path. The product should retain neutral forecast evidence already delivered and should not keep an acceptance workflow or thresholds active on the roadmap merely to force an unwanted governance decision.
- Product/roadmap action: Retired `NEXT-004` as `RET-003`; retained descriptive accuracy, bias, uncertainty, comparison, and stability evidence without automatic or recorded accept/reject policy. A future acceptance workflow requires new independent evidence and sponsor direction.
- Applied date: 2026-07-19

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
