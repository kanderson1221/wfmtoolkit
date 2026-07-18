---
id: FOUND-001
title: Planning Workspace Purpose, Actors, Scope, and Terminology
status: draft
owners: []
depends_on: []
supersedes: []
last_reviewed: 2026-06-14
---

# Purpose

This specification defines the product boundary, intended users, core capabilities, and shared terminology for the Planning Workspace.

The Planning Workspace is a workforce planning application backed by a
relational system of record. It helps a workforce planner convert externally
prepared demand forecasts into annual staffing requirements and actionable
staffing plans, compare those plans with actual performance, and maintain
updated operating plans over time.

This specification is the foundation for all other Planning Workspace specifications. More detailed specifications may refine behavior within this boundary but must not silently expand it.

# Product Outcome

The Planning Workspace shall enable a user to complete this end-to-end planning cycle:

1. Create a call center and its staffing groups.
2. Configure operating calendars, service goals, and planning assumptions.
3. Import a demand forecast produced by an external forecasting process.
4. Validate and associate the imported forecast with a staffing group and planning period.
5. Convert forecast demand into monthly staffing requirements.
6. Build a staffing supply plan using starting headcount, attrition, hiring, training, and availability assumptions.
7. Finalize an annual budget plan.
8. Import actual demand and handle-time results.
9. Compare actual results with the plan.
10. Create an updated plan using actuals through a selected month.
11. Review staffing requirements, supply, gaps, and risk within the owning call center.

# Scope

## In Scope

The Planning Workspace includes:

- call-center creation, configuration, editing, and deletion
- staffing-group creation, configuration, editing, and deletion
- operating weekdays, operating hours, holidays, and closure dates
- staffing-group service goals and intraday demand profiles
- import and validation of externally produced forecasts
- storage and selection of imported forecast versions
- annual budget and updated-plan lifecycles
- agent availability, presence loss, occupancy, and adherence assumptions
- monthly workload and staffing-requirement calculations
- intraday Erlang-based staffing requirements within an annual plan
- starting headcount, attrition, hiring, training, and frontline-readiness planning
- daily actuals import and monthly aggregation
- planned-versus-actual demand, workload, requirement, and staffing comparisons
- cross-year headcount and training-pipeline handoff
- annual call-center and staffing-group rollups
- PostgreSQL relational persistence, draft recovery, backup, restore, and data
  clearing
- planning-specific navigation, validation, accessibility, and error recovery

## Out of Scope

The Planning Workspace does not include:

- generating, training, tuning, or evaluating statistical forecasts
- editing an imported forecast as though the Planning Workspace were the forecasting source
- standalone Erlang calculator screens
- general-purpose CSV staffing calculators or file processors
- interval or shift scheduling
- assigning named employees to shifts, teams, or activities
- real-time adherence or intraday operations monitoring
- timekeeping, payroll, recruiting, or learning-management workflows
- authentication, user accounts, permissions, or role administration
- multi-user collaboration, approvals, or concurrent editing
- account, permission, and multi-tenant administration
- cross-deployment cloud synchronization
- automatic integration with external forecasting, HR, telephony, or workforce-management systems

# Actors

## Primary Actor: Workforce Planner

The workforce planner owns the planning workflow. This actor:

- configures call centers and staffing groups
- imports forecasts and actuals
- sets planning assumptions
- reviews calculated requirements
- builds hiring and training plans
- saves drafts and finalizes annual plans
- creates updated plans
- reviews staffing risk within a call center
- exports and restores local backups

The product shall not require the planner to understand the application's internal storage schema or implementation details.

## Secondary Actor: Planning Reviewer

A planning reviewer examines assumptions and outputs to support an operational or financial decision. This actor may be a workforce leader, operations leader, finance partner, or similar stakeholder.

Within the currently scoped product, a reviewer uses the same local workspace and capabilities as the workforce planner. Reviewer-specific accounts, permissions, comments, and approval workflows are out of scope.

## External Systems

External systems are data sources, not interactive actors within the application.

