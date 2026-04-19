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
  coverageStartMonthIndex: _coverageStartMonthIndex
} = {}) => {
  const resolvedPlanningYear = Math.round(toNumber(planningYear, 0))
  const resolvedForecastType = resolveForecastType(forecastType, { planningYear: resolvedPlanningYear })
  const normalizedStartMonthIndex = 0

  if (resolvedPlanningYear <= 0) {
    return {
      planningYear: null,
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

  const coverageStartDate = `${resolvedPlanningYear}-${padMonthDay(normalizedStartMonthIndex + 1)}-01`
  const coverageEndDate = `${resolvedPlanningYear}-12-31`
  const coverageMonthLabel = `${MONTH_SHORT_LABELS[0]}-${MONTH_SHORT_LABELS[11]} ${resolvedPlanningYear}`
  const expectedMonthCount = 12

  return {
    planningYear: resolvedPlanningYear,
    forecastType: resolvedForecastType,
    coverageStartMonthIndex: normalizedStartMonthIndex,
    coverageStartDate,
    coverageEndDate,
    expectedMonthCount,
    coverageLabel: `${resolvedPlanningYear}-01-01 to ${coverageEndDate}`,
    coverageMonthLabel,
    coverageMonthCountLabel: `${expectedMonthCount}/${expectedMonthCount} months`
  }
}

const parseMonthIndexFromMonthStart = (value, planningYear) => {
  if (typeof value !== 'string') {
    return null
  }

  const match = value.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (!match) {
    return null
  }

  const [, yearText, monthText] = match
  if (Number(yearText) !== Number(planningYear)) {
    return null
  }

  const monthIndex = Number(monthText) - 1
  return monthIndex >= 0 && monthIndex <= 11 ? monthIndex : null
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

  const { planningYear, coverageStartMonthIndex, forecastType, expectedMonthCount } = resolveForecastCoverageWindow({
    planningYear: getForecastPlanningYear(snapshot),
    forecastType: resolveForecastType(snapshot?.forecastType, snapshot),
    coverageStartMonthIndex: snapshot?.coverageStartMonthIndex
  })

  if (!planningYear || !expectedMonthCount) {
    return false
  }

  const expectedMonthIndices = Array.from(
    { length: expectedMonthCount },
    (_, index) => coverageStartMonthIndex + index
  )
  const actualMonthIndices = [...new Set(
    monthlyRollup
      .map((row) => parseMonthIndexFromMonthStart(row?.monthStart, planningYear))
      .filter((monthIndex) => monthIndex != null)
  )].sort((left, right) => left - right)

  if (actualMonthIndices.length !== expectedMonthIndices.length) {
    return false
  }

  return expectedMonthIndices.every((monthIndex, index) => actualMonthIndices[index] === monthIndex) &&
    coverageStartMonthIndex === 0
}
