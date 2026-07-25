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
  mergeForecastProjectCollections
} from '../../forecasting/shared'
import { createManualMonthlyForecastResults } from '../../forecasting/sourceArtifacts'
import {
  DEMAND_SOURCE_FORECAST,
  DEMAND_SOURCE_MANUAL,
  applyForecastSnapshotToPlanMonths,
  buildForecastDailyDemandSnapshot,
  buildForecastDemandSnapshot,
  buildPlanRequiredMonthStarts,
  createPlanDemandSource,
  summarizeForecastCoverageForPlan,
  summarizeForecastDemandSnapshot
} from '../../planner/demandSources'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../planner/shared'

export const usePlannerForecastDemandSource = ({
  props,
  planningYear,
  demandSource,
  planMonths,
  selectedForecastProjectId,
  planType,
  requirementMethod,
  actualsThroughMonth
}) => {
  const availableForecastProjects = ref([])
  const forecastsLoaded = ref(false)
  const forecastsLoading = ref(false)
  const forecastsError = ref('')
  const forecastApplyMessage = ref('')
  const forecastApplyTone = ref('success')
  const normalizeForecastId = (value) => String(value || '').trim()

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

  const planCoverageOptions = computed(() => ({
    planType: planType?.value || '',
    actualsThroughMonth: actualsThroughMonth?.value || ''
  }))

  const updateActualsCutoffMonthIndex = computed(() => {
    if (planType?.value !== 'update') {
      return -1
    }

    const normalizedCutoff = String(actualsThroughMonth?.value || '').trim()
    const match = normalizedCutoff.match(/^(\d{4})-(\d{2})-01$/)
    if (!match || Number(match[1]) !== Number(planningYear.value)) {
      return -1
    }

    const monthIndex = Number(match[2]) - 1
    return monthIndex >= 0 && monthIndex < 12 ? monthIndex : -1
  })

  const mergeUpdateForecastHistory = (currentRows, nextRows, resolveMonthIndex) => {
    const cutoffMonthIndex = updateActualsCutoffMonthIndex.value
    if (cutoffMonthIndex < 0) {
      return nextRows
    }

    return [
      ...(Array.isArray(currentRows) ? currentRows : []).filter(
        (row, fallbackIndex) => resolveMonthIndex(row, fallbackIndex) <= cutoffMonthIndex
      ),
      ...(Array.isArray(nextRows) ? nextRows : []).filter(
        (row, fallbackIndex) => resolveMonthIndex(row, fallbackIndex) > cutoffMonthIndex
      )
    ]
  }

  const resolveSnapshotMonthIndex = (row, fallbackIndex = 0) => {
    const explicitMonthIndex = Number(row?.monthIndex)
    if (Number.isInteger(explicitMonthIndex)) {
      return explicitMonthIndex
    }

    const serviceDateMonth = Number(String(row?.serviceDate || row?.monthStart || '').slice(5, 7)) - 1
    return Number.isInteger(serviceDateMonth) ? serviceDateMonth : fallbackIndex
  }

  const requiresDailyForecast = computed(() =>
    requirementMethod?.value === PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
  )

  const isPlanAssignableForecast = (project) => (
    Array.isArray(project?.lastRun?.monthlyRollup) &&
    project.lastRun.monthlyRollup.length &&
    computeForecastPlanningReady(project)
  )

  const loadForecastProjects = async () => {
    forecastsLoaded.value = false
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
    forecastsLoaded.value = true

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
    [
      forecastProjectsWithResults,
      () => demandSource.value.mode,
      () => demandSource.value.forecastProjectId,
      () => demandSource.value.forecastMonthSnapshot?.length || 0,
      forecastsLoaded
    ],
    ([projects, mode, appliedForecastId, appliedSnapshotLength, loaded]) => {
      const availableProjectIds = new Set(projects.map((project) => normalizeForecastId(project?.id)))
      const normalizedSelectedForecastId = normalizeForecastId(selectedForecastProjectId.value)

      if (normalizedSelectedForecastId && availableProjectIds.has(normalizedSelectedForecastId)) {
        return
      }

      const normalizedAppliedForecastId = mode === DEMAND_SOURCE_FORECAST && appliedSnapshotLength > 0
        ? normalizeForecastId(appliedForecastId)
        : ''

      if (normalizedAppliedForecastId && availableProjectIds.has(normalizedAppliedForecastId)) {
        selectedForecastProjectId.value = normalizedAppliedForecastId
        return
      }

      if (
        loaded &&
        normalizedAppliedForecastId &&
        !availableProjectIds.has(normalizedAppliedForecastId) &&
        projects.length === 1
      ) {
        selectedForecastProjectId.value = normalizeForecastId(projects[0]?.id)
        return
      }

      if (loaded && normalizedSelectedForecastId) {
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
      ? buildForecastDemandSnapshot(selectedForecastProject.value, planningYear.value, planCoverageOptions.value)
      : []
  )

  const selectedForecastDailySnapshot = computed(() =>
    selectedForecastProject.value
      ? buildForecastDailyDemandSnapshot(selectedForecastProject.value, planningYear.value, planCoverageOptions.value)
      : []
  )

  const selectedForecastHasDailySnapshot = computed(() => selectedForecastDailySnapshot.value.length > 0)

  const selectedForecastCoverageSummary = computed(() =>
    selectedForecastProject.value
      ? summarizeForecastCoverageForPlan(selectedForecastProject.value, planningYear.value, planCoverageOptions.value)
      : null
  )

  const appliedForecastProject = computed(() => {
    if (demandSource.value.mode !== DEMAND_SOURCE_FORECAST) {
      return null
    }

    const appliedForecastId = normalizeForecastId(demandSource.value.forecastProjectId)
    if (!appliedForecastId) {
      return null
    }

    return forecastProjectsWithResults.value.find(
      (project) => normalizeForecastId(project?.id) === appliedForecastId
    ) || null
  })

  const appliedForecastDailySnapshot = computed(() =>
    appliedForecastProject.value
      ? buildForecastDailyDemandSnapshot(appliedForecastProject.value, planningYear.value, planCoverageOptions.value)
      : []
  )

  const selectedForecastPreviewSummary = computed(() => {
    if (selectedForecastProject.value) {
      const coverageSummary = selectedForecastCoverageSummary.value
      const snapshotSummary = summarizeForecastDemandSnapshot(
        selectedForecastSnapshot.value,
        coverageSummary?.requiredMonthCount || 12
      )

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
        coverageStatusLabel: coverageSummary?.coverageLabel || '',
        missingCoverageLabel: coverageSummary?.missingCoverageLabel || '',
        requiredMonthCount: coverageSummary?.requiredMonthCount || 0,
        dailySnapshotCount: selectedForecastDailySnapshot.value.length,
        requiresDailyForecast: requiresDailyForecast.value,
        dailyForecastReady: !requiresDailyForecast.value || selectedForecastHasDailySnapshot.value,
        ...snapshotSummary
      }
    }

    return null
  })

  const demandSourceSummary = computed(() => {
    if (demandSource.value.forecastProjectName || demandSource.value.forecastMonthSnapshot.length) {
      const dailySnapshotCount = Array.isArray(demandSource.value.forecastDailySnapshot)
        ? demandSource.value.forecastDailySnapshot.length
        : 0
      const requiredMonthIndexes = new Set(
        buildPlanRequiredMonthStarts(
          planningYear.value,
          planCoverageOptions.value
        ).map((monthStart) => Number(monthStart.slice(5, 7)) - 1)
      )
      const requiredMonthSnapshot = demandSource.value.forecastMonthSnapshot.filter(
        (month, fallbackIndex) => requiredMonthIndexes.has(resolveSnapshotMonthIndex(month, fallbackIndex))
      )
      const snapshotSummary = summarizeForecastDemandSnapshot(
        requiredMonthSnapshot,
        requiredMonthIndexes.size || 12
      )

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
        dailySnapshotCount,
        requiresDailyForecast: requiresDailyForecast.value,
        dailyForecastReady: !requiresDailyForecast.value || dailySnapshotCount > 0,
        ...snapshotSummary
      }
    }

    return null
  })

  const forecastCanApply = computed(() => {
    const hasMonthlySnapshot = Boolean(selectedForecastProject.value) &&
      Boolean(selectedForecastCoverageSummary.value?.hasRequiredCoverage) &&
      selectedForecastSnapshot.value.length > 0

    if (!hasMonthlySnapshot) {
      return false
    }

    return !requiresDailyForecast.value || selectedForecastHasDailySnapshot.value
  })

  const applyForecastToDemand = () => {
    if (!selectedForecastProject.value || !selectedForecastSnapshot.value.length) {
      forecastApplyTone.value = 'error'
      forecastApplyMessage.value = 'Select a completed saved forecast before applying it to this plan.'
      return false
    }

    if (requiresDailyForecast.value && !selectedForecastHasDailySnapshot.value) {
      forecastApplyTone.value = 'error'
      forecastApplyMessage.value = 'Intraday Erlang requires a modeled or imported daily forecast. Select a forecast with daily rows before applying it.'
      return false
    }

    const wasSameForecast = normalizeForecastId(demandSource.value.forecastProjectId) === normalizeForecastId(selectedForecastProject.value.id)
    planMonths.value = applyForecastSnapshotToPlanMonths(planMonths.value, selectedForecastSnapshot.value)
    const nextForecastMonthSnapshot = mergeUpdateForecastHistory(
      demandSource.value.forecastMonthSnapshot,
      selectedForecastSnapshot.value,
      resolveSnapshotMonthIndex
    )
    const nextForecastDailySnapshot = mergeUpdateForecastHistory(
      demandSource.value.forecastDailySnapshot,
      selectedForecastDailySnapshot.value,
      resolveSnapshotMonthIndex
    )
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
      forecastMonthSnapshot: nextForecastMonthSnapshot,
      forecastDailySnapshot: nextForecastDailySnapshot
    })
    forecastApplyTone.value = 'success'
    forecastApplyMessage.value = requiresDailyForecast.value
      ? `${wasSameForecast ? 'Reapplied' : 'Applied'} ${selectedForecastProject.value.name}. Monthly contacts, AHT assumptions, and daily rows were refreshed from the saved forecast.`
      : `${wasSameForecast ? 'Reapplied' : 'Applied'} ${selectedForecastProject.value.name}. Monthly contacts and starting AHT assumptions were refreshed from the saved forecast.`
    return true
  }

  watch(
    [
      appliedForecastProject,
      appliedForecastDailySnapshot,
      () => demandSource.value.mode,
      () => demandSource.value.forecastMonthSnapshot?.length || 0,
      () => demandSource.value.forecastDailySnapshot?.length || 0
    ],
    ([project, dailySnapshot, mode, monthlySnapshotLength, dailySnapshotLength]) => {
      if (
        mode !== DEMAND_SOURCE_FORECAST ||
        !project ||
        monthlySnapshotLength <= 0 ||
        dailySnapshotLength > 0 ||
        !Array.isArray(dailySnapshot) ||
        dailySnapshot.length <= 0
      ) {
        return
      }

      demandSource.value = createPlanDemandSource({
        ...demandSource.value,
        forecastDailySnapshot: dailySnapshot
      })
    },
    { immediate: true }
  )

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

  watch(selectedForecastProjectId, () => {
    forecastApplyMessage.value = ''
  })

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
    forecastApplyMessage,
    forecastApplyTone,
    applyForecastToDemand,
    convertLegacyManualDemandSource,
    hasLegacyManualDemandSource,
    legacyManualSummary,
    reloadForecastProjects: loadForecastProjects
  }
}
