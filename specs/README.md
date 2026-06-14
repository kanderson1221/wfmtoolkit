# Product Implementation Specifications

This directory is the implementation contract for rebuilding the Planning
Workspace.

**Handoff status:** implementation-ready.

## Product Identity

**Product name:** `Planning Workspace`

This field is the single source of truth for the product's user-facing name.
The user may replace `Planning Workspace` with another name before
implementation. The implementing agent shall apply the configured name to the
application shell, page titles, browser metadata, user-facing messages,
downloads, exports, and documentation it creates.

Individual specifications use `Planning Workspace` as a stable functional term.
Every occurrence of that term shall be interpreted as referring to the product
name configured above; the specification files do not need to be renamed or
rewritten when the product name changes. Technical identifiers, database names,
API paths, and source paths should remain stable unless a specification
explicitly requires them to contain the product name.

An AI coding agent may implement this specification set without waiting for
answers to the remaining open questions. The first-release decisions in this
file resolve the choices required to proceed. Open questions in individual
specifications describe possible later enhancements unless they directly
conflict with a decision below.

# Instructions For The Implementing Agent

Read and follow these sources in order:

1. Repository-level `AGENTS.md`
2. This file
3. `foundation/FOUND-001-planning-workspace-scope.md`
4. The remaining specifications in dependency order
5. `design/SCREEN-WORKFLOWS.md`
6. `database/README.md` and `database/postgresql-schema.sql`
7. `examples/csv/README.md` and its CSV fixtures
8. `reference-implementations/erlang/README.md`

The agent shall then:

1. Inspect the existing repository and identify reusable implementation pieces.
2. Produce a specification coverage matrix mapping every specification ID to
   implementation modules, database tables, screens, and automated tests.
3. Record material architecture choices that are not already fixed here.
4. Implement the system in vertical slices following the sequence below.
5. Add automated coverage for the acceptance scenarios in each implemented
   specification.
6. Keep the coverage matrix current as work progresses.
7. Run all required verification before declaring a slice complete.

Do not stop merely because a specification contains an open question. Apply the
first-release decisions below and continue. Ask the user only when a requested
change would alter scope, contradict a normative requirement, or require a
destructive choice that cannot be inferred safely.

# Source Priority

When sources disagree, use this order:

1. Explicit user instruction
2. Repository-level `AGENTS.md`
3. This implementation README
4. Approved normative language in individual specifications
5. PostgreSQL schema and Erlang reference implementation for their respective
   technical contracts
6. Screen workflows and CSV fixtures
7. Non-normative implementation traceability
8. Existing application behavior

Existing code is evidence and may be reused, but it does not override the
specifications. Existing forecasting and standalone calculator features are
outside the target product.

# Product Boundary

The implementation covers:

- call centers, staffing groups, operating calendars, and intraday profiles
- import and lifecycle management of externally produced forecasts
- workload-ratio and plan-integrated intraday Erlang staffing requirements
- annual budget plans, staffing supply, hiring, training, and cross-year handoff
- daily actuals import, variance reporting, and updated plans
- selected-year portfolio reporting
- PostgreSQL relational persistence, transactional drafts, backup, restore,
  migration, and destructive-data workflows

It excludes:

- forecast generation, model training, seasonality analysis, or forecast tuning
- standalone calculators and general-purpose staffing file processors
- shift or employee scheduling
- real-time workforce operations
- authentication, authorization, accounts, collaboration, approvals, and
  multi-tenant administration
- payroll, recruiting, learning management, and financial cost modeling

# First-Release Decisions

These decisions are normative for the initial implementation.

## Organization And Time

- A call center is the required top-level planning unit.
- Names need not be unique; stable identifiers define identity.
- Call centers and staffing groups are deleted rather than archived.
- Staffing groups cannot be moved between call centers.
- Planning years are January through December calendar years.
- Overnight operating windows and partial-day closures are not supported.
- Date-only values never shift because of browser or server time zones.

## Forecast Imports

- Monthly, daily, and interval forecast imports are all required.
- CSV is the only required forecast file format.
- Forecast AHT is required and must be positive.
- Daily imports may omit configured closed dates.
- Missing required open dates and interval gaps are blocking.
- Mixed granularities and partial acceptance of invalid files are not supported.
- Accepted source values are immutable; display name and source description may
  be edited.
- Referenced forecast deletion uses the `deleted` lifecycle state rather than
  physical deletion.
- Duplicate file checksums may produce a warning but do not block import.
- ISO dates are required except for explicitly supported month labels
  demonstrated by the CSV fixtures.

## Intraday Planning

- One reusable intraday profile exists per staffing group.
- The interval length is 30 minutes.
- Ratios must total `1.0` within an absolute tolerance of `0.00000001`.
- Planning uses Erlang C through the packaged reference implementation.
- Erlang A remains a preserved engine capability but is not selectable in the
  Planning Workspace.
