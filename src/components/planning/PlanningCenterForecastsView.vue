<script setup>
import { computed } from 'vue'

import { buildPlanningCenterHash } from '../../appRoutes'
import ForecastingWorkspace from '../ForecastingWorkspace.vue'

const props = defineProps({
  center: {
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
  },
  embedded: {
    type: Boolean,
    default: false
  }
})

const operatingDaysLabel = computed(() =>
  props.weekdayOptions
    .filter((weekday) => props.center?.operatingWeekdays?.includes(weekday.value))
    .map((weekday) => weekday.label)
    .join(', ') || 'No operating days selected'
)

const operatingHoursLabel = computed(() =>
  props.center?.operatingOpenTime && props.center?.operatingCloseTime
    ? `${props.center.operatingOpenTime} to ${props.center.operatingCloseTime}`
    : 'Hours not set'
)

const holidayProfileLabel = computed(() =>
  props.forecastSeed?.sourceCenterSnapshot?.holidayCalendarLabel || 'No holiday calendar'
)

const breadcrumbs = computed(() => [
  { label: 'Home', href: '#home' },
  { label: 'Call Centers', href: '#planning' },
  { label: props.center.name, href: buildPlanningCenterHash(props.center.id) },
  { label: 'Forecasts' }
])

const contextSummaryItems = computed(() => [
  { label: 'Operating Days', value: operatingDaysLabel.value },
  { label: 'Hours of Operation', value: operatingHoursLabel.value },
  { label: 'Holiday Profile', value: holidayProfileLabel.value },
  { label: 'Time Zone', value: props.center?.timezone || 'America/New_York' }
])

const forecastStorageScope = computed(() =>
  props.forecastSeed?.forecastStorageScope || props.storageScope
)

const fallbackScopes = computed(() => {
  const primaryScope = String(forecastStorageScope.value || '')
  const baseScope = String(props.storageScope || '')

  if (!baseScope || baseScope === primaryScope) {
    return []
  }

  return [baseScope]
})

const workspaceDescription = computed(() =>
  `Build daily forecasts for ${props.center.name} using the call center calendar and operating setup as the starting point.`
)
</script>

<template>
  <ForecastingWorkspace
    :storage-scope="forecastStorageScope"
    :project-seed="props.forecastSeed"
    :fallback-scopes="fallbackScopes"
    :breadcrumbs="breadcrumbs"
    :title="props.embedded ? 'Forecasts' : `${props.center.name} Forecasts`"
    :description="workspaceDescription"
    :context-summary-items="contextSummaryItems"
    project-dialog-description="Open a saved forecast for this call center. Legacy forecasts from the older shared workspace also appear here until they are resaved into the center."
    :embedded="props.embedded"
  />
</template>
