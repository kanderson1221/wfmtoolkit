<script setup>
import { computed } from 'vue'

import ForecastAdvancedSection from './inspector/ForecastAdvancedSection.vue'
import ForecastHandleTimeSection from './inspector/ForecastHandleTimeSection.vue'
import ForecastHolidayEffectsSection from './inspector/ForecastHolidayEffectsSection.vue'
import ForecastInspectorOverviewPanel from './inspector/ForecastInspectorOverviewPanel.vue'
import ForecastInspectorScopeSection from './inspector/ForecastInspectorScopeSection.vue'
import ForecastSeasonalitySection from './inspector/ForecastSeasonalitySection.vue'
import ForecastTrainingDataSection from './inspector/ForecastTrainingDataSection.vue'
import ForecastValidationSection from './inspector/ForecastValidationSection.vue'
import {
  formatForecastAhtSeconds,
  summarizeForecastAhtTrainingData
} from '../../forecasting/handleTimeAssumptions'
import {
  formatDate,
  formatNumber,
  getForecastProjectSourceKind,
  getForecastTrainingHistoryRows,
  getForecastTrainingWindow,
} from '../../forecasting/shared'

const props = defineProps({
  validationMessages: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'add-custom-seasonality',
  'remove-custom-seasonality',
  'add-custom-holiday',
  'remove-custom-holiday'
])

const project = defineModel('project', {
  type: Object,
  required: true
})

const sourceKind = computed(() => getForecastProjectSourceKind(project.value))
const usesCenterManagedHolidays = computed(() => Boolean(project.value.centerManagedHolidays))
const availableTrainingWindow = computed(() => getForecastTrainingWindow(project.value))
const historyRowCount = computed(() => availableTrainingWindow.value.availableRowCount)
const trainingHistoryRows = computed(() => getForecastTrainingHistoryRows(project.value))
const trainingRowCount = computed(() => trainingHistoryRows.value.length)
const holdoutDays = computed(() => Math.max(0, Number(project.value.modelConfig.holdoutDays) || 0))
const scoredTrainingRowCount = computed(() => Math.max(trainingRowCount.value - holdoutDays.value, 0))
const holdoutIsValid = computed(() =>
  trainingRowCount.value === 0 || holdoutDays.value === 0 || scoredTrainingRowCount.value >= 14
)
const showTrainingDataSection = computed(() => sourceKind.value === 'modeled_daily')
const ahtTrainingSummary = computed(() => summarizeForecastAhtTrainingData(project.value))
const ahtHistoryRowCount = computed(() => ahtTrainingSummary.value.availableRowCount)
const showHandleTimeSection = computed(() => showTrainingDataSection.value && ahtHistoryRowCount.value > 0)
const usingSharedPlanningHistory = computed(() =>
  showTrainingDataSection.value && Boolean(project.value?.planningContext?.groupId)
)
const trainingDataSourceLabel = computed(() =>
  usingSharedPlanningHistory.value
    ? 'Source: Shared staffing-group history'
    : 'Source: Loaded daily history'
)
const availableTrainingSummary = computed(() => {
  if (!historyRowCount.value) {
    return 'No history loaded yet'
  }

  return `${formatDate(availableTrainingWindow.value.availableStartDate)} through ${formatDate(availableTrainingWindow.value.availableEndDate)} • ${historyRowCount.value} rows`
})
const trainingWindowIsValid = computed(() => availableTrainingWindow.value.windowIsValid)
const recentMonthsWindow = computed(() =>
  Math.max(1, Math.round(Number(project.value.modelConfig.ahtRecentMonthsWindow) || 3))
)
const trainingWindowSummary = computed(() => {
  if (!historyRowCount.value) {
    return 'Load history to configure this forecast.'
  }

  if (!trainingWindowIsValid.value) {
    return 'Choose a training start date that is on or before the training end date.'
  }

  if (holdoutDays.value === 0) {
    return `Train on ${trainingRowCount.value} rows • No validation set`
  }

  return `Train on ${scoredTrainingRowCount.value} rows • Validate on ${holdoutDays.value}`
})
const handleTimeSourceLabel = computed(() =>
  usingSharedPlanningHistory.value
    ? 'Source: Shared staffing-group AHT history'
    : 'Source: Loaded daily AHT history'
)
const availableAhtSummary = computed(() => {
  if (!ahtHistoryRowCount.value) {
    return 'No AHT history loaded yet'
  }

  return `${formatDate(ahtTrainingSummary.value.availableStartDate)} through ${formatDate(ahtTrainingSummary.value.availableEndDate)} • ${ahtHistoryRowCount.value} rows • ${formatForecastAhtSeconds(ahtTrainingSummary.value.availableWeightedAverageAhtSeconds)} avg`
})
const handleTimeWindowSummary = computed(() => {
  if (!ahtHistoryRowCount.value) {
    return 'Load AHT history to build monthly assumptions.'
  }

  const method = String(project.value.modelConfig.ahtAssumptionMethod || '')

  if (method === 'weighted_average') {
    return `Use weighted average across ${ahtTrainingSummary.value.monthlyHistoryCount} historical months`
  }

  if (method === 'seasonal_by_month') {
    return 'Use same-month history with weighted-average fallback'
  }

  return `Blend same-month history with the last ${formatNumber(recentMonthsWindow.value, 0)} months`
})
const holdoutSummary = computed(() => {
  if (!trainingRowCount.value) {
    return 'Load history first, then choose how many trailing days to compare against actuals.'
  }

  if (holdoutDays.value === 0) {
    return `Train on all ${trainingRowCount.value} daily rows in the selected window. No test set will be scored.`
  }

  if (!holdoutIsValid.value) {
    return 'Use fewer test-set days so at least 14 training days remain.'
  }

  return `Train on the first ${scoredTrainingRowCount.value} daily rows in the selected window and compare the last ${holdoutDays.value} rows to actuals.`
})
const intervalWidthPercent = computed({
  get: () => {
    const intervalWidth = Number(project.value.modelConfig.intervalWidth)
    return Number.isFinite(intervalWidth) ? Math.round(intervalWidth * 100) : 80
  },
  set: (value) => {
    const percent = Number(value)
    project.value.modelConfig.intervalWidth = Number.isFinite(percent)
      ? Math.max(10, Math.min(99, percent)) / 100
      : 0.8
  }
})

