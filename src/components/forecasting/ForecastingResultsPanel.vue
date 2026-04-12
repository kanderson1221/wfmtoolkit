<script setup>
import { computed } from 'vue'

import ForecastComponentChart from './ForecastComponentChart.vue'
import ForecastDailyChart from './ForecastDailyChart.vue'
import AppButton from '../ui/AppButton.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppOptionPills from '../ui/AppOptionPills.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableShell from '../ui/AppTableShell.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'
import {
  FORECAST_RESULT_TABS,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatWhole,
  getForecastProjectDailyRows,
  getForecastProjectMonthlyRollup
} from '../../forecasting/shared'

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  runError: {
    type: String,
    default: ''
  },
  embedded: {
    type: Boolean,
    default: false
  },
  showHeader: {
    type: Boolean,
    default: true
  },
  showForecastTable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['open-setup'])

const activeResultTab = defineModel('activeResultTab', {
  type: String,
  required: true
})

const resultTabs = computed(() => FORECAST_RESULT_TABS)
const resultSelection = computed({
  get: () => activeResultTab.value,
  set: (value) => {
    activeResultTab.value = value
  }
})

const lastRun = computed(() => props.project?.lastRun || null)
const runSummary = computed(() => lastRun.value?.summary || {})
const hasResults = computed(() => Boolean(lastRun.value?.runAt))

const dailyRows = computed(() => getForecastProjectDailyRows(props.project))
const monthlyRows = computed(() => getForecastProjectMonthlyRollup(props.project))
const diagnostics = computed(() => lastRun.value?.diagnostics || {})
const holdoutMetrics = computed(() => diagnostics.value?.holdout || null)

const noteMessages = computed(() =>
  Array.isArray(diagnostics.value?.validationNotes) ? diagnostics.value.validationNotes : []
)

const warningMessages = computed(() =>
  Array.isArray(diagnostics.value?.warnings) ? diagnostics.value.warnings : []
)
const isEmbedded = computed(() => Boolean(props.embedded))

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

const summaryItems = computed(() => {
  const summary = runSummary.value
  const holdout = holdoutMetrics.value

  return [
    {
      label: 'History Rows',
      value: formatWhole(summary.observationsUsed),
      meta: summary.historyDateRange || 'Prepared history used for the final forecast'
    },
    {
      label: 'Test Set',
      value: holdout?.testRows != null ? `${formatWhole(holdout.testRows)} days` : holdout ? 'Scored' : 'Off',
      meta: holdout?.testDateRange || 'Hold back days set to 0'
    },
    {
      label: 'Projected Contacts',
      value: formatWhole(projectedContacts.value || summary.projectedTotalContacts),
      meta: summary.forecastDateRange || 'Future horizon total'
    },
    {
      label: 'MAE',
      value: holdout?.mae != null ? formatNumber(holdout.mae, 1) : '—',
      meta: holdout?.mape != null ? `MAPE ${formatPercent(holdout.mape, 1)}` : 'No held-out scoring'
    },
    {
      label: 'Peak Month',
      value: peakMonth.value?.monthLabel || summary.peakForecastMonthLabel || '—',
      meta: peakMonth.value?.contacts != null
        ? `${formatWhole(peakMonth.value.contacts)} contacts`
        : 'Highest monthly rollup'
    },
    {
      label: 'Last Run',
      value: lastRun.value?.runAt ? formatDateTime(lastRun.value.runAt) : '—',
      meta: 'Most recent successful forecast run'
    }
  ]
})

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
].filter((section) => section.points.length > 0 || (section.id === 'monthly' && monthlyComponentEnabled.value)))

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

