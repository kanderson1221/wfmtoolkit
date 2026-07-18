<script setup>
import { computed } from 'vue'

import {
  buildPlanningCenterHash,
  buildPlanningGroupHash
} from '../../appRoutes'
import ForecastingWorkspace from '../ForecastingWorkspace.vue'
import { buildForecastPlanDependencyIndex } from '../../planner/forecastDependencies'

const props = defineProps({
  center: {
    type: Object,
    required: true
  },
  group: {
    type: Object,
    required: true
  },
  forecastSeed: {
    type: Object,
    default: null
  },
  storageScope: {
    type: String,
    default: 'default'
  },
  storageRefreshToken: {
    type: Number,
    default: 0
  },
  planningYear: {
    type: Number,
    default: null
  },
  selectedForecastId: {
    type: String,
    default: ''
  },
  weekdayOptions: {
    type: Array,
    default: () => [
      { value: 0, label: 'Sun' },
      { value: 1, label: 'Mon' },
      { value: 2, label: 'Tue' },
      { value: 3, label: 'Wed' },
      { value: 4, label: 'Thu' },
      { value: 5, label: 'Fri' },
      { value: 6, label: 'Sat' }
    ]
  }
})

const breadcrumbs = computed(() => [
  { label: 'Home', href: '#home' },
  { label: 'Call Centers', href: '#planning' },
  { label: props.center.name, href: buildPlanningCenterHash(props.center.id) },
  { label: props.group.name, href: buildPlanningGroupHash(props.center.id, props.group.id, props.planningYear) },
  { label: 'Forecasts' }
])

const forecastStorageScope = computed(() =>
  props.forecastSeed?.forecastStorageScope || props.storageScope
)

const fallbackScopes = computed(() => {
  const explicitScopes = Array.isArray(props.forecastSeed?.fallbackScopes)
    ? props.forecastSeed.fallbackScopes
    : []
  const primaryScope = String(forecastStorageScope.value || '')

  return [...new Set(
    explicitScopes
      .map((scope) => String(scope || '').trim())
      .filter((scope) => scope && scope !== primaryScope)
  )]
})

const returnToForecastsHash = computed(() =>
  buildPlanningGroupHash(props.center.id, props.group.id, props.planningYear, {
    tab: 'forecasts'
  })
)

const replacementDependenciesByProjectId = computed(() =>
  buildForecastPlanDependencyIndex(props.group?.plans)
)

const handleSaveComplete = () => {
  window.location.hash = returnToForecastsHash.value
}

const handleCancelCreate = () => {
  window.location.hash = returnToForecastsHash.value
}

</script>

<template>
  <ForecastingWorkspace
    :storage-scope="forecastStorageScope"
    :storage-refresh-token="props.storageRefreshToken"
    :project-seed="props.forecastSeed"
    :initial-project-id="props.selectedForecastId"
    :fallback-scopes="fallbackScopes"
    :breadcrumbs="breadcrumbs"
    :show-library-actions="false"
    :show-source-action-button="true"
    :show-duplicate-action="false"
    :replacement-dependencies-by-project-id="replacementDependenciesByProjectId"
    project-dialog-description="Open a saved forecast for this staffing group. Older center-level forecasts still appear here until they are resaved into the staffing-group workspace."
    @save-complete="handleSaveComplete"
    @cancel-create="handleCancelCreate"
  />
</template>
