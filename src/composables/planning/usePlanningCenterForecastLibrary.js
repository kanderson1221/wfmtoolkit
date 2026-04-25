import { computed, ref, watch } from 'vue'

import { buildForecastStorageScope, forecastingRepository } from '../../forecastingRepository'
import { DEMAND_SOURCE_FORECAST } from '../../planner/demandSources'
import { PLAN_TYPE_UPDATE } from '../../planningStorage'
import {
  computeForecastPlanningReady,
  FORECAST_SOURCE_IMPORTED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  FORECAST_SOURCE_MODELED_DAILY,
  forecastProjectBelongsToPlanningContext,
  formatDate,
  formatDateTime,
  getForecastPlanningYear,
  getForecastProjectMonthlyRollup,
  getForecastProjectSourceKind,
  getForecastSourceKindLabel,
  getForecastTypeLabel,
  parseForecastDateValue,
  resolveForecastCoverageWindow,
  resolveForecastType
} from '../../forecasting/shared'

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const buildPlanUsageLabel = (plan = {}) => {
  const explicitName = String(plan?.name || '').trim()
  if (explicitName) {
    return explicitName
  }

  const planningYear = Number(plan?.planningYear) || 0
  const typeLabel = plan?.planType === PLAN_TYPE_UPDATE ? 'Update' : 'Budget'

  return planningYear ? `${planningYear} ${typeLabel}` : typeLabel
}

const buildForecastUsageSummary = (plans = [], forecastId = '') => {
  const matchingPlans = (Array.isArray(plans) ? plans : []).filter((plan) =>
    plan?.demandSource?.mode === DEMAND_SOURCE_FORECAST &&
    String(plan?.demandSource?.forecastProjectId || '').trim() === forecastId
  )

  if (!matchingPlans.length) {
    return {
      usedByLabel: 'Not used',
      usedByTitle: 'Not used in any saved plan'
    }
  }

  if (matchingPlans.length === 1) {
    const planLabel = buildPlanUsageLabel(matchingPlans[0])
    return {
      usedByLabel: planLabel,
      usedByTitle: `Imported into ${planLabel}`
    }
  }

  const planLabels = matchingPlans.map(buildPlanUsageLabel).sort((left, right) => left.localeCompare(right))

  return {
    usedByLabel: `${matchingPlans.length} Plans`,
    usedByTitle: planLabels.length
      ? `Imported into ${planLabels.join(', ')}`
      : `Imported into ${matchingPlans.length} saved plans`
  }
}

