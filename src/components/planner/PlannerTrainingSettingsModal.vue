<script setup>
import { computed } from 'vue'

import { createTrainingSettings } from '../../plannerModel'
import AppButton from '../ui/AppButton.vue'
import AppCheckbox from '../ui/AppCheckbox.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppNumberField from '../ui/AppNumberField.vue'

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
      <section class="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Shared Training Defaults
          </span>
          <p class="text-sm text-slate-600">
            These settings drive every class recommendation and every derived graduation or frontline-ready date in the staffing plan.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-slate-700">Training Duration (Workdays)</span>
            <AppNumberField
              v-model="trainingSettings.trainingDurationWorkdays"
              min="1"
              step="1"
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-slate-700">Graduation Yield (%)</span>
            <AppNumberField
              v-model="trainingSettings.graduationYieldPercent"
              min="0"
              max="100"
              step="0.1"
              :min-fraction-digits="0"
              :max-fraction-digits="1"
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-slate-700">Available Trainers</span>
            <AppNumberField
              v-model="trainingSettings.availableTrainers"
              min="0"
              step="1"
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-slate-700">Max Class Size</span>
            <AppNumberField
              v-model="trainingSettings.maxClassSize"
              min="0"
              step="1"
            />
          </label>

          <label class="grid gap-2 md:col-span-2">
            <span class="text-sm font-medium text-slate-700">Post Training Nesting Days</span>
            <AppNumberField
              v-model="trainingSettings.postTrainingNestingDays"
              min="0"
              step="1"
            />
          </label>
        </div>
      </section>

      <section class="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5">
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Recommendation Rules
          </span>
          <p class="text-sm text-slate-600">
            Set how recommendations anchor weekly start dates and how much concurrent training capacity the plan can support.
          </p>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-4">
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
        </div>

        <div class="rounded-[28px] border border-sky-100 bg-sky-50 px-4 py-4">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-sky-700">
            Concurrent Training Capacity
          </span>
          <div class="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {{ props.formatNumber(concurrentTrainingCapacity, 0) }}
          </div>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            {{ props.formatNumber(normalizedTrainingSettings.availableTrainers, 0) }} trainer(s) ×
            {{ props.formatNumber(normalizedTrainingSettings.maxClassSize, 0) }} seats per class
          </p>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex justify-end border-t border-slate-200 pt-5">
        <AppButton variant="primary" @click="emit('close')">Done</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
