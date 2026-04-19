<script setup>
import { mdiTuneVariant } from '@mdi/js'

import AppInfoTooltip from '../../ui/AppInfoTooltip.vue'
import AppToggleSwitch from '../../ui/AppToggleSwitch.vue'
import AppWorkspaceSection from '../../ui/AppWorkspaceSection.vue'
import { inspectorHelp } from '../forecastInspectorHelp'

defineProps({
  seasonalitySummaryLabel: {
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
    kicker="Patterns"
    title="Seasonality"
    :icon="mdiTuneVariant"
  >
    <template #actions>
      <span class="rounded-full border border-[#d5e0ea] bg-[#eef4f8] px-3 py-1 text-[0.72rem] font-semibold text-[#15395f]">
        {{ seasonalitySummaryLabel }}
      </span>
    </template>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="flex items-center justify-between gap-4 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div class="grid gap-1">
          <div class="flex items-center gap-1.5 text-sm font-medium text-slate-950">
            <span>Weekly</span>
            <AppInfoTooltip label="Weekly" :content="inspectorHelp.weeklySeasonality" />
          </div>
          <span class="text-[0.82rem] text-slate-500">Day-of-week rhythm</span>
        </div>
        <AppToggleSwitch
          input-id="forecast-weekly-toggle"
          aria-label="Toggle weekly seasonality"
          v-model="project.modelConfig.weeklySeasonalityEnabled"
        />
      </div>

      <div class="flex items-center justify-between gap-4 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div class="grid gap-1">
          <div class="flex items-center gap-1.5 text-sm font-medium text-slate-950">
            <span>Monthly</span>
            <AppInfoTooltip label="Monthly" :content="inspectorHelp.monthlySeasonality" />
          </div>
          <span class="text-[0.82rem] text-slate-500">Approximate 30-day cycle</span>
        </div>
        <AppToggleSwitch
          input-id="forecast-monthly-toggle"
          aria-label="Toggle monthly seasonality"
          v-model="project.modelConfig.monthlySeasonalityEnabled"
        />
      </div>

      <div class="flex items-center justify-between gap-4 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div class="grid gap-1">
          <div class="flex items-center gap-1.5 text-sm font-medium text-slate-950">
            <span>Yearly</span>
            <AppInfoTooltip label="Yearly" :content="inspectorHelp.yearlySeasonality" />
          </div>
          <span class="text-[0.82rem] text-slate-500">Annual recurring shape</span>
        </div>
        <AppToggleSwitch
          input-id="forecast-yearly-toggle"
          aria-label="Toggle yearly seasonality"
          v-model="project.modelConfig.yearlySeasonalityEnabled"
        />
      </div>
    </div>
  </AppWorkspaceSection>
</template>
