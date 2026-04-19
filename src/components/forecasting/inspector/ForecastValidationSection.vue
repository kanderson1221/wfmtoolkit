<script setup>
import { mdiChartTimelineVariant } from '@mdi/js'

import AppInfoTooltip from '../../ui/AppInfoTooltip.vue'
import AppNumberField from '../../ui/AppNumberField.vue'
import AppStatusMessage from '../../ui/AppStatusMessage.vue'
import AppWorkspaceSection from '../../ui/AppWorkspaceSection.vue'
import { inspectorHelp } from '../forecastInspectorHelp'

defineProps({
  holdoutDays: {
    type: Number,
    default: 0
  },
  holdoutIsValid: {
    type: Boolean,
    default: true
  },
  holdoutSummary: {
    type: String,
    default: ''
  },
  validationMessages: {
    type: Array,
    default: () => []
  }
})

const project = defineModel('project', {
  type: Object,
  required: true
})

const intervalWidthPercent = defineModel('intervalWidthPercent', {
  type: Number,
  required: true
})
</script>

<template>
  <AppWorkspaceSection
    kicker="Scoring"
    title="Validation"
    :icon="mdiChartTimelineVariant"
  >
    <template #actions>
      <span class="rounded-full border border-[#d5e0ea] bg-[#eef4f8] px-3 py-1 text-[0.72rem] font-semibold text-[#15395f]">
        {{ holdoutDays ? `${holdoutDays} day holdout` : 'No holdout' }}
      </span>
    </template>

    <div class="grid gap-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-holdout-days" class="text-sm font-medium text-slate-950">
              Test Set Days
            </label>
            <AppInfoTooltip label="Test Set Days" :content="inspectorHelp.holdoutDays" />
          </div>
          <AppNumberField
            id="forecast-holdout-days"
            v-model="project.modelConfig.holdoutDays"
            :min="0"
            :step="1"
            compact
            class="border-slate-200 bg-slate-50 text-right tabular-nums shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-interval-width" class="text-sm font-medium text-slate-950">
              Confidence
            </label>
            <AppInfoTooltip label="Confidence" :content="inspectorHelp.confidence" />
          </div>
          <AppNumberField
            id="forecast-interval-width"
            v-model="intervalWidthPercent"
            :min="10"
            :max="99"
            :step="5"
            suffix="%"
            compact
            class="border-slate-200 bg-slate-50 text-right tabular-nums shadow-none focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      <AppStatusMessage v-if="!holdoutIsValid" tone="error">
        {{ holdoutSummary }}
      </AppStatusMessage>

      <div
        v-else
        class="rounded-[20px] border border-[#d5e0ea] bg-[#eef4f8] px-4 py-3 text-sm font-medium text-[#15395f]"
      >
        {{ holdoutSummary }}
      </div>

      <div v-if="validationMessages.length" class="grid gap-2">
        <AppStatusMessage
          v-for="message in validationMessages"
          :key="message"
          tone="error"
        >
          {{ message }}
        </AppStatusMessage>
      </div>
    </div>
  </AppWorkspaceSection>
</template>
