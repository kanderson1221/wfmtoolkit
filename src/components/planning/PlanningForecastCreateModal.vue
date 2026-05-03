<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import {
  FORECAST_SOURCE_KIND_OPTIONS,
  getForecastSourceKindLabel
} from '../../forecasting/shared'

const props = defineProps({
  yearOptions: {
    type: Array,
    required: true
  },
  canCreate: {
    type: Boolean,
    default: false
  },
  modeledForecastUnavailableMessage: {
    type: String,
    default: ''
  },
  coverageMessage: {
    type: String,
    default: ''
  },
  monthOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['cancel', 'create'])

const planningYear = defineModel('planningYear', {
  type: [Number, String],
  required: true
})

const sourceKind = defineModel('sourceKind', {
  type: String,
  required: true
})

const periodMode = defineModel('periodMode', {
  type: String,
  required: true
})

const coverageStartMonth = defineModel('coverageStartMonth', {
  type: String,
  required: true
})

const coverageEndMonth = defineModel('coverageEndMonth', {
  type: String,
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
  { label: 'Select forecast year', value: '' },
  ...props.yearOptions
])

const periodModeOptions = [
  { label: 'Full Year', value: 'full_year' },
  { label: 'Custom Month Range', value: 'custom_range' }
]

const sourceKindOptions = computed(() =>
  FORECAST_SOURCE_KIND_OPTIONS.map((option) => ({
    label: option.label,
    value: option.id
  }))
)

const selectedSourceOption = computed(() =>
  FORECAST_SOURCE_KIND_OPTIONS.find((option) => option.id === sourceKind.value) ||
  FORECAST_SOURCE_KIND_OPTIONS[0]
)

const sourceHelpText = computed(() =>
  selectedSourceOption.value?.description || ''
)

const statusMessage = computed(() => {
  if (props.coverageMessage) {
    return props.coverageMessage
  }

  if (props.canCreate || !props.modeledForecastUnavailableMessage) {
    return ''
  }

  if (sourceKind.value !== 'modeled_daily') {
    return ''
  }

  return props.modeledForecastUnavailableMessage
})

const submitLabel = computed(() =>
  sourceKind.value === 'modeled_daily'
    ? 'Build Forecast'
    : sourceKind.value === 'imported_daily'
      ? 'Import Forecast'
      : 'Enter Monthly Forecast'
)
</script>

<template>
  <AppDialog
    v-model:visible="dialogOpen"
    title="New Forecast"
    description="Choose the forecast source and period for this staffing group."
    kicker="Forecast"
    max-width="max-w-xl"
    @close="emit('cancel')"
  >
    <div class="grid gap-4">
      <AppFieldGroup
        label="Forecast Source"
        input-id="forecast-create-source"
        :help-text="sourceHelpText"
      >
        <AppSelect
          id="forecast-create-source"
          v-model="sourceKind"
          :options="sourceKindOptions"
          autofocus
        />
      </AppFieldGroup>

      <AppFieldGroup
        label="Forecast Period"
        input-id="forecast-create-period-mode"
        help-text="Use a full year for annual budgets, or choose a month-aligned range for rolling and future-year coverage."
      >
        <AppSelect
          id="forecast-create-period-mode"
          v-model="periodMode"
          :options="periodModeOptions"
        />
      </AppFieldGroup>

      <AppFieldGroup
        v-if="periodMode === 'full_year'"
        label="Forecast Year"
        input-id="forecast-create-year"
      >
        <AppSelect
          id="forecast-create-year"
          v-model="planningYear"
          :options="planYearOptions"
        />
      </AppFieldGroup>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <AppFieldGroup label="Start Month" input-id="forecast-create-start-month">
          <AppSelect
            id="forecast-create-start-month"
            v-model="coverageStartMonth"
            :options="props.monthOptions"
          />
        </AppFieldGroup>

        <AppFieldGroup label="End Month" input-id="forecast-create-end-month">
          <AppSelect
            id="forecast-create-end-month"
            v-model="coverageEndMonth"
            :options="props.monthOptions"
          />
        </AppFieldGroup>
      </div>

      <AppStatusMessage v-if="statusMessage" tone="error">
        {{ statusMessage }}
      </AppStatusMessage>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <AppButton variant="secondary" @click="emit('cancel')">Cancel</AppButton>
        <AppButton
          variant="primary"
          :disabled="!props.canCreate"
          :aria-label="`${submitLabel} from ${getForecastSourceKindLabel(sourceKind)}`"
          @click="emit('create')"
        >
          {{ submitLabel }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
