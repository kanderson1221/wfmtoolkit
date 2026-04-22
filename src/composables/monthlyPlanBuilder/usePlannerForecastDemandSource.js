import { computed, onMounted, ref, watch } from 'vue'

import { buildForecastStorageScope, forecastingRepository } from '../../forecastingRepository'
import {
  computeForecastPlanningReady,
  createForecastEntityId,
  createForecastProject,
  createSavedForecastName,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  getForecastProjectSourceKind,
  getForecastSourceKindLabel,
  forecastProjectBelongsToPlanningContext,
  formatDateTime,
  getForecastPlanningYear,
  mergeForecastProjectCollections
} from '../../forecasting/shared'
import { createManualMonthlyForecastResults } from '../../forecasting/sourceArtifacts'
import {
  DEMAND_SOURCE_FORECAST,
  DEMAND_SOURCE_MANUAL,
  applyForecastSnapshotToPlanMonths,
  buildForecastDailyDemandSnapshot,
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

  const isPlanAssignableForecast = (project) => (
    Array.isArray(project?.lastRun?.monthlyRollup) &&
    project.lastRun.monthlyRollup.length &&
    getForecastPlanningYear(project) === planningYear.value &&
    computeForecastPlanningReady(project)
  )

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

  }

  const forecastProjectsWithResults = computed(() =>
    availableForecastProjects.value.filter((project) => isPlanAssignableForecast(project))
  )

  const savedForecastProjectCount = computed(() => availableForecastProjects.value.length)

  const forecastSelectOptions = computed(() => [
    { label: 'Select a saved forecast', value: '' },
    ...forecastProjectsWithResults.value.map((project) => ({
      label: project.lastRun?.runAt
        ? `${project.name} · ${getForecastSourceKindLabel(project.sourceKind)} · ${formatDateTime(project.lastRun.runAt)}`
        : `${project.name} · ${getForecastSourceKindLabel(project.sourceKind)}`,
      value: project.id
    }))
  ])

  const selectedForecastProject = computed(() =>
    forecastProjectsWithResults.value.find((project) => project.id === selectedForecastProjectId.value) || null
  )

  watch(
    forecastProjectsWithResults,
    (projects) => {
      if (!selectedForecastProjectId.value) {
        return
      }

      if (!projects.some((project) => project.id === selectedForecastProjectId.value)) {
        selectedForecastProjectId.value = ''
      }
    },
    { immediate: true }
  )

  const appliedForecastProjectMissing = computed(() => {
    if (demandSource.value.mode !== DEMAND_SOURCE_FORECAST) {
      return false
    }

    const appliedForecastId = String(demandSource.value.forecastProjectId || '').trim()
    if (!appliedForecastId || !demandSource.value.forecastMonthSnapshot.length) {
      return false
    }

    return !availableForecastProjects.value.some(
      (project) => String(project?.id || '').trim() === appliedForecastId
    )
  })

  const selectedForecastSnapshot = computed(() =>
    selectedForecastProject.value
      ? buildForecastDemandSnapshot(selectedForecastProject.value, planningYear.value)
      : []
  )

  const selectedForecastDailySnapshot = computed(() =>
    selectedForecastProject.value
      ? buildForecastDailyDemandSnapshot(selectedForecastProject.value, planningYear.value)
      : []
  )

  const selectedForecastPreviewSummary = computed(() => {
    if (selectedForecastProject.value) {
      const snapshotSummary = summarizeForecastDemandSnapshot(selectedForecastSnapshot.value)

      return {
        projectName: selectedForecastProject.value.name,
        sourceKind: getForecastProjectSourceKind(selectedForecastProject.value),
        sourceKindLabel: getForecastSourceKindLabel(selectedForecastProject.value.sourceKind),
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
        sourceKind: demandSource.value.forecastSourceKind || '',
        sourceKindLabel: getForecastSourceKindLabel(demandSource.value.forecastSourceKind),
        forecastType: demandSource.value.forecastType || '',
        runAt: demandSource.value.forecastRunAt || '',
        importedAt: demandSource.value.importedAt || '',
        forecastDateRange: '',
        coverageStartMonthIndex: demandSource.value.coverageStartMonthIndex ?? null,
        coverageWindowLabel: '',
        sourceMissing: appliedForecastProjectMissing.value,
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
      forecastSourceKind: getForecastProjectSourceKind(selectedForecastProject.value),
      forecastType: selectedForecastProject.value.forecastType || '',
      forecastRunAt: selectedForecastProject.value.lastRun?.runAt || '',
      importedAt: new Date().toISOString(),
      importedPlanningYear: planningYear.value,
      coverageStartMonthIndex: selectedForecastProject.value.coverageStartMonthIndex ?? null,
      forecastMonthSnapshot: selectedForecastSnapshot.value,
      forecastDailySnapshot: selectedForecastDailySnapshot.value
    })
  }

  const hasLegacyManualDemandSource = computed(() =>
    Boolean(props.initialPlan?.id) && demandSource.value.mode !== DEMAND_SOURCE_FORECAST
  )

  const legacyManualSummary = computed(() => {
    if (!hasLegacyManualDemandSource.value) {
      return null
    }

    const totalContacts = (Array.isArray(planMonths.value) ? planMonths.value : [])
      .reduce((sum, month) => sum + Number(month?.contacts || 0), 0)

    return {
      totalContacts,
      monthCount: (Array.isArray(planMonths.value) ? planMonths.value : []).length
    }
  })

  const convertLegacyManualDemandSource = async () => {
    if (!hasLegacyManualDemandSource.value) {
      return false
    }

    const workspaceProjects = await forecastingRepository.loadWorkspace(forecastStorageScope.value)
    const planningContext = {
      centerId: props.centerDefaults?.centerId || '',
      groupId: props.centerDefaults?.groupId || '',
      planningYear: planningYear.value,
      groupName: props.centerDefaults?.groupName || '',
      centerName: props.centerDefaults?.centerName || ''
    }
    const sourceRows = (Array.isArray(planMonths.value) ? planMonths.value : []).map((month, monthIndex) => ({
      monthIndex,
      monthStart: `${planningYear.value}-${String(monthIndex + 1).padStart(2, '0')}-01`,
      monthLabel: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
        new Date(planningYear.value, monthIndex, 1)
      ),
      contacts: Number(month?.contacts || 0)
    }))
    const baseProject = createForecastProject({
      id: createForecastEntityId('forecast-project'),
      centerId: props.centerDefaults?.centerId || '',
      centerName: props.centerDefaults?.centerName || '',
      groupId: props.centerDefaults?.groupId || '',
      groupName: props.centerDefaults?.groupName || '',
      planningYear: planningYear.value,
      planningContext,
      sourceKind: FORECAST_SOURCE_MANUAL_MONTHLY,
      sourceData: {
        fileName: '',
        headers: [],
        rows: sourceRows,
        mapping: {},
        issues: []
      },
      lastRun: createManualMonthlyForecastResults({
        rows: sourceRows,
        planningYear: planningYear.value,
        forecastType: '',
        coverageStartMonthIndex: 0
      })
    })
    const projectToSave = {
      ...baseProject,
      name: createSavedForecastName(workspaceProjects, baseProject)
    }
    const nextProjects = forecastingRepository.saveProject(workspaceProjects, projectToSave)
    await forecastingRepository.persistWorkspace(nextProjects, forecastStorageScope.value)
    await loadForecastProjects()

    const savedProject = nextProjects.find((project) => project.id === projectToSave.id) || projectToSave
    const savedSnapshot = buildForecastDemandSnapshot(savedProject, planningYear.value)

    demandSource.value = createPlanDemandSource({
      mode: DEMAND_SOURCE_FORECAST,
      forecastProjectId: savedProject.id,
      forecastProjectName: savedProject.name,
      forecastSourceKind: FORECAST_SOURCE_MANUAL_MONTHLY,
      forecastType: savedProject.forecastType || '',
      forecastRunAt: savedProject.lastRun?.runAt || '',
      importedAt: new Date().toISOString(),
      importedPlanningYear: planningYear.value,
      coverageStartMonthIndex: savedProject.coverageStartMonthIndex ?? 0,
      forecastMonthSnapshot: savedSnapshot
    })
    selectedForecastProjectId.value = savedProject.id
    return true
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

  watch(
    [forecastProjectsWithResults, selectedForecastProjectId],
    ([projects, selectedForecastId]) => {
      const normalizedSelectedForecastId = String(selectedForecastId || '').trim()

      if (!normalizedSelectedForecastId) {
        return
      }

      const stillAvailable = projects.some(
        (project) => String(project?.id || '').trim() === normalizedSelectedForecastId
      )

      if (!stillAvailable) {
        selectedForecastProjectId.value = ''
      }
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
    applyForecastToDemand,
    convertLegacyManualDemandSource,
    hasLegacyManualDemandSource,
    legacyManualSummary,
    reloadForecastProjects: loadForecastProjects
  }
}
