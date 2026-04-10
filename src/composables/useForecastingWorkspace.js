import { computed, ref, watch } from 'vue'

import { guessColumnMapping, normalizeUploadedRows, parseCsvText } from '../forecasting/csv'
import {
  FORECAST_TYPE_REFORECAST,
  FORECAST_HORIZON_PRESETS,
  createEmptyForecastResults,
  createForecastHoliday,
  createForecastSeasonality,
  formatDate,
  formatDateTime,
  formatWhole,
  getDefaultReforecastStartMonthIndex,
  getForecastPlanningYear,
  isPlanAlignedForecast,
  resolveForecastCoverageWindow,
  resolveForecastType
} from '../forecasting/shared'
import {
  buildForecastPayload,
  sanitizeColumnMapping
} from './forecasting/forecastWorkspaceHelpers'
import { useForecastProjectLibrary } from './forecasting/useForecastProjectLibrary'

const extractApiErrorMessage = async (response) => {
  const rawErrorText = await response.text().catch(() => '')

  if (!rawErrorText) {
    return `Forecasting request failed (${response.status}).`
  }

  try {
    const errorPayload = JSON.parse(rawErrorText)
    const detail = errorPayload?.detail

    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const firstDetail = detail[0]
      if (typeof firstDetail === 'string' && firstDetail.trim()) {
        return firstDetail
      }
      if (firstDetail?.msg) {
        return String(firstDetail.msg)
      }
    }
  } catch {
    const flattened = rawErrorText.replace(/\s+/g, ' ').trim()
    if (flattened) {
      return flattened.slice(0, 240)
    }
  }

  return `Forecasting request failed (${response.status}).`
}

const HORIZON_PRESET_VALUES = Object.fromEntries(
  FORECAST_HORIZON_PRESETS.filter((preset) => preset.value != null).map((preset) => [preset.id, preset.value])
)

