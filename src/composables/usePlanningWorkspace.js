import { computed, ref, watch } from 'vue'
import {
  buildPlanningCenterHash,
  buildPlanningGroupHash,
  buildPlanningHomeHash,
  buildPlanningPlanHash,
  navigateToHash
} from '../appRoutes'
import {
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_SCHEDULE_CLOSED,
  normalizeHolidayScheduleMode
} from '../planner/holidayCalendars'
import { findLinkedPriorPlan, getCurrentCalendarYear, resolveLinkedOpeningPosition, resolvePlanningYear } from '../plannerModel'
import { resolveCenterHolidayProfile } from '../planningStorage'
import { planningRepository } from '../planningRepository'

export const usePlanningWorkspace = ({ currentRoute, currentUser, hasWorkspaceAccess, storageScope }) => {
  const planningCenters = ref([])
  const workspaceHydrating = ref(false)

  const persistAndSetCenters = (centers) => {
    const nextCenters =
      hasWorkspaceAccess.value
        ? planningRepository.persistWorkspace(centers, storageScope.value) || centers
        : centers

    planningCenters.value = Array.isArray(nextCenters) ? nextCenters : centers
  }

  const loadCentersForScope = async (scope = storageScope.value, options = {}) => {
    workspaceHydrating.value = true
    planningCenters.value = planningRepository.loadWorkspace(scope)

    try {
      if (typeof planningRepository.hydrateWorkspace === 'function') {
        const hydratedCenters = await planningRepository.hydrateWorkspace(scope, options)

        if (Array.isArray(hydratedCenters)) {
          planningCenters.value = hydratedCenters
        }
      }

      return planningCenters.value
    } finally {
      workspaceHydrating.value = false
    }
  }

  const clearCenters = () => {
    workspaceHydrating.value = false
    planningCenters.value = []
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

    return {
      centerId: currentCenter.value.id,
      centerName: currentCenter.value.name,
      groupId: currentGroup.value.id,
      groupName: currentGroup.value.name,
      timezone: currentCenter.value.timezone,
      planningYear: resolvedPlanningYear,
      defaultHolidayCalendarId: centerHolidayCalendarId,
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
      }
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

  const handleSaveCenter = (centerDraft) => {
    const nextCenters = planningRepository.saveCenter(planningCenters.value, centerDraft)
    const savedCenter =
      centerDraft.id
        ? nextCenters.find((center) => center.id === centerDraft.id)
        : nextCenters[0]

    persistAndSetCenters(nextCenters)

    if (savedCenter) {
      navigateToHash(buildPlanningCenterHash(savedCenter.id))
      return
    }

    navigateToHash(buildPlanningHomeHash())
  }

  const handleDeleteCenter = (centerId) => {
    persistAndSetCenters(planningRepository.deleteCenter(planningCenters.value, centerId))
    navigateToHash(buildPlanningHomeHash())
  }

  const handleSaveGroup = (groupDraft) => {
    const targetCenterId = currentCenter.value?.id || currentRoute.value.centerId
    if (!targetCenterId) {
      navigateToHash(buildPlanningHomeHash())
      return
    }

    const nextCenters = planningRepository.saveGroup(planningCenters.value, targetCenterId, groupDraft)
    persistAndSetCenters(nextCenters)

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

  const handleDeleteGroup = ({ centerId, groupId }) => {
    persistAndSetCenters(planningRepository.deleteGroup(planningCenters.value, centerId, groupId))
    navigateToHash(buildPlanningCenterHash(centerId))
  }

  const handleSavePlan = (planDraft) => {
    const targetCenterId = currentCenter.value?.id
    const targetGroupId = currentGroup.value?.id

    if (!targetCenterId || !targetGroupId) {
      navigateToHash(buildPlanningHomeHash())
      return
    }

    const nextCenters = planningRepository.savePlan(planningCenters.value, targetCenterId, targetGroupId, planDraft)
    persistAndSetCenters(nextCenters)

    const savedCenter = planningRepository.findCenter(nextCenters, targetCenterId)
    const savedGroup = savedCenter?.groups.find((group) => group.id === targetGroupId)
    const savedPlan = planDraft.id
      ? savedGroup?.plans.find((plan) => plan.id === planDraft.id)
      : savedGroup?.plans.find((plan) => Number(plan.planningYear) === Number(planDraft.planningYear))

    if (savedPlan?.id) {
      navigateToHash(buildPlanningPlanHash(targetCenterId, targetGroupId, savedPlan.id))
      return
    }

    navigateToHash(buildPlanningGroupHash(targetCenterId, targetGroupId, planDraft.planningYear))
  }

  const handleDeletePlan = ({ centerId, groupId, planId, planningYear }) => {
    persistAndSetCenters(planningRepository.deletePlan(planningCenters.value, centerId, groupId, planId))
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
    groupDraft,
    groupDraftKey,
    plannerDraftKey,
    monthlyPlannerKey,
    loadCentersForScope,
    workspaceHydrating,
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
