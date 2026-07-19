# Call-center reports now preserve Intraday Erlang requirement authority

Run type: product improvement

## Capability, roadmap, and interview scope

- Primary capability: `CAP-REP-002` reporting integrity.
- Supporting capabilities: `CAP-REQ-002` interval Erlang requirements and `CAP-UX-001` desktop operational workflows.
- Roadmap: completed `NOW-009` — Authoritative Intraday Erlang call-center rollup; retired `NEXT-004` as `RET-003` after sponsor answer `INT-002`; refined `NEXT-003` after sponsor answer `INT-003`.
- Planner persona: WFM lead or capacity planner reviewing selected-year results across independently additive staffing groups inside one call center.
- Planner decision: determine whether planned and actual requirement/headcount and staffing-gap results are authoritative enough to drive staffing action.
- Desktop workflow: Call Centers → open call center → Call Center Plan → review monthly totals → expand a month or open the named plan requiring recalculation/review.

## Opportunity and evidence

The retained call-center report recomputed every selected plan with `computeMonthlyRecords` and never merged saved Intraday Erlang outputs. An Intraday Erlang plan therefore appeared with workload-ratio requirement values even though `PLAN-007` explicitly prohibits silent formula substitution. The same report passed no actual Erlang outputs to `computeActualsRecords`, causing actual requirement to fall back to the workload-ratio formula as well. The stored plan already carried monthly/daily Erlang outputs and an input signature, but the validation contract was private to the editor composable.

`CAP-REP-002` named stale, mixed-scope, and error integrity as the highest executable retained-report gap at Need 30. `CAP-REQ-002` had strong numerical conformance but only adequate workflow integration. `PLAN-007`, `PLAN-012`, the implementation path, and executable tests supplied enough evidence to correct this without sponsor policy or a backend/schema change.

## Product disposition and WFM rationale

Disposition: improve the retained report, consolidate the Erlang result contract, and remove unused duplicate summary computation.

