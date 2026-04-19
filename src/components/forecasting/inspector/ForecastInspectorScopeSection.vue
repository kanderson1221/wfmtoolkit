<script setup>
import { mdiChartTimelineVariant } from '@mdi/js'

import AppButton from '../../ui/AppButton.vue'
import AppInfoTooltip from '../../ui/AppInfoTooltip.vue'
import AppNumberField from '../../ui/AppNumberField.vue'
import AppWorkspaceSection from '../../ui/AppWorkspaceSection.vue'
import { FORECAST_HORIZON_PRESETS } from '../../../forecasting/shared'
import { inspectorHelp } from '../forecastInspectorHelp'

const project = defineModel('project', {
  type: Object,
  required: true
})
</script>

<template>
  <AppWorkspaceSection
    kicker="Scope"
    title="Forecast Horizon"
    :icon="mdiChartTimelineVariant"
  >
    <div class="grid gap-4">
      <div class="flex flex-wrap gap-2">
        <AppButton
          v-for="preset in FORECAST_HORIZON_PRESETS"
          :key="preset.id"
          size="sm"
          variant="tab"
          :active="project.forecastHorizonPreset === preset.id"
          @click="project.forecastHorizonPreset = preset.id"
        >
          {{ preset.label }}
        </AppButton>
      </div>

      <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm sm:max-w-[12rem]">
        <div class="flex items-center gap-1.5">
          <label for="forecast-horizon-custom" class="text-sm font-medium text-slate-950">
            Days To Forecast
          </label>
          <AppInfoTooltip label="Days To Forecast" :content="inspectorHelp.forecastHorizonDays" />
        </div>
        <AppNumberField
          id="forecast-horizon-custom"
          v-model="project.forecastHorizonDays"
          :min="1"
          :max="730"
          :step="1"
          class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
        />
      </div>
    </div>
  </AppWorkspaceSection>
</template>
