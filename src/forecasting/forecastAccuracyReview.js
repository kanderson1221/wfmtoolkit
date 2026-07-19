import { buildCsv, formatCsvNumber } from '../csvExport'

const finiteMetric = (value) => {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const metricDefinitions = [
  {
    id: 'wape',
    label: 'WAPE',
    unit: 'percent',
    interpretation: 'Total absolute error as a share of total actual contacts; lower is better.'
  },
  {
    id: 'mae',
    label: 'MAE',
    unit: 'contacts',
    interpretation: 'Average absolute error per test day in contacts; lower is better.'
  },
  {
    id: 'bias',
    label: 'Mean bias',
    unit: 'signed-contacts',
    interpretation: 'Average forecast minus actual contacts; nearer zero is better.'
  },
  {
    id: 'intervalCoverage',
    label: 'Interval coverage',
    unit: 'percent',
    interpretation: 'Share of actual days inside the modeled prediction interval.'
  }
]

export const buildForecastAccuracyReview = (holdout = null) => {
  if (!holdout || typeof holdout !== 'object') {
    return null
  }

  const benchmark = holdout.benchmark && typeof holdout.benchmark === 'object'
    ? holdout.benchmark
    : null
  const modelWape = finiteMetric(holdout.wape)
  const benchmarkWape = finiteMetric(benchmark?.wape)
  const comparison = holdout.comparison || {}
  const lowerWape = modelWape == null || benchmarkWape == null
    ? 'unavailable'
    : comparison.lowerWape || (
        modelWape < benchmarkWape
          ? 'model'
          : benchmarkWape < modelWape
            ? 'benchmark'
            : 'tie'
      )
  const deltaPoints = finiteMetric(comparison.wapeDeltaPoints) ?? (
    modelWape != null && benchmarkWape != null ? modelWape - benchmarkWape : null
  )
  const intervalWidthPercent = finiteMetric(holdout.intervalWidthPercent)

  let summary = 'WAPE is unavailable because the test period has no positive actual contact volume.'
  if (!benchmark) {
    summary = 'This saved result predates benchmark comparison. Run the forecast again to compare model value against the weekday baseline.'
  } else if (lowerWape === 'model') {
    summary = `The modeled forecast has ${Math.abs(deltaPoints).toFixed(1)} percentage points lower WAPE than the weekday baseline on this test period.`
  } else if (lowerWape === 'benchmark') {
    summary = `The weekday baseline has ${Math.abs(deltaPoints).toFixed(1)} percentage points lower WAPE than the modeled forecast on this test period.`
  } else if (lowerWape === 'tie') {
    summary = 'The modeled forecast and weekday baseline have the same WAPE on this test period.'
  }

  return {
    benchmark,
    benchmarkAvailable: Boolean(benchmark),
    summary,
    testRows: finiteMetric(holdout.testRows),
    testDateRange: String(holdout.testDateRange || ''),
    trainingDateRange: String(holdout.trainingDateRange || ''),
    meanActual: finiteMetric(holdout.meanActual),
    metricRows: metricDefinitions.map((definition) => ({
      ...definition,
      interpretation: definition.id === 'intervalCoverage' && intervalWidthPercent != null
        ? `Share of actual days inside the configured ${intervalWidthPercent}% modeled prediction interval.`
        : definition.interpretation,
      modelValue: finiteMetric(holdout[definition.id]),
      benchmarkValue: definition.id === 'intervalCoverage'
        ? null
        : finiteMetric(benchmark?.[definition.id])
    }))
  }
}

export const buildForecastAccuracyCsv = (holdout = null) => {
  const rows = Array.isArray(holdout?.rows) ? holdout.rows : []
  const benchmarkLabel = holdout?.benchmark?.label || ''

  return buildCsv(
    [
      { header: 'date', value: (row) => row.ds },
      { header: 'actual_contacts', value: (row) => formatCsvNumber(row.actualValue, 3) },
      { header: 'modeled_contacts', value: (row) => formatCsvNumber(row.forecastValue, 3) },
      { header: 'modeled_lower_bound', value: (row) => formatCsvNumber(row.lowerBound, 3) },
      { header: 'modeled_upper_bound', value: (row) => formatCsvNumber(row.upperBound, 3) },
      { header: 'modeled_absolute_error', value: (row) => formatCsvNumber(row.absoluteError, 3) },
      { header: 'modeled_signed_error', value: (row) => formatCsvNumber(row.signedError, 3) },
      { header: 'modeled_percent_error', value: (row) => formatCsvNumber(row.percentError, 3) },
      { header: 'within_modeled_interval', value: (row) => row.withinInterval ? 'yes' : 'no' },
      { header: 'modeled_interval_width_percent', value: () => formatCsvNumber(holdout?.intervalWidthPercent, 3) },
      { header: 'benchmark_method', value: () => benchmarkLabel },
      { header: 'benchmark_contacts', value: (row) => formatCsvNumber(row.benchmarkValue, 3) },
      { header: 'benchmark_absolute_error', value: (row) => formatCsvNumber(row.benchmarkAbsoluteError, 3) },
      { header: 'benchmark_signed_error', value: (row) => formatCsvNumber(row.benchmarkSignedError, 3) }
    ],
    rows
  )
}
