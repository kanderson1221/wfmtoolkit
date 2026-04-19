<script setup>
import { computed, watch } from 'vue'

import ForecastAhtResultsView from './results/ForecastAhtResultsView.vue'
import ForecastContactsResultsView from './results/ForecastContactsResultsView.vue'
import ForecastMonthlyRollupView from './results/ForecastMonthlyRollupView.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import {
  buildForecastMonthlyAhtHistory,
  buildForecastMonthlyHandleTimeAssumptions,
  formatForecastAhtSeconds,
  summarizeForecastAhtTrainingData,
  summarizeForecastMonthlyHandleTimeAssumptions
} from '../../forecasting/handleTimeAssumptions'
import {
  FORECAST_SOURCE_IMPORTED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  formatDate,
  formatNumber,
  formatPercent,
  formatWhole,
  getForecastProjectDailyRows,
  getForecastProjectMonthlyRollup,
  getForecastProjectSourceKind
} from '../../forecasting/shared'

const props = defineProps({
  runError: {
    type: String,
    default: ''
  }
})

const project = defineModel('project', {
  type: Object,
  required: true
})

const activeResultTab = defineModel('activeResultTab', {
  type: String,
  required: true
})
const activeContactsSubview = defineModel('activeContactsSubview', {
  type: String,
  default: 'forecast'
})

const lastRun = computed(() => project.value?.lastRun || null)
const runSummary = computed(() => lastRun.value?.summary || {})
const hasResults = computed(() => Boolean(lastRun.value?.runAt))
const sourceKind = computed(() => getForecastProjectSourceKind(project.value))

const dailyRows = computed(() => getForecastProjectDailyRows(project.value))
const monthlyRows = computed(() => getForecastProjectMonthlyRollup(project.value))
const monthlyAhtAssumptions = computed(() =>
  buildForecastMonthlyHandleTimeAssumptions(project.value)
)
const monthlyAhtHistory = computed(() => buildForecastMonthlyAhtHistory(project.value))
const monthlyAhtSummary = computed(() => summarizeForecastMonthlyHandleTimeAssumptions(project.value))
const ahtTrainingSummary = computed(() => summarizeForecastAhtTrainingData(project.value))
const diagnostics = computed(() => lastRun.value?.diagnostics || {})
const holdoutMetrics = computed(() => diagnostics.value?.holdout || null)
const chartDailyRows = computed(() => {
  const holdoutRows = Array.isArray(holdoutMetrics.value?.rows) ? holdoutMetrics.value.rows : []

  if (!holdoutRows.length) {
    return dailyRows.value
  }

  const holdoutRowsByDate = new Map(
    holdoutRows
      .filter((row) => typeof row?.ds === 'string' && row.ds)
      .map((row) => [row.ds, row])
  )

  return dailyRows.value.map((row) => {
    const holdoutRow = holdoutRowsByDate.get(row.ds)
    if (!holdoutRow) {
      return row
    }

    return {
      ...row,
      actualValue: holdoutRow.actualValue ?? row.actualValue,
      yhat: holdoutRow.forecastValue ?? row.yhat,
      yhatLower: holdoutRow.lowerBound ?? row.yhatLower,
      yhatUpper: holdoutRow.upperBound ?? row.yhatUpper
    }
  })
})

const monthlyRowsWithAht = computed(() => {
  const ahtByMonthStart = new Map(
    monthlyAhtAssumptions.value.map((row) => [row.monthStart, row])
  )

  return monthlyRows.value.map((row) => ({
    ...row,
    assumedAhtSeconds: ahtByMonthStart.get(row.monthStart)?.assumedAhtSeconds ?? null,
    ahtBasisLabel: ahtByMonthStart.get(row.monthStart)?.basisLabel || ''
  }))
})

const showAhtAssumptions = computed(() =>
  monthlyRowsWithAht.value.some((row) => Number.isFinite(row?.assumedAhtSeconds))
)

const noteMessages = computed(() =>
  Array.isArray(diagnostics.value?.validationNotes) ? diagnostics.value.validationNotes : []
)

const warningMessages = computed(() =>
  Array.isArray(diagnostics.value?.warnings) ? diagnostics.value.warnings : []
)

const projectedContacts = computed(() =>
  monthlyRows.value.reduce((sum, row) => sum + Number(row.contacts || 0), 0)
)
const peakMonth = computed(() =>
  monthlyRows.value.reduce(
    (currentPeak, row) => (
      Number(row.contacts || 0) > Number(currentPeak?.contacts || -1)
        ? row
        : currentPeak
    ),
    null
  )
)