They may provide:

- forecast files
- actual contact and average-handle-time files
- opening headcount or other assumptions entered by the planner

The Planning Workspace shall not assume a live connection to an external system.

# System Context

```text
External forecast process
        |
        | forecast file
        v
Planning Workspace
  - organization setup
  - forecast import
  - requirement calculation
  - staffing supply planning
  - actuals comparison
  - call-center reporting
        |
        | transactional relational records and backups
        v
PostgreSQL planning database
```

The application may use separate services for calculation support, but
PostgreSQL is the system of record for saved planning data.

# Core Product Principles

## P-1: Planning Workspace Only

Planning capabilities shall be presented as one coherent workspace. Standalone calculator and forecast-modeling products are outside this specification set.

## P-2: Forecasts Are Imported Inputs

The system shall treat forecasts as externally produced planning inputs.

It may:

- validate forecast structure and values
- normalize supported units and granularities
- aggregate imported values for planning
- store imported versions
- associate a forecast with a staffing group and planning period
- preserve the values used by a plan

It shall not:

- train a forecasting model
- infer seasonality
- generate a statistical forecast
- tune forecasting parameters
- present the Planning Workspace as the source of forecast intelligence

## P-3: Plans Preserve Their Basis

A saved plan shall retain the demand values and assumptions used to produce its results. Replacing or deleting an imported forecast shall not silently rewrite an existing saved plan.

Detailed snapshot and dependency behavior is defined by the forecast-to-plan handoff specification.

## P-4: Calculations Must Be Explainable

Calculated requirements and staffing outputs shall identify their relevant inputs, units, and assumptions. A planner must be able to understand why a result changed without reading source code.

## P-5: Durable Data Ownership

Planning data shall be stored transactionally in PostgreSQL. The workspace
shall provide backup, restore, and clear-data controls. Deployment-level
authentication, authorization, tenancy, replication, and retention policy are
outside the current product scope.

## P-6: Operational Clarity

The interface shall favor dense, trustworthy, and comparable operational information over promotional or decorative presentation.

## P-7: Explicit Destructive Actions

Deletion, replacement import, restore, and clear-data operations shall identify affected records and require confirmation when data loss or dependency impact is possible.

# High-Level Functional Requirements

## FR-1: Organization Structure

The system shall organize planning data into call centers and staffing groups.

## FR-2: Planning Period

The system shall organize forecasts, plans, actuals, and call-center reporting by a clearly identified planning period, normally a calendar year.

## FR-3: Forecast Import

The system shall allow a planner to import an externally produced forecast and shall reject data that cannot safely support planning.

## FR-4: Requirement Planning

The system shall convert accepted forecast demand and planning assumptions into monthly staffing requirements using a supported requirement method.

## FR-5: Staffing Supply Planning

The system shall allow a planner to model how opening headcount, attrition, hiring, training, and availability affect monthly staffing supply.

## FR-6: Plan Lifecycle

The system shall support draft annual budget plans, finalized budget plans, and updated plans derived from an established planning baseline.

## FR-7: Actuals

The system shall allow a planner to import actual demand and handle-time data and compare aggregated actuals with the applicable plan.

## FR-8: Call-Center Review

The system shall summarize plan coverage, demand, requirement, staffing supply, actuals, and staffing gaps across the staffing groups within one call center for a selected planning year. The planning home shall remain a call-center directory rather than a cross-center report.

## FR-9: Persistence and Recovery

The system shall persist planning work locally, recover supported drafts, and allow the user to export and restore a backup.

## FR-10: Validation and Failure Handling

The system shall surface validation and persistence failures as actionable text and shall not represent an operation as successful when required data was not accepted or saved.

# Business Invariants

## BI-1: Ownership

Each staffing group belongs to exactly one call center.

## BI-2: Planning Ownership

Each imported forecast and annual plan belongs to exactly one staffing group.

## BI-3: Explicit Year

Every annual plan shall have one explicit planning year.

## BI-4: External Forecast Provenance

