import { computed, ref, watch } from 'vue'

import {
  canForecastProjectRun,
  FORECAST_HORIZON_PRESETS,
  createEmptyForecastResults,
  createForecastHoliday,
  createForecastSeasonality,
  formatDate,
  formatDateTime,
  formatWhole,
  getForecastTrainingHistoryRows,
  getForecastTrainingWindow,
  getForecastProjectResultTabs,
  getForecastProjectSourceKind,
  getForecastProjectMonthlyRollup,
  getForecastSourceKindLabel,
  getForecastPlanningYear,
  getForecastTypeLabel,
  isPlanAlignedForecast,
  parseForecastDateValue,
  resolveForecastCoverageWindow,
  resolveForecastType
} from '../forecasting/shared'
import {
  buildForecastRunInputSignature,
  buildForecastPayload
} from './forecasting/forecastWorkspaceHelpers'
import { useForecastProjectLibrary } from './forecasting/useForecastProjectLibrary'
import {
  applyForecastHistoryState,
  buildForecastHistoryStateFromFile
} from '../forecasting/historyImport'

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
const DAY_IN_MS = 1000 * 60 * 60 * 24
const MAX_SUPPORTED_FORECAST_HORIZON_DAYS = 730

const buildProjectSummarySnapshot = (project = {}) => {
  const sourceKind = getForecastProjectSourceKind(project)
  const dailyForecast = Array.isArray(project?.lastRun?.dailyForecast) ? project.lastRun.dailyForecast : []
  const monthlyRollup = getForecastProjectMonthlyRollup(project)
  const historyRows = Array.isArray(project?.historyRows) ? project.historyRows : []
  const firstHistoryRow = historyRows[0]
  const lastHistoryRow = historyRows[historyRows.length - 1]
  const firstDailyRow = dailyForecast[0]
  const lastDailyRow = dailyForecast[dailyForecast.length - 1]

  if (sourceKind === 'imported_daily') {
    return {
      observationCountLabel: `${formatWhole(dailyForecast.length)} daily rows`,
      dateRangeLabel: dailyForecast.length
        ? `${formatDate(firstDailyRow?.ds)} to ${formatDate(lastDailyRow?.ds)}`
        : 'No forecast imported',
      descriptionLabel: 'Imported daily forecast'
    }
  }

  if (sourceKind === 'manual_monthly') {
    return {
      observationCountLabel: `${formatWhole(monthlyRollup.length)} monthly values`,
      dateRangeLabel: monthlyRollup.length
        ? `${monthlyRollup[0]?.monthLabel || ''} to ${monthlyRollup.at(-1)?.monthLabel || ''}`
        : 'No monthly forecast entered',
      descriptionLabel: 'Monthly forecast'
    }
  }

  return {
    observationCountLabel: `${formatWhole(historyRows.length)} observations`,
    dateRangeLabel: historyRows.length
      ? `${formatDate(firstHistoryRow?.ds)} to ${formatDate(lastHistoryRow?.ds)}`
      : 'No history loaded',
    descriptionLabel: 'Modeled forecast'
  }
}

const getPlanAlignedHorizonValidationMessage = (project) => {
  const trainingHistoryRows = getForecastTrainingHistoryRows(project)

  if (!isPlanAlignedForecast(project) || !trainingHistoryRows.length) {
    return ''
  }

  const planningYear = getForecastPlanningYear(project)
  const forecastType = resolveForecastType(project.forecastType, project)
  const coverageWindow = resolveForecastCoverageWindow({
    planningYear,
    forecastType,
    coverageStartMonthIndex: project.coverageStartMonthIndex
  })

  const historyEndDate = parseForecastDateValue(trainingHistoryRows.at(-1)?.ds || '')
  const coverageEndDate = parseForecastDateValue(coverageWindow.coverageEndDate || '')

  if (!historyEndDate || !coverageEndDate) {
    return ''
  }

  const requiredHorizonDays = Math.max(
    0,
    Math.ceil((coverageEndDate.getTime() - historyEndDate.getTime()) / DAY_IN_MS)
  )

  if (requiredHorizonDays <= MAX_SUPPORTED_FORECAST_HORIZON_DAYS) {
    return ''
  }

  const forecastTypeLabel = getForecastTypeLabel(forecastType).toLowerCase()

  return `Loaded history ends ${formatDate(historyEndDate)}. A ${planningYear} ${forecastTypeLabel} would require ${formatWhole(requiredHorizonDays)} forecast days to reach ${formatDate(coverageEndDate)}, but the maximum supported horizon is ${formatWhole(MAX_SUPPORTED_FORECAST_HORIZON_DAYS)} days. Load more recent history or choose an earlier forecast year.`
}

