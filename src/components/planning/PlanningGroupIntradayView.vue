<script setup>
import { computed, ref, watch } from 'vue'

import {
  createPlanningGroupIntraday,
  normalizePlanningGroupIntradayRatios,
  resolvePlanningGroupIntraday,
  summarizePlanningGroupIntraday
} from '../../planner/groupIntraday'
import { buildPlanningGroupIntradayImportStateFromFile } from '../../planner/groupIntradayImport'
import { describeOperatingWindow } from '../../planner/operatingSchedule'
import AppButton from '../ui/AppButton.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppFileDropzone from '../ui/AppFileDropzone.vue'
import AppNumberField from '../ui/AppNumberField.vue'
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
const importFeedback = ref({
  tone: 'info',
  message: '',
  issues: []
})

const resetDraft = () => {
  intradayDraft.value = resolvePlanningGroupIntraday(props.group, {
    center: props.center
  })
  importFeedback.value = {
    tone: 'info',
    message: '',
    issues: []
  }
}

watch(
  () => [
    props.group?.id,
    props.group?.updatedAt,
    props.center?.operatingScheduleMode,
    props.center?.operatingOpenTime,
    props.center?.operatingCloseTime
  ],
  () => {
    resetDraft()
  },
  { immediate: true }
)

const summary = computed(() => summarizePlanningGroupIntraday(intradayDraft.value))
const minimumHeadcountIsValid = computed(() => {
  const value = Number(intradayDraft.value.minimumHeadcount)
  return Number.isInteger(value) && value >= 0
})

const operatingWindowLabel = computed(() => describeOperatingWindow(props.center))

const canSave = computed(() =>
  summary.value.isBalanced &&
  minimumHeadcountIsValid.value &&
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

const handleRatioFileSelect = async (event) => {
  const input = event?.target
  const droppedFiles = event?.dataTransfer?.files
  const file = input?.files?.[0] || droppedFiles?.[0]

  if (!file) {
    return
  }

  try {
    const importState = await buildPlanningGroupIntradayImportStateFromFile(
      file,
      intradayDraft.value.intervalRatios
    )

    if (importState.issues.length) {
      importFeedback.value = {
        tone: 'error',
        message: `Unable to import ${file.name || 'the selected CSV'}. Correct the file and try again.`,
        issues: importState.issues
      }
      return
    }

    intradayDraft.value = {
      ...intradayDraft.value,
      intervalRatios: importState.intervalRatios
    }
    importFeedback.value = {
      tone: importState.isBalanced ? 'success' : 'warning',
      message: importState.isBalanced
        ? `Imported ${importState.importedCount} interval ratios from ${importState.uploadedFileName}. Review the values and save the intraday profile.`
        : `Imported ${importState.importedCount} interval ratios from ${importState.uploadedFileName}, totaling ${props.formatNumber(importState.totalRatioPercent, 1)}%. Normalize or edit the ratios before saving.`,
      issues: []
    }
  } catch {
    importFeedback.value = {
      tone: 'error',
      message: 'The selected CSV could not be read. Choose another file and try again.',
      issues: []
    }
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
            <AppFieldGroup
              label="Minimum Headcount per Open Interval"
              input-id="minimum-headcount-per-open-interval"
              help-text="Use 0 for no floor. The saved whole-number minimum applies to every interval on open operating days."
              :error="minimumHeadcountIsValid ? '' : 'Enter a whole number of 0 or greater.'"
              compact
            >
              <AppNumberField
                id="minimum-headcount-per-open-interval"
                v-model.number="intradayDraft.minimumHeadcount"
                :min="0"
                :step="1"
                :min-fraction-digits="0"
                :max-fraction-digits="0"
                compact
                aria-label="Minimum headcount per open interval"
              />
            </AppFieldGroup>
          </div>

          <AppFileDropzone
            input-id="planning-group-intraday-ratios-upload"
            title="Import Interval Ratios"
            button-label="Choose CSV"
            description="Upload one percentage for every active interval. Imported values replace the current ratio profile after validation."
            hint-text=""
            :format-badges="['.CSV']"
            accept=".csv,text/csv"
            compact
            centered
            @file-select="handleRatioFileSelect"
          >
            <template #actions>
              <AppButton
                size="sm"
                variant="quiet"
                href="/planning_group_intraday_ratios_template.csv"
                download
              >
                Download Sample Template
              </AppButton>
            </template>
          </AppFileDropzone>

          <AppStatusMessage v-if="importFeedback.message" :tone="importFeedback.tone">
            {{ importFeedback.message }}
          </AppStatusMessage>

          <div v-if="importFeedback.issues.length" class="grid gap-2">
            <AppStatusMessage
              v-for="issue in importFeedback.issues"
              :key="issue"
              tone="error"
            >
              {{ issue }}
            </AppStatusMessage>
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
