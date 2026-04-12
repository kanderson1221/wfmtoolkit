<script setup>
import { computed, reactive, ref, watch } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTextField from '../ui/AppTextField.vue'
import {
  createForecastManualAdjustment,
  formatDate,
  formatWhole,
  getForecastProjectDailyRows,
  getForecastProjectManualAdjustments
} from '../../forecasting/shared'

const props = defineProps({
  resultsStale: {
    type: Boolean,
    default: false
  }
})

const project = defineModel('project', {
  type: Object,
  required: true
})

const adjustmentTypeOptions = [
  { label: 'Add / Subtract Volume', value: 'delta' },
  { label: 'Percent Change', value: 'percent' },
  { label: 'Set Daily Volume', value: 'set' }
]

const draftAdjustment = reactive({
  startDate: '',
  endDate: '',
  adjustmentType: 'delta',
  value: 0
})
const editingAdjustmentId = ref('')

const hasResults = computed(() => Boolean(project.value?.lastRun?.runAt))
const forecastRows = computed(() =>
  getForecastProjectDailyRows(project.value).filter((row) => !row?.isHistory)
)
const manualAdjustments = computed(() => getForecastProjectManualAdjustments(project.value))
const firstForecastDate = computed(() => forecastRows.value[0]?.ds || '')
const lastForecastDate = computed(() => forecastRows.value.at(-1)?.ds || '')

const worksheetSummary = computed(() => {
  if (!hasResults.value) {
    return 'Run the forecast once to unlock adjustment rules.'
  }

  if (!forecastRows.value.length) {
    return 'The last completed run did not return future daily rows, so there is nothing to adjust yet.'
  }

  if (!manualAdjustments.value.length) {
    return ''
  }

  return ''
})

const draftValidationMessage = computed(() => {
  if (!hasResults.value || !forecastRows.value.length) {
    return ''
  }

  if (!draftAdjustment.startDate || !draftAdjustment.endDate) {
    return 'Choose a start date and end date.'
  }

  if (draftAdjustment.endDate < draftAdjustment.startDate) {
    return 'End date must be on or after the start date.'
  }

  if (Number(draftAdjustment.value || 0) === 0) {
    return 'Enter a non-zero adjustment value.'
  }

  const overlapsForecast = forecastRows.value.some(
    (row) => row.ds >= draftAdjustment.startDate && row.ds <= draftAdjustment.endDate
  )

  if (!overlapsForecast) {
    return 'Choose a range that overlaps the forecast horizon.'
  }

  return ''
})

const canSubmitAdjustment = computed(() =>
  Boolean(hasResults.value && forecastRows.value.length && !draftValidationMessage.value)
)

const isEditingAdjustment = computed(() => Boolean(editingAdjustmentId.value))

const adjustmentRows = computed(() =>
  manualAdjustments.value.map((adjustment) => {
    const impactedRows = forecastRows.value.filter(
      (row) => row.ds >= adjustment.startDate && row.ds <= adjustment.endDate
    )
    const impactedDays = impactedRows.length
    const estimatedImpact = adjustment.adjustmentType === 'percent'
      ? impactedRows.reduce(
          (sum, row) => sum + ((Number(row.baselineYhat || 0) * Number(adjustment.value || 0)) / 100),
          0
        )
      : adjustment.adjustmentType === 'set'
        ? impactedRows.reduce(
            (sum, row) => sum + (Number(adjustment.value || 0) - Number(row.baselineYhat || 0)),
            0
          )
        : impactedDays * Number(adjustment.value || 0)

    return {
      ...adjustment,
      impactedDays,
      estimatedImpact
    }
  })
)

const formatAdjustmentValue = (adjustment) => {
  const value = Number(adjustment?.value || 0)
  if (adjustment?.adjustmentType === 'percent') {
    return `${value >= 0 ? '+' : ''}${formatWhole(value)}%`
  }

  if (adjustment?.adjustmentType === 'set') {
    return formatWhole(value)
  }

  return `${value >= 0 ? '+' : ''}${formatWhole(value)}`
}

