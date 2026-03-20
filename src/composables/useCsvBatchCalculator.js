import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from 'vue'

import {
  buildChartMeta,
  buildChartSeries,
  buildDailyScheduleSeries,
  buildScheduleCoverageChart,
  buildScheduleGanttRows,
  buildScheduleTimeline,
  buildTrendChart,
  buildActiveChartTooltip,
  calculateFileProcessorTotalCalls
} from '../calculators/batch/charts'
import {
  createDailyGlobalAssumptions,
  createDayPlannerInputs,
  createWeeklyPlannerInputs,
  WORKFLOWS
} from '../calculators/batch/config'
import {
  buildWorkflowPayload,
  downloadCsv,
  parseCsvText
} from '../calculators/batch/csv'
import {
  formatAsaSeconds,
  formatCount,
  formatDecimal,
  formatIntervalLabel,
  formatPercent,
  formatVolume
} from '../calculators/batch/formatters'
import {
  createEmptyWorkflowState,
  extractWorkflowErrorMessage,
  normalizeWorkflowPayload
} from '../calculators/batch/workflow'

export const useCsvBatchCalculator = () => {
  const selectedMode = ref('file-processor')
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
  const calculatedRows = ref(initialWorkflowState.calculatedRows)
  const dailyBreakdown = ref(initialWorkflowState.dailyBreakdown)
  const shiftPlan = ref(initialWorkflowState.shiftPlan)
  const scheduleCoverage = ref(initialWorkflowState.scheduleCoverage)
  const agentSchedules = ref(initialWorkflowState.agentSchedules)
  const exportData = ref(initialWorkflowState.exportData)
  const activeResultsTab = ref(initialWorkflowState.activeResultsTab)
  const focusedRowIndex = ref(initialWorkflowState.focusedRowIndex)
  const activeChartPointIndex = ref(initialWorkflowState.activeChartPointIndex)
  const activeSchedulePointIndex = ref(initialWorkflowState.activeSchedulePointIndex)

  const dayPlannerInputs = reactive(createDayPlannerInputs())
  const weeklyPlannerInputs = reactive(createWeeklyPlannerInputs())
  const dailyGlobalAssumptions = reactive(createDailyGlobalAssumptions())

  const currentWorkflow = computed(
    () => WORKFLOWS.find((workflow) => workflow.id === selectedMode.value) ?? WORKFLOWS[0]
  )
  const useFileDailyAssumptions = computed(() => dayPlannerInputs.assumptionSource === 'file')

  const parsedRowCount = computed(() => parsedRows.value.length)
  const processedCount = computed(() => summary.value?.processedRows ?? 0)
  const successfulCount = computed(() => summary.value?.successfulRows ?? 0)
  const failedCount = computed(() => summary.value?.failedRows ?? errors.value.length)

  const chartMeta = computed(() => buildChartMeta(selectedMode.value))

  const chartSeries = computed(() =>
    buildChartSeries({
      selectedMode: selectedMode.value,
      hasSubmitted: hasSubmitted.value,
      calculatedRows: calculatedRows.value,
      results: results.value,
      parsedRows: parsedRows.value,
      formatIntervalLabel
    })
  )

  const dailyScheduleSeries = computed(() =>
    buildDailyScheduleSeries({
      selectedMode: selectedMode.value,
      scheduleCoverage: scheduleCoverage.value,
      formatIntervalLabel
    })
  )

  const schedulePeakCoverage = computed(() =>
    dailyScheduleSeries.value.reduce(
      (peak, row) => Math.max(peak, row.requiredHeadcount, row.plannedHeadcount),
      0
    )
  )

  const scheduleCoverageChart = computed(() =>
    buildScheduleCoverageChart({
      selectedMode: selectedMode.value,
      dailyScheduleSeries: dailyScheduleSeries.value,
      formatCount
    })
  )

  const scheduleTotals = computed(() => {
    if (selectedMode.value !== 'daily-plan') {
      return {
        shiftCount: 0,
        shiftStarts: 0,
        coverageRate: 0,
        gap: 0,
        overage: 0
      }
    }

    return {
      shiftCount: Number(summary.value?.optimizedShiftCount ?? 0),
      shiftStarts: Number(summary.value?.optimizedShiftStarts ?? 0),
      coverageRate: Number(summary.value?.coverageRate ?? 0),
      gap: Number(summary.value?.totalCoverageGap ?? 0),
      overage: Number(summary.value?.totalCoverageOverage ?? 0)
    }
  })

  const activeSchedulePoint = computed(() => {
    if (selectedMode.value !== 'daily-plan') return null
    if (activeSchedulePointIndex.value === null) return null
    return scheduleCoverageChart.value?.points?.[activeSchedulePointIndex.value] ?? null
  })

  const scheduleTimeline = computed(() =>
    buildScheduleTimeline({
      selectedMode: selectedMode.value,
      scheduleCoverage: scheduleCoverage.value,
      formatIntervalLabel
    })
  )

  const scheduleGanttRows = computed(() =>
    buildScheduleGanttRows({
      selectedMode: selectedMode.value,
      scheduleTimeline: scheduleTimeline.value,
      agentSchedules: agentSchedules.value,
      formatIntervalLabel
    })
  )

  const fileProcessorTotalCalls = computed(() =>
    calculateFileProcessorTotalCalls({
      selectedMode: selectedMode.value,
      calculatedRows: calculatedRows.value,
      parsedRows: parsedRows.value
    })
  )

  const trendChart = computed(() =>
    buildTrendChart({
      selectedMode: selectedMode.value,
      chartSeries: chartSeries.value,
      formatCount
    })
  )

  const activeChartPoint = computed(() => {
    if (selectedMode.value !== 'daily-plan') return null
    if (!trendChart.value || activeChartPointIndex.value === null) return null
    return trendChart.value.points.find((point) => point.index === activeChartPointIndex.value) ?? null
  })

  const activeChartTooltip = computed(() =>
    buildActiveChartTooltip({
      selectedMode: selectedMode.value,
      trendChart: trendChart.value,
      activeChartPoint: activeChartPoint.value,
      formatCount
    })
  )

  const primaryKpi = computed(() => {
    if (!summary.value) {
      return {
        label: 'Primary KPI',
        value: '--',
        meta: 'Run a workflow to calculate demand.'
      }
    }

    if (selectedMode.value === 'daily-plan') {
      return {
        label: 'Required Daily FTE',
        value: formatCount(summary.value.requiredDailyFte),
        meta: 'recommended staffing for the selected day'
      }
    }

    if (selectedMode.value === 'weekly-plan') {
      return {
        label: 'Average Daily FTE',
        value: formatDecimal(summary.value.averageDailyFte),
        meta: `across ${formatCount(summary.value.dayCount)} service days`
      }
    }

    return {
      label: 'Peak Headcount Need',
      value: formatCount(summary.value.peakStaffGross),
      meta: 'highest interval requirement in file'
    }
  })

  const hasTrendTab = computed(
    () => selectedMode.value !== 'file-processor' && trendChart.value !== null
  )

  const hasScheduleTab = computed(
    () => selectedMode.value === 'daily-plan' && dailyScheduleSeries.value.length > 0
  )

  const hasRowsTab = computed(() => {
    if (selectedMode.value === 'file-processor') return false
    if (selectedMode.value === 'daily-plan') {
      return calculatedRows.value.length > 0 || results.value.length > 0
    }
    if (selectedMode.value === 'weekly-plan') {
      return results.value.length > 0 || dailyBreakdown.value.length > 0
    }
    return false
  })

  const availableTabs = computed(() => {
    const tabs = [{ id: 'summary', label: 'Summary' }]
    if (hasTrendTab.value) tabs.push({ id: 'trend', label: 'Trend' })
    if (hasScheduleTab.value) tabs.push({ id: 'schedule', label: 'Schedule Plan' })
    if (hasRowsTab.value) tabs.push({ id: 'rows', label: 'Rows' })
    if (errors.value.length > 0) tabs.push({ id: 'errors', label: `Errors (${errors.value.length})` })
    return tabs
  })

  const primaryExportReady = computed(() => {
    const exportBlock = exportData.value?.[currentWorkflow.value.exportKey]
    return Array.isArray(exportBlock?.rows) && exportBlock.rows.length > 0
  })

  const weeklyBreakdownExportReady = computed(() => {
    const exportBlock = exportData.value?.dailyBreakdown
    return Array.isArray(exportBlock?.rows) && exportBlock.rows.length > 0
  })

  const applyWorkflowState = (nextState) => {
    hasSubmitted.value = nextState.hasSubmitted
    summary.value = nextState.summary
    errors.value = nextState.errors
    results.value = nextState.results
    calculatedRows.value = nextState.calculatedRows
    dailyBreakdown.value = nextState.dailyBreakdown
    shiftPlan.value = nextState.shiftPlan
    scheduleCoverage.value = nextState.scheduleCoverage
    agentSchedules.value = nextState.agentSchedules
    exportData.value = nextState.exportData
    activeResultsTab.value = nextState.activeResultsTab
    focusedRowIndex.value = nextState.focusedRowIndex
    activeChartPointIndex.value = nextState.activeChartPointIndex
    activeSchedulePointIndex.value = nextState.activeSchedulePointIndex
  }

  const resetOutputs = () => {
    applyWorkflowState(createEmptyWorkflowState())
  }

  const setMode = (mode) => {
    if (mode === selectedMode.value) return
    selectedMode.value = mode
    parseError.value = ''
    submitError.value = ''
    resetOutputs()
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
        selectedMode: selectedMode.value,
        parsedRows: parsedRows.value,
        parsedHeaders: parsedHeaders.value,
        currentWorkflow: currentWorkflow.value,
        useFileDailyAssumptions: useFileDailyAssumptions.value,
        dayPlannerInputs,
        weeklyPlannerInputs,
        dailyGlobalAssumptions
      })

      const response = await fetch(currentWorkflow.value.endpoint, {
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
      submitError.value = error instanceof Error ? error.message : 'Unable to run selected workflow.'
    } finally {
      isLoading.value = false
    }
  }

  const exportPrimary = () => {
    const exportKey = currentWorkflow.value.exportKey
    const exportBlock = exportData.value?.[exportKey]
    if (!exportBlock?.headers?.length) return
    downloadCsv(currentWorkflow.value.exportFilename, exportBlock.headers, exportBlock.rows ?? [])
  }

  const exportDailyBreakdown = () => {
    const exportBlock = exportData.value?.dailyBreakdown
    if (!exportBlock?.headers?.length) return
    downloadCsv('weekly_daily_breakdown.csv', exportBlock.headers, exportBlock.rows ?? [])
  }

  watchEffect(() => {
    if (!hasSubmitted.value) {
      activeResultsTab.value = 'summary'
      return
    }

    if (!availableTabs.value.some((tab) => tab.id === activeResultsTab.value)) {
      activeResultsTab.value = availableTabs.value[0]?.id ?? 'summary'
    }
  })

  const jumpToOutputRow = async (rowIndex) => {
    if (!Number.isFinite(Number(rowIndex)) || Number(rowIndex) <= 0) return
    activeResultsTab.value = 'rows'
    focusedRowIndex.value = Number(rowIndex)
    await nextTick()
    const rowElement = document.getElementById(`batch-row-${rowIndex}`)
    rowElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
    WORKFLOWS,
    selectedMode,
    selectedFileName,
    parsedHeaders,
    parsedRows,
    parseError,
    submitError,
    isLoading,
    hasSubmitted,
    summary,
    errors,
    results,
    calculatedRows,
    dailyBreakdown,
    shiftPlan,
    scheduleCoverage,
    agentSchedules,
    exportData,
    activeResultsTab,
    focusedRowIndex,
    dayPlannerInputs,
    weeklyPlannerInputs,
    dailyGlobalAssumptions,
    currentWorkflow,
    useFileDailyAssumptions,
    parsedRowCount,
    processedCount,
    successfulCount,
    failedCount,
    chartMeta,
    schedulePeakCoverage,
    scheduleTotals,
    scheduleCoverageChart,
    activeSchedulePointIndex,
    activeSchedulePoint,
    scheduleTimeline,
    scheduleGanttRows,
    fileProcessorTotalCalls,
    trendChart,
    activeChartPointIndex,
    activeChartPoint,
    activeChartTooltip,
    primaryKpi,
    hasTrendTab,
    hasScheduleTab,
    hasRowsTab,
    availableTabs,
    primaryExportReady,
    weeklyBreakdownExportReady,
    formatCount,
    formatVolume,
    formatDecimal,
    formatPercent,
    formatAsaSeconds,
    formatIntervalLabel,
    setMode,
    handleFileSelect,
    runWorkflow,
    exportPrimary,
    exportDailyBreakdown,
    jumpToOutputRow
  }
}
