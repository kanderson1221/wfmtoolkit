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

const buildRollingOriginReview = (rollingOrigin = null) => {
  if (!rollingOrigin || typeof rollingOrigin !== 'object') {
    return null
  }

  const folds = (Array.isArray(rollingOrigin.folds) ? rollingOrigin.folds : [])
    .map((fold, index, collection) => ({
      ...fold,
      foldNumber: finiteMetric(fold.foldNumber) ?? index + 1,
      label: index === collection.length - 1 ? 'Current window' : `Earlier window ${index + 1}`,
      trainingThrough: String(fold.trainingDateRange || '').split(' to ').at(-1) || '',
      testDateRange: String(fold.testDateRange || ''),
      wape: finiteMetric(fold.wape),
      benchmarkWape: finiteMetric(fold.benchmarkWape),
      bias: finiteMetric(fold.bias),
      intervalCoverage: finiteMetric(fold.intervalCoverage),
      lowerWape: String(fold.lowerWape || 'unavailable')
    }))

  if (!folds.length) {
    return null
  }

  const comparableFolds = folds.filter((fold) => fold.wape != null && fold.benchmarkWape != null)
  const modeledWins = comparableFolds.filter((fold) => fold.wape < fold.benchmarkWape).length
  const availableWapes = folds.map((fold) => fold.wape).filter((value) => value != null)
  const wapeRange = availableWapes.length
    ? `${Math.min(...availableWapes).toFixed(1)}% to ${Math.max(...availableWapes).toFixed(1)}%`
    : 'unavailable'
  const holdoutDaysPerFold = finiteMetric(rollingOrigin.holdoutDaysPerFold)

  const summary = folds.length === 1
    ? `Only one ${holdoutDaysPerFold || ''}-day test window has enough preceding history. Load at least ${holdoutDaysPerFold || 'one window of'} additional earlier daily observations to evaluate stability across another cutoff.`
    : `Across ${folds.length} non-overlapping test windows, the modeled forecast had lower WAPE than the weekday baseline in ${modeledWins} of ${comparableFolds.length} comparable windows. Modeled WAPE ranged from ${wapeRange}.`

  return {
    heading: 'Accuracy across historical cutoffs',
    summary,
    folds,
    foldCount: folds.length,
    holdoutDaysPerFold,
    exportLabel: 'Download Stability CSV',
    exportSuffix: 'rolling-origin-stability',
    methodNote: `Each window scores ${holdoutDaysPerFold || 'the configured number of'} non-overlapping days using only observations before that window. Up to ${finiteMetric(rollingOrigin.maxFolds) || folds.length} windows are retained; later manual changepoints are excluded from earlier fits. This is stability evidence, not an automatic acceptance decision.`
  }
}

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
    heading: 'Forecast accuracy review',
    candidateLabel: 'Modeled forecast',
    benchmarkLabel: benchmark?.label || 'Weekday baseline',
    exportLabel: 'Download Accuracy CSV',
    exportSuffix: 'accuracy-review',
    benchmark,
    benchmarkAvailable: Boolean(benchmark),
    summary,
    testRows: finiteMetric(holdout.testRows),
    testDateRange: String(holdout.testDateRange || ''),
    trainingDateRange: String(holdout.trainingDateRange || ''),
    meanActual: finiteMetric(holdout.meanActual),
    scoredRows: finiteMetric(holdout.testRows),
    rows: Array.isArray(holdout.rows) ? holdout.rows : [],
    decisionNote: benchmark
      ? 'This comparison is evidence for review, not an automatic acceptance decision.'
      : '',
    methodNote: 'The weekday baseline uses the mean of up to the latest eight matching weekdays from training data only. Positive bias means over-forecasting; negative bias means under-forecasting.',
    rollingOrigin: buildRollingOriginReview(holdout.rollingOrigin),
    metricRows: metricDefinitions.map((definition) => ({
      ...definition,
      interpretation: definition.id === 'intervalCoverage' && intervalWidthPercent != null
        ? `Share of actual days inside the configured ${intervalWidthPercent}% modeled prediction interval.`
        : definition.interpretation,
      modelValue: finiteMetric(holdout[definition.id]),
      candidateValue: finiteMetric(holdout[definition.id]),
      benchmarkValue: definition.id === 'intervalCoverage'
        ? null
        : finiteMetric(benchmark?.[definition.id])
    }))
  }
}

export const buildForecastRollingOriginCsv = (rollingOriginReview = null) => {
  const rows = Array.isArray(rollingOriginReview?.folds) ? rollingOriginReview.folds : []

  return buildCsv(
    [
      { header: 'window', value: (row) => row.label },
      { header: 'training_date_range', value: (row) => row.trainingDateRange },
      { header: 'test_date_range', value: (row) => row.testDateRange },
      { header: 'test_days', value: (row) => formatCsvNumber(row.testRows, 0) },
      { header: 'modeled_wape_percent', value: (row) => formatCsvNumber(row.wape, 3) },
      { header: 'weekday_benchmark_wape_percent', value: (row) => formatCsvNumber(row.benchmarkWape, 3) },
      { header: 'modeled_mae_contacts_per_day', value: (row) => formatCsvNumber(row.mae, 3) },
      { header: 'weekday_benchmark_mae_contacts_per_day', value: (row) => formatCsvNumber(row.benchmarkMae, 3) },
      { header: 'modeled_mean_bias_contacts_per_day', value: (row) => formatCsvNumber(row.bias, 3) },
      { header: 'weekday_benchmark_mean_bias_contacts_per_day', value: (row) => formatCsvNumber(row.benchmarkBias, 3) },
      { header: 'modeled_interval_coverage_percent', value: (row) => formatCsvNumber(row.intervalCoverage, 3) },
      { header: 'lower_wape', value: (row) => row.lowerWape }
    ],
    rows
  )
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
