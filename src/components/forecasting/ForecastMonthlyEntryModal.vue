<script setup>
import { computed, ref, watch } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import AppTableShell from '../ui/AppTableShell.vue'
import { createForecastProject, FORECAST_TYPE_BUDGET } from '../../forecasting/shared'
import { createManualMonthlyEntryRows } from '../../forecasting/sourceArtifacts'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['apply', 'close'])

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

const draftProject = ref(createForecastProject())
const monthlyRows = ref([])

const resetDraftProject = () => {
  draftProject.value = createForecastProject({
    ...props.project,
    forecastType: FORECAST_TYPE_BUDGET,
    coverageStartMonthIndex: 0
  })
  monthlyRows.value = createManualMonthlyEntryRows({
    planningYear: draftProject.value.planningYear,
    forecastType: FORECAST_TYPE_BUDGET,
    coverageStartMonthIndex: draftProject.value.coverageStartMonthIndex ?? 0,
    coverageStartDate: draftProject.value.coverageStartDate,
    coverageEndDate: draftProject.value.coverageEndDate,
    seedRows: Array.isArray(props.project?.sourceData?.rows) ? props.project.sourceData.rows : []
  })
}

watch(
  () => visible.value,
  (isVisible) => {
    if (isVisible) {
      resetDraftProject()
    }
  },
  { immediate: true }
)

const canApply = computed(() =>
  monthlyRows.value.some((row) => Number(row?.contacts || 0) > 0)
)

watch(
  () => draftProject.value.planningYear,
  () => {
    monthlyRows.value = createManualMonthlyEntryRows({
      planningYear: draftProject.value.planningYear,
      forecastType: FORECAST_TYPE_BUDGET,
      coverageStartMonthIndex: draftProject.value.coverageStartMonthIndex ?? 0,
      coverageStartDate: draftProject.value.coverageStartDate,
      coverageEndDate: draftProject.value.coverageEndDate,
      seedRows: monthlyRows.value
    })
  }
)

const handleClose = () => {
  visible.value = false
}

const handleApply = () => {
  emit('apply', {
    monthlyRows: monthlyRows.value.map((row) => ({
      monthIndex: row.monthIndex,
      monthStart: row.monthStart,
      monthLabel: row.monthLabel,
      contacts: Number(row.contacts || 0)
    }))
  })
  visible.value = false
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    kicker="Monthly Forecast"
    title="Enter Monthly Contacts"
    description="Create a saved monthly forecast for this staffing group. Monthly forecast artifacts are read-only and can be applied to plans later."
    allow-backdrop-close
    max-width="max-w-4xl"
    @close="emit('close')"
  >
    <div class="grid gap-4">
      <AppStatusMessage>
        Enter one monthly contact value for each month in the forecast coverage window.
      </AppStatusMessage>

      <AppTableShell>
        <div class="overflow-x-auto">
          <table class="min-w-[520px] w-full border-collapse text-sm text-slate-700">
            <thead class="border-b border-slate-200 bg-[#edf3f8]">
              <tr>
                <th class="px-5 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">
                  Month
                </th>
                <th class="px-5 py-2 text-right text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">
                  Contacts
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="row in monthlyRows" :key="row.monthStart" class="bg-white">
                <td class="px-5 py-3 font-medium text-slate-950">
                  {{ row.monthLabel }}
                </td>
                <td class="px-5 py-3">
                  <AppTableNumberField
                    v-model="row.contacts"
                    :min="0"
                    :step="100"
                    aria-label="Monthly contacts"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppTableShell>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
        <AppButton variant="secondary" @click="handleClose">Cancel</AppButton>
        <AppButton
          variant="primary"
          :disabled="!canApply"
          @click="handleApply"
        >
          Save Forecast
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
