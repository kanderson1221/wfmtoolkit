import { computed, ref, watch } from 'vue'

import {
  findPlanningCenter,
  findPlanningCenterByPlanId,
  findPlanningPlan,
  loadPlanningCenters,
  persistPlanningCenters,
  removePlanningCenter,
  removePlanningPlan,
  upsertPlanningCenter,
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

    if (currentRoute.value.page === 'editor' && currentRoute.value.planId && currentRoute.value.planId !== 'new') {
      return findPlanningCenterByPlanId(planningCenters.value, currentRoute.value.planId)
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

    if (!currentCenter.value || !currentRoute.value.planId) {
      return null
    }

    return findPlanningPlan(planningCenters.value, currentCenter.value.id, currentRoute.value.planId)
  })

  const plannerSeed = computed(() => {
    if (!currentCenter.value) {
      return null
    }

    return {
      centerId: currentCenter.value.id,
      planningYear: new Date().getFullYear(),
      operatingWeekdays: [...currentCenter.value.operatingWeekdays],
      presenceMonths: Array.from({ length: 12 }, () => ({
        paidHoursPerDay: currentCenter.value.defaultPaidHoursPerDay
      })),
      randomDefaults: {
        occupancyPercent: currentCenter.value.defaultOccupancyPercent,
        adherencePercent: currentCenter.value.defaultAdherencePercent
      }
    }
  })

  const plannerDraftKey = computed(() => {
    const scopePrefix = currentUser.value?.id || 'anon'

    if (currentPlan.value?.id) {
      return `${scopePrefix}:${currentPlan.value.id}`
    }

    if (currentRoute.value.page === 'editor' && currentCenter.value?.id) {
      return `${scopePrefix}:${currentCenter.value.id}-new`
    }

    return `${scopePrefix}:new`
  })

  const monthlyPlannerKey = computed(() => {
    if (currentRoute.value.page !== 'editor') {
      return 'planner-empty'
    }

    if (currentPlan.value?.id) {
      return `planner-${currentPlan.value.id}-${currentPlan.value.updatedAt || 'draft'}`
    }

    return `planner-${currentCenter.value?.id || 'no-center'}-new`
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

  const handleSavePlan = (planDraft) => {
    const targetCenterId = currentCenter.value?.id
    if (!targetCenterId) {
      window.location.hash = '#planning'
      return
    }

    persistAndSetCenters(upsertPlanningPlan(planningCenters.value, targetCenterId, planDraft))
    window.location.hash = `#planning/center/${targetCenterId}`
  }

  const handleDeletePlan = ({ centerId, planId }) => {
    persistAndSetCenters(removePlanningPlan(planningCenters.value, centerId, planId))
    window.location.hash = `#planning/center/${centerId}`
  }

  const openPlanningHome = () => {
    if (currentCenter.value?.id) {
      window.location.hash = `#planning/center/${currentCenter.value.id}`
      return
    }

    window.location.hash = '#planning'
  }

  watch(
    [planningCenters, currentRoute],
    ([centers, route]) => {
      if (route.app !== 'planning') {
        return
      }

      if (route.page === 'center' && route.centerId && !findPlanningCenter(centers, route.centerId)) {
        window.location.hash = '#planning'
        return
      }

      if (route.page === 'editor') {
        const routeCenter = route.centerId
          ? findPlanningCenter(centers, route.centerId)
          : route.planId && route.planId !== 'new'
            ? findPlanningCenterByPlanId(centers, route.planId)
            : null

        if (!routeCenter) {
          window.location.hash = '#planning'
          return
        }

        if (route.planId !== 'new' && !routeCenter.plans.some((plan) => plan.id === route.planId)) {
          window.location.hash = `#planning/center/${routeCenter.id}`
        }
      }
    },
    { immediate: false }
  )

  return {
    planningCenters,
    currentCenter,
    currentPlan,
    plannerSeed,
    plannerDraftKey,
    monthlyPlannerKey,
    loadCentersForScope,
    clearCenters,
    handleSaveCenter,
    handleDeleteCenter,
    handleSavePlan,
    handleDeletePlan,
    openPlanningHome
  }
}
