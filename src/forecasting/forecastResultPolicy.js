import {
  FORECAST_RESULT_TABS,
  FORECAST_SOURCE_IMPORTED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  FORECAST_SOURCE_MODELED_DAILY,
  FORECAST_TYPE_BUDGET,
  toNumber
} from './forecastConstants'
import { getForecastAvailableAhtHistoryRows } from './forecastTrainingWindow'

const MONTH_SHORT_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const isSupportedForecastType = (value) => value === FORECAST_TYPE_BUDGET

const isSupportedForecastSourceKind = (value) => (
  value === FORECAST_SOURCE_MODELED_DAILY ||
  value === FORECAST_SOURCE_IMPORTED_DAILY ||
  value === FORECAST_SOURCE_MANUAL_MONTHLY
)

const padMonthDay = (value) => String(value).padStart(2, '0')

const parseIsoDateParts = (value) => {
  const match = typeof value === 'string' ? value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/) : null
  if (!match) {
    return null
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12) {
    return null
  }

  const lastDay = new Date(year, month, 0).getDate()
  if (day < 1 || day > lastDay) {
    return null
  }

  return { year, month, day }
}

const normalizeIsoDate = (value) => {
  const parts = parseIsoDateParts(value)
  if (!parts) {
    return ''
  }

  return `${parts.year}-${padMonthDay(parts.month)}-${padMonthDay(parts.day)}`
}

const buildMonthStartDate = (year, month) => `${year}-${padMonthDay(month)}-01`

export const buildMonthEndDate = (monthStart) => {
  const parts = parseIsoDateParts(monthStart)
  if (!parts) {
    return ''
  }

  const lastDay = new Date(parts.year, parts.month, 0).getDate()
  return `${parts.year}-${padMonthDay(parts.month)}-${padMonthDay(lastDay)}`
}

const isMonthAlignedCoverage = (startDate, endDate) => {
  const startParts = parseIsoDateParts(startDate)
  const endParts = parseIsoDateParts(endDate)

  return Boolean(
    startParts &&
      endParts &&
      startParts.day === 1 &&
      endDate === buildMonthEndDate(buildMonthStartDate(endParts.year, endParts.month))
  )
}

export const buildForecastCoverageMonthStarts = (startDate, endDate) => {
  const normalizedStartDate = normalizeIsoDate(startDate)
  const normalizedEndDate = normalizeIsoDate(endDate)

  if (!normalizedStartDate || !normalizedEndDate || normalizedStartDate > normalizedEndDate) {
    return []
  }

  const startParts = parseIsoDateParts(normalizedStartDate)
  const endParts = parseIsoDateParts(normalizedEndDate)
  const monthStarts = []
  let year = startParts.year
  let month = startParts.month

  while (year < endParts.year || (year === endParts.year && month <= endParts.month)) {
    monthStarts.push(buildMonthStartDate(year, month))
    month += 1

    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return monthStarts
}

const formatCoverageMonthRange = (monthStarts = []) => {
  if (!monthStarts.length) {
    return ''
  }

  const first = parseIsoDateParts(monthStarts[0])
  const last = parseIsoDateParts(monthStarts[monthStarts.length - 1])
  if (!first || !last) {
    return ''
  }

  if (first.year === last.year && first.month === last.month) {
    return `${MONTH_SHORT_LABELS[first.month - 1]} ${first.year}`
  }

  return `${MONTH_SHORT_LABELS[first.month - 1]} ${first.year}-${MONTH_SHORT_LABELS[last.month - 1]} ${last.year}`
}

const getCoverageStartYear = (snapshot = {}) => {
  const parts = parseIsoDateParts(snapshot?.coverageStartDate)
  return parts?.year || null
}

export const resolveForecastSourceKind = (value) =>
  isSupportedForecastSourceKind(value) ? value : FORECAST_SOURCE_MODELED_DAILY

export const getForecastProjectSourceKind = (snapshot = {}) =>
  resolveForecastSourceKind(snapshot?.sourceKind)

export const getForecastSourceKindLabel = (value) => {
  const sourceKind = resolveForecastSourceKind(value)

  if (sourceKind === FORECAST_SOURCE_IMPORTED_DAILY) {
    return 'Imported'
  }

  if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    return 'Manual'
  }

  return 'Modeled'
}

export const isForecastProjectReadOnly = (snapshot = {}) =>
  getForecastProjectSourceKind(snapshot) !== FORECAST_SOURCE_MODELED_DAILY

export const canForecastProjectRun = (snapshot = {}) =>
  getForecastProjectSourceKind(snapshot) === FORECAST_SOURCE_MODELED_DAILY

export const canForecastProjectShowInspector = (snapshot = {}) =>
  getForecastProjectSourceKind(snapshot) === FORECAST_SOURCE_MODELED_DAILY

export const canForecastProjectAdjust = (snapshot = {}) =>
  getForecastProjectSourceKind(snapshot) === FORECAST_SOURCE_MODELED_DAILY

export const forecastProjectHasAhtHistory = (snapshot = {}) =>
  getForecastAvailableAhtHistoryRows(snapshot).length > 0

export const getForecastProjectResultTabs = (snapshot = {}) => {
  const sourceKind = getForecastProjectSourceKind(snapshot)
  const showAhtTab = sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY && forecastProjectHasAhtHistory(snapshot)

  if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    return FORECAST_RESULT_TABS.filter((tab) => tab.id === 'monthly')
  }

  return FORECAST_RESULT_TABS.filter((tab) => showAhtTab || tab.id !== 'aht')
}

