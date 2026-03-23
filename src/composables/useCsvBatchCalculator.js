import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { WORKFLOWS } from '../calculators/batch/config'
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

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return ''
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${bytes} B`
}

const downloadFile = (downloadUrl, fileName = '') => {
  if (!downloadUrl) return

  const link = document.createElement('a')
  link.href = downloadUrl
  if (fileName) {
    link.setAttribute('download', fileName)
  }
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const useCsvBatchCalculator = () => {
  const currentWorkflow = WORKFLOWS[0]
  const selectedFile = ref(null)
  const selectedFileName = ref('')
  const selectedFileSize = ref(0)
  const parseError = ref('')
  const submitError = ref('')
  const isLoading = ref(false)

  const initialWorkflowState = createEmptyWorkflowState()
  const hasSubmitted = ref(initialWorkflowState.hasSubmitted)
  const summary = ref(initialWorkflowState.summary)
  const errors = ref(initialWorkflowState.errors)
  const errorCount = ref(initialWorkflowState.errorCount)
  const downloads = ref(initialWorkflowState.downloads)

  const processedCount = computed(() => summary.value?.processedRows ?? 0)
  const successfulCount = computed(() => summary.value?.successfulRows ?? 0)
  const failedCount = computed(() => summary.value?.failedRows ?? errorCount.value)
  const fileProcessorTotalCalls = computed(() => summary.value?.totalCallsOffered ?? 0)
  const selectedFileSizeLabel = computed(() => formatFileSize(selectedFileSize.value))

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

  const primaryExportReady = computed(() => Boolean(downloads.value?.enrichedFile?.downloadUrl))
  const errorReportReady = computed(() => Boolean(downloads.value?.errorReport?.downloadUrl))

  const applyWorkflowState = (nextState) => {
    hasSubmitted.value = nextState.hasSubmitted
    summary.value = nextState.summary
    errors.value = nextState.errors
    errorCount.value = nextState.errorCount
    downloads.value = nextState.downloads
  }

  const resetOutputs = () => {
    applyWorkflowState(createEmptyWorkflowState())
  }

  const resetSelectedFile = () => {
    selectedFile.value = null
    selectedFileName.value = ''
    selectedFileSize.value = 0
  }

  const handleFileSelect = (event) => {
    const input = event.target
    const file = input.files?.[0]
    parseError.value = ''
    submitError.value = ''
    resetOutputs()

    if (!file) {
      resetSelectedFile()
      return
    }

    const fileName = file.name ?? ''
    if (!fileName.toLowerCase().endsWith('.csv')) {
      resetSelectedFile()
      parseError.value = 'Upload a CSV file before running this workflow.'
      input.value = ''
      return
    }

    if (file.size > currentWorkflow.maxFileSizeBytes) {
      resetSelectedFile()
      parseError.value = 'CSV exceeds the 50 MB upload limit.'
      input.value = ''
      return
    }

    selectedFile.value = file
    selectedFileName.value = fileName
    selectedFileSize.value = file.size
  }

  const runWorkflow = async () => {
    parseError.value = ''
    submitError.value = ''
    resetOutputs()

    if (!selectedFile.value) {
      parseError.value = 'Upload a valid CSV file before running this workflow.'
      return
    }

    isLoading.value = true
    try {
      const response = await fetch(currentWorkflow.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': selectedFile.value.type || 'text/csv',
          'X-Upload-Filename': encodeURIComponent(selectedFileName.value)
        },
        body: selectedFile.value
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
    const artifact = downloads.value?.enrichedFile
    if (!artifact?.downloadUrl) return
    downloadFile(artifact.downloadUrl, artifact.fileName)
  }

  const exportErrorReport = () => {
    const artifact = downloads.value?.errorReport
    if (!artifact?.downloadUrl) return
    downloadFile(artifact.downloadUrl, artifact.fileName)
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
    selectedFileSizeLabel,
    parseError,
    submitError,
    isLoading,
    hasSubmitted,
    summary,
    errors,
    errorCount,
    processedCount,
    successfulCount,
    failedCount,
    fileProcessorTotalCalls,
    primaryKpi,
    primaryExportReady,
    errorReportReady,
    formatCount,
    formatVolume,
    formatDecimal,
    formatPercent,
    formatAsaSeconds,
    handleFileSelect,
    runWorkflow,
    exportPrimary,
    exportErrorReport
  }
}
