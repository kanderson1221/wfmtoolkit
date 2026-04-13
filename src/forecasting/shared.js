export const FORECAST_RESULT_TABS = [
  { id: 'daily', label: 'Forecast' },
  { id: 'components', label: 'Components' },
  { id: 'monthly', label: 'Monthly Rollup' }
]

export const FORECAST_TYPE_BUDGET = 'budget'
export const FORECAST_SOURCE_MODELED_DAILY = 'modeled_daily'
export const FORECAST_SOURCE_IMPORTED_DAILY = 'imported_daily'
export const FORECAST_SOURCE_MANUAL_MONTHLY = 'manual_monthly'

export const FORECAST_TYPE_OPTIONS = [
  { label: 'Budget Forecast', value: FORECAST_TYPE_BUDGET }
]

export const FORECAST_SOURCE_KIND_OPTIONS = [
  {
    id: FORECAST_SOURCE_MODELED_DAILY,
    label: 'Build Forecast',
    description: 'Upload history and generate a modeled daily forecast.'
  },
  {
    id: FORECAST_SOURCE_IMPORTED_DAILY,
    label: 'Import Daily Forecast',
    description: 'Upload an existing daily forecast without using Prophet.'
  },
  {
    id: FORECAST_SOURCE_MANUAL_MONTHLY,
    label: 'Enter Monthly Forecast',
    description: 'Enter monthly contacts directly for this staffing group.'
  }
]

export const FORECAST_HORIZON_PRESETS = [
  { id: '30', label: '30 Days', value: 30 },
  { id: '90', label: '90 Days', value: 90 },
  { id: '180', label: '180 Days', value: 180 },
  { id: '365', label: '365 Days', value: 365 },
  { id: 'custom', label: 'Custom', value: null }
]

const MONTH_SHORT_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const GROWTH_OPTIONS = [
  { label: 'Linear', value: 'linear' },
  { label: 'Logistic', value: 'logistic' },
  { label: 'Flat', value: 'flat' }
]

export const SEASONALITY_MODE_OPTIONS = [
  { label: 'Additive', value: 'additive' },
  { label: 'Multiplicative', value: 'multiplicative' }
]

export const FORECAST_WEEKLY_SEASONALITY_DEFAULTS = {
  fourierOrder: 3,
  priorScale: 10
}

export const FORECAST_YEARLY_SEASONALITY_DEFAULTS = {
  fourierOrder: 10,
  priorScale: 10
}

export const FORECAST_MONTHLY_SEASONALITY_DEFAULTS = {
  periodDays: 30.5,
  fourierOrder: 5,
  priorScale: 10
}

export const HOLIDAY_CALENDAR_OPTIONS = [
  { label: 'No built-in holidays', value: '' },
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Australia', value: 'AU' }
]

const resolveDefaultTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  } catch {
    return 'America/New_York'
  }
}

export const clonePlain = (value) => JSON.parse(JSON.stringify(value))

export const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const createForecastEntityId = (prefix = 'forecast') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const DEFAULT_FORECAST_TIMEZONE = resolveDefaultTimeZone()

const padMonthDay = (value) => String(value).padStart(2, '0')
const isSupportedForecastType = (value) =>
  value === FORECAST_TYPE_BUDGET
const isSupportedForecastSourceKind = (value) => (
  value === FORECAST_SOURCE_MODELED_DAILY ||
  value === FORECAST_SOURCE_IMPORTED_DAILY ||
  value === FORECAST_SOURCE_MANUAL_MONTHLY
)

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

export const getForecastProjectResultTabs = (snapshot = {}) => {
  const sourceKind = getForecastProjectSourceKind(snapshot)

  if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    return FORECAST_RESULT_TABS.filter((tab) => tab.id === 'monthly')
  }

  if (sourceKind === FORECAST_SOURCE_IMPORTED_DAILY) {
    return FORECAST_RESULT_TABS.filter((tab) => tab.id !== 'components')
  }

  return FORECAST_RESULT_TABS
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