const embeddedMonthlyHighlights = computed(() => [
  {
    label: 'Months',
    value: formatWhole(monthlyRows.value.length || 0),
    meta: runSummary.value.forecastDateRange || 'Current forecast window'
  },
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
  },
  {
    label: 'Peak Day',
    value: runSummary.value.peakForecastDayDate ? formatDate(runSummary.value.peakForecastDayDate) : '—',
    meta: runSummary.value.peakForecastDayVolume != null
      ? `${formatWhole(runSummary.value.peakForecastDayVolume)} contacts`
      : 'Highest forecast day'
  }
])

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
    <div v-if="props.showHeader" class="grid gap-3">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <AppSectionHeader title="Review" />

        <div class="flex flex-wrap gap-2">
          <AppButton size="sm" variant="secondary" @click="emit('open-setup')">
            Forecast Setup
          </AppButton>
        </div>
      </div>

      <AppOptionPills
        v-model="resultSelection"
        aria-label="Forecast result tabs"
        :items="resultTabs"
      />

      <AppStatStrip
        v-if="hasResults"
        :items="summaryItems"
        columns="md:grid-cols-2 xl:grid-cols-3"
      />
    </div>

    <AppStatusMessage v-if="props.runError" tone="error">
      {{ props.runError }}
    </AppStatusMessage>

    <template v-if="!hasResults">
      <AppEmptyState
        title="No forecast run yet"
        description="Run the forecast to populate the analysis views."
      >
        <div v-if="props.showHeader" class="pt-2">
          <AppButton size="sm" variant="secondary" @click="emit('open-setup')">
            Forecast Setup
          </AppButton>
        </div>
      </AppEmptyState>
    </template>

    <template v-else-if="activeResultTab === 'daily'">
      <template v-if="isEmbedded">
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

      <template v-else>
        <AppWorkspaceSection title="Forecast vs History">
          <ForecastDailyChart
            :rows="dailyRows"
            :holdout-days="holdoutMetrics?.holdoutDays || 0"
            :format-number="formatNumber"
          />
        </AppWorkspaceSection>

        <AppWorkspaceSection v-if="warningMessages.length" title="Warnings">
          <div class="grid gap-2">
            <AppStatusMessage
              v-for="warning in warningMessages"
              :key="warning"
              tone="error"
            >
              {{ warning }}
            </AppStatusMessage>
          </div>
        </AppWorkspaceSection>

        <AppWorkspaceSection v-if="noteMessages.length" title="Model Notes">
          <ul class="grid gap-2 text-sm leading-6 text-slate-700">
            <li v-for="note in noteMessages" :key="note">
              {{ note }}
            </li>
          </ul>
        </AppWorkspaceSection>
      </template>

      <AppTableShell v-if="props.showForecastTable">
        <div class="border-b border-slate-200 px-5 py-4">
          <AppSectionHeader title="Rows" />
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-[900px] w-full border-collapse text-sm text-slate-700">
            <thead class="border-b border-slate-200 bg-slate-50/85">
              <tr>
                <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Date</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Actual</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Forecast</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Lower</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Upper</th>
                <th class="px-5 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Phase</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="row in dailyRows" :key="row.ds" class="bg-white">
                <td class="px-5 py-3">{{ formatDate(row.ds) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ row.actualValue == null ? '—' : formatWhole(row.actualValue) }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-medium text-slate-900">{{ formatWhole(row.yhat) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.yhatLower) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.yhatUpper) }}</td>
                <td class="px-5 py-3 text-right">{{ row.isHistory ? 'History' : 'Forecast' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppTableShell>
    </template>

    <template v-else-if="activeResultTab === 'monthly'">
      <template v-if="isEmbedded">
        <section class="grid gap-4">
          <div class="rounded-[24px] border border-slate-200 bg-[#fbfdff] p-5">
            <div class="grid gap-1">
              <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Monthly Rollup
              </p>
              <h3 class="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                Planning-ready monthly forecast
              </h3>
              <p class="text-sm text-slate-600">
                Keep the monthly totals inside the same canvas so planning review never replaces the chart-first workspace.
              </p>
            </div>

            <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
              <div class="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                <div class="max-h-[24rem] overflow-auto">
                  <table class="min-w-[960px] w-full border-collapse text-sm text-slate-700">
                    <thead class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95">
                      <tr>
                        <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Month</th>
                        <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Contacts</th>
                        <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Avg Daily</th>
                        <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Peak Day</th>
                        <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Peak Volume</th>
                        <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Lower</th>
                        <th class="px-5 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Upper</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                      <tr v-for="row in monthlyRows" :key="row.monthStart" class="bg-white">
                        <td class="px-5 py-3 font-medium text-slate-900">{{ row.monthLabel }}</td>
                        <td class="px-4 py-3 text-right tabular-nums font-medium text-slate-900">{{ formatWhole(row.contacts) }}</td>
                        <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.averageDailyVolume) }}</td>
                        <td class="px-4 py-3 text-right">{{ row.peakDailyDate ? formatDate(row.peakDailyDate) : '—' }}</td>
                        <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.peakDailyVolume) }}</td>
                        <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.lowerBoundContacts) }}</td>
                        <td class="px-5 py-3 text-right tabular-nums">{{ formatWhole(row.upperBoundContacts) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="grid gap-3">
                <article
                  v-for="item in embeddedMonthlyHighlights"
                  :key="item.label"
                  class="grid gap-1 rounded-[20px] border border-slate-200 bg-white px-4 py-4"
                >
                  <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {{ item.label }}
                  </p>
                  <strong class="text-[1.15rem] font-semibold tracking-[-0.03em] text-slate-950">
                    {{ item.value }}
                  </strong>
                  <p class="text-[0.82rem] text-slate-500">
                    {{ item.meta }}
                  </p>
                </article>
              </div>
            </div>
          </div>

          <div v-if="warningMessages.length || noteMessages.length" class="grid gap-3 lg:grid-cols-2">
            <article
              v-if="warningMessages.length"
              class="grid gap-1 rounded-[20px] border border-slate-200 bg-white px-4 py-4"
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
              class="grid gap-1 rounded-[20px] border border-slate-200 bg-white px-4 py-4"
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

      <AppTableShell v-else>
        <div class="border-b border-slate-200 px-5 py-4">
          <AppSectionHeader title="Monthly Rollup" />
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-[1040px] w-full border-collapse text-sm text-slate-700">
            <thead class="border-b border-slate-200 bg-slate-50/85">
              <tr>
                <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Month</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Contacts</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Avg Daily</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Peak Day</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Peak Volume</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Lower</th>
                <th class="px-5 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Upper</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="row in monthlyRows" :key="row.monthStart" class="bg-white">
                <td class="px-5 py-3 font-medium text-slate-900">{{ row.monthLabel }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-medium text-slate-900">{{ formatWhole(row.contacts) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.averageDailyVolume) }}</td>
                <td class="px-4 py-3 text-right">{{ row.peakDailyDate ? formatDate(row.peakDailyDate) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.peakDailyVolume) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.lowerBoundContacts) }}</td>
                <td class="px-5 py-3 text-right tabular-nums">{{ formatWhole(row.upperBoundContacts) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppTableShell>
    </template>

    <template v-else-if="activeResultTab === 'components'">
      <div v-if="!componentSections.length" class="grid gap-3">
        <AppEmptyState
          title="No component output returned"
          description="This forecast run did not return separate component series."
        />
      </div>

      <div v-else-if="isEmbedded" class="grid gap-4 px-4 pb-1 2xl:grid-cols-2">
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

      <div v-else class="grid gap-4">
        <AppWorkspaceSection
          v-for="section in componentSections"
          :key="section.id"
          :title="section.title"
        >
          <ForecastComponentChart
            v-if="section.points.length"
            :title="section.title"
            :points="section.points"
            :format-number="formatNumber"
          />
          <p v-else class="text-sm leading-6 text-slate-600">
            This run did not return a monthly component series.
          </p>
        </AppWorkspaceSection>
      </div>
    </template>
  </div>
</template>
