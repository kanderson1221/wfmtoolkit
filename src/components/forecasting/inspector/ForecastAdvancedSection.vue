<script setup>
import { mdiCogOutline } from '@mdi/js'

import AppButton from '../../ui/AppButton.vue'
import AppInfoTooltip from '../../ui/AppInfoTooltip.vue'
import AppNumberField from '../../ui/AppNumberField.vue'
import AppSelect from '../../ui/AppSelect.vue'
import AppTextArea from '../../ui/AppTextArea.vue'
import AppTextField from '../../ui/AppTextField.vue'
import AppWorkspaceSection from '../../ui/AppWorkspaceSection.vue'
import {
  GROWTH_OPTIONS,
  SEASONALITY_MODE_OPTIONS
} from '../../../forecasting/shared'
import { inspectorHelp } from '../forecastInspectorHelp'

defineProps({
  advancedSummaryLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'add-custom-seasonality',
  'remove-custom-seasonality'
])

const project = defineModel('project', {
  type: Object,
  required: true
})
</script>

<template>
  <AppWorkspaceSection
    kicker="Model Controls"
    title="Advanced"
    :icon="mdiCogOutline"
  >
    <template #actions>
      <span class="rounded-full border border-[#d5e0ea] bg-[#eef4f8] px-3 py-1 text-[0.72rem] font-semibold text-[#15395f]">
        {{ advancedSummaryLabel }}
      </span>
    </template>

    <div class="grid gap-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-seasonality-mode" class="text-sm font-medium text-slate-950">
              Seasonality Type
            </label>
            <AppInfoTooltip label="Seasonality Type" :content="inspectorHelp.seasonalityMode" />
          </div>
          <AppSelect
            id="forecast-seasonality-mode"
            v-model="project.modelConfig.seasonalityMode"
            :options="SEASONALITY_MODE_OPTIONS"
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-growth-mode" class="text-sm font-medium text-slate-950">
              Trend Type
            </label>
            <AppInfoTooltip label="Trend Type" :content="inspectorHelp.growth" />
          </div>
          <AppSelect
            id="forecast-growth-mode"
            v-model="project.modelConfig.growth"
            :options="GROWTH_OPTIONS"
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-changepoint-prior" class="text-sm font-medium text-slate-950">
              Trend Sensitivity
            </label>
            <AppInfoTooltip label="Trend Sensitivity" :content="inspectorHelp.changepointPriorScale" />
          </div>
          <AppNumberField
            id="forecast-changepoint-prior"
            v-model="project.modelConfig.changepointPriorScale"
            :min="0.001"
            :step="0.01"
            :max-fraction-digits="3"
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-changepoint-range" class="text-sm font-medium text-slate-950">
              Trend Change Window
            </label>
            <AppInfoTooltip label="Trend Change Window" :content="inspectorHelp.changepointRange" />
          </div>
          <AppNumberField
            id="forecast-changepoint-range"
            v-model="project.modelConfig.changepointRange"
            :min="0.1"
            :max="1"
            :step="0.05"
            :max-fraction-digits="2"
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-changepoint-count" class="text-sm font-medium text-slate-950">
              Max Trend Changes
            </label>
            <AppInfoTooltip label="Max Trend Changes" :content="inspectorHelp.changepointCount" />
          </div>
          <AppNumberField
            id="forecast-changepoint-count"
            v-model="project.modelConfig.changepointCount"
            :min="0"
            :step="1"
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-mcmc-samples" class="text-sm font-medium text-slate-950">
              Sampling Runs
            </label>
            <AppInfoTooltip label="Sampling Runs" :content="inspectorHelp.mcmcSamples" />
          </div>
          <AppNumberField
            id="forecast-mcmc-samples"
            v-model="project.modelConfig.mcmcSamples"
            :min="0"
            :step="50"
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <template v-if="project.modelConfig.growth === 'logistic'">
          <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="flex items-center gap-1.5">
              <label for="forecast-default-floor" class="text-sm font-medium text-slate-950">
                Lower Forecast Limit
              </label>
              <AppInfoTooltip label="Lower Forecast Limit" :content="inspectorHelp.defaultFloor" />
            </div>
            <AppNumberField
              id="forecast-default-floor"
              v-model="project.modelConfig.defaultFloor"
              :min="0"
              :step="1"
              class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
            />
          </div>

          <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="flex items-center gap-1.5">
              <label for="forecast-default-cap" class="text-sm font-medium text-slate-950">
                Upper Forecast Limit
              </label>
              <AppInfoTooltip label="Upper Forecast Limit" :content="inspectorHelp.defaultCap" />
            </div>
            <AppNumberField
              id="forecast-default-cap"
              v-model="project.modelConfig.defaultCap"
              :min="0"
              :step="1"
              class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
            />
          </div>
        </template>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm sm:col-span-2">
          <div class="flex items-center gap-1.5">
            <label for="forecast-manual-changepoints" class="text-sm font-medium text-slate-950">
              Manual Trend Change Dates
            </label>
            <AppInfoTooltip label="Manual Trend Change Dates" :content="inspectorHelp.manualChangepoints" />
          </div>
          <AppTextArea
            id="forecast-manual-changepoints"
            v-model="project.modelConfig.manualChangepoints"
            rows="3"
            compact
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      <div class="grid gap-2.5">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-sm font-semibold text-slate-950">Custom Patterns</h4>
          <AppButton size="sm" variant="quiet" @click="emit('add-custom-seasonality')">
            Add Pattern
          </AppButton>
        </div>

        <div
          v-if="!project.modelConfig.customSeasonalities.length"
          class="rounded-[20px] border border-dashed border-slate-200 bg-white px-4 py-3 text-[0.82rem] text-slate-500"
        >
          No custom patterns.
        </div>

        <div v-else class="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
          <div
            v-for="seasonality in project.modelConfig.customSeasonalities"
            :key="seasonality.id"
            class="grid gap-3 border-t border-slate-200 p-4 first:border-t-0"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-name-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Name
                  </label>
                  <AppInfoTooltip label="Custom Pattern Name" :content="inspectorHelp.customSeasonalityName" />
                </div>
                <AppTextField
                  :id="`seasonality-name-${seasonality.id}`"
                  v-model.trim="seasonality.name"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-period-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Cycle Length
                  </label>
                  <AppInfoTooltip label="Cycle Length" :content="inspectorHelp.customSeasonalityPeriod" />
                </div>
                <AppNumberField
                  :id="`seasonality-period-${seasonality.id}`"
                  v-model="seasonality.periodDays"
                  :min="1"
                  :step="0.5"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-fourier-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Detail
                  </label>
                  <AppInfoTooltip label="Pattern Detail" :content="inspectorHelp.customSeasonalityFourier" />
                </div>
                <AppNumberField
                  :id="`seasonality-fourier-${seasonality.id}`"
                  v-model="seasonality.fourierOrder"
                  :min="1"
                  :step="1"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-prior-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Strength
                  </label>
                  <AppInfoTooltip label="Pattern Strength" :content="inspectorHelp.customSeasonalityStrength" />
                </div>
                <AppNumberField
                  :id="`seasonality-prior-${seasonality.id}`"
                  v-model="seasonality.priorScale"
                  :min="0.1"
                  :step="0.5"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
              <div class="grid gap-1.5 sm:col-span-2">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-mode-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Seasonality Type
                  </label>
                  <AppInfoTooltip label="Custom Seasonality Type" :content="inspectorHelp.customSeasonalityMode" />
                </div>
                <AppSelect
                  :id="`seasonality-mode-${seasonality.id}`"
                  v-model="seasonality.mode"
                  :options="SEASONALITY_MODE_OPTIONS"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
            </div>

            <div class="flex justify-end">
              <AppButton size="sm" variant="quiet" @click="emit('remove-custom-seasonality', seasonality.id)">
                Remove
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppWorkspaceSection>
</template>
