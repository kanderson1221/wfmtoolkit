<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import LocalDataStorageDialog from './components/LocalDataStorageDialog.vue'
import AppStatusMessage from './components/ui/AppStatusMessage.vue'
import { isPublicHomeHash } from './appRoutes'
import { useHashNavigation } from './composables/useHashNavigation'
import { usePlanningWorkspace } from './composables/usePlanningWorkspace'
import { ensureLegacyLocalStorageMigrated } from './storage/localDataStore'

const CalculatorApp = defineAsyncComponent(() => import('./components/CalculatorApp.vue'))
const MonthlyPlanBuilder = defineAsyncComponent(() => import('./components/MonthlyPlanBuilder.vue'))
const PlanningCenterView = defineAsyncComponent(() => import('./components/planning/PlanningCenterView.vue'))
const PlanningGroupForecastsView = defineAsyncComponent(() => import('./components/planning/PlanningGroupForecastsView.vue'))
const PlanningHome = defineAsyncComponent(() => import('./components/PlanningHome.vue'))
const PublicLandingPage = defineAsyncComponent(() => import('./components/PublicLandingPage.vue'))

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

const { currentHash, currentRoute, syncRouteFromHash } = useHashNavigation()
const currentUser = ref(null)
const storageScope = computed(() => 'default')

const {
  planningCenters,
  currentCenter,
  currentGroup,
  currentPlan,
  plannerSeed,
  forecastSeed,
  plannerDraftKey,
  monthlyPlannerKey,
  loadCentersForScope,
  workspaceSaveError,
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
  storageScope
})

const appMainRef = ref(null)
const localDataDialogOpen = ref(false)
const storageRefreshToken = ref(0)
let previousScrollRestoration = null
const showPublicLanding = computed(() => isPublicHomeHash(currentHash.value))

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

const reloadLocalAppData = async () => {
  await loadCentersForScope(storageScope.value)
  storageRefreshToken.value += 1
  syncRouteFromHash()
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

  void (async () => {
    try {
      await ensureLegacyLocalStorageMigrated()
    } catch (error) {
      console.error('Unable to initialize local data storage.', error)
    }

    await reloadLocalAppData()
  })()

  void scheduleScrollReset()
})

onBeforeUnmount(() => {
  if ('scrollRestoration' in window.history && previousScrollRestoration) {
    window.history.scrollRestoration = previousScrollRestoration
  }
})
</script>

<template>
  <PublicLandingPage v-if="showPublicLanding" />

  <div v-else class="app-shell">
    <AppHeader
      :current-app="currentRoute.app"
      :current-tool="currentRoute.tool || ''"
      @open-local-data-storage="localDataDialogOpen = true"
    />

    <main ref="appMainRef" class="app-main">
      <div v-if="currentRoute.app === 'planning' && workspaceSaveError" class="app-frame pb-0">
        <AppStatusMessage tone="error">
          {{ workspaceSaveError }}
        </AppStatusMessage>
      </div>

      <CalculatorApp
        v-if="currentRoute.app === 'calculators'"
        :active-tool="currentRoute.tool || 'interval'"
        :storage-scope="storageScope"
      />

      <PlanningHome
        v-else-if="currentRoute.app === 'planning' && currentRoute.page === 'home'"
        :centers="planningCenters"
        :weekday-options="WEEKDAY_OPTIONS"
        @save-center="handleSaveCenter"
        @delete-center="handleDeleteCenter"
      />

      <PlanningCenterView
        v-else-if="currentRoute.app === 'planning' && currentCenter && (currentRoute.page === 'center' || currentRoute.page === 'forecasts')"
        :center="currentCenter"
        :selected-group-id="currentRoute.groupId"
        :selected-year="currentRoute.year"
        :storage-scope="storageScope"
        :storage-refresh-token="storageRefreshToken"
        :weekday-options="WEEKDAY_OPTIONS"
        @save-center="handleSaveCenter"
        @save-group="handleSaveGroup"
        @delete-group="handleDeleteGroup"
        @delete-plan="handleDeletePlan"
      />

      <PlanningGroupForecastsView
        v-else-if="currentRoute.app === 'planning' && currentCenter && currentGroup && currentRoute.page === 'group-forecasts'"
        :center="currentCenter"
        :group="currentGroup"
        :forecast-seed="forecastSeed"
        :selected-forecast-id="currentRoute.forecastId"
        :planning-year="currentRoute.year"
        :storage-scope="storageScope"
        :storage-refresh-token="storageRefreshToken"
        :weekday-options="WEEKDAY_OPTIONS"
      />

      <MonthlyPlanBuilder
        v-else-if="currentRoute.app === 'planning' && currentRoute.page === 'editor' && currentCenter && currentGroup && (currentRoute.planId === 'new' || currentPlan)"
        :key="monthlyPlannerKey"
        :initial-plan="currentPlan"
        :center-defaults="plannerSeed"
        :forecast-seed="forecastSeed"
        :group-plans="currentGroup?.plans || []"
        :prefilled-year="currentRoute.year"
        :draft-key="plannerDraftKey"
        :storage-scope="storageScope"
        :storage-refresh-token="storageRefreshToken"
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

    <LocalDataStorageDialog
      v-model:visible="localDataDialogOpen"
      @imported="reloadLocalAppData"
    />

    <AppFooter />
  </div>
</template>
