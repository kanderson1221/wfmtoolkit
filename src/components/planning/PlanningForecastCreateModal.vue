<script setup>
import { computed } from 'vue'

import { FORECAST_TYPE_OPTIONS, FORECAST_TYPE_REFORECAST } from '../../forecasting/shared'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'

const props = defineProps({
  yearOptions: {
    type: Array,
    required: true
  },
  startMonthOptions: {
    type: Array,
    required: true
  },
  canCreate: {
    type: Boolean,
    default: false
  },
  statusMessage: {
    type: String,
    default: ''
  },
  existingForecastHref: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['cancel', 'create'])

const planningYear = defineModel('planningYear', {
  type: [Number, String],
  required: true
})

const forecastType = defineModel('forecastType', {
  type: String,
  required: true
})

const coverageStartMonthIndex = defineModel('coverageStartMonthIndex', {
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

const planYearOptions = computed(() => [
  { label: 'Select plan year', value: '' },
  ...props.yearOptions
])

const forecastTypeOptions = computed(() => [
  { label: 'Select forecast type', value: '' },
  ...FORECAST_TYPE_OPTIONS
])
</script>

<template>
  <AppDialog
    v-model:visible="dialogOpen"
    title="Create Forecast"
    description="Choose the planning year and forecast type before opening the forecast workspace."
    kicker="Forecast"
    max-width="max-w-xl"
    @close="emit('cancel')"
  >
    <div class="grid gap-4">
      <AppFieldGroup label="Plan Year" input-id="forecast-create-year">
        <AppSelect id="forecast-create-year" v-model="planningYear" :options="planYearOptions" autofocus />
      </AppFieldGroup>

      <AppFieldGroup label="Forecast Type" input-id="forecast-create-type">
        <AppSelect id="forecast-create-type" v-model="forecastType" :options="forecastTypeOptions" />
      </AppFieldGroup>

      <AppFieldGroup
        v-if="forecastType === FORECAST_TYPE_REFORECAST"
        label="Reforecast Start Month"
        input-id="forecast-create-start-month"
      >
        <AppSelect
          id="forecast-create-start-month"
          v-model="coverageStartMonthIndex"
          :options="props.startMonthOptions"
        />
      </AppFieldGroup>

      <AppStatusMessage v-if="props.statusMessage" tone="info">
        {{ props.statusMessage }}
      </AppStatusMessage>

      <div v-if="props.existingForecastHref" class="flex justify-end">
        <AppButton variant="secondary" :href="props.existingForecastHref">Open Existing Forecast</AppButton>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <AppButton variant="secondary" @click="emit('cancel')">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!props.canCreate" @click="emit('create')">Create Forecast</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
