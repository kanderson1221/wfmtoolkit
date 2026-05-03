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
const MONTHS_PER_YEAR = 12

const isSupportedForecastType = (value) => value === FORECAST_TYPE_BUDGET

const isSupportedForecastSourceKind = (value) => (
  value === FORECAST_SOURCE_MODELED_DAILY ||
  value === FORECAST_SOURCE_IMPORTED_DAILY ||
  value === FORECAST_SOURCE_MANUAL_MONTHLY
)

const padMonthDay = (value) => String(value).padStart(2, '0')
const parseDateParts = (value) => {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  return { year, month, day }
}

const monthEndDay = (year, month) => new Date(year, month, 0).getDate()
const monthIndexFromDateParts = ({ year, month }) => ((year * MONTHS_PER_YEAR) + month - 1)
const formatMonthStartFromAbsoluteIndex = (monthIndex) => {
  const year = Math.floor(monthIndex / MONTHS_PER_YEAR)
  const month = (monthIndex % MONTHS_PER_YEAR) + 1

  return `${year}-${padMonthDay(month)}-01`
}

const formatMonthLabelFromAbsoluteIndex = (monthIndex) => {
  const year = Math.floor(monthIndex / MONTHS_PER_YEAR)
  const month = monthIndex % MONTHS_PER_YEAR

  return `${MONTH_SHORT_LABELS[month]} ${year}`
}

const monthCountBetweenInclusive = (startMonthIndex, endMonthIndex) =>
  Math.max(0, endMonthIndex - startMonthIndex + 1)

const formatCoverageMonthLabel = (startMonthIndex, endMonthIndex) => {
  if (startMonthIndex === endMonthIndex) {
    return formatMonthLabelFromAbsoluteIndex(startMonthIndex)
  }

  const startYear = Math.floor(startMonthIndex / MONTHS_PER_YEAR)
  const endYear = Math.floor(endMonthIndex / MONTHS_PER_YEAR)
  const startMonth = MONTH_SHORT_LABELS[startMonthIndex % MONTHS_PER_YEAR]
  const endMonth = MONTH_SHORT_LABELS[endMonthIndex % MONTHS_PER_YEAR]

  return startYear === endYear
    ? `${startMonth}-${endMonth} ${startYear}`
    : `${startMonth} ${startYear}-${endMonth} ${endYear}`
}

export const resolveForecastSourceKind = (value) =>
  isSupportedForecastSourceKind(value) ? value : FORECAST_SOURCE_MODELED_DAILY

export const getForecastProjectSourceKind = (snapshot = {}) =>
  resolveForecastSourceKind(snapshot?.sourceKind)

export const getForecastSourceKindLabel = (value) => {
  const sourceKind = resolveForecastSourceKind(value)

  if (sourceKind === FORECAST_SOURCE_IMPORTED_DAILY) {
    return 'Imported Daily'
  }

  if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    return 'Monthly'
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
    toNumber(snapshot?.planningYear ?? planningContext?.planningYear, 0)
  )

  return resolvedPlanningYear > 0 ? resolvedPlanningYear : null
}

export const getForecastGroupId = (snapshot = {}) =>
  String(snapshot?.groupId || snapshot?.planningContext?.groupId || '').trim()

export const isPlanAlignedForecast = (snapshot = {}) =>
  Boolean(getForecastGroupId(snapshot) && getForecastPlanningYear(snapshot))

