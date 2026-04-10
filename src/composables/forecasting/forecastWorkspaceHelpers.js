import { isRef } from 'vue'

import {
  clonePlain,
  createEmptyForecastResults,
  createForecastEntityId,
  createForecastProject,
  createSavedForecastName,
  getForecastPlanningYear,
  isPlanAlignedForecast,
  resolveForecastCoverageWindow,
  resolveForecastType
} from '../../forecasting/shared'

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
  const historyEndTime = new Date(project.historyRows.at(-1)?.ds || '').getTime()
  const coverageEndTime = new Date(coverageWindow.coverageEndDate || '').getTime()
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
    dataPreparation: {
      ...project.dataPreparation
    },
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
        fourierOrder: Number(project.modelConfig.weeklyFourierOrder) || 3,
        priorScale: Number(project.modelConfig.weeklyPriorScale) || 10
      },
      yearlySeasonality: {
        enabled: Boolean(project.modelConfig.yearlySeasonalityEnabled),
        fourierOrder: Number(project.modelConfig.yearlyFourierOrder) || 10,
        priorScale: Number(project.modelConfig.yearlyPriorScale) || 10
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
      customHolidays: project.modelConfig.customHolidays
        .filter((item) => item.name?.trim() && item.date)
        .map((item) => ({
          name: item.name.trim(),
          date: item.date,
          lowerWindow: Number(item.lowerWindow) || 0,
          upperWindow: Number(item.upperWindow) || 0,
          priorScale: Number(item.priorScale) || Number(project.modelConfig.holidaysPriorScale) || 10
        })),
      intervalWidth: Number(project.modelConfig.intervalWidth) || 0.8,
      mcmcSamples: Math.max(0, Number(project.modelConfig.mcmcSamples) || 0),
      holdoutDays: Math.max(0, Number(project.modelConfig.holdoutDays) || 0),
      runNotes: String(project.modelConfig.runNotes || '')
    }
  }
}
