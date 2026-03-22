import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { WORKFLOWS } from '../calculators/batch/config'
import { buildWorkflowPayload, downloadCsv, parseCsvText } from '../calculators/batch/csv'
import {
  formatAsaSeconds,
  formatCount,
  formatDecimal,
  formatPercent,
  formatVolume
} from '../calculators/batch/formatters'
import {
  createEmptyWorkflowState,
  extractWorkflowErrorMessage,
  normalizeWorkflowPayload
} from '../calculators/batch/workflow'

export const useCsvBatchCalculator = () => {
  const currentWorkflow = WORKFLOWS[0]
  const selectedFileName = ref('')
  const parsedHeaders = ref([])
  const parsedRows = ref([])
  const parseError = ref('')
  const submitError = ref('')
  const isLoading = ref(false)

  const initialWorkflowState = createEmptyWorkflowState()
  const hasSubmitted = ref(initialWorkflowState.hasSubmitted)
  const summary = ref(initialWorkflowState.summary)
  const errors = ref(initialWorkflowState.errors)
  const results = ref(initialWorkflowState.results)
  const exportData = ref(initialWorkflowState.exportData)

  const parsedRowCount = computed(() => parsedRows.value.length)
  const processedCount = computed(() => summary.value?.processedRows ?? 0)
  const successfulCount = computed(() => summary.value?.successfulRows ?? 0)
  const failedCount = computed(() => summary.value?.failedRows ?? errors.value.length)

  const fileProcessorTotalCalls = computed(() =>
    parsedRows.value.reduce((total, row) => {
      const calls = Number(row.calls_offered)
      return total + (Number.isFinite(calls) ? calls : 0)
    }, 0)
  )

  const primaryKpi = computed(() => {
    if (!summary.value) {
      return {
        label: 'Primary KPI',
        value: '--',
        meta: 'Run the file processor to calculate staffing.'
      }
    }

    return {
      label: 'Peak Headcount Need',
      value: formatCount(summary.value.peakStaffGross),
      meta: 'highest interval requirement in file'
    }
  })

  const primaryExportReady = computed(() => {
    const exportBlock = exportData.value?.[currentWorkflow.exportKey]
    return Array.isArray(exportBlock?.rows) && exportBlock.rows.length > 0
  })

  const applyWorkflowState = (nextState) => {
    hasSubmitted.value = nextState.hasSubmitted
    summary.value = nextState.summary
    errors.value = nextState.errors
    results.value = nextState.results
    exportData.value = nextState.exportData
  }

  const resetOutputs = () => {
    applyWorkflowState(createEmptyWorkflowState())
  }

  const handleFileSelect = async (event) => {
    const input = event.target
    const file = input.files?.[0]
    parseError.value = ''
    submitError.value = ''
    resetOutputs()

    if (!file) {
      selectedFileName.value = ''
      parsedHeaders.value = []
      parsedRows.value = []
      return
    }

    selectedFileName.value = file.name
    try {
      const text = await file.text()
      const parsed = parseCsvText(text)
      if (!parsed.rows.length) {
        throw new Error('No data rows found in CSV.')
      }
      parsedHeaders.value = parsed.headers
      parsedRows.value = parsed.rows
    } catch (error) {
      parsedHeaders.value = []
      parsedRows.value = []
      parseError.value = error instanceof Error ? error.message : 'Unable to parse CSV file.'
    }
  }

  const runWorkflow = async () => {
    parseError.value = ''
    submitError.value = ''
    resetOutputs()

    if (!parsedRows.value.length) {
      parseError.value = 'Upload a valid CSV file before running this workflow.'
      return
    }

    isLoading.value = true
    try {
      const payload = buildWorkflowPayload({
        parsedRows: parsedRows.value,
        parsedHeaders: parsedHeaders.value,
        currentWorkflow
      })

      const response = await fetch(currentWorkflow.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(await extractWorkflowErrorMessage(response))
      }

      applyWorkflowState(normalizeWorkflowPayload(await response.json()))
    } catch (error) {
      submitError.value = error instanceof Error ? error.message : 'Unable to run file processor.'
    } finally {
      isLoading.value = false
    }
  }

  const exportPrimary = () => {
    const exportBlock = exportData.value?.[currentWorkflow.exportKey]
    if (!exportBlock?.headers?.length) return
    downloadCsv(currentWorkflow.exportFilename, exportBlock.headers, exportBlock.rows ?? [])
  }

  const handlePrimaryExportShortcut = () => {
    if (primaryExportReady.value) {
      exportPrimary()
    }
  }

  onMounted(() => {
    window.addEventListener('wfm:export-primary', handlePrimaryExportShortcut)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('wfm:export-primary', handlePrimaryExportShortcut)
  })

  return {
    currentWorkflow,
    selectedFileName,
    parseError,
    submitError,
    isLoading,
    hasSubmitted,
    summary,
    errors,
    results,
    parsedRowCount,
    processedCount,
    successfulCount,
    failedCount,
    fileProcessorTotalCalls,
    primaryKpi,
    primaryExportReady,
    formatCount,
    formatVolume,
    formatDecimal,
    formatPercent,
    formatAsaSeconds,
    handleFileSelect,
    runWorkflow,
    exportPrimary
  }
}
