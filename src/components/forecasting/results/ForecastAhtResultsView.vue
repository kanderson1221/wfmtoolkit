<script setup>
import ForecastMonthlyAhtChart from '../ForecastMonthlyAhtChart.vue'
import ForecastAccuracyReview from '../ForecastAccuracyReview.vue'
import AppButton from '../../ui/AppButton.vue'
import AppTableNumberField from '../../ui/AppTableNumberField.vue'
import { formatForecastAhtSeconds } from '../../../forecasting/handleTimeAssumptions'

defineProps({
  project: {
    type: Object,
    required: true
  },
  ahtHighlights: {
    type: Array,
    default: () => []
  },
  monthlyAhtHistory: {
    type: Array,
    default: () => []
  },
  monthlyAhtAssumptions: {
    type: Array,
    default: () => []
  },
  monthlyAhtSummary: {
    type: Object,
    default: () => ({})
  },
  getAhtMonthOverrideValue: {
    type: Function,
    required: true
  },
  setAhtMonthOverride: {
    type: Function,
    required: true
  },
  clearAhtMonthOverrides: {
    type: Function,
    required: true
  }
})
</script>

<template>
  <section class="grid gap-4">
    <div class="bg-white px-4 pb-1">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div class="grid gap-1">
          <h3 class="text-lg font-semibold tracking-[-0.02em] text-slate-950">
            Monthly Handle Time Assumptions
          </h3>
          <p class="text-sm leading-6 text-slate-600">
            Shared staffing-group history is rolled into monthly weighted AHT, then translated into monthly planning assumptions for this forecast.
          </p>
        </div>

        <div class="flex flex-wrap gap-2 xl:justify-end">
          <span
            v-for="item in ahtHighlights"
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

      <div class="mt-4 grid gap-4">
        <div class="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span class="inline-flex items-center gap-2">
            <span class="h-1.5 w-5 rounded-full bg-[#475569]"></span>
            Historical weighted AHT
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-0.5 w-5 bg-[#94a3b8]"></span>
            Suggested AHT
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-1.5 w-5 rounded-full bg-[#0f766e]"></span>
            Final AHT
          </span>
          <span v-if="monthlyAhtSummary.overrideMonthCount" class="inline-flex items-center gap-2">
            <span class="inline-flex h-2.5 w-2.5 rotate-45 rounded-[0.1rem] bg-[#0f766e] ring-1 ring-white"></span>
            Overridden month
          </span>
        </div>

        <ForecastMonthlyAhtChart
          :historical-rows="monthlyAhtHistory"
          :forecast-rows="monthlyAhtAssumptions"
        />
      </div>
    </div>

    <ForecastAccuracyReview
      review-type="aht"
      :project="project"
      :project-name="project.name"
    />

    <section class="overflow-hidden border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="grid gap-1">
          <h3 class="text-base font-semibold tracking-[-0.02em] text-slate-950">
            Monthly AHT Review
          </h3>
          <p class="text-sm leading-6 text-slate-600">
            Suggested AHT comes from {{ monthlyAhtSummary.methodLabel.toLowerCase() }}. Enter a monthly override when the staffing assumption needs to differ from the model suggestion.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 xl:justify-end">
          <p v-if="monthlyAhtSummary.trainingWindowLabel" class="text-[0.82rem] text-slate-500">
            Training window: {{ monthlyAhtSummary.trainingWindowLabel }}
          </p>
          <AppButton
            v-if="monthlyAhtSummary.overrideMonthCount"
            size="sm"
            variant="secondary"
            @click="clearAhtMonthOverrides"
          >
            Clear AHT Overrides
          </AppButton>
        </div>
      </div>

      <div class="max-h-[28rem] overflow-auto">
        <table class="min-w-[1040px] w-full border-collapse text-sm text-slate-700">
          <thead class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95">
            <tr>
              <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Month</th>
              <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Same-Month History</th>
              <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Suggested AHT</th>
              <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Override</th>
              <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Final AHT</th>
              <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Basis</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="row in monthlyAhtAssumptions" :key="row.monthStart" class="bg-white align-top">
              <td class="px-5 py-3 font-medium text-slate-900">{{ row.monthLabel }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatForecastAhtSeconds(row.seasonalAhtSeconds) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatForecastAhtSeconds(row.suggestedAhtSeconds) }}</td>
              <td class="px-4 py-3">
                <AppTableNumberField
                  :model-value="getAhtMonthOverrideValue(row.monthStart)"
                  :min="0"
                  :step="1"
                  placeholder="—"
                  :aria-label="`Monthly handle time override for ${row.monthLabel}`"
                  @update:model-value="setAhtMonthOverride(row.monthStart, $event)"
                />
              </td>
              <td class="px-4 py-3 text-right tabular-nums font-medium text-slate-900">{{ formatForecastAhtSeconds(row.assumedAhtSeconds) }}</td>
              <td class="px-5 py-3 text-sm leading-6 text-slate-600">{{ row.basisLabel }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
