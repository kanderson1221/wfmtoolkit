<script setup>
import { computed } from 'vue'

import { formatForecastAhtSeconds } from '../../../forecasting/handleTimeAssumptions'
import {
  FORECAST_SOURCE_IMPORTED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  formatDate,
  formatWhole
} from '../../../forecasting/shared'

const props = defineProps({
  embeddedMonthlyHighlights: {
    type: Array,
    default: () => []
  },
  showAhtAssumptions: {
    type: Boolean,
    default: false
  },
  showContactAdjustmentTrace: {
    type: Boolean,
    default: false
  },
  monthlyAhtSummary: {
    type: Object,
    default: () => ({})
  },
  monthlyRowsWithAht: {
    type: Array,
    default: () => []
  },
  sourceKind: {
    type: String,
    default: ''
  },
  warningMessages: {
    type: Array,
    default: () => []
  },
  noteMessages: {
    type: Array,
    default: () => []
  }
})

const ahtAssumptionDescription = computed(() => {
  if (props.sourceKind === FORECAST_SOURCE_IMPORTED_DAILY) {
    return 'Assumed AHT comes from the imported daily AHT column, rolled up to monthly weighted averages.'
  }

  const overrideText = props.monthlyAhtSummary.overrideMonthCount
    ? `, with ${formatWhole(props.monthlyAhtSummary.overrideMonthCount)} monthly override${props.monthlyAhtSummary.overrideMonthCount === 1 ? '' : 's'}`
    : ''

  return `Assumed AHT comes from shared staffing-group history using ${String(props.monthlyAhtSummary.methodLabel || '').toLowerCase()}${overrideText}.`
})

const formatSignedContacts = (value) => {
  const numericValue = Number(value || 0)
  return `${numericValue > 0 ? '+' : ''}${formatWhole(numericValue)}`
}
</script>

<template>
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
        {{ ahtAssumptionDescription }}
      </p>

      <div class="mt-3 overflow-hidden border border-slate-200 bg-white">
        <div class="max-h-[26rem] overflow-auto">
          <table class="min-w-[960px] w-full border-collapse text-sm text-slate-700">
            <thead class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95">
              <tr>
                <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Month</th>
                <th
                  v-if="showContactAdjustmentTrace"
                  class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                  Baseline Contacts
                </th>
                <th
                  v-if="showContactAdjustmentTrace"
                  class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                  Manual Change
                </th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {{ showContactAdjustmentTrace ? 'Final Contacts' : 'Contacts' }}
                </th>
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
                <td v-if="showContactAdjustmentTrace" class="px-4 py-3 text-right tabular-nums">
                  {{ formatWhole(row.baselineContacts) }}
                </td>
                <td
                  v-if="showContactAdjustmentTrace"
                  class="px-4 py-3 text-right tabular-nums font-medium"
                  :class="Number(row.manualAdjustmentDelta || 0) === 0 ? 'text-slate-500' : 'text-slate-900'"
                >
                  {{ formatSignedContacts(row.manualAdjustmentDelta) }}
                </td>
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
