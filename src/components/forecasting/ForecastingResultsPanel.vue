<script setup>
import { computed } from 'vue'

import ForecastComponentChart from './ForecastComponentChart.vue'
import ForecastDailyChart from './ForecastDailyChart.vue'
import AppButton from '../ui/AppButton.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppOptionPills from '../ui/AppOptionPills.vue'
import AppPanel from '../ui/AppPanel.vue'
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
  formatWhole
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
const hasResults = computed(() => Boolean(lastRun.value?.runAt))

const dailyRows = computed(() => lastRun.value?.dailyForecast || [])
const monthlyRows = computed(() => lastRun.value?.monthlyRollup || [])
const diagnostics = computed(() => lastRun.value?.diagnostics || {})
const holdoutMetrics = computed(() => diagnostics.value?.holdout || null)
const accuracyRows = computed(() => holdoutMetrics.value?.rows || [])

const noteMessages = computed(() => [
  ...(Array.isArray(diagnostics.value?.dataPrepActions) ? diagnostics.value.dataPrepActions : []),
  ...(Array.isArray(diagnostics.value?.validationNotes) ? diagnostics.value.validationNotes : [])
])

const warningMessages = computed(() =>
  Array.isArray(diagnostics.value?.warnings) ? diagnostics.value.warnings : []
)

const summaryItems = computed(() => {
  const summary = lastRun.value?.summary || {}
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
      value: formatWhole(summary.projectedTotalContacts),
      meta: summary.forecastDateRange || 'Future horizon total'
    },
    {
      label: 'MAE',
      value: holdout?.mae != null ? formatNumber(holdout.mae, 1) : '—',
      meta: holdout?.mape != null ? `MAPE ${formatPercent(holdout.mape, 1)}` : 'No held-out scoring'
    },
    {
      label: 'Peak Month',
      value: summary.peakForecastMonthLabel || '—',
      meta: summary.peakForecastMonthContacts != null
        ? `${formatWhole(summary.peakForecastMonthContacts)} contacts`
        : 'Highest monthly rollup'
    },
    {
      label: 'Last Run',
      value: lastRun.value?.runAt ? formatDateTime(lastRun.value.runAt) : '—',
      meta: 'Most recent successful forecast run'
    }
  ]
})

const accuracyItems = computed(() => {
  const holdout = holdoutMetrics.value
  if (!holdout) {
    return []
  }

  return [
    {
      label: 'Train Rows',
      value: holdout.trainingRows != null ? formatWhole(holdout.trainingRows) : '—',
      meta: holdout.trainingDateRange || 'Rows used to fit the scored model'
    },
    {
      label: 'Test Rows',
      value: holdout.testRows != null ? formatWhole(holdout.testRows) : '—',
      meta: holdout.testDateRange || 'Rows compared to actuals'
    },
    {
      label: 'MAE',
      value: holdout.mae != null ? formatNumber(holdout.mae, 1) : '—',
      meta: 'Average absolute daily error'
    },
    {
      label: 'RMSE',
      value: holdout.rmse != null ? formatNumber(holdout.rmse, 1) : '—',
      meta: 'Root mean squared daily error'
    },
    {
      label: 'MAPE',
      value: holdout.mape != null ? formatPercent(holdout.mape, 1) : '—',
      meta: 'Average percent error on non-zero actuals'
    },
    {
      label: 'WAPE',
      value: holdout.wape != null ? formatPercent(holdout.wape, 1) : '—',
      meta: 'Weighted absolute percent error'
    }
  ]
})

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
    id: 'holidays',
    title: 'Holiday Effects',
    points: lastRun.value?.components?.holidays || []
  }
].filter((section) => section.points.length > 0))
</script>

