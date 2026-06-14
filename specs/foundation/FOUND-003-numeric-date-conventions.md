---
id: FOUND-003
title: Units, Dates, Time Zones, Rounding, and Numeric Conventions
status: draft
owners: []
depends_on: [FOUND-001]
last_reviewed: 2026-06-14
---

# Purpose

Establish common interpretation and presentation rules for planning values so files, calculations, saved records, and reports remain comparable.

# Canonical Units

| Value | Canonical storage or calculation unit |
|---|---|
| Contacts | Non-negative count |
| Average handle time | Seconds per contact |
| Workload | Hours |
| Paid time and absence | Hours per agent |
| Occupancy, adherence, availability, attrition, yield | Decimal ratio internally; percent in user-facing entry and display |
| Headcount | People, with decimals allowed during calculations |
| Interval length | Minutes in configuration; seconds may be used by calculation APIs |
| Service-level target | Percent answered within threshold seconds |
| Dates | ISO `YYYY-MM-DD` |
| Month identity | First calendar day, `YYYY-MM-01` |
| Time of day | Local `HH:mm` in 24-hour form |

# Numeric Requirements

- Contact counts and time values shall reject non-finite values.
- Inputs that cannot be negative shall reject negative values rather than silently taking an absolute value.
- Percent inputs shall define whether they accept `80`, `0.8`, or both.
- Normalized stored percentages shall use one consistent representation per contract.
- Division by zero shall produce a defined unavailable result, not infinity or `NaN`.
- Missing values shall remain distinguishable from valid zero values.
- Calculations shall use unrounded intermediate values.

# Rounding Requirements

- Rounding shall occur only at an explicitly defined output boundary.
- Display rounding shall not change persisted calculation inputs.
- Required operational headcount shall use the rounding method defined by its calculation specification.
- Aggregated headcount may retain one decimal when combining independent staffing groups.
- Counts displayed as whole numbers shall identify whether they were rounded, floored, or ceilinged.

# Date and Time Requirements

- A planning year shall be represented as a four-digit integer.
- Calendar-month records shall be ordered January through December.
- Service dates shall be interpreted in the owning call center's time zone when time-zone interpretation is necessary.
- Date-only imports shall not be shifted by browser or server time-zone conversion.
- Operating windows shall require close time to be later than open time unless overnight operation is explicitly supported.
- Leap days shall be accepted for valid leap years.
- Invalid calendar dates shall be rejected.

# Aggregation Conventions

- Monthly contacts equal the sum of accepted daily or interval contacts in the month.
- Monthly AHT shall be contact-weighted when source contacts are available.
- Monthly workload hours equal `contacts * AHT seconds / 3600`.
- Annual contact and workload totals equal the sum of included months.
- Average headcount metrics shall identify whether they are simple monthly averages or weighted values.
- Portfolio values shall not aggregate records from different planning years.

# Presentation Requirements

- Units shall appear in labels, headers, help text, or adjacent context.
- Percent displays shall include `%`.
- Seconds and hours shall not be presented interchangeably without conversion.
- Missing values shall display as an unavailable marker rather than `0`.
- Negative staffing gaps shall remain visibly negative.
- Numeric tables shall use consistent decimal precision within a column.

# Acceptance Scenarios

## Weighted AHT

**Given** one day has 100 contacts at 300 seconds AHT  
**And** another has 200 contacts at 450 seconds AHT  
**When** the month is aggregated  
**Then** monthly AHT is `(100*300 + 200*450) / 300 = 400` seconds.

## Preserve Missing Values

**Given** no actual requirement has been calculated  
**When** the actuals table is shown  
**Then** the value is unavailable  
**And** is not shown as zero headcount.

## Avoid Time-Zone Shift

**Given** an imported service date of `2026-01-01`  
**When** it is stored and reopened in another browser time zone  
**Then** it remains `2026-01-01`.

# Open Questions

1. Which user inputs should accept both ratios and percentages?
2. What display precision is required for financial review exports?
3. Are overnight operating windows required?

# Implementation Traceability

- `src/planner/shared.js`
- `src/planner/dateValues.js`
- `src/planner/demandModel.js`
- `src/planner/actualsModel.js`

