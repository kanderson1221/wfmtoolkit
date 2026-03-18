<script setup>
import CsvBatchControlPanel from './calculators/CsvBatchControlPanel.vue'
import CsvBatchResultsPanel from './calculators/CsvBatchResultsPanel.vue'
import { useCsvBatchCalculator } from '../composables/useCsvBatchCalculator'

const {
  WORKFLOWS,
  selectedMode,
  selectedFileName,
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
} = useCsvBatchCalculator()
</script>

<template>
  <section id="csv-batch" class="calculator-section" aria-label="Bulk Staffing Planner">
    <div class="app-frame grid gap-4 xl:grid-cols-[minmax(22rem,0.84fr)_minmax(0,1.16fr)]">
      <CsvBatchControlPanel
        :workflows="WORKFLOWS"
        :current-workflow="currentWorkflow"
        :selected-mode="selectedMode"
        :selected-file-name="selectedFileName"
        :parsed-row-count="parsedRowCount"
        :parse-error="parseError"
        :submit-error="submitError"
        :is-loading="isLoading"
        :use-file-daily-assumptions="useFileDailyAssumptions"
        :day-planner-inputs="dayPlannerInputs"
        :weekly-planner-inputs="weeklyPlannerInputs"
        :daily-global-assumptions="dailyGlobalAssumptions"
        @select-mode="setMode"
        @file-select="handleFileSelect"
        @run-workflow="runWorkflow"
      />

      <CsvBatchResultsPanel
        :has-submitted="hasSubmitted"
        :is-loading="isLoading"
        :parse-error="parseError"
        :submit-error="submitError"
        :primary-kpi="primaryKpi"
        :processed-count="processedCount"
        :successful-count="successfulCount"
        :failed-count="failedCount"
        :available-tabs="availableTabs"
        :active-results-tab="activeResultsTab"
        :current-workflow="currentWorkflow"
        :selected-mode="selectedMode"
        :summary="summary"
        :file-processor-total-calls="fileProcessorTotalCalls"
        :primary-export-ready="primaryExportReady"
        :weekly-breakdown-export-ready="weeklyBreakdownExportReady"
        :has-trend-tab="hasTrendTab"
        :has-schedule-tab="hasScheduleTab"
        :has-rows-tab="hasRowsTab"
        :trend-chart="trendChart"
        :chart-meta="chartMeta"
        :active-chart-point-index="activeChartPointIndex"
        :active-chart-point="activeChartPoint"
        :active-chart-tooltip="activeChartTooltip"
        :schedule-totals="scheduleTotals"
        :schedule-coverage-chart="scheduleCoverageChart"
        :active-schedule-point-index="activeSchedulePointIndex"
        :active-schedule-point="activeSchedulePoint"
        :schedule-timeline="scheduleTimeline"
        :schedule-gantt-rows="scheduleGanttRows"
        :shift-plan="shiftPlan"
        :schedule-peak-coverage="schedulePeakCoverage"
        :calculated-rows="calculatedRows"
        :results="results"
        :daily-breakdown="dailyBreakdown"
        :errors="errors"
        :focused-row-index="focusedRowIndex"
        :format-count="formatCount"
        :format-volume="formatVolume"
        :format-percent="formatPercent"
        :format-asa-seconds="formatAsaSeconds"
        :format-decimal="formatDecimal"
        :format-interval-label="formatIntervalLabel"
        @update:active-results-tab="activeResultsTab = $event"
        @update:active-chart-point-index="activeChartPointIndex = $event"
        @update:active-schedule-point-index="activeSchedulePointIndex = $event"
        @export-primary="exportPrimary"
        @export-daily-breakdown="exportDailyBreakdown"
        @jump-to-row="jumpToOutputRow"
      />
    </div>
  </section>
</template>
