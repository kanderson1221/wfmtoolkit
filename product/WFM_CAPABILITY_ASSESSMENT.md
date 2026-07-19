# WFM Toolkit Capability Assessment

Canonical baseline established 2026-07-18. This inventory assesses the implemented product, not the ambition expressed by draft specifications. Scores use desktop planning work at 1280–1920 px as the supported experience; phone behavior is not scored.

## Scoring method

Scores are 0–5: 0 absent or unusable, 1 critically weak, 2 materially weak, 3 adequate, 4 strong, and 5 excellent.

`Improvement Need = round(100 × (Strategic Value / 5) × [0.25 × (5 - Capability Completeness) / 5 + 0.25 × (5 - WFM Correctness) / 5 + 0.20 × (5 - Desktop Workflow/UX) / 5 + 0.15 × (5 - Trust/Explainability/Data Safety) / 5 + 0.15 × (5 - Engineering Health) / 5])`

Critical correctness, security, accessibility, or data-loss findings may override numeric ordering when the roadmap records the reason. Confidence is High, Medium, or Low based on executable evidence and depth of review.

## Capability inventory

Score order is **Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health**.

| ID | Domain and capability | Status | Planner personas and decisions supported | Repository/workflow evidence | Key gaps | Dependencies | Recommended disposition | Confidence | Scores | Need | Last reviewed |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| `CAP-DATA-001` | Data foundation — local planning persistence and recovery | Strong local implementation | Planners; retain and recover centers, groups, forecasts, actuals, plans, and drafts | `src/storage/wfmDexie.js`, `localDataStore.js`, migration/backup and update-rationale round-trip tests, `DATA-002`–`DATA-005` | Single-device ownership; no shared concurrency | Stable schemas and migration discipline | Retain; keep recovery and compatibility evidence current | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-DATA-002` | Data foundation — shared relational persistence | Missing runtime capability | WFM leaders/admins; collaborate on a governed source of truth | PostgreSQL schema and FastAPI exist under `specs/database` and `backend`, but planning runtime remains IndexedDB; `INT-003` requires exclusive edit locking and `INT-004` asks who can recover abandoned locks | No server-backed planning repository, synchronization, tenancy, authorization, or lock acquisition/recovery lifecycle | `CAP-GOV-001`, `CAP-ADMIN-001`, migration path from local data, user-system decision, and exclusive-lock/recovery contract from `INT-003`/`INT-004` | Build after local workflow contracts stabilize and lock recovery is proven | High | 4/0/1/0/1/1 | 71 | 2026-07-19 |
| `CAP-ORG-001` | Organization — call centers, staffing groups, calendars, defaults | Strong | Planners; define ownership, hours, closures, and group service context | Planning center/group settings, holiday profiles, `ORG-001`–`ORG-004`, component/domain tests | Shared-pool and multi-skill relationships are not modeled | Data foundation | Retain; explore shared-staff semantics before adding hierarchy | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-FORE-001` | Forecasting — imported forecast lifecycle and readiness | Strong | Forecast analysts/planners; accept, replace, and apply a planning-ready demand source with version-safe plan lineage | Forecast libraries/import UI, atomic replacement review and retry, `groupActualsForecastSeed.js`, `demandSources.js`, `FIMP-001`–`FIMP-008`, focused tests | Limited cross-version comparison and no retained replacement checksum/history | `CAP-ORG-001`, `CAP-DATA-001` | Retain; add cross-version comparison with scenario work | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-FORE-002` | Forecasting — statistical forecast workbench | Strong | Forecast analysts; train, inspect, adjust, validate, compare, and save daily forecasts | `ForecastingWorkspace.vue`, contact/AHT and rolling-origin accuracy modules, saved-candidate comparison, traceable manual demand adjustments, `FCAST-001`–`FCAST-005`, diagnostic CSVs, focused/backend/browser tests | Legacy saved adjustment rules can still lack rationale until edited | Clean history and operating calendar | Retain the neutral evidence workbench; governed acceptance was declined under `RET-003` / `INT-002` | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-WORK-001` | Workload — contacts, AHT, open days, peak-day demand | Strong | Capacity planners; convert demand into workload with explicit units | `demandModel.js`, forecast handoff, holiday/open-day tests, plan worksheets | No multi-channel concurrency or deferred-work workload model | `CAP-FORE-001`, `CAP-ORG-001` | Retain; add channel-specific models only with evidence | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-REQ-001` | Staffing requirements — workload-ratio method | Strong | Long-range planners; size monthly paid capacity and headcount | `PLAN-003`–`PLAN-006`, `demandModel.js`, invalid-capacity/finalization regressions | Sensitivity and uncertainty comparison are limited | `CAP-WORK-001`, `CAP-SHR-001` | Retain; expose scenario sensitivity later | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-REQ-002` | Staffing requirements — interval Erlang C/A | Strong | Capacity planners; size planned and actual interval staff to service, occupancy, and abandonment targets | Python reference vectors, FastAPI Erlang APIs, shared saved-result signature validation, retained planned/actual results, calculator/planner/rollup tests | No multi-skill/network routing; explicit runs still require a backend round trip | Interval forecast/profile and service goals | Retain; expand only with routing evidence or a safer local calculation boundary | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-SHR-001` | Shrinkage — availability, occupancy, adherence, design factor | Strong | Capacity planners; distinguish paid capacity, presence loss, and random loss | Availability/random-loss worksheets, `PLAN-003`/`PLAN-004`, zero-capacity blockers | Limited assumption benchmarking and scenario sensitivity | Calendar and requirement methods | Retain; add assumption provenance and comparison | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-SUP-001` | Staffing supply — opening HC, attrition, hiring, training, handoff | Strong | Long-range planners/recruiting partners; close monthly supply gaps | `staffingModel.js`, native worksheets, `PLAN-008`–`PLAN-010`, date/count/handoff tests | No skill mix, recruiting capacity constraints, cost, or probabilistic yield | Requirements, calendars | Retain; add scenario comparison before more inputs | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-SCHED-001` | Scheduling — employee shift and schedule optimization | Strategically missing | Schedulers; translate interval requirements into legal, efficient shifts | Explicitly outside current screen workflow; no employee, rule, shift, or optimizer modules | Entire capability absent | Shared persistence, skills, labor rules, requirements | Later: research scope before build; do not graft onto annual plan tables | High | 5/0/0/0/0/0 | 100 | 2026-07-19 |
| `CAP-SCEN-001` | Scenario planning — versioned plans, updates, and comparison | Strong saved-plan workflow | Planning leads; preserve Budget, create Updates, select current plan, and compare saved operating scenarios | Plan lifecycle, immutable snapshots, required Update decision reasons, `planScenarioComparison.js`, comparison dialog/CSV, `PLAN-013`, `ACT-004`–`ACT-006`, focused and Chromium tests | No explicit what-if branching or parameter-sensitivity generator; legacy Updates can lack rationale | Forecast versions, plan lineage | Retain; add branching only after a concrete decision workflow is established | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-INTRA-001` | Intraday management — same-day actuals, reforecast, and recovery actioning | Strategically missing | Intraday managers; detect variance and rebalance/reforecast within day | Interval requirement calculator exists, but no intraday actual-vs-plan monitoring workflow | No real-time ingestion, adherence, backlog, reforecast, or action log | Server data, schedules, interval forecasts | Later: define operational integration boundary first | High | 4/0/0/0/0/0 | 80 | 2026-07-19 |
| `CAP-LRP-001` | Long-range planning — annual demand, requirement, staffing, and updates | Strong | Strategic planners; build, maintain, and compare monthly operating plans | `MonthlyPlanBuilder.vue`, plan comparison, traceable Update creation, planner tabs/modules, annual handoff, finalization gates, extensive tests | No explicit what-if branching, parameter sensitivity, or cost view | Forecast, requirement, supply | Retain as core; validate the next scenario decision before adding inputs | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-REP-001` | Reporting — call-center and staffing-group annual rollups and variance | Strong | Planners/WFM leads; review selected-year demand, requirement, supply, actuals, staffing risk, and saved-plan deltas inside one operating scope | `PlanningCenterView.vue`, sticky contained monthly reconciliation, annual rollup, plan comparison/CSV, `PLAN-012`–`PLAN-013`; `INT-001` retired duplicate cross-center home reporting | Deeper contributor export remains limited; shared pools are unresolved | Reliable plan selection and actuals | Retain inside call-center workflows; improve reconciliation only with decision evidence | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-REP-002` | Reporting — empty, incomplete, stale, mixed-scope, and error integrity | Strong in retained reporting | WFM leads; decide whether scoped report results are authoritative and what to fix | `PLAN-012` call-center rollup validates saved planned and actual Intraday Erlang signatures, uses matching evidence, withholds stale/missing and mixed scope, and names correction paths; `INT-001` removed the ambiguous cross-center surface | Error-state consistency and contributor exports remain uneven outside the retained report | All reporting inputs | Retain the authoritative call-center contract; improve other reports when encountered | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-IO-001` | Import/export — forecast, actuals, CSV reports, backup/restore | Strong local workflow | Planners/data analysts; move demand and actual data safely and recover workspace | Forecast/actuals CSV flows, planner exports, backup validation, `fileDownload.js`, and restore tests | No scheduled integrations or exported-file checksum evidence | Data schemas and validation | Retain; add integrations only with a governed source contract | High | 5/4/4/4/4/4 | 20 | 2026-07-19 |
| `CAP-GOV-001` | Governance — lineage, finalization, destructive safeguards, auditability | Adequate, improving | WFM leads/data owners; understand sources, preserve baselines, avoid data loss | Immutable plan demand snapshots, current-plan lineage, required Update and forecast-override reasons, focus-safe dialogs, backup recovery metadata | No user/event audit log, approvals, ownership, or consistent change reasons across all record types | Shared identity and persistence | Continue bounded lineage improvements; full audit with server persistence | Medium | 4/3/4/3/3/4 | 26 | 2026-07-19 |
| `CAP-ADMIN-001` | Administration — identity, roles, permissions, tenancy | Strategically missing | Admins/WFM leaders; control access and separation of duties | No application identity or authorization workflow; local browser storage is device-scoped; `INT-003` requires plan edit locks and `INT-004` asks who may recover them | Entire capability absent; lock owner and authorized recovery depend on the future user system | `CAP-DATA-002`, product tenancy/user decision, and exclusive-lock lifecycle from `INT-003`/`INT-004` | Later with shared persistence; do not add cosmetic role UI first | High | 3/0/0/0/0/0 | 60 | 2026-07-19 |
| `CAP-FIN-001` | Financial planning — labor cost and budget impact | Strategically missing | WFM/finance leaders; compare staffing actions in cost terms | No rate, salary, vendor, overtime, or budget model in planning workflows | Entire capability absent; accounting semantics unresolved | Supply scenarios, organization/currency model | Explore after scenario comparison foundations | High | 3/0/0/0/0/0 | 60 | 2026-07-19 |
| `CAP-UX-001` | Desktop operational UX — dense, keyboard/mouse planning workflows | Adequate-to-strong | All planner personas; scan, edit, compare, and act efficiently on desktop | Shared wrappers, native tables, split center workspace, sticky keyboard-scrollable call-center reconciliation, focus-safe confirmations and Update creation, standards/Chromium tests | Keyboard shortcuts, persistent context in unreviewed worksheets, focus restoration in unreviewed workflows, and zoom review are uneven | Shared UI system and workflow-specific testing | Improve within roadmap slices; decline phone-specific work | Medium | 5/3/4/3/4/3 | 32 | 2026-07-19 |

## Change record

### 2026-07-18 — baseline and portfolio no-plan state

- Created the first repository-wide capability baseline from specifications, implementation, and tests.
- `CAP-REP-002` improved from scores `5/2/3/2/2/3` (Need 52) to `5/2/3/3/3/3` (Need 45). The portfolio now withholds non-authoritative KPIs, monthly zero rows, and staffing charts when no plan contributes, identifies plan coverage, and offers a direct setup action.
- Completeness remains 2 because partial coverage thresholds, stale reporting, mixed-method/scope communication, and error-state consistency still need systematic work.
- High numeric need does not automatically place employee scheduling in Now: it depends on shared data, employee/rule models, and a deliberate product-boundary decision. The roadmap records that sequencing rather than treating a score as a feature-count mandate.

### 2026-07-18 — atomic imported-forecast replacement

- `CAP-FORE-001` improved from scores `5/3/4/3/4/3` (Need 32) to `5/4/4/4/4/4` (Need 20).
- Imported daily sources now have a reachable desktop replacement action, current-versus-candidate validation review, named draft/finalized plan dependencies, stable source lineage, atomic detached-candidate persistence, and retry-safe failure behavior.
- Completeness, Desktop UX, and Engineering Health each moved to 4. Trust remains 4 rather than 5 because replacement history/checksums and governed event auditing are not implemented.

### 2026-07-18 — decision-safe partial portfolio coverage

- `CAP-REP-001` improved from scores `5/3/4/4/3/4` (Need 28) to `5/4/4/4/4/4` (Need 20).
- `CAP-REP-002` improved from scores `5/2/3/3/3/3` (Need 45) to `5/3/3/4/4/4` (Need 30).
- The selected-year rollup now emits deterministic inclusion evidence for every staffing group. Partial reports name excluded groups and reasons, label plan-derived totals with their contributing scope, preserve actuals-only truth, and withhold invalid cross-scope variance.
- `CAP-REP-002` correctness remained 3 because stale results, mixed-scope behavior outside the portfolio, and error-state consistency still needed systematic coverage. At that point, `INT-001` asked whether future policy should impose a minimum coverage threshold; its later answer retired the surface entirely.

### 2026-07-18 — call-center directory replaces portfolio reporting

- Applied sponsor answer `INT-001`: cross-center reporting was removed from the planning home rather than extended with another coverage policy.
- `CAP-REP-001` keeps scores `5/4/4/4/4/4` (Need 20) because selected-year aggregate reporting remains strong in the call-center/staffing-group workflow; the retired home duplication is no longer treated as capability completeness.
- `CAP-REP-002` keeps scores `5/3/3/4/4/4` (Need 30). Removing the ambiguous cross-center surface improves product coherence but does not resolve stale/error consistency in retained reports.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32); the home is materially simpler, but one surface does not justify increasing the cross-product desktop score.

### 2026-07-18 — strategic portfolio review and saved-plan comparison

- Reassessed the complete inventory, dependencies, missing domains, desktop evidence, and sponsor queue. Scheduling (`CAP-SCHED-001`, Need 100), intraday management (`CAP-INTRA-001`, Need 80), shared persistence (`CAP-DATA-002`, Need 71), administration (`CAP-ADMIN-001`, Need 60), and finance (`CAP-FIN-001`, Need 60) remain intentionally outside Now because required data, integration, tenancy, or accounting decisions are unresolved.
- `CAP-SCEN-001` improved from `5/3/4/3/4/3` (Need 32) to `5/4/4/4/4/4` (Need 20). Planners can now compare Budget to the current or another same-year Update across saved lineage, assumptions, annual outcomes, material monthly exceptions, and a complete 12-month CSV.
- Comparison recalculates from each saved snapshot, incorporates stored intraday Erlang monthly results, and withholds requirement/supply-gap deltas across incompatible methods. Completeness, Desktop UX, and Engineering Health move to 4; Correctness and Trust remain 4 because explicit what-if branching, decision notes, and governed audit history are still absent.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32). The comparison is a substantive desktop improvement, but keyboard shortcuts, cross-workflow focus restoration, zoom consistency, and sticky context remain uneven product-wide.

### 2026-07-18 — leakage-safe forecast accuracy review

- `CAP-FORE-002` improved from `5/3/3/3/3/3` (Need 40) to `5/3/4/4/4/4` (Need 25).
- Modeled daily forecasts now compare holdout WAPE, MAE, bias, and interval coverage against an explicit eight-week same-weekday training benchmark, name which result has lower WAPE without declaring acceptance, and export every scored day.
- The benchmark never reads holdout actuals; zero-total-actual WAPE remains unavailable rather than appearing as perfect accuracy. Correctness, Desktop UX, Trust, and Engineering Health move to 4. Completeness remains 3 because governed multi-configuration comparison, rolling-origin validation, an acceptance decision record, and AHT accuracy are not implemented.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32); this replaces a weak metric-pill summary with a decision-grade desktop table, but the score remains product-wide.

### 2026-07-18 — leakage-safe handle-time accuracy review

- `CAP-FORE-002` remains `5/3/4/4/4/4` (Need 25). AHT assumptions now exclude contact holdout dates, and analysts can compare the configured monthly AHT method with a training-only weighted benchmark using contact-weighted MAE, bias, and AHT-driven workload error.
- Completeness stays 3 because one fixed holdout is still not a governed multi-configuration or rolling-origin acceptance workflow. Correctness, Desktop UX, Trust, and Engineering Health remain calibrated at 4; this slice closes a material leakage and AHT-evidence gap within those scores rather than overstating the whole capability.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32). The AHT tab now reuses the semantic comparison pattern and discloses scored-day coverage, but product-wide keyboard, focus, zoom, and sticky-context gaps remain.

### 2026-07-19 — traceable manual demand adjustments

- `CAP-FORE-002` remains `5/3/4/4/4/4` (Need 25). New and edited future-volume rules now require a planning reason, legacy blank reasons remain visibly unresolved rather than being fabricated, and the monthly rollup reconciles baseline contacts, exact manual change, and final contacts from the adjusted daily rows.
- Completeness stays 3 because candidate-to-candidate comparison, rolling-origin validation, and a governed accept/reject record remain absent. Correctness, Desktop UX, Trust, and Engineering Health remain calibrated at 4; this slice closes the override-trace gap inside those dimensions without overstating the entire forecasting capability.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32). The editor supplies visible validation and a stable desktop reconciliation table, but product-wide keyboard, focus, zoom, and sticky-context gaps remain.

### 2026-07-19 — consolidated browser download lifecycle

- `CAP-IO-001` remains `5/4/4/4/4/4` (Need 20). Backup JSON, actuals-gap CSV, forecast-accuracy CSV, saved-plan comparison CSV, and planner worksheet CSV now use one download lifecycle and one filename sanitizer.
- The shared primitive guarantees object-URL cleanup when browser click dispatch throws; backup and actuals-gap filenames, MIME types, contents, and visible workflow states remain unchanged.
- Scores stay calibrated because this removes implementation risk and duplicate code within an already strong local workflow; scheduled integrations and exported-file checksum evidence remain absent.

### 2026-07-19 — focus-safe destructive confirmations

- `CAP-GOV-001` remains `4/3/4/3/3/4` (Need 26). Shared destructive confirmations now focus Cancel on open and preserve the PrimeVue close transition so both cancellation and confirmation restore the still-available initiating control.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32). The shared confirmation path now has unit and Chromium regressions plus desktop review at 1280, 1440, and 1920 px and a 125%-zoom-equivalent CSS viewport.
- Scores stay calibrated because this closes one cross-workflow keyboard-safety defect without resolving broader shortcut, sticky-context, non-confirmation focus-restoration, or product-wide zoom consistency gaps.

### 2026-07-19 — strategic portfolio review and traceable plan updates

- Reassessed the complete capability inventory, scores, dependency order, desktop evidence, recent delivery balance, and sponsor queue. Scheduling (Need 100), intraday management (Need 80), shared persistence (Need 71), administration (Need 60), and financial planning (Need 60) remain outside Now because employee/rule data, live feeds, tenancy/conflict policy, identity, or accounting semantics are unresolved.
- New Updates now require a bounded decision reason, preserve it through route seeding, plan normalization, IndexedDB and backup round trips, and expose it in the plan library and comparison lineage. Legacy Updates remain valid with an explicit missing-rationale label.
- `CAP-SCEN-001` remains `5/4/4/4/4/4` (Need 20), `CAP-GOV-001` remains `4/3/4/3/3/4` (Need 26), and `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32). The slice closes one material decision-trace and focus gap without overstating branching, product-wide auditability, or desktop consistency.
- `INT-003` was added to establish real collaboration ownership and conflict semantics before `NEXT-003`; `INT-002` remains the governing dependency for forecast acceptance semantics.

