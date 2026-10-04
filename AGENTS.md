# WFM Toolkit Agent Guide

This file is the working contract for AI coding agents and future contributors operating in this repository.

It is intentionally practical. Follow these rules unless the user explicitly asks for an exception.

## Purpose

WFM Toolkit is an operational workforce-management application.

The UI should feel like:
- serious internal software
- clear and trustworthy
- operational, not promotional
- consistent across calculators, planning, staffing groups, and dialogs

The app is no longer in a mixed-style transition. New work should extend the current `PrimeVue unstyled + Tailwind + shared wrapper` system rather than inventing new patterns.

## Repository Documentation

Maintain documentation that helps contributors and AI agents run, test, and change
this application: this guide, frontend/labeling conventions, and current READMEs.
Do not recreate retrospective specs, roadmaps, interview logs, audit reports, or
concept mockups unless the user requests them. Use the live code and focused tests
to establish current behavior.

For user-facing terminology, follow [DATA_LABELING.md](DATA_LABELING.md).

## Source Of Truth

When making frontend decisions, use this priority order:
1. User request
2. This `AGENTS.md`
3. [FRONTEND_STANDARDS.md](FRONTEND_STANDARDS.md)
4. Existing shared wrapper layer in [src/components/ui](src/components/ui)
5. Existing app patterns already used on current pages

If those sources conflict, prefer the higher item.

## Current Frontend Stack

- Vue 3 with `<script setup>`
- PrimeVue in `unstyled` mode only
- Tailwind CSS v4
- Shared styling entrypoint: [src/tailwind.css](src/tailwind.css)
- Shared UI wrappers: [src/components/ui](src/components/ui)

PrimeVue is used for behavior and accessibility primitives.
Tailwind is used for layout and visual styling.
Feature pages should compose wrappers instead of styling PrimeVue components ad hoc.

## Non-Negotiable Frontend Rules

### 1. Do not import PrimeVue directly in feature pages

Allowed:
- files in [src/components/ui](src/components/ui)

Not allowed:
- feature pages under `src/components/`
- planner subcomponents under `src/components/planner/`
- planning pages under `src/components/planning/`
- calculator feature components under `src/components/calculators/`

If a PrimeVue capability is needed, add or extend a wrapper in `src/components/ui`.

Current known exception:
- none intended outside the wrapper layer

### 2. Use shared wrappers before creating local patterns

Before creating a new page-local control or layout pattern, check these wrappers first:
- `AppButton`
- `AppIconButton`
- `AppMenu`
- `AppDialog`
- `AppTextField`
- `AppTextArea`
- `AppNumberField`
- `AppTableNumberField`
- `AppTableDateField`
- `AppSelect`
- `AppCheckbox`
- `AppFieldGroup`
- `AppPageHeader`
- `AppSectionHeader`
- `AppPanel`
- `AppWorkspaceSection`
- `AppStatStrip`
- `AppTableShell`
- `AppEmptyState`
- `AppStatusMessage`

If a needed pattern appears in 2 or more places, prefer creating/extending a shared wrapper instead of repeating the implementation.

### 3. Do not reintroduce legacy semantic classes

Do not create or reintroduce classes like:
- `submit-btn`
- `secondary-btn`
- `danger-btn`
- `urgent-btn`
- `mode-btn`
- `monthly-tab-btn`
- `monthly-mode-btn`
- `result-tab-btn`
- `home-auth-*`

Shared styling should come from:
- Tailwind utilities in the component
- wrapper components
- focused shared CSS layers in [src/styles](src/styles)

### 4. Use native tables for planner worksheets

For dense operational worksheets, use native HTML tables, not a generic data-table library.

Planner and staffing tables should:
- keep native `<table>` markup
- use shared table wrappers/shells where available
- use `AppTableNumberField` and `AppTableDateField` for editable worksheet cells
- avoid introducing ad hoc input styling inside the table

### 5. Keep page shells consistent

Top-level pages should be built from the same visual language:
- `app-frame`
- `AppPageHeader`
- `AppPanel`
- `AppWorkspaceSection`
- `AppStatStrip`
- `AppTableShell`

Pages should not invent a separate shell unless there is a strong reason.

### 6. Maintain accessibility as a baseline requirement

Every new or changed screen should keep:
- clear visible labels
- accessible names for icon-only actions
- form errors surfaced as text, not color alone
- meaningful button text
- keyboard-friendly dialogs and menus
- table inputs with `aria-label` where the header alone is not sufficient

## File Organization Rules

Use these directories intentionally:

- [src/components/ui](src/components/ui)
  Shared UI primitives only

- [src/components/planning](src/components/planning)
  Call-center and staffing-group list/detail pages