- Caller patience resolves from the staffing-group override or call-center
  default and is copied into the plan snapshot.
- Interval-result download is not required.

## Plans And Calculations

- One budget exists per staffing group and planning year.
- Finalized budgets are immutable and cannot be reopened.
- Update plans are finalized on save; revising an update creates another update.
- A new update defaults to the current finalized plan as its source, while the
  planner may choose another same-year finalized plan.
- The newest saved update becomes current unless the planner later selects
  another same-year finalized plan.
- Workload-ratio planning uses no additional concurrency factor.
- Decimal required headcount drives analytics; ceiling-rounded headcount is the
  operational whole-person value.
- Peak-day requirement is informational and does not block finalization.
- Presence and utilization values may reach zero and then create blocking
  invalid-capacity results; calculations shall not silently clamp them positive.
- Intraday occupancy is enforced by Erlang and is not applied again afterward.
- Forecast-backed demand cannot be edited inside a plan.

## Actuals And Updates

- Actuals imports are all-or-nothing.
- Actual AHT may be zero as an observed value.
- Positive contacts with zero AHT cannot produce a requirement and block use as
  an actualized planning month.
- Actuals completeness evaluates the whole calendar month against expected open
  dates.
- Partial-month actualization is not supported.
- Actual requirements reuse the saved plan's calendar, availability, service
  goal, intraday profile, and overhead assumptions.
- Actualized staffing supply is not replaced by observed employee headcount.

## Staffing And Training

- Attrition is entered as monthly headcount.
- The default staffing gap compares starting frontline headcount with decimal
  required headcount.
- Transfers and non-frontline exits are not modeled separately.
- Training classes represent whole or decimal headcount but not distinct
  part-time capacity factors.
- Each trainer supports at most one concurrent class.
- Recommendations prioritize earliest feasible frontline readiness, then use
  the earliest feasible hire date.
- Manual classes are never deleted when recommendations are regenerated.
- Cross-year opening values use the prior current plan, falling back to the
  finalized budget when no current update exists.

## Reporting

- Portfolio reporting provides explicit `Current Plan` and `Budget` modes and
  defaults to `Current Plan`.
- Staffing groups are additive; shared-pool or non-additive groups are not
  supported.
- Contacts, workload, required hours, staffing movements, and loaded days are
  annual sums.
- Headcount summaries identified as averages are simple averages of applicable
  monthly values.
- Stale values may remain visible with a clear label but do not contribute to
  authoritative totals.
- Reporting exports, image exports, and PDF exports are optional.

## Persistence And Backup

- PostgreSQL 15 or newer is the system of record.
- Persistent business data shall not use JSON, JSONB, array, or opaque document
  columns.
- Drafts use the same normalized relational tables as saved plans.
- Use `plans.lock_version` or equivalent optimistic concurrency protection.
- Backup export may use JSON as an external interchange format.
- Initial restore supports replacement, not merge.
- Backup encryption, password protection, and archival retention are not
  required.
- Deployment-level user and tenant ownership may be added without changing the
  planning-domain schema.

## UI And Review

- Use the repository's established operational UI system and accessibility
  rules.
- Dense planning worksheets use native tables and shared table-field wrappers.
- Required sections must be explicitly reviewed before finalization.
- Warnings do not require a separate acknowledgment beyond section review.
- Blocking issues cannot be overridden.
- Signed approvals and formal reviewer workflows are not required.

# Normative Language

The words **shall**, **must**, and **must not** define requirements.

The words **should** and **may** describe recommended or optional behavior.

Implementation traceability sections are informative. Existing behavior does
not override the requirements or first-release decisions.

# Recommended Implementation Sequence

## Dependency Ordering Clarification

`PLAN-002` and `DATA-002` describe two sides of the same draft workflow and
therefore reference each other. This is a coordination relationship, not an
instruction to wait indefinitely on either specification. For implementation
ordering, complete `DATA-001` and `PLAN-001`, implement the relational draft
identity and recovery behavior in `DATA-002`, and then complete the budget
workflow in `PLAN-002`. This ordering rule supersedes a literal cyclic reading
of those two `depends_on` lists.

## Phase 1: Foundation And Persistence

- `FOUND-001` through `FOUND-005`
- `DATA-001`
- PostgreSQL schema and migration tooling
- application shell, navigation, status handling, and shared UI primitives

## Phase 2: Organization Setup

- `ORG-001` through `ORG-004`
- call centers, staffing groups, calendars, closures, defaults, and intraday
  profiles

## Phase 3: Forecast Import

- `FIMP-001` through `FIMP-008`
- CSV parsing, mapping, validation, readiness, version management, and plan
  snapshots

## Phase 4: Budget Planning

- `PLAN-001`
- `DATA-002`
- `PLAN-002` through `PLAN-007`
- plan lifecycle, capacity assumptions, workload-ratio requirements, and Erlang
  requirements

