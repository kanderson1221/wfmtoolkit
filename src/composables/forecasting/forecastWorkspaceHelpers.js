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
  getForecastTrainingHistoryRows,
  getForecastPlanningYear,
  isPlanAlignedForecast,
  resolveForecastCoverageWindow,
  resolveForecastType
} from '../../forecasting/shared'
import {
  formatDateInputValue,
  parseDateInputValue
} from '../../forecasting/forecastDateInputs'
import { GROUP_HOLIDAY_CALENDAR_INHERIT } from '../../planner/holidayCalendars'
import { createPlanningGroupOpenDayChecker } from '../../planner/groupOpenDays'
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
    volumeColumn: availableHeaders.has(mapping.volumeColumn) ? mapping.volumeColumn : guessed.volumeColumn || ''
  }
}

const DAY_IN_MS = 1000 * 60 * 60 * 24
const resolveCustomHolidayYears = ({ project, coverageWindow, adHocForecastHorizonDays }) => {
  const historyDates = getForecastTrainingHistoryRows(project)
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
  const sourceCenterHolidayProfiles = Array.isArray(project.sourceCenterHolidayProfiles)
    ? project.sourceCenterHolidayProfiles
    : []
  const normalizedProfiles = sourceCenterHolidayProfiles.map((profile) => ({
    year: Number(profile?.year || 0),
    customHolidays: Array.isArray(profile?.customHolidays)
      ? profile.customHolidays.map((holiday) => ({
          id: holiday.id,
          label: typeof holiday.label === 'string' ? holiday.label.trim() : '',
          date: holiday.date || '',
          sourceRuleId: holiday.sourceRuleId || null,
          month: holiday.month,
          day: holiday.day
        }))
      : []
  }))
  const fallbackTemplateHolidays = normalizedProfiles
    .flatMap((profile) => profile.customHolidays)
    .filter((holiday, index, collection) =>
      collection.findIndex((candidate) => (
        (candidate.sourceRuleId || candidate.id || '') === (holiday.sourceRuleId || holiday.id || '') &&
        (candidate.label || '') === (holiday.label || '') &&
        (candidate.date || '') === (holiday.date || '') &&
        Number(candidate.month || 0) === Number(holiday.month || 0) &&
        Number(candidate.day || 0) === Number(holiday.day || 0)
      )) === index
    )

  return targetYears.flatMap((targetYear) => {
    const matchingProfile = normalizedProfiles.find((profile) => profile.year === targetYear)
    const customHolidays = matchingProfile?.customHolidays?.length
      ? matchingProfile.customHolidays
      : fallbackTemplateHolidays

    return buildHolidayEntriesForYear({
      year: targetYear,
      customHolidays
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

const filterTrainingHistoryRowsToOpenDays = (project, historyRows = []) => {
  const operatingWeekdays = Array.isArray(project?.sourceCenterSnapshot?.operatingWeekdays)
    ? project.sourceCenterSnapshot.operatingWeekdays
    : []

  if (!operatingWeekdays.length) {
    return historyRows
  }

  const isOpenDay = createPlanningGroupOpenDayChecker(
    {
      operatingWeekdays,
      holidayCalendarId: GROUP_HOLIDAY_CALENDAR_INHERIT
    },
    {
      operatingWeekdays,
      holidayProfiles: Array.isArray(project?.sourceCenterHolidayProfiles)
        ? project.sourceCenterHolidayProfiles
        : []
    }
  )

  return historyRows.filter((row) => isOpenDay(row?.ds || ''))
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
  const trainingHistoryRows = filterTrainingHistoryRowsToOpenDays(
    project,
    getForecastTrainingHistoryRows(project)
  )
  const historyEndTime = parseDateInputValue(trainingHistoryRows.at(-1)?.ds || '')?.getTime() ?? Number.NaN
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
    history: trainingHistoryRows.map((row) => ({
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