const monthlyComponentEnabled = computed(() =>
  Boolean(project.value?.modelConfig?.monthlySeasonalityEnabled)
)

const componentSections = computed(() => [
  {
    id: 'trend',
    title: 'Trend',
    points: lastRun.value?.components?.trend || []
  },
  {
    id: 'weekly',
    title: 'Weekly Seasonality',
    points: lastRun.value?.components?.weekly || []
  },
  {
    id: 'yearly',
    title: 'Yearly Seasonality',
    points: lastRun.value?.components?.yearly || []
  },
  {
    id: 'monthly',
    title: 'Monthly Seasonality',
    points: lastRun.value?.components?.monthly || []
  },
  {
    id: 'holidays',
    title: 'Holiday Effects',
    points: lastRun.value?.components?.holidays || []
  }
].filter((section) =>
  sourceKind.value !== FORECAST_SOURCE_MANUAL_MONTHLY &&
  (section.points.length > 0 || (section.id === 'monthly' && monthlyComponentEnabled.value))
))
const contactSubviewTabs = computed(() => {
  const items = [{ id: 'forecast', label: 'Forecast' }]

  if (
    sourceKind.value !== FORECAST_SOURCE_MANUAL_MONTHLY &&
    sourceKind.value !== FORECAST_SOURCE_IMPORTED_DAILY
  ) {
    items.push({ id: 'components', label: 'Components' })
  }

  return items
})

watch(
  () => [activeResultTab.value, contactSubviewTabs.value.map((item) => item.id).join('|'), activeContactsSubview.value],
  () => {
    if (
      activeResultTab.value === 'daily' &&
      !contactSubviewTabs.value.some((item) => item.id === activeContactsSubview.value)
    ) {
      activeContactsSubview.value = 'forecast'
    }
  },
  { immediate: true }
)

const embeddedInsightCards = computed(() => {
  const cards = []

  if (warningMessages.value.length) {
    cards.push({
      title: 'Warnings',
      body: warningMessages.value[0],
      meta: warningMessages.value.length > 1 ? `${warningMessages.value.length} total warnings` : ''
    })
  }

  if (noteMessages.value.length) {
    cards.push({
      title: 'Model Notes',
      body: noteMessages.value[0],
      meta: noteMessages.value.length > 1 ? `${noteMessages.value.length} total notes` : ''
    })
  }

  return cards
})

const embeddedMonthlyHighlights = computed(() => {
  const highlights = [
    {
      label: 'Projected Contacts',
      value: formatWhole(projectedContacts.value || runSummary.value.projectedTotalContacts),
      meta: 'Current saved total'
    },
    {
      label: 'Peak Month',
      value: peakMonth.value?.monthLabel || runSummary.value.peakForecastMonthLabel || '—',
      meta: peakMonth.value?.contacts != null
        ? `${formatWhole(peakMonth.value.contacts)} contacts`
        : 'Highest month in the rollup'
    }
  ]

  if (sourceKind.value !== FORECAST_SOURCE_MANUAL_MONTHLY) {
    highlights.push({
      label: 'Peak Day',
      value: runSummary.value.peakForecastDayDate ? formatDate(runSummary.value.peakForecastDayDate) : '—',
      meta: runSummary.value.peakForecastDayVolume != null
        ? `${formatWhole(runSummary.value.peakForecastDayVolume)} contacts`
        : 'Highest forecast day'
    })
  }

  if (showAhtAssumptions.value) {
    const overrideLabel = monthlyAhtSummary.value.overrideMonthCount
      ? `${formatWhole(monthlyAhtSummary.value.overrideMonthCount)} overridden month${monthlyAhtSummary.value.overrideMonthCount === 1 ? '' : 's'}`
      : monthlyAhtSummary.value.methodLabel

    highlights.push({
      label: 'Final Avg AHT',
      value: formatForecastAhtSeconds(monthlyAhtSummary.value.weightedAhtSeconds),
      meta: overrideLabel
    })
  }

  return highlights
})

const dailyAccuracyHighlights = computed(() => {
  if (!holdoutMetrics.value) {
    return []
  }

  return [
    {
      label: 'Test Set',
      value: holdoutMetrics.value.testRows != null ? `${formatWhole(holdoutMetrics.value.testRows)} days` : '—',
      meta: holdoutMetrics.value.testDateRange || ''
    },
    {
      label: 'MAPE',
      value: holdoutMetrics.value.mape != null ? formatPercent(holdoutMetrics.value.mape, 1) : '—',
      meta: 'Held-out percent error'
    },
    {
      label: 'MAE',
      value: holdoutMetrics.value.mae != null ? formatNumber(holdoutMetrics.value.mae, 1) : '—',
      meta: 'Average daily error'
    }
  ]
})