## Phase 5: Staffing Supply

- `PLAN-008` through `PLAN-011`
- staffing roll-forward, training, cross-year handoff, completeness, and
  finalization

## Phase 6: Actuals And Updates

- `ACT-001` through `ACT-006`
- actuals lifecycle, variances, actualization, update creation, and current-plan
  lineage

## Phase 7: Portfolio And Recovery

- `PORT-001` through `PORT-005`
- `DATA-003` through `DATA-005`
- portfolio reporting, transactional autosave, backup, restore, clear, and
  migration

# Required Supporting Artifacts

- [Screen Workflows and Low-Fidelity Wireframes](design/SCREEN-WORKFLOWS.md)
- [CSV Templates and Acceptance Fixtures](examples/csv/README.md)
- [Erlang Staffing Reference Implementation](reference-implementations/erlang/README.md)
- [PostgreSQL Relational Schema](database/README.md)

# Verification And Definition Of Done

A feature is complete only when:

- its normative requirements and acceptance scenarios are implemented
- relevant database constraints and transactions are covered
- automated tests trace back to specification IDs
- error, empty, incomplete, stale, and recovery states are handled
- accessibility requirements are preserved
- no forecasting or standalone calculator behavior has entered scope

At minimum, run:

```bash
npm run lint
npm run check:standards
npm test
npm run build
npm run test:e2e
python3 -m unittest discover \
  -s specs/reference-implementations/erlang/tests \
  -p "test_*.py" \
  -v
```

Apply and verify the PostgreSQL schema:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f specs/database/postgresql-schema.sql

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f specs/database/postgresql-schema-verification.sql
```

If a command cannot run in the implementation environment, record the reason
and the unverified risk.

# Catalog

## Foundation

- `FOUND-001` Planning Workspace purpose, actors, scope, and terminology
- `FOUND-002` Domain hierarchy and record relationships
- `FOUND-003` Units, dates, time zones, rounding, and numeric conventions
- `FOUND-004` Planning navigation, deep links, and route recovery
- `FOUND-005` Planning UI, accessibility, worksheet, and validation standards

## Organization Setup

- `ORG-001` Call-center lifecycle and defaults
- `ORG-002` Operating days, hours, holiday calendars, and closures
- `ORG-003` Staffing-group lifecycle, service goals, and inherited defaults
- `ORG-004` Staffing-group intraday demand distribution

## Forecast Import

- `FIMP-001` Imported forecast identity, ownership, version, and lifecycle
- `FIMP-002` Forecast file contract, required columns, units, and templates
- `FIMP-003` Upload, column mapping, parsing, and validation
- `FIMP-004` Daily, interval, and monthly forecast granularity
- `FIMP-005` Coverage, gaps, duplicates, invalid dates, and readiness
- `FIMP-006` Contacts and handle-time normalization and aggregation
- `FIMP-007` Forecast replacement, selection, deletion, and dependency warnings
- `FIMP-008` Forecast-to-plan handoff and immutable demand snapshots

## Annual Planning

- `PLAN-001` Plan identity, planning year, type, status, and lifecycle
- `PLAN-002` Budget plan creation, draft autosave, validation, and finalization
- `PLAN-003` Agent availability, paid-time, and presence-loss assumptions
- `PLAN-004` Occupancy, adherence, random loss, and design factor
- `PLAN-005` Imported-forecast monthly demand model
- `PLAN-006` Workload-ratio staffing requirement
- `PLAN-007` Intraday Erlang staffing requirement
- `PLAN-008` Staffing supply, opening headcount, and attrition
- `PLAN-009` Hiring and training pipeline
- `PLAN-010` Cross-year headcount and training-class handoff
- `PLAN-011` Plan warnings, completeness, and finalization gates

## Actuals And Updates

- `ACT-001` Daily actuals file contract and import
- `ACT-002` Actuals validation, replacement, deletion, and monthly rollup
- `ACT-003` Planned-versus-actual demand and requirement variance
- `ACT-004` Updated-plan creation from a budget or prior update
- `ACT-005` Actualization through a selected month
- `ACT-006` Current-plan selection and update-plan lineage

## Portfolio And Reporting

- `PORT-001` Planning portfolio and year selection
- `PORT-002` Call-center and staffing-group annual rollups
- `PORT-003` Monthly required, roster, and frontline headcount reporting
- `PORT-004` Staffing waterfall and variance presentation
- `PORT-005` Empty, incomplete, stale, and mixed-scope states

## Data Persistence

- `DATA-001` PostgreSQL relational persistence
- `DATA-002` Draft recovery and autosave failure behavior
- `DATA-003` Backup export, validation, and replacement import
- `DATA-004` Planning-data clearing and destructive-action confirmation
- `DATA-005` Legacy planning-data migration and schema compatibility
