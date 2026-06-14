---
id: FOUND-005
title: Planning UI, Accessibility, Worksheet, and Validation Standards
status: draft
owners: []
depends_on: [FOUND-001]
last_reviewed: 2026-06-14
---

# Purpose

Define the shared interaction and presentation contract for planning screens.

# Product Character

Planning screens shall feel operational, clear, trustworthy, dense where appropriate, and consistent across pages and dialogs. They must not use promotional dashboard styling in place of usable planning structure.

# Page Structure

- Top-level pages shall use a consistent header, content width, spacing, and surface hierarchy.
- Parent and selected-child collections should use a master-detail layout when simultaneous comparison is useful.
- Summary metrics shall appear only when they are trustworthy, scope-consistent, and decision-useful.
- Empty states shall state why no data appears and identify the first valid action.

# Forms and Dialogs

- Every input shall have a visible label.
- Required fields, units, defaults, and validation constraints shall be understandable before submission.
- Dialogs shall trap focus, support keyboard dismissal where safe, and restore focus to the initiating control.
- Destructive dialogs shall name the affected record and consequence.
- Form errors shall appear as text and shall not rely on color alone.
- Failed submission shall preserve user-entered values.

# Worksheet Tables

- Dense planning entry shall use semantic native tables.
- Column headers shall state or explain units and derived meanings.
- Editable cells shall have accessible names that include row and column context when headers are insufficient.
- Keyboard users shall be able to reach every editable cell and action.
- Sticky headers or columns may be used when they preserve context without obscuring data.
- Derived values shall be visually distinguishable from editable inputs.
- Horizontal overflow shall not remove access to columns.

# Status and Feedback

- Loading, saving, saved, restored, warning, error, and empty states shall be distinguishable in text.
- Long calculations shall communicate progress and prevent duplicate submission.
- Success shall be shown only after persistence or calculation completes.
- Warnings shall identify whether they block save, finalization, or neither.
- Stale results shall be identified when an input changes after calculation.

# Accessibility Baseline

- Planning functionality shall be operable by keyboard.
- Icon-only actions shall have accessible names.
- Current tabs, steps, and selected records shall expose programmatic state.
- Text and interactive controls shall meet WCAG 2.2 AA contrast expectations.
- Charts shall have accessible names and an equivalent tabular or textual interpretation for required decisions.
- Focus indicators shall remain visible.
- Motion shall not be required to understand status.

# Responsive Behavior

- Desktop layouts may prioritize dense operational comparison.
- Narrow layouts shall preserve task order and action ownership.
- Tables may scroll horizontally rather than collapse into ambiguous cards.
- No required action shall be available only on hover.

# Validation Requirements

- Client validation may provide immediate feedback but shall not replace domain validation.
- Validation messages shall identify the field or row and corrective action.
- File validation shall distinguish schema errors, row errors, and coverage errors.
- A page with multiple errors shall provide both summary and local context when practical.

# Acceptance Scenarios

## Correct a Dialog Error

**Given** a required name is empty  
**When** the user submits the dialog  
**Then** focus moves to or is associated with the invalid field  
**And** entered values in other fields remain.

## Edit a Worksheet by Keyboard

**Given** a monthly worksheet is open  
**When** a keyboard user moves through editable cells  
**Then** each cell announces its month, measure, and unit  
**And** derived cells are not presented as editable.

## Understand a Chart Without Sight

**Given** a staffing waterfall is displayed  
**Then** its movements and resulting monthly values are also available through text or table data.

# Open Questions

1. Is formal WCAG conformance testing required for approval?
2. Which worksheets require copy and paste across cell ranges?
3. Should warnings use one global severity model across all specs?

# Implementation Traceability

- `FRONTEND_STANDARDS.md`
- `src/components/ui/`
- `src/components/planner/`
- `src/components/planning/`

