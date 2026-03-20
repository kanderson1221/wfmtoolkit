<script setup>
import { computed } from 'vue'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Plan Year'
  },
  description: {
    type: String,
    default: 'Update the planning year for this plan. Each staffing group can have only one plan per year.'
  },
  submitLabel: {
    type: String,
    default: 'Done'
  },
  yearOptions: {
    type: Array,
    required: true
  },
  canClose: {
    type: Boolean,
    default: true
  },
  allowBackdropClose: {
    type: Boolean,
    default: true
  },
  statusMessage: {
    type: String,
    default: ''
  },
  statusTone: {
    type: String,
    default: 'success'
  },
  existingPlanHref: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['cancel', 'close'])

const planningYear = defineModel('planningYear', {
  type: Number,
  required: true
})

const dialogOpen = computed({
  get: () => true,
  set: (value) => {
    if (!value) {
      emit('cancel')
    }
  }
})
</script>

<template>
  <AppDialog
    v-model:visible="dialogOpen"
    :title="props.title"
    :description="props.description"
    kicker="Plan"
    :allow-backdrop-close="props.allowBackdropClose"
    max-width="max-w-xl"
    @close="emit('cancel')"
  >
    <div class="grid gap-4">
      <AppFieldGroup label="Planning Year" input-id="plan-year">
        <AppSelect id="plan-year" v-model="planningYear" :options="props.yearOptions" autofocus />
      </AppFieldGroup>

      <AppStatusMessage>
        The plan will be labeled automatically as <strong>{{ planningYear }} Plan</strong>. Operating days, paid hours, occupancy, and adherence come from the staffing group.
      </AppStatusMessage>

      <AppStatusMessage v-if="props.statusMessage" :tone="props.statusTone">
        {{ props.statusMessage }}
      </AppStatusMessage>

      <div v-if="props.existingPlanHref" class="flex justify-end">
        <AppButton variant="secondary" :href="props.existingPlanHref">Open Existing Plan</AppButton>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <AppButton variant="secondary" @click="emit('cancel')">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!props.canClose" @click="emit('close')">{{ props.submitLabel }}</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
