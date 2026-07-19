# Retained actual Intraday Erlang evidence

## Run classification and scope

- Run type: **product improvement**.
- Primary capabilities: `CAP-REQ-002`, `CAP-REP-002`; supporting `CAP-DATA-001` and `CAP-UX-001`.
- Roadmap item: `NOW-010` (completed in this run).
- Relevant interview evidence: `INT-001` keeps aggregate reporting inside the owning call-center workflow. `INT-002` and `INT-003` were already applied and do not change this local calculation-evidence slice. No new question or answer was added.
- Planner persona: capacity planner running planned-versus-actual staffing requirement; WFM lead reviewing call-center requirement and staffing variance.
- Desktop decision/workflow: run actual-data Intraday Erlang explicitly inside a saved plan, save the plan, reopen without recomputation, and use the same verified evidence in the call-center rollup.

## Opportunity and product disposition

The product already calculated actual Intraday Erlang requirement in the open plan editor, but kept its output only in component memory. Reloading discarded the run, IndexedDB and backups could not retain it, and the call-center rollup withheld actual requirement even after a successful calculation. The prior `NOW-009` audit identified this as the next coherent `CAP-REQ-002`/`CAP-REP-002` gap.

Disposition: **improve and retain**. The explicit calculation workflow, backend reference implementation, saved plan inputs, and withholding policy are correct foundations. This run completes the evidence lifecycle rather than adding a second formula or a speculative reporting path.

Removable surface identified and removed:

- actuals-only raw `JSON.stringify` input signatures;
- duplicate plan-level Erlang result cloning in the monthly planner;
- helper text and specifications claiming actual results could never be retained;
- stale actual outputs displayed after their driving inputs changed.

## WFM rationale and calculation contract

- Inputs remain daily actual contacts, daily AHT seconds, operating weekdays/closures, service goal and threshold, interval distribution, occupancy, adherence, and paid capacity from the saved plan.
- The backend still calculates interval net staff and monthly Erlang staffed hours; this run does not change Erlang C/A math.
- Actual required staff hours remain `saved actual Erlang staffed hours × saved workload staffing ratio`.
- Actual required headcount remains `actual required staff hours ÷ saved paid hours per month`.
- Planned-versus-actual requirement variance remains `actual required headcount − planned required headcount`.
- Staffing gap to actual requirement remains `planned starting frontline headcount − actual required headcount`.
- Units remain contacts/day, AHT seconds, interval staff, monthly staffed hours, and headcount.
- Missing, incomplete, or signature-mismatched evidence is unavailable rather than zero or a workload-ratio substitute. A failed rerun does not delete previously saved evidence, though the current table withholds it until the error is resolved.

## Before and after scores

- `CAP-REQ-002`: `5/4/4/3/4/4` (Need 24) to `5/4/4/4/4/4` (Need 20). Explicit actual calculations now survive save/reload; the remaining workflow friction is the required backend round trip and the absence of multi-skill/network routing.
- `CAP-REP-002`: `5/3/4/4/4/4` (Need 25) to `5/4/4/4/4/4` (Need 20). The retained call-center report can now use authoritative actual Erlang evidence as well as planned evidence.
- `CAP-DATA-001`: remains `5/4/4/4/4/4` (Need 20); the new optional field uses the existing plan/Dexie/backup contract without a schema migration.
- `CAP-UX-001`: remains `5/3/4/3/4/3` (Need 32); the existing explicit run/status workflow is more durable and stale values are removed, but product-wide desktop consistency gaps remain.

## Plan and acceptance criteria

1. Replace the actuals-only signature and transient state with the shared normalized Erlang result contract.
2. Persist the actual result payload through planner draft state, saved plan payloads, IndexedDB rows, and backups.
3. Rehydrate matching results without an API call and withhold stale/incomplete results.
4. Feed only matching actual outputs into staffing-group and call-center requirement/variance aggregation.
5. Preserve workload-ratio behavior and failed-rerun evidence.
6. Update specifications, strategy, user-facing scope text, and regression tests.

Measurable acceptance:

- matching saved outputs populate actual requirement after reload;
- changed actuals or Erlang-driving plan inputs remove actual requirement and direct the planner to rerun;
- missing or incomplete actual results cannot create partial call-center totals;
- matching planned and actual results remove the report integrity warning and enable comparable variance;
- save/reload and backup round trips preserve the complete result envelope;
- no direct PrimeVue import, legacy semantic class, new dependency, route, or calculation method is introduced.

## Implementation and removals

