import {
  clonePlain,
  createForecastEntityId,
  DEFAULT_FORECAST_TIMEZONE
} from './forecastConstants'
import {
  computeForecastPlanningReady,
  getForecastPlanningYear,
  resolveForecastCoverageWindow,
  resolveForecastSourceKind,
  resolveForecastType
} from './forecastResultPolicy'
import {
  createEmptyForecastResults,
  normalizeForecastManualAdjustments
} from './forecastProjection'
import {
  normalizeForecastAhtHistoryRows,
  normalizeForecastHistoryRows
} from './forecastTrainingWindow'
import { buildForecastBaseName } from './forecastProjectMeta'

const normalizeForecastAhtMonthStart = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmedValue = value.trim()
  const match = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return ''
  }

  const [, yearText, monthText] = match
  const month = Number(monthText)

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return ''
  }

  return `${yearText}-${monthText}-01`
}

const normalizeForecastAhtMonthOverride = (row = {}) => {
  const monthStart = normalizeForecastAhtMonthStart(
    row?.monthStart ??
      row?.month ??
      row?.ds
  )
  const ahtSeconds = Number(row?.ahtSeconds)

  if (!monthStart || !Number.isFinite(ahtSeconds) || ahtSeconds < 0) {
    return null
  }

  return {
    monthStart,
    ahtSeconds
  }
}

const normalizeForecastAhtMonthOverrides = (rows = []) =>
  Array.isArray(rows)
    ? rows
      .map((row) => normalizeForecastAhtMonthOverride(row))
      .filter(Boolean)
      .sort((left, right) => left.monthStart.localeCompare(right.monthStart))
    : []

const normalizeForecastColumnMapping = (mapping = {}) => ({
  dateColumn: mapping?.dateColumn || '',
  volumeColumn: mapping?.volumeColumn || ''
})

const normalizeForecastSourceData = (sourceData = {}) => ({
  fileName: sourceData?.fileName || '',
  headers: Array.isArray(sourceData?.headers) ? [...sourceData.headers] : [],
  rows: Array.isArray(sourceData?.rows) ? sourceData.rows.map((row) => ({ ...row })) : [],
  mapping: sourceData?.mapping && typeof sourceData.mapping === 'object'
    ? { ...sourceData.mapping }
    : {},
  issues: Array.isArray(sourceData?.issues) ? [...sourceData.issues] : []
})

export const createForecastHoliday = (overrides = {}) => ({
  id: createForecastEntityId('forecast-holiday'),
  name: '',
  date: '',
  lowerWindow: -1,
  upperWindow: 1,
  priorScale: 10,
  ...overrides
})

export const createForecastManualAdjustment = (overrides = {}) => ({
  id: createForecastEntityId('forecast-adjustment'),
  startDate: '',
  endDate: '',
  adjustmentType: 'delta',
  value: 0,
  reason: '',
  ...overrides
})

export const createForecastSeasonality = (overrides = {}) => ({
  id: createForecastEntityId('forecast-seasonality'),
  name: '',
  periodDays: 30.5,
  fourierOrder: 5,
  priorScale: 10,
  mode: 'additive',
  ...overrides
})

export const createForecastCenterSnapshot = (overrides = {}) => {
  const snapshot = overrides && typeof overrides === 'object' ? clonePlain(overrides) : {}

  return {
    centerId: snapshot.centerId || '',
    centerName: snapshot.centerName || '',
    timezone: snapshot.timezone || DEFAULT_FORECAST_TIMEZONE,
    operatingWeekdays: Array.isArray(snapshot.operatingWeekdays) ? [...snapshot.operatingWeekdays] : [],
    operatingOpenTime: snapshot.operatingOpenTime || '',
    operatingCloseTime: snapshot.operatingCloseTime || '',
    holidayProfileYear: Number(snapshot.holidayProfileYear) || null,
    holidayCalendarLabel: snapshot.holidayCalendarLabel || '',
    customHolidayCount: Number(snapshot.customHolidayCount) || 0
  }
}

