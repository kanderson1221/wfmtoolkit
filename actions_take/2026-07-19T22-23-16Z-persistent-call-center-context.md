# Call-center reconciliation keeps its decision context

Run type: strategic portfolio review + product improvement

## Capability, roadmap, interview, and planner scope

- Capabilities: primary `CAP-UX-001`; supporting `CAP-REP-001` and `CAP-REP-002`.
- Roadmap: completed `NOW-011` — Persistent call-center reconciliation context; retained dependency-gated `NEXT-003`.
- Interview evidence: `INT-001` keeps aggregate reporting in the owning call-center workspace. `INT-003` requires exclusive shared-plan editing. Added `INT-004` to resolve abandoned-lock timing, recovery authority, and takeover evidence before `NEXT-003` leaves discovery.
- Planner persona: WFM lead or capacity planner reconciling current-plan demand, actual workload, required headcount, and staffing gaps across independently additive staffing groups.
- Planner decision: identify which month's aggregate and group contributors explain a workload, requirement, or staffing variance without losing measure meaning during a long desktop review.
- Desktop workflow: call-center workspace → Call Center Plan → select year → expand one or all months → reconcile the aggregate row against staffing-group contributor rows.

## Opportunity and evidence

The retained 12-column call-center report already supplied authoritative current-plan scope, requirement-method integrity, missing-value handling, and expandable contributor rows. Its visual shell did not support the length of its own workflow: expanding two groups across twelve months produced a 2,393 px table inside a fixed-height desktop workspace, while the two-tier Workload/Staffing header and expanded-month aggregate scrolled away. At 1280 px the table also needed horizontal movement, but Month identity did not remain pinned.

`PLAN-012` requires chronological contributor reconciliation, native-table semantics, and contained overflow. The two immediately preceding audit candidate sets both named sticky two-tier headers and month context as the highest deferred desktop UX opportunity. `CAP-UX-001` also named uneven persistent context as a product-wide gap.

## Strategic portfolio review

The complete inventory, scores, missing domains, dependency order, roadmap horizons, desktop evidence, recent-run balance, and sponsor queue were reassessed.

- Scheduling (`CAP-SCHED-001`, Need 100) remains Later because employee, skill, labor-rule, shift, and optimizer foundations are absent.
- Intraday management (`CAP-INTRA-001`, Need 80) remains dependency-blocked by near-real-time actuals, schedule or aggregate-capacity feeds, action ownership, and shared persistence.
- Shared persistence (`CAP-DATA-002`, Need 71) and administration (`CAP-ADMIN-001`, Need 60) remain discovery/Later until tenancy, identity, migration, exclusive locking, and abandoned-lock recovery are defined. `INT-004` now targets the remaining takeover decision.
- Financial planning (`CAP-FIN-001`, Need 60) remains Explore because currency, rate, burden, vendor, overtime, and Finance reconciliation semantics are undefined.
- Strong retained forecasting, workload, requirement, shrinkage, supply, scenario, reporting, and local-data capabilities remain calibrated at Need 20 rather than accumulating speculative features.
- The selected report UX slice is the highest-value complete improvement after two correctness-focused report runs and satisfies the fifth non-review strategic cadence without inventing blocked policy.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-UX-001` | `5/3/4/3/4/3` | 32 | unchanged | 32 | This major report now retains desktop decision context, but shortcuts, other dense worksheets, unreviewed focus paths, and product-wide zoom consistency remain uneven. |
| `CAP-REP-001` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Contributor reconciliation is materially faster; export depth and shared-pool semantics remain the known gaps. |
| `CAP-REP-002` | `5/4/4/4/4/4` | 20 | unchanged | 20 | Sticky presentation does not change the already-strong missing/stale/mixed-scope integrity contract. |

Scores remain calibrated rather than increasing a product-wide dimension for one vertical desktop slice.

## Product disposition and WFM rationale

Disposition: improve and retain the authoritative native report.

- Workload and Staffing column groups and their measure labels remain visible through vertical review.
- The most recent expanded month at the scroll position remains visible as the aggregate section header above its contributors.
- Month and contributor identity remain visible while numeric columns scroll horizontally.
- The table owns one named keyboard-focusable region, so keyboard users can enter the contained worksheet rather than moving the whole page.
- The worksheet retains a 70rem minimum width instead of compressing twelve operational measures below readable desktop column widths.
- No contacts, AHT, workload, Erlang, requirement, variance, starting-headcount, staffing-gap, plan selection, or current-plan formula changed. Units and missing-value interpretation remain exactly as specified in `PLAN-012`.

## Standards reviewed and findings

- Replaced the one-off rounded table container with shared `AppTableShell`; no direct PrimeVue import, legacy semantic class, generic data-table dependency, or alternate UI dialect was introduced.
- Preserved native `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `scope="colgroup"`, `scope="col"`, and `scope="row"` semantics.
- Added a visible focus ring and accessible region name; expansion remains keyboard-operable and exposes `aria-expanded` plus month-specific accessible names.
- Sticky treatment uses text, layout, and borders rather than color alone. Missing values continue to render as em dashes.
- The report owns both axes of overflow and creates no page-level horizontal overflow.
- Replaced three repeated local-backup import sequences in Chromium coverage with one helper.
- Removed the obsolete phone-oriented `Narrow Screens` product guidance and replaced it with explicit desktop/laptop resizing and zoom behavior; no phone UI work was added.

