<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted } from 'vue'

import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import { AUTH_BYPASS_ENABLED } from './authMode'
import { useAuthSession } from './composables/useAuthSession'
import { useHashNavigation } from './composables/useHashNavigation'
import { usePlanningWorkspace } from './composables/usePlanningWorkspace'
import { isSupabaseConfigured } from './supabaseClient'

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

const auth = useAuthSession()
const {
  authReady,
  currentUser,
  authGateEnabled,
  isAuthenticated,
  hasWorkspaceAccess,
  handleSignOut
} = auth
const { currentRoute, pendingRouteHash, syncRouteFromHash } = useHashNavigation({
  authReady,
  authGateEnabled,
  isAuthenticated
})

const {
  planningCenters,
  currentCenter,
  currentGroup,
  currentPlan,
  plannerSeed,
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
} = usePlanningWorkspace({
  currentRoute,
  currentUser,
  hasWorkspaceAccess,
  storageScope: auth.storageScope
})

onMounted(() => {
  auth.initializeAuth({
    loadCentersForScope,
    clearCenters,
    syncRouteFromHash,
    pendingRouteHash
  })
})

onBeforeUnmount(() => {
  auth.disposeAuth()
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
        v-else-if="currentRoute.app === 'planning' && currentCenter && currentRoute.page === 'center'"
        :center="currentCenter"
        :selected-group-id="currentRoute.groupId"
        :selected-year="currentRoute.year"
        :weekday-options="WEEKDAY_OPTIONS"
        @save-center="handleSaveCenter"
        @save-group="handleSaveGroup"
        @delete-group="handleDeleteGroup"
        @delete-plan="handleDeletePlan"
      />

      <MonthlyPlanBuilder
        v-else-if="currentRoute.app === 'planning' && currentRoute.page === 'editor' && currentCenter && currentGroup && (currentRoute.planId === 'new' || currentPlan)"
        :key="monthlyPlannerKey"
        :initial-plan="currentPlan"
        :center-defaults="plannerSeed"
        :group-plans="currentGroup?.plans || []"
        :prefilled-year="currentRoute.year"
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
