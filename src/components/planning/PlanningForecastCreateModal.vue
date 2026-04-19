<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppSelect from '../ui/AppSelect.vue'

const props = defineProps({
  yearOptions: {
    type: Array,
    required: true
  },
  canCreate: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'create'])

const planningYear = defineModel('planningYear', {
  type: [Number, String],
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

const planYearOptions = computed(() => [
  { label: 'Select plan year', value: '' },
  ...props.yearOptions
])
</script>

<template>
  <AppDialog
    v-model:visible="dialogOpen"
    title="New Forecast"
    description="Choose the plan year for a forecast built from this staffing group's shared history."
    kicker="Forecast"
    max-width="max-w-xl"
    @close="emit('cancel')"
  >
    <div class="grid gap-4">
      <AppFieldGroup label="Plan Year" input-id="forecast-create-year">
        <AppSelect
          id="forecast-create-year"
          v-model="planningYear"
          :options="planYearOptions"
          autofocus
        />
      </AppFieldGroup>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <AppButton variant="secondary" @click="emit('cancel')">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!props.canCreate" @click="emit('create')">Create Forecast</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
