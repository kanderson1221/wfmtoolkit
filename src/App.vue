<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import AppHome from './components/AppHome.vue'
import { defaultRoute, parseHashRoute } from './appRoutes'
import { AUTH_BYPASS_ENABLED } from './authMode'
import CalculatorApp from './components/CalculatorApp.vue'
import MonthlyPlanBuilder from './components/MonthlyPlanBuilder.vue'
import PlanningCenterView from './components/planning/PlanningCenterView.vue'
import PlanningHome from './components/PlanningHome.vue'
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
} from './planningStorage'
import { isSupabaseConfigured, supabase } from './supabaseClient'

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
const authReady = ref(false)
const authSession = ref(null)
const pendingRouteHash = ref('')
let authSubscription = null

const currentUser = computed(() => authSession.value?.user || null)
const authGateEnabled = computed(() => isSupabaseConfigured && !AUTH_BYPASS_ENABLED)
const isAuthenticated = computed(() => Boolean(currentUser.value))
const hasWorkspaceAccess = computed(() => AUTH_BYPASS_ENABLED || isAuthenticated.value)
const storageScope = computed(() => currentUser.value?.id || 'default')

const syncRouteFromHash = () => {
  const nextRoute = parseHashRoute(window.location.hash)

  if (!authReady.value) {
    currentRoute.value = defaultRoute
    return
  }

  if (!authGateEnabled.value) {
    if (nextRoute.app === 'home') {
      if (window.location.hash !== '#planning') {
        window.location.hash = '#planning'
        return
      }
    }

    currentRoute.value = nextRoute.app === 'home' ? parseHashRoute('#planning') : nextRoute
    return
  }

  if (!isAuthenticated.value) {
    if (nextRoute.app !== 'home') {
      pendingRouteHash.value = window.location.hash || '#planning'
      if (window.location.hash !== '#home') {
        window.location.hash = '#home'
        return
      }
    }

    currentRoute.value = defaultRoute
    return
  }

  if (nextRoute.app === 'home') {
    const targetHash = pendingRouteHash.value && pendingRouteHash.value !== '#home' ? pendingRouteHash.value : '#planning'
    pendingRouteHash.value = ''
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash
      return
    }
  }

  currentRoute.value = nextRoute
}

const persistAndSetCenters = (centers) => {
  planningCenters.value = centers
  if (hasWorkspaceAccess.value) {
    persistPlanningCenters(centers, storageScope.value)
  }
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

const handleSignOut = async () => {
  if (!supabase) {
    return
  }

  await supabase.auth.signOut()
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
  window.addEventListener('hashchange', syncRouteFromHash)

  if (!authGateEnabled.value || !supabase) {
    planningCenters.value = loadPlanningCenters(storageScope.value)
    authReady.value = true
    syncRouteFromHash()
    return
  }

  supabase.auth.getSession().then(({ data }) => {
    authSession.value = data.session
    planningCenters.value = data.session?.user ? loadPlanningCenters(data.session.user.id) : []
    authReady.value = true
    syncRouteFromHash()
  })

  const authListener = supabase.auth.onAuthStateChange((_event, session) => {
    authSession.value = session
    planningCenters.value = session?.user ? loadPlanningCenters(session.user.id) : []

    if (!session?.user && window.location.hash !== '#home') {
      pendingRouteHash.value = window.location.hash
      window.location.hash = '#home'
      return
    }

    if (session?.user && (window.location.hash === '#home' || !window.location.hash)) {
      const targetHash = pendingRouteHash.value && pendingRouteHash.value !== '#home' ? pendingRouteHash.value : '#planning'
      pendingRouteHash.value = ''
      window.location.hash = targetHash
      return
    }

    syncRouteFromHash()
  })

  authSubscription = authListener.data.subscription
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncRouteFromHash)
  authSubscription?.unsubscribe()
})
</script>

<template>
  <div class="app-shell">
    <AppHeader
      :current-app="currentRoute.app"
      :is-authenticated="hasWorkspaceAccess"
      :user-email="currentUser?.email || ''"
      :auth-configured="isSupabaseConfigured"
      :auth-bypass-enabled="AUTH_BYPASS_ENABLED"
      @sign-out="handleSignOut"
    />

    <main class="app-main">
      <AppHome v-if="!authReady || (authGateEnabled && (!isAuthenticated || currentRoute.app === 'home'))" />

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
