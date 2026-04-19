<script setup>
import { mdiDatabaseOutline } from '@mdi/js'

import AppStatusMessage from '../../ui/AppStatusMessage.vue'
import AppTextField from '../../ui/AppTextField.vue'
import AppWorkspaceSection from '../../ui/AppWorkspaceSection.vue'

defineProps({
  availableTrainingWindow: {
    type: Object,
    default: () => ({})
  },
  historyRowCount: {
    type: Number,
    default: 0
  },
  trainingWindowIsValid: {
    type: Boolean,
    default: true
  },
  availableTrainingSummary: {
    type: String,
    default: ''
  },
  trainingWindowSummary: {
    type: String,
    default: ''
  },
  trainingDataSourceLabel: {
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
    kicker="Core Inputs"
    title="Training Data"
    :icon="mdiDatabaseOutline"
  >
    <template #actions>
      <span class="rounded-full border border-[#d5e0ea] bg-[#eef4f8] px-3 py-1 text-[0.72rem] font-semibold text-[#15395f]">
        {{ trainingDataSourceLabel }}
      </span>
    </template>

    <div class="grid gap-4">
      <div class="grid gap-1 rounded-[20px] border border-[#d5e0ea] bg-white px-4 py-3 shadow-sm">
        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Available History
        </span>
        <p class="text-sm font-medium text-slate-900">
          {{ availableTrainingSummary }}
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <label for="forecast-training-start-date" class="text-sm font-medium text-slate-950">
            Start Date
          </label>
          <AppTextField
            id="forecast-training-start-date"
            v-model.trim="project.modelConfig.trainingStartDate"
            type="date"
            :min="availableTrainingWindow.availableStartDate"
            :max="availableTrainingWindow.availableEndDate"
            :disabled="!historyRowCount"
            compact
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <label for="forecast-training-end-date" class="text-sm font-medium text-slate-950">
            End Date
          </label>
          <AppTextField
            id="forecast-training-end-date"
            v-model.trim="project.modelConfig.trainingEndDate"
            type="date"
            :min="availableTrainingWindow.availableStartDate"
            :max="availableTrainingWindow.availableEndDate"
            :disabled="!historyRowCount"
            compact
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      <AppStatusMessage v-if="historyRowCount > 0 && !trainingWindowIsValid" tone="error">
        {{ trainingWindowSummary }}
      </AppStatusMessage>

      <div
        v-else
        class="rounded-[20px] border border-[#d5e0ea] bg-[#eef4f8] px-4 py-3 text-sm font-medium text-[#15395f]"
      >
        {{ trainingWindowSummary }}
      </div>
    </div>
  </AppWorkspaceSection>
</template>