- [src/components/planner](src/components/planner)
  Planner-specific shell pieces, tables, dialogs, and charts

- [src/components/calculators](src/components/calculators)
  Calculator-specific feature components

- [src/composables](src/composables)
  UI orchestration and page-level state management

- [src/planner](src/planner)
  Pure planner/business logic modules

- [src/styles](src/styles)
  Focused shared style layers only

## Preferred Change Strategy

When implementing new work:
1. Extend an existing wrapper if the need is generic
2. Create a new wrapper if the need is repeated and broadly useful
3. Keep feature files focused on composition and business behavior
4. Push non-UI logic into composables or pure modules when a file starts doing too much

Do not solve a system problem with a one-off page patch if a shared primitive is the right fix.

## Architecture And Data Safety

- Rust owns public HTTP, Erlang, CSV processing, and staffing calculations. Keep numerical logic in `rust/erlang` independent of HTTP and filesystem operations; adapters and file handling belong in `rust/server`.
- Python owns private Prophet forecasting. Keep it on loopback and run fits in isolated processes with an execution deadline that stops the process and its children. A proxy timeout alone is insufficient.
- Ordinary saves update changed records, not an entire stored workspace. Pass the unmodified loaded baseline to repository saves; compare it with current records inside the same transaction. Reject conflicting edits and preserve unrelated changes. Whole-workspace replacement is for explicit backup restore or legacy migration.
- Load related database rows in one read transaction so a workspace is a consistent snapshot.
- Async work must capture its scope, record identity, and input snapshot before starting. Apply results only to that context and input version. Cancel requests when their context ends, ignore late responses, and never automatically retry a computation POST.
- Bound input sizes, model complexity, execution duration, upload duration, concurrency, and temporary-file retention. Receiving uploads must use capacity separate from calculation workers. Describe configurable limits in the current runtime README.
- Split modules by responsibility when a change becomes difficult to reason about. Avoid arbitrary line limits, generic frameworks, and abstractions added solely to shorten files.
- Prefer browser scrolling for dense worksheets. Fixed-height panes are appropriate for compact selectors; do not trap large worksheets in nested scroll areas.

## Specific Guidance For New Features

### New page

Default composition:
- `AppPageHeader`
- one or more `AppPanel` or `AppWorkspaceSection`
- `AppStatStrip` for compact KPIs
- `AppTableShell` for operational lists
- `AppEmptyState` when no data exists

### New dialog

Use:
- `AppDialog`
- `AppFieldGroup`
- `AppTextField` / `AppNumberField` / `AppSelect`
- `AppTextArea` for concise multi-line rationale or notes
- `AppStatusMessage`

Do not build a raw PrimeVue dialog in a feature page.

### New dense worksheet

Use:
- native table
- `AppTableNumberField`
- `AppTableDateField`
- shared table shell styles

Do not use generic card stacks for worksheet data entry.

### New menu or popup command surface

Use:
- `AppMenu`

Do not import `primevue/menu` directly into feature code.

## Change Review Checklist

Before finishing frontend work, check:
- Did I avoid direct PrimeVue imports outside `src/components/ui`?
- Did I use shared wrappers instead of creating local patterns?
- Did I avoid reintroducing legacy semantic classes?
- Does the page still match the current operational design language?
- If I added repeated UI, should it be a wrapper instead?
- Did I preserve accessible labels and button names?

## Verification Expectations

Default verification after meaningful frontend changes:
- `npm run build`
- `npm test`

Also run this when navigation, dialogs, or major flows changed:
- `npm run test:e2e`

If one of those cannot be run, say so clearly in the final response.

For backend changes, run Rust formatting, Clippy, and relevant workspace tests; run Python forecasting tests when that boundary changes. Check executable startup when process supervision or deployment changes.

Keep focused numerical, API contract, persistence/conflict, and critical browser-flow coverage. Add a regression for a concrete defect; avoid duplicate assertions across layers and permanent one-time benchmarks. Documentation-only changes need link/content checks, not a full application test run.

## Anti-Patterns To Avoid

Do not:
- mix old CSS-era patterns with new wrapper patterns on the same feature unless necessary
- add new direct PrimeVue usage to feature pages
- rebuild one-off button, dialog, input, or section styles inline when wrappers already exist
- create decorative marketing layouts for operational screens
- use generic “AI dashboard” styling
- turn every section into a different visual language
- make structural changes without updating tests when the flow meaningfully changed

## If You Are Unsure

When uncertain, prefer:
- flatter operational layouts
- composition over reinvention
- wrapper extension over local duplication
- native tables for dense planning worksheets
- smaller, focused files over giant orchestrators

If a change feels like it needs a lot of custom styling, first ask whether a wrapper or focused shared component should exist.