const showScopeSection = true
const shortAhtMethodLabel = computed(() => {
  if (project.value.modelConfig.ahtAssumptionMethod === 'weighted_average') {
    return 'Weighted Avg'
  }

  if (project.value.modelConfig.ahtAssumptionMethod === 'seasonal_by_month') {
    return 'Seasonal'
  }

  return 'Blend + Seasonal'
})
const trainingWindowRangeSummary = computed(() => {
  if (!trainingWindowIsValid.value) {
    return 'Selected dates'
  }

  return `${formatDate(availableTrainingWindow.value.trainingStartDate)} to ${formatDate(availableTrainingWindow.value.trainingEndDate)}`
})
const validationOverviewSummary = computed(() => {
  if (!trainingRowCount.value) {
    return 'History required'
  }

  if (holdoutDays.value === 0) {
    return 'All rows train the model'
  }

  if (!holdoutIsValid.value) {
    return 'Reduce test days'
  }

  return `${formatNumber(scoredTrainingRowCount.value, 0)} rows stay in training`
})
const seasonalitySummaryLabel = computed(() => {
  const enabledModes = []

  if (project.value.modelConfig.weeklySeasonalityEnabled) {
    enabledModes.push('Weekly')
  }

  if (project.value.modelConfig.monthlySeasonalityEnabled) {
    enabledModes.push('Monthly')
  }

  if (project.value.modelConfig.yearlySeasonalityEnabled) {
    enabledModes.push('Yearly')
  }

  return enabledModes.length ? enabledModes.join(' • ') : 'All off'
})
const holidaySummaryLabel = computed(() => {
  if (usesCenterManagedHolidays.value) {
    return 'Managed by staffing group'
  }

  const customHolidayCount = Array.isArray(project.value.modelConfig.customHolidays)
    ? project.value.modelConfig.customHolidays.length
    : 0

  if (!customHolidayCount) {
    return 'Built-in only'
  }

  return `${formatNumber(customHolidayCount, 0)} custom`
})
const advancedSummaryLabel = computed(() => {
  const customPatternCount = Array.isArray(project.value.modelConfig.customSeasonalities)
    ? project.value.modelConfig.customSeasonalities.length
    : 0
  const growthLabel = project.value.modelConfig.growth === 'logistic' ? 'Logistic' : 'Linear'

  return customPatternCount > 0
    ? `${growthLabel} • ${formatNumber(customPatternCount, 0)} custom`
    : growthLabel
})
const overviewItems = computed(() => {
  const items = [
    {
      label: 'History',
      value: historyRowCount.value ? formatNumber(historyRowCount.value, 0) : '—',
      meta: historyRowCount.value ? 'daily rows available' : 'load history'
    },
    {
      label: 'Training',
      value: trainingWindowIsValid.value ? formatNumber(trainingRowCount.value, 0) : 'Fix dates',
      meta: historyRowCount.value ? trainingWindowRangeSummary.value : 'selected window'
    },
    {
      label: 'Validation',
      value: holdoutDays.value ? `${formatNumber(holdoutDays.value, 0)} days` : 'Off',
      meta: validationOverviewSummary.value
    },
    showHandleTimeSection.value
      ? {
          label: 'AHT Method',
          value: shortAhtMethodLabel.value,
          meta: `${formatNumber(ahtTrainingSummary.value.monthlyHistoryCount, 0)} monthly history`
        }
      : {
          label: 'Confidence',
          value: `${formatNumber(intervalWidthPercent.value, 0)}%`,
          meta: 'prediction interval'
        }
  ]

  return items
})
</script>

