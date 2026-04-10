<script setup>
import { computed } from 'vue'

import {
  buildPlanningCenterHash,
  buildPlanningGroupHash
} from '../../appRoutes'
import ForecastingWorkspace from '../ForecastingWorkspace.vue'

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

const planningYearLabel = computed(() => {
  const year = Number(props.planningYear || props.forecastSeed?.planningYear || 0)
  return Number.isInteger(year) && year > 0 ? String(year) : 'Not set'
})

const breadcrumbs = computed(() => [
  { label: 'Home', href: '#home' },
  { label: 'Call Centers', href: '#planning' },
  { label: props.center.name, href: buildPlanningCenterHash(props.center.id) },
  { label: props.group.name, href: buildPlanningGroupHash(props.center.id, props.group.id, props.planningYear) },
  { label: 'Forecasts' }
])

const contextSummaryItems = computed(() => [
  { label: 'Staffing Group', value: props.group?.name || 'Staffing Group' },
  { label: 'Operating Days', value: operatingDaysLabel.value },
  { label: 'Hours of Operation', value: operatingHoursLabel.value },
  { label: 'Holiday Profile', value: holidayProfileLabel.value },
  { label: 'Planning Year', value: planningYearLabel.value }
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

</script>

<template>
  <ForecastingWorkspace
    :storage-scope="forecastStorageScope"
    :storage-refresh-token="props.storageRefreshToken"
    :project-seed="props.forecastSeed"
    :initial-project-id="props.selectedForecastId"
    :fallback-scopes="fallbackScopes"
    :breadcrumbs="breadcrumbs"
    :title="`${props.group.name} Forecasts`"
    :show-description="false"
    :show-library-actions="false"
    :show-duplicate-action="false"
    :context-summary-items="contextSummaryItems"
    project-dialog-description="Open a saved forecast for this staffing group. Older center-level forecasts still appear here until they are resaved into the staffing-group workspace."
  />
</template>
