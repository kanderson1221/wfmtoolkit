import { computed, ref, watch } from 'vue'

import {
  createPlanningGroupDraft,
  findPlanningCenter,
  findPlanningCenterByPlanId,
  findPlanningGroup,
  findPlanningGroupByPlanId,
  findPlanningPlan,
  loadPlanningCenters,
  persistPlanningCenters,
  removePlanningCenter,
  removePlanningGroup,
  removePlanningPlan,
  upsertPlanningCenter,
  upsertPlanningGroup,
  upsertPlanningPlan
} from '../planningStorage'

export const usePlanningWorkspace = ({ currentRoute, currentUser, hasWorkspaceAccess, storageScope }) => {
  const planningCenters = ref([])

  const persistAndSetCenters = (centers) => {
    planningCenters.value = centers
    if (hasWorkspaceAccess.value) {
      persistPlanningCenters(centers, storageScope.value)
    }
  }

  const loadCentersForScope = (scope = storageScope.value) => {
    planningCenters.value = loadPlanningCenters(scope)
  }

  const clearCenters = () => {
    planningCenters.value = []
  }

  const currentCenter = computed(() => {
    if (currentRoute.value.app !== 'planning') {
      return null
    }

    if (currentRoute.value.centerId) {
      return findPlanningCenter(planningCenters.value, currentRoute.value.centerId)
    }

    if (currentRoute.value.planId && currentRoute.value.planId !== 'new') {
      return findPlanningCenterByPlanId(planningCenters.value, currentRoute.value.planId)
    }

    return null
  })

  const currentGroup = computed(() => {
    if (currentRoute.value.app !== 'planning') {
      return null
    }

    if (currentRoute.value.centerId && currentRoute.value.groupId) {
      return findPlanningGroup(planningCenters.value, currentRoute.value.centerId, currentRoute.value.groupId)
    }

    if (currentRoute.value.page === 'editor' && currentRoute.value.planId && currentRoute.value.planId !== 'new') {
      return findPlanningGroupByPlanId(planningCenters.value, currentRoute.value.planId)
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

    return findPlanningPlan(
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

    const routePlanningYear = Number(currentRoute.value.year)
    const resolvedPlanningYear = Number.isFinite(routePlanningYear)
      ? routePlanningYear
      : currentPlan.value?.planningYear || new Date().getFullYear()

    return {
      centerId: currentCenter.value.id,
      centerName: currentCenter.value.name,
      groupId: currentGroup.value.id,
      groupName: currentGroup.value.name,
      timezone: currentCenter.value.timezone,
      planningYear: resolvedPlanningYear,
      operatingWeekdays: [...(currentGroup.value.operatingWeekdays || currentCenter.value.operatingWeekdays)],
      defaultPaidHoursPerDay: currentGroup.value.defaultPaidHoursPerDay ?? currentCenter.value.defaultPaidHoursPerDay,
      defaultOccupancyPercent: currentGroup.value.defaultOccupancyPercent ?? currentCenter.value.defaultOccupancyPercent,
      defaultAdherencePercent: currentGroup.value.defaultAdherencePercent ?? currentCenter.value.defaultAdherencePercent,
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
    const scopePrefix = currentUser.value?.id || 'anon'

    if (currentGroup.value?.id) {
      return `${scopePrefix}:group:${currentGroup.value.id}`
    }

    return `${scopePrefix}:group:new`
  })

  const plannerDraftKey = computed(() => {
    const scopePrefix = currentUser.value?.id || 'anon'

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
      return `planner-${currentPlan.value.id}-${currentPlan.value.updatedAt || 'draft'}`
    }

    return `planner-${currentGroup.value?.id || 'no-group'}-new-${currentRoute.value.year || 'default'}`
  })

  const handleSaveCenter = (centerDraft) => {
    const nextCenters = upsertPlanningCenter(planningCenters.value, centerDraft)
    const savedCenter =
      centerDraft.id
        ? nextCenters.find((center) => center.id === centerDraft.id)
        : nextCenters[0]

    persistAndSetCenters(nextCenters)

    if (savedCenter) {
      window.location.hash = `#planning/center/${savedCenter.id}`
      return
    }

    window.location.hash = '#planning'
  }

  const handleDeleteCenter = (centerId) => {
    persistAndSetCenters(removePlanningCenter(planningCenters.value, centerId))
    window.location.hash = '#planning'
  }

  const handleSaveGroup = (groupDraft) => {
    const targetCenterId = currentCenter.value?.id || currentRoute.value.centerId
    if (!targetCenterId) {
      window.location.hash = '#planning'
      return
    }

    const nextCenters = upsertPlanningGroup(planningCenters.value, targetCenterId, groupDraft)
    persistAndSetCenters(nextCenters)

    const savedCenter = findPlanningCenter(nextCenters, targetCenterId)
    const savedGroup = groupDraft.id
      ? savedCenter?.groups.find((group) => group.id === groupDraft.id)
      : savedCenter?.groups[0]

    if (savedGroup) {
      const nextYear = currentRoute.value.year || new Date().getFullYear()
      window.location.hash = `#planning/center/${targetCenterId}/group/${savedGroup.id}/year/${nextYear}`
      return
    }

    window.location.hash = `#planning/center/${targetCenterId}`
  }

  const handleDeleteGroup = ({ centerId, groupId }) => {
    persistAndSetCenters(removePlanningGroup(planningCenters.value, centerId, groupId))
    window.location.hash = `#planning/center/${centerId}`
  }

  const handleSavePlan = (planDraft) => {
    const targetCenterId = currentCenter.value?.id
    const targetGroupId = currentGroup.value?.id

    if (!targetCenterId || !targetGroupId) {
      window.location.hash = '#planning'
      return
    }

    persistAndSetCenters(upsertPlanningPlan(planningCenters.value, targetCenterId, targetGroupId, planDraft))
    window.location.hash = `#planning/center/${targetCenterId}/group/${targetGroupId}/year/${planDraft.planningYear}`
  }

  const handleDeletePlan = ({ centerId, groupId, planId, planningYear }) => {
    persistAndSetCenters(removePlanningPlan(planningCenters.value, centerId, groupId, planId))
    if (planningYear) {
      window.location.hash = `#planning/center/${centerId}/group/${groupId}/year/${planningYear}`
      return
    }

    window.location.hash = `#planning/center/${centerId}/group/${groupId}`
  }

  const openPlanningHome = () => {
    if (currentGroup.value?.id && currentCenter.value?.id) {
      const returnYear = currentRoute.value.year || currentPlan.value?.planningYear

      if (returnYear) {
        window.location.hash = `#planning/center/${currentCenter.value.id}/group/${currentGroup.value.id}/year/${returnYear}`
        return
      }

      window.location.hash = `#planning/center/${currentCenter.value.id}/group/${currentGroup.value.id}`
      return
    }

    if (currentCenter.value?.id) {
      window.location.hash = `#planning/center/${currentCenter.value.id}`
      return
    }

    window.location.hash = '#planning'
  }

  const groupDraft = computed(() =>
    createPlanningGroupDraft({
      id: currentGroup.value?.id || '',
      name: currentGroup.value?.name || '',
      operatingWeekdays: currentGroup.value?.operatingWeekdays || currentCenter.value?.operatingWeekdays,
      defaultPaidHoursPerDay: currentGroup.value?.defaultPaidHoursPerDay ?? currentCenter.value?.defaultPaidHoursPerDay,
      defaultOccupancyPercent: currentGroup.value?.defaultOccupancyPercent ?? currentCenter.value?.defaultOccupancyPercent,
      defaultAdherencePercent: currentGroup.value?.defaultAdherencePercent ?? currentCenter.value?.defaultAdherencePercent
    })
  )

  watch(
    [planningCenters, currentRoute],
    ([centers, route]) => {
      if (route.app !== 'planning') {
        return
      }

      if (route.page === 'center') {
        const routeCenter = route.centerId ? findPlanningCenter(centers, route.centerId) : null

        if (route.centerId && !routeCenter) {
          window.location.hash = '#planning'
          return
        }

        if (route.groupId && routeCenter && !findPlanningGroup(centers, route.centerId, route.groupId)) {
          window.location.hash = `#planning/center/${route.centerId}`
          return
        }
      }

      if (route.page === 'editor') {
        const routeCenter = route.centerId
          ? findPlanningCenter(centers, route.centerId)
          : route.planId && route.planId !== 'new'
            ? findPlanningCenterByPlanId(centers, route.planId)
            : null

        const routeGroup = route.groupId
          ? routeCenter && findPlanningGroup(centers, routeCenter.id, route.groupId)
          : route.planId && route.planId !== 'new'
            ? findPlanningGroupByPlanId(centers, route.planId)
            : null

        if (!routeCenter || !routeGroup) {
          window.location.hash = '#planning'
          return
        }

        if (route.planId !== 'new' && !routeGroup.plans.some((plan) => plan.id === route.planId)) {
          window.location.hash = `#planning/center/${routeCenter.id}/group/${routeGroup.id}`
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
