import { clonePlain, toNumber } from './forecastConstants'
import { parseForecastDateValue } from './forecastFormatting'

const normalizeDailyForecastRows = (rows = []) =>
  Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []

const normalizeAdjustmentDate = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmedValue = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) ? trimmedValue : ''
}

const normalizeForecastManualAdjustment = (adjustment = {}) => {
  const legacyDate = normalizeAdjustmentDate(adjustment?.ds)
  let startDate = normalizeAdjustmentDate(adjustment?.startDate) || legacyDate
  let endDate = normalizeAdjustmentDate(adjustment?.endDate) || legacyDate || startDate

  if (startDate && endDate && endDate < startDate) {
    ;[startDate, endDate] = [endDate, startDate]
  }

  return {
    id: typeof adjustment?.id === 'string' && adjustment.id.trim()
      ? adjustment.id.trim()
      : `${startDate || 'adjustment'}:${endDate || startDate || 'adjustment'}:${adjustment?.adjustmentType === 'percent' ? 'percent' : adjustment?.adjustmentType === 'set' ? 'set' : 'delta'}:${toNumber(adjustment?.value, adjustment?.delta)}`,
    startDate,
    endDate,
    adjustmentType: adjustment?.adjustmentType === 'percent'
      ? 'percent'
      : adjustment?.adjustmentType === 'set'
        ? 'set'
        : 'delta',
    value: toNumber(adjustment?.value, adjustment?.delta),
    reason: typeof adjustment?.reason === 'string' ? adjustment.reason : ''
  }
}

export const normalizeForecastManualAdjustments = (adjustments = []) => {
  return (Array.isArray(adjustments) ? adjustments : [])
    .map((adjustment) => normalizeForecastManualAdjustment(adjustment))
    .filter((adjustment) => adjustment.startDate && adjustment.endDate)
    .filter((adjustment) => adjustment.value !== 0 || adjustment.reason.trim())
    .sort((left, right) => (
      left.startDate.localeCompare(right.startDate) ||
      left.endDate.localeCompare(right.endDate) ||
      left.id.localeCompare(right.id)
    ))
}

const normalizeMonthlyRollupRows = (rows = [], dailyForecastRows = []) => {
  const normalizedDailyRows = normalizeDailyForecastRows(dailyForecastRows)

  return Array.isArray(rows)
    ? rows.map((row) => {
        const monthStart = String(row?.monthStart || '')
        const monthPrefix = monthStart.slice(0, 7)
        const matchingForecastRows = normalizedDailyRows.filter(
          (forecastRow) =>
            !forecastRow?.isHistory &&
            typeof forecastRow?.ds === 'string' &&
            forecastRow.ds.startsWith(monthPrefix)
        )
        const derivedPeakRow = matchingForecastRows.reduce(
          (currentPeak, forecastRow) => (
            toNumber(forecastRow?.yhat, 0) > toNumber(currentPeak?.yhat, -1)
              ? forecastRow
              : currentPeak
          ),
          null
        )

        return {
          ...row,
          peakDailyDate: row?.peakDailyDate || derivedPeakRow?.ds || '',
          peakDailyVolume: row?.peakDailyVolume ?? derivedPeakRow?.yhat ?? 0
        }
      })
    : []
}

