import { buildCsv, formatCsvNumber } from '../csvExport'
import {
  FORECAST_AHT_ASSUMPTION_BLEND,
  FORECAST_AHT_ASSUMPTION_METHOD_OPTIONS,
  FORECAST_AHT_ASSUMPTION_SEASONAL,
  FORECAST_AHT_ASSUMPTION_WEIGHTED,
  buildForecastMonthlyAhtHistory,
  resolveForecastAhtRecentMonthsWindow
} from './handleTimeAssumptions'
import {
  getForecastHoldoutPartition,
  getForecastTrainingAhtHistoryRows
} from './shared'

const weightedAverage = (rows = [], valueKey = 'ahtSeconds') => {
  const weighted = rows.reduce((summary, row) => {
    const contacts = Number(row?.contacts)
    const value = Number(row?.[valueKey])

    if (!Number.isFinite(contacts) || contacts <= 0 || !Number.isFinite(value) || value < 0) {
      return summary
    }

    return {
      total: summary.total + (contacts * value),
      contacts: summary.contacts + contacts
    }
  }, { total: 0, contacts: 0 })

  return weighted.contacts > 0 ? weighted.total / weighted.contacts : null
}

const resolveMethod = (value) => (
  value === FORECAST_AHT_ASSUMPTION_WEIGHTED ||
  value === FORECAST_AHT_ASSUMPTION_SEASONAL ||
  value === FORECAST_AHT_ASSUMPTION_BLEND
) ? value : FORECAST_AHT_ASSUMPTION_BLEND

const buildCandidateValue = ({ method, overall, recent, seasonal }) => {
  if (method === FORECAST_AHT_ASSUMPTION_WEIGHTED) {
    return overall
  }

  if (method === FORECAST_AHT_ASSUMPTION_SEASONAL) {
    return seasonal ?? overall
  }

  if (seasonal != null && recent != null) {
    return (seasonal + recent) / 2
  }

  return seasonal ?? recent ?? overall
}

const calculateMetrics = (rows, forecastKey) => {
  const totals = rows.reduce((summary, row) => {
    const contacts = Number(row.contacts)
    const actual = Number(row.actualAhtSeconds)
    const forecast = Number(row[forecastKey])
    const signedError = forecast - actual

    return {
      contacts: summary.contacts + contacts,
      weightedAbsoluteError: summary.weightedAbsoluteError + (contacts * Math.abs(signedError)),
      weightedSignedError: summary.weightedSignedError + (contacts * signedError),
      actualWorkloadSeconds: summary.actualWorkloadSeconds + (contacts * actual)
    }
  }, {
    contacts: 0,
    weightedAbsoluteError: 0,
    weightedSignedError: 0,
    actualWorkloadSeconds: 0
  })

  return {
    workloadErrorPercent: totals.actualWorkloadSeconds > 0
      ? (totals.weightedAbsoluteError / totals.actualWorkloadSeconds) * 100
      : null,
    weightedMaeSeconds: totals.contacts > 0 ? totals.weightedAbsoluteError / totals.contacts : null,
    weightedBiasSeconds: totals.contacts > 0 ? totals.weightedSignedError / totals.contacts : null
  }
}

const formatDateRange = (rows = []) => rows.length
  ? `${rows[0].ds} to ${rows.at(-1).ds}`
  : ''