const derivePeakMonthLabel = (monthlyRollup = []) => {
  const peakRow = (Array.isArray(monthlyRollup) ? monthlyRollup : []).reduce(
    (currentPeak, monthRow) => (
      Number(monthRow?.contacts || 0) > Number(currentPeak?.contacts || -1)
        ? monthRow
        : currentPeak
    ),
    null
  )

  if (!peakRow?.monthStart) {
    return '—'
  }

  const parsedMonthStart = parseForecastDateValue(peakRow.monthStart)
  if (!parsedMonthStart) {
    return String(peakRow.monthStart)
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(parsedMonthStart)
}

const sortForecastsByRecentActivity = (forecasts = []) =>
  [...forecasts].sort((left, right) => {
    const leftStamp = new Date(left?.lastRun?.runAt || left?.updatedAt || left?.createdAt || 0).getTime()
    const rightStamp = new Date(right?.lastRun?.runAt || right?.updatedAt || right?.createdAt || 0).getTime()
    return rightStamp - leftStamp
  })

export function usePlanningCenterForecastLibrary({
  center,
  selectedGroup,
  storageScope,
  storageRefreshToken
}) {
  const savedForecasts = ref([])
  const forecastsLoading = ref(false)
  const forecastsError = ref('')

  const forecastWorkspaceScopes = computed(() => {
    if (!selectedGroup.value) {
      return []
    }

    return [...new Set([
      buildForecastStorageScope(storageScope.value, center.value.id, selectedGroup.value.id),
      buildForecastStorageScope(storageScope.value, center.value.id),
      String(storageScope.value || 'default')
    ])]
  })

  const loadSelectedGroupForecasts = async () => {
    if (!selectedGroup.value) {
      savedForecasts.value = []
      forecastsError.value = ''
      forecastsLoading.value = false
      return
    }

    forecastsLoading.value = true
    forecastsError.value = ''

    try {
      const scopeResults = await Promise.all(
        forecastWorkspaceScopes.value.map(async (scope) => ({
          scope,
          ...(await forecastingRepository.loadWorkspaceResult(scope))
        }))
      )

      const mergedProjectsById = new Map()

      scopeResults.forEach((result) => {
        result.projects.forEach((project) => {
          if (!project?.id) {
            return
          }

          if (!forecastProjectBelongsToPlanningContext(project, center.value.id, selectedGroup.value?.id || '')) {
            return
          }

          const existingProject = mergedProjectsById.get(project.id)
          if (!existingProject) {
            mergedProjectsById.set(project.id, {
              ...project,
              storageScope: result.scope,
              storageScopes: [result.scope]
            })
            return
          }

          const nextScopes = [...new Set([...(existingProject.storageScopes || []), result.scope])]
          mergedProjectsById.set(project.id, {
            ...existingProject,
            storageScopes: nextScopes
          })
        })
      })

      savedForecasts.value = sortForecastsByRecentActivity([...mergedProjectsById.values()])

      if (scopeResults.some((result) => result.error)) {
        forecastsError.value = savedForecasts.value.length
          ? 'Some saved forecasts could not be read from this device. Showing the forecasts available on this device.'
          : 'Unable to read saved forecasts from this device.'
      }
    } catch (error) {
      console.error('Unable to read saved forecasts from this device.', error)
      savedForecasts.value = []
      forecastsError.value = 'Unable to read saved forecasts from this device.'
    } finally {
      forecastsLoading.value = false
    }
  }

  const deleteForecast = async (forecast) => {
    const forecastId = String(forecast?.id || '').trim()
    const targetScopes = [...new Set(
      (Array.isArray(forecast?.storageScopes) ? forecast.storageScopes : [forecast?.storageScope])
        .map((scope) => String(scope || '').trim())
        .filter(Boolean)
    )]

    if (!targetScopes.length || !forecastId) {
      forecastsError.value = 'Unable to delete this forecast from this device.'
      return
    }

    const previousForecasts = [...savedForecasts.value]
    savedForecasts.value = savedForecasts.value.filter((project) => String(project?.id || '').trim() !== forecastId)
    forecastsError.value = ''

    try {
      await Promise.all(
        targetScopes.map(async (scope) => {
          const workspaceProjects = await forecastingRepository.loadWorkspace(scope)
          const remainingProjects = workspaceProjects.filter((project) => String(project?.id || '').trim() !== forecastId)
          await forecastingRepository.persistWorkspace(remainingProjects, scope)
        })
      )
    } catch (error) {
      console.error('Unable to delete the selected forecast from this device.', error)
      savedForecasts.value = previousForecasts
      forecastsError.value = 'Unable to delete this forecast from this device.'
    }
  }

  const forecastRows = computed(() =>
    savedForecasts.value.map((forecast) => {
      const forecastId = String(forecast?.id || '').trim()
      const historyRows = Array.isArray(forecast.historyRows) ? forecast.historyRows : []
      const monthlyRollup = getForecastProjectMonthlyRollup(forecast)
      const sourceKind = getForecastProjectSourceKind(forecast)
      const forecastType = resolveForecastType(forecast.forecastType, forecast)
      const planningYear = getForecastPlanningYear(forecast)
      const coverageWindow = resolveForecastCoverageWindow({
        planningYear,
        forecastType,
        coverageStartMonthIndex: forecast.coverageStartMonthIndex
      })
      const projectedTotalContacts = Number(
        forecast.lastRun?.summary?.projectedTotalContacts ??
          monthlyRollup.reduce((sum, row) => sum + Number(row?.contacts || 0), 0)
      ) || 0
      const historyRangeLabel = sourceKind === FORECAST_SOURCE_MODELED_DAILY
        ? historyRows.length
          ? `${formatDate(historyRows[0].ds)} to ${formatDate(historyRows[historyRows.length - 1].ds)}`
          : 'No history loaded'
        : ''
      const displayName = forecast.name || getForecastTypeLabel(forecastType)
      const usageSummary = buildForecastUsageSummary(selectedGroup.value?.plans, forecastId)

      return {
        id: forecastId,
        storageScope: forecast.storageScope || '',
        storageScopes: Array.isArray(forecast.storageScopes)
          ? [...forecast.storageScopes]
          : [forecast.storageScope || ''].filter(Boolean),
        name: forecast.name,
        displayName,
        planningYear,
        planningYearLabel: Number(planningYear) > 0
          ? String(planningYear)
          : '',
        sourceKind,
        sourceKindLabel: getForecastSourceKindLabel(sourceKind),
        forecastType,
        forecastTypeLabel: getForecastTypeLabel(forecastType),
        coverageWindowLabel: coverageWindow.coverageMonthLabel || 'Legacy coverage',
        historyRangeLabel,
        observationCountLabel: sourceKind === FORECAST_SOURCE_IMPORTED_DAILY
          ? `${formatWhole((forecast.lastRun?.dailyForecast || []).length)} rows`
          : sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY
            ? `${formatWhole(monthlyRollup.length)} months`
            : formatWhole(historyRows.length),
        monthlyCoverageLabel: monthlyRollup.length
          ? `${monthlyRollup.length}/${coverageWindow.expectedMonthCount || monthlyRollup.length} months`
          : 'Not run yet',
        projectedContactsLabel: monthlyRollup.length ? formatWhole(projectedTotalContacts) : '—',
        peakMonthLabel: monthlyRollup.length
          ? (forecast.lastRun?.summary?.peakForecastMonthLabel || derivePeakMonthLabel(monthlyRollup))
          : '—',
        usedByLabel: usageSummary.usedByLabel,
        usedByTitle: usageSummary.usedByTitle,
        updatedAtLabel: formatDateTime(forecast.updatedAt),
        runAtLabel: forecast.lastRun?.runAt ? formatDateTime(forecast.lastRun.runAt) : 'Not run yet',
        readyForPlanning: computeForecastPlanningReady(forecast)
      }
    })
  )

  const forecastStatusTone = computed(() =>
    forecastsError.value && forecastRows.value.length ? 'info' : 'error'
  )

  watch(
    () => [center.value?.id || '', selectedGroup.value?.id || '', storageScope.value, storageRefreshToken.value],
    () => {
      void loadSelectedGroupForecasts()
    },
    { immediate: true }
  )

  return {
    deleteForecast,
    forecastRows,
    forecastStatusTone,
    forecastsError,
    forecastsLoading,
    loadSelectedGroupForecasts
  }
}
