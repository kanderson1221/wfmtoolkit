<script setup>
import { computed, ref, watch } from 'vue'

import {
  createPlanningGroupIntraday,
  normalizePlanningGroupIntradayRatios,
  resolvePlanningGroupIntraday,
  summarizePlanningGroupIntraday
} from '../../planner/groupIntraday'
import AppButton from '../ui/AppButton.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

const props = defineProps({
  center: {
    type: Object,
    required: true
  },
  group: {
    type: Object,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['save-intraday'])

const intradayDraft = ref(resolvePlanningGroupIntraday(props.group, { center: props.center }))

const resetDraft = () => {
  intradayDraft.value = resolvePlanningGroupIntraday(props.group, {
    center: props.center
  })
}

watch(
  () => [
    props.group?.id,
    props.group?.updatedAt,
    props.center?.operatingOpenTime,
    props.center?.operatingCloseTime
  ],
  () => {
    resetDraft()
  },
  { immediate: true }
)

const summary = computed(() => summarizePlanningGroupIntraday(intradayDraft.value))

const operatingWindowLabel = computed(() =>
  props.center?.operatingOpenTime && props.center?.operatingCloseTime
    ? `${props.center.operatingOpenTime} to ${props.center.operatingCloseTime}`
    : '24-hour profile'
)

const canSave = computed(() =>
  summary.value.isBalanced &&
  intradayDraft.value.intervalRatios.length > 0
)

const ratioSummaryMessage = computed(() =>
  summary.value.isBalanced
    ? `Ratios total ${props.formatNumber(summary.value.totalRatioPercent, 1)}% and are ready to save.`
    : `Ratios currently total ${props.formatNumber(summary.value.totalRatioPercent, 1)}%. They must sum to 100.0% before saving.`
)

const saveIntraday = () => {
  if (!canSave.value) {
    return false
  }

  emit('save-intraday', createPlanningGroupIntraday(intradayDraft.value))
  return true
}

const normalizeRatios = () => {
  intradayDraft.value = {
    ...intradayDraft.value,
    intervalRatios: normalizePlanningGroupIntradayRatios(intradayDraft.value.intervalRatios)
  }
}

defineExpose({
  saveIntraday,
  normalizeRatios
})
</script>

<template>
  <div class="grid gap-4 p-5">
    <AppWorkspaceSection
      title="Intraday Inputs"
      kicker="30-minute intervals"
      description="Configure the shared daily contact mix this staffing group will use for interval staffing."
      :subtle="false"
    >
      <template #actions>
        <AppButton size="sm" variant="secondary" @click="normalizeRatios">
          Normalize to 100%
        </AppButton>
        <AppButton size="sm" variant="primary" :disabled="!canSave" @click="saveIntraday">
          Save Intraday
        </AppButton>
      </template>

      <div class="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <div class="grid gap-4 self-start">
          <div class="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
            <div class="grid gap-1">
              <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Interval Length
              </span>
              <strong class="text-lg font-semibold text-slate-950">30 minutes</strong>
            </div>
            <div class="grid gap-1">
              <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Operating Window
              </span>
              <strong class="text-lg font-semibold text-slate-950">{{ operatingWindowLabel }}</strong>
            </div>
            <div class="grid gap-1">
              <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Active Intervals
              </span>
              <strong class="text-lg font-semibold text-slate-950">
                {{ intradayDraft.intervalRatios.length }}
              </strong>
            </div>
          </div>
        </div>

        <div class="grid min-w-0 gap-3">
          <AppStatusMessage :tone="summary.isBalanced ? 'success' : 'warning'">
            {{ ratioSummaryMessage }}
          </AppStatusMessage>

          <div class="overflow-x-auto rounded-[24px] border border-slate-200 bg-white">
            <table class="min-w-[32rem] w-full border-collapse text-sm text-slate-700">
              <thead class="border-b border-slate-200 bg-white/80">
                <tr>
                  <th class="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                    Interval
                  </th>
                  <th class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                    Ratio %
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr v-for="row in intradayDraft.intervalRatios" :key="row.startTime">
                  <td class="px-4 py-3 font-medium text-slate-800">
                    {{ row.label }}
                  </td>
                  <td class="px-4 py-2">
                    <AppTableNumberField
                      v-model.number="row.ratioPercent"
                      :min="0"
                      :max="100"
                      :step="0.1"
                      :min-fraction-digits="0"
                      :max-fraction-digits="2"
                      aria-label="Interval ratio percent"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppWorkspaceSection>
  </div>
</template>
