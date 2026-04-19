<script setup>
import { mdiClockOutline } from '@mdi/js'

import AppNumberField from '../../ui/AppNumberField.vue'
import AppSelect from '../../ui/AppSelect.vue'
import AppWorkspaceSection from '../../ui/AppWorkspaceSection.vue'
import { FORECAST_AHT_ASSUMPTION_METHOD_OPTIONS } from '../../../forecasting/handleTimeAssumptions'

defineProps({
  ahtHistoryRowCount: {
    type: Number,
    default: 0
  },
  availableAhtSummary: {
    type: String,
    default: ''
  },
  handleTimeWindowSummary: {
    type: String,
    default: ''
  },
  handleTimeSourceLabel: {
    type: String,
    default: ''
  }
})

const project = defineModel('project', {
  type: Object,
  required: true
})
</script>

<template>
  <AppWorkspaceSection
    kicker="Monthly Assumptions"
    title="Handle Time Assumptions"
    :icon="mdiClockOutline"
  >
    <template #actions>
      <span class="rounded-full border border-[#d5e0ea] bg-[#eef4f8] px-3 py-1 text-[0.72rem] font-semibold text-[#15395f]">
        {{ handleTimeSourceLabel }}
      </span>
    </template>

    <div class="grid gap-4">
      <div class="grid gap-1 rounded-[20px] border border-[#d5e0ea] bg-white px-4 py-3 shadow-sm">
        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Available AHT History
        </span>
        <p class="text-sm font-medium text-slate-900">
          {{ availableAhtSummary }}
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <label for="forecast-aht-assumption-method" class="text-sm font-medium text-slate-950">
            Method
          </label>
          <AppSelect
            id="forecast-aht-assumption-method"
            v-model="project.modelConfig.ahtAssumptionMethod"
            :options="FORECAST_AHT_ASSUMPTION_METHOD_OPTIONS"
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div
          v-if="project.modelConfig.ahtAssumptionMethod === 'blend_recent_seasonal'"
          class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <label for="forecast-aht-recent-months-window" class="text-sm font-medium text-slate-950">
            Recent Months
          </label>
          <AppNumberField
            id="forecast-aht-recent-months-window"
            v-model="project.modelConfig.ahtRecentMonthsWindow"
            :min="1"
            :max="12"
            :step="1"
            compact
            class="border-slate-200 bg-slate-50 text-right tabular-nums shadow-none focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      <div class="grid gap-2 rounded-[20px] border border-[#d5e0ea] bg-[#eef4f8] px-4 py-3">
        <p class="text-sm font-medium text-[#15395f]">
          {{ handleTimeWindowSummary }}
        </p>
        <p class="text-[0.82rem] text-slate-600">
          Review monthly AHT on the AHT tab.
        </p>
      </div>
    </div>
  </AppWorkspaceSection>
</template>
