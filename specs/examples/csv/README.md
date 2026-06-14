# CSV Examples

These files illustrate the CSV contracts defined by `FIMP-002`, `FIMP-003`,
`FIMP-004`, `FIMP-005`, `FIMP-006`, `ACT-001`, and `ACT-002`.

Template files are suitable as downloadable starting points. Other files are
acceptance-test fixtures. Invalid fixtures intentionally contain one principal
blocking condition.

## User-Facing Templates

| File | Expected result |
|---|---|
| `forecast_monthly_template.csv` | Accept as a monthly forecast. |
| `forecast_daily_template.csv` | Accept as a daily forecast. |
| `forecast_interval_template.csv` | Accept as an interval forecast. |
| `actuals_daily_template.csv` | Accept as daily actuals. |

## Mapping And Encoding

| File | Expected result |
|---|---|
| `forecast_daily_common_headers.csv` | Guess `date`, `volume`, and `aht_seconds` mappings. |
| `forecast_daily_extra_columns.csv` | Accept required fields; retain or ignore extra metadata without affecting calculations. |
| `forecast_daily_utf8_bom.csv` | Decode and accept a UTF-8 file with a byte-order mark. |

## Validation

| File | Expected result |
|---|---|
| `forecast_missing_aht.csv` | Block because no AHT field can be mapped. |
| `forecast_negative_contacts.csv` | Block and identify the negative-contact row. |
| `forecast_invalid_date.csv` | Block and identify the invalid-date row. |
| `forecast_duplicate_dates.csv` | Block because the daily row key is duplicated. |
| `forecast_interval_duplicate_starts.csv` | Block because the interval row key is duplicated. |
| `forecast_interval_invalid_length.csv` | Block because interval length is not positive. |
| `forecast_mixed_granularity.csv` | Block because monthly and daily rows are mixed. |
| `forecast_zero_contacts.csv` | Accept; zero contacts are valid. |

## Coverage And Aggregation

| File | Expected result |
|---|---|
| `forecast_monthly_complete_year.csv` | Accept as complete January through December coverage for 2027. |
| `forecast_daily_partial_coverage.csv` | Accept rows but report incomplete coverage for the represented period. |
| `forecast_daily_closed_dates.csv` | With `2027-01-02` configured as closed, exclude that row from open-day planning demand. |
| `forecast_interval_single_day.csv` | Aggregate contacts and contact-weighted AHT without redistributing intervals. |
| `forecast_month_label_normalization.csv` | Normalize `Jan 2027` to `2027-01-01`. |

## Actuals

| File | Expected result |
|---|---|
| `actuals_multi_year.csv` | Accept rows from both 2026 and 2027 into one history. |
| `actuals_with_replacement_dates.csv` | With `2027-03-10` and `2027-03-11` preloaded, preview two replacements and one addition. |
| `actuals_invalid_contacts.csv` | Block and identify the non-numeric contact row. |
| `actuals_partial_month.csv` | Accept rows and report partial March coverage. |

Dates and timestamps are local to the owning call-center context. Forecast AHT
is positive seconds per contact. Actuals AHT follows the current actuals
contract and may be zero.
