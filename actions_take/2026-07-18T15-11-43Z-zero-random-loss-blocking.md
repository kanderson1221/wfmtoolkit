# Zero occupancy and adherence now block staffing calculations

## Selected problem

The monthly demand model silently clamped zero occupancy or adherence to 1%. Invalid random-loss assumptions therefore produced extremely large but apparently valid workload-ratio staffing requirements, and intraday Erlang payload generation sent zero occupancy to the API as a 1% cap.

## User and operational value

Planners can no longer finalize or run staffing calculations from invalid random-loss assumptions. Affected monthly requirements remain explicitly unavailable, with month-specific guidance, until occupancy and adherence are corrected.

## Evidence

- `specs/planning/PLAN-004-random-loss-design-factor.md` requires occupancy and adherence to be greater than zero, treats random loss consuming all scheduled capacity as blocking, and requires invalid monthly overrides to identify the month.
- `specs/planning/PLAN-006-workload-ratio-requirement.md` requires a positive design factor and treats a non-positive design factor as blocking.
- `specs/planning/PLAN-011-completeness-finalization.md` lists a non-positive design factor as a Budget finalization blocker.
- `src/planner/demandModel.js` previously clamped both assumptions to a 1% minimum. The pre-change regression produced a January staffing ratio of `105.26315789473652` and required headcount of `1096.4912280701722` instead of an unavailable result.
- `src/planner/intradayErlang.js` previously sent explicit zero occupancy to the Erlang API as `maxOccupancy: 1`.
- The pre-change focused regression run failed the three new assertions covering monthly calculation availability, Erlang payload rejection, and Budget behavior; 44 existing focused assertions still passed.

## Plan and acceptance criteria

1. Add focused regressions for zero occupancy/adherence in monthly calculations, intraday payload validation, merged Erlang outputs, and Budget finalization.
2. Preserve explicit zero as invalid while retaining compatibility defaults for legacy records that omit an assumption.
3. Return unavailable requirement outputs and month-specific corrective guidance instead of fabricated positive results.

Acceptance criteria:

- Explicit zero occupancy or adherence is not clamped to 1%.
- Workload-ratio staffing ratio, hours, headcount, and rounded headcount are unavailable when either assumption is zero.
- Intraday Erlang cannot run with an explicitly invalid monthly assumption.
- Stored Erlang outputs cannot make a zero-occupancy month appear calculable.
- Budget finalization remains disabled until the assumptions are valid.
- Valid assumptions from 1% through 100% retain existing behavior.
- Focused tests and `npm run verify` pass.

## Implementation summary

- Changed random-loss normalization to preserve explicit zero, allowing the design factor and downstream requirement to become unavailable naturally.
- Added separate occupancy and adherence warnings plus an unavailable-requirement message for positive-demand months.
- Added intraday payload validation that rejects the first invalid month with a month-specific status message instead of coercing its occupancy.
- Gated merged intraday requirements on valid occupancy as well as scheduled capacity, including stored-result compatibility paths.
- Added calculation, Erlang payload/merge, and Budget finalization regression coverage.

## Files changed

- `src/planner/demandModel.js`
- `src/planner/intradayErlang.js`
- `src/planner/__tests__/demandModel.spec.js`
- `src/planner/__tests__/intradayErlang.spec.js`
- `src/components/__tests__/MonthlyPlanBuilder.spec.js`
- `actions_take/2026-07-18T15-11-43Z-zero-random-loss-blocking.md`

## Verification

- Pre-change regression: `npm test -- --run src/planner/__tests__/demandModel.spec.js src/planner/__tests__/intradayErlang.spec.js src/components/__tests__/MonthlyPlanBuilder.spec.js`
  - Expected failure: 3 test files failed, with the 3 new regressions failing and 44 existing tests passing.
- Final focused run: `npm test -- --run src/planner/__tests__/demandModel.spec.js src/planner/__tests__/intradayErlang.spec.js src/components/__tests__/MonthlyPlanBuilder.spec.js`
  - Passed: 3 test files, 48 tests.
- `npm run verify`
  - ESLint passed.
  - Frontend standards check passed.
  - Vitest passed: 70 test files, 353 tests.
  - Vite production build passed: 828 modules transformed.
- `git diff --check`
  - Passed with no whitespace errors.
- `npm run test:e2e` was not run because navigation, dialogs, and major workflows did not change.

The full test run emitted the existing Node warning that `--localstorage-file` had no valid path; it did not fail any test.

## Risks and follow-ups

- No stored-data schema changed. Explicit invalid values now recalculate as unavailable, while older records that omit occupancy retain the existing compatibility default.
- Draft saving remains available with blockers, as required; only calculation execution and finalization are prevented.
- The worktree also contains the prior run's independently documented zero-capacity changes. Those changes were preserved and remained green in the full verification run.

## Next three non-duplicative candidate improvements

1. Validate training-class ISO dates strictly so invalid values such as `2026-02-30` cannot roll into another month through JavaScript date normalization, in line with `FOUND-003` and `PLAN-009`.
2. Add an explicit actualization blocker when positive-contact actuals have zero AHT, in line with the first-release decision and actuals specifications.
3. Audit local planning-data deletion against `DATA-004` and add the smallest missing confirmation or recovery safeguard for any destructive action that can currently bypass it.