### 2026-07-19 — comparable saved forecast candidates

- `CAP-FORE-002` remains `5/3/4/4/4/4` (Need 25). Analysts can now compare two saved modeled configurations only when every scored date and actual contact value matches, with aligned WAPE, MAE, bias, interval coverage, weekday-benchmark context, and changed model settings.
- Completeness remains 3 because rolling-origin evidence and a governed accept/reject record are still absent. Correctness, Desktop UX, Trust, and Engineering Health remain calibrated at 4; the comparable-holdout gate closes the saved candidate gap without inventing sponsor policy from unanswered `INT-002`.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32). The new native-table dialog is keyboard-safe and contained across supported desktop widths, but product-wide shortcuts, sticky context, and unreviewed focus/zoom paths remain uneven.
- Removed the unused forecast `isDirty` state, deep watcher, and component prop chain; no unsaved-state UI or behavior depended on it.

### 2026-07-19 — rolling-origin forecast stability

- `CAP-FORE-002` improves from `5/3/4/4/4/4` (Need 25) to `5/4/4/4/4/4` (Need 20). A modeled run now evaluates the current holdout plus up to two earlier non-overlapping windows, with every fold trained strictly before its own cutoff.
- Analysts can distinguish a repeatable model advantage from one favorable test period using chronological model-versus-weekday WAPE, MAE, bias, interval coverage, explicit fold outcomes, and a reconciled stability CSV.
- Completeness moves to 4 because the retained workbench now covers leakage-safe contact and AHT validation, manual-adjustment evidence, saved-candidate comparison, and rolling-origin stability. Correctness, Desktop UX, Trust, and Engineering Health remain 4; governed acceptance/rejection and legacy blank adjustment rationales remain unresolved.
- The repeated single-window metric and row construction was consolidated into one fold scorer. Future demand, AHT, workload, staffing, saved-source selection, and legacy snapshots are unchanged.

