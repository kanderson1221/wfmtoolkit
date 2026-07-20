# WFM Toolkit Product Roadmap

Canonical strategy established 2026-07-18. Items are ordered for a desktop-first WFM planning product; Improvement Need comes from `WFM_CAPABILITY_ASSESSMENT.md`. Now stays small and executable. High-Need missing domains may remain Later when prerequisites or product-boundary decisions are unresolved.

## Now

### `NOW-001` — Honest empty and incomplete portfolio states — Completed

- Capability: `CAP-REP-002` (Need 45 after this run; 52 before)
- Planner outcome: a planning lead immediately knows whether selected-year portfolio outputs are authoritative and where to establish coverage.
- Problem/opportunity: centers with no applicable plans produced eight zero KPI tiles, twelve zero monthly rows, and an empty staffing chart that looked like a zero-demand plan.
- Rationale/evidence: `PORT-005` requires unknown headcount to remain unknown and groups without plans to stay distinct from zero demand; `PlanningHome.vue` previously rendered rollup initializer zeroes.
- Dependencies: organization hierarchy and plan-role selection.
- Proposed scope: withhold report-only surfaces when zero plans contribute, state coverage and actuals context, retain the command list, and provide a direct center action.
- Success measures: no report KPI/table/chart or export appears at 0-plan coverage; state says `0 of N`; one action opens the next setup center; populated report behavior is unchanged.
- Status: completed 2026-07-18, then superseded by sponsor direction `INT-001`; the portfolio report was removed under `RET-002`.
- Last reviewed: 2026-07-18.

### `NOW-002` — Atomic imported-forecast replacement preview — Completed

- Capability: `CAP-FORE-001` (Need 20 after this run; 32 before), `CAP-GOV-001` (Need 26)
- Planner outcome: a planner can replace an imported forecast only after seeing validation results and the exact impact on editable drafts while saved plan snapshots remain protected.
- Problem/opportunity: version deletion warnings are strong, but replacement acceptance and dependent-draft impact are not yet one explicit atomic review workflow.
- Rationale/evidence: `FIMP-007` and Workflow 2 require dependency review and atomic persistence; recent audit candidates repeatedly identify this gap.
- Dependencies: forecast repository contract, plan dependency lookup, immutable saved snapshots.
- Proposed scope: full pre-validation, version/draft impact preview, single atomic accept, failure recovery, focused persistence and UI tests; remove obsolete replacement branches exposed by the consolidation.
- Success measures: invalid imports write nothing; every affected draft is named; final plans remain unchanged; success replaces exactly one version and returns to its selected library row.
- Status: completed 2026-07-18. Replacement retains the selected forecast ID, names all dependent saved plans and states, preserves every plan snapshot, and keeps a failed candidate available for retry.
- Last reviewed: 2026-07-18.

### `NOW-003` — Portfolio partial-coverage decision state — Completed

- Capability: `CAP-REP-002` (Need 30 after this run; 45 before), `CAP-REP-001` (Need 20 after this run; 28 before)
- Planner outcome: leaders see which totals are partial, which groups are missing, and whether a metric is safe to use.
- Problem/opportunity: a portfolio with some plans still presents full totals; coverage is visible but the contributing and missing scope is not actionable near every authority-sensitive result.
- Rationale/evidence: `PORT-005` requires numerator, denominator, and missing scope; the new 0-plan state establishes the presentation boundary but not partial coverage.
- Dependencies: contributor identity from annual rollups and plan-role semantics.
- Delivered scope: centralized group-level inclusion evidence; open missing-group review with center actions and exclusion reasons; scoped KPI/table/chart language; invalid cross-scope variance withholding; actuals-only and out-of-year regressions.
- Success measures: users can name every excluded group from the report; no total implies full coverage; incomparable variance is unavailable; keyboard access and wide-table flow remain intact.
- Status: completed 2026-07-18, then superseded by `INT-001`; the portfolio report was removed under `RET-002` rather than extended with a threshold.
- Last reviewed: 2026-07-18.

### `NOW-004` — Side-by-side plan scenario comparison — Completed

- Capability: `CAP-SCEN-001` (Need 20 after this run; 32 before), `CAP-UX-001` (Need 32)
- Planner outcome: compare Budget and Updates across assumptions, demand, requirement, supply, and gaps without opening plans serially.
- Problem/opportunity: version lineage exists, but comparison is row-summary level rather than decision-grade.
- Rationale/evidence: plan library and current-plan roles are implemented; comparison is the highest-leverage extension of the annual planning core.
- Dependencies: stable plan snapshots and comparable requirement semantics.
- Delivered scope: Budget-versus-current default with selectable same-year saved plans; side-by-side annual outcomes and assumptions; material monthly exceptions; explicit incompatible-method withholding; complete 12-month CSV export.
- Success measures: two plans reconcile to their saved snapshots; changed assumptions and top staffing-gap movements are visible without tab switching.
- Status: completed 2026-07-18. Comparison is read-only, reconciles saved Workload Ratio and Intraday Erlang snapshots, and removes the cramped repeated per-row variance block.
- Last reviewed: 2026-07-18.

### `NOW-005` — Forecast accuracy and uncertainty review — Completed

