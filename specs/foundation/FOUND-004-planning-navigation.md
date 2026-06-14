---
id: FOUND-004
title: Planning Navigation, Deep Links, and Route Recovery
status: draft
owners: []
depends_on: [FOUND-001, FOUND-002]
last_reviewed: 2026-06-14
---

# Purpose

Define how users enter, navigate, bookmark, and recover planning contexts.

# Navigable Contexts

The navigation model shall support:

- planning portfolio
- call-center workspace
- staffing-group workspace and selected year
- staffing-group data, forecast import, intraday, and plan collections
- existing annual plan
- new budget or updated-plan workflow
- selected imported forecast where applicable

# Functional Requirements

- Every persisted call center, staffing group, forecast, and plan opened in the main workspace shall have a stable deep-link representation.
- Browser back and forward navigation shall restore the prior valid planning context.
- Selecting a planning year shall be reflected in the route when the selected child context depends on year.
- Opening a plan shall restore its owning call center and staffing group.
- Routes shall use stable identifiers rather than names.
- User-entered names shall not require route changes.
- Navigation away from unsaved work shall follow the draft and recovery rules in `DATA-002`.

# Route Recovery

- An unknown top-level planning route shall return to the portfolio.
- A missing call-center identifier shall return to the portfolio with an explanatory status.
- A missing staffing-group identifier shall return to its owning call center when that context is valid.
- A missing forecast or plan identifier shall return to the applicable staffing-group collection.
- An invalid year shall fall back to a supported year without creating data.
- Recovery shall not expose a blank page or uncaught error.

# Context Preservation

- Switching between staffing-group sections shall preserve the selected group and planning year.
- Returning from a plan editor shall return to the owning staffing group's plans context.
- Returning from forecast import shall return to the owning staffing group's imported forecasts context.
- Opening the public root or another application area is outside this spec, except that planning deep links shall remain independently loadable.

# Accessibility Requirements

- Primary destinations shall be keyboard reachable.
- Current location shall be programmatically identifiable.
- Breadcrumbs shall communicate hierarchy without being the only navigation mechanism.
- Menu actions shall have meaningful accessible names.
- Route recovery messages shall be available as text.

# Acceptance Scenarios

## Open a Plan Deep Link

**Given** a valid saved plan URL  
**When** the browser loads it directly  
**Then** the owning call center and staffing group are resolved  
**And** the requested plan opens.

## Recover a Deleted Plan Route

**Given** a bookmarked plan has been deleted  
**When** the bookmark is opened  
**Then** the user is returned to the staffing group's plans list  
**And** receives a non-blocking explanation.

## Preserve Year Across Sections

**Given** the user selected 2027 for a staffing group  
**When** the user moves from actuals to plans  
**Then** 2027 remains selected.

# Open Questions

1. Should selected table rows be encoded in routes?
2. Should route recovery use transient messages or persistent empty states?
3. Must unsaved new-record routes survive full browser reload before draft creation?

# Implementation Traceability

- `src/appRoutes.js`
- `src/App.vue`
- `src/components/planning/PlanningCenterView.vue`
- `src/components/MonthlyPlanBuilder.vue`

