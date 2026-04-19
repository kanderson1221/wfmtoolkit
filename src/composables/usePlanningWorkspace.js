import { computed, ref, watch } from 'vue'
import {
  buildPlanningCenterHash,
  buildPlanningGroupForecastsHash,
  buildPlanningGroupHash,
  buildPlanningHomeHash,
  navigateToHash
} from '../appRoutes'
import { buildForecastStorageScope } from '../forecastingRepository'
import {
  FORECAST_SOURCE_MODELED_DAILY,
  FORECAST_TYPE_BUDGET,
  createForecastCenterSnapshot,
  createForecastHoliday
} from '../forecasting/shared'
import {
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_CALENDAR_US_FEDERAL,
  HOLIDAY_SCHEDULE_CLOSED,
  normalizeHolidayScheduleMode
} from '../planner/holidayCalendars'
import { buildForecastTrainingSeedFromPlanningGroupActuals } from '../planner/groupActualsForecastSeed'
import { findLinkedPriorPlan, getCurrentCalendarYear, resolveLinkedOpeningPosition, resolvePlanningYear } from '../plannerModel'
import { resolveCenterHolidayProfile, resolveCenterHolidayProfiles } from '../planningStorage'
import { planningRepository } from '../planningRepository'
import { describeBrowserStorageError } from '../storage/browserStorage'

