# Updated plans now retain the decision that created them

Run type: strategic portfolio review + product improvement

## Capability, roadmap, and interview scope

- Capabilities: `CAP-SCEN-001`, `CAP-GOV-001`, `CAP-DATA-001`, and `CAP-UX-001`.
- Roadmap: completed `NOW-008` — Traceable updated-plan decisions; retained in-progress `NOW-005` and dependency-gated `NEXT-003`.
- Interview evidence: `INT-002` remains Open and prevents invented forecast-acceptance policy. Added `INT-003` to resolve real shared-plan ownership, handoff, concurrent-edit, and offline semantics before `NEXT-003`.
- Planner persona: long-range planning lead or capacity planner maintaining Budget and same-year operating Updates.
- Planner decision: understand why a saved Update exists and whether its business rationale supports selecting or comparing it.
- Desktop workflow: staffing-group Plans tab → Create Updated Plan → review/edit draft → saved plan library → Compare Plans.

## Opportunity and evidence

Saved Updates retained the immediate source, Budget identifier, actuals cutoff, actualization timestamp, and current-plan role, but not the approved event or assumption that required the new scenario. Names such as `2026 Feb Update` could not distinguish a product launch from an attrition revision or executive outlook change. Repository inspection traced the omission through `PlanningPlanUpdateModal.vue`, route seeding, `createUpdatedPlanDraft`, the editor payload, plan normalization, IndexedDB flatten/hydration, plan rows, and comparison lineage. The canonical capability assessment already identified decision notes/formal reasons as a remaining scenario and governance gap.

## Strategic portfolio review

The complete inventory, scores, missing domains, dependencies, roadmap order, desktop gaps, recent-run balance, and interview queue were reassessed.

- Scheduling (`CAP-SCHED-001`, Need 100) remains Later because employee, skill, contract/rule, shift, and optimizer foundations are absent.
- Intraday management (`CAP-INTRA-001`, Need 80) remains dependency-blocked by live interval actuals, aggregate/employee capacity feeds, action ownership, and shared persistence.
- Shared persistence (`CAP-DATA-002`, Need 71) and administration (`CAP-ADMIN-001`, Need 60) remain outside Now until tenancy, ownership, conflict, offline, identity, and migration policy are defined; `INT-003` now targets the missing practitioner evidence.
- Financial planning (`CAP-FIN-001`, Need 60) remains Explore because rates, burden, currency, vendor, overtime, and Finance reconciliation semantics are undefined.
- Forecast governance (`CAP-FORE-002`, Need 25; `NOW-005`) remains the highest-value active analytical gap, but a governed acceptance record or threshold still depends on `INT-002`; neutral benchmark evidence already exists.
- The selected Update-decision slice was the highest-value complete user-facing improvement that did not invent blocked policy or broaden the data model.

## Scores before and after

Score order is Strategic Value / Completeness / WFM Correctness / Desktop UX / Trust & Safety / Engineering Health. Need uses the canonical weighted formula.

| Capability | Before | Need | After | Need | Evidence-based rationale |
|---|---:|---:|---:|---:|---|
| `CAP-SCEN-001` | 5/4/4/4/4/4 | 20 | 5/4/4/4/4/4 | 20 | Decision reasons close a material saved-scenario trace gap, but explicit branching and parameter sensitivity remain absent. |
| `CAP-GOV-001` | 4/3/4/3/3/4 | 26 | 4/3/4/3/3/4 | 26 | Update and forecast-override decisions are now traceable, but identity, event audit, approvals, ownership, and consistent reasons across all records remain absent. |
| `CAP-DATA-001` | 5/4/4/4/4/4 | 20 | 5/4/4/4/4/4 | 20 | The new field has tested local and backup-compatible persistence; the capability was already strong and remains device-local. |
| `CAP-UX-001` | 5/3/4/3/4/3 | 32 | 5/3/4/3/4/3 | 32 | This workflow is now keyboard-safe and reviewed across desktop widths, but shortcuts, sticky context, and unreviewed focus/zoom paths remain uneven product-wide. |

