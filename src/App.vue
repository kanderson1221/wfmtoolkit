<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'

import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import { AUTH_BYPASS_ENABLED } from './authMode'
import { useHashNavigation } from './composables/useHashNavigation'
import { usePlanningWorkspace } from './composables/usePlanningWorkspace'
import { isSupabaseConfigured, supabase } from './supabaseClient'

const AppHome = defineAsyncComponent(() => import('./components/AppHome.vue'))
const CalculatorApp = defineAsyncComponent(() => import('./components/CalculatorApp.vue'))
const MonthlyPlanBuilder = defineAsyncComponent(() => import('./components/MonthlyPlanBuilder.vue'))
const PlanningCenterView = defineAsyncComponent(() => import('./components/planning/PlanningCenterView.vue'))
const PlanningHome = defineAsyncComponent(() => import('./components/PlanningHome.vue'))

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

const authReady = ref(false)
const authSession = ref(null)
let authSubscription = null

const currentUser = computed(() => authSession.value?.user || null)
const authGateEnabled = computed(() => isSupabaseConfigured && !AUTH_BYPASS_ENABLED)
const isAuthenticated = computed(() => Boolean(currentUser.value))
const hasWorkspaceAccess = computed(() => AUTH_BYPASS_ENABLED || isAuthenticated.value)
const storageScope = computed(() => currentUser.value?.id || 'default')
const { currentRoute, pendingRouteHash, syncRouteFromHash } = useHashNavigation({
  authReady,
  authGateEnabled,
  isAuthenticated
})

const {
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
} = usePlanningWorkspace({
  currentRoute,
  currentUser,
  hasWorkspaceAccess,
  storageScope
})

const handleSignOut = async () => {
  if (!supabase) {
    return
  }

  await supabase.auth.signOut()
}

onMounted(() => {
  if (!authGateEnabled.value || !supabase) {
    loadCentersForScope(storageScope.value)
    authReady.value = true
    syncRouteFromHash()
    return
  }

  supabase.auth.getSession().then(({ data }) => {
    authSession.value = data.session
    if (data.session?.user) {
      loadCentersForScope(data.session.user.id)
    } else {
      clearCenters()
    }
    authReady.value = true
    syncRouteFromHash()
  })

  const authListener = supabase.auth.onAuthStateChange((_event, session) => {
    authSession.value = session
    if (session?.user) {
      loadCentersForScope(session.user.id)
    } else {
      clearCenters()
    }

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
