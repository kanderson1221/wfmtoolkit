import {
  computeForecastPlanningReady,
  FORECAST_SOURCE_MODELED_DAILY,
  getForecastProjectDailyRows,
  getForecastProjectMonthlyRollup
} from '../forecasting/shared'
import { buildForecastMonthlyHandleTimeAssumptions } from '../forecasting/handleTimeAssumptions'
import { createPlanOpenDayChecker } from './planOpenDays'
import { MONTH_LABELS, createPlanMonth, resolvePlanningYear, toNumber } from './shared'

export const DEMAND_SOURCE_MANUAL = 'manual'
export const DEMAND_SOURCE_FORECAST = 'forecast'
const PLAN_TYPE_UPDATE = 'update'

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

const normalizeMonthStartValue = (value) => {
  const parsed = parseMonthStart(value)
  if (!parsed) {
    return ''
  }

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export const buildPlanRequiredMonthStarts = (planningYear, options = {}) => {
  const resolvedPlanningYear = resolvePlanningYear(planningYear)
  const actualsThroughMonth = normalizeMonthStartValue(options.actualsThroughMonth)
  let startMonthIndex = 0

  if (options.planType === PLAN_TYPE_UPDATE && actualsThroughMonth.startsWith(`${resolvedPlanningYear}-`)) {
    startMonthIndex = Math.min(Number(actualsThroughMonth.slice(5, 7)), MONTH_LABELS.length)
  }

  return Array.from(
    { length: Math.max(MONTH_LABELS.length - startMonthIndex, 0) },
    (_, index) => {
      const monthIndex = startMonthIndex + index
      return `${resolvedPlanningYear}-${String(monthIndex + 1).padStart(2, '0')}-01`
    }
  )
}

const formatMissingCoverageLabel = (monthStarts = []) => {
  if (!monthStarts.length) {
    return ''
  }

  const formatMonth = (monthStart) => {
    const parsed = parseMonthStart(monthStart)
    if (!parsed) {
      return monthStart
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(parsed)
  }

  if (monthStarts.length === 1) {
    return formatMonth(monthStarts[0])
  }

  return `${formatMonth(monthStarts[0])}-${formatMonth(monthStarts[monthStarts.length - 1])}`
}

export const summarizeForecastCoverageForPlan = (forecastProject, planningYear, options = {}) => {
  const requiredMonthStarts = buildPlanRequiredMonthStarts(planningYear, options)
  const availableMonthStarts = new Set(
    getForecastProjectMonthlyRollup(forecastProject)
      .map((row) => normalizeMonthStartValue(row?.monthStart))
      .filter(Boolean)
  )
  const matchedMonthStarts = requiredMonthStarts.filter((monthStart) => availableMonthStarts.has(monthStart))
  const missingMonthStarts = requiredMonthStarts.filter((monthStart) => !availableMonthStarts.has(monthStart))

  return {
    requiredMonthStarts,
    matchedMonthStarts,
    missingMonthStarts,
    requiredMonthCount: requiredMonthStarts.length,
    matchedMonthCount: matchedMonthStarts.length,
    hasRequiredCoverage: requiredMonthStarts.length > 0 && missingMonthStarts.length === 0,
    coverageLabel: `Covers ${matchedMonthStarts.length}/${requiredMonthStarts.length} required months`,
    missingCoverageLabel: missingMonthStarts.length
      ? `Missing ${formatMissingCoverageLabel(missingMonthStarts)}`
      : ''
  }
}

export const buildForecastDemandSnapshot = (forecastProject, planningYear, options = {}) => {
  const resolvedPlanningYear = resolvePlanningYear(planningYear)
  const monthlyRollup = getForecastProjectMonthlyRollup(forecastProject)
  const coverageSummary = summarizeForecastCoverageForPlan(forecastProject, resolvedPlanningYear, options)
  const ahtAssumptionsByMonthStart = new Map(
    buildForecastMonthlyHandleTimeAssumptions(forecastProject).map((row) => [row.monthStart, row])
  )

  if (!computeForecastPlanningReady(forecastProject) || !coverageSummary.hasRequiredCoverage) {
    return []
  }

  const requiredMonthStarts = new Set(coverageSummary.requiredMonthStarts)

  return monthlyRollup
    .map((row) => {
      const parsedMonthStart = parseMonthStart(row.monthStart)
      if (!parsedMonthStart || !requiredMonthStarts.has(normalizeMonthStartValue(row.monthStart))) {
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

export const buildForecastDailyDemandSnapshot = (forecastProject, planningYear, options = {}) => {
  const resolvedPlanningYear = resolvePlanningYear(planningYear)
  const coverageSummary = summarizeForecastCoverageForPlan(forecastProject, resolvedPlanningYear, options)

  if (!computeForecastPlanningReady(forecastProject) || !coverageSummary.hasRequiredCoverage) {
    return []
  }

  const requiredMonthPrefixes = new Set(coverageSummary.requiredMonthStarts.map((monthStart) => monthStart.slice(0, 7)))

  return getForecastProjectDailyRows(forecastProject)
    .map((row) => {
      if (typeof row?.ds !== 'string' || !requiredMonthPrefixes.has(row.ds.slice(0, 7))) {
        return null
      }

      const parsedDate = parseMonthStart(row.ds)
      if (!parsedDate || parsedDate.getUTCFullYear() !== resolvedPlanningYear) {
        return null
      }

      const monthIndex = parsedDate.getUTCMonth()
      const actualValue = row.actualValue == null || row.actualValue === ''
        ? null
        : Number(row.actualValue)
      const forecastValue = toNumber(row.yhat, 0)
      const contacts = row.isHistory && Number.isFinite(actualValue)
        ? actualValue
        : forecastValue

      return normalizeDailySnapshotRow({
        serviceDate: row.ds,
        monthIndex,
        monthLabel: MONTH_LABELS[monthIndex],
        contacts
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

export const summarizeForecastDemandSnapshot = (snapshot, expectedMonthCount = MONTH_LABELS.length) => {
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
    coverageLabel: `Covers ${normalizedSnapshot.length}/${expectedMonthCount} required months`
  }
}