- Capability: `CAP-FORE-002` (Need 20 after completion; 40 before), `CAP-UX-001` (Need 32)
- Planner outcome: forecast analysts can judge model fit, holdout performance, interval uncertainty, and manual overrides before saving a planning source.
- Problem/opportunity: one latest holdout could make a favorable model look stable without showing whether its advantage survived earlier historical cutoffs; saved configurations also lacked one comparable review surface.
- Rationale/evidence: forecasting modules exposed model components but initially lacked leakage-safe contact/AHT benchmarks, adjustment traceability, comparable saved candidates, and rolling-origin evidence. `INT-002` remains necessary only for the separate organizational acceptance decision.
- Dependencies: stable historical-data quality and forecast result schema; acceptance semantics informed by `INT-002` where practical.
- Delivered first slice: leakage-safe contact holdout scoring; modeled forecast versus an eight-week same-weekday training benchmark; aligned WAPE, MAE, mean bias, and interval coverage; explicit no-threshold interpretation; complete scored-day CSV; backward-compatible rerun guidance for older results.
- Delivered second slice: AHT assumptions stop at the contact training cutoff; the configured monthly method compares with a training-only weighted-average benchmark using contact-weighted AHT MAE/bias and workload error; incomplete scored-day coverage and daily CSV evidence are explicit.
- Delivered third slice: new and edited manual contact adjustments require a planning reason; legacy blank reasons remain visible; the monthly rollup reconciles baseline contacts, exact manual change, and final contacts from the adjusted daily rows instead of showing an unreconciled final total or per-rule estimate.
- Delivered fourth slice: two saved modeled configurations compare side by side only when their dated holdout actuals match exactly; WAPE, MAE, signed bias, interval coverage, weekday-benchmark context, and changed settings remain neutral evidence rather than an automatic decision.
- Delivered fifth slice: each modeled run scores the current holdout plus up to two earlier non-overlapping windows, using only training rows available at each cutoff; chronological model-versus-weekday metrics and a stability CSV reveal whether one holdout overstates reliability.
- Removed scope: repeated single-window scorer mechanics were consolidated; organizational warning thresholds and acceptance records are separated into `NEXT-004` because `INT-002` is required to define the real decision rather than inventing policy.
- Success measures: users can compare at least two saved configurations, identify bias/coverage limitations, and judge stability across up to three historical cutoffs without reading implementation details or receiving a fabricated acceptance result.
- Status: completed 2026-07-19; the first two production slices completed 2026-07-18 and the remaining three completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-006` — Consolidated trusted browser downloads — Completed

- Capability: `CAP-IO-001` (Need 20), supporting `CAP-DATA-001` (Need 20) and `CAP-UX-001` (Need 32)
- Planner outcome: backup, actuals-repair, forecast-review, scenario-comparison, and worksheet exports behave consistently without each workflow owning fragile browser mechanics.
- Problem/opportunity: generic CSV export already existed, but local backup and actuals-gap workflows repeated Blob, object-URL, anchor-click, cleanup, and filename-sanitizing code.
- Rationale/evidence: all three runtime object-URL implementations performed the same browser operation; duplicated cleanup could drift, and click failure bypassed URL revocation.
- Dependencies: existing backup and export contracts only; no persisted schema, route, or backend change.
- Delivered scope: one tested text-file primitive; CSV delegation; shared actuals-gap filename sanitation; guaranteed cleanup on click failure; removal of duplicate feature-page browser mechanics.
- Success measures: existing file contents, names, MIME types, and success/error states remain unchanged; all runtime browser downloads share one cleanup path; focused component and utility tests pass.
- Status: completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-007` — Focus-safe destructive confirmations — Completed