export const useForecastingWorkspace = (storageScope, options = {}) => {
  const isRunningForecast = ref(false)
  const runError = ref('')
  const activeResultTab = ref('daily')

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
      activeResultTab.value = 'daily'
    }
  })

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
      activeResultTab.value = 'daily'
      return
    }

    const historyState = await buildForecastHistoryStateFromFile(
      file,
      currentProject.value.columnMapping
    )

    applyForecastHistoryState(currentProject.value, historyState)
    currentProject.value.lastRun = createEmptyForecastResults()
    activeResultTab.value = 'daily'
  }

  const applyHistoryImport = (historyState = {}) => {
    runError.value = ''
    saveError.value = ''
    saveStatusMessage.value = ''

    applyForecastHistoryState(currentProject.value, historyState)
    activeResultTab.value = 'daily'
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

    if (!canForecastProjectRun(currentProject.value)) {
      runError.value = 'Only modeled forecasts can be rerun.'
      return false
    }

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
      const normalizedResults = createEmptyForecastResults({
        ...forecastResults,
        runAt: forecastResults.runAt || new Date().toISOString(),
        inputSignature: buildForecastRunInputSignature(currentProject.value)
      })
      currentProject.value.lastRun = normalizedResults
      currentProject.value.planningYear = forecastResults.summary?.planningYear || currentProject.value.planningYear
      currentProject.value.forecastType = forecastResults.summary?.forecastType || currentProject.value.forecastType
      currentProject.value.coverageStartMonthIndex =
        forecastResults.summary?.coverageStartMonthIndex ?? currentProject.value.coverageStartMonthIndex
      currentProject.value.coverageStartDate =
        forecastResults.summary?.coverageStartDate || currentProject.value.coverageStartDate
      currentProject.value.coverageEndDate =
        forecastResults.summary?.coverageEndDate || currentProject.value.coverageEndDate
      currentProject.value.planningReady = Boolean(forecastResults.summary?.planningReady)
      activeResultTab.value = 'daily'
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
    const summary = buildProjectSummarySnapshot(currentProject.value)

    return {
      observationCount: summary.observationCountLabel,
      dateRangeLabel: summary.dateRangeLabel,
      descriptionLabel: summary.descriptionLabel
    }
  })

  const projectSummaries = computed(() =>
    savedProjects.value.map((project) => {
      const summary = buildProjectSummarySnapshot(project)

      return {
        id: project.id,
        name: project.name,
        sourceKind: getForecastProjectSourceKind(project),
        sourceKindLabel: getForecastSourceKindLabel(project.sourceKind),
        seriesLabel: project.seriesLabel,
        observationCountLabel: summary.observationCountLabel,
        dateRangeLabel: summary.dateRangeLabel,
        summaryLine: `${getForecastSourceKindLabel(project.sourceKind)} • ${summary.observationCountLabel}`,
        updatedAtLabel: formatDateTime(project.updatedAt),
        runAtLabel: project.lastRun?.runAt ? formatDateTime(project.lastRun.runAt) : 'Not run yet'
      }
    })
  )

  const validationMessages = computed(() => {
    if (!canForecastProjectRun(currentProject.value)) {
      return []
    }

    const messages = [
      ...currentProject.value.parserIssues,
      ...currentProject.value.normalizationIssues
    ]

    const trainingWindow = getForecastTrainingWindow(currentProject.value)
    const trainingHistoryRows = getForecastTrainingHistoryRows(currentProject.value)
    const trainingRowCount = trainingHistoryRows.length

    if (!currentProject.value.historyRows.length) {
      messages.push('Upload a CSV with daily history before running a forecast.')
    }

    if (currentProject.value.historyRows.length > 0 && !trainingWindow.windowIsValid) {
      messages.push('Choose a training start date that is on or before the training end date.')
    }

    if (trainingRowCount > 0 && trainingRowCount < 14) {
      messages.push('Use at least 14 days inside the training window before running a forecast.')
    }

    if (isPlanAlignedForecast(currentProject.value) && !getForecastPlanningYear(currentProject.value)) {
      messages.push('Select a planning year before running a staffing-group forecast.')
    }

    const planAlignedHorizonMessage = getPlanAlignedHorizonValidationMessage(currentProject.value)
    if (planAlignedHorizonMessage) {
      messages.push(planAlignedHorizonMessage)
    }

    const holdoutDays = Math.max(0, Number(currentProject.value.modelConfig.holdoutDays) || 0)
    if (
      holdoutDays > 0 &&
      trainingRowCount > 0 &&
      trainingRowCount < holdoutDays + 14
    ) {
      messages.push('Use fewer test-set days so at least 14 training days remain.')
    }

    if (currentProject.value.modelConfig.growth === 'logistic') {
      const defaultCap = Number(currentProject.value.modelConfig.defaultCap)
      const defaultFloor = Number(currentProject.value.modelConfig.defaultFloor || 0)

      if (!Number.isFinite(defaultCap) || defaultCap <= 0) {
        messages.push('Enter a positive upper forecast limit before using logistic growth.')
      }

      if (Number.isFinite(defaultCap) && defaultCap <= defaultFloor) {
        messages.push('Upper forecast limit must be greater than lower forecast limit when using logistic growth.')
      }
    }

    return [...new Set(messages)]
  })

  const currentProjectMeta = computed(() => ({
    name: currentProject.value.name,
    sourceKind: getForecastProjectSourceKind(currentProject.value),
    sourceKindLabel: getForecastSourceKindLabel(currentProject.value.sourceKind),
    seriesLabel: currentProject.value.seriesLabel,
    uploadedFileName: currentProject.value.uploadedFileName,
    observationCountLabel: historySummary.value.observationCount,
    historyRangeLabel: historySummary.value.dateRangeLabel,
    lastSavedAtLabel: currentProject.value.updatedAt ? formatDateTime(currentProject.value.updatedAt) : 'Not saved yet'
  }))

  watch(
    () => currentProject.value.historyRows.map((row) => row?.ds || ''),
    () => {
      const trainingWindow = getForecastTrainingWindow(currentProject.value)

      if (!trainingWindow.availableRowCount) {
        if (currentProject.value.modelConfig.trainingStartDate || currentProject.value.modelConfig.trainingEndDate) {
          currentProject.value.modelConfig.trainingStartDate = ''
          currentProject.value.modelConfig.trainingEndDate = ''
        }
        return
      }

      if (currentProject.value.modelConfig.trainingStartDate !== trainingWindow.trainingStartDate) {
        currentProject.value.modelConfig.trainingStartDate = trainingWindow.trainingStartDate
      }

      if (currentProject.value.modelConfig.trainingEndDate !== trainingWindow.trainingEndDate) {
        currentProject.value.modelConfig.trainingEndDate = trainingWindow.trainingEndDate
      }
    },
    { immediate: true }
  )

  watch(
    () => [currentProject.value.id, currentProject.value.lastRun?.runAt, currentProject.value.lastRun?.inputSignature],
    () => {
      if (!currentProject.value.lastRun?.runAt || currentProject.value.lastRun.inputSignature) {
        return
      }

      currentProject.value.lastRun.inputSignature = buildForecastRunInputSignature(currentProject.value)
    },
    { immediate: true }
  )

  watch(
    () => [currentProject.value.sourceKind, activeResultTab.value],
    () => {
      const availableTabs = getForecastProjectResultTabs(currentProject.value)
      if (!availableTabs.some((tab) => tab.id === activeResultTab.value)) {
        activeResultTab.value = availableTabs[0]?.id || 'daily'
      }
    },
    { immediate: true }
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
    applyHistoryImport,
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
