<script setup>
import { computed } from 'vue'
import { mdiDownload } from '@mdi/js'

import AppButton from '../ui/AppButton.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableShell from '../ui/AppTableShell.vue'
import { downloadCsv, sanitizeFileNamePart } from '../../csvExport'
import {
  buildForecastAccuracyCsv,
  buildForecastAccuracyReview,
  buildForecastRollingOriginCsv
} from '../../forecasting/forecastAccuracyReview'
import {
  buildForecastAhtAccuracyCsv,
  buildForecastAhtAccuracyReview
} from '../../forecasting/forecastAhtAccuracyReview'
import { formatNumber, formatPercent } from '../../forecasting/shared'

const props = defineProps({
  holdout: {
    type: Object,
    default: null
  },
  projectName: {
    type: String,
    default: 'forecast'
  },
  project: {
    type: Object,
    default: null
  },
  reviewType: {
    type: String,
    default: 'contacts'
  }
})

const review = computed(() => props.reviewType === 'aht'
  ? buildForecastAhtAccuracyReview(props.project)
  : buildForecastAccuracyReview(props.holdout)
)
const hasExportRows = computed(() => Array.isArray(review.value?.rows) && review.value.rows.length > 0)
const hasStabilityExportRows = computed(() => Boolean(review.value?.rollingOrigin?.folds?.length))

const formatMetric = (row, value) => {
  if (value == null) {
    return 'Not available'
  }

  if (row.unit === 'percent') {
    return formatPercent(value, 1)
  }

  if (row.unit === 'signed-contacts' || row.unit === 'signed-seconds') {
    const prefix = value > 0 ? '+' : ''
    const suffix = row.unit === 'signed-seconds' ? ' sec' : ' contacts/day'
    return `${prefix}${formatNumber(value, 1)}${suffix}`
  }

  if (row.unit === 'seconds') {
    return `${formatNumber(value, 1)} sec`
  }

  return `${formatNumber(value, 1)} contacts/day`
}

const downloadReview = () => {
  if (!hasExportRows.value) {
    return
  }

  downloadCsv(
    `${sanitizeFileNamePart(props.projectName)}-${review.value.exportSuffix}.csv`,
    props.reviewType === 'aht'
      ? buildForecastAhtAccuracyCsv(review.value)
      : buildForecastAccuracyCsv(props.holdout)
  )
}

const downloadStabilityReview = () => {
  if (!hasStabilityExportRows.value) {
    return
  }

  downloadCsv(
    `${sanitizeFileNamePart(props.projectName)}-${review.value.rollingOrigin.exportSuffix}.csv`,
    buildForecastRollingOriginCsv(review.value.rollingOrigin)
  )
}

const formatStabilityOutcome = (fold) => {
  if (fold.wape == null || fold.benchmarkWape == null) {
    return 'WAPE unavailable'
  }
  if (fold.wape === fold.benchmarkWape) {
    return 'Same WAPE'
  }
  return fold.wape < fold.benchmarkWape ? 'Model lower' : 'Baseline lower'
}
</script>

