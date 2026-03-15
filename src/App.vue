<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import AppHome from './components/AppHome.vue'
import { defaultRoute, parseHashRoute } from './appRoutes'
import CalculatorApp from './components/CalculatorApp.vue'
import MonthlyPlanBuilder from './components/MonthlyPlanBuilder.vue'
import PlanningHome from './components/PlanningHome.vue'
import { loadPlannerPlans, persistPlannerPlans, upsertPlannerPlan } from './planningStorage'

const currentRoute = ref(defaultRoute)
const savedPlans = ref([])

const syncRouteFromHash = () => {
  currentRoute.value = parseHashRoute(window.location.hash)
}

const persistAndSetPlans = (plans) => {
  savedPlans.value = plans
  persistPlannerPlans(plans)
}

const handleSavePlan = (planDraft) => {
  persistAndSetPlans(upsertPlannerPlan(savedPlans.value, planDraft))
  window.location.hash = '#planning'
}

const handleDeletePlan = (planId) => {
  persistAndSetPlans(savedPlans.value.filter((plan) => plan.id !== planId))
  window.location.hash = '#planning'
}

const openPlanningHome = () => {
  window.location.hash = '#planning'
}

const currentPlan = computed(() => {
  if (currentRoute.value.app !== 'planning' || currentRoute.value.page !== 'editor') {
    return null
  }

  if (currentRoute.value.planId === 'new') {
    return null
  }

  return savedPlans.value.find((plan) => plan.id === currentRoute.value.planId) || null
})

const monthlyPlannerKey = computed(() => {
  if (currentRoute.value.planId === 'new') {
    return 'planner-new'
  }

  return `planner-${currentRoute.value.planId || 'empty'}-${currentPlan.value?.updatedAt || 'draft'}`
})

watch(
  [savedPlans, currentRoute],
  ([plans, route]) => {
    if (route.app !== 'planning' || route.page !== 'editor' || route.planId === 'new') {
      return
    }

    const exists = plans.some((plan) => plan.id === route.planId)
    if (!exists) {
      window.location.hash = '#planning'
    }
  },
  { immediate: false }
)

onMounted(() => {
  savedPlans.value = loadPlannerPlans()
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
        :plans="savedPlans"
        @delete-plan="handleDeletePlan"
      />

      <MonthlyPlanBuilder
        v-else-if="currentRoute.app === 'planning' && currentRoute.page === 'editor' && (currentRoute.planId === 'new' || currentPlan)"
        :key="monthlyPlannerKey"
        :initial-plan="currentPlan"
        @cancel="openPlanningHome"
        @save="handleSavePlan"
      />

      <PlanningHome v-else :plans="savedPlans" @delete-plan="handleDeletePlan" />
    </main>

    <AppFooter />
  </div>
</template>
