<script setup>
import { computed, ref, watch } from 'vue'

import PlanningGroupActualsUploadSection from './PlanningGroupActualsUploadSection.vue'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import {
  createPlanningGroupActuals,
  summarizePlanningGroupActuals
} from '../../planner/groupActuals'
import {
  buildGroupActualsImportStateFromFile,
  normalizeGroupActualsUploadedRows
} from '../../planner/groupActualsImport'

const props = defineProps({
  actuals: {
    type: Object,
    default: null
  },
  formatWhole: {
    type: Function,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['apply', 'close'])

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

const draftImportState = ref({
  uploadedFileName: '',
  uploadedHeaders: [],
  parserIssues: [],
  columnMapping: {
    dateColumn: '',
    volumeColumn: '',
    ahtColumn: ''
  },
  dailyRows: [],
  normalizationIssues: []
})
const draftUploadedRows = ref([])
const existingActuals = computed(() => createPlanningGroupActuals(props.actuals))

const resetDraft = () => {
  const normalizedActuals = createPlanningGroupActuals(props.actuals)

  draftImportState.value = {
    uploadedFileName: '',
    uploadedHeaders: [],
    parserIssues: [],
    columnMapping: {
      dateColumn: normalizedActuals.columnMapping.dateColumn,
      volumeColumn: normalizedActuals.columnMapping.volumeColumn,
      ahtColumn: normalizedActuals.columnMapping.ahtColumn
    },
    dailyRows: [],
    normalizationIssues: []
  }
  draftUploadedRows.value = []
}

watch(
  () => visible.value,
  (isVisible) => {
    if (isVisible) {
      resetDraft()
    }
  },
  { immediate: true }
)

watch(
  () => [draftUploadedRows.value, draftImportState.value.columnMapping],
  () => {
    if (!draftUploadedRows.value.length) {
      return
    }

    const normalized = normalizeGroupActualsUploadedRows({
      rows: draftUploadedRows.value,
      mapping: draftImportState.value.columnMapping
    })

    draftImportState.value.dailyRows = normalized.dailyRows
    draftImportState.value.normalizationIssues = normalized.issues
  },
  { deep: true }
)

const columnOptions = computed(() => [
  { label: 'Not mapped', value: '' },
  ...(draftImportState.value.uploadedHeaders || []).map((header) => ({
    label: header,
    value: header
  }))
])

const importIssues = computed(() => [
  ...(Array.isArray(draftImportState.value.parserIssues) ? draftImportState.value.parserIssues : []),
  ...(Array.isArray(draftImportState.value.normalizationIssues) ? draftImportState.value.normalizationIssues : [])
])

const overlapSummary = computed(() => {
  const existingDates = new Set(existingActuals.value.dailyRows.map((row) => row.serviceDate))
  const replacedCount = draftImportState.value.dailyRows.filter((row) => existingDates.has(row.serviceDate)).length
  const addedCount = draftImportState.value.dailyRows.length - replacedCount

  return {
    addedCount,
    replacedCount
  }
})

const overlapSummaryMessage = computed(() => {
  if (!draftImportState.value.dailyRows.length) {
    return ''
  }

  const addedLabel = `${props.formatWhole(overlapSummary.value.addedCount)} daily ${overlapSummary.value.addedCount === 1 ? 'row' : 'rows'}`
  const replacedLabel = `${props.formatWhole(overlapSummary.value.replacedCount)} existing ${overlapSummary.value.replacedCount === 1 ? 'day' : 'days'}`

  if (overlapSummary.value.replacedCount > 0) {
    return `This upload will add ${addedLabel} and replace ${replacedLabel} with the newly uploaded values.`
  }

  return `This upload will add ${addedLabel}. No existing days will be replaced.`
})

const previewSummary = computed(() =>
  summarizePlanningGroupActuals(
    createPlanningGroupActuals({
      sourceMode: 'daily_upload',
      dailyRows: draftImportState.value.dailyRows,
      uploadedFileName: draftImportState.value.uploadedFileName
    })
  )
)

const previewItems = computed(() => [
  {
    label: 'Days Loaded',
    value: props.formatWhole(previewSummary.value.loadedDaysCount),
    meta: 'Daily actuals found in the uploaded file'
  },
  {
    label: 'Months Covered',
    value: props.formatWhole(previewSummary.value.loadedMonthsCount),
    meta: 'Distinct months in the uploaded file'
  },
  {
    label: 'Total Contacts',
    value: props.formatWhole(previewSummary.value.totalContacts),
    meta: 'Contacts from the uploaded daily file'
  },
  {
    label: 'Weighted Avg AHT',
    value:
      previewSummary.value.averageAhtSeconds == null
        ? '—'
        : `${props.formatNumber(previewSummary.value.averageAhtSeconds, 1)} sec`,
    meta: 'Weighted by uploaded daily contacts'
  }
])

const canApply = computed(() =>
  draftImportState.value.dailyRows.length > 0 && importIssues.value.length === 0
)

const handleClose = () => {
  visible.value = false
}

const handleFileSelect = async (event) => {
  const input = event?.target
  const droppedFiles = event?.dataTransfer?.files
  const file = input?.files?.[0] || droppedFiles?.[0]

  if (!file) {
    return
  }

  const importState = await buildGroupActualsImportStateFromFile(
    file,
    draftImportState.value.columnMapping
  )

  draftUploadedRows.value = Array.isArray(importState.uploadedRows)
    ? importState.uploadedRows.map((row) => ({ ...row }))
    : []

  draftImportState.value = {
    uploadedFileName: importState.uploadedFileName,
    uploadedHeaders: importState.uploadedHeaders,
    parserIssues: importState.parserIssues,
    columnMapping: importState.columnMapping,
    dailyRows: importState.dailyRows,
    normalizationIssues: importState.normalizationIssues
  }
}

const handleApply = () => {
  emit('apply', {
    sourceMode: 'daily_upload',
    uploadedFileName: draftImportState.value.uploadedFileName,
    uploadedHeaders: draftImportState.value.uploadedHeaders,
    columnMapping: draftImportState.value.columnMapping,
    dailyRows: draftImportState.value.dailyRows
  })
  visible.value = false
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    kicker="Staffing Group Actuals"
    title="Upload Daily Actuals"
    description="Upload and map a CSV to extend the staffing group's shared actuals history. Service dates from any year are accepted, and imported dates replace matching days already stored."
    allow-backdrop-close
    max-width="max-w-5xl"
    @close="emit('close')"
  >
    <div class="grid gap-4">
      <PlanningGroupActualsUploadSection
        v-model:state="draftImportState"
        :column-options="columnOptions"
        @file-select="handleFileSelect"
      />

      <AppStatStrip
        v-if="draftImportState.dailyRows.length"
        :items="previewItems"
        columns="md:grid-cols-2 xl:grid-cols-4"
      />

      <AppStatusMessage v-if="draftImportState.dailyRows.length && !importIssues.length">
        {{ overlapSummaryMessage }}
      </AppStatusMessage>

      <div v-if="importIssues.length" class="grid gap-2">
        <AppStatusMessage
          v-for="issue in importIssues"
          :key="issue"
          tone="error"
        >
          {{ issue }}
        </AppStatusMessage>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
        <AppButton variant="secondary" @click="handleClose">Cancel</AppButton>
        <AppButton
          variant="primary"
          :disabled="!canApply"
          @click="handleApply"
        >
          Add Daily Actuals
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