- Capability: `CAP-UX-001` (Need 32), supporting `CAP-GOV-001` (Need 26) and `CAP-DATA-001` (Need 20)
- Planner outcome: keyboard users enter every destructive or replacement confirmation on the safe action and return to the still-available initiating control after either close path.
- Problem/opportunity: the shared confirmation supplied no autofocus target, leaving focus behind the modal, and its visibility gate destroyed the underlying PrimeVue dialog before the focus-restoration transition could complete.
- Rationale/evidence: `FOUND-005`, `DATA-004`, and `SCREEN-WORKFLOWS` require keyboard-safe confirmations and focus restoration; repository inspection and a live nested clear-data workflow proved the wrapper contradicted that contract.
- Dependencies: existing shared `AppDialog`, PrimeVue focus trap/transition lifecycle, and visible initiator semantics only; no stored data, route, or calculation dependency.
- Delivered scope: Cancel autofocus; persistent managed dialog instance while hidden; unit coverage for the shared contract; Chromium cancel/confirm restoration coverage; clarified foundation, destructive-action, and workflow specifications.
- Success measures: Cancel is the initial focused control; cancel and confirm both restore the retained trigger; neither path changes existing action labels or data behavior; the dialog remains contained at 1280–1920 px and a 125%-zoom-equivalent viewport.
- Status: completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-008` — Traceable updated-plan decisions — Completed

- Capability: `CAP-SCEN-001` (Need 20), supporting `CAP-GOV-001` (Need 26), `CAP-DATA-001` (Need 20), and `CAP-UX-001` (Need 32)
- Planner outcome: a planning lead can identify why every newly created operating Update exists from the plan library and side-by-side review without reconstructing the decision from its name or cutoff.
- Problem/opportunity: Update plans retained source, Budget lineage, cutoff, and timestamps but no business rationale; identical-looking snapshots could not be tied to the approved event or assumption that created them.
- Rationale/evidence: the capability assessment named decision notes/formal change reasons as a saved-scenario governance gap; `ACT-004`/`ACT-006` and the modal, route seed, plan payload, local persistence, library row, and comparison path confirmed the missing field.
- Dependencies: existing immutable plan lineage and local schema only; no identity, calculation, forecast-acceptance, or server dependency. `INT-002` remains unrelated and Open.
- Delivered scope: required 240-character Update reason; trimmed domain validation; route-to-draft and editor-save continuity; IndexedDB/backup round trip; legacy missing-rationale fallback; plan-row and comparison evidence; autofocus and close-focus lifecycle; focused and Chromium coverage.
- Removed scope: implicit reasonless creation and the modal visibility gate that destroyed focus restoration; no notes entity, audit abstraction, dependency, or fabricated legacy migration was added.
- Success measures: blank reasons cannot create a new Update; saved reasons survive reload; legacy Updates remain usable; library and comparison name the evidence; Budget and WFM calculations are unchanged; the workflow remains contained at 1280–1920 px and a 125%-zoom equivalent.
- Status: completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-009` — Authoritative Intraday Erlang call-center rollup — Completed

- Capability: `CAP-REP-002` (Need 25 after this run; 30 before), supporting `CAP-REQ-002` (Need 24) and `CAP-UX-001` (Need 32)
- Planner outcome: a WFM lead can trust that call-center requirement and staffing-gap values use the selected plan's actual requirement method and can immediately identify every Intraday Erlang contributor that needs review.
- Problem/opportunity: the call-center rollup recomputed every plan through workload-ratio fields, even when the saved current plan used Intraday Erlang; it also derived actual requirement through the ratio path because actual Erlang outputs are not retained.
- Rationale/evidence: `PLAN-007` forbids silent formula substitution and requires stale outputs to be non-authoritative; `PLAN-012` requires stale, mixed-scope, and missing values to remain explicit. Repository inspection confirmed the aggregate bypassed saved Erlang outputs and their input signature.
- Dependencies: saved plan demand/calendar/service/intraday snapshots and existing Erlang input signature; no backend, schema, identity, or sponsor-policy dependency.
- Delivered scope: shared saved-result validation; current saved Erlang monthly output in planned rollups; missing/incomplete/stale withholding; mixed actual-requirement scope withholding; named group/plan review actions; preserved demand/workload evidence; removed unused duplicate call-center summary metrics.
- Success measures: workload-ratio output is never substituted for an Intraday Erlang plan; stale planned requirement and unretained actual requirement render unavailable; affected contributors are named; workload-ratio-only reports remain unchanged; focused, full, build, and Chromium checks pass.
- Status: completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-010` — Retained actual Intraday Erlang evidence — Completed

- Capability: `CAP-REQ-002` (Need 20 after this run; 24 before), `CAP-REP-002` (Need 20 after this run; 25 before), supporting `CAP-DATA-001` (Need 20)
- Planner outcome: a capacity planner runs actual-data Intraday Erlang once, saves the plan, and can reopen the same evidence; a WFM lead receives actual requirement and variance only while that evidence matches current inputs.
- Problem/opportunity: the editor calculated actual requirement in memory, but discarded it on reload and left call-center actual requirement unavailable even after a successful explicit run.
- Rationale/evidence: `ACT-003` requires an explicit actual-data run using saved plan assumptions; `PLAN-012` already withholds non-authoritative scope. The previous run documented retained actual results as the next coherent correctness and workflow gap.
- Dependencies: existing daily actuals, saved plan calendar/service/profile/overhead inputs, explicit planner API run, and shared result-signature contract; no identity, server persistence, or new formula dependency.
- Delivered scope: normalized saved actual result payload; draft/plan/Dexie/backup round trip; reload hydration without an API call; stale/incomplete withholding in the editor and call-center rollup; matching actual requirement and variance aggregation; focused specification and regression coverage.
- Removed scope: actuals-only raw JSON signatures, duplicate plan result cloning, and the obsolete product limitation that successful actual calculations could never contribute outside the open editor.
- Success measures: matching saved outputs survive reload and populate actual requirement; changed actuals or plan inputs withhold the values and request rerun; workload-ratio paths remain unchanged; focused, full, build, and Chromium checks pass.
- Status: completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-011` — Persistent call-center reconciliation context — Completed