const getAdjustmentTypeLabel = (adjustmentType) =>
  adjustmentType === 'percent'
    ? 'Percent Change'
    : adjustmentType === 'set'
      ? 'Set Daily Volume'
      : 'Add / Subtract Volume'

const resetDraftAdjustment = () => {
  draftAdjustment.startDate = firstForecastDate.value || ''
  draftAdjustment.endDate = firstForecastDate.value || ''
  draftAdjustment.adjustmentType = 'delta'
  draftAdjustment.value = 0
  editingAdjustmentId.value = ''
}

const submitManualAdjustment = () => {
  if (!canSubmitAdjustment.value) {
    return
  }

  const nextAdjustment = createForecastManualAdjustment({
    id: editingAdjustmentId.value || undefined,
    startDate: draftAdjustment.startDate,
    endDate: draftAdjustment.endDate,
    adjustmentType: draftAdjustment.adjustmentType,
    value: Number(draftAdjustment.value || 0)
  })

  if (editingAdjustmentId.value) {
    project.value.manualAdjustments = manualAdjustments.value.map((adjustment) =>
      adjustment.id === editingAdjustmentId.value ? nextAdjustment : adjustment
    )
  } else {
    project.value.manualAdjustments = [
      ...manualAdjustments.value,
      nextAdjustment
    ]
  }

  resetDraftAdjustment()
}

const editManualAdjustment = (adjustment) => {
  editingAdjustmentId.value = adjustment.id
  draftAdjustment.startDate = adjustment.startDate
  draftAdjustment.endDate = adjustment.endDate
  draftAdjustment.adjustmentType = adjustment.adjustmentType
  draftAdjustment.value = Number(adjustment.value || 0)
}

const removeManualAdjustment = (adjustmentId) => {
  project.value.manualAdjustments = manualAdjustments.value.filter(
    (adjustment) => adjustment.id !== adjustmentId
  )

  if (editingAdjustmentId.value === adjustmentId) {
    resetDraftAdjustment()
  }
}