## Scope, plan, and acceptance criteria

1. Move the report into the shared table shell and one contained keyboard scroll region.
2. Keep the two-tier column header visible during vertical review.
3. Keep the active expanded-month aggregate visible while its group rows scroll.
4. Keep Month/group identity visible during horizontal review without page overflow.
5. Preserve every calculation, current-plan selection, expansion behavior, and empty/error state.
6. Add semantic component coverage, real Chromium geometry coverage, specifications, strategy, interview dependency, and audit history.

Acceptance criteria achieved:

- An expanded two-group report measures 2,393 px of scroll content inside a 581 px region at 1280×900.
- Header offset remains 0 at 900 px internal scroll; the current month aggregate aligns beneath the 75 px two-tier header.
- At 209 px horizontal scroll, Month and visible contributor cells remain at a 0 px left offset.
- The region receives `tabindex="0"`, a visible focus treatment, and the accessible name `Call center monthly plan and actuals`.
- The document has no horizontal overflow at 1280×900, 1440×900, 1920×1080, or 1152×720 zoom-equivalent review.
- Existing report values, expansion semantics, routes, storage, and calculations are unchanged.

## Implementation and removals

- Added `AppTableShell` composition and a `clamp()`-bounded two-axis scroll region to `PlanningCenterView.vue`.
- Kept the header group sticky at the region top and assigned explicit desktop layer order for the pinned Month header.
- Made expanded aggregate rows sticky immediately below the two-tier header; later months naturally replace earlier month context as their contributors enter review.
- Pinned summary, contributor, and annual-total Month cells to the left edge with background ownership that prevents scrolled numeric cells from showing through.
- Increased the worksheet minimum from 64rem with an xl compression escape to a consistent 70rem contained desktop minimum.
- Removed the one-off report border/radius/shadow shell.
- Consolidated repeated Playwright backup-import steps.
- Removed unsupported phone-layout guidance from the screen specification.
- Added no state, watcher, composable, schema, migration, route, solver, dependency, browser plugin, or mobile breakpoint abstraction.

## Files and compatibility

- UI: `src/components/planning/PlanningCenterView.vue`.
- Component regression: `src/components/__tests__/PlanningCenterView.spec.js`.
- Chromium regression and simplification: `tests/smoke/planning.spec.js`.
- Specifications: `specs/planning/PLAN-012-call-center-reporting.md`, `specs/design/SCREEN-WORKFLOWS.md`.
- Strategy/interview: `product/WFM_CAPABILITY_ASSESSMENT.md`, `product/ROADMAP.md`, `interviews.md`.
- Compatibility: no persisted field, IndexedDB row, backup payload, route, API, or plan snapshot changed. The report consumes the same computed rows and expansion state.
- Pre-existing untracked `launch-wfmtoolkit.command` was preserved and excluded.

## Exact verification

- Focused Vitest: `npx vitest run src/components/__tests__/PlanningCenterView.spec.js` — passed 1 file / 27 tests.
- Focused Chromium: `npx playwright test tests/smoke/planning.spec.js --grep "keeps call-center reconciliation context visible"` — passed 1 test after the sticky offset was aligned to the measured two-tier header.
- `npm run verify:full` — passed:
  - ESLint.
  - frontend standards check.
  - Vitest: 80 files / 426 tests.
  - production build: 837 modules transformed.
  - Playwright Chromium: 19 tests.
