import { computed, onMounted, ref, watch } from 'vue'

import { buildForecastStorageScope, forecastingRepository } from '../../forecastingRepository'
import {
  computeForecastPlanningReady,
  forecastProjectBelongsToPlanningContext,
  formatDateTime,
  getForecastPlanningYear,
  getForecastTypeLabel,
  mergeForecastProjectCollections
} from '../../forecasting/shared'
import {
  DEMAND_SOURCE_FORECAST,
  DEMAND_SOURCE_MANUAL,
  applyForecastSnapshotToPlanMonths,
  buildForecastDemandSnapshot,
  createPlanDemandSource,
  summarizeForecastDemandSnapshot
} from '../../planner/demandSources'

export const usePlannerForecastDemandSource = ({
  props,
  planningYear,
  demandSource,
  planMonths,
  selectedForecastProjectId
}) => {
  const availableForecastProjects = ref([])
  const forecastsLoading = ref(false)
  const forecastsError = ref('')

  const forecastStorageScope = computed(() =>
    props.centerDefaults?.forecastStorageScope ||
    buildForecastStorageScope(props.storageScope, props.centerDefaults?.centerId, props.centerDefaults?.groupId)
  )

  const forecastFallbackScopes = computed(() => {
    const explicitScopes = Array.isArray(props.centerDefaults?.forecastFallbackScopes)
      ? props.centerDefaults.forecastFallbackScopes
      : []

    return [...new Set(
      explicitScopes
        .map((scope) => String(scope || '').trim())
        .filter((scope) => scope && scope !== forecastStorageScope.value)
    )]
  })

  const loadForecastProjects = async () => {
    forecastsLoading.value = true
    forecastsError.value = ''
    const centerId = String(props.centerDefaults?.centerId || '').trim()
    const groupId = String(props.centerDefaults?.groupId || '').trim()

    const workspaceResult = await forecastingRepository.loadWorkspaceResult(forecastStorageScope.value)
    const fallbackResults = await Promise.all(
      forecastFallbackScopes.value.map(async (scope) => ({
        scope,
        ...(await forecastingRepository.loadWorkspaceResult(scope))
      }))
    )

    availableForecastProjects.value = mergeForecastProjectCollections(
      Array.isArray(workspaceResult.projects) ? workspaceResult.projects : [],
      ...fallbackResults.map((result) =>
        (Array.isArray(result.projects) ? result.projects : []).filter((project) =>
          forecastProjectBelongsToPlanningContext(project, centerId, groupId)
        )
      )
    )

    if (workspaceResult.error || fallbackResults.some((result) => result.error)) {
      forecastsError.value = availableForecastProjects.value.length
        ? 'Some saved forecasts could not be read from this device. Showing the forecasts available on this device.'
        : 'Unable to read saved forecasts from this device.'
    }

    forecastsLoading.value = false

    if (
      !selectedForecastProjectId.value &&
      availableForecastProjects.value.filter((project) => Array.isArray(project?.lastRun?.monthlyRollup) && project.lastRun.monthlyRollup.length).length === 1
    ) {
      selectedForecastProjectId.value = availableForecastProjects.value.find(
        (project) => Array.isArray(project?.lastRun?.monthlyRollup) && project.lastRun.monthlyRollup.length
      )?.id || ''
    }
  }

  const setDemandSourceMode = (mode) => {
    demandSource.value = createPlanDemandSource({
      ...demandSource.value,
      mode: mode === DEMAND_SOURCE_FORECAST ? DEMAND_SOURCE_FORECAST : DEMAND_SOURCE_MANUAL
    })
  }

  const forecastProjectsWithResults = computed(() =>
    availableForecastProjects.value.filter(
      (project) =>
        Array.isArray(project?.lastRun?.monthlyRollup) &&
        project.lastRun.monthlyRollup.length &&
        getForecastPlanningYear(project) === planningYear.value &&
        computeForecastPlanningReady(project)
    )
  )

  const savedForecastProjectCount = computed(() => availableForecastProjects.value.length)

  const forecastSelectOptions = computed(() => [
    { label: 'Select a saved forecast', value: '' },
    ...forecastProjectsWithResults.value.map((project) => ({
      label: project.lastRun?.runAt
        ? `${project.name} · ${getForecastTypeLabel(project.forecastType)} · ${formatDateTime(project.lastRun.runAt)}`
        : project.name,
      value: project.id
    }))
  ])

  const selectedForecastProject = computed(() =>
    forecastProjectsWithResults.value.find((project) => project.id === selectedForecastProjectId.value) || null
  )

  const selectedForecastSnapshot = computed(() =>
    selectedForecastProject.value
      ? buildForecastDemandSnapshot(selectedForecastProject.value, planningYear.value)
      : []
  )

  const selectedForecastPreviewSummary = computed(() => {
    if (selectedForecastProject.value) {
      const snapshotSummary = summarizeForecastDemandSnapshot(selectedForecastSnapshot.value)

      return {
        projectName: selectedForecastProject.value.name,
        forecastType: selectedForecastProject.value.forecastType || '',
        runAt: selectedForecastProject.value.lastRun?.runAt || '',
        importedAt: demandSource.value.importedAt || '',
        forecastDateRange: selectedForecastProject.value.lastRun?.summary?.forecastDateRange || '',
        coverageStartMonthIndex: selectedForecastProject.value.coverageStartMonthIndex ?? null,
        coverageWindowLabel: selectedForecastProject.value.lastRun?.summary?.coverageStartDate && selectedForecastProject.value.lastRun?.summary?.coverageEndDate
          ? `${selectedForecastProject.value.lastRun.summary.coverageStartDate} to ${selectedForecastProject.value.lastRun.summary.coverageEndDate}`
          : '',
        ...snapshotSummary
      }
    }

    return null
  })

  const demandSourceSummary = computed(() => {
    if (demandSource.value.forecastProjectName || demandSource.value.forecastMonthSnapshot.length) {
      const snapshotSummary = summarizeForecastDemandSnapshot(demandSource.value.forecastMonthSnapshot)

      return {
        projectName: demandSource.value.forecastProjectName || 'Saved Forecast',
        forecastType: demandSource.value.forecastType || '',
        runAt: demandSource.value.forecastRunAt || '',
        importedAt: demandSource.value.importedAt || '',
        forecastDateRange: '',
        coverageStartMonthIndex: demandSource.value.coverageStartMonthIndex ?? null,
        coverageWindowLabel: '',
        ...snapshotSummary
      }
    }

    return null
  })

  const forecastCanApply = computed(() =>
    Boolean(selectedForecastProject.value) && selectedForecastSnapshot.value.length > 0
  )

  const applyForecastToDemand = () => {
    if (!selectedForecastProject.value || !selectedForecastSnapshot.value.length) {
      return
    }

    planMonths.value = applyForecastSnapshotToPlanMonths(planMonths.value, selectedForecastSnapshot.value)
    demandSource.value = createPlanDemandSource({
      mode: DEMAND_SOURCE_FORECAST,
      forecastProjectId: selectedForecastProject.value.id,
      forecastProjectName: selectedForecastProject.value.name,
      forecastType: selectedForecastProject.value.forecastType || '',
      forecastRunAt: selectedForecastProject.value.lastRun?.runAt || '',
      importedAt: new Date().toISOString(),
      importedPlanningYear: planningYear.value,
      coverageStartMonthIndex: selectedForecastProject.value.coverageStartMonthIndex ?? null,
      forecastMonthSnapshot: selectedForecastSnapshot.value
    })
  }

  watch(
    () => demandSource.value.mode,
    (mode) => {
      if (mode !== DEMAND_SOURCE_MANUAL) {
        return
      }

      if (!demandSource.value.forecastProjectId && !demandSource.value.forecastMonthSnapshot.length) {
        return
      }

      demandSource.value = createPlanDemandSource({
        mode: DEMAND_SOURCE_MANUAL
      })
    }
  )

  onMounted(() => {
    void loadForecastProjects()
  })

  watch(
    [
      () => props.storageScope,
      () => props.centerDefaults?.centerId,
      () => props.centerDefaults?.groupId,
      () => props.storageRefreshToken,
      forecastStorageScope,
      forecastFallbackScopes
    ],
    () => {
      void loadForecastProjects()
    }
  )

  return {
    availableForecastProjects,
    savedForecastProjectCount,
    forecastsLoading,
    forecastsError,
    forecastSelectOptions,
    selectedForecastProject,
    selectedForecastPreviewSummary,
    demandSourceSummary,
    forecastCanApply,
    setDemandSourceMode,
    applyForecastToDemand,
    reloadForecastProjects: loadForecastProjects
  }
}