Scores remain calibrated rather than increasing a whole capability for one vertical slice.

## Product disposition and WFM rationale

Disposition: improve the retained Update workflow and simplify its lifecycle.

- Every new Update requires a concise reason naming the business event, approved assumption, or operating decision.
- Reasons are trimmed, limited to 240 characters, and rejected when blank; no false or generic rationale is generated.
- Legacy Updates remain usable and are labeled `Decision reason not recorded (legacy plan)`.
- Budget plans have no Update reason and display `Budget baseline` in comparison.
- No demand, workload, requirement, shrinkage, staffing-supply, actualization, or current-plan formula changed. Units and calculation interpretation are unchanged.

## Standards reviewed and findings

- Used existing `AppDialog`, `AppFieldGroup`, `AppSelect`, `AppTextField`, `AppTextArea`, `AppButton`, and native comparison tables; no direct PrimeVue feature import or legacy semantic class was added.
- Added the existing `AppTextArea` wrapper to the contributor-standard inventories exposed by this workflow.
- Live testing found the modal initially left focus on its trigger behind the dialog. `autofocus` now targets the actuals-through selector.
- Removed `planUpdateOpen` from the component-destruction gate so the retained modal instance can complete PrimeVue focus restoration after Cancel.
- Required/legacy states and comparison change state are textual and do not rely on color.

## Scope, plan, and acceptance criteria

1. Require and bound a visible decision reason in the Update modal.
2. Carry the trimmed value through hash-route recovery, draft creation, editor save, normalization, local persistence, and backup restore.
3. Surface the reason in compact plan rows and comparison lineage; preserve legacy blanks honestly.
4. Keep the dialog keyboard-safe and the dense desktop workspace contained at 1280–1920 px and browser zoom.
5. Add domain, route, component, persistence, and Chromium regressions.

Acceptance criteria achieved:

- Blank reasons cannot create an Update; reasons over 240 characters are rejected in the domain.
- The value survives modal → route → draft → save payload → normalized record → Dexie/backup round trip.
- Plan rows and Budget-versus-Update comparison show the reason; legacy records remain valid with explicit missing evidence.
- The actuals selector receives initial focus; Cancel restores the Create Updated Plan trigger.
- Budget behavior, saved snapshots, current-plan selection, and every WFM calculation remain unchanged.

## Implementation and removals

- Added canonical `decisionReason` handling to route parsing/building, Update draft creation, editor payload, plan normalization, IndexedDB flatten/hydration, scenario snapshots, and UI composition.
- Added required modal input with visible methodology help and domain enforcement.
- Replaced the ambiguous Update subtitle with `Actuals through … · reason`; legacy missing evidence is explicit and the full reason remains available via title text when the dense row truncates.
- Added the reason to the comparison assumptions-and-lineage table.
- Removed implicit reasonless Update creation.
- Removed the visibility condition that destroyed the Update modal before focus restoration.
- Added no notes entity, audit-event abstraction, schema-version bump, dependency, server contract, phone layout, or fabricated migration.

## Files and compatibility

- UI/routes/orchestration: `src/components/planning/PlanningCenterView.vue`, `PlanningPlanUpdateModal.vue`, `PlanningPlanComparisonDialog.vue`, `src/appRoutes.js`, `src/composables/usePlanningWorkspace.js`, and `src/composables/useMonthlyPlanBuilder.js`.
- Domain/persistence: `src/planner/planUpdates.js`, `src/planner/planScenarioComparison.js`, `src/planningStorage.js`, and `src/storage/localDataStore.js`.
- Specifications/standards: `AGENTS.md`, `FRONTEND_STANDARDS.md`, `ACT-004`, `ACT-006`, and `SCREEN-WORKFLOWS`.
- Tests: focused unit/component suites, `tests/smoke/planning.spec.js`, and `tests/fixtures/plan-update-decision-review.json`.
- Strategy/interview: capability assessment, roadmap, and `interviews.md`.
- Compatibility: legacy stored plans hydrate with an empty reason and remain usable. Dexie stores non-indexed object fields without a schema-version change. Compact backups preserve the field; no destructive migration occurs.
- Pre-existing untracked `launch-wfmtoolkit.command` was preserved and excluded from the run.