export const createForecastProject = (overrides = {}) => {
  const snapshot = overrides && typeof overrides === 'object' ? clonePlain(overrides) : {}
  const { intervalModel: _legacyIntervalModel, ...projectSnapshot } = snapshot
  const {
    runNotes: _legacyRunNotes,
    weeklyFourierOrder: _legacyWeeklyFourierOrder,
    weeklyPriorScale: _legacyWeeklyPriorScale,
    yearlyFourierOrder: _legacyYearlyFourierOrder,
    yearlyPriorScale: _legacyYearlyPriorScale,
    ...snapshotModelConfig
  } = snapshot.modelConfig || {}
  const planningContext = {
    centerId: null,
    groupId: null,
    planId: null,
    planningYear: null,
    groupName: '',
    ...(snapshot.planningContext || {})
  }
  const planningYear = getForecastPlanningYear({ ...snapshot, planningContext })
  const groupId = String(snapshot.groupId || planningContext.groupId || '').trim()
  const forecastType = resolveForecastType(snapshot.forecastType, {
    ...snapshot,
    groupId,
    planningYear,
    planningContext
  })
  const coverageWindow = resolveForecastCoverageWindow({
    planningYear,
    forecastType,
    coverageStartMonthIndex: snapshot.coverageStartMonthIndex,
    coverageStartDate: snapshot.coverageStartDate,
    coverageEndDate: snapshot.coverageEndDate
  })
  const normalizedLastRun = snapshot.lastRun?.runAt ? createEmptyForecastResults(snapshot.lastRun) : createEmptyForecastResults()
  const sourceKind = resolveForecastSourceKind(snapshot.sourceKind)

  return {
    ...projectSnapshot,
    id: snapshot.id || '',
    name: snapshot.name || buildForecastBaseName(snapshot),
    sourceKind,
    centerId: snapshot.centerId || snapshot.planningContext?.centerId || '',
    centerName: snapshot.centerName || '',
    groupId,
    planningYear,
    forecastType,
    coverageStartMonthIndex: coverageWindow.coverageStartMonthIndex,
    coverageStartDate: snapshot.coverageStartDate || coverageWindow.coverageStartDate,
    coverageEndDate: snapshot.coverageEndDate || coverageWindow.coverageEndDate,
    planningReady: computeForecastPlanningReady({
      ...snapshot,
      groupId,
      planningYear,
      forecastType,
      coverageStartMonthIndex: coverageWindow.coverageStartMonthIndex,
      coverageStartDate: coverageWindow.coverageStartDate,
      coverageEndDate: coverageWindow.coverageEndDate,
      lastRun: normalizedLastRun
    }),
    sourceCenterSnapshot: snapshot.sourceCenterSnapshot
      ? createForecastCenterSnapshot(snapshot.sourceCenterSnapshot)
      : createForecastCenterSnapshot(),
    centerManagedHolidays: Boolean(snapshot.centerManagedHolidays),
    seriesLabel: snapshot.seriesLabel || 'Daily Call Volume',
    timezone: snapshot.timezone || DEFAULT_FORECAST_TIMEZONE,
    forecastHorizonDays: snapshot.forecastHorizonDays || 365,
    forecastHorizonPreset: snapshot.forecastHorizonPreset || '365',
    uploadedFileName: snapshot.uploadedFileName || '',
    uploadedHeaders: Array.isArray(snapshot.uploadedHeaders) ? [...snapshot.uploadedHeaders] : [],
    uploadedRows: Array.isArray(snapshot.uploadedRows) ? snapshot.uploadedRows.map((row) => ({ ...row })) : [],
    historyRows: normalizeForecastHistoryRows(snapshot.historyRows),
    ahtHistoryRows: normalizeForecastAhtHistoryRows(snapshot.ahtHistoryRows),
    manualAdjustments: normalizeForecastManualAdjustments(snapshot.manualAdjustments),
    parserIssues: Array.isArray(snapshot.parserIssues) ? [...snapshot.parserIssues] : [],
    normalizationIssues: Array.isArray(snapshot.normalizationIssues) ? [...snapshot.normalizationIssues] : [],
    columnMapping: normalizeForecastColumnMapping(snapshot.columnMapping),
    sourceData: normalizeForecastSourceData(snapshot.sourceData),
    modelConfig: {
      growth: 'linear',
      defaultCap: null,
      defaultFloor: 0,
      changepointPriorScale: 0.05,
      changepointRange: 0.8,
      changepointCount: 25,
      manualChangepoints: '',
      seasonalityMode: 'additive',
      weeklySeasonalityEnabled: true,
      yearlySeasonalityEnabled: true,
      monthlySeasonalityEnabled: false,
      builtInHolidayCountry: 'US',
      holidaysPriorScale: 10,
      customSeasonalities: Array.isArray(snapshotModelConfig?.customSeasonalities)
        ? snapshotModelConfig.customSeasonalities.map((item) => ({ ...item }))
        : [],
      customHolidays: Array.isArray(snapshotModelConfig?.customHolidays)
        ? snapshotModelConfig.customHolidays.map((item) => ({ ...item }))
        : [],
      intervalWidth: 0.8,
      mcmcSamples: 0,
      holdoutDays: 60,
      trainingStartDate: '',
      trainingEndDate: '',
      ahtAssumptionMethod: 'blend_recent_seasonal',
      ahtRecentMonthsWindow: 3,
      ...snapshotModelConfig,
      ahtMonthOverrides: normalizeForecastAhtMonthOverrides(snapshotModelConfig?.ahtMonthOverrides)
    },
    planningContext,
    lastRun: normalizedLastRun,
    createdAt: snapshot.createdAt || '',
    updatedAt: snapshot.updatedAt || ''
  }
}
