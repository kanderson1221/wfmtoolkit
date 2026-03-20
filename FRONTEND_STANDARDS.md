# Frontend Standards

This document explains how the frontend should be built and maintained in WFM Toolkit.

It is meant to help both human contributors and AI coding agents make consistent design and implementation decisions over time.

Use [AGENTS.md](/Users/kevinanderson/Desktop/wfmtoolkit/AGENTS.md) for the short operational rules.
Use this document for the deeper rationale, patterns, and examples.

## 1. Product Character

WFM Toolkit is not a marketing site.
It is an operations application for:
- workforce planning
- staffing groups
- call-center defaults
- staffing calculators
- operational staffing decisions

The interface should feel:
- clear
- disciplined
- efficient
- credible
- easy to scan

The app should not feel:
- playful
- trendy for its own sake
- overly rounded and bubbly
- card-stacked without purpose
- like a generic admin template

## 2. Stack Philosophy

### PrimeVue

PrimeVue is used for:
- interaction behavior
- accessibility primitives
- dialog/menu/input mechanics

PrimeVue is **not** the visual design system.
We run it in `unstyled` mode and control appearance ourselves.

Relevant files:
- [src/plugins/primevue.js](/Users/kevinanderson/Desktop/wfmtoolkit/src/plugins/primevue.js)
- [src/components/ui](/Users/kevinanderson/Desktop/wfmtoolkit/src/components/ui)

### Tailwind

Tailwind is used for:
- layout
- spacing
- typography
- borders
- backgrounds
- responsive structure

Tailwind should describe composition directly in components, while repeated patterns move into wrappers or focused CSS layers.

Relevant files:
- [src/tailwind.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/tailwind.css)
- [src/styles/base.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/base.css)
- [src/styles/layout.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/layout.css)
- [src/styles/primitives.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/primitives.css)
- [src/styles/calculators.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/calculators.css)
- [src/styles/planner.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/planner.css)

## 3. Core Rule: Shared UI Layer First

Most frontend work should be composed from the shared UI layer in [src/components/ui](/Users/kevinanderson/Desktop/wfmtoolkit/src/components/ui).

### Current shared primitives

Interactive primitives:
- `AppButton`
- `AppIconButton`
- `AppMenu`
- `AppDialog`
- `AppTextField`
- `AppNumberField`
- `AppTableNumberField`
- `AppTableDateField`
- `AppSelect`
- `AppCheckbox`

Layout and content primitives:
- `AppPanel`
- `AppWorkspaceSection`
- `AppPageHeader`
- `AppSectionHeader`
- `AppStatStrip`
- `AppTableShell`
- `AppEmptyState`
- `AppStatusMessage`

### Decision rule

If a UI pattern:
- is already represented by a wrapper, use the wrapper
- appears in 2 or more places, create or extend a wrapper
- is highly specific to one feature, keep it local but still align visually with the wrappers

## 4. Page Structure Standards

### Page shell

Top-level pages should usually use:
- `app-frame`
- `AppPageHeader`
- one or more `AppPanel` or `AppWorkspaceSection`
- `AppStatStrip` for summary metrics
- `AppTableShell` for record lists

### Why

This creates:
- a shared left/right alignment line
- predictable spacing
- consistent hierarchy
- easier maintenance

### Example page types

Planning home:
- page header
- summary strip
- operational table

Call center detail:
- compact title row
- master/detail workspace
- staffing groups on the left and annual plans on the right

Calculator page:
- page header
- control panel
- results workspace

### Desktop master/detail workspaces

For desktop-first operational pages that manage a parent list and the selected record's child records on the same screen, prefer a split master/detail workspace instead of a chain of intermediate pages.

This pattern is a strong fit for:
- call center -> staffing groups -> annual plans
- operational selectors with a list on the left and comparable child records on the right

Master/detail pages should prefer:
- one compact title row above the workspace
- a fixed-height split workspace on desktop
- independent vertical scrolling inside each pane
- aligned pane headers and first-row starting lines when practical
- one clear purpose per pane

Pane ownership should stay obvious:
- left pane owns selection and collection-level actions
- right pane owns the selected record's detail state and child-level actions

Do not:
- insert a redundant middle page when the same work can happen in a selected-detail pane
- split collection actions across both panes without a strong reason
- add dashboard content above the workspace unless it is clearly useful for the task on that page

### Summary metrics are optional, not automatic

Use `AppStatStrip` only when the metrics are:
- trustworthy
- comparable
- decision-useful for that page

Do not show summary metrics when they:
- aggregate across incompatible scopes like mixed planning years
- push the real workspace below the fold
- repeat what users can already infer from the records below

If a page is primarily a management workspace, it is acceptable to remove the summary band entirely.

## 5. Surface Hierarchy

Use surfaces deliberately.

### Primary surface

