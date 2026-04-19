<script setup>
import { computed } from 'vue'

import ForecastComponentChart from './ForecastComponentChart.vue'
import ForecastDailyChart from './ForecastDailyChart.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import {
  buildForecastMonthlyHandleTimeAssumptions,
  formatForecastAhtSeconds,
  summarizeForecastMonthlyHandleTimeAssumptions
} from '../../forecasting/handleTimeAssumptions'
import {
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
  project: {
    type: Object,
    required: true
  },
  runError: {
    type: String,
    default: ''
  }
})

const activeResultTab = defineModel('activeResultTab', {
  type: String,
  required: true
})

const lastRun = computed(() => props.project?.lastRun || null)
const runSummary = computed(() => lastRun.value?.summary || {})
const hasResults = computed(() => Boolean(lastRun.value?.runAt))
const sourceKind = computed(() => getForecastProjectSourceKind(props.project))

const dailyRows = computed(() => getForecastProjectDailyRows(props.project))
const monthlyRows = computed(() => getForecastProjectMonthlyRollup(props.project))
const monthlyAhtAssumptions = computed(() => buildForecastMonthlyHandleTimeAssumptions(props.project))
const monthlyAhtSummary = computed(() => summarizeForecastMonthlyHandleTimeAssumptions(props.project))
const diagnostics = computed(() => lastRun.value?.diagnostics || {})
const holdoutMetrics = computed(() => diagnostics.value?.holdout || null)
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
  monthlyRowsWithAht.value.some((row) => Number.isFinite(Number(row?.assumedAhtSeconds)))
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
  Boolean(props.project?.modelConfig?.monthlySeasonalityEnabled)
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
    highlights.push({
      label: 'Assumed Avg AHT',
      value: formatForecastAhtSeconds(monthlyAhtSummary.value.weightedAhtSeconds),
      meta: monthlyAhtSummary.value.methodLabel
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
      <section class="grid gap-4">
        <div class="bg-white px-4 pb-1">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="grid gap-1">
              <h3 class="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                Forecasted demand vs historical volume
              </h3>
            </div>

            <div v-if="dailyAccuracyHighlights.length" class="flex flex-wrap gap-2 lg:justify-end">
              <span
                v-for="item in dailyAccuracyHighlights"
                :key="item.label"
                class="inline-flex items-baseline gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
              >
                <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {{ item.label }}
                </span>
                <strong class="font-semibold text-slate-950">{{ item.value }}</strong>
              </span>
            </div>
          </div>

          <div class="mt-3 overflow-hidden bg-white">
            <ForecastDailyChart
              :rows="dailyRows"
              :holdout-days="holdoutMetrics?.holdoutDays || 0"
              :format-number="formatNumber"
              height-class="h-[31.25rem]"
              min-width-class="min-w-[760px]"
              :show-legend="false"
            />
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span class="inline-flex items-center gap-2">
              <span class="h-1.5 w-5 rounded-full bg-[#15395f]"></span>
              Historical volume
            </span>
            <span class="inline-flex items-center gap-2">
              <span class="h-1.5 w-5 rounded-full bg-[#0e7490]"></span>
              Forecasted demand
            </span>
            <span class="inline-flex items-center gap-2">
              <span class="h-3 w-5 rounded-full bg-[rgba(149,188,214,0.32)]"></span>
              Confidence band
            </span>
            <span v-if="holdoutMetrics?.holdoutDays" class="inline-flex items-center gap-2">
              <span class="h-3 w-5 rounded-sm bg-amber-100 ring-1 ring-amber-200"></span>
              Test period
            </span>
          </div>
        </div>

        <div v-if="embeddedInsightCards.length" class="grid gap-3 lg:grid-cols-3">
          <article
            v-for="card in embeddedInsightCards"
            :key="card.title"
            class="grid gap-1 rounded-[20px] border border-slate-200 bg-white px-4 py-4"
          >
            <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {{ card.title }}
            </p>
            <p class="text-sm font-medium leading-6 text-slate-800">
              {{ card.body }}
            </p>
            <p v-if="card.meta" class="text-[0.82rem] text-slate-500">
              {{ card.meta }}
            </p>
          </article>
        </div>
      </section>
    </template>

    <template v-else-if="activeResultTab === 'monthly'">
      <section class="grid gap-4">
        <div class="bg-white px-4 pb-1">
          <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div class="grid gap-1">
              <h3 class="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                Monthly Rollup
              </h3>
            </div>

            <div class="flex flex-wrap gap-2 xl:justify-end">
              <span
                v-for="item in embeddedMonthlyHighlights"
                :key="item.label"
                class="inline-flex items-baseline gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
              >
                <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {{ item.label }}
                </span>
                <strong class="font-semibold text-slate-950">{{ item.value }}</strong>
              </span>
            </div>
          </div>

          <p
            v-if="showAhtAssumptions"
            class="mt-2 text-sm leading-6 text-slate-600"
          >
            Assumed AHT comes from shared staffing-group history using {{ monthlyAhtSummary.methodLabel.toLowerCase() }}.
          </p>

          <div class="mt-3 overflow-hidden border border-slate-200 bg-white">
            <div class="max-h-[26rem] overflow-auto">
              <table class="min-w-[960px] w-full border-collapse text-sm text-slate-700">
                <thead class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95">
                  <tr>
                    <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Month</th>
                    <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Contacts</th>
                    <th
                      v-if="showAhtAssumptions"
                      class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      Assumed AHT
                    </th>
                    <th
                      v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY"
                      class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      Avg Daily
                    </th>
                    <th
                      v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY"
                      class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      Peak Day
                    </th>
                    <th
                      v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY"
                      class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      Peak Volume
                    </th>
                    <th
                      v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY"
                      class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      Lower
                    </th>
                    <th
                      v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY"
                      class="px-5 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      Upper
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  <tr v-for="row in monthlyRowsWithAht" :key="row.monthStart" class="bg-white">
                    <td class="px-5 py-3 font-medium text-slate-900">{{ row.monthLabel }}</td>
                    <td class="px-4 py-3 text-right tabular-nums font-medium text-slate-900">{{ formatWhole(row.contacts) }}</td>
                    <td v-if="showAhtAssumptions" class="px-4 py-3 text-right tabular-nums">{{ formatForecastAhtSeconds(row.assumedAhtSeconds) }}</td>
                    <td v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY" class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.averageDailyVolume) }}</td>
                    <td v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY" class="px-4 py-3 text-right">{{ row.peakDailyDate ? formatDate(row.peakDailyDate) : '—' }}</td>
                    <td v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY" class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.peakDailyVolume) }}</td>
                    <td v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY" class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.lowerBoundContacts) }}</td>
                    <td v-if="sourceKind !== FORECAST_SOURCE_MANUAL_MONTHLY" class="px-5 py-3 text-right tabular-nums">{{ formatWhole(row.upperBoundContacts) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="warningMessages.length || noteMessages.length" class="grid gap-3 lg:grid-cols-2">
          <article
            v-if="warningMessages.length"
            class="grid gap-1 border border-slate-200 bg-white px-4 py-4"
          >
            <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Warnings
            </p>
            <p class="text-sm leading-6 text-slate-700">
              {{ warningMessages[0] }}
            </p>
          </article>

          <article
            v-if="noteMessages.length"
            class="grid gap-1 border border-slate-200 bg-white px-4 py-4"
          >
            <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Model Notes
            </p>
            <p class="text-sm leading-6 text-slate-700">
              {{ noteMessages[0] }}
            </p>
          </article>
        </div>
      </section>
    </template>

    <template v-else-if="activeResultTab === 'components'">
      <div v-if="!componentSections.length" class="grid gap-3">
        <AppEmptyState
          title="No component output returned"
          description="This forecast run did not return separate component series."
        />
      </div>

      <div v-else class="grid gap-4 px-4 pb-1 2xl:grid-cols-2">
        <article
          v-for="section in componentSections"
          :key="section.id"
          class="grid gap-3 border border-slate-200 bg-white p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-base font-semibold tracking-[-0.02em] text-slate-950">
              {{ section.title }}
            </h3>
          </div>
          <ForecastComponentChart
            v-if="section.points.length"
            :title="section.title"
            :points="section.points"
            :format-number="formatNumber"
          />
          <p v-else class="text-sm leading-6 text-slate-600">
            This run did not return a monthly component series.
          </p>
        </article>
      </div>
    </template>
  </div>
</template>
