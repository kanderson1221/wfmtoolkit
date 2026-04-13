<script setup>
import { computed, ref, watch } from 'vue'

import ForecastHistoricalDataSection from './ForecastHistoricalDataSection.vue'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import { createForecastProject } from '../../forecasting/shared'
import {
  applyForecastHistoryState,
  buildForecastHistoryStateFromFile,
  normalizeForecastHistoryDraft
} from '../../forecasting/historyImport'

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

const resetDraftProject = () => {
  draftProject.value = createForecastProject(props.project)
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

watch(
  () => [draftProject.value.uploadedRows, draftProject.value.columnMapping],
  () => {
    const normalized = normalizeForecastHistoryDraft({
      rows: draftProject.value.uploadedRows,
      mapping: draftProject.value.columnMapping
    })
    draftProject.value.historyRows = normalized.historyRows
    draftProject.value.normalizationIssues = normalized.issues
  },
  { deep: true }
)

const columnOptions = computed(() => [
  { label: 'Not mapped', value: '' },
  ...(draftProject.value.uploadedHeaders || []).map((header) => ({
    label: header,
    value: header
  }))
])

const historyIssues = computed(() => [
  ...(Array.isArray(draftProject.value.parserIssues) ? draftProject.value.parserIssues : []),
  ...(Array.isArray(draftProject.value.normalizationIssues) ? draftProject.value.normalizationIssues : [])
])

const canApply = computed(() =>
  draftProject.value.historyRows.length > 0 && historyIssues.value.length === 0
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

  const historyState = await buildForecastHistoryStateFromFile(
    file,
    draftProject.value.columnMapping
  )

  applyForecastHistoryState(draftProject.value, historyState)
}

const handleApply = () => {
  emit('apply', {
    uploadedFileName: draftProject.value.uploadedFileName,
    uploadedHeaders: draftProject.value.uploadedHeaders,
    uploadedRows: draftProject.value.uploadedRows,
    parserIssues: draftProject.value.parserIssues,
    historyRows: draftProject.value.historyRows,
    normalizationIssues: draftProject.value.normalizationIssues,
    columnMapping: draftProject.value.columnMapping
  })
  visible.value = false
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    kicker="Forecast History"
    title="Upload Daily History"
    description="Upload and map a CSV to train the forecast."
    allow-backdrop-close
    max-width="max-w-5xl"
    @close="emit('close')"
  >
    <div class="grid gap-4">
      <ForecastHistoricalDataSection
        v-model:project="draftProject"
        :column-options="columnOptions"
        @file-select="handleFileSelect"
      />

      <div v-if="historyIssues.length" class="grid gap-2">
        <AppStatusMessage
          v-for="issue in historyIssues"
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
          Load
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
