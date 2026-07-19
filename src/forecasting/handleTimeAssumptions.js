import {
  formatDate,
  formatNumber,
  getForecastAvailableAhtHistoryRows,
  getForecastModelTrainingAhtHistoryRows,
  getForecastProjectMonthlyRollup,
  getForecastTrainingWindow,
  parseForecastDateValue
} from './shared'

export const FORECAST_AHT_ASSUMPTION_WEIGHTED = 'weighted_average'
export const FORECAST_AHT_ASSUMPTION_SEASONAL = 'seasonal_by_month'
export const FORECAST_AHT_ASSUMPTION_BLEND = 'blend_recent_seasonal'

export const FORECAST_AHT_ASSUMPTION_METHOD_OPTIONS = [
  {
    label: 'Blend Recent + Seasonal',
    value: FORECAST_AHT_ASSUMPTION_BLEND
  },
  {
    label: 'Seasonal By Month',
    value: FORECAST_AHT_ASSUMPTION_SEASONAL
  },
  {
    label: 'Weighted Average',
    value: FORECAST_AHT_ASSUMPTION_WEIGHTED
  }
]

const DEFAULT_RECENT_MONTHS_WINDOW = 3
const MAX_RECENT_MONTHS_WINDOW = 12

const resolveForecastAhtAssumptionMethod = (value) => (
  value === FORECAST_AHT_ASSUMPTION_WEIGHTED ||
  value === FORECAST_AHT_ASSUMPTION_SEASONAL ||
  value === FORECAST_AHT_ASSUMPTION_BLEND
)
  ? value
  : FORECAST_AHT_ASSUMPTION_BLEND

export const resolveForecastAhtRecentMonthsWindow = (value) => {
  const parsed = Math.round(Number(value) || DEFAULT_RECENT_MONTHS_WINDOW)
  return Math.max(1, Math.min(MAX_RECENT_MONTHS_WINDOW, parsed))
}

const buildMonthStart = (dateText = '') => `${String(dateText).slice(0, 7)}-01`