export const buildForecastAhtAccuracyReview = (snapshot = {}) => {
  const { modelTrainingRows, holdoutRows, holdoutDays } = getForecastHoldoutPartition(snapshot)

  if (!holdoutDays) {
    return null
  }

  const trainingMonths = buildForecastMonthlyAhtHistory(snapshot)
  const overall = weightedAverage(trainingMonths, 'weightedAhtSeconds')
  const method = resolveMethod(snapshot?.modelConfig?.ahtAssumptionMethod)
  const methodLabel = FORECAST_AHT_ASSUMPTION_METHOD_OPTIONS.find((option) => option.value === method)?.label || 'Blend Recent + Seasonal'
  const recentMonths = resolveForecastAhtRecentMonthsWindow(snapshot?.modelConfig?.ahtRecentMonthsWindow)
  const recent = weightedAverage(trainingMonths.slice(-recentMonths), 'weightedAhtSeconds')
  const holdoutDateSet = new Set(holdoutRows.map((row) => row.ds))
  const actualByDate = new Map(
    getForecastTrainingAhtHistoryRows(snapshot)
      .filter((row) => holdoutDateSet.has(row.ds))
      .map((row) => [row.ds, row])
  )

  const rows = holdoutRows.map((contactRow) => {
    const actualRow = actualByDate.get(contactRow.ds)
    const monthIndex = Number(contactRow.ds.slice(5, 7)) - 1
    const seasonal = weightedAverage(
      trainingMonths.filter((row) => row.monthIndex === monthIndex),
      'weightedAhtSeconds'
    )
    const contacts = Number(actualRow?.contacts ?? contactRow?.y)
    const actualAhtSeconds = Number(actualRow?.ahtSeconds)
    const candidateAhtSeconds = buildCandidateValue({ method, overall, recent, seasonal })

    if (
      !Number.isFinite(contacts) || contacts <= 0 ||
      !Number.isFinite(actualAhtSeconds) || actualAhtSeconds < 0 ||
      !Number.isFinite(candidateAhtSeconds) || candidateAhtSeconds < 0 ||
      !Number.isFinite(overall) || overall < 0
    ) {
      return null
    }

    return {
      ds: contactRow.ds,
      contacts,
      actualAhtSeconds,
      candidateAhtSeconds,
      benchmarkAhtSeconds: overall,
      candidateAbsoluteErrorSeconds: Math.abs(candidateAhtSeconds - actualAhtSeconds),
      candidateSignedErrorSeconds: candidateAhtSeconds - actualAhtSeconds,
      benchmarkAbsoluteErrorSeconds: Math.abs(overall - actualAhtSeconds),
      benchmarkSignedErrorSeconds: overall - actualAhtSeconds
    }
  }).filter(Boolean)

  const candidate = calculateMetrics(rows, 'candidateAhtSeconds')
  const benchmark = calculateMetrics(rows, 'benchmarkAhtSeconds')
  const candidateWape = candidate.workloadErrorPercent
  const benchmarkWape = benchmark.workloadErrorPercent
  const lowerWorkloadError = candidateWape == null || benchmarkWape == null
    ? 'unavailable'
    : candidateWape < benchmarkWape
      ? 'candidate'
      : benchmarkWape < candidateWape
        ? 'benchmark'
        : 'tie'
  const deltaPoints = candidateWape == null || benchmarkWape == null
    ? null
    : candidateWape - benchmarkWape

  let summary = `AHT evidence is unavailable because none of the ${holdoutDays} holdout days has both positive contacts and valid AHT.`
  if (rows.length && candidateWape == null) {
    summary = 'AHT workload error is unavailable because scored holdout workload is zero.'
  } else if (lowerWorkloadError === 'candidate') {
    summary = `${methodLabel} has ${Math.abs(deltaPoints).toFixed(1)} percentage points lower workload error than the training weighted average.`
  } else if (lowerWorkloadError === 'benchmark') {
    summary = `The training weighted average has ${Math.abs(deltaPoints).toFixed(1)} percentage points lower workload error than ${methodLabel}.`
  } else if (lowerWorkloadError === 'tie') {
    summary = `${methodLabel} and the training weighted average have the same workload error.`
  }

  return {
    heading: 'Handle time accuracy review',
    candidateLabel: methodLabel,
    benchmarkLabel: 'Training weighted average',
    exportLabel: 'Download AHT Accuracy CSV',
    exportSuffix: 'aht-accuracy-review',
    testRows: holdoutDays,
    scoredRows: rows.length,
    testDateRange: formatDateRange(holdoutRows),
    trainingDateRange: formatDateRange(modelTrainingRows),
    summary,
    decisionNote: 'This comparison isolates AHT method error; it is evidence for review, not an automatic acceptance decision.',
    methodNote: `Both candidates use training data only. ${methodLabel} follows the configured monthly method; the benchmark is one contact-weighted AHT across the training window. Days without positive contacts or valid AHT are excluded and disclosed in the scored-day count.`,
    rows,
    metricRows: [
      {
        id: 'workloadErrorPercent',
        label: 'Workload error',
        unit: 'percent',
        candidateValue: candidate.workloadErrorPercent,
        benchmarkValue: benchmark.workloadErrorPercent,
        interpretation: 'Absolute workload error caused by AHT as a share of actual holdout workload; lower is better.'
      },
      {
        id: 'weightedMaeSeconds',
        label: 'Weighted MAE',
        unit: 'seconds',
        candidateValue: candidate.weightedMaeSeconds,
        benchmarkValue: benchmark.weightedMaeSeconds,
        interpretation: 'Contact-weighted average absolute AHT error in seconds; lower is better.'
      },
      {
        id: 'weightedBiasSeconds',
        label: 'Weighted bias',
        unit: 'signed-seconds',
        candidateValue: candidate.weightedBiasSeconds,
        benchmarkValue: benchmark.weightedBiasSeconds,
        interpretation: 'Contact-weighted assumed minus actual AHT; nearer zero is better.'
      }
    ]
  }
}

export const buildForecastAhtAccuracyCsv = (review = null) => buildCsv(
  [
    { header: 'date', value: (row) => row.ds },
    { header: 'contacts', value: (row) => formatCsvNumber(row.contacts, 3) },
    { header: 'actual_aht_seconds', value: (row) => formatCsvNumber(row.actualAhtSeconds, 3) },
    { header: 'configured_method_aht_seconds', value: (row) => formatCsvNumber(row.candidateAhtSeconds, 3) },
    { header: 'configured_method_absolute_error_seconds', value: (row) => formatCsvNumber(row.candidateAbsoluteErrorSeconds, 3) },
    { header: 'configured_method_signed_error_seconds', value: (row) => formatCsvNumber(row.candidateSignedErrorSeconds, 3) },
    { header: 'training_weighted_average_aht_seconds', value: (row) => formatCsvNumber(row.benchmarkAhtSeconds, 3) },
    { header: 'benchmark_absolute_error_seconds', value: (row) => formatCsvNumber(row.benchmarkAbsoluteErrorSeconds, 3) },
    { header: 'benchmark_signed_error_seconds', value: (row) => formatCsvNumber(row.benchmarkSignedErrorSeconds, 3) }
  ],
  Array.isArray(review?.rows) ? review.rows : []
)
