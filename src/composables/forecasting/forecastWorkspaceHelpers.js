import { isRef } from 'vue'

import {
  clonePlain,
  createEmptyForecastResults,
  createForecastEntityId,
  createForecastProject,
  FORECAST_MONTHLY_SEASONALITY_DEFAULTS,
  createSavedForecastName,
  FORECAST_WEEKLY_SEASONALITY_DEFAULTS,
  FORECAST_YEARLY_SEASONALITY_DEFAULTS,
  getForecastPlanningYear,
  isPlanAlignedForecast,
  resolveForecastCoverageWindow,
  resolveForecastType
} from '../../forecasting/shared'
import { buildHolidayEntriesForYear } from '../../planner/holidayCalendars'

export const resolveMaybeRef = (value) => {
  if (isRef(value)) {
    return value.value
  }

  return value
}

export const mergeProjectSeed = (seed = {}, project = {}) => {
  const seedSnapshot = clonePlain(seed || {})
  const projectSnapshot = clonePlain(project || {})
  const seedModelConfig = seedSnapshot.modelConfig || {}
  const projectModelConfig = projectSnapshot.modelConfig || {}
  const centerManagedHolidays = Boolean(seedSnapshot.centerManagedHolidays || projectSnapshot.centerManagedHolidays)

  const mergedModelConfig = {
    ...seedModelConfig,
    ...projectModelConfig,
    customSeasonalities: Array.isArray(projectModelConfig.customSeasonalities)
      ? projectModelConfig.customSeasonalities
      : Array.isArray(seedModelConfig.customSeasonalities)
        ? seedModelConfig.customSeasonalities
        : [],
    customHolidays: Array.isArray(projectModelConfig.customHolidays)
      ? projectModelConfig.customHolidays
      : Array.isArray(seedModelConfig.customHolidays)
        ? seedModelConfig.customHolidays
        : []
  }

  if (centerManagedHolidays) {
    mergedModelConfig.builtInHolidayCountry = seedModelConfig.builtInHolidayCountry || ''
    mergedModelConfig.customHolidays = Array.isArray(seedModelConfig.customHolidays)
      ? seedModelConfig.customHolidays
      : []
  }

  return {
    ...seedSnapshot,
    ...projectSnapshot,
    centerManagedHolidays,
    sourceCenterSnapshot: projectSnapshot.sourceCenterSnapshot || seedSnapshot.sourceCenterSnapshot || undefined,
    sourceCenterHolidayProfiles: centerManagedHolidays
      ? Array.isArray(seedSnapshot.sourceCenterHolidayProfiles)
        ? seedSnapshot.sourceCenterHolidayProfiles
        : []
      : Array.isArray(projectSnapshot.sourceCenterHolidayProfiles)
        ? projectSnapshot.sourceCenterHolidayProfiles
        : Array.isArray(seedSnapshot.sourceCenterHolidayProfiles)
          ? seedSnapshot.sourceCenterHolidayProfiles
          : [],
    planningContext: {
      ...(seedSnapshot.planningContext || {}),
      ...(projectSnapshot.planningContext || {})
    },
    modelConfig: mergedModelConfig
  }
}

export const normalizeProjectForEditor = (projects = [], overrides = {}) => {
  const snapshot = clonePlain(overrides || {})

  return createForecastProject({
    ...snapshot,
    id: snapshot.id || createForecastEntityId('forecast-project'),
    name: createSavedForecastName(projects, snapshot, {
      excludeId: snapshot.id || '',
      suffix: snapshot.name && /\bcopy\b/i.test(snapshot.name) ? 'Copy' : ''
    }),
    lastRun: snapshot.lastRun?.runAt
      ? createEmptyForecastResults(snapshot.lastRun)
      : createEmptyForecastResults()
  })
}

export const sanitizeColumnMapping = (headers = [], mapping = {}, guessed = {}) => {
  const availableHeaders = new Set(headers)

  return {
    dateColumn: availableHeaders.has(mapping.dateColumn) ? mapping.dateColumn : guessed.dateColumn || '',
    volumeColumn: availableHeaders.has(mapping.volumeColumn) ? mapping.volumeColumn : guessed.volumeColumn || '',
    capColumn: availableHeaders.has(mapping.capColumn) ? mapping.capColumn : guessed.capColumn || '',
    floorColumn: availableHeaders.has(mapping.floorColumn) ? mapping.floorColumn : guessed.floorColumn || ''
  }
}

