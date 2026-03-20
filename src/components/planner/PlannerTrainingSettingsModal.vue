<script setup>
import { computed } from 'vue'

import { createTrainingSettings } from '../../plannerModel'
import AppButton from '../ui/AppButton.vue'
import AppCheckbox from '../ui/AppCheckbox.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

const props = defineProps({
  formatNumber: {
    type: Function,
    required: true
  },
  allowBackdropClose: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])

const trainingSettings = defineModel('trainingSettings', {
  type: Object,
  required: true
})

const dialogOpen = computed({
  get: () => true,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  }
})

const normalizedTrainingSettings = computed(() => createTrainingSettings(trainingSettings.value))
const concurrentTrainingCapacity = computed(
  () => normalizedTrainingSettings.value.availableTrainers * normalizedTrainingSettings.value.maxClassSize
)

</script>

<template>
  <AppDialog
    v-model:visible="dialogOpen"
    title="Training Settings"
    description="Use one shared training profile to keep the class planner, graduation timing, and recommendation engine aligned."
    kicker="Staffing Plan"
    :allow-backdrop-close="props.allowBackdropClose"
    max-width="max-w-4xl"
    @close="emit('close')"
  >

    <div class="grid gap-4 lg:grid-cols-[1.15fr_0.92fr]">
      <AppWorkspaceSection
        kicker="Defaults"
        title="Shared training defaults"
        description="These settings drive every class recommendation and every derived graduation or frontline-ready date in the staffing plan."
      >
        <div class="grid gap-4 md:grid-cols-2">
          <AppFieldGroup label="Training Duration (Workdays)" input-id="training-duration-workdays">
            <AppNumberField
              input-id="training-duration-workdays"
              v-model="trainingSettings.trainingDurationWorkdays"
              min="1"
              step="1"
            />
          </AppFieldGroup>

          <AppFieldGroup label="Graduation Yield (%)" input-id="graduation-yield-percent">
            <AppNumberField
              input-id="graduation-yield-percent"
              v-model="trainingSettings.graduationYieldPercent"
              min="0"
              max="100"
              step="0.1"
              :min-fraction-digits="0"
              :max-fraction-digits="1"
            />
          </AppFieldGroup>

          <AppFieldGroup label="Available Trainers" input-id="available-trainers">
            <AppNumberField
              input-id="available-trainers"
              v-model="trainingSettings.availableTrainers"
              min="0"
              step="1"
            />
          </AppFieldGroup>

          <AppFieldGroup label="Max Class Size" input-id="max-class-size">
            <AppNumberField
              input-id="max-class-size"
              v-model="trainingSettings.maxClassSize"
              min="0"
              step="1"
            />
          </AppFieldGroup>

          <AppFieldGroup
            label="Post Training Nesting Days"
            input-id="post-training-nesting-days"
            class="md:col-span-2"
          >
            <AppNumberField
              input-id="post-training-nesting-days"
              v-model="trainingSettings.postTrainingNestingDays"
              min="0"
              step="1"
            />
          </AppFieldGroup>
        </div>
      </AppWorkspaceSection>

      <AppWorkspaceSection
        :subtle="false"
        kicker="Recommendations"
        title="Recommendation rules"
        description="Set how recommendations anchor weekly start dates and how much concurrent training capacity the plan can support."
      >
        <AppFieldGroup>
          <AppCheckbox
            input-id="training-settings-first-workday"
            v-model="trainingSettings.startOnFirstBusinessDayOfWeek"
          >
            <span class="grid gap-1">
              <span class="text-sm font-medium text-slate-800">Start recommended classes on the first business day of the week</span>
              <span class="text-sm text-slate-600">
                Recommended classes will snap to the first business day of a week instead of any open weekday.
              </span>
            </span>
          </AppCheckbox>
        </AppFieldGroup>

        <AppStatusMessage>
          <span class="block text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-sky-700">
            Concurrent Training Capacity
          </span>
          <span class="mt-2 block text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {{ props.formatNumber(concurrentTrainingCapacity, 0) }}
          </span>
          <span class="mt-2 block text-sm leading-6 text-slate-600">
            {{ props.formatNumber(normalizedTrainingSettings.availableTrainers, 0) }} trainer(s) ×
            {{ props.formatNumber(normalizedTrainingSettings.maxClassSize, 0) }} seats per class
          </span>
        </AppStatusMessage>
      </AppWorkspaceSection>
    </div>

    <template #footer>
      <div class="flex justify-end border-t border-slate-200 pt-5">
        <AppButton variant="primary" @click="emit('close')">Done</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