### 2026-07-19 — authoritative Intraday Erlang call-center reporting

- `CAP-REP-002` improves from `5/3/3/4/4/4` (Need 30) to `5/3/4/4/4/4` (Need 25). Call-center planned requirement now uses complete, signature-matched saved Intraday Erlang results and never silently substitutes workload-ratio output.
- Missing, incomplete, or stale planned Erlang results withhold affected monthly requirement and staffing-gap totals while preserving demand and workload. Mixed actual-requirement totals are also withheld when an Intraday Erlang contributor lacks retained actual calculation results.
- `CAP-REQ-002` remains `5/4/4/3/4/4` (Need 24): the reporting integration is now correct, but backend round trips and unretained actual Erlang results still add material workflow friction.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32): affected groups and plans receive visible text and direct actions, while product-wide sticky context, shortcuts, focus, and zoom consistency remain uneven.
- Applied sponsor answers `INT-002` and `INT-003`: forecast acceptance governance was declined (`RET-003`), and shared persistence discovery now requires exclusive plan edit locking with explicit recovery semantics.

### 2026-07-19 — retained actual Intraday Erlang evidence

- `CAP-REQ-002` improves from `5/4/4/3/4/4` (Need 24) to `5/4/4/4/4/4` (Need 20). An explicit actual-data Erlang run now stores its calculation time, shared hashed input signature, row/month counts, and monthly outputs with the plan; matching results rehydrate without another backend run.
- `CAP-REP-002` improves from `5/3/4/4/4/4` (Need 25) to `5/4/4/4/4/4` (Need 20). Call-center actual requirement and comparable variance now use complete, signature-matched saved actual results; missing, incomplete, or stale evidence stays unavailable and names the affected group and plan.
- `CAP-DATA-001` remains `5/4/4/4/4/4` (Need 20). Actual Erlang evidence round-trips through the existing plan row, IndexedDB workspace, drafts, and backup payload without a schema-version or destructive migration.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32). The existing explicit run/status workflow now survives reload and removes stale values from the actuals table, but cross-product sticky context, shortcuts, focus, and zoom consistency remain uneven.
- Removed the actuals-only raw JSON signature and the duplicate plan-level Erlang result cloning function; planned and actual results now share one normalized signature/result contract.