export const getForecastTypeLabel = (forecastType = '') => {
  if (forecastType === FORECAST_TYPE_BUDGET) {
    return 'Demand Forecast'
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
  coverageStartMonthIndex,
  coverageStartDate,
  coverageEndDate
} = {}) => {
  const resolvedPlanningYear = Math.round(toNumber(planningYear, 0))
  const resolvedForecastType = resolveForecastType(forecastType, { planningYear: resolvedPlanningYear })
  const fallbackStartMonthIndex = Math.max(0, Math.min(11, Math.round(toNumber(coverageStartMonthIndex, 0))))

  if (resolvedPlanningYear <= 0) {
    return {
      planningYear: null,
      forecastType: resolvedForecastType,
      coverageStartMonthIndex: fallbackStartMonthIndex,
      coverageStartDate: '',
      coverageEndDate: '',
      expectedMonthCount: 0,
      coverageLabel: '',
      coverageMonthLabel: '',
      coverageMonthCountLabel: '0 months'
    }
  }

  const startParts = parseDateParts(coverageStartDate) || {
    year: resolvedPlanningYear,
    month: fallbackStartMonthIndex + 1,
    day: 1
  }
  const endParts = parseDateParts(coverageEndDate) || {
    year: resolvedPlanningYear,
    month: 12,
    day: 31
  }
  const startAbsoluteMonthIndex = monthIndexFromDateParts(startParts)
  const endAbsoluteMonthIndex = monthIndexFromDateParts(endParts)
  const normalizedStartAbsoluteMonthIndex = Math.min(startAbsoluteMonthIndex, endAbsoluteMonthIndex)
  const normalizedEndAbsoluteMonthIndex = Math.max(startAbsoluteMonthIndex, endAbsoluteMonthIndex)
  const normalizedStartMonthIndex = normalizedStartAbsoluteMonthIndex % MONTHS_PER_YEAR
  const normalizedEndYear = Math.floor(normalizedEndAbsoluteMonthIndex / MONTHS_PER_YEAR)
  const normalizedEndMonth = (normalizedEndAbsoluteMonthIndex % MONTHS_PER_YEAR) + 1
  const normalizedCoverageStartDate = formatMonthStartFromAbsoluteIndex(normalizedStartAbsoluteMonthIndex)
  const normalizedCoverageEndDate = `${normalizedEndYear}-${padMonthDay(normalizedEndMonth)}-${padMonthDay(monthEndDay(normalizedEndYear, normalizedEndMonth))}`
  const expectedMonthCount = monthCountBetweenInclusive(
    normalizedStartAbsoluteMonthIndex,
    normalizedEndAbsoluteMonthIndex
  )

  return {
    planningYear: resolvedPlanningYear,
    forecastType: resolvedForecastType,
    coverageStartMonthIndex: normalizedStartMonthIndex,
    coverageStartDate: normalizedCoverageStartDate,
    coverageEndDate: normalizedCoverageEndDate,
    expectedMonthCount,
    coverageLabel: `${normalizedCoverageStartDate} to ${normalizedCoverageEndDate}`,
    coverageMonthLabel: formatCoverageMonthLabel(
      normalizedStartAbsoluteMonthIndex,
      normalizedEndAbsoluteMonthIndex
    ),
    coverageMonthCountLabel: `${expectedMonthCount}/${expectedMonthCount} months`
  }
}

const parseAbsoluteMonthIndexFromMonthStart = (value) => {
  if (typeof value !== 'string') {
    return null
  }

  const match = value.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (!match) {
    return null
  }

  const [, yearText, monthText] = match
  const monthIndex = Number(monthText) - 1
  return monthIndex >= 0 && monthIndex <= 11
    ? (Number(yearText) * MONTHS_PER_YEAR) + monthIndex
    : null
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

  const { coverageStartDate, coverageEndDate, expectedMonthCount } = resolveForecastCoverageWindow({
    planningYear: getForecastPlanningYear(snapshot),
    forecastType: resolveForecastType(snapshot?.forecastType, snapshot),
    coverageStartMonthIndex: snapshot?.coverageStartMonthIndex,
    coverageStartDate: snapshot?.coverageStartDate,
    coverageEndDate: snapshot?.coverageEndDate
  })

  if (!coverageStartDate || !coverageEndDate || !expectedMonthCount) {
    return false
  }

  const startMonthIndex = parseAbsoluteMonthIndexFromMonthStart(coverageStartDate)
  const endMonthIndex = parseAbsoluteMonthIndexFromMonthStart(coverageEndDate)
  if (startMonthIndex == null || endMonthIndex == null) {
    return false
  }

  const expectedMonthIndices = Array.from({ length: expectedMonthCount }, (_, index) => startMonthIndex + index)
  const actualMonthIndices = [...new Set(
    monthlyRollup
      .map((row) => parseAbsoluteMonthIndexFromMonthStart(row?.monthStart))
      .filter((monthIndex) => monthIndex != null)
  )].sort((left, right) => left - right)

  if (actualMonthIndices.length !== expectedMonthIndices.length) {
    return false
  }

  return expectedMonthIndices.every((monthIndex, index) => actualMonthIndices[index] === monthIndex)
}