const buildMonthLabel = (monthStart) => {
  const parsed = parseForecastDateValue(monthStart)

  if (!parsed) {
    return String(monthStart || '')
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(parsed)
}

const toAhtWeightedAverage = (records = []) => {
  let weightedTotal = 0
  let weightedContacts = 0
  let simpleTotal = 0
  let simpleCount = 0

  ;(Array.isArray(records) ? records : []).forEach((record) => {
    const ahtSeconds = Number(record?.weightedAhtSeconds ?? record?.ahtSeconds)
    const contacts = Number(record?.contacts ?? 0)

    if (!Number.isFinite(ahtSeconds) || ahtSeconds < 0) {
      return
    }

    simpleTotal += ahtSeconds
    simpleCount += 1

    if (Number.isFinite(contacts) && contacts > 0) {
      weightedTotal += contacts * ahtSeconds
      weightedContacts += contacts
    }
  })

  if (weightedContacts > 0) {
    return weightedTotal / weightedContacts
  }

  return simpleCount > 0 ? simpleTotal / simpleCount : null
}

export const buildForecastMonthlyAhtHistory = (snapshot = {}) => {
  const trainingRows = getForecastModelTrainingAhtHistoryRows(snapshot)
  const monthBuckets = new Map()

  trainingRows.forEach((row) => {
    const monthStart = buildMonthStart(row.ds)
    const parsedMonthStart = parseForecastDateValue(monthStart)
    const bucket = monthBuckets.get(monthStart) || {
      monthStart,
      monthLabel: buildMonthLabel(monthStart),
      monthIndex: parsedMonthStart ? parsedMonthStart.getMonth() : null,
      contacts: 0,
      weightedAhtTotal: 0,
      ahtTotal: 0,
      ahtCount: 0,
      dayCount: 0
    }
    const contacts = Number(row?.contacts ?? 0)
    const ahtSeconds = Number(row?.ahtSeconds)

    if (!Number.isFinite(ahtSeconds) || ahtSeconds < 0) {
      return
    }

    bucket.dayCount += 1
    bucket.ahtCount += 1
    bucket.ahtTotal += ahtSeconds

    if (Number.isFinite(contacts) && contacts > 0) {
      bucket.contacts += contacts
      bucket.weightedAhtTotal += contacts * ahtSeconds
    }

    monthBuckets.set(monthStart, bucket)
  })

  return [...monthBuckets.values()]
    .sort((left, right) => left.monthStart.localeCompare(right.monthStart))
    .map((bucket) => ({
      monthStart: bucket.monthStart,
      monthLabel: bucket.monthLabel,
      monthIndex: bucket.monthIndex,
      contacts: bucket.contacts,
      dayCount: bucket.dayCount,
      weightedAhtSeconds: bucket.contacts > 0
        ? bucket.weightedAhtTotal / bucket.contacts
        : bucket.ahtCount > 0
          ? bucket.ahtTotal / bucket.ahtCount
          : null
    }))
}

export const summarizeForecastAhtTrainingData = (snapshot = {}) => {
  const trainingWindow = getForecastTrainingWindow(snapshot)
  const availableRows = getForecastAvailableAhtHistoryRows(snapshot)
  const trainingRows = getForecastModelTrainingAhtHistoryRows(snapshot)
  const monthlyHistory = buildForecastMonthlyAhtHistory(snapshot)

  return {
    availableStartDate: trainingWindow.availableStartDate,
    availableEndDate: trainingWindow.availableEndDate,
    availableRowCount: availableRows.length,
    trainingRowCount: trainingRows.length,
    monthlyHistoryCount: monthlyHistory.length,
    availableWeightedAverageAhtSeconds: toAhtWeightedAverage(availableRows),
    trainingWeightedAverageAhtSeconds: toAhtWeightedAverage(trainingRows)
  }
}

const resolveAssumedAhtSeconds = ({
  method,
  overallAhtSeconds,
  recentAhtSeconds,
  seasonalAhtSeconds
}) => {
  if (method === FORECAST_AHT_ASSUMPTION_WEIGHTED) {
    return overallAhtSeconds
  }

  if (method === FORECAST_AHT_ASSUMPTION_SEASONAL) {
    return seasonalAhtSeconds ?? overallAhtSeconds
  }

  if (seasonalAhtSeconds != null && recentAhtSeconds != null) {
    return (seasonalAhtSeconds + recentAhtSeconds) / 2
  }

  return seasonalAhtSeconds ?? recentAhtSeconds ?? overallAhtSeconds
}

const describeAssumptionBasis = (method, seasonalCount, recentWindow) => {
  if (method === FORECAST_AHT_ASSUMPTION_WEIGHTED) {
    return 'Weighted training average'
  }

  if (method === FORECAST_AHT_ASSUMPTION_SEASONAL) {
    return seasonalCount > 0 ? 'Same-month history' : 'Weighted training average'
  }

  return seasonalCount > 0
    ? `Blend of ${recentWindow} recent months and same-month history`
    : `Blend fallback to ${recentWindow} recent months`
}

const buildForecastAhtOverrideMap = (snapshot = {}) => new Map(
  (Array.isArray(snapshot?.modelConfig?.ahtMonthOverrides) ? snapshot.modelConfig.ahtMonthOverrides : [])
    .map((row) => {
      const monthStart = typeof row?.monthStart === 'string' ? row.monthStart : ''
      const ahtSeconds = Number(row?.ahtSeconds)

      if (!monthStart || !Number.isFinite(ahtSeconds) || ahtSeconds < 0) {
        return null
      }

      return [monthStart, ahtSeconds]
    })
    .filter(Boolean)
)

export const buildForecastBaseMonthlyHandleTimeAssumptions = (snapshot = {}) => {
  const monthlyRollup = getForecastProjectMonthlyRollup(snapshot)
  const monthlyHistory = buildForecastMonthlyAhtHistory(snapshot)
  const overallAhtSeconds = toAhtWeightedAverage(monthlyHistory)
  const method = resolveForecastAhtAssumptionMethod(snapshot?.modelConfig?.ahtAssumptionMethod)
  const recentMonthsWindow = resolveForecastAhtRecentMonthsWindow(snapshot?.modelConfig?.ahtRecentMonthsWindow)
  const recentHistory = monthlyHistory.slice(-recentMonthsWindow)
  const recentAhtSeconds = toAhtWeightedAverage(recentHistory)

  return monthlyRollup.map((row) => {
    const parsedMonthStart = parseForecastDateValue(row?.monthStart)
    const monthIndex = parsedMonthStart ? parsedMonthStart.getMonth() : null
    const seasonalHistory = monthlyHistory.filter((historyRow) => historyRow.monthIndex === monthIndex)
    const seasonalAhtSeconds = toAhtWeightedAverage(seasonalHistory)
    const assumedAhtSeconds = resolveAssumedAhtSeconds({
      method,
      overallAhtSeconds,
      recentAhtSeconds,
      seasonalAhtSeconds
    })

    return {
      monthStart: row.monthStart || '',
      monthLabel: row.monthLabel || buildMonthLabel(row.monthStart),
      contacts: Number(row?.contacts ?? 0),
      suggestedAhtSeconds: assumedAhtSeconds,
      seasonalAhtSeconds,
      basisLabel: describeAssumptionBasis(method, seasonalHistory.length, recentMonthsWindow)
    }
  })
}

export const buildForecastMonthlyHandleTimeAssumptions = (snapshot = {}) => {
  const overrideMap = buildForecastAhtOverrideMap(snapshot)

  return buildForecastBaseMonthlyHandleTimeAssumptions(snapshot).map((row) => {
    const overrideAhtSeconds = overrideMap.get(row.monthStart) ?? null
    const assumedAhtSeconds = overrideAhtSeconds != null
      ? overrideAhtSeconds
      : row.suggestedAhtSeconds

    return {
      ...row,
      overrideAhtSeconds,
      assumedAhtSeconds
    }
  })
}

export const summarizeForecastMonthlyHandleTimeAssumptions = (snapshot = {}) => {
  const assumptions = buildForecastMonthlyHandleTimeAssumptions(snapshot)
  const weightedAhtSeconds = toAhtWeightedAverage(
    assumptions.map((row) => ({
      contacts: row?.contacts,
      weightedAhtSeconds: row?.assumedAhtSeconds
    }))
  )
  const method = resolveForecastAhtAssumptionMethod(snapshot?.modelConfig?.ahtAssumptionMethod)
  const recentMonthsWindow = resolveForecastAhtRecentMonthsWindow(snapshot?.modelConfig?.ahtRecentMonthsWindow)
  const methodLabel = FORECAST_AHT_ASSUMPTION_METHOD_OPTIONS.find((option) => option.value === method)?.label || 'Blend Recent + Seasonal'
  const trainingWindow = getForecastTrainingWindow(snapshot)

  return {
    method,
    methodLabel,
    recentMonthsWindow,
    weightedAhtSeconds,
    monthCount: assumptions.filter((row) => Number.isFinite(row?.assumedAhtSeconds)).length,
    overrideMonthCount: assumptions.filter((row) => Number.isFinite(row?.overrideAhtSeconds)).length,
    trainingWindowLabel:
      trainingWindow.availableStartDate && trainingWindow.availableEndDate
        ? `${formatDate(trainingWindow.availableStartDate)} through ${formatDate(trainingWindow.availableEndDate)}`
        : '',
    assumptions
  }
}

export const formatForecastAhtSeconds = (value) => {
  if (value == null) {
    return '—'
  }

  if (typeof value === 'string' && !value.trim()) {
    return '—'
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${formatNumber(parsed, 1)} sec` : '—'
}