export const usePlanningWorkspace = ({ currentRoute, currentUser, storageScope }) => {
  const planningCenters = ref([])
  const workspaceHydrating = ref(false)
  const workspaceSaveError = ref('')

  const buildForecastFallbackScopes = (centerId, groupId) => {
    const scopes = [
      buildForecastStorageScope(storageScope.value, centerId, groupId),
      buildForecastStorageScope(storageScope.value, centerId),
      String(storageScope.value || 'default')
    ]

    return [...new Set(scopes.filter(Boolean))]
  }

  const persistAndSetCenters = async (centers) => {
    try {
      const nextCenters = (await planningRepository.persistWorkspace(centers, storageScope.value)) || centers
      planningCenters.value = Array.isArray(nextCenters) ? nextCenters : centers
      workspaceSaveError.value = ''
      return true
    } catch (error) {
      console.error('Unable to save planning changes locally.', error)
      workspaceSaveError.value = `Unable to save planning changes locally. ${describeBrowserStorageError(
        error,
        'This browser could not store the latest planning updates.'
      )}`
      return false
    }
  }

  const loadCentersForScope = async (scope = storageScope.value) => {
    workspaceHydrating.value = true
    try {
      planningCenters.value = await planningRepository.loadWorkspace(scope)
      workspaceSaveError.value = ''
      return planningCenters.value
    } catch (error) {
      console.error('Unable to load planning data from this browser.', error)
      planningCenters.value = []
      workspaceSaveError.value = `Unable to read planning data from this browser. ${describeBrowserStorageError(
        error,
        'This browser could not load the saved planning workspace.'
      )}`
      return []
    } finally {
      workspaceHydrating.value = false
    }
  }

  const clearCenters = () => {
    workspaceHydrating.value = false
    planningCenters.value = []
    workspaceSaveError.value = ''
  }

  const currentCenter = computed(() => {
    if (currentRoute.value.app !== 'planning') {
      return null
    }

    if (currentRoute.value.centerId) {
      return planningRepository.findCenter(planningCenters.value, currentRoute.value.centerId)
    }

    if (currentRoute.value.planId && currentRoute.value.planId !== 'new') {
      return planningRepository.findCenterByPlanId(planningCenters.value, currentRoute.value.planId)
    }

    return null
  })

  const currentGroup = computed(() => {
    if (currentRoute.value.app !== 'planning') {
      return null
    }

    if (currentRoute.value.centerId && currentRoute.value.groupId) {
      return planningRepository.findGroup(planningCenters.value, currentRoute.value.centerId, currentRoute.value.groupId)
    }

    if (currentRoute.value.page === 'editor' && currentRoute.value.planId && currentRoute.value.planId !== 'new') {
      return planningRepository.findGroupByPlanId(planningCenters.value, currentRoute.value.planId)
    }

    return null
  })

  const currentPlan = computed(() => {
    if (currentRoute.value.app !== 'planning' || currentRoute.value.page !== 'editor') {
      return null
    }

    if (currentRoute.value.planId === 'new') {
      return null
    }

    if (!currentCenter.value || !currentGroup.value || !currentRoute.value.planId) {
      return null
    }

    return planningRepository.findPlan(
      planningCenters.value,
      currentCenter.value.id,
      currentGroup.value.id,
      currentRoute.value.planId
    )
  })

  const plannerSeed = computed(() => {
    if (!currentCenter.value || !currentGroup.value) {
      return null
    }

    const resolvedPlanningYear = resolvePlanningYear(currentRoute.value.year, currentPlan.value?.planningYear)
    const linkedPriorPlan = findLinkedPriorPlan(currentGroup.value.plans || [], {
      id: currentPlan.value?.id || null,
      planningYear: resolvedPlanningYear
    })
    const centerHolidayProfile = resolveCenterHolidayProfile(currentCenter.value, resolvedPlanningYear)
    const centerHolidayCalendarId = centerHolidayProfile.holidayCalendarId || HOLIDAY_CALENDAR_NONE
    const seededStartingPosition = resolveLinkedOpeningPosition({
      priorPlan: linkedPriorPlan,
      startingHeadcount: 0,
      startingFrontlineHeadcount: 0
    })

    const forecastFallbackScopes = buildForecastFallbackScopes(currentCenter.value.id, currentGroup.value.id)

    return {
      centerId: currentCenter.value.id,
      centerName: currentCenter.value.name,
      groupId: currentGroup.value.id,
      groupName: currentGroup.value.name,
      timezone: currentCenter.value.timezone,
      planningYear: resolvedPlanningYear,
      holidayCalendarId: centerHolidayCalendarId,
      disabledHolidayRuleIds: [...centerHolidayProfile.disabledHolidayRuleIds],
      customHolidays: centerHolidayProfile.customHolidays.map((holiday) => ({ ...holiday })),
      holidayScheduleMode: normalizeHolidayScheduleMode(HOLIDAY_SCHEDULE_CLOSED),
      operatingWeekdays: [...currentCenter.value.operatingWeekdays],
      defaultPaidHoursPerDay: currentGroup.value.defaultPaidHoursPerDay ?? currentCenter.value.defaultPaidHoursPerDay,
      defaultOccupancyPercent: currentGroup.value.defaultOccupancyPercent ?? currentCenter.value.defaultOccupancyPercent,
      defaultAdherencePercent: currentGroup.value.defaultAdherencePercent ?? currentCenter.value.defaultAdherencePercent,
      startingHeadcount: seededStartingPosition.rosterHeadcount,
      startingFrontlineHeadcount: seededStartingPosition.frontlineHeadcount,
      presenceMonths: Array.from({ length: 12 }, () => ({
        paidHoursPerDay: currentGroup.value.defaultPaidHoursPerDay ?? currentCenter.value.defaultPaidHoursPerDay
      })),
      randomDefaults: {
        occupancyPercent: currentGroup.value.defaultOccupancyPercent ?? currentCenter.value.defaultOccupancyPercent,
        adherencePercent: currentGroup.value.defaultAdherencePercent ?? currentCenter.value.defaultAdherencePercent
      },
      forecastStorageScope: buildForecastStorageScope(storageScope.value, currentCenter.value.id, currentGroup.value.id),
      forecastFallbackScopes
    }
  })

  const forecastSeed = computed(() => {
    if (!currentCenter.value || !currentGroup.value) {
      return null
    }

    const resolvedPlanningYear =
      currentRoute.value.page === 'editor' || currentRoute.value.page === 'group-forecasts'
        ? resolvePlanningYear(currentRoute.value.year, currentPlan.value?.planningYear)
        : null
    const groupName = currentGroup.value?.name || ''
    const holidayProfileYear = resolvedPlanningYear || getCurrentCalendarYear()
    const centerHolidayProfile = resolveCenterHolidayProfile(currentCenter.value, holidayProfileYear)
    const sourceCenterHolidayProfiles = resolveCenterHolidayProfiles(currentCenter.value).map((profile) => ({
      year: profile.year,
      customHolidays: profile.customHolidays.map((holiday) => ({
        label: holiday.label,
        date: holiday.date,
        sourceRuleId: holiday.sourceRuleId || null,
        month: holiday.month,
        day: holiday.day
      }))
    }))
    const customHolidays = centerHolidayProfile.customHolidays.map((holiday) =>
      createForecastHoliday({
        name: holiday.label,
        date: holiday.date,
        sourceRuleId: holiday.sourceRuleId || null,
        month: holiday.month,
        day: holiday.day
      })
    )
    const holidayCalendarLabel =
      centerHolidayProfile.holidayCalendarId === HOLIDAY_CALENDAR_US_FEDERAL
        ? 'United States Federal'
        : customHolidays.length
          ? `${customHolidays.length} custom holiday${customHolidays.length === 1 ? '' : 's'}`
          : 'No holiday calendar'
    const seededForecastType = FORECAST_TYPE_BUDGET
    const seededCoverageStartMonthIndex = 0
    const seededSourceKind =
      currentRoute.value.page === 'group-forecasts'
        ? (currentRoute.value.sourceKind || FORECAST_SOURCE_MODELED_DAILY)
        : FORECAST_SOURCE_MODELED_DAILY
    const sharedHistorySeed =
      currentRoute.value.page === 'group-forecasts' &&
      seededSourceKind === FORECAST_SOURCE_MODELED_DAILY
        ? buildForecastTrainingSeedFromPlanningGroupActuals(currentGroup.value?.actuals, {
            group: currentGroup.value,
            center: currentCenter.value
          })
        : { historyRows: [] }

    return {
      centerId: currentCenter.value.id,
      centerName: currentCenter.value.name,
      groupId: currentGroup.value.id,
      groupName,
      planningYear: resolvedPlanningYear,
      sourceKind: seededSourceKind,
      forecastType: seededForecastType,
      coverageStartMonthIndex: seededCoverageStartMonthIndex,
      centerManagedHolidays: true,
      timezone: currentCenter.value.timezone,
      ...sharedHistorySeed,
      planningContext: {
        centerId: currentCenter.value.id,
        groupId: currentGroup.value.id,
        planId: currentRoute.value.page === 'editor' ? currentPlan.value?.id || null : null,
        planningYear: resolvedPlanningYear,
        groupName
      },
      sourceCenterSnapshot: createForecastCenterSnapshot({
        centerId: currentCenter.value.id,
        centerName: currentCenter.value.name,
        timezone: currentCenter.value.timezone,
        operatingWeekdays:
          Array.isArray(currentGroup.value?.operatingWeekdays) && currentGroup.value.operatingWeekdays.length
            ? currentGroup.value.operatingWeekdays
            : currentCenter.value.operatingWeekdays,
        operatingOpenTime: currentCenter.value.operatingOpenTime,
        operatingCloseTime: currentCenter.value.operatingCloseTime,
        holidayProfileYear,
        holidayCalendarLabel,
        customHolidayCount: customHolidays.length
      }),
      sourceCenterHolidayProfiles,
      modelConfig: {
        builtInHolidayCountry: centerHolidayProfile.holidayCalendarId === HOLIDAY_CALENDAR_US_FEDERAL ? 'US' : '',
        customHolidays
      },
      forecastStorageScope: buildForecastStorageScope(storageScope.value, currentCenter.value.id, currentGroup.value.id),
      fallbackScopes: buildForecastFallbackScopes(currentCenter.value.id, currentGroup.value.id).slice(1)
    }
  })

  const groupDraftKey = computed(() => {
    const scopePrefix = currentUser.value?.id || 'guest'

    if (currentGroup.value?.id) {
      return `${scopePrefix}:group:${currentGroup.value.id}`
    }

    return `${scopePrefix}:group:new`
  })

  const plannerDraftKey = computed(() => {
    const scopePrefix = currentUser.value?.id || 'guest'

    if (currentPlan.value?.id) {
      return `${scopePrefix}:plan:${currentPlan.value.id}`
    }

    if (currentRoute.value.page === 'editor' && currentGroup.value?.id) {
      return `${scopePrefix}:${currentGroup.value.id}:plan:new:${currentRoute.value.year || 'default'}`
    }

    return `${scopePrefix}:plan:new`
  })

  const monthlyPlannerKey = computed(() => {
    if (currentRoute.value.page !== 'editor') {
      return 'planner-empty'
    }

    if (currentPlan.value?.id) {
      return `planner-${currentPlan.value.id}`
    }

    return `planner-${currentGroup.value?.id || 'no-group'}-new-${currentRoute.value.year || 'default'}`
  })

  const handleSaveCenter = async (centerDraft) => {
    const nextCenters = planningRepository.saveCenter(planningCenters.value, centerDraft)
    const savedCenter =
      centerDraft.id
        ? nextCenters.find((center) => center.id === centerDraft.id)
        : nextCenters[0]

    if (!await persistAndSetCenters(nextCenters)) {
      return
    }

    if (savedCenter) {
      navigateToHash(buildPlanningCenterHash(savedCenter.id))
      return
    }

    navigateToHash(buildPlanningHomeHash())
  }

  const handleDeleteCenter = async (centerId) => {
    if (!await persistAndSetCenters(planningRepository.deleteCenter(planningCenters.value, centerId))) {
      return
    }
    navigateToHash(buildPlanningHomeHash())
  }

  const handleSaveGroup = async (groupDraft) => {
    const targetCenterId = currentCenter.value?.id || currentRoute.value.centerId
    if (!targetCenterId) {
      navigateToHash(buildPlanningHomeHash())
      return
    }

    const nextCenters = planningRepository.saveGroup(planningCenters.value, targetCenterId, groupDraft)
    if (!await persistAndSetCenters(nextCenters)) {
      return
    }

    const savedCenter = planningRepository.findCenter(nextCenters, targetCenterId)
    const savedGroup = groupDraft.id
      ? savedCenter?.groups.find((group) => group.id === groupDraft.id)
      : savedCenter?.groups[0]

    if (savedGroup) {
      const nextYear = resolvePlanningYear(currentRoute.value.year, getCurrentCalendarYear())
      navigateToHash(buildPlanningGroupHash(targetCenterId, savedGroup.id, nextYear))
      return
    }

    navigateToHash(buildPlanningCenterHash(targetCenterId))
  }

  const handleDeleteGroup = async ({ centerId, groupId }) => {
    if (!await persistAndSetCenters(planningRepository.deleteGroup(planningCenters.value, centerId, groupId))) {
      return
    }
    navigateToHash(buildPlanningCenterHash(centerId))
  }

  const handleSavePlan = async (planDraft) => {
    const targetCenterId = currentCenter.value?.id
    const targetGroupId = currentGroup.value?.id

    if (!targetCenterId || !targetGroupId) {
      navigateToHash(buildPlanningHomeHash())
      return
    }

    const nextCenters = planningRepository.savePlan(planningCenters.value, targetCenterId, targetGroupId, planDraft)
    if (!await persistAndSetCenters(nextCenters)) {
      return
    }

    const savedCenter = planningRepository.findCenter(nextCenters, targetCenterId)
    const savedGroup = savedCenter?.groups.find((group) => group.id === targetGroupId)
    const savedPlan = planDraft.id
      ? savedGroup?.plans.find((plan) => plan.id === planDraft.id)
      : savedGroup?.plans.find((plan) => Number(plan.planningYear) === Number(planDraft.planningYear))

    navigateToHash(
      buildPlanningGroupHash(
        targetCenterId,
        targetGroupId,
        savedPlan?.planningYear || planDraft.planningYear
      )
    )
  }

  const handleDeletePlan = async ({ centerId, groupId, planId, planningYear }) => {
    if (!await persistAndSetCenters(planningRepository.deletePlan(planningCenters.value, centerId, groupId, planId))) {
      return
    }
    if (planningYear) {
      navigateToHash(buildPlanningGroupHash(centerId, groupId, planningYear))
      return
    }

    navigateToHash(buildPlanningGroupHash(centerId, groupId))
  }

  const openPlanningHome = () => {
    if (currentGroup.value?.id && currentCenter.value?.id) {
      const returnYear = currentRoute.value.year || currentPlan.value?.planningYear

      if (returnYear) {
        navigateToHash(buildPlanningGroupHash(currentCenter.value.id, currentGroup.value.id, returnYear))
        return
      }

      navigateToHash(buildPlanningGroupHash(currentCenter.value.id, currentGroup.value.id))
      return
    }

    if (currentCenter.value?.id) {
      navigateToHash(buildPlanningCenterHash(currentCenter.value.id))
      return
    }

    navigateToHash(buildPlanningHomeHash())
  }

  const groupDraft = computed(() =>
    planningRepository.createGroupDraft({
      id: currentGroup.value?.id || '',
      name: currentGroup.value?.name || '',
      operatingWeekdays: currentCenter.value?.operatingWeekdays,
      defaultPaidHoursPerDay: currentGroup.value?.defaultPaidHoursPerDay ?? currentCenter.value?.defaultPaidHoursPerDay,
      defaultOccupancyPercent: currentGroup.value?.defaultOccupancyPercent ?? currentCenter.value?.defaultOccupancyPercent,
      defaultAdherencePercent: currentGroup.value?.defaultAdherencePercent ?? currentCenter.value?.defaultAdherencePercent
    })
  )

  watch(
    [planningCenters, currentRoute],
    ([centers, route]) => {
      if (workspaceHydrating.value) {
        return
      }

      if (route.app !== 'planning') {
        return
      }

      if (route.page === 'center') {
        const routeCenter = route.centerId ? planningRepository.findCenter(centers, route.centerId) : null

        if (route.centerId && !routeCenter) {
          navigateToHash(buildPlanningHomeHash())
          return
        }

        if (route.groupId && routeCenter && !planningRepository.findGroup(centers, route.centerId, route.groupId)) {
          navigateToHash(buildPlanningCenterHash(route.centerId))
          return
        }
      }

      if (route.page === 'forecasts') {
        const routeCenter = route.centerId ? planningRepository.findCenter(centers, route.centerId) : null

        if (route.centerId && !routeCenter) {
          navigateToHash(buildPlanningHomeHash())
          return
        }

        if (!routeCenter) {
          return
        }

        const firstGroup = routeCenter.groups?.[0]
        if (firstGroup?.id) {
          navigateToHash(buildPlanningGroupForecastsHash(routeCenter.id, firstGroup.id))
          return
        }

        navigateToHash(buildPlanningCenterHash(route.centerId))
      }

      if (route.page === 'group-forecasts') {
        const routeCenter = route.centerId ? planningRepository.findCenter(centers, route.centerId) : null

        if (route.centerId && !routeCenter) {
          navigateToHash(buildPlanningHomeHash())
          return
        }

        if (route.groupId && routeCenter && !planningRepository.findGroup(centers, route.centerId, route.groupId)) {
          navigateToHash(buildPlanningCenterHash(route.centerId))
        }
      }

      if (route.page === 'editor') {
        const routeCenter = route.centerId
          ? planningRepository.findCenter(centers, route.centerId)
          : route.planId && route.planId !== 'new'
            ? planningRepository.findCenterByPlanId(centers, route.planId)
            : null

        const routeGroup = route.groupId
          ? routeCenter && planningRepository.findGroup(centers, routeCenter.id, route.groupId)
          : route.planId && route.planId !== 'new'
            ? planningRepository.findGroupByPlanId(centers, route.planId)
            : null

        if (!routeCenter || !routeGroup) {
          navigateToHash(buildPlanningHomeHash())
          return
        }

        if (route.planId !== 'new' && !routeGroup.plans.some((plan) => plan.id === route.planId)) {
          navigateToHash(buildPlanningGroupHash(routeCenter.id, routeGroup.id))
        }
      }
    },
    { immediate: false }
  )

  return {
    planningCenters,
    currentCenter,
    currentGroup,
    currentPlan,
    plannerSeed,
    forecastSeed,
    groupDraft,
    groupDraftKey,
    plannerDraftKey,
    monthlyPlannerKey,
    loadCentersForScope,
    workspaceHydrating,
    workspaceSaveError,
    clearCenters,
    handleSaveCenter,
    handleDeleteCenter,
    handleSaveGroup,
    handleDeleteGroup,
    handleSavePlan,
    handleDeletePlan,
    openPlanningHome
  }
}
