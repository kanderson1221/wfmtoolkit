<script setup>
import { mdiChartTimelineVariant } from '@mdi/js'

import AppButton from '../../ui/AppButton.vue'
import AppInfoTooltip from '../../ui/AppInfoTooltip.vue'
import AppNumberField from '../../ui/AppNumberField.vue'
import AppTextField from '../../ui/AppTextField.vue'
import AppWorkspaceSection from '../../ui/AppWorkspaceSection.vue'
import { FORECAST_HORIZON_PRESETS, isPlanAlignedForecast } from '../../../forecasting/shared'
import { inspectorHelp } from '../forecastInspectorHelp'
import { computed } from 'vue'

const project = defineModel('project', {
  type: Object,
  required: true
})

const isPlanAligned = computed(() => isPlanAlignedForecast(project.value))
</script>

<template>
  <AppWorkspaceSection
    kicker="Scope"
    :title="isPlanAligned ? 'Forecast Coverage' : 'Forecast Horizon'"
    :icon="mdiChartTimelineVariant"
  >
    <div v-if="isPlanAligned" class="grid gap-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <label for="forecast-coverage-start-date" class="text-sm font-medium text-slate-950">
            Coverage Start
          </label>
          <AppTextField
            id="forecast-coverage-start-date"
            v-model.trim="project.coverageStartDate"
            type="date"
            compact
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <label for="forecast-coverage-end-date" class="text-sm font-medium text-slate-950">
            Coverage End
          </label>
          <AppTextField
            id="forecast-coverage-end-date"
            v-model.trim="project.coverageEndDate"
            type="date"
            compact
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      <div class="rounded-[20px] border border-[#d5e0ea] bg-[#eef4f8] px-4 py-3 text-sm font-medium text-[#15395f]">
        Coverage controls which forecasted dates are saved into monthly planning rollups. Training data remains controlled separately.
      </div>
    </div>

    <div v-else class="grid gap-4">
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
