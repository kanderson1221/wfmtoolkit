<script setup>
import { computed, ref, watch } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import AppTableShell from '../ui/AppTableShell.vue'
import AppTableTextField from '../ui/AppTableTextField.vue'
import {
  createForecastManualAdjustment,
  formatDate,
  formatWhole,
  getForecastProjectDailyRows
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

const hasResults = computed(() => Boolean(project.value?.lastRun?.runAt))
const forecastRows = computed(() =>
  getForecastProjectDailyRows(project.value).filter((row) => !row?.isHistory)
)
const manualAdjustments = computed(() =>
  Array.isArray(project.value?.manualAdjustments) ? project.value.manualAdjustments : []
)
const adjustmentMap = computed(() => new Map(
  manualAdjustments.value.map((adjustment) => [adjustment.ds, adjustment])
))
const adjustedDayCount = computed(() =>
  forecastRows.value.filter((row) => row.isAdjusted).length
)
const totalDelta = computed(() =>
  forecastRows.value.reduce((sum, row) => sum + Number(row.manualAdjustmentDelta || 0), 0)
)
const adjustedProjectedContacts = computed(() =>
  forecastRows.value.reduce((sum, row) => sum + Number(row.yhat || 0), 0)
)
const worksheetOpen = ref(false)

watch(
  () => manualAdjustments.value.length,
  (count) => {
    if (count > 0) {
      worksheetOpen.value = true
    }
  },
  { immediate: true }
)

const worksheetSummary = computed(() => {
  if (!hasResults.value) {
    return 'Run the forecast once to unlock the future-row adjustment worksheet in this dock.'
  }

  if (!forecastRows.value.length) {
    return 'The last completed run did not return future daily rows, so there is nothing to adjust yet.'
  }

  if (!manualAdjustments.value.length) {
    return 'Keep the dock collapsed until you need tactical daily overrides. The raw model output stays pinned in the current run.'
  }

  return 'Daily overrides are active. The adjusted monthly rollup is now what planning will consume from this forecast.'
})

const setManualAdjustment = (ds, partialAdjustment = {}) => {
  const currentAdjustment = adjustmentMap.value.get(ds) || createForecastManualAdjustment({ ds })
  const nextAdjustment = createForecastManualAdjustment({
    ...currentAdjustment,
    ...partialAdjustment,
    ds
  })
  const reason = String(nextAdjustment.reason || '').trim()
  const nextAdjustments = manualAdjustments.value.filter((adjustment) => adjustment.ds !== ds)

  if (Number(nextAdjustment.delta || 0) === 0 && !reason) {
    project.value.manualAdjustments = nextAdjustments
    return
  }

  project.value.manualAdjustments = [
    ...nextAdjustments,
    {
      ds,
      delta: Number(nextAdjustment.delta || 0),
      reason
    }
  ].sort((left, right) => left.ds.localeCompare(right.ds))
}

const clearAdjustments = () => {
  project.value.manualAdjustments = []
}
</script>

<template>
  <div class="grid gap-4">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="grid gap-1">
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Manual Adjustments
        </p>
        <h3 class="text-lg font-semibold tracking-[-0.02em] text-slate-950">
          Daily override worksheet
        </h3>
        <p class="text-sm text-slate-600">
          Adjust future forecast rows with absolute deltas. The raw model output stays in the last completed run, and planning uses the adjusted monthly rollup when overrides exist.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Adjusted days:
          <strong class="font-semibold text-slate-950">{{ adjustedDayCount }}</strong>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Net delta:
          <strong class="font-semibold text-slate-950">{{ totalDelta >= 0 ? '+' : '' }}{{ formatWhole(totalDelta) }}</strong>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Adjusted total:
          <strong class="font-semibold text-slate-950">{{ formatWhole(adjustedProjectedContacts) }}</strong>
        </div>
        <AppButton
          size="sm"
          variant="secondary"
          :disabled="!hasResults || !forecastRows.length"
          @click="worksheetOpen = !worksheetOpen"
        >
          {{ worksheetOpen ? 'Collapse Worksheet' : 'Open Worksheet' }}
        </AppButton>
        <AppButton
          v-if="manualAdjustments.length && worksheetOpen"
          size="sm"
          variant="secondary"
          @click="clearAdjustments"
        >
          Clear Adjustments
        </AppButton>
      </div>
    </div>

    <div class="rounded-[22px] border border-slate-200 bg-[#f8fbfd] px-4 py-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="grid gap-1">
          <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Dock Status
          </p>
          <p class="text-sm leading-6 text-slate-600">
            {{ worksheetSummary }}
          </p>
        </div>

        <span
          class="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
          :class="props.resultsStale ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#d7e3ec] bg-white text-[#15395f]'"
        >
          {{ props.resultsStale ? 'Pinned To Previous Run' : worksheetOpen ? 'Worksheet Open' : 'Dock Ready' }}
        </span>
      </div>
    </div>

    <AppStatusMessage v-if="props.resultsStale && worksheetOpen">
      Settings changed after the last run. Manual adjustments are still applied to the current result set until you rerun the forecast.
    </AppStatusMessage>

    <template v-if="!worksheetOpen">
      <div class="rounded-[22px] border border-dashed border-slate-300 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
        Daily override worksheet
        <span class="text-slate-500"> stays docked here so future adjustments feel like part of the same forecasting surface instead of a separate page.</span>
      </div>
    </template>

    <template v-else-if="!hasResults">
      <AppEmptyState
        title="Manual adjustments unlock after the first run"
        description="Run the forecast once to open the future-row worksheet here."
      />
    </template>

    <template v-else-if="!forecastRows.length">
      <AppEmptyState
        title="No forecast rows available"
        description="The last run did not return future daily rows to adjust."
      />
    </template>

    <template v-else>
      <AppTableShell>
        <div class="max-h-[24rem] overflow-auto">
          <table class="min-w-[980px] w-full border-collapse text-sm text-slate-700">
            <thead class="border-b border-slate-200 bg-slate-50/85">
              <tr>
                <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Date</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Baseline Forecast</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Adjustment</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Final Forecast</th>
                <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Reason</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="row in forecastRows" :key="row.ds" class="bg-white">
                <td class="px-5 py-3 font-medium text-slate-900">{{ formatDate(row.ds) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatWhole(row.baselineYhat) }}</td>
                <td class="px-4 py-3">
                  <AppTableNumberField
                    :model-value="row.manualAdjustmentDelta"
                    :step="1"
                    :max-fraction-digits="0"
                    :aria-label="`Adjustment for ${formatDate(row.ds)}`"
                    @update:model-value="setManualAdjustment(row.ds, { delta: $event ?? 0 })"
                  />
                </td>
                <td class="px-4 py-3 text-right tabular-nums font-medium text-slate-900">{{ formatWhole(row.yhat) }}</td>
                <td class="px-5 py-3">
                  <AppTableTextField
                    :model-value="row.adjustmentReason"
                    placeholder="Optional reason"
                    class="min-w-[12rem]"
                    :aria-label="`Reason for ${formatDate(row.ds)}`"
                    @update:model-value="setManualAdjustment(row.ds, { reason: $event || '' })"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppTableShell>
    </template>
  </div>
</template>