export const createForecastHoliday = (overrides = {}) => ({
  id: createForecastEntityId('forecast-holiday'),
  name: '',
  date: '',
  lowerWindow: 0,
  upperWindow: 0,
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

const normalizeDailyForecastRows = (rows = []) =>
  Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []

const normalizeForecastHistoryRow = (row = {}) => {
  const normalizedRow = {
    ds: row?.ds || '',
    y: row?.y ?? 0,
    cap: row?.cap ?? null,
    floor: row?.floor ?? null
  }

  if (row?.sourceRowIndex != null) {
    normalizedRow.sourceRowIndex = row.sourceRowIndex
  }

  if (typeof row?.holidayLabel === 'string') {
    normalizedRow.holidayLabel = row.holidayLabel
  }

  return normalizedRow
}

const normalizeForecastHistoryRows = (rows = []) =>
  Array.isArray(rows)
    ? rows.map((row) => normalizeForecastHistoryRow(row))
    : []

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

const normalizeForecastManualAdjustments = (adjustments = []) => {
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

const normalizeForecastColumnMapping = (mapping = {}) => ({
  dateColumn: mapping?.dateColumn || '',
  volumeColumn: mapping?.volumeColumn || '',
  capColumn: mapping?.capColumn || '',
  floorColumn: mapping?.floorColumn || ''
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

export const createForecastProject = (overrides = {}) => {
  const snapshot = overrides && typeof overrides === 'object' ? clonePlain(overrides) : {}
  const { intervalModel: legacyIntervalModel, ...projectSnapshot } = snapshot
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
    coverageStartMonthIndex: snapshot.coverageStartMonthIndex
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
      ...snapshotModelConfig
    },
    planningContext,
    lastRun: normalizedLastRun,
    createdAt: snapshot.createdAt || '',
    updatedAt: snapshot.updatedAt || ''
  }
}

export const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

export const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

export const formatPercent = (value, digits = 1) => `${formatNumber(value, digits)}%`

export const parseForecastDateValue = (value) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch
      const parsedDateOnly = new Date(Number(year), Number(month) - 1, Number(day))
      return Number.isNaN(parsedDateOnly.getTime()) ? null : parsedDateOnly
    }
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatDate = (value) => {
  if (!value) {
    return '—'
  }

  const parsed = parseForecastDateValue(value)
  if (!parsed) {
    return String(value)
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parsed)
}

export const formatDateTime = (value) => {
  if (!value) {
    return '—'
  }

  const parsed = parseForecastDateValue(value)
  if (!parsed) {
    return String(value)
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed)
}

export const mergeForecastProjectCollections = (...collections) => {
  const mergedProjects = []
  const seenProjectIds = new Set()

  collections.forEach((collection) => {
    ;(Array.isArray(collection) ? collection : []).forEach((project) => {
      if (!project?.id || seenProjectIds.has(project.id)) {
        return
      }

      seenProjectIds.add(project.id)
      mergedProjects.push(project)
    })
  })

  return mergedProjects
}

export const forecastProjectBelongsToPlanningContext = (project, centerId, groupId) => {
  const normalizedCenterId = String(centerId || '').trim()
  if (!normalizedCenterId) {
    return true
  }

  const projectCenterId = String(project?.centerId || project?.planningContext?.centerId || '').trim()
  if (projectCenterId && projectCenterId !== normalizedCenterId) {
    return false
  }

  const normalizedGroupId = String(groupId || '').trim()
  if (!normalizedGroupId) {
    return true
  }

  const projectGroupId = String(project?.groupId || project?.planningContext?.groupId || '').trim()
  return !projectGroupId || projectGroupId === normalizedGroupId
}

export function buildForecastBaseName(seed = {}) {
  const snapshot = seed && typeof seed === 'object' ? seed : {}
  const planningContext = snapshot.planningContext || {}
  const groupName = String(snapshot.groupName || planningContext.groupName || '').trim()
  const planningYear = getForecastPlanningYear(snapshot)
  const centerName = String(
    snapshot.centerName ||
      snapshot.sourceCenterSnapshot?.centerName ||
      planningContext.centerName ||
      ''
  ).trim()
  const forecastType = resolveForecastType(snapshot.forecastType, snapshot)
  const sourceKind = resolveForecastSourceKind(snapshot.sourceKind)

  if (sourceKind === FORECAST_SOURCE_IMPORTED_DAILY) {
    if (groupName && planningYear > 0) {
      return `${groupName} ${planningYear} Imported Daily Forecast`
    }

    if (groupName) {
      return `${groupName} Imported Daily Forecast`
    }

    if (centerName && planningYear > 0) {
      return `${centerName} ${planningYear} Imported Daily Forecast`
    }

    if (centerName) {
      return `${centerName} Imported Daily Forecast`
    }
  }

  if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    if (groupName && planningYear > 0) {
      return `${groupName} ${planningYear} Monthly Forecast`
    }

    if (groupName) {
      return `${groupName} Monthly Forecast`
    }

    if (centerName && planningYear > 0) {
      return `${centerName} ${planningYear} Monthly Forecast`
    }

    if (centerName) {
      return `${centerName} Monthly Forecast`
    }
  }

  if (groupName && planningYear > 0) {
    if (forecastType === FORECAST_TYPE_BUDGET) {
      return `${groupName} ${planningYear} Budget Forecast`
    }

    return `${groupName} ${planningYear} Forecast`
  }

  if (groupName) {
    return `${groupName} Forecast`
  }

  if (centerName && planningYear > 0) {
    return `${centerName} ${planningYear} Forecast`
  }

  if (centerName) {
    return `${centerName} Forecast`
  }

  return 'Untitled Forecast'
}

export function createSavedForecastName(projects = [], seed = {}, options = {}) {
  const excludeId = String(options.excludeId || '').trim()
  const suffix = String(options.suffix || '').trim()
  const explicitName = String(seed?.name || '').trim()
  const derivedBaseName = buildForecastBaseName(seed)
  const baseName = derivedBaseName === 'Untitled Forecast' && explicitName
    ? explicitName
    : derivedBaseName
  const preferredName = suffix ? `${baseName} ${suffix}` : baseName
  const usedNames = new Set(
    (Array.isArray(projects) ? projects : [])
      .filter((project) => !excludeId || String(project?.id || '').trim() !== excludeId)
      .map((project) => String(project?.name || '').trim())
      .filter(Boolean)
  )

  if (!usedNames.has(preferredName)) {
    return preferredName
  }

  let index = 2
  let candidate = `${preferredName} ${index}`

  while (usedNames.has(candidate)) {
    index += 1
    candidate = `${preferredName} ${index}`
  }

  return candidate
}

export const createSavedProjectName = (projects = [], seed = {}, options = {}) =>
  createSavedForecastName(projects, seed, options)