### 2026-07-19 — strategic portfolio review and persistent call-center reconciliation context

- Reassessed the complete capability inventory, scores, dependency order, roadmap horizons, desktop evidence, recent-run balance, and sponsor queue. Scheduling (Need 100), intraday management (Need 80), shared persistence (Need 71), administration (Need 60), and financial planning (Need 60) remain outside Now because employee/rule data, live feeds, identity/lock recovery, or accounting semantics are unresolved.
- `CAP-UX-001` remains `5/3/4/3/4/3` (Need 32). The retained 12-column call-center report now has one named keyboard scroll region, sticky two-tier headers, a sticky Month column, and active expanded-month context at supported desktop widths and zoom equivalents.
- `CAP-REP-001` and `CAP-REP-002` remain `5/4/4/4/4/4` (Need 20). The slice improves contributor reconciliation without changing scope, current-plan selection, aggregation, requirement integrity, or stored evidence.
- Scores remain calibrated because keyboard shortcuts, persistent context in other dense worksheets, focus review, and zoom consistency are still uneven across the product.
- Replaced the report's one-off table shell with `AppTableShell`, consolidated repeated backup-import mechanics in Chromium coverage, and removed obsolete phone-oriented screen guidance exposed by the desktop review.
- Added `INT-004` to resolve abandoned exclusive-lock recovery and takeover authority before `NEXT-003` can leave discovery.