Every imported forecast shall retain sufficient source metadata to distinguish it from other imports and identify when it was imported.

## BI-5: No Silent Mutation

Changes to organization defaults, imported forecasts, or actuals shall not silently alter the persisted basis of a finalized plan.

## BI-6: Traceable Updates

An updated plan shall retain a reference to the budget plan or prior update from which it was created and the actuals-through period used to create it.

## BI-7: Report Consistency

Call-center report values shall be aggregated only from records applicable to the selected planning year and identified plan role.

## BI-8: Failure Atomicity

An import or destructive replacement operation shall not leave the workspace in a partially applied state.

# Terminology

| Term | Definition |
|---|---|
| Planning Workspace | The scoped product used to import demand, calculate requirements, build annual staffing plans, compare actuals, and review call-center results. |
| Call Center | The parent organizational unit that owns operating-calendar defaults and one or more staffing groups. It may represent a physical site, virtual operation, business unit, or other planning boundary. |
| Staffing Group | A demand and staffing population planned together under shared service goals and operating assumptions. |
| Planning Year | The calendar year to which an annual plan and its monthly records apply. |
| Forecast | A set of future demand values produced by an external forecasting process and imported for planning use. |
| Forecast Version | One identifiable imported forecast dataset for a staffing group and planning period. |
| Forecast Coverage | The dates or months represented by an imported forecast. |
| Planning-Ready Forecast | An imported forecast that satisfies the validation and coverage rules required by a selected planning workflow. |
| Contacts | Offered workload units such as calls, chats, cases, or other interactions. The configured unit must be used consistently within a staffing group. |
| Average Handle Time (AHT) | Average productive handling time per contact, expressed in seconds unless a detailed data-contract specification states otherwise. |
| Workload Hours | Contact volume multiplied by AHT and converted to hours. |
| Requirement Method | The supported calculation approach used to convert demand into required staffing, such as workload ratio or intraday Erlang. |
| Required Headcount | The headcount calculated as necessary to handle forecast or actual demand under the plan's assumptions. |
| Staffing Supply | The headcount expected to be available after opening position, hiring, training, graduation, nesting, attrition, and other modeled movement. |
| Frontline Headcount | Staff considered productive and available to handle the staffing group's workload. |
| Roster Headcount | Total employed headcount represented in the plan, including applicable staff who are not yet frontline-ready. |
| Agent Availability | The share of paid time remaining after presence and off-phone losses. |
| Presence Loss | Paid time unavailable because of planned time off, unplanned absence, leave, or another defined absence category. |
| Utilization Loss | Scheduled time unavailable for workload because of meetings, training, coaching, breaks, or other off-phone activities. |
| Occupancy | The share of available handling time expected to be spent actively processing contacts. |
| Adherence | The share of scheduled time expected to be worked as planned. |
| Budget Plan | The annual baseline plan for a staffing group and planning year. It may be edited as a draft and then finalized. |
| Updated Plan | A later operating plan derived from a budget plan or prior update, incorporating actuals through a selected month and revised assumptions for the remaining period. |
| Current Plan | The plan version selected to represent the latest operating view for a staffing group and planning year. |
| Actuals | Observed contact volume and AHT imported after service dates have occurred. |
| Actuals-Through Month | The final month whose actual data is incorporated into an updated plan. |
| Staffing Gap | Planned staffing supply minus required headcount. A negative value indicates a shortage. |
| Planning Data | Relational records stored in PostgreSQL as the system of record. |
| Backup | A user-downloadable representation of supported planning data that can be validated and restored. |

# Acceptance Scenarios

## Scenario 1: Complete the Core Planning Cycle

**Given** a planner has an externally produced forecast  
**And** no organization data exists in the workspace  
**When** the planner creates a call center and staffing group  
**And** imports a valid forecast  
**And** configures planning assumptions  
**Then** the planner can create an annual budget plan  
**And** review monthly staffing requirements and supply  
**And** finalize the plan when all required sections are complete.