- Capability: `CAP-UX-001` (Need 32), supporting `CAP-REP-001` (Need 20) and `CAP-REP-002` (Need 20)
- Planner outcome: a WFM lead can reconcile plan, actual workload, requirement, and staffing gaps across expanded staffing-group rows without losing column meaning or the active month.
- Problem/opportunity: the 12-column report used page scrolling for vertical review and a separate one-off horizontal shell, so its two-tier header and expanded-month aggregate disappeared during long contributor reviews.
- Rationale/evidence: `PLAN-012` requires chronological contributor reconciliation and contained native-table overflow; the prior two audits repeatedly deferred sticky two-tier header and month context as the highest remaining report UX opportunity.
- Dependencies: the retained call-center report and shared `AppTableShell`; no calculation, route, persistence, identity, or backend dependency.
- Delivered scope: one named keyboard-focusable scroll region; sticky Workload/Staffing and measure headers; sticky Month column; active expanded-month aggregate context; legible 70rem worksheet minimum; contained desktop overflow; shared table shell; focused and Chromium geometry regressions.
- Removed scope: the one-off report shell, duplicated backup-import setup in smoke tests, and obsolete phone-oriented screen behavior guidance. No mobile UI, new breakpoint abstraction, sticky plugin, or alternate report was added.
- Success measures: header and active month remain pinned during a 2,000+ px expanded review; Month remains pinned during horizontal scroll; no page-level horizontal overflow at 1280, 1440, 1920, or 1152 px zoom-equivalent review; report values and expansion semantics are unchanged.
- Status: completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-012` — Visible annual-plan readiness — Completed

- Capability: `CAP-UX-001` (Need 32), supporting `CAP-LRP-001` (Need 20) and `CAP-GOV-001` (Need 26)
- Planner outcome: annual capacity planners can scan which plan sections are ready, inherited but unreviewed, incomplete, or not started without opening each section serially.
- Problem/opportunity: the planner already computed decision-specific status for Forecasts, Agent Availability, Erlang/Variability, Demand Model, Staffing Plan, and Actuals, but its persistent workflow rail rendered only section titles. The finalization banner named one blocker while hiding the rest of the readiness map.
- Rationale/evidence: `PLAN-011` requires each section to expose status, detail, and first blocker; the hidden `statusLabel` values and ignored ready/attention tones made that contract incomplete. A separate tracked financial Budget panel was unreachable and promised methodology that `EXP-001` correctly leaves undefined.
- Dependencies: existing plan readiness calculations and workflow rail only; no persistence, route, formula, backend, identity, or sponsor-policy dependency.
- Delivered scope: visible non-color status text for all six workflow destinations; restrained ready/attention/default treatment; preserved current-step semantics and selection; focused and Chromium regressions; deletion of the unreachable financial placeholder and unused upcoming-state styling.
- Success measures: all workflow destinations expose their current status before selection; active section retains `aria-current`; finalization and calculations are unchanged; the workspace creates no page overflow at 1280, 1440, 1920, or 1152 px zoom-equivalent review.
- Status: completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-013` — Persistent staffing-supply decision context — Completed

