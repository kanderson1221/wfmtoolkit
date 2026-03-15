<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import AppHome from './components/AppHome.vue'
import { defaultRoute, parseHashRoute } from './appRoutes'
import CalculatorApp from './components/CalculatorApp.vue'
import MonthlyPlanBuilder from './components/MonthlyPlanBuilder.vue'
import PlanningCenterView from './components/planning/PlanningCenterView.vue'
import PlanningHome from './components/PlanningHome.vue'
import {
  findPlanningCenter,
  findPlanningCenterByPlanId,
  loadPlanningCenters,
  persistPlanningCenters,
  removePlanningCenter,
  removePlanningPlan,
  upsertPlanningCenter,
  upsertPlanningPlan
} from './planningStorage'

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

const currentRoute = ref(defaultRoute)
const planningCenters = ref([])

const syncRouteFromHash = () => {
  currentRoute.value = parseHashRoute(window.location.hash)
}

const persistAndSetCenters = (centers) => {
  planningCenters.value = centers
  persistPlanningCenters(centers)
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

  return currentCenter.value?.plans.find((plan) => plan.id === currentRoute.value.planId) || null
})

const plannerSeed = computed(() => {
  if (!currentCenter.value) {
    return null
  }

  return {
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
  if (currentPlan.value?.id) {
    return currentPlan.value.id
  }

  if (currentRoute.value.page === 'editor' && currentCenter.value?.id) {
    return `${currentCenter.value.id}-new`
  }

  return 'new'
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

onMounted(() => {
  planningCenters.value = loadPlanningCenters()
  syncRouteFromHash()
  window.addEventListener('hashchange', syncRouteFromHash)
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncRouteFromHash)
})
</script>

<template>
  <div class="app-shell">
    <AppHeader :current-app="currentRoute.app" />

    <main class="app-main">
      <AppHome v-if="currentRoute.app === 'home'" />

      <CalculatorApp
        v-else-if="currentRoute.app === 'calculators'"
        :active-tool="currentRoute.tool || 'interval'"
      />

      <PlanningHome
        v-else-if="currentRoute.app === 'planning' && currentRoute.page === 'home'"
        :centers="planningCenters"
        :weekday-options="WEEKDAY_OPTIONS"
        @save-center="handleSaveCenter"
        @delete-center="handleDeleteCenter"
      />

      <PlanningCenterView
        v-else-if="currentRoute.app === 'planning' && currentRoute.page === 'center' && currentCenter"
        :center="currentCenter"
        :weekday-options="WEEKDAY_OPTIONS"
        @save-center="handleSaveCenter"
        @delete-plan="handleDeletePlan"
      />

      <MonthlyPlanBuilder
        v-else-if="currentRoute.app === 'planning' && currentRoute.page === 'editor' && currentCenter && (currentRoute.planId === 'new' || currentPlan)"
        :key="monthlyPlannerKey"
        :initial-plan="currentPlan"
        :center-defaults="plannerSeed"
        :draft-key="plannerDraftKey"
        @cancel="openPlanningHome"
        @save="handleSavePlan"
      />

      <PlanningHome
        v-else
        :centers="planningCenters"
        :weekday-options="WEEKDAY_OPTIONS"
        @save-center="handleSaveCenter"
        @delete-center="handleDeleteCenter"
      />
    </main>

    <AppFooter />
  </div>
</template>