<template>
  <AppPanel :padded="false" class="grid content-start">
    <div class="border-b border-slate-200 px-4 py-4">
      <div class="grid gap-3">
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
      </div>
    </div>

    <div class="workspace-pane workspace-output">
      <AppStatusMessage v-if="props.runError" tone="error">
        {{ props.runError }}
      </AppStatusMessage>

      <template v-if="!hasResults">
        <AppEmptyState
          title="No forecast run yet"
          description="Run the forecast to review results here."
        >
          <div class="pt-2">
            <AppButton size="sm" variant="secondary" @click="emit('open-setup')">
              Forecast Setup
            </AppButton>
          </div>
        </AppEmptyState>
      </template>

      <template v-else>
        <template v-if="activeResultTab === 'overview'">
          <AppStatStrip :items="summaryItems" columns="md:grid-cols-2 xl:grid-cols-3" />

          <AppWorkspaceSection
            v-if="holdoutMetrics || props.project.modelConfig.runNotes"
            title="Run Notes"
          >
            <div class="grid gap-2 text-sm text-slate-700">
              <p v-if="holdoutMetrics">
                Test set: <strong class="text-slate-950">{{ holdoutMetrics.testDateRange }}</strong>
                ({{ holdoutMetrics.holdoutDays }} days).
              </p>
              <p v-if="props.project.modelConfig.runNotes" class="text-slate-600">
                {{ props.project.modelConfig.runNotes }}
              </p>
            </div>
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

          <AppWorkspaceSection v-if="noteMessages.length" title="Data Prep">
            <ul class="grid gap-2 text-sm leading-6 text-slate-700">
              <li v-for="note in noteMessages" :key="note">
                {{ note }}
              </li>
            </ul>
          </AppWorkspaceSection>
        </template>

        <template v-else-if="activeResultTab === 'daily'">
          <AppWorkspaceSection title="Forecast vs History">
            <ForecastDailyChart
              :rows="dailyRows"
              :format-number="formatNumber"
            />
          </AppWorkspaceSection>

          <AppTableShell>
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
          <AppTableShell>
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

          <div v-else class="grid gap-4">
            <AppWorkspaceSection
              v-for="section in componentSections"
              :key="section.id"
              :title="section.title"
            >
              <ForecastComponentChart
                :title="section.title"
                :points="section.points"
                :format-number="formatNumber"
              />
            </AppWorkspaceSection>
          </div>
        </template>

        <template v-else>
          <template v-if="holdoutMetrics">
            <AppStatStrip :items="accuracyItems" columns="md:grid-cols-2 xl:grid-cols-3" />

            <AppWorkspaceSection title="Held-Back Window">
              <div class="grid gap-2 text-sm text-slate-700">
                <p>
                  Trained on {{ holdoutMetrics.trainingDateRange }} and compared forecasts to actuals on
                  <strong class="text-slate-950">{{ holdoutMetrics.testDateRange }}</strong>.
                </p>
                <p>
                  Mean actual {{ holdoutMetrics.meanActual == null ? '—' : formatNumber(holdoutMetrics.meanActual, 1) }} |
                  Mean forecast {{ holdoutMetrics.meanForecast == null ? '—' : formatNumber(holdoutMetrics.meanForecast, 1) }} |
                  Bias {{ holdoutMetrics.bias == null ? '—' : formatNumber(holdoutMetrics.bias, 1) }} |
                  Interval coverage {{ holdoutMetrics.intervalCoverage == null ? '—' : formatPercent(holdoutMetrics.intervalCoverage, 1) }}
                </p>
                <p v-if="props.project.modelConfig.runNotes" class="text-slate-600">
                  {{ props.project.modelConfig.runNotes }}
                </p>
              </div>
            </AppWorkspaceSection>

            <AppTableShell>
              <div class="border-b border-slate-200 px-5 py-4">
                <AppSectionHeader title="Forecast vs Actual" />
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-[1040px] w-full border-collapse text-sm text-slate-700">
                  <thead class="border-b border-slate-200 bg-slate-50/85">
                    <tr>
                      <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Date</th>
                      <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Actual</th>
                      <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Forecast</th>
                      <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Lower</th>
                      <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Upper</th>
                      <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Abs Error</th>
                      <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">% Error</th>
                      <th class="px-5 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">In Band</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="row in accuracyRows" :key="row.ds" class="bg-white">
                      <td class="px-5 py-3">{{ formatDate(row.ds) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.actualValue) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums font-medium text-slate-900">{{ formatWhole(row.forecastValue) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.lowerBound) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.upperBound) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.absoluteError) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ row.percentError == null ? '—' : formatPercent(row.percentError, 1) }}</td>
                      <td class="px-5 py-3 text-right">{{ row.withinInterval ? 'Yes' : 'No' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </AppTableShell>
          </template>

          <template v-else>
            <AppEmptyState
              title="No test set scored"
              description="Set Hold Back Days above zero to compare the forecast against actuals at the end of the history."
            />
          </template>

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

          <AppWorkspaceSection v-if="noteMessages.length" title="Data Prep">
            <ul class="grid gap-2 text-sm leading-6 text-slate-700">
              <li v-for="note in noteMessages" :key="note">{{ note }}</li>
            </ul>
          </AppWorkspaceSection>
        </template>
      </template>
    </div>
  </AppPanel>
</template>