- Extended the shared result assessor with actuals-specific missing, stale, and incomplete guidance while retaining one signature and completeness algorithm.
- Made `usePlannerActualsIntradayErlang` accept stored results, write a normalized result envelope after a run, hydrate matching evidence, withhold stale values, and preserve saved evidence after a failed rerun.
- Added `actualsIntradayErlangResults` to planner bootstrap, autosave, saved plan payload, local database flatten/inflate, and backup-compatible plan storage.
- Removed the duplicate result-cloning helper from `useMonthlyPlanBuilder` and reused `normalizePlannerIntradayErlangResults` for planned and actual evidence.
- Added signature-validated actual result resolution to `annualPlanningRollup`; actual outputs now feed `computeActualsRecords` only when authoritative.
- Updated call-center integrity issues so matching planned and actual evidence produces no warning, while each unavailable side is named independently.
- Replaced obsolete call-center helper copy that said actual results could not be retained.
- Updated `ACT-003`, `PLAN-012`, `DATA-005`, the specification index, capability assessment, and roadmap.

No migration was required. Older plans have no `actualsIntradayErlangResults` field and safely remain in the existing explicit missing-result state. No stored data is discarded or fabricated.

## Standards and review findings

- Followed `AGENTS.md` and `FRONTEND_STANDARDS.md`; no PrimeVue imports or new local UI primitives were added.
- The existing native-table actuals and call-center worksheets remain intact.
- Missing/stale/error states remain text-based and do not rely on color.
- The only rendered UI change is a concise scope sentence; controls, focus order, keyboard behavior, table widths, and route behavior are unchanged.
- Repository-wide standards tests passed.

## Rotation assessment

- This is not the required one-in-ten code-review run. `NOW-007` is the most recent code-review remediation and remains within the preceding nine completed records.
- This is not the fifth non-review strategic portfolio review. `NOW-008` is the most recent strategic review; three ordinary non-review runs followed before this run.
- Recent delivery remains balanced: forecast comparison/stability, plan decision traceability, call-center correctness, and this durable actual-requirement workflow are substantive user-facing improvements rather than a defect-only sequence.

## Exact verification

- Focused Vitest run: `npx vitest run src/composables/monthlyPlanBuilder/__tests__/usePlannerActualsIntradayErlang.spec.js src/planner/__tests__/annualPlanningRollup.spec.js src/storage/__tests__/localDataStore.spec.js src/components/__tests__/MonthlyPlanBuilder.spec.js` — passed 4 files / 56 tests before the final failed-rerun regression was added.
- Production build: `npm run build` — passed; Vite transformed 837 modules.
- Initial full `npm test` — 423 passed and 1 stale copy assertion failed because it still expected the retired “planned and actual values are withheld” wording. The obsolete helper copy and assertion were updated.
- Final `npm test` — passed 80 files / 425 tests.
- `npm run test:e2e` — passed 18 Chromium tests.
- `git diff --check` — passed.

## Desktop review

- Chromium smoke coverage ran with the repository's Desktop Chrome project (1280 × 720 default viewport) and passed all navigation, planning, dialog, and create/open flows.
- The plan actuals and call-center report remain dense native tables inside their existing contained overflow shells. No column, control, sticky position, or breakpoint changed.
- The new scope copy is one wrapping sentence in the existing status surface; static inspection confirms it does not introduce a fixed width or horizontal overflow at 1280, 1440, or 1920 px. Separate 1440/1920 screenshots were not necessary for this calculation/persistence slice.
- Empty and stale states are covered by focused component/domain tests; matching evidence removes the issue surface rather than adding layout.

## Strategy and interview updates

- Added and completed `NOW-010`.
- Improved `CAP-REQ-002` Need from 24 to 20 and `CAP-REP-002` Need from 25 to 20.
- Updated `EXP-002` to the current `CAP-REQ-002` Need score.
- No interview question was added: the active decision is answered by calculation and repository evidence, no sponsor-specific policy was required, and the open queue remains empty.

## Compatibility, risks, limitations, and follow-ups

- Actual results are persisted with the saved plan and remain local-device evidence; shared-user concurrency still depends on `NEXT-003` and `INT-003`.
- Results become authoritative in the call-center report only after the planner saves the plan; an autosaved editor draft does not silently mutate the saved operating plan.
- Explicit calculations still require the planner API. This run intentionally did not duplicate the reference solver in browser code.
- Multi-skill/network routing and shared staffing pools remain unsupported (`EXP-002`).
- The input signature is a deterministic stale-state guard, not a cryptographic audit checksum.
- The result envelope retains monthly outputs only for actuals because interval/daily actual detail is not currently displayed or reported; adding unused payload volume was avoided.

## Linked candidate set

1. **Capability/workflow — selected:** retain actual Intraday Erlang evidence and use it in call-center actual requirement and variance (`CAP-REQ-002`, `CAP-REP-002`, `NOW-010`). This directly closed the previous run's highest-value executable limitation.
2. **Desktop UX — deferred:** add sticky two-tier header context to the wide call-center monthly report (`CAP-UX-001`). It remains useful, but the current table is contained and authoritative numbers took precedence.
3. **Deletion/simplification — included where exposed:** remove raw actuals signatures, duplicate result cloning, and obsolete “results cannot be retained” product text. Further deletion was not justified because the explicit run, backend solver, and withholding paths remain required.