Use `AppPanel` for:
- major page-level containers
- large control panels
- major result areas

### Secondary surface

Use `AppWorkspaceSection` for:
- meaningful sub-sections within a page or panel
- groups of related controls
- planner subsections like monthly inputs or training pipeline

### Summary strip

Use `AppStatStrip` when:
- the values are KPIs
- the layout is compact
- the values should scan horizontally

Do not use a summary strip when each card needs unique behavior or complex content.

### Empty state

Use `AppEmptyState` when:
- there is no data yet
- the page needs a first action
- the UI would otherwise be blank or confusing

## 6. Forms And Inputs

### Standard forms

Use:
- `AppFieldGroup`
- `AppTextField`
- `AppNumberField`
- `AppSelect`
- `AppCheckbox`
- `AppStatusMessage`

This applies to:
- dialogs
- auth forms
- calculator control forms
- call center settings
- staffing group settings

### Dense worksheet tables

Use:
- native table markup
- `AppTableNumberField`
- `AppTableDateField`

Rationale:
- planners need high-density input
- worksheet tables should remain fast and readable
- native tables provide the best control for this use case

### Native inputs still allowed

Native inputs are acceptable only when there is a strong reason:
- file upload controls
- extremely lightweight copy-action selects
- browser-native interactions that wrappers would not improve

If a native input starts repeating, promote it into the shared UI layer.

## 7. Dialog Standards

Dialogs should use:
- `AppDialog`
- `AppFieldGroup`
- wrapped inputs
- `AppStatusMessage`

Dialog layout should usually follow:
1. title and description
2. grouped fields
3. validation/status area
4. footer actions

Dialogs should not:
- use ad hoc PrimeVue `pt` definitions in feature files
- restyle themselves from scratch
- mix unrelated form groups without headers or spacing

## 8. Menu Standards

Menus should use:
- `AppMenu`

Feature pages should not import `primevue/menu` directly.

Menu items should:
- have clear text
- support an icon if useful
- use the active state consistently
- use the danger tone only for destructive actions like sign out or delete

For dense operational lists:
- keep the primary action visible in the row when it is frequently used
- move secondary and destructive actions into an overflow menu
- keep overflow menus compact and calm
- prefer neutral menu text for hidden destructive actions, then confirm or require intent at the next step if needed

Do not make destructive row actions the loudest visual element in an otherwise calm workspace.

## 9. Table Standards

### Operational data tables

Use:
- native `<table>`
- `AppTableShell`

Expected behavior:
- text columns left-aligned
- numeric columns right-aligned
- action columns right-aligned
- row actions should stay compact and readable

### Operational row lists

Not every operational list should be a table.

For split workspaces, side panes, and record selectors, prefer divided row lists when they are easier to scan than a full table.

Operational row lists should:
- read as rows, not stacked cards
- keep row heights compact and consistent
- use a shared alignment rhythm across sibling panes when practical
- use the row itself for structure before adding extra boxes or helper copy
- keep visible actions minimal

Prefer:
- a selected-row marker or subtle tint instead of a heavy filled card state
- one clear heading per pane
- compact metadata only when it adds real value

Avoid:
- repeated contextual subtitles that restate the page title
- helper text that explains obvious layout behavior
- per-row card containers when a flat row list is sufficient

### Comparable record rows

If users need to compare records across rows:
- use one shared header row for the comparison fields
- align values into stable columns
- keep repeated labels out of each row

For numeric comparison columns:
- right-align values
- use consistent column widths between header and rows
- prefer spacing and alignment over decorative dividers when dividers introduce visual noise

For mixed rows:
- keep the identity column left-aligned
- keep action controls on the far right

### Worksheet tables

Use:
- native `<table>`
- sticky or emphasized month column when helpful
- compact input wrappers
- hover/selected-row state through shared table styling

Do not:
- replace worksheet tables with generic data-table components
- use full-size form fields inside dense tables

## 10. Planner-Specific Standards

The planner has two main modes:
- `Demand Model`
- `Staffing Plan`

Planner work should stay operational and worksheet-first.

### Selection and open behavior

In dense desktop workspaces, selection and navigation do not have to be the same action.

Prefer:
- single click to select a row or change context
- explicit `Open` actions for navigation into deeper work
- optional double click as a desktop shortcut for opening

Do not make a selected-state marker imply one behavior while the row click does something else.

### For planner tabs

Use:
- `AppSectionHeader` for top-of-tab framing
- `AppStatStrip` for compact tab summaries
- `AppWorkspaceSection` for subsections inside a tab
- native tables for the editable worksheets

### Planner tables should prefer
- compact numeric fields
- clear copy utilities
- consistent month selection behavior
- plain business labels over technical jargon

### Planner charts should
- support the current worksheet story
- be secondary to the inputs, not replace them
- use the same month-selection language when interactive

