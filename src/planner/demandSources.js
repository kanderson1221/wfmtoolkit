import {
  computeForecastPlanningReady,
  FORECAST_SOURCE_MODELED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  getForecastProjectDailyRows,
  getForecastPlanningYear,
  getForecastProjectMonthlyRollup
} from '../forecasting/shared'
import { buildForecastMonthlyHandleTimeAssumptions } from '../forecasting/handleTimeAssumptions'
import { createPlanOpenDayChecker } from './planOpenDays'
import { MONTH_LABELS, createPlanMonth, resolvePlanningYear, toNumber } from './shared'

export const DEMAND_SOURCE_MANUAL = 'manual'
export const DEMAND_SOURCE_FORECAST = 'forecast'

const normalizeNullableAhtSeconds = (value) => {
  if (value == null) {
    return null
  }

  if (typeof value === 'string' && !value.trim()) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const normalizeDailySnapshotRow = (row = {}) => {
  const monthIndex = Math.max(
    0,
    Math.min(MONTH_LABELS.length - 1, Math.round(toNumber(row.monthIndex, 0)))
  )

  return {
    serviceDate: typeof row.serviceDate === 'string' ? row.serviceDate : '',
    monthIndex,
    monthLabel: row.monthLabel || MONTH_LABELS[monthIndex],
    contacts: Math.max(toNumber(row.contacts, 0), 0)
  }
}

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
        ahtSeconds: normalizeNullableAhtSeconds(month.ahtSeconds),
        lowerBoundContacts: Math.max(toNumber(month.lowerBoundContacts, 0), 0),
        upperBoundContacts: Math.max(toNumber(month.upperBoundContacts, 0), 0),
        averageDailyVolume: Math.max(toNumber(month.averageDailyVolume, 0), 0),
        peakDailyVolume: Math.max(toNumber(month.peakDailyVolume, 0), 0)
      }))
    : [],
  forecastDailySnapshot: Array.isArray(overrides.forecastDailySnapshot)
    ? overrides.forecastDailySnapshot
        .map((row) => normalizeDailySnapshotRow(row))
        .filter((row) => row.serviceDate)
        .sort((left, right) => left.serviceDate.localeCompare(right.serviceDate))
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
  const ahtAssumptionsByMonthStart = new Map(
    buildForecastMonthlyHandleTimeAssumptions(forecastProject).map((row) => [row.monthStart, row])
  )

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
        ahtSeconds: normalizeNullableAhtSeconds(
          ahtAssumptionsByMonthStart.get(row.monthStart)?.assumedAhtSeconds
        ),
        lowerBoundContacts: Math.max(toNumber(row.lowerBoundContacts, 0), 0),
        upperBoundContacts: Math.max(toNumber(row.upperBoundContacts, 0), 0),
        averageDailyVolume: Math.max(toNumber(row.averageDailyVolume, 0), 0),
        peakDailyVolume: Math.max(toNumber(row.peakDailyVolume, 0), 0)
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.monthIndex - right.monthIndex)
}

export const buildForecastDailyDemandSnapshot = (forecastProject, planningYear) => {
  const resolvedPlanningYear = resolvePlanningYear(planningYear)

  if (
    !computeForecastPlanningReady(forecastProject) ||
    getForecastPlanningYear(forecastProject) !== resolvedPlanningYear
  ) {
    return []
  }

  return getForecastProjectDailyRows(forecastProject)
    .filter((row) => !row?.isHistory)
    .map((row) => {
      if (typeof row?.ds !== 'string' || !row.ds.startsWith(`${resolvedPlanningYear}-`)) {
        return null
      }

      const parsedDate = parseMonthStart(row.ds)
      if (!parsedDate || parsedDate.getUTCFullYear() !== resolvedPlanningYear) {
        return null
      }

      const monthIndex = parsedDate.getUTCMonth()

      return normalizeDailySnapshotRow({
        serviceDate: row.ds,
        monthIndex,
        monthLabel: MONTH_LABELS[monthIndex],
        contacts: row.yhat
      })
    })
    .filter(Boolean)
    .sort((left, right) => left.serviceDate.localeCompare(right.serviceDate))
}