## Scenario 2: Forecast Generation Is Not Offered

**Given** a planner needs demand for a new plan  
**When** the planner opens the forecast area for a staffing group  
**Then** the workspace offers an import workflow for an externally produced forecast  
**And** does not offer statistical model training, seasonality tuning, or forecast generation.

## Scenario 3: Imported Forecast Replacement Does Not Rewrite a Plan

**Given** a saved plan was created from forecast version A  
**When** the planner imports forecast version B  
**Then** the saved plan continues to use its preserved demand basis  
**And** the planner must take an explicit action to create or update a plan using version B.

## Scenario 4: Create an Updated Operating Plan

**Given** a finalized budget plan exists  
**And** actuals have been imported through a selected month  
**When** the planner creates an updated plan  
**Then** the update identifies its source plan  
**And** identifies the actuals-through month  
**And** preserves a traceable relationship to the planning baseline.

## Scenario 5: Review a Call Center

**Given** multiple staffing groups in one call center have plans for the selected year
**When** the planner opens the call-center summary
**Then** the workspace presents comparable selected-year demand, requirement, staffing supply, actuals, and gap measures  
**And** does not combine records from incompatible planning years.

## Scenario 6: Recover From an Invalid Import

**Given** the planner selects a malformed or incomplete forecast file  
**When** the workspace validates the import  
**Then** it explains the blocking errors as text  
**And** does not partially replace an accepted forecast  
**And** leaves existing plans unchanged.

# Success Criteria

The Planning Workspace meets this foundational specification when:

- a planner can complete the defined end-to-end planning cycle without using a standalone calculator or internal forecasting model
- every plan is traceable to its staffing group, planning year, demand basis, and material assumptions
- imported forecasts are clearly represented as external inputs
- saved and finalized plans are protected from silent upstream mutation
- actuals and updated plans preserve meaningful lineage
- call-center reporting uses a consistent selected-year scope
- planning work can be recovered or transferred through supported backup
  behavior
- users receive clear validation and persistence feedback when an operation fails

# Dependencies and Follow-On Specifications

This specification is intentionally broad. Detailed behavior shall be defined by:

- `FOUND-002`: Domain hierarchy and relationships
- `FOUND-003`: Units, dates, time zones, rounding, and numeric conventions
- `ORG-001` through `ORG-004`: Organization setup
- `FIMP-001` through `FIMP-008`: Forecast import and plan handoff
- `PLAN-001` through `PLAN-012`: Annual requirement, staffing planning, and call-center reporting
- `ACT-001` through `ACT-006`: Actuals and updated plans
- `DATA-001` through `DATA-005`: Local persistence and recovery

# Open Questions

1. Is a call center always the required top-level planning unit, or should the terminology eventually support a more generic operation or business unit?
2. Must all imported forecasts include AHT, or may a planner supply AHT separately when the source forecast contains contacts only?
3. Which forecast granularities are required for the first supported release: monthly, daily, interval, or a defined subset?
4. Should imported forecast versions be immutable records, or may metadata such as display name be edited after import?
5. Is the planning year always January through December, or must future specifications support fiscal years?
6. Does "finalized" mean fully read-only, or may a finalized budget be reopened through an explicit controlled action?
7. Should a current plan be selected automatically from the newest update or only through an explicit planner action?
8. Which backup compatibility guarantees are required across application schema versions?

# Implementation Traceability

The existing application contains planning behavior that informed this scope, including:

- planning routes and hierarchy in `src/appRoutes.js`
- call-center, staffing-group, and plan persistence in `src/planningStorage.js`
- annual call-center rollups in `src/planner/annualPlanningRollup.js`
- plan workflow orchestration in `src/components/MonthlyPlanBuilder.vue`
- legacy local IndexedDB storage in `src/storage/localDataStore.js`

Current forecasting, calculator, and browser-local persistence behavior is not
normative for this specification. Existing forecast-generation flows and
document-based persistence conflict with the target boundary established here
and should be evaluated separately during implementation planning.
