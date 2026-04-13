import {
  computeForecastPlanningReady,
  FORECAST_SOURCE_MODELED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  getForecastPlanningYear,
  getForecastProjectMonthlyRollup
} from '../forecasting/shared'
import { MONTH_LABELS, createPlanMonth, resolvePlanningYear, toNumber } from './shared'

export const DEMAND_SOURCE_MANUAL = 'manual'
export const DEMAND_SOURCE_FORECAST = 'forecast'

export const createPlanDemandSource = (overrides = {}) => ({
  mode: overrides.mode === DEMAND_SOURCE_FORECAST ? DEMAND_SOURCE_FORECAST : DEMAND_SOURCE_MANUAL,
  forecastProjectId: overrides.forecastProjectId || '',
  forecastProjectName: overrides.forecastProjectName || '',
  forecastSourceKind: overrides.forecastSourceKind || FORECAST_SOURCE_MODELED_DAILY,
  forecastType: overrides.forecastType || '',
  forecastRunAt: overrides.forecastRunAt || '',
  importedAt: overrides.importedAt || '',
  importedPlanningYear: overrides.importedPlanningYear == null ? null : resolvePlanningYear(overrides.importedPlanningYear),
  coverageStartMonthIndex: overrides.coverageStartMonthIndex == null
    ? null
    : Math.max(0, Math.min(MONTH_LABELS.length - 1, Math.round(toNumber(overrides.coverageStartMonthIndex, 0)))),
  forecastMonthSnapshot: Array.isArray(overrides.forecastMonthSnapshot)
    ? overrides.forecastMonthSnapshot.map((month) => ({
        monthIndex: Math.max(0, Math.min(MONTH_LABELS.length - 1, Math.round(toNumber(month.monthIndex, 0)))),
        monthLabel: month.monthLabel || MONTH_LABELS[Math.max(0, Math.min(MONTH_LABELS.length - 1, Math.round(toNumber(month.monthIndex, 0))))],
        monthStart: month.monthStart || '',
        contacts: Math.max(toNumber(month.contacts, 0), 0),
        lowerBoundContacts: Math.max(toNumber(month.lowerBoundContacts, 0), 0),
        upperBoundContacts: Math.max(toNumber(month.upperBoundContacts, 0), 0),
        averageDailyVolume: Math.max(toNumber(month.averageDailyVolume, 0), 0),
        peakDailyVolume: Math.max(toNumber(month.peakDailyVolume, 0), 0)
      }))
    : []
})

const parseMonthStart = (value) => {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (match) {
      const [, yearText, monthText, dayText] = match
      const parsed = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)))
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const buildForecastDemandSnapshot = (forecastProject, planningYear) => {
  const resolvedPlanningYear = resolvePlanningYear(planningYear)
  const monthlyRollup = getForecastProjectMonthlyRollup(forecastProject)

  if (
    !computeForecastPlanningReady(forecastProject) ||
    getForecastPlanningYear(forecastProject) !== resolvedPlanningYear
  ) {
    return []
  }

  return monthlyRollup
    .map((row) => {
      const parsedMonthStart = parseMonthStart(row.monthStart)
      if (!parsedMonthStart || parsedMonthStart.getUTCFullYear() !== resolvedPlanningYear) {
        return null
      }

      const monthIndex = parsedMonthStart.getUTCMonth()

      return {
        monthIndex,
        monthLabel: row.monthLabel || MONTH_LABELS[monthIndex],
        monthStart: row.monthStart || '',
        contacts: Math.max(toNumber(row.contacts, 0), 0),
        lowerBoundContacts: Math.max(toNumber(row.lowerBoundContacts, 0), 0),
        upperBoundContacts: Math.max(toNumber(row.upperBoundContacts, 0), 0),
        averageDailyVolume: Math.max(toNumber(row.averageDailyVolume, 0), 0),
        peakDailyVolume: Math.max(toNumber(row.peakDailyVolume, 0), 0)
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.monthIndex - right.monthIndex)
}

const derivePeakDayUpliftPercent = (month = {}) => {
  const averageDailyVolume = Math.max(toNumber(month.averageDailyVolume, 0), 0)
  const peakDailyVolume = Math.max(toNumber(month.peakDailyVolume, 0), 0)

  if (averageDailyVolume <= 0 || peakDailyVolume <= 0) {
    return 0
  }

  const upliftPercent = ((peakDailyVolume / averageDailyVolume) - 1) * 100
  return Math.max(Number(upliftPercent.toFixed(1)), 0)
}

export const applyForecastSnapshotToPlanMonths = (planMonths, snapshot, options = {}) => {
  const nextPlanMonths = Array.isArray(planMonths)
    ? planMonths.map((month) => createPlanMonth(month))
    : MONTH_LABELS.map(() => createPlanMonth())
  const sourceKind = String(options?.sourceKind || FORECAST_SOURCE_MODELED_DAILY)

  ;(Array.isArray(snapshot) ? snapshot : []).forEach((month) => {
    if (!nextPlanMonths[month.monthIndex]) {
      return
    }

    nextPlanMonths[month.monthIndex] = createPlanMonth({
      ...nextPlanMonths[month.monthIndex],
      contacts: Math.round(Math.max(toNumber(month.contacts, 0), 0)),
      peakDayUpliftPercent: sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY
        ? nextPlanMonths[month.monthIndex].peakDayUpliftPercent
        : derivePeakDayUpliftPercent(month)
    })
  })

  return nextPlanMonths
}

export const summarizeForecastDemandSnapshot = (snapshot) => {
  const normalizedSnapshot = Array.isArray(snapshot) ? snapshot : []
  const totalContacts = normalizedSnapshot.reduce((sum, month) => sum + Math.max(toNumber(month.contacts, 0), 0), 0)
  const peakMonth = normalizedSnapshot.reduce(
    (currentPeak, month) => (
      toNumber(month.contacts, 0) > toNumber(currentPeak?.contacts, -1)
        ? month
        : currentPeak
    ),
    null
  )

  return {
    matchedMonthCount: normalizedSnapshot.length,
    totalContacts,
    peakMonthLabel: peakMonth?.monthLabel || '',
    peakMonthContacts: peakMonth ? Math.max(toNumber(peakMonth.contacts, 0), 0) : 0,
    coverageLabel: `${normalizedSnapshot.length}/${MONTH_LABELS.length} months`
  }
}