watch(
  [firstForecastDate, lastForecastDate],
  ([nextStartDate, nextEndDate]) => {
    if (!draftAdjustment.startDate && nextStartDate) {
      draftAdjustment.startDate = nextStartDate
    }

    if (!draftAdjustment.endDate && nextStartDate) {
      draftAdjustment.endDate = nextStartDate
    }

    if (!nextStartDate && !nextEndDate) {
      draftAdjustment.startDate = ''
      draftAdjustment.endDate = ''
      editingAdjustmentId.value = ''
      return
    }

    if (!draftAdjustment.startDate) {
      draftAdjustment.startDate = nextStartDate || ''
    }

    if (!draftAdjustment.endDate) {
      draftAdjustment.endDate = nextStartDate || nextEndDate || ''
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4">
    <p v-if="worksheetSummary" class="text-sm leading-6 text-slate-600">
      {{ worksheetSummary }}
    </p>

    <AppStatusMessage v-if="props.resultsStale">
      Settings changed after the last run. Adjustment rules are still applied to the current result set until you rerun the forecast.
    </AppStatusMessage>

    <template v-if="hasResults && forecastRows.length">
      <section class="grid gap-4">
        <div class="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr_0.9fr_auto] xl:items-end">
          <AppFieldGroup
            label="Start Date"
            input-id="forecast-adjustment-start"
            compact
            label-class="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-500"
          >
            <AppTextField
              id="forecast-adjustment-start"
              v-model="draftAdjustment.startDate"
              type="date"
              compact
              :min="firstForecastDate || undefined"
              :max="lastForecastDate || undefined"
              class="h-10 shadow-none"
            />
          </AppFieldGroup>

          <AppFieldGroup
            label="End Date"
            input-id="forecast-adjustment-end"
            compact
            label-class="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-500"
          >
            <AppTextField
              id="forecast-adjustment-end"
              v-model="draftAdjustment.endDate"
              type="date"
              compact
              :min="firstForecastDate || undefined"
              :max="lastForecastDate || undefined"
              class="h-10 shadow-none"
            />
          </AppFieldGroup>

          <AppFieldGroup
            label="Adjustment Type"
            input-id="forecast-adjustment-type"
            compact
            label-class="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-500"
          >
            <AppSelect
              id="forecast-adjustment-type"
              v-model="draftAdjustment.adjustmentType"
              :options="adjustmentTypeOptions"
              compact
              class="h-10 shadow-none"
            />
          </AppFieldGroup>

          <AppFieldGroup
            :label="draftAdjustment.adjustmentType === 'percent' ? 'Value (%)' : 'Value'"
            input-id="forecast-adjustment-value"
            compact
            label-class="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-500"
          >
            <AppNumberField
              id="forecast-adjustment-value"
              v-model="draftAdjustment.value"
              :step="1"
              :suffix="draftAdjustment.adjustmentType === 'percent' ? '%' : ''"
              compact
              class="h-10 border-slate-200 bg-white text-right tabular-nums shadow-none focus:bg-white focus:ring-2"
            />
          </AppFieldGroup>

          <div class="flex items-center gap-2 xl:justify-end">
            <AppButton
              size="sm"
              variant="primary"
              :disabled="!canSubmitAdjustment"
              class="h-10 rounded-xl px-4 shadow-none"
              @click="submitManualAdjustment"
            >
              {{ isEditingAdjustment ? 'Save' : 'Add' }}
            </AppButton>

            <AppButton
              v-if="isEditingAdjustment"
              size="sm"
              variant="secondary"
              class="h-10 rounded-xl px-4 shadow-none"
              @click="resetDraftAdjustment"
            >
              Cancel
            </AppButton>
          </div>
        </div>
      </section>

      <div v-if="manualAdjustments.length" class="overflow-x-auto border-t border-slate-200 pt-4">
        <table class="w-full min-w-[760px] border-collapse text-sm text-slate-700">
          <thead class="border-b border-slate-200 bg-slate-50/85">
            <tr>
              <th class="px-5 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Start</th>
              <th class="px-5 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">End</th>
              <th class="px-4 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Type</th>
              <th class="px-4 py-2 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Value</th>
              <th class="px-4 py-2 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Days</th>
              <th class="px-4 py-2 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Estimated Impact</th>
              <th class="px-5 py-2 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr
              v-for="adjustment in adjustmentRows"
              :key="adjustment.id"
              class="bg-white transition-colors hover:bg-slate-50/60"
            >
              <td class="px-5 py-2.5 font-medium text-slate-900">{{ formatDate(adjustment.startDate) }}</td>
              <td class="px-5 py-2.5 font-medium text-slate-900">{{ formatDate(adjustment.endDate) }}</td>
              <td class="px-4 py-2.5">{{ getAdjustmentTypeLabel(adjustment.adjustmentType) }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums">{{ formatAdjustmentValue(adjustment) }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums">{{ formatWhole(adjustment.impactedDays) }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900">
                {{ adjustment.estimatedImpact >= 0 ? '+' : '' }}{{ formatWhole(adjustment.estimatedImpact) }}
              </td>
              <td class="px-5 py-2.5">
                <div class="flex justify-end gap-2">
                  <AppButton
                    size="sm"
                    variant="quiet"
                    class="rounded-lg px-2.5 py-1.5 text-[0.82rem] font-medium text-slate-600 shadow-none hover:text-slate-900"
                    @click="editManualAdjustment(adjustment)"
                  >
                    Edit
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant="quiet"
                    class="rounded-lg px-2.5 py-1.5 text-[0.82rem] font-medium text-slate-600 shadow-none hover:text-slate-900"
                    @click="removeManualAdjustment(adjustment.id)"
                  >
                    Remove
                  </AppButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-else class="border-t border-slate-200 pt-4 text-sm text-slate-600">
        No adjustment rules yet.
      </p>
    </template>
  </div>
</template>