export const useForecastingWorkspace = (storageScope, options = {}) => {
  const isRunningForecast = ref(false)
  const runError = ref('')
  const activeResultTab = ref('overview')

  const {
    savedProjects,
    currentProject,
    isLoadingProjects,
    loadError,
    saveError,
    saveStatusMessage,
    isDirty,
    loadProjectsForScope,
    createNewProject,
    openProjectById,
    saveCurrentProject,
    duplicateCurrentProject
  } = useForecastProjectLibrary(storageScope, {
    projectSeed: options.projectSeed,
    fallbackScopes: options.fallbackScopes,
    refreshToken: options.refreshToken,
    onProjectReplaced: () => {
      runError.value = ''
      activeResultTab.value = 'overview'
    }
  })

  const applyNormalization = () => {
    const normalized = normalizeUploadedRows({
      rows: currentProject.value.uploadedRows,
      mapping: currentProject.value.columnMapping
    })

    currentProject.value.historyRows = normalized.historyRows
    currentProject.value.normalizationIssues = normalized.issues
  }

  const handleHistoryFileSelect = async (event) => {
    const input = event?.target
    const droppedFiles = event?.dataTransfer?.files
    const file = input?.files?.[0] || droppedFiles?.[0]
    runError.value = ''
    saveError.value = ''
    saveStatusMessage.value = ''

    if (!file) {
      currentProject.value.uploadedFileName = ''
      currentProject.value.uploadedHeaders = []
      currentProject.value.uploadedRows = []
      currentProject.value.parserIssues = []
      currentProject.value.historyRows = []
      currentProject.value.normalizationIssues = []
      currentProject.value.lastRun = createEmptyForecastResults()
      activeResultTab.value = 'overview'
      return
    }

    const text = await file.text()
    const parsed = parseCsvText(text)
    const guessedMapping = guessColumnMapping(parsed.headers)

    currentProject.value.uploadedFileName = file.name || ''
    currentProject.value.uploadedHeaders = parsed.headers
    currentProject.value.uploadedRows = parsed.rows
    currentProject.value.parserIssues = parsed.issues
    currentProject.value.columnMapping = sanitizeColumnMapping(
      parsed.headers,
      currentProject.value.columnMapping,
      guessedMapping
    )
    applyNormalization()
    currentProject.value.lastRun = createEmptyForecastResults()
    activeResultTab.value = 'overview'
  }

  const addCustomSeasonality = () => {
    currentProject.value.modelConfig.customSeasonalities = [
      ...currentProject.value.modelConfig.customSeasonalities,
      createForecastSeasonality({
        mode: currentProject.value.modelConfig.seasonalityMode
      })
    ]
  }

  const removeCustomSeasonality = (seasonalityId) => {
    currentProject.value.modelConfig.customSeasonalities =
      currentProject.value.modelConfig.customSeasonalities.filter((item) => item.id !== seasonalityId)
  }

  const addCustomHoliday = () => {
    currentProject.value.modelConfig.customHolidays = [
      ...currentProject.value.modelConfig.customHolidays,
      createForecastHoliday()
    ]
  }

  const removeCustomHoliday = (holidayId) => {
    currentProject.value.modelConfig.customHolidays =
      currentProject.value.modelConfig.customHolidays.filter((item) => item.id !== holidayId)
  }

  const runForecast = async () => {
    runError.value = ''
    saveStatusMessage.value = ''
    saveError.value = ''

    if (validationMessages.value.length > 0) {
      runError.value = validationMessages.value[0]
      return false
    }

    isRunningForecast.value = true
    try {
      const response = await fetch('/api/forecasting/daily-volume/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildForecastPayload(currentProject.value))
      })

      if (!response.ok) {
        throw new Error(await extractApiErrorMessage(response))
      }

      const forecastResults = await response.json()
      currentProject.value.lastRun = createEmptyForecastResults({
        ...forecastResults,
        runAt: forecastResults.runAt || new Date().toISOString()
      })
      currentProject.value.planningYear = forecastResults.summary?.planningYear || currentProject.value.planningYear
      currentProject.value.forecastType = forecastResults.summary?.forecastType || currentProject.value.forecastType
      currentProject.value.coverageStartMonthIndex =
        forecastResults.summary?.coverageStartMonthIndex ?? currentProject.value.coverageStartMonthIndex
      currentProject.value.coverageStartDate =
        forecastResults.summary?.coverageStartDate || currentProject.value.coverageStartDate
      currentProject.value.coverageEndDate =
        forecastResults.summary?.coverageEndDate || currentProject.value.coverageEndDate
      currentProject.value.planningReady = Boolean(forecastResults.summary?.planningReady)
      activeResultTab.value = 'overview'
      isDirty.value = true
      return true
    } catch (error) {
      if (error instanceof TypeError && /fetch/i.test(error.message || '')) {
        runError.value = 'Unable to reach the forecasting API. If you are running locally, make sure the backend is running on 127.0.0.1:8000.'
        return false
      }

      runError.value = error instanceof Error ? error.message : 'Unable to run forecast.'
      return false
    } finally {
      isRunningForecast.value = false
    }
  }

  const lastRunAvailable = computed(() => Boolean(currentProject.value.lastRun?.runAt))

  const historySummary = computed(() => {
    const historyRows = Array.isArray(currentProject.value.historyRows) ? currentProject.value.historyRows : []
    const firstRow = historyRows[0]
    const lastRow = historyRows[historyRows.length - 1]

    return {
      observationCount: historyRows.length,
      dateRangeLabel: historyRows.length ? `${formatDate(firstRow.ds)} to ${formatDate(lastRow.ds)}` : 'No history loaded',
      historyStartDate: firstRow?.ds || '',
      historyEndDate: lastRow?.ds || ''
    }
  })

  const projectSummaries = computed(() =>
    savedProjects.value.map((project) => {
      const historyRows = Array.isArray(project.historyRows) ? project.historyRows : []

      return {
        id: project.id,
        name: project.name,
        seriesLabel: project.seriesLabel,
        observationCount: historyRows.length,
        dateRangeLabel: historyRows.length
          ? `${formatDate(historyRows[0].ds)} to ${formatDate(historyRows[historyRows.length - 1].ds)}`
          : 'No history loaded',
        updatedAtLabel: formatDateTime(project.updatedAt),
        runAtLabel: project.lastRun?.runAt ? formatDateTime(project.lastRun.runAt) : 'Not run yet'
      }
    })
  )

  const validationMessages = computed(() => {
    const messages = [
      ...currentProject.value.parserIssues,
      ...currentProject.value.normalizationIssues
    ]

    if (!currentProject.value.uploadedRows.length) {
      messages.push('Upload a CSV with daily history before running a forecast.')
    }

    if (currentProject.value.historyRows.length > 0 && currentProject.value.historyRows.length < 14) {
      messages.push('Use at least 14 days of history before running a forecast.')
    }

    if (isPlanAlignedForecast(currentProject.value) && !getForecastPlanningYear(currentProject.value)) {
      messages.push('Select a planning year before running a staffing-group forecast.')
    }

    const holdoutDays = Math.max(0, Number(currentProject.value.modelConfig.holdoutDays) || 0)
    if (
      holdoutDays > 0 &&
      currentProject.value.historyRows.length > 0 &&
      currentProject.value.historyRows.length < holdoutDays + 14
    ) {
      messages.push('Use fewer test-set days so at least 14 training days remain.')
    }

    if (currentProject.value.modelConfig.growth === 'logistic') {
      const defaultCap = Number(currentProject.value.modelConfig.defaultCap)
      const defaultFloor = Number(currentProject.value.modelConfig.defaultFloor || 0)

      if (!Number.isFinite(defaultCap) || defaultCap <= 0) {
        messages.push('Enter a positive upper limit before using growth with ceiling.')
      }

      if (Number.isFinite(defaultCap) && defaultCap <= defaultFloor) {
        messages.push('Upper limit must be greater than lower limit when using growth with ceiling.')
      }
    }

    return [...new Set(messages)]
  })

  const currentProjectMeta = computed(() => ({
    name: currentProject.value.name,
    seriesLabel: currentProject.value.seriesLabel,
    uploadedFileName: currentProject.value.uploadedFileName,
    observationCountLabel: formatWhole(historySummary.value.observationCount),
    historyRangeLabel: historySummary.value.dateRangeLabel,
    lastSavedAtLabel: currentProject.value.updatedAt ? formatDateTime(currentProject.value.updatedAt) : 'Not saved yet'
  }))

  watch(
    () => [currentProject.value.uploadedRows, currentProject.value.columnMapping],
    () => {
      applyNormalization()
    },
    { deep: true, immediate: true }
  )

  watch(
    () => [
      currentProject.value.planningYear,
      currentProject.value.forecastType,
      currentProject.value.coverageStartMonthIndex,
      currentProject.value.planningContext?.groupId
    ],
    () => {
      if (!isPlanAlignedForecast(currentProject.value)) {
        return
      }

      const resolvedPlanningYear = getForecastPlanningYear(currentProject.value)
      const resolvedForecastType = resolveForecastType(currentProject.value.forecastType, currentProject.value)

      if (currentProject.value.forecastType !== resolvedForecastType) {
        currentProject.value.forecastType = resolvedForecastType
        return
      }

      if (
        resolvedForecastType === FORECAST_TYPE_REFORECAST &&
        (currentProject.value.coverageStartMonthIndex == null || currentProject.value.coverageStartMonthIndex === '')
      ) {
        currentProject.value.coverageStartMonthIndex = getDefaultReforecastStartMonthIndex(resolvedPlanningYear)
      }

      const coverageWindow = resolveForecastCoverageWindow({
        planningYear: resolvedPlanningYear,
        forecastType: resolvedForecastType,
        coverageStartMonthIndex: currentProject.value.coverageStartMonthIndex
      })

      if (currentProject.value.coverageStartMonthIndex !== coverageWindow.coverageStartMonthIndex) {
        currentProject.value.coverageStartMonthIndex = coverageWindow.coverageStartMonthIndex
        return
      }

      if (currentProject.value.coverageStartDate !== coverageWindow.coverageStartDate) {
        currentProject.value.coverageStartDate = coverageWindow.coverageStartDate
      }

      if (currentProject.value.coverageEndDate !== coverageWindow.coverageEndDate) {
        currentProject.value.coverageEndDate = coverageWindow.coverageEndDate
      }
    },
    { immediate: true }
  )

  watch(
    () => currentProject.value.forecastHorizonPreset,
    (presetId) => {
      if (isPlanAlignedForecast(currentProject.value)) {
        return
      }

      const nextValue = HORIZON_PRESET_VALUES[presetId]
      if (nextValue && Number(currentProject.value.forecastHorizonDays) !== Number(nextValue)) {
        currentProject.value.forecastHorizonDays = nextValue
      }
    },
    { immediate: true }
  )

  watch(
    () => currentProject.value.forecastHorizonDays,
    (days) => {
      if (isPlanAlignedForecast(currentProject.value)) {
        return
      }

      const matchingPreset = Object.entries(HORIZON_PRESET_VALUES)
        .find(([, value]) => Number(value) === Number(days))
      const nextPresetId = matchingPreset?.[0] || 'custom'

      if (currentProject.value.forecastHorizonPreset !== nextPresetId) {
        currentProject.value.forecastHorizonPreset = nextPresetId
      }
    }
  )

  return {
    savedProjects,
    currentProject,
    isLoadingProjects,
    isRunningForecast,
    loadError,
    runError,
    saveError,
    saveStatusMessage,
    activeResultTab,
    isDirty,
    lastRunAvailable,
    historySummary,
    projectSummaries,
    validationMessages,
    currentProjectMeta,
    loadProjectsForScope,
    handleHistoryFileSelect,
    createNewProject,
    openProjectById,
    saveCurrentProject,
    duplicateCurrentProject,
    addCustomSeasonality,
    removeCustomSeasonality,
    addCustomHoliday,
    removeCustomHoliday,
    runForecast
  }
}