const resolveMonthLabel = (value) => {
  const parsed = parseForecastDateValue(value)
  if (!parsed) {
    return String(value || '')
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(parsed)
}

export function getForecastProjectDailyRows(snapshot = {}) {
  const dailyRows = normalizeDailyForecastRows(snapshot?.lastRun?.dailyForecast)
  const adjustmentRules = normalizeForecastManualAdjustments(snapshot?.manualAdjustments)

  return dailyRows.map((row) => {
    const baselineForecast = toNumber(row?.yhat, 0)
    const applicableAdjustments = !row?.isHistory
      ? adjustmentRules.filter(
          (adjustment) => adjustment.startDate <= row.ds && adjustment.endDate >= row.ds
        )
      : []
    const setAdjustment = applicableAdjustments
      .filter((adjustment) => adjustment.adjustmentType === 'set')
      .at(-1)
    const absoluteDelta = applicableAdjustments
      .filter((adjustment) => adjustment.adjustmentType === 'delta')
      .reduce((sum, adjustment) => sum + toNumber(adjustment.value, 0), 0)
    const percentDelta = applicableAdjustments
      .filter((adjustment) => adjustment.adjustmentType === 'percent')
      .reduce((sum, adjustment) => sum + toNumber(adjustment.value, 0), 0)
    const adjustmentMultiplier = 1 + (percentDelta / 100)
    const baselineLowerBound = toNumber(row?.yhatLower, 0)
    const baselineUpperBound = toNumber(row?.yhatUpper, 0)
    const rangedForecast = Math.max((baselineForecast * adjustmentMultiplier) + absoluteDelta, 0)
    const rangedLowerBound = Math.max((baselineLowerBound * adjustmentMultiplier) + absoluteDelta, 0)
    const rangedUpperBound = Math.max((baselineUpperBound * adjustmentMultiplier) + absoluteDelta, 0)
    const nextForecast = row?.isHistory
      ? baselineForecast
      : setAdjustment
        ? Math.max(toNumber(setAdjustment.value, baselineForecast), 0)
        : rangedForecast
    const netSetDelta = nextForecast - baselineForecast
    const nextLowerBound = row?.isHistory
      ? baselineLowerBound
      : setAdjustment
        ? Math.max(baselineLowerBound + netSetDelta, 0)
        : rangedLowerBound
    const nextUpperBound = row?.isHistory
      ? baselineUpperBound
      : setAdjustment
        ? Math.max(baselineUpperBound + netSetDelta, 0)
        : rangedUpperBound
    const netDelta = nextForecast - baselineForecast
    const adjustmentReason = applicableAdjustments
      .map((adjustment) => adjustment.reason.trim())
      .filter(Boolean)
      .join('; ')

    return {
      ...row,
      baselineYhat: baselineForecast,
      manualAdjustmentDelta: row?.isHistory ? 0 : netDelta,
      adjustmentReason,
      appliedAdjustments: applicableAdjustments,
      isAdjusted: !row?.isHistory && (netDelta !== 0 || Boolean(adjustmentReason)),
      yhat: nextForecast,
      yhatLower: nextLowerBound,
      yhatUpper: nextUpperBound
    }
  })
}

export const getForecastProjectManualAdjustments = (snapshot = {}) =>
  normalizeForecastManualAdjustments(snapshot?.manualAdjustments)

export function buildMonthlyRollupFromDailyForecastRows(rows = []) {
  const monthlyRollupMap = new Map()

  normalizeDailyForecastRows(rows)
    .filter((row) => !row?.isHistory && typeof row?.ds === 'string' && row.ds.length >= 7)
    .forEach((row) => {
      const monthStart = `${row.ds.slice(0, 7)}-01`
      const existingMonth = monthlyRollupMap.get(monthStart) || {
        monthStart,
        monthLabel: resolveMonthLabel(monthStart),
        contacts: 0,
        averageDailyVolume: 0,
        peakDailyDate: '',
        peakDailyVolume: 0,
        lowerBoundContacts: 0,
        upperBoundContacts: 0,
        _dayCount: 0
      }
      const forecastValue = toNumber(row?.yhat, 0)
      const lowerBound = toNumber(row?.yhatLower, 0)
      const upperBound = toNumber(row?.yhatUpper, 0)
      const nextPeakDate = forecastValue >= existingMonth.peakDailyVolume ? row.ds : existingMonth.peakDailyDate
      const nextPeakVolume = Math.max(existingMonth.peakDailyVolume, forecastValue)

      monthlyRollupMap.set(monthStart, {
        ...existingMonth,
        contacts: existingMonth.contacts + forecastValue,
        lowerBoundContacts: existingMonth.lowerBoundContacts + lowerBound,
        upperBoundContacts: existingMonth.upperBoundContacts + upperBound,
        peakDailyDate: nextPeakDate,
        peakDailyVolume: nextPeakVolume,
        _dayCount: existingMonth._dayCount + 1
      })
    })

  return [...monthlyRollupMap.values()]
    .sort((left, right) => left.monthStart.localeCompare(right.monthStart))
    .map(({ _dayCount, contacts, ...row }) => ({
      ...row,
      contacts,
      averageDailyVolume: _dayCount > 0 ? contacts / _dayCount : 0
    }))
}

export function getForecastProjectMonthlyRollup(snapshot = {}) {
  const dailyForecastRows = getForecastProjectDailyRows(snapshot)
  const hasManualAdjustments = normalizeForecastManualAdjustments(snapshot?.manualAdjustments).length > 0

  if (!hasManualAdjustments) {
    return normalizeMonthlyRollupRows(snapshot?.lastRun?.monthlyRollup, dailyForecastRows)
  }

  return buildMonthlyRollupFromDailyForecastRows(dailyForecastRows)
}

export const createEmptyForecastResults = (overrides = {}) => {
  const snapshot = overrides && typeof overrides === 'object' ? clonePlain(overrides) : {}
  const normalizedDailyForecast = normalizeDailyForecastRows(snapshot.dailyForecast)

  return {
    ...snapshot,
    runAt: snapshot.runAt || '',
    dailyForecast: normalizedDailyForecast,
    monthlyRollup: normalizeMonthlyRollupRows(snapshot.monthlyRollup, normalizedDailyForecast),
    components: {
      trend: Array.isArray(snapshot.components?.trend) ? snapshot.components.trend.map((row) => ({ ...row })) : [],
      yearly: Array.isArray(snapshot.components?.yearly) ? snapshot.components.yearly.map((row) => ({ ...row })) : [],
      monthly: Array.isArray(snapshot.components?.monthly) ? snapshot.components.monthly.map((row) => ({ ...row })) : [],
      weekly: Array.isArray(snapshot.components?.weekly) ? snapshot.components.weekly.map((row) => ({ ...row })) : [],
      holidays: Array.isArray(snapshot.components?.holidays) ? snapshot.components.holidays.map((row) => ({ ...row })) : []
    },
    summary: snapshot.summary ? { ...snapshot.summary } : null,
    diagnostics: {
      warnings: Array.isArray(snapshot.diagnostics?.warnings) ? [...snapshot.diagnostics.warnings] : [],
      validationNotes: Array.isArray(snapshot.diagnostics?.validationNotes) ? [...snapshot.diagnostics.validationNotes] : [],
      holdout: snapshot.diagnostics?.holdout || null
    }
  }
}
