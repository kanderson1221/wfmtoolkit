<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import { AUTH_BYPASS_ENABLED } from './authMode'
import { useAuthSession } from './composables/useAuthSession'
import { useHashNavigation } from './composables/useHashNavigation'
import { usePlanningWorkspace } from './composables/usePlanningWorkspace'
import { isSupabaseConfigured } from './supabaseClient'

const CalculatorApp = defineAsyncComponent(() => import('./components/CalculatorApp.vue'))
const MonthlyPlanBuilder = defineAsyncComponent(() => import('./components/MonthlyPlanBuilder.vue'))
const PlanningCenterView = defineAsyncComponent(() => import('./components/planning/PlanningCenterView.vue'))
const PlanningHome = defineAsyncComponent(() => import('./components/PlanningHome.vue'))
const PublicLandingPage = defineAsyncComponent(() => import('./components/PublicLandingPage.vue'))
const authAvailable = isSupabaseConfigured && !AUTH_BYPASS_ENABLED

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
  currentUser,
  isAuthenticated,
  hasWorkspaceAccess,
  handleSignOut
} = auth
const { currentHash, currentRoute, pendingRouteHash, syncRouteFromHash } = useHashNavigation()

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

const appMainRef = ref(null)
let previousScrollRestoration = null
const showPublicLanding = computed(() => !currentHash.value || currentHash.value === '#home')

const resetScrollPosition = () => {
  appMainRef.value?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' })

  if (document.scrollingElement) {
    document.scrollingElement.scrollTop = 0
    document.scrollingElement.scrollLeft = 0
  }

  document.documentElement.scrollTop = 0
  document.documentElement.scrollLeft = 0
  document.body.scrollTop = 0
  document.body.scrollLeft = 0
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

const scheduleScrollReset = async () => {
  await nextTick()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resetScrollPosition()
    })
  })
}

watch(
  currentRoute,
  () => {
    void scheduleScrollReset()
  },
  { flush: 'post' }
)

onMounted(() => {
  if ('scrollRestoration' in window.history) {
    previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
  }

  auth.initializeAuth({
    loadCentersForScope,
    clearCenters,
    syncRouteFromHash,
    pendingRouteHash
  })

  void scheduleScrollReset()
})

onBeforeUnmount(() => {
  if ('scrollRestoration' in window.history && previousScrollRestoration) {
    window.history.scrollRestoration = previousScrollRestoration
  }

  auth.disposeAuth()
})
</script>

<template>
  <PublicLandingPage
    v-if="showPublicLanding"
    :auth-configured="authAvailable"
    :is-authenticated="isAuthenticated"
    :user-email="currentUser?.email || ''"
  />

  <div v-else class="app-shell">
    <AppHeader
      :current-app="currentRoute.app"
      :is-authenticated="isAuthenticated"
      :user-email="currentUser?.email || ''"
      :auth-configured="authAvailable"
      :auth-bypass-enabled="AUTH_BYPASS_ENABLED"
      @sign-out="handleSignOut"
    />

    <main ref="appMainRef" class="app-main">
      <CalculatorApp
        v-if="currentRoute.app === 'calculators'"
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