<template>
  <div class="grid gap-5">
    <ForecastInspectorOverviewPanel
      :overview-items="overviewItems"
      :using-shared-planning-history="usingSharedPlanningHistory"
    />

    <ForecastInspectorScopeSection
      v-if="showScopeSection"
      v-model:project="project"
    />

    <ForecastTrainingDataSection
      v-if="showTrainingDataSection"
      v-model:project="project"
      :available-training-window="availableTrainingWindow"
      :history-row-count="historyRowCount"
      :training-window-is-valid="trainingWindowIsValid"
      :available-training-summary="availableTrainingSummary"
      :training-window-summary="trainingWindowSummary"
      :training-data-source-label="trainingDataSourceLabel"
    />

    <ForecastHandleTimeSection
      v-if="showHandleTimeSection"
      v-model:project="project"
      :aht-history-row-count="ahtHistoryRowCount"
      :available-aht-summary="availableAhtSummary"
      :handle-time-window-summary="handleTimeWindowSummary"
      :handle-time-source-label="handleTimeSourceLabel"
    />

    <ForecastValidationSection
      v-model:project="project"
      v-model:interval-width-percent="intervalWidthPercent"
      :holdout-days="holdoutDays"
      :holdout-is-valid="holdoutIsValid"
      :holdout-summary="holdoutSummary"
      :validation-messages="props.validationMessages"
    />

    <ForecastSeasonalitySection
      v-model:project="project"
      :seasonality-summary-label="seasonalitySummaryLabel"
    />

    <ForecastHolidayEffectsSection
      v-if="!usesCenterManagedHolidays"
      v-model:project="project"
      :holiday-summary-label="holidaySummaryLabel"
      @add-custom-holiday="emit('add-custom-holiday')"
      @remove-custom-holiday="emit('remove-custom-holiday', $event)"
    />

    <ForecastAdvancedSection
      v-model:project="project"
      :advanced-summary-label="advancedSummaryLabel"
      @add-custom-seasonality="emit('add-custom-seasonality')"
      @remove-custom-seasonality="emit('remove-custom-seasonality', $event)"
    />
  </div>
</template>