export const getForecastSourceActionLabel = (snapshot = {}) => {
  const sourceKind = getForecastProjectSourceKind(snapshot)

  if (sourceKind === FORECAST_SOURCE_IMPORTED_DAILY) {
    return 'Replace Data'
  }

  if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    return 'Replace Forecast'
  }

  return 'Data'
}

export const getForecastPlanningYear = (snapshot = {}) => {
  const planningContext = snapshot?.planningContext || {}
  const resolvedPlanningYear = Math.round(
    toNumber(snapshot?.planningYear ?? planningContext?.planningYear ?? getCoverageStartYear(snapshot), 0)
  )

  return resolvedPlanningYear > 0 ? resolvedPlanningYear : null
}

export const getForecastGroupId = (snapshot = {}) =>
  String(snapshot?.groupId || snapshot?.planningContext?.groupId || '').trim()

export const isPlanAlignedForecast = (snapshot = {}) =>
  Boolean(getForecastGroupId(snapshot) && getForecastPlanningYear(snapshot))

export const getForecastTypeLabel = (forecastType = '') => {
  if (forecastType === FORECAST_TYPE_BUDGET) {
    return 'Budget Forecast'
  }

  return 'Legacy Forecast'
}

export const resolveForecastType = (value, snapshot = {}) => {
  if (isSupportedForecastType(value)) {
    return value
  }

  return isPlanAlignedForecast(snapshot) ? FORECAST_TYPE_BUDGET : ''
}

export const resolveForecastCoverageWindow = ({
  planningYear,
  forecastType,
  coverageStartMonthIndex: _coverageStartMonthIndex,
  coverageStartDate,
  coverageEndDate
} = {}) => {
  const resolvedPlanningYear = Math.round(toNumber(planningYear, 0))
  const resolvedForecastType = resolveForecastType(forecastType, { planningYear: resolvedPlanningYear })
  const normalizedCoverageStartDate = normalizeIsoDate(coverageStartDate)
  const normalizedCoverageEndDate = normalizeIsoDate(coverageEndDate)
  const fallbackStartDate = resolvedPlanningYear > 0 ? `${resolvedPlanningYear}-01-01` : ''
  const fallbackEndDate = resolvedPlanningYear > 0 ? `${resolvedPlanningYear}-12-31` : ''
  const startDate = normalizedCoverageStartDate || fallbackStartDate
  const endDate = normalizedCoverageEndDate || fallbackEndDate
  const startParts = parseIsoDateParts(startDate)
  const normalizedStartMonthIndex = startParts ? startParts.month - 1 : 0

  if (!startDate || !endDate || startDate > endDate) {
    return {
      planningYear: resolvedPlanningYear > 0 ? resolvedPlanningYear : null,
      forecastType: resolvedForecastType,
      coverageStartMonthIndex: normalizedStartMonthIndex,
      coverageStartDate: '',
      coverageEndDate: '',
      expectedMonthCount: 0,
      coverageLabel: '',
      coverageMonthLabel: '',
      coverageMonthCountLabel: '0 months'
    }
  }

  const monthStarts = isMonthAlignedCoverage(startDate, endDate)
    ? buildForecastCoverageMonthStarts(startDate, endDate)
    : []
  const expectedMonthCount = monthStarts.length
  const coverageMonthLabel = formatCoverageMonthRange(monthStarts)

  return {
    planningYear: resolvedPlanningYear > 0 ? resolvedPlanningYear : startParts?.year || null,
    forecastType: resolvedForecastType,
    coverageStartMonthIndex: normalizedStartMonthIndex,
    coverageStartDate: startDate,
    coverageEndDate: endDate,
    expectedMonthCount,
    expectedMonthStarts: monthStarts,
    coverageIsMonthAligned: Boolean(expectedMonthCount),
    coverageLabel: `${startDate} to ${endDate}`,
    coverageMonthLabel,
    coverageMonthCountLabel: `${expectedMonthCount}/${expectedMonthCount} months`
  }
}

const normalizeMonthStart = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  const match = value.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (!match) {
    return ''
  }

  const [, yearText, monthText] = match
  const monthIndex = Number(monthText) - 1
  return monthIndex >= 0 && monthIndex <= 11 ? `${yearText}-${monthText}-01` : ''
}

export const computeForecastPlanningReady = (snapshot = {}) => {
  if (!isPlanAlignedForecast(snapshot)) {
    return false
  }

  const monthlyRollup = Array.isArray(snapshot?.lastRun?.monthlyRollup)
    ? snapshot.lastRun.monthlyRollup
    : Array.isArray(snapshot?.monthlyRollup)
      ? snapshot.monthlyRollup
      : []
  const runAt = snapshot?.lastRun?.runAt || snapshot?.runAt || ''

  if (!runAt || !monthlyRollup.length) {
    return false
  }

  const { planningYear, expectedMonthCount, expectedMonthStarts } = resolveForecastCoverageWindow({
    planningYear: getForecastPlanningYear(snapshot),
    forecastType: resolveForecastType(snapshot?.forecastType, snapshot),
    coverageStartMonthIndex: snapshot?.coverageStartMonthIndex,
    coverageStartDate: snapshot?.coverageStartDate,
    coverageEndDate: snapshot?.coverageEndDate
  })

  if (!planningYear || !expectedMonthCount) {
    return false
  }

  const actualMonthStarts = [...new Set(
    monthlyRollup
      .map((row) => normalizeMonthStart(row?.monthStart))
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right))

  if (actualMonthStarts.length < expectedMonthStarts.length) {
    return false
  }

  return expectedMonthStarts.every((monthStart) => actualMonthStarts.includes(monthStart))
}