## 11. Calculator-Specific Standards

Calculators should feel like the same product as planning.

That means:
- same page shell
- same header hierarchy
- same button behavior
- same status messaging
- same spacing logic

Calculator screens should not drift into a different mini design system.

## 12. Styling Ownership

### Where styling belongs

Use:
- wrappers for reusable visual patterns
- Tailwind utilities for local composition
- focused CSS files for shared domain-specific styling

### Where styling should not live

Avoid:
- giant one-off scoped style blocks
- feature-level redefinitions of wrapper patterns
- legacy semantic utility classes like `submit-btn`
- inline ad hoc PrimeVue styling in feature components

### Shared style layers

- [src/styles/base.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/base.css)
  low-level baseline rules

- [src/styles/layout.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/layout.css)
  app frame, surfaces, layout bands, shared section mechanics

- [src/styles/primitives.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/primitives.css)
  supporting primitive and reusable interaction styles

- [src/styles/calculators.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/calculators.css)
  calculator-specific shared visuals

- [src/styles/planner.css](/Users/kevinanderson/Desktop/wfmtoolkit/src/styles/planner.css)
  planner-specific shared visuals

## 13. Architecture Expectations

### Feature components

Feature components should mostly do:
- composition
- event wiring
- local UI behavior

### Composables

Composables should own:
- page-level state
- orchestration
- save/load behavior
- interactions between UI and storage/API

Current examples:
- [src/composables/useMonthlyPlanBuilder.js](/Users/kevinanderson/Desktop/wfmtoolkit/src/composables/useMonthlyPlanBuilder.js)
- [src/composables/useCsvBatchCalculator.js](/Users/kevinanderson/Desktop/wfmtoolkit/src/composables/useCsvBatchCalculator.js)
- [src/composables/usePlanningWorkspace.js](/Users/kevinanderson/Desktop/wfmtoolkit/src/composables/usePlanningWorkspace.js)
- [src/composables/useHashNavigation.js](/Users/kevinanderson/Desktop/wfmtoolkit/src/composables/useHashNavigation.js)

### Pure planner logic

Planner/business logic belongs in:
- [src/planner/shared.js](/Users/kevinanderson/Desktop/wfmtoolkit/src/planner/shared.js)
- [src/planner/demandModel.js](/Users/kevinanderson/Desktop/wfmtoolkit/src/planner/demandModel.js)
- [src/planner/staffingModel.js](/Users/kevinanderson/Desktop/wfmtoolkit/src/planner/staffingModel.js)

Do not push business logic back into page templates or large feature components unless there is a compelling reason.

## 14. Accessibility Standards

Every new or modified UI should preserve:
- clear field labels
- visible errors
- icon-only controls with `aria-label`
- keyboard-operable dialogs and menus
- accessible button names
- `aria-label` on dense worksheet fields where column context alone is not enough

Do not rely on:
- color alone
- hover-only affordances
- placeholder text as the only label

## 15. Testing Standards

### Required verification for meaningful frontend work

Run:
- `npm run build`
- `npm test`

Also run:
- `npm run test:e2e`

when navigation, dialogs, workspace flows, or significant interactions changed.

### Test focus

Use Vitest for:
- wrappers
- composables
- focused component behavior

Use Playwright for:
- smoke flows
- navigation
- key create/edit/save paths

Do not leave major frontend refactors unverified.

## 16. Anti-Patterns

Avoid these:

### Design anti-patterns
- “AI dashboard” visuals
- overly decorative hero sections on operational screens
- too many competing surface styles
- full-page bubble-card stacks
- page-by-page visual reinvention

### Code anti-patterns
- direct PrimeVue imports in feature pages
- repeated ad hoc `pt` config in feature components
- reintroducing legacy semantic classes
- putting orchestration and rendering into one giant file when a composable is appropriate
- mixing old and new patterns in the same feature without a good reason

## 17. Practical Decision Matrix

### If you need a new button
- use `AppButton`

### If you need an icon-only action
- use `AppIconButton`

### If you need a popup menu
- use `AppMenu`

### If you need a modal
- use `AppDialog`

### If you need a standard number input
- use `AppNumberField`

### If you need a worksheet number input
- use `AppTableNumberField`

### If you need a worksheet date input
- use `AppTableDateField`

### If you need a page section
- use `AppWorkspaceSection`

### If you need a KPI strip
- use `AppStatStrip`

### If you need a list table shell
- use `AppTableShell`

## 18. Definition Of A Good New Frontend Change

A change is in good shape when:
- it uses the shared stack correctly
- it does not introduce a new visual dialect
- it improves or preserves clarity
- it does not make future edits harder
- it is testable and verified
- another contributor can look at it and understand where similar future work belongs

That is the standard to aim for on every new feature and every refactor.