## Exact verification

- Focused Vitest: `npx vitest run` across 10 affected files — 10 files, 120 tests passed.
- Focused Chromium: decision-reason desktop workflow — 1 test passed.
- `npm run verify:full` — passed:
  - ESLint.
  - frontend standards check.
  - Vitest: 78 files, 406 tests passed.
  - production build: 835 modules transformed.
  - Playwright Chromium: 17 tests passed.
- `git diff --check` passed before final audit creation and is rerun before commit.
- No backend Python module changed, so backend unit tests were not applicable.

## Desktop, interaction, and state review

- Reviewed real seeded plan-library, Update modal, and comparison states at 1280×800, 1440×900, and 1920×1080 plus 1152×720 as a 1440 px viewport at 125% zoom.
- Plan rows retain stable comparison columns; long current and legacy reasons truncate within the identity cell without widening the worksheet, while full title/accessibility text remains available.
- Comparison stayed inside the viewport with no document-level horizontal overflow; at 1152×720 its content used one contained vertical scroll region (`487` px client height / `1660` px scroll height).
- Verified empty required input, enabled completion, saved reason, legacy missing reason, Budget baseline, comparison lineage, route recovery, initial focus, Cancel restoration, comparison close restoration, and normal zoom/resizing.
- Browser console review found no warnings or errors.

## Strategy, roadmap, and interview updates

- Completed `NOW-008`; kept `NOW-005` active and `NEXT-003` in discovery.
- Reassessed every capability and refreshed canonical review dates/evidence without inflating scores.
- Updated `CAP-SCEN-001`, `CAP-GOV-001`, `CAP-DATA-001`, `CAP-LRP-001`, and `CAP-UX-001` evidence/gap language.
- Added `INT-003` and linked it to shared-persistence/administration dependencies; no interview answer was applied. `INT-002` remains Open.
- Reaffirmed the declined phone-support direction and all high-Need prerequisite sequencing.

## Rotation and portfolio balance

The immediately preceding run satisfied the required one-in-ten `code review and remediation` rotation. This is the fifth non-review cadence point identified by automation memory and is correctly classified as `strategic portfolio review + product improvement`. It delivers a user-facing capability/workflow and substantive desktop interaction improvement after the prior engineering-consolidation and review runs.

## Risks, limitations, and follow-ups

- Update reasons identify intent but are not attributable to a user and are not immutable audit events; shared identity/persistence remains required for governed authorship.
- Existing Updates cannot be assigned a historical reason without editing/migration policy; displaying missing evidence is safer than fabrication.
- Route-based draft recovery exposes the reason in the local hash, consistent with the existing Update name transport; a future repository-backed transient draft could remove route metadata after a recovery contract exists.
- Forecast acceptance policy remains intentionally unresolved pending `INT-002`.

## Three linked candidates considered

1. Capability/workflow — `CAP-FORE-002`, `NOW-005`, `INT-002`: saved configuration comparison and a governed accept/reject record. Higher analytical upside, but real decision semantics and thresholds remain sponsor-dependent.
2. Desktop UX/governance — selected `CAP-SCEN-001`, `CAP-GOV-001`, `CAP-UX-001`, completed `NOW-008`: require and expose Update decision reasons with keyboard-safe modal behavior. Complete, evidence-backed, and immediately valuable.
3. Deletion/simplification — `CAP-UX-001`, `CAP-DATA-001`: eventually remove route-encoded Update name/reason transport in favor of a recoverable repository-backed transient draft. Deferred because deleting the current route recovery contract without a tested substitute would lose in-progress context on reload.