const ahtHighlights = computed(() => [
  {
    label: 'Method',
    value: monthlyAhtSummary.value.methodLabel,
    meta: ahtTrainingSummary.value.trainingRowCount
      ? `${formatWhole(ahtTrainingSummary.value.trainingRowCount)} daily rows in the training window`
      : 'No AHT history in the selected training window'
  },
  {
    label: 'Training Avg AHT',
    value: formatForecastAhtSeconds(ahtTrainingSummary.value.trainingWeightedAverageAhtSeconds),
    meta: `${formatWhole(ahtTrainingSummary.value.monthlyHistoryCount)} historical month${ahtTrainingSummary.value.monthlyHistoryCount === 1 ? '' : 's'}`
  },
  {
    label: 'Forecast Avg AHT',
    value: formatForecastAhtSeconds(monthlyAhtSummary.value.weightedAhtSeconds),
    meta: `${formatWhole(monthlyAhtSummary.value.monthCount)} forecast month${monthlyAhtSummary.value.monthCount === 1 ? '' : 's'}`
  },
  {
    label: 'Overrides',
    value: formatWhole(monthlyAhtSummary.value.overrideMonthCount),
    meta: monthlyAhtSummary.value.overrideMonthCount
      ? 'Months manually adjusted'
      : 'No monthly overrides'
  }
])

const getAhtMonthOverrideValue = (monthStart = '') => {
  const match = monthlyAhtAssumptions.value.find((row) => row.monthStart === monthStart)
  return match?.overrideAhtSeconds ?? null
}

const setAhtMonthOverride = (monthStart = '', nextValue) => {
  if (!project.value?.modelConfig || !monthStart) {
    return
  }

  const parsedValue = Number(nextValue)
  const normalizedValue = Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null
  const nextOverrides = (
    Array.isArray(project.value.modelConfig.ahtMonthOverrides)
      ? project.value.modelConfig.ahtMonthOverrides.map((row) => ({ ...row }))
      : []
  ).filter((row) => row?.monthStart !== monthStart)

  if (normalizedValue != null) {
    nextOverrides.push({
      monthStart,
      ahtSeconds: normalizedValue
    })
    nextOverrides.sort((left, right) => left.monthStart.localeCompare(right.monthStart))
  }

  project.value.modelConfig = {
    ...project.value.modelConfig,
    ahtMonthOverrides: nextOverrides
  }
}

const clearAhtMonthOverrides = () => {
  if (!project.value?.modelConfig || !monthlyAhtSummary.value.overrideMonthCount) {
    return
  }

  project.value.modelConfig = {
    ...project.value.modelConfig,
    ahtMonthOverrides: []
  }
}
</script>

<template>
  <div class="grid gap-4">
    <AppStatusMessage v-if="props.runError" tone="error">
      {{ props.runError }}
    </AppStatusMessage>

    <template v-if="!hasResults">
      <AppEmptyState
        title="No forecast run yet"
        description="Run the forecast to populate the analysis views."
      />
    </template>

    <template v-else-if="activeResultTab === 'daily'">
      <ForecastContactsResultsView
        v-model:active-contacts-subview="activeContactsSubview"
        :contact-subview-tabs="contactSubviewTabs"
        :daily-accuracy-highlights="dailyAccuracyHighlights"
        :chart-daily-rows="chartDailyRows"
        :holdout-days="holdoutMetrics?.holdoutDays || 0"
        :component-sections="componentSections"
        :embedded-insight-cards="embeddedInsightCards"
        :format-number="formatNumber"
      />
    </template>

    <template v-else-if="activeResultTab === 'aht'">
      <ForecastAhtResultsView
        :aht-highlights="ahtHighlights"
        :monthly-aht-history="monthlyAhtHistory"
        :monthly-aht-assumptions="monthlyAhtAssumptions"
        :monthly-aht-summary="monthlyAhtSummary"
        :get-aht-month-override-value="getAhtMonthOverrideValue"
        :set-aht-month-override="setAhtMonthOverride"
        :clear-aht-month-overrides="clearAhtMonthOverrides"
      />
    </template>

    <template v-else-if="activeResultTab === 'monthly'">
      <ForecastMonthlyRollupView
        :embedded-monthly-highlights="embeddedMonthlyHighlights"
        :show-aht-assumptions="showAhtAssumptions"
        :monthly-aht-summary="monthlyAhtSummary"
        :monthly-rows-with-aht="monthlyRowsWithAht"
        :source-kind="sourceKind"
        :warning-messages="warningMessages"
        :note-messages="noteMessages"
      />
    </template>

  </div>
</template>