- `git diff --check` passed before audit creation and is rerun before commit.
- No Python backend module changed, so backend unit tests were not applicable.

## Desktop, interaction, and state review

The in-app browser used a persisted call center with two groups, one planned contributor, one actuals-only contributor, twelve aggregate months, and expanded detail rows.

- 1280×900: region 911×581 px; content 1120×2393 px; both axes scroll inside the table; no document overflow. At 900 px vertical scroll, headers remained at the region top and the latest month row occupied the context position. At 209 px horizontal scroll, Month and contributor identity remained pinned.
- 1440×900: region 1071×581 px; content 1120×2393 px; a small contained horizontal review preserves readable columns; no document overflow.
- 1920×1080: region 1542×672 px; table expands to the available wide workspace with no horizontal scroll or document overflow.
- 1152×720 (1440 px at 125% zoom equivalent): region 1047×433 px; content 1120×2393 px; contained scrolling remains available and document overflow is zero.
- Reviewed collapsed and Expand All states, populated/missing actuals, no-plan contributor text, signed workload variance, requirement unavailability, keyboard focus, vertical scroll, horizontal scroll, resizing, and zoom-equivalent behavior.
- Browser console review found no warnings or errors.

## Strategy, roadmap, and interview updates

- Completed `NOW-011` and recorded the fifth-run strategic portfolio review.
- Refreshed `CAP-UX-001`, `CAP-REP-001`, `CAP-DATA-002`, and `CAP-ADMIN-001` evidence/dependencies without inflating scores.
- Kept all high-Need missing capabilities in their evidence-backed horizons.
- Added one Open question, `INT-004`, asking who may recover an abandoned exclusive plan lock, whether automatic expiry is acceptable, and what takeover warning/evidence is required.
- No interview answer was received or modified.
- Reaffirmed `RET-001`: phone planning remains declined; desktop resizing and zoom are supported.

## Rotation and portfolio balance

`2026-07-19T11-09-07Z-focus-safe-confirmations.md` remains a code-review/remediation record within the prior nine completed audits, so the one-in-ten rotation does not force a review. Four ordinary non-review runs followed the last strategic review (`NOW-008`): saved forecast comparison, rolling-origin stability, authoritative Erlang rollup, and retained actual Erlang evidence. This run is therefore the required fifth non-review `strategic portfolio review + product improvement`.

The rolling-five non-review set now contains analytical capability work, two authoritative reporting/correctness slices, and this substantive desktop UX improvement. It is not a defect-only or maintenance-only sequence.

## Risks, limitations, and follow-ups

- Sticky month placement depends on the explicit 70rem table minimum and current two-tier header height; the Chromium geometry regression will flag future header typography or column changes that invalidate the offset.
- At 1280 and 1440 px the readable 70rem table intentionally uses contained horizontal scroll; 1920 px uses the full width without horizontal movement.
- Multiple expanded month rows occupy the same sticky context position as the user scrolls; normal table paint order leaves the latest month visible. The behavior is verified in Chromium but may need an explicit section observer only if future browsers stop supporting sticky table rows.
- This run does not add contribution CSV, shared-pool semantics, keyboard shortcuts, or persistent context to unrelated worksheets.
- Shared work and lock recovery remain discovery-only pending `NEXT-003`, `INT-003`, and `INT-004`.

## Three linked candidates considered

1. Capability/workflow — `CAP-DATA-002`, `CAP-ADMIN-001`, `NEXT-003`: prototype shared-plan exclusive locks. Deferred because identity, tenancy, takeover authority, timeout, migration, and recovery safety are not defined; `INT-004` now targets the key abandoned-lock decision.
2. Desktop UX — selected `CAP-UX-001`, supporting `CAP-REP-001`/`CAP-REP-002`, completed `NOW-011`: retain column, month, and contributor context in the authoritative call-center reconciliation table. It was repeatedly deferred, fully executable, and best balanced the recent correctness-heavy runs.
3. Deletion/simplification — included where exposed: replace the report's one-off shell with `AppTableShell`, consolidate repeated Chromium backup imports, and remove obsolete phone-oriented screen guidance. Deleting report calculations or contributor expansion was rejected because both directly support the planner's reconciliation decision.
