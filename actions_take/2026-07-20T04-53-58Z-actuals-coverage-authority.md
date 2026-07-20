# Actuals conclusions now require complete open-date coverage

Run type: code review and remediation

## Capability, roadmap, interview, and review scope

- Capabilities: primary `CAP-REP-002`; supporting `CAP-GOV-001` and `CAP-UX-001`.
- Roadmap: completed `NOW-015` — Actuals open-date coverage authority.
- Interview evidence: `INT-004` remains Open and governs future shared-plan lock recovery, not local actuals authority. No owner answer was detected or applied, and no new question was relevant.
- Planner personas: annual capacity planner reviewing month-level actuals and WFM lead reconciling staffing-group contribution at call-center level.
- Planner decision: determine whether contacts, AHT, workload, actual requirement, requirement variance, and staffing gap are authoritative enough to act on, or whether missing open dates must be corrected first.
- Reviewed subsystem: daily-to-monthly actuals aggregation, saved-plan calendar authority, actual-data Intraday Erlang orchestration, plan-update completeness checks, the Actuals worksheet, and retained call-center aggregation/report integrity.

## Rotation assessment

This run is the required one-in-ten `code review and remediation` run. A corrected recount showed that the nine immediately preceding audit records are `traceable-plan-updates` through `monthly-scenario-drivers`; the prior review, `focus-safe-confirmations`, falls just outside that window. This is not a strategic portfolio review. `NOW-012`, `NOW-013`, and `NOW-014` are the three non-review improvements since the `NOW-011` portfolio review, so the next ordinary run is the fourth non-review run in that cadence.

## Opportunity and evidence

The retained Actuals workflow accepted a single daily row as sufficient monthly evidence. It then compared that partial contact/AHT total with the full planned month, calculated actual requirement and staffing gaps, allowed an actual-data Erlang run, and contributed the same partial month to call-center aggregates. The UI disclosed only loaded-row count; it did not state the saved plan's expected open dates or identify missing dates. Precise variances therefore looked authoritative even when most of a month was absent.

The review also found two connected architecture/UX issues:

1. Plan-update logic separately enumerated expected dates instead of using the monthly actuals model, creating two completeness contracts that could drift.
2. The Actuals table used a one-off overflow container and a flat header, so column meaning disappeared during a full-year review. Empty summary values also rendered `0.0` AHT and requirement despite no evidence.

`ACT-002`, `ACT-003`, and `PLAN-012` require missing and non-authoritative evidence to remain explicit. Saved plans already persist the operating-weekday and holiday snapshot needed to judge coverage without relying on mutable current defaults.

## Product disposition and WFM rationale

Disposition: improve and consolidate the retained actuals/reporting capability.

