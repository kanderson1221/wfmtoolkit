import {
  computeForecastPlanningReady,
  getForecastPlanningYear,
  resolveForecastCoverageWindow,
  resolveForecastType
} from '../forecasting/shared'
import { MONTH_LABELS, createPlanMonth, resolvePlanningYear, toNumber } from './shared'

export const DEMAND_SOURCE_MANUAL = 'manual'
export const DEMAND_SOURCE_FORECAST = 'forecast'

export const DEMAND_SOURCE_OPTIONS = [
  { id: DEMAND_SOURCE_MANUAL, label: 'Manual Monthly Inputs' },
  { id: DEMAND_SOURCE_FORECAST, label: 'Saved Forecast' }
]

export const createPlanDemandSource = (overrides = {}) => ({
  mode: overrides.mode === DEMAND_SOURCE_FORECAST ? DEMAND_SOURCE_FORECAST : DEMAND_SOURCE_MANUAL,
  forecastProjectId: overrides.forecastProjectId || '',
  forecastProjectName: overrides.forecastProjectName || '',
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
        upperBoundContacts: Math.max(toNumber(month.upperBoundContacts, 0), 0)
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
  const resolvedForecastType = resolveForecastType(forecastProject?.forecastType, forecastProject)
  const coverageWindow = resolveForecastCoverageWindow({
    planningYear: getForecastPlanningYear(forecastProject) || resolvedPlanningYear,
    forecastType: resolvedForecastType,
    coverageStartMonthIndex: forecastProject?.coverageStartMonthIndex
  })
  const monthlyRollup = Array.isArray(forecastProject?.lastRun?.monthlyRollup)
    ? forecastProject.lastRun.monthlyRollup
    : []

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
      if (monthIndex < coverageWindow.coverageStartMonthIndex) {
        return null
      }

      return {
        monthIndex,
        monthLabel: row.monthLabel || MONTH_LABELS[monthIndex],
        monthStart: row.monthStart || '',
        contacts: Math.max(toNumber(row.contacts, 0), 0),
        lowerBoundContacts: Math.max(toNumber(row.lowerBoundContacts, 0), 0),
        upperBoundContacts: Math.max(toNumber(row.upperBoundContacts, 0), 0)
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.monthIndex - right.monthIndex)
}

export const applyForecastSnapshotToPlanMonths = (planMonths, snapshot) => {
  const nextPlanMonths = Array.isArray(planMonths)
    ? planMonths.map((month) => createPlanMonth(month))
    : MONTH_LABELS.map(() => createPlanMonth())

  ;(Array.isArray(snapshot) ? snapshot : []).forEach((month) => {
    if (!nextPlanMonths[month.monthIndex]) {
      return
    }

    nextPlanMonths[month.monthIndex] = createPlanMonth({
      ...nextPlanMonths[month.monthIndex],
      contacts: Math.round(Math.max(toNumber(month.contacts, 0), 0))
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