export const derivePeakDayUpliftPercent = (month = {}) => {
  const averageDailyVolume = Math.max(toNumber(month.averageDailyVolume, 0), 0)
  const peakDailyVolume = Math.max(toNumber(month.peakDailyVolume, 0), 0)

  if (averageDailyVolume <= 0 || peakDailyVolume <= 0) {
    return 0
  }

  const upliftPercent = ((peakDailyVolume / averageDailyVolume) - 1) * 100
  return Math.max(Number(upliftPercent.toFixed(1)), 0)
}

export const summarizeForecastDailyDemandForOpenDays = ({
  forecastDailySnapshot,
  planningYear,
  operatingWeekdays,
  holidayCalendarId,
  disabledHolidayRuleIds,
  customHolidays
} = {}) => {
  const resolvedPlanningYear = resolvePlanningYear(planningYear)
  const isOpenDay = createPlanOpenDayChecker({
    planningYear: resolvedPlanningYear,
    operatingWeekdays,
    holidayCalendarId,
    disabledHolidayRuleIds,
    customHolidays
  })
  const monthlySummaryByMonthIndex = new Map()

  ;(Array.isArray(forecastDailySnapshot) ? forecastDailySnapshot : []).forEach((row) => {
    const serviceDate = typeof row?.serviceDate === 'string' ? row.serviceDate : ''

    if (!serviceDate.startsWith(`${resolvedPlanningYear}-`) || !isOpenDay(serviceDate)) {
      return
    }

    const monthIndex = Math.max(
      0,
      Math.min(MONTH_LABELS.length - 1, Math.round(toNumber(row?.monthIndex, 0)))
    )
    const contacts = Math.max(toNumber(row?.contacts, 0), 0)
    const existingSummary = monthlySummaryByMonthIndex.get(monthIndex) || {
      monthIndex,
      monthLabel: MONTH_LABELS[monthIndex],
      contacts: 0,
      openForecastDays: 0,
      averageDailyVolume: 0,
      peakDailyVolume: 0
    }

    existingSummary.contacts += contacts
    existingSummary.openForecastDays += 1
    existingSummary.peakDailyVolume = Math.max(existingSummary.peakDailyVolume, contacts)
    monthlySummaryByMonthIndex.set(monthIndex, existingSummary)
  })

  monthlySummaryByMonthIndex.forEach((summary) => {
    summary.averageDailyVolume = summary.openForecastDays > 0
      ? summary.contacts / summary.openForecastDays
      : 0
  })

  return monthlySummaryByMonthIndex
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
      contacts: Math.round(Math.max(toNumber(month.contacts, 0), 0)),
      ahtSeconds: normalizeNullableAhtSeconds(month.ahtSeconds) ?? nextPlanMonths[month.monthIndex].ahtSeconds,
      peakDayUpliftPercent: derivePeakDayUpliftPercent(month)
    })
  })

  return nextPlanMonths
}

export const summarizeForecastDemandSnapshot = (snapshot) => {
  const normalizedSnapshot = Array.isArray(snapshot) ? snapshot : []
  const totalContacts = normalizedSnapshot.reduce((sum, month) => sum + Math.max(toNumber(month.contacts, 0), 0), 0)
  const weightedAhtTotal = normalizedSnapshot.reduce((sum, month) => (
    normalizeNullableAhtSeconds(month.ahtSeconds) != null && toNumber(month.contacts, 0) > 0
      ? sum + (toNumber(month.contacts, 0) * normalizeNullableAhtSeconds(month.ahtSeconds))
      : sum
  ), 0)
  const weightedAhtContacts = normalizedSnapshot.reduce((sum, month) => (
    normalizeNullableAhtSeconds(month.ahtSeconds) != null && toNumber(month.contacts, 0) > 0
      ? sum + toNumber(month.contacts, 0)
      : sum
  ), 0)
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
    averageAhtSeconds: weightedAhtContacts > 0 ? weightedAhtTotal / weightedAhtContacts : null,
    peakMonthLabel: peakMonth?.monthLabel || '',
    peakMonthContacts: peakMonth ? Math.max(toNumber(peakMonth.contacts, 0), 0) : 0,
    coverageLabel: `${normalizedSnapshot.length}/${MONTH_LABELS.length} months`
  }
}