- Planned Intraday Erlang requirement is reportable only when a complete stored result has an input signature matching the saved plan's current daily/interval inputs.
- Monthly Erlang staffed hours are the sum of interval required agents × interval hours.
- Gross required staff hours remain `saved net Erlang staffed hours × (1 / design factor share)`.
- Monthly required headcount remains `gross required staff hours / paid hours in the month`.
- Contacts and workload remain reportable when requirement is stale: workload hours remain `contacts × AHT seconds / 3,600`.
- Missing, incomplete, or stale stored results set planned requirement, peak requirement, and requirement-dependent staffing gaps to unavailable; they never substitute workload-ratio outputs.
- An aggregate monthly planned requirement is available only when every selected planned contributor has authoritative requirement for that month.
- An aggregate monthly actual requirement is available only when every contributor with actuals has actual requirement. Intraday actual results are not persisted, so affected actual requirement and variance remain unavailable.
- Zero remains distinct from unavailable. No demand, AHT, calendar, availability, adherence, occupancy, Erlang engine, staffing-supply, or plan-selection formula changed.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-REP-002` | `5/3/3/4/4/4` | 30 | `5/3/4/4/4/4` | 25 | The retained call-center report now respects requirement methods, validates stale saved Erlang results, withholds mixed actual-requirement scope, and names correction paths. Other report error-state consistency remains uneven. |
| `CAP-REQ-002` | `5/4/4/3/4/4` | 24 | unchanged | 24 | Saved planned results now integrate correctly into reporting, but backend round trips and unretained actual Erlang results still create workflow friction. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | Affected plans receive visible text and direct actions, but product-wide sticky context, shortcuts, focus, and zoom consistency remain uneven. |

## Standards and review findings

- `AGENTS.md`: no direct PrimeVue feature import, legacy semantic class, page-local behavioral primitive, or generic data-table dependency was added.
- `FRONTEND_STANDARDS.md`: the retained native table, shared `AppStatusMessage`, `AppButton`, master/detail shell, and contained overflow remain the visual and accessibility paths.
- Accessibility: each affected group and plan is named in text; unavailable values use an em dash rather than color; correction links have group-specific accessible names; existing keyboard month expansion remains intact.
- Data safety: saved plan snapshots are read-only; signatures are evaluated without migration or mutation; no stored data or result is silently repaired, discarded, or reinterpreted.
- Correctness: stale, missing, incomplete, and mixed actual-requirement scope are withheld. Current workload-ratio-only reporting behavior is unchanged.
- Engineering health: signature hashing, result normalization, and completeness assessment moved from the editor composable into the pure planner module and are reused by both editor and report.
- Dead code: removed the unused call-center row-summary and stat-strip metric construction, plus its formatters and return surface; the template had used only `callCenterSummaryRows.length` as a group-existence test.

## Scope, plan, and acceptance criteria

1. Extract one pure saved-Erlang result signature, normalization, and completeness assessment contract.
2. Resolve selected plans by their actual requirement method during annual rollup.
3. Merge only current saved Erlang outputs; withhold non-authoritative planned and actual requirement scope.
4. Surface named group/plan issues with direct plan actions in the existing desktop report.
5. Remove unused duplicate call-center summary calculations.
6. Update executable tests, normative specifications, strategy, interviews, and audit history.

Acceptance criteria:

- A current signature-matched Intraday Erlang plan uses its saved monthly Erlang outputs in the call-center requirement.
- Changing an Erlang-driving saved input makes requirement and staffing-gap totals unavailable while contacts/workload remain visible.
- Actual Intraday Erlang requirement is unavailable rather than computed with workload ratio.
- Partial actual requirement across mixed methods is not presented as the call-center total.
- Every affected contributor is named and links to its owning plan.
- Workload-ratio reports and existing plan/editor Erlang behavior do not regress.
- The dense report remains contained and readable at supported desktop widths and zoom equivalents.

## Implementation and removals

- Added pure `buildPlannerIntradayErlangInputSignature`, `normalizePlannerIntradayErlangResults`, and `assessPlannerIntradayErlangResults` contracts to `src/planner/intradayErlang.js`.
- Reused that contract in `usePlannerIntradayErlang.js`, including explicit incomplete-month detection.
- Added requirement-method-aware records and contributor integrity evidence to `annualPlanningRollup.js`.
- Withheld monthly/annual requirement and gaps when contributor scope is not complete; preserved demand, workload, supply position, and actual data.
- Added a compact report-scope message and per-plan review/recalculation actions to `PlanningCenterView.vue`.
- Removed 156 lines of unused call-center summary/metric computation from `usePlanningCenterWorkspace.js` and replaced it with a small issue-link projection.
- No route, schema, migration, backend, dependency, plan-selection, or stored-data change was required.

## Files and compatibility

- Planner logic: `src/planner/intradayErlang.js`, `src/planner/annualPlanningRollup.js`.
- Orchestration/UI: `src/composables/monthlyPlanBuilder/usePlannerIntradayErlang.js`, `src/composables/planning/usePlanningCenterWorkspace.js`, `src/components/planning/PlanningCenterView.vue`.
- Tests: `src/planner/__tests__/annualPlanningRollup.spec.js`, `src/components/__tests__/PlanningCenterView.spec.js`; existing Erlang suites also exercised the consolidation.
- Specifications: `specs/planning/PLAN-007-intraday-erlang-requirement.md`, `specs/planning/PLAN-012-call-center-reporting.md`, `specs/README.md`.
- Strategy/interviews: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, `interviews.md`.
- Legacy plans with results but no valid signature remain usable in their editor and now receive an explicit report recalculation path; no fabricated signature is migrated.

## Exact verification

- Focused: `npx vitest run src/planner/__tests__/intradayErlang.spec.js src/composables/monthlyPlanBuilder/__tests__/usePlannerIntradayErlang.spec.js src/planner/__tests__/annualPlanningRollup.spec.js src/components/__tests__/PlanningCenterView.spec.js` — passed, 4 files and 45 tests.
- Full: `npm run verify:full` — passed.
- Lint: `eslint . --ext .js,.mjs,.vue` — passed.
- Frontend standards: `node scripts/check-frontend-standards.mjs` — passed.
- Vitest: 80 files and 421 tests passed.
- Production build: Vite transformed 837 modules and completed successfully.
- Chromium: 18 Playwright tests passed.
- `git diff --check` — passed.

## Desktop review

The local call-center report was reviewed in the in-app browser with representative persisted demand, actuals, one planned group, and one unplanned group.

- 1280 × 900: page width 1265 px with no page overflow; table shell client/scroll width both 926 px; split panes, header actions, and 12-column report remained aligned and scanable.
- 1440 × 900: page width 1425 px with no page overflow; table shell client/scroll width both 1086 px.
- 1920 × 1080: page width 1905 px with no page overflow; table shell client/scroll width both 1557 px.
- 1152 × 800 (125%-zoom-equivalent review): page width 1137 px with no page overflow; table shell client/scroll width both 1062 px.
- Browser console reported no errors. Dense and sparse actual values, unavailable cells, month expansion controls, year selection, and visible actions remained readable. Component tests cover the new warning/action state because the representative persisted browser dataset used workload ratio only.

## Strategy and interview updates

- Added and completed `NOW-009`; improved `CAP-REP-002` correctness and Need from 30 to 25.
- Applied `INT-002` without changing its answer: the sponsor declined the acceptance question, so `NEXT-004` was retired as `RET-003`. Existing neutral forecast evidence remains; no threshold or decision record was invented.
- Applied `INT-003` without changing its answer: `NEXT-003` now requires exclusive plan edit locking plus acquisition, renewal, timeout, crash recovery, handoff, authorized release, and offline decisions before shared persistence implementation.
- Added no new interview question; the open queue is empty.

## Rotation and portfolio balance

This is an ordinary `product improvement`. `2026-07-19T11-09-07Z-focus-safe-confirmations.md` remains a code-review/remediation record within the prior nine completed audits, so the tenth-run rotation does not force a review. The last strategic portfolio review was `2026-07-19T12-15-44Z-traceable-plan-updates.md`; this is the third ordinary run after it, so the fifth-run cadence is not due.

Recent delivery includes plan governance, saved-forecast comparison, forecast stability, and this user-facing reporting correctness/desktop action workflow. The rolling-five non-review balance includes multiple capability and substantive desktop improvements, not a defect-only sequence.

## Risks, limitations, and follow-ups

- Actual Intraday Erlang calculation results are not persisted today. This run intentionally withholds those report fields; persisting signature-matched actual outputs is the next coherent `CAP-REQ-002`/`CAP-REP-002` enhancement if prioritized.
- Shared-pool or multi-skill staffing remains unsupported, so call-center addition still assumes independent groups (`EXP-002`).
- The signature is a deterministic stale-state guard, not a cryptographic audit checksum.
- Browser review did not mutate the representative persisted dataset into an Intraday Erlang plan; the new issue state is covered by focused component/domain tests and the full Chromium suite.

## Linked candidate set

1. **Capability/correctness — selected:** make retained call-center rollups use authoritative Intraday Erlang results and withhold stale or mixed scope (`CAP-REP-002`, `CAP-REQ-002`, `NOW-009`). Highest executable value because the prior report silently substituted the wrong requirement method.
2. **Desktop UX — deferred:** add sticky two-tier headers and selected-month context to the 12-column call-center table (`CAP-UX-001`). Useful for long reports but lower value than correcting the numbers and already reasonably contained at supported widths.
3. **Deletion/simplification — included where exposed:** remove unused call-center summary/stat computations and formatting paths. Safe because repository-wide search showed only a length check consumed the result; the selected slice replaced it with existing `groupRows.length` and a focused integrity-issue projection.