- Raw observed contacts, weighted AHT, and workload remain visible even when coverage is partial; they are facts about the rows that were loaded.
- Contacts/AHT variances, actual required headcount, requirement variance, staffing gap, actual Erlang results, and parent call-center actual aggregates are conclusions. They now require every expected open date in the month.
- The saved plan calendar is authoritative for planned groups; actuals-only groups use current group/center calendar settings.
- Configured closed dates are excluded. Loaded rows on unexpected closed dates remain visible as a calendar mismatch and cannot make the month authoritative.
- A complete zero-contact month remains valid if a row exists for every expected open date. A month with no expected open dates is not applicable rather than incomplete.
- No workload, Erlang C/A, shrinkage, occupancy, abandonment, ASA, staffing-supply, or plan-update formula changed. The improvement changes only the evidence boundary at which a result may be interpreted.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-REP-002` | `5/4/4/4/4/4` | 20 | `5/4/4/4/5/4` | 17 | Every retained monthly actuals conclusion now has an exact saved-calendar coverage authority boundary, visible evidence, withholding behavior, and direct correction path. |
| `CAP-GOV-001` | `4/3/4/3/3/4` | 26 | unchanged | 26 | Calendar lineage now governs actuals interpretation, but shared identity, approvals, ownership, and event audit remain absent. |
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | Actuals is materially stronger on desktop, but remaining dense workflows, shortcuts, focus review, and zoom consistency remain uneven product-wide. |

## Standards reviewed and findings

- `AGENTS.md`: the worksheet remains a native table and now composes `AppTableShell`; no direct feature-level PrimeVue import, legacy semantic class, generic data table, phone layout, scheduling, or same-day intraday-management surface was added.
- `FRONTEND_STANDARDS.md`: grouped headings, compact evidence, visible text states, contained overflow, and sticky context match the operational desktop system.
- WFM correctness: observed facts are separated from full-period comparisons; staffing conclusions cannot be derived from partial demand evidence; saved calendar closures and exact units remain explicit.
- Accessibility: coverage is communicated by text rather than color; the scroll region has an accessible name and keyboard focus; grouped native headers retain table semantics; missing evidence includes corrective text and the call-center issue links to Data.
- Data safety: no persisted actual row, plan, forecast, draft, result, backup, IndexedDB schema, or route changed. Existing raw actuals are not discarded or rewritten.
- Error handling: incomplete/mismatched coverage blocks explicit actual Erlang runs before the backend request and withholds stale saved output interpretation; call-center issues name affected months and groups.
- Performance: coverage is calculated once per monthly aggregation over one planning year. No watcher, dependency, polling path, or background task was added.
- Architecture/dead code: duplicate plan-update date enumeration and the Actuals worksheet's local overflow shell were removed in favor of shared domain/UI primitives.

## Scope, plan, and acceptance criteria

Scope was limited to actuals coverage authority and its immediate monthly/editor/call-center consumers, specifications, tests, strategy, and review evidence.

Acceptance criteria achieved:

- Monthly aggregation reports loaded rows, loaded expected-open rows, expected open days, unexpected loaded rows, missing dates, and a stable coverage status.
- Partial/mismatched months retain raw observed contacts, AHT, and workload while contacts/AHT variance and staffing conclusions render unavailable.
- Actual-data Intraday Erlang cannot run on incomplete evidence and explains the corrective action.
- Call-center actual totals and variances are withheld when any contributing group is incomplete; the issue identifies affected contributors and opens Data review.
- Complete saved-calendar months produce the same actuals, requirement, and variance values as before.
- Plan-update cutoff validation reuses the shared coverage engine while preserving its existing missing-date blocker wording and behavior.
- No-data summary measures render an em dash rather than a fabricated zero.
- The native worksheet keeps both header tiers and Month context during contained keyboard scrolling without page-level overflow at supported desktop widths.

## Implementation and removals

- Added `buildActualsCoverageByMonth` to the shared actuals model and carried exact coverage evidence into monthly actual records and summaries.
- Passed the saved plan's operating-weekday/holiday snapshot into editor and call-center aggregation; retained current calendar behavior for actuals-only groups.
- Gated contacts/AHT variance, actual required headcount, requirement variance, staffing gap, actual Erlang execution, and parent aggregate actuals on complete coverage.
- Added a direct `Review Data` action for call-center coverage issues and generalized report-scope integrity messaging.
- Rebuilt the Actuals worksheet as one `AppTableShell` region with Evidence, Workload, and Staffing heading groups; added sticky heading tiers and Month context plus non-color coverage labels.
- Added focused domain, composable, component, call-center, and Chromium regressions for partial and complete coverage.
- Removed duplicate plan-update expected-date enumeration, the one-off worksheet overflow shell, unsupported partial-period conclusions, and misleading empty-state `0.0` summaries.

## Files, migrations, and compatibility

- Domain/orchestration: `src/planner/actualsModel.js`, `src/planner/annualPlanningRollup.js`, `src/planner/planUpdates.js`, `src/composables/useMonthlyPlanBuilder.js`, `src/composables/monthlyPlanBuilder/usePlannerActualsIntradayErlang.js`, `src/composables/planning/usePlanningCenterWorkspace.js`.
- UI/styles: `src/components/planner/PlannerActualsPanel.vue`, `src/components/planning/PlanningCenterView.vue`, `src/styles/planner.css`.
- Tests: focused files under `src/planner/__tests__`, `src/composables/monthlyPlanBuilder/__tests__`, `src/components/__tests__`, and `tests/smoke/planning.spec.js`.
- Specifications: `ACT-002`, `ACT-003`, `PLAN-012`, and `SCREEN-WORKFLOWS`.
- Strategy: capability assessment, roadmap, and this audit record.
- Migration impact: none. Stored daily rows and saved plans keep their existing shape. Coverage is derived at read time from retained evidence, so legacy data receives the same explicit complete/partial/mismatch classification without mutation.
- The pre-existing untracked `launch-wfmtoolkit.command` was preserved and excluded.

## Exact verification

- Focused Vitest: `npx vitest run src/planner/__tests__/actualsModel.spec.js src/planner/__tests__/annualPlanningRollup.spec.js src/planner/__tests__/planUpdates.spec.js src/composables/monthlyPlanBuilder/__tests__/usePlannerActualsIntradayErlang.spec.js src/components/__tests__/PlannerActualsPanel.spec.js src/components/__tests__/PlanningCenterView.spec.js` — 6 files, 59 tests passed before the final closed-date regression; that regression is included in the final full run below.
- Focused Chromium: `npx playwright test tests/smoke/planning.spec.js --project=chromium --grep "keeps actuals coverage authority"` — 1 test passed.
- `npm run verify` passed:
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest: 81 files, 433 tests passed.
  - Vite production build: 837 modules transformed successfully.
- `npm run test:e2e` passed: 22 Chromium tests.
- `git diff --check` passed before strategy/audit updates and is rerun after them.
- No Python/backend behavior changed, so backend unit tests were not applicable.

Playwright emitted the existing non-failing `NO_COLOR`/`FORCE_COLOR` warning. It did not affect verification.

## Desktop, interaction, and state review

The in-app browser reviewed the existing `Portfolio Coverage Review` fixture and the retained Annual Plan Actuals worksheet:

- 1280×900: document width 1265/1265 px; the Actuals region contains its 1088 px worksheet within 978 px, with no page-level overflow.
- 1440×900: document width 1425/1425 px; the region expands to 1138 px without overflow.
- 1920×1080: document width 1905/1905 px; the region expands to 1610 px without overflow.
- Reduced-width/zoom-equivalent Chromium coverage also verifies containment. At horizontal scroll, Month stays aligned to the region edge; at vertical scroll, the group header pins to the region top and the measure header remains directly beneath it.
- The region is keyboard-focusable and has the accessible name `Monthly actuals coverage and variance worksheet`.
- The live call-center report showed a partial `Unplanned Email` contributor, withheld parent actual conclusions, and offered `Review Data`.
- Empty data showed `0 / expected` coverage rather than false completeness. Live review exposed and this run fixed the misleading no-data AHT/required-staff `0.0` summary.
- No browser console errors were observed. Loading is local and synchronous; complete, partial, mismatch, empty, blocked-Erlang, and aggregate-warning states are covered by tests.

## Strategy, roadmap, and interview updates

- Improved `CAP-REP-002` Trust & Safety from 4 to 5 and reduced Need from 20 to 17; updated evidence, gaps, and review date.
- Retained calibrated `CAP-GOV-001` Need 26 and `CAP-UX-001` Need 32 while adding the bounded evidence in the change record.
- Added and completed `NOW-015`; recorded the required review/remediation decision in the roadmap log.
- `INT-004` remains the only Open question. No answer or status changed, and no duplicate or unrelated question was added.
- `CAP-SCHED-001`, `CAP-INTRA-001`, `RET-005`, and `RET-006` remain explicitly out of scope with Need 0.

## Compatibility, risks, limitations, and follow-ups

- Coverage authority is date-completeness, not source-quality certification. A complete month can still contain inaccurate contacts or AHT; existing row validation and reconciliation remain necessary.
- Daily rows do not carry an explicit closed/open flag. Unexpected closed-date rows are retained as observable evidence and classified as a mismatch rather than silently deleted.
- Actuals-only staffing groups use current calendar settings because no saved plan snapshot exists. Their raw facts remain visible, but this limitation is explicit in the report contract.
- Aggregate annual planned totals remain full-year plan context while actual conclusions are month-specific. This run does not add year-to-date period selection or extrapolate partial actuals.
- The improvement does not schedule employees, manage shifts, monitor same-day performance, or create an intraday operations workspace.

## Three linked candidates considered

1. Capability/correctness — selected `CAP-REP-002`, supporting `CAP-GOV-001`, completed `NOW-015`: require saved-calendar open-date coverage before monthly actuals become authoritative. The issue could materially misstate demand, requirement, and gaps and was immediately correctable without migration.
2. Desktop UX — `CAP-UX-001`: add persistent grouped context to the Agent Availability or Demand Model worksheet. Deferred because the actuals correctness review exposed a higher-risk false-authority issue; the selected slice still completed the directly related Actuals worksheet remediation.
3. Deletion/simplification — included in `NOW-015`: remove duplicate plan-update coverage enumeration and the Actuals worksheet's one-off overflow shell. A broader cleanup of remaining table-specific sticky CSS was deferred until each worksheet's semantics are reviewed.
