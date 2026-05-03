<script setup>
import { computed, ref, watch } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFileDropzone from '../ui/AppFileDropzone.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableShell from '../ui/AppTableShell.vue'
import { createForecastProject, FORECAST_TYPE_BUDGET } from '../../forecasting/shared'
import {
  buildImportedDailySourceState,
  buildImportedDailySourceStateFromFile
} from '../../forecasting/sourceArtifacts'

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
const importedDailyRows = ref([])

const resetDraftProject = () => {
  draftProject.value = createForecastProject({
    ...props.project,
    forecastType: FORECAST_TYPE_BUDGET
  })
  draftProject.value.sourceData = {
    fileName: props.project?.sourceData?.fileName || '',
    headers: Array.isArray(props.project?.sourceData?.headers) ? [...props.project.sourceData.headers] : [],
    rows: Array.isArray(props.project?.sourceData?.rows) ? props.project.sourceData.rows.map((row) => ({ ...row })) : [],
    mapping: props.project?.sourceData?.mapping && typeof props.project.sourceData.mapping === 'object'
      ? { ...props.project.sourceData.mapping }
      : {},
    issues: Array.isArray(props.project?.sourceData?.issues) ? [...props.project.sourceData.issues] : []
  }
  importedDailyRows.value = Array.isArray(props.project?.lastRun?.dailyForecast)
    ? props.project.lastRun.dailyForecast.map((row) => ({ ...row }))
    : []
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

const columnOptions = computed(() => [
  { label: 'Not mapped', value: '' },
  ...(draftProject.value.sourceData?.headers || []).map((header) => ({
    label: header,
    value: header
  }))
])

const sourceIssues = computed(() => (
  Array.isArray(draftProject.value.sourceData?.issues) ? draftProject.value.sourceData.issues : []
))

const canApply = computed(() =>
  importedDailyRows.value.length > 0 && sourceIssues.value.length === 0
)

const definitionRows = computed(() => [
  {
    id: 'date',
    label: 'Date',
    required: 'Y',
    example: '2026-01-01',
    definition: 'Forecast service date.',
    mappingKey: 'dateColumn'
  },
  {
    id: 'forecast',
    label: 'Forecast Value',
    required: 'Y',
    example: '1420',
    definition: 'Forecasted contact volume for the date.',
    mappingKey: 'forecastColumn'
  }
])

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

  const nextState = await buildImportedDailySourceStateFromFile(
    file,
    draftProject.value.sourceData?.mapping || {},
    {
      planningYear: draftProject.value.planningYear,
      forecastType: FORECAST_TYPE_BUDGET,
      coverageStartMonthIndex: draftProject.value.coverageStartMonthIndex,
      coverageStartDate: draftProject.value.coverageStartDate,
      coverageEndDate: draftProject.value.coverageEndDate
    }
  )

  draftProject.value.sourceData = {
    fileName: nextState.fileName,
    headers: nextState.headers,
    rows: nextState.rows,
    mapping: nextState.mapping,
    issues: nextState.issues
  }
  importedDailyRows.value = nextState.importedDailyRows
}

watch(
  () => draftProject.value.sourceData?.mapping,
  () => {
    const rows = Array.isArray(draftProject.value.sourceData?.rows) ? draftProject.value.sourceData.rows : []
    const headers = Array.isArray(draftProject.value.sourceData?.headers) ? draftProject.value.sourceData.headers : []

    if (!headers.length || !rows.length) {
      return
    }

    const nextState = buildImportedDailySourceState({
      fileName: draftProject.value.sourceData.fileName,
      headers,
      rows,
      currentMapping: draftProject.value.sourceData.mapping || {},
      planningYear: draftProject.value.planningYear,
      forecastType: FORECAST_TYPE_BUDGET,
      coverageStartMonthIndex: draftProject.value.coverageStartMonthIndex,
      coverageStartDate: draftProject.value.coverageStartDate,
      coverageEndDate: draftProject.value.coverageEndDate
    })

    draftProject.value.sourceData.issues = nextState.issues
    importedDailyRows.value = nextState.importedDailyRows
  },
  { deep: true }
)

const handleApply = () => {
  emit('apply', {
    sourceData: {
      fileName: draftProject.value.sourceData?.fileName || '',
      headers: draftProject.value.sourceData?.headers || [],
      rows: draftProject.value.sourceData?.rows || [],
      mapping: draftProject.value.sourceData?.mapping || {},
      issues: draftProject.value.sourceData?.issues || []
    },
    importedDailyRows: importedDailyRows.value
  })
  visible.value = false
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    kicker="Imported Daily Forecast"
    title="Load Daily Forecast"
    description="Upload a daily forecast file for this staffing group. Imported daily forecasts are saved as read-only demand sources."
    allow-backdrop-close
    max-width="max-w-5xl"
    @close="emit('close')"
  >
    <div class="grid gap-4">
      <AppFileDropzone
        input-id="forecast-imported-daily-upload"
        title="Upload Daily Forecast"
        button-label="Choose CSV"
        description="Drag and drop a CSV here."
        hint-text=""
        :format-badges="['.CSV']"
        compact
        centered
        class="w-full"
        accept=".csv,text/csv"
        @file-select="handleFileSelect"
      />

      <AppTableShell>
        <div class="border-b border-slate-200 px-5 py-4">
          <p class="text-sm font-semibold text-slate-950">File Definition</p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-[960px] w-full border-collapse text-sm text-slate-700">
            <thead class="border-b border-slate-200 bg-[#edf3f8]">
              <tr>
                <th class="px-5 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">Column Name</th>
                <th class="px-4 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">Required</th>
                <th class="px-4 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">Example</th>
                <th class="px-4 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">Definition</th>
                <th class="px-5 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">Mapped Column</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-200">
              <tr v-for="row in definitionRows" :key="row.id" class="bg-white align-middle">
                <td class="px-5 py-3 font-medium text-slate-950">{{ row.label }}</td>
                <td class="px-4 py-3 text-center font-medium" :class="row.required === 'Y' ? 'text-[#15395f]' : ''">{{ row.required }}</td>
                <td class="px-4 py-3 font-mono text-[0.82rem] whitespace-nowrap">{{ row.example }}</td>
                <td class="px-4 py-3 leading-5">{{ row.definition }}</td>
                <td class="px-5 py-3">
                  <AppSelect
                    :id="`forecast-import-${row.id}-column`"
                    v-model="draftProject.sourceData.mapping[row.mappingKey]"
                    compact
                    class="w-full min-w-0"
                    :options="columnOptions"
                    :disabled="!draftProject.sourceData.fileName"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppTableShell>

      <div v-if="sourceIssues.length" class="grid gap-2">
        <AppStatusMessage
          v-for="issue in sourceIssues"
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