const DAY_IN_MS = 1000 * 60 * 60 * 24
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const parseDateInputValue = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12)
  }

  if (typeof value === 'string') {
    const match = value.match(DATE_INPUT_PATTERN)
    if (match) {
      const [, yearText, monthText, dayText] = match
      const year = Number(yearText)
      const monthIndex = Number(monthText) - 1
      const day = Number(dayText)
      const normalized = new Date(year, monthIndex, day, 12)

      return normalized.getFullYear() === year &&
        normalized.getMonth() === monthIndex &&
        normalized.getDate() === day
        ? normalized
        : null
    }
  }

  const normalized = new Date(value)
  return Number.isNaN(normalized.getTime()) ? null : normalized
}

const formatDateInputValue = (date) => {
  if (typeof date === 'string' && DATE_INPUT_PATTERN.test(date)) {
    return date
  }

  const normalized = parseDateInputValue(date)
  if (!normalized) {
    return ''
  }

  const year = normalized.getFullYear()
  const month = String(normalized.getMonth() + 1).padStart(2, '0')
  const day = String(normalized.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const resolveCustomHolidayYears = ({ project, coverageWindow, adHocForecastHorizonDays }) => {
  const historyDates = (Array.isArray(project.historyRows) ? project.historyRows : [])
    .map((row) => parseDateInputValue(row?.ds || ''))
    .filter(Boolean)

  if (!historyDates.length) {
    return []
  }

  const historyTimes = historyDates.map((date) => date.getTime())
  const historyStartDate = new Date(Math.min(...historyTimes))
  const historyEndDate = new Date(Math.max(...historyTimes))
  const coverageEndDate = parseDateInputValue(coverageWindow.coverageEndDate)
  const finalDate = coverageEndDate || new Date(historyEndDate.getTime() + (adHocForecastHorizonDays * DAY_IN_MS))
  const startYear = Math.min(historyStartDate.getFullYear(), finalDate.getFullYear())
  const endYear = Math.max(historyEndDate.getFullYear(), finalDate.getFullYear())

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
}

const formatHolidayPayloadEntry = (entry, project, item = {}) => ({
  name: entry.label || item.name?.trim() || '',
  date: formatDateInputValue(entry.date),
  lowerWindow: Number(item.lowerWindow) || 0,
  upperWindow: Number(item.upperWindow) || 0,
  priorScale: Number(item.priorScale) || Number(project.modelConfig.holidaysPriorScale) || 10
})

const expandCenterManagedHolidayProfilesForPayload = ({ project, targetYears }) => {
  const targetYearSet = new Set(targetYears)
  const sourceCenterHolidayProfiles = Array.isArray(project.sourceCenterHolidayProfiles)
    ? project.sourceCenterHolidayProfiles
    : []

  return sourceCenterHolidayProfiles.flatMap((profile) => {
    const profileYear = Number(profile?.year || 0)
    if (!targetYearSet.has(profileYear)) {
      return []
    }

    const profileHolidays = Array.isArray(profile?.customHolidays)
      ? profile.customHolidays.map((holiday) => ({
          id: holiday.id,
          label: typeof holiday.label === 'string' ? holiday.label.trim() : '',
          date: holiday.date || '',
          sourceRuleId: holiday.sourceRuleId || null,
          month: holiday.month,
          day: holiday.day
        }))
      : []

    return buildHolidayEntriesForYear({
      year: profileYear,
      customHolidays: profileHolidays
    }).map((entry) =>
      formatHolidayPayloadEntry(entry, project)
    )
  })
}

const expandCustomHolidaysForPayload = ({ project, coverageWindow, adHocForecastHorizonDays }) => {
  const baseHolidays = Array.isArray(project.modelConfig?.customHolidays)
    ? project.modelConfig.customHolidays
    : []
  const targetYears = resolveCustomHolidayYears({ project, coverageWindow, adHocForecastHorizonDays })
  const seenKeys = new Set()
  const profileHolidayEntries = project.centerManagedHolidays
    ? expandCenterManagedHolidayProfilesForPayload({
        project,
        targetYears
      })
    : []

  const baseHolidayEntries = baseHolidays
    .filter((item) => item?.name?.trim())
    .flatMap((item) => {
      const forecastHoliday = {
        id: item.id,
        label: item.name.trim(),
        date: item.date || '',
        sourceRuleId: item.sourceRuleId || null,
        month: item.month,
        day: item.day
      }

      const generatedEntries = targetYears.length
        ? targetYears.flatMap((year) =>
            buildHolidayEntriesForYear({
              year,
              customHolidays: [forecastHoliday]
            })
          )
        : []

      if (!generatedEntries.length && item.date) {
        const explicitDate = parseDateInputValue(item.date)
        if (explicitDate) {
          generatedEntries.push({
            label: item.name.trim(),
            date: explicitDate
          })
        }
      }

      return generatedEntries.map((entry) => formatHolidayPayloadEntry(entry, project, item))
    })

  return [...profileHolidayEntries, ...baseHolidayEntries]
    .filter((entry) => entry.name && entry.date)
    .filter((entry) => {
      const key = `${entry.name}::${entry.date}`
      if (seenKeys.has(key)) {
        return false
      }

      seenKeys.add(key)
      return true
    })
}

export const buildForecastPayload = (project) => {
  const trimmedManualChangepoints = String(project.modelConfig.manualChangepoints || '')
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)

  const planningYear = getForecastPlanningYear(project)
  const forecastType = resolveForecastType(project.forecastType, project)
  const coverageWindow = resolveForecastCoverageWindow({
    planningYear,
    forecastType,
    coverageStartMonthIndex: project.coverageStartMonthIndex
  })
  const adHocForecastHorizonDays = Math.max(1, Number(project.forecastHorizonDays) || 365)
  const historyEndTime = parseDateInputValue(project.historyRows.at(-1)?.ds || '')?.getTime() ?? Number.NaN
  const coverageEndTime = parseDateInputValue(coverageWindow.coverageEndDate || '')?.getTime() ?? Number.NaN
  const alignedForecastHorizonDays = Number.isFinite(historyEndTime) && Number.isFinite(coverageEndTime)
    ? Math.max(0, Math.ceil((coverageEndTime - historyEndTime) / (1000 * 60 * 60 * 24)))
    : adHocForecastHorizonDays

  return {
    timezone: project.timezone,
    forecastHorizonDays: isPlanAlignedForecast(project)
      ? alignedForecastHorizonDays
      : adHocForecastHorizonDays,
    planningYear,
    forecastType,
    coverageStartDate: coverageWindow.coverageStartDate,
    coverageEndDate: coverageWindow.coverageEndDate,
    history: project.historyRows.map((row) => ({
      ds: row.ds,
      y: row.y,
      cap: row.cap,
      floor: row.floor
    })),
    modelConfig: {
      growth: project.modelConfig.growth,
      defaultCap: project.modelConfig.defaultCap,
      defaultFloor: project.modelConfig.defaultFloor,
      changepointPriorScale: project.modelConfig.changepointPriorScale,
      changepointRange: project.modelConfig.changepointRange,
      changepointCount: project.modelConfig.changepointCount,
      manualChangepoints: trimmedManualChangepoints,
      seasonalityMode: project.modelConfig.seasonalityMode,
      weeklySeasonality: {
        enabled: Boolean(project.modelConfig.weeklySeasonalityEnabled),
        fourierOrder: FORECAST_WEEKLY_SEASONALITY_DEFAULTS.fourierOrder,
        priorScale: FORECAST_WEEKLY_SEASONALITY_DEFAULTS.priorScale
      },
      yearlySeasonality: {
        enabled: Boolean(project.modelConfig.yearlySeasonalityEnabled),
        fourierOrder: FORECAST_YEARLY_SEASONALITY_DEFAULTS.fourierOrder,
        priorScale: FORECAST_YEARLY_SEASONALITY_DEFAULTS.priorScale
      },
      monthlySeasonality: {
        enabled: Boolean(project.modelConfig.monthlySeasonalityEnabled),
        periodDays: FORECAST_MONTHLY_SEASONALITY_DEFAULTS.periodDays,
        fourierOrder: FORECAST_MONTHLY_SEASONALITY_DEFAULTS.fourierOrder,
        priorScale: FORECAST_MONTHLY_SEASONALITY_DEFAULTS.priorScale
      },
      builtInHolidayCountry: project.modelConfig.builtInHolidayCountry || '',
      holidaysPriorScale: Number(project.modelConfig.holidaysPriorScale) || 10,
      customSeasonalities: project.modelConfig.customSeasonalities
        .filter((item) => item.name?.trim())
        .map((item) => ({
          name: item.name.trim(),
          periodDays: Number(item.periodDays) || 30.5,
          fourierOrder: Number(item.fourierOrder) || 5,
          priorScale: Number(item.priorScale) || 10,
          mode: item.mode || project.modelConfig.seasonalityMode
        })),
      customHolidays: expandCustomHolidaysForPayload({
        project,
        coverageWindow,
        adHocForecastHorizonDays
      }),
      intervalWidth: Number(project.modelConfig.intervalWidth) || 0.8,
      mcmcSamples: Math.max(0, Number(project.modelConfig.mcmcSamples) || 0),
      holdoutDays: Math.max(0, Number(project.modelConfig.holdoutDays) || 0)
    }
  }
}

export const buildForecastRunInputSignature = (project) =>
  JSON.stringify(buildForecastPayload(project))