- Capability: `CAP-UX-001` (Need 32), supporting `CAP-SUP-001` (Need 20) and `CAP-LRP-001` (Need 20)
- Planner outcome: an annual capacity planner can reconcile required headcount, opening supply, training and attrition movement, ending supply, and monthly gap without losing column or month meaning.
- Problem/opportunity: the 12-column supply roll-forward used one flat row of abbreviated headings and page scrolling, so headings disappeared during annual review and the operating stages had to be reconstructed from tooltips and column order.
- Rationale/evidence: `PLAN-008` requires all monthly requirement and supply movements to remain visible; `CAP-UX-001` identifies uneven persistent worksheet context, and live review measured a 614 px table beginning below the first desktop viewport.
- Dependencies: retained staffing roll-forward and shared `AppTableShell` only; no formula, route, persistence, backend, identity, or sponsor-policy dependency.
- Delivered scope: semantic Requirement, Opening Supply, Pipeline and Loss, Ending Supply, and Decision groups; one named keyboard-focusable contained region; sticky two-tier headings and Month column; readable 61rem minimum; month-specific attrition field names; focused and Chromium regressions.
- Removed scope: the worksheet's one-off assumption-table overflow shell. No alternate table, duplicated sticky component, mobile layout, calculation state, or migration was added.
- Success measures: all twelve months remain in one native worksheet; headings remain pinned during vertical review; Month remains pinned when a reduced desktop window needs horizontal scroll; no page overflow at 1280, 1440, 1920, 1152, or 1024 px; edit/read-only values and calculations are unchanged.
- Status: completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-014` — Monthly scenario driver attribution — Completed

- Capability: `CAP-SCEN-001` (Need 20), supporting `CAP-LRP-001` (Need 20) and `CAP-UX-001` (Need 32)
- Planner outcome: a planning lead comparing Budget with an Update can identify which monthly demand, calendar, availability, or random-loss assumptions caused requirement and staffing-gap movement.
- Problem/opportunity: annual-average paid-time, presence, occupancy, and adherence rows could hide offsetting monthly changes, while monthly exceptions showed staffing outcomes without the assumptions that caused them.
- Rationale/evidence: `PLAN-013` requires saved capacity assumptions and monthly exceptions, but the original review flattened assumptions to annual averages; a January decrease and February increase could cancel to “No change.”
- Dependencies: retained immutable plan snapshots and comparison calculation only; no schema, route, backend, identity, or sponsor-policy dependency.
- Delivered scope: monthly candidate-minus-baseline deltas for contacts, AHT, open days, paid hours, presence, occupancy, adherence, and peak-day uplift; average and peak-day requirement, ending supply, and gap outcomes; complete 12-month CSV evidence; focused and Chromium regressions.
- Removed scope: four masking annual-average capacity rows, their comparison-only averaging helper, and the duplicated contacts-only exception column. Plan-level lineage and starting positions remain.
- Success measures: driver-only monthly changes appear even when annual averages cancel; percentage changes use points and time/calendar/headcount units are explicit; incompatible requirement deltas remain withheld; the dialog stays contained at 1280, 1440, 1920, and 1152 px; saved plans remain immutable.
- Status: completed 2026-07-19.
- Last reviewed: 2026-07-19.

### `NOW-015` — Actuals open-date coverage authority — Completed

- Capability: `CAP-REP-002` (Need 17 after this run; 20 before), supporting `CAP-GOV-001` (Need 26) and `CAP-UX-001` (Need 32)
- Planner outcome: an annual capacity planner and WFM lead can distinguish observed monthly actuals from authoritative variance and staffing conclusions, with the exact calendar coverage needed to correct incomplete evidence.
- Problem/opportunity: a single loaded day was treated as a complete month for contacts, AHT, actual requirement, staffing variance, and call-center aggregation, so partial evidence could produce precise but materially misleading decisions.
- Rationale/evidence: bounded review of `actualsModel.js`, actual Erlang orchestration, plan updates, the Actuals worksheet, and `PLAN-012` found duplicate completeness logic and no shared authority gate. The saved plan already owns the operating-weekday and holiday snapshot needed for an exact test.
- Dependencies: retained daily actuals and saved plan calendar snapshot only; no schema, route, backend, identity, scheduling, or intraday-management dependency. `INT-004` is unrelated and remains Open.
- Delivered scope: shared expected-open-date coverage model; loaded/expected/missing evidence; complete-only contacts/AHT variance, actual requirement, staffing gap, actual Erlang, and call-center aggregate conclusions; direct Review Data correction path; grouped sticky desktop worksheet context.
- Removed scope: duplicate plan-update open-date enumeration, one-off Actuals table overflow shell, unsupported partial-month comparison values, and false zero summary values when no actual evidence exists.
- Success measures: partial months retain raw contacts/AHT/workload evidence while comparison and staffing conclusions render unavailable; complete months remain unchanged; saved calendar closures are excluded; coverage problems name the affected month/group; the worksheet stays contained and preserves headers/Month context at 1280, 1440, 1920, and reduced/zoom-equivalent desktop widths.
- Status: completed 2026-07-20.
- Last reviewed: 2026-07-20.

### `NOW-016` — Explicit opening and ending staffing gaps — Completed

- Capability: `CAP-SUP-001` (Need 20), supporting `CAP-SCEN-001` (Need 20), `CAP-REP-001` (Need 20), and `CAP-UX-001` (Need 32)
- Planner outcome: an annual capacity planner can distinguish a month that opens short from a planned month-end recovery instead of treating one unlabeled gap as both decisions.
- Problem/opportunity: the supply model already calculated opening and ending gaps, but the worksheet exposed only a generic opening-based Gap to Req; plan lists, reports, comparisons, and CSVs also used generic gap labels even when showing ending frontline supply beside them.
- Rationale/evidence: `PLAN-008` defines both formulas, while generic repository labels allowed an ending position to appear reconciled to an opening-position value. The opening gap is the retained report default; the ending gap is the close position after planned movements. Neither is misrepresented as time-weighted in-month capacity.
- Dependencies: retained staffing roll-forward and saved requirement snapshots only; no schema, route, backend, identity, scheduling, intraday-management, or sponsor-policy dependency. `INT-004` is unrelated and remains Open.
- Delivered scope: side-by-side opening and ending gap columns; opening/ending annual and monthly saved-plan comparison; explicit plan-library, call-center, dialog, and CSV basis labels; complete focused and Chromium regression coverage.
- Removed scope: generic Gap to Req, Avg Gap, Staffing gap change, and generic `staffing_gap` CSV fields. The legacy internal summary alias remains for saved-plan compatibility.
- Success measures: opening and ending gaps reconcile independently to the same requirement; negative values remain visible; reports name their opening-position basis; CSV fields name both bases; the 13-column worksheet and comparison stay contained at supported desktop and zoom-equivalent widths; stored plans remain migration-free.
- Status: completed 2026-07-20.
- Last reviewed: 2026-07-20.

## Next

### `NEXT-003` — Shared planning persistence discovery and migration design

- Capability: `CAP-DATA-002` (Need 71), `CAP-ADMIN-001` (Need 60)
- Planner outcome: teams can evaluate a safe path from device-local planning to governed shared work without risking current data.
- Problem/opportunity: runtime planning is local while relational schema artifacts exist; implementing authentication first would create a shell without collaboration semantics.
- Rationale/evidence: IndexedDB is robust for one user, but no concurrency, ownership, conflict, or tenancy model exists. Sponsor answer `INT-003` requires a plan to remain exclusively locked for other editors while one planner has it open for editing.
- Dependencies: product tenancy/user-system decision, event/audit model, offline stance, and an exclusive-lock lifecycle covering owner identity, acquisition, renewal, timeout, crash recovery, handoff, and authorized release (`INT-003`; takeover authority and timing pending `INT-004`).
- Proposed scope: architecture decision record, repository boundary, migration/reconciliation prototype, threat model, exclusive edit-lock and recovery prototype, and explicit non-goals—not a cosmetic sign-in screen.
- Success measures: validated migration round-trip; a second editor cannot mutate a locked plan; abandoned locks recover predictably without silent overwrite; ownership and staged rollout are documented.
- Status: discovery.
- Last reviewed: 2026-07-19.

## Later

### `LATER-003` — Governed collaboration and administration

- Capability: `CAP-ADMIN-001` (Need 60), `CAP-GOV-001` (Need 26)
- Planner outcome: role-appropriate access, approvals, ownership, and change history for shared plans.
- Problem/opportunity: local-device storage has no identity or separation of duties.
- Rationale/evidence: administration has little standalone value before shared persistence and tenancy exist.
- Dependencies: `NEXT-003` and audit/event model.
- Proposed scope: identity, roles, ownership, approvals, immutable audit events, recovery administration.
- Success measures: least-privilege policies and traceable plan changes pass security and data-recovery tests.
- Status: dependency-blocked.
- Last reviewed: 2026-07-19.

## Explore

### `EXP-001` — Labor cost and budget scenarios

- Capability: `CAP-FIN-001` (Need 60)
- Planner outcome: WFM and finance compare hiring, attrition, overtime, and vendor scenarios in labor-cost terms.
- Problem/opportunity: staffing decisions lack cost consequences, but currency, rate, burden, and vendor semantics are undefined.
- Rationale/evidence: add cost only after scenario comparison supplies a trusted operational basis.
- Dependencies: `NOW-004`, organization/currency decisions, data governance.
- Proposed scope: discovery and calculation contract; no implementation commitment yet.
- Success measures: finance-approved semantics and reconciled example scenarios.
- Status: explore.
- Last reviewed: 2026-07-19.

### `EXP-002` — Shared-pool and multi-skill staffing semantics

- Capability: `CAP-ORG-001` (Need 20), `CAP-REQ-002` (Need 20)
- Planner outcome: understand when staffing groups can be added independently and when shared capacity requires a network model.
- Problem/opportunity: call-center rollups assume independent additive groups.
- Rationale/evidence: `PLAN-012` carries this as an open question; changing it affects organization, Erlang, reporting, and scenarios.
- Dependencies: practitioner evidence and real routing examples.
- Proposed scope: domain research and reference cases only.
- Success measures: explicit supported/unsupported pooling rules and validated calculation direction.
- Status: explore.
- Last reviewed: 2026-07-19.

## Retired / Declined

### `RET-005` — Same-day intraday management — Declined

- Supersedes: `LATER-001`
- Capability: `CAP-INTRA-001` (Need 0 because it is outside supported product scope)
- Planner outcome: keep WFM Toolkit focused on planning requirements instead of becoming a real-time operations-management platform.
- Product boundary: interval Erlang calculations remain supported as a staffing-requirement method; live actual-vs-plan monitoring, adherence, same-day reforecasting, recovery actions, and operational action logs are excluded.
- Rationale/evidence: sponsor direction `INT-005` explicitly rejects intraday management.
- Dependencies: none.
- Success measures: roadmap and capability scoring do not treat the absent intraday workspace as a gap; no real-time operations surface is added without new explicit sponsor direction.
- Status: declined 2026-07-19.
- Last reviewed: 2026-07-19.

### `RET-006` — Employee shift scheduling — Declined

- Supersedes: `LATER-002`
- Capability: `CAP-SCHED-001` (Need 0 because it is outside supported product scope)
- Planner outcome: keep WFM Toolkit focused on forecasting, capacity requirements, and longer-range staffing plans rather than employee-level shift generation.
- Product boundary: employee, activity, shift, labor-rule, schedule optimization, and schedule-management workflows are excluded. Existing staffing requirements may be exported or integrated only if a later roadmap decision supports it.
- Rationale/evidence: sponsor direction `INT-005` explicitly rejects scheduling.
- Dependencies: none.
- Success measures: roadmap and capability scoring do not treat absent scheduling as a gap; no scheduling UI, optimizer, or employee-shift model is added without new explicit sponsor direction.
- Status: declined 2026-07-19.
- Last reviewed: 2026-07-19.

### `RET-001` — Phone planning layouts and navigation — Declined

- Capability: `CAP-UX-001` (Need 32, for desktop improvement—not phone support)
- Planner outcome: preserve desktop information density and avoid complexity that does not serve professional planning work.
- Problem/opportunity: phone-only breakpoints, hamburger navigation, card transformations, and touch states would add code while degrading dense worksheets.
- Rationale/evidence: the supported strategy is desktop/laptop at approximately 1280–1920 px with normal window resizing and zoom.
- Dependencies: none.
- Proposed scope: do not add phone planning work; remove mobile-only complexity when encountered and safe.
- Success measures: roadmap and tests stay focused on desktop workflows; no supported desktop behavior regresses.
- Status: declined by product direction.
- Last reviewed: 2026-07-19.

### `RET-002` — Cross-center portfolio reporting on planning home — Retired

- Capability: `CAP-REP-001` (Need 20), `CAP-REP-002` (Need 30), `CAP-UX-001` (Need 32)
- Planner outcome: reach and manage call centers without an unrelated cross-center report competing for attention; review aggregate results inside the owning call-center/staffing-group workflow.
- Problem/opportunity: the planning home accumulated a year selector, KPIs, incomplete-scope policy, monthly table, CSV, chart, and risk-ranked center rows even though the sponsor does not use this surface for portfolio reporting.
- Rationale/evidence: sponsor answer `INT-001` explicitly directs deletion and identifies existing staffing-group aggregate reporting as the right reporting location. `PlanningCenterView.vue` already provides selected-year aggregate reporting.
- Dependencies: retained call-center reporting contract `PLAN-012`.
- Retired scope: cross-center KPIs, selected-year home filter, partial-coverage disclosure, monthly operating report, portfolio CSV, staffing waterfall chart, report-derived center ranking/status/columns, and obsolete `PORT-001`–`PORT-005` specifications.
- Success measures: home contains only call-center identity, staffing-group count, operating schedule, and management actions; no cross-center report logic or orphaned report code remains; call-center aggregates are unchanged.
- Status: retired 2026-07-18 and implemented in response to `INT-001`.
- Last reviewed: 2026-07-19.

### `RET-003` — Governed forecast acceptance workflow — Declined

- Capability: `CAP-FORE-002` (Need 20), supporting `CAP-GOV-001` (Need 26)
- Planner outcome: retain decision-useful accuracy and stability evidence without imposing an unwanted acceptance questionnaire, universal threshold, or approval record.
- Problem/opportunity: the completed forecast workbench supplies neutral validation evidence, but a proposed follow-on required sponsor-specific acceptance semantics that repository evidence could not establish.
- Rationale/evidence: sponsor answer `INT-002` explicitly says to skip the acceptance question. Continuing to hold a governance workflow open would invent policy and keep an unwanted interview dependency alive.
- Dependencies: none for retirement; any future revival requires new sponsor direction and concrete decision evidence.
- Retired scope: `NEXT-004` decision states, required acceptance reason, selected-evidence approval snapshot, and organization-specific warning thresholds.
- Success measures: existing WAPE, MAE, bias, interval coverage, AHT/workload evidence, candidate comparison, and rolling-origin stability remain neutral; no automatic accept/reject result is introduced.
- Status: declined 2026-07-19 in response to `INT-002`.
- Last reviewed: 2026-07-19.

### `RET-004` — Speculative financial Budget workspace placeholder — Retired

- Capability: `CAP-FIN-001` (Need 60), supporting `CAP-UX-001` (Need 32)
- Planner outcome: the annual plan exposes only operational destinations that support a current decision; financial planning returns only after its accounting contract is defined.
- Problem/opportunity: an unreachable tracked component promised a future labor-cost workspace and displayed supply metrics as “budget preparation” without rates, currency, burden, overtime, vendor, or Finance reconciliation semantics.
- Rationale/evidence: `EXP-001` deliberately keeps labor-cost work in discovery. Retaining speculative UI would encourage a misleading partial feature and another navigation dialect.
- Dependencies: none for removal; any future financial workflow still depends on the decisions recorded in `EXP-001`.
- Retired scope: the unused `PlannerBudgetPanel` component and its unused upcoming-state navigation treatment. Budget plan lifecycle terminology and the financial capability itself remain intact.
- Success measures: no route or saved data changes; operational annual planning remains unchanged; future financial work begins from a validated calculation contract rather than the retired placeholder.
- Status: retired 2026-07-19.
- Last reviewed: 2026-07-19.

## Decision log

| Date | Decision |
|---|---|
| 2026-07-18 | Established the first capability baseline and roadmap because the required strategy artifacts were absent. |
| 2026-07-18 | Completed `NOW-001`: no-plan portfolio initializer zeroes are no longer presented as an operating report. |
| 2026-07-18 | Completed `NOW-002`: imported daily forecast replacement now validates and previews one exact version, names dependent plan states, persists atomically, and never refreshes plan snapshots automatically. |
| 2026-07-18 | Promoted `NOW-003` partial portfolio coverage to Ready after the forecast-replacement dependency and workflow slice completed. |
| 2026-07-18 | Completed `NOW-003`: partial portfolio reports now name excluded groups, scope plan-derived outputs, and withhold cross-scope variance. |
| 2026-07-18 | Promoted side-by-side plan scenario comparison from `NEXT-001` to ready `NOW-004`; stable plan snapshots now support the work. |
| 2026-07-18 | Kept employee scheduling and intraday management out of Now despite high Need scores because data/integration prerequisites and product-boundary decisions are unresolved. |
| 2026-07-18 | Declined phone-specific planning work; desktop/laptop workflow quality is the supported UX target. |
| 2026-07-18 | Applied `INT-001` and retired cross-center portfolio reporting from the planning home. Earlier `NOW-001`/`NOW-003` integrity work remains preserved as completed history but its product surface was superseded; aggregate reporting stays inside call centers under `PLAN-012`. |
| 2026-07-18 | Completed the fifth-run strategic portfolio review and `NOW-004`: saved same-year plans now compare assumptions, outcomes, monthly exceptions, and exports without mutating snapshots or comparing incompatible requirement semantics. |
| 2026-07-18 | Promoted forecast accuracy and uncertainty review from `NEXT-002` to ready `NOW-005`; added `INT-002` to establish the sponsor's real forecast-acceptance decision before choosing metric emphasis. |
| 2026-07-18 | Delivered the first `NOW-005` slice: holdout results now compare the modeled forecast with a leakage-safe weekday benchmark using WAPE, MAE, bias, interval coverage, and complete daily export. Acceptance thresholds and multi-configuration governance remain pending `INT-002`. |
| 2026-07-18 | Delivered the second `NOW-005` slice: AHT assumptions no longer learn from contact holdout dates, and the AHT tab now reports contact-weighted error and workload consequence against a training-only benchmark. Scores remain calibrated while governed comparison remains pending `INT-002`. |
| 2026-07-19 | Delivered the third `NOW-005` slice: future-volume overrides now retain a required decision reason and reconcile monthly baseline, exact manual change, and final contacts; legacy blank reasons remain visible without fabricated migration data. |
| 2026-07-19 | Delivered the fourth `NOW-005` slice: saved modeled forecasts now compare metrics and configuration only after verifying identical dated holdout actuals; no threshold or acceptance result is invented while `INT-002` remains Open. |
| 2026-07-19 | Completed `NOW-005` with rolling-origin stability across up to three leakage-safe historical cutoffs; moved the sponsor-specific acceptance decision to `NEXT-004` pending `INT-002` and improved `CAP-FORE-002` from Need 25 to 20. |
| 2026-07-19 | Completed `NOW-006`: all runtime text/CSV/JSON downloads now use one tested browser lifecycle, and duplicate backup/actuals-gap mechanics and filename sanitation were removed without changing planner-visible exports. |
| 2026-07-19 | Completed required code-review remediation `NOW-007`: destructive confirmations now focus the safe Cancel action and preserve the managed close lifecycle so both cancel and confirm restore a retained initiator. |
| 2026-07-19 | Completed the fifth-run strategic portfolio review and `NOW-008`: newly created plan Updates now require and persist a decision reason, legacy Updates remain explicit, and modal focus is safe. High-Need missing domains remain sequenced behind their documented prerequisites; added `INT-003` for shared-work ownership/conflict evidence. |
| 2026-07-19 | Applied `INT-002` by retiring the unwanted governed forecast-acceptance direction as `RET-003`; retained neutral forecast evidence without inventing thresholds or approval policy. |
| 2026-07-19 | Applied `INT-003`: shared-plan discovery must implement exclusive edit locking plus explicit acquisition, renewal, recovery, handoff, and release behavior before shared persistence ships. |
| 2026-07-19 | Completed `NOW-009`: call-center rollups now validate and use current saved Intraday Erlang results, withhold stale/missing and mixed-scope requirement values, name affected plans, and remove unused duplicate summary metrics. |
| 2026-07-19 | Completed `NOW-010`: explicit actual-data Erlang results now survive plan save, draft restore, IndexedDB/backup round trips, and reload; matching evidence contributes to call-center actual requirement and variance while stale or incomplete results remain withheld. |
| 2026-07-19 | Completed the fifth-run strategic portfolio review and `NOW-011`: call-center reconciliation now retains its two-tier headings, Month column, and active expanded-month aggregate inside one keyboard-scrollable table; high-Need missing domains remain sequenced behind their prerequisites, and `INT-004` targets abandoned-lock recovery for `NEXT-003`. |
| 2026-07-19 | Completed `NOW-012`: the annual-plan workflow rail now exposes all existing section readiness labels in text; retired the unreachable speculative financial placeholder as `RET-004` while keeping labor-cost planning in `EXP-001`. |
| 2026-07-19 | Applied sponsor direction `INT-005`: retired same-day intraday management as `RET-005` and employee shift scheduling as `RET-006`; interval Erlang remains a capacity-planning method, not an intraday-management commitment. |
| 2026-07-19 | Completed `NOW-013`: the monthly staffing-supply roll-forward now groups its decision stages and retains both heading tiers and Month context inside one contained keyboard scroll region; calculations and saved data remain unchanged. |
| 2026-07-19 | Completed `NOW-014`: saved-plan comparison now attributes monthly requirement, peak, supply, and gap movement to exact demand and capacity drivers; misleading annual-average capacity rows were removed. |
| 2026-07-20 | Completed required code-review remediation `NOW-015`: actuals comparisons, actual requirements, staffing gaps, Erlang runs, and call-center aggregates now require exact saved-calendar open-date coverage; duplicate coverage logic and misleading empty zeros were removed. |
| 2026-07-20 | Completed `NOW-016`: staffing supply and saved-plan comparison now distinguish opening capacity risk from ending post-movement position; generic UI and CSV gap labels were retired without changing stored data or the opening-risk basis. |