<template>
  <section v-if="review" class="grid gap-3" aria-labelledby="forecast-accuracy-heading">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="grid gap-1">
        <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Holdout evidence</p>
        <h3 id="forecast-accuracy-heading" class="text-base font-semibold text-slate-950">{{ review.heading }}</h3>
        <p class="text-sm text-slate-600">
          {{ review.scoredRows }} of {{ review.testRows }} test days scored · {{ review.testDateRange }} · trained through {{ review.trainingDateRange.split(' to ').at(-1) }}
        </p>
      </div>
      <AppButton
        variant="secondary"
        size="sm"
        :icon="mdiDownload"
        :disabled="!hasExportRows"
        @click="downloadReview"
      >
        {{ review.exportLabel }}
      </AppButton>
    </div>

    <AppStatusMessage>
      {{ review.summary }}<template v-if="review.decisionNote">{{ ` ${review.decisionNote}` }}</template>
    </AppStatusMessage>

    <AppTableShell>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[820px] border-collapse text-sm">
          <thead class="bg-slate-50 text-left text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <tr>
              <th scope="col" class="px-4 py-2.5">Measure</th>
              <th scope="col" class="px-4 py-2.5 text-right">{{ review.candidateLabel }}</th>
              <th scope="col" class="px-4 py-2.5 text-right">
                {{ review.benchmarkLabel }}
              </th>
              <th scope="col" class="px-4 py-2.5">How to read it</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="row in review.metricRows" :key="row.id">
              <th scope="row" class="px-4 py-2.5 text-left font-medium text-slate-800">{{ row.label }}</th>
              <td class="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-950">
                {{ formatMetric(row, row.candidateValue ?? row.modelValue) }}
              </td>
              <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">
                {{ formatMetric(row, row.benchmarkValue) }}
              </td>
              <td class="max-w-[28rem] px-4 py-2.5 leading-5 text-slate-600">{{ row.interpretation }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppTableShell>

    <p class="text-xs leading-5 text-slate-500">
      {{ review.methodNote }}
    </p>

    <div v-if="review.rollingOrigin" class="mt-2 grid gap-3 border-t border-slate-200 pt-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="grid gap-1">
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Rolling-origin evidence</p>
          <h3 class="text-base font-semibold text-slate-950">{{ review.rollingOrigin.heading }}</h3>
          <p class="text-sm text-slate-600">
            {{ review.rollingOrigin.foldCount }} window{{ review.rollingOrigin.foldCount === 1 ? '' : 's' }} · {{ review.rollingOrigin.holdoutDaysPerFold }} test days per window
          </p>
        </div>
        <AppButton
          variant="secondary"
          size="sm"
          :icon="mdiDownload"
          :disabled="!hasStabilityExportRows"
          @click="downloadStabilityReview"
        >
          {{ review.rollingOrigin.exportLabel }}
        </AppButton>
      </div>

      <AppStatusMessage>
        {{ review.rollingOrigin.summary }} This does not accept or reject the forecast.
      </AppStatusMessage>

      <AppTableShell>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[960px] border-collapse text-sm">
            <thead class="bg-slate-50 text-left text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
              <tr>
                <th scope="col" class="px-4 py-2.5">Window</th>
                <th scope="col" class="px-4 py-2.5">Test dates</th>
                <th scope="col" class="px-4 py-2.5">Trained through</th>
                <th scope="col" class="px-4 py-2.5 text-right">Model WAPE</th>
                <th scope="col" class="px-4 py-2.5 text-right">Baseline WAPE</th>
                <th scope="col" class="px-4 py-2.5 text-right">Mean bias</th>
                <th scope="col" class="px-4 py-2.5 text-right">Interval coverage</th>
                <th scope="col" class="px-4 py-2.5">Outcome</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="fold in review.rollingOrigin.folds" :key="fold.foldNumber">
                <th scope="row" class="px-4 py-2.5 text-left font-medium text-slate-800">{{ fold.label }}</th>
                <td class="whitespace-nowrap px-4 py-2.5 text-slate-700">{{ fold.testDateRange }}</td>
                <td class="whitespace-nowrap px-4 py-2.5 text-slate-700">{{ fold.trainingThrough }}</td>
                <td class="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-950">{{ fold.wape == null ? 'Not available' : formatPercent(fold.wape, 1) }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ fold.benchmarkWape == null ? 'Not available' : formatPercent(fold.benchmarkWape, 1) }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ fold.bias == null ? 'Not available' : `${fold.bias > 0 ? '+' : ''}${formatNumber(fold.bias, 1)}` }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ fold.intervalCoverage == null ? 'Not available' : formatPercent(fold.intervalCoverage, 1) }}</td>
                <td class="px-4 py-2.5 font-medium text-slate-700">{{ formatStabilityOutcome(fold) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppTableShell>

      <p class="text-xs leading-5 text-slate-500">
        {{ review.rollingOrigin.methodNote }}
      </p>
    </div>
  </section>
</template>
