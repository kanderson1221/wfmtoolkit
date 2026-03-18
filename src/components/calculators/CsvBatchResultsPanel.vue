<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppPanel from '../ui/AppPanel.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import CsvBatchErrorsTab from './CsvBatchErrorsTab.vue'
import CsvBatchRowsTab from './CsvBatchRowsTab.vue'
import CsvBatchScheduleTab from './CsvBatchScheduleTab.vue'
import CsvBatchSummaryTab from './CsvBatchSummaryTab.vue'
import CsvBatchTrendTab from './CsvBatchTrendTab.vue'

const props = defineProps({
  hasSubmitted: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  parseError: {
    type: String,
    default: ''
  },
  submitError: {
    type: String,
    default: ''
  },
  primaryKpi: {
    type: Object,
    required: true
  },
  processedCount: {
    type: Number,
    default: 0
  },
  successfulCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  availableTabs: {
    type: Array,
    default: () => []
  },
  activeResultsTab: {
    type: String,
    required: true
  },
  currentWorkflow: {
    type: Object,
    required: true
  },
  selectedMode: {
    type: String,
    required: true
  },
  summary: {
    type: Object,
    default: null
  },
  fileProcessorTotalCalls: {
    type: Number,
    default: 0
  },
  primaryExportReady: {
    type: Boolean,
    default: false
  },
  weeklyBreakdownExportReady: {
    type: Boolean,
    default: false
  },
  hasTrendTab: {
    type: Boolean,
    default: false
  },
  hasScheduleTab: {
    type: Boolean,
    default: false
  },
  hasRowsTab: {
    type: Boolean,
    default: false
  },
  trendChart: {
    type: Object,
    default: null
  },
  chartMeta: {
    type: Object,
    default: null
  },
  activeChartPointIndex: {
    type: Number,
    default: null
  },
  activeChartPoint: {
    type: Object,
    default: null
  },
  activeChartTooltip: {
    type: Object,
    default: null
  },
  scheduleTotals: {
    type: Object,
    required: true
  },
  scheduleCoverageChart: {
    type: Object,
    default: null
  },
  activeSchedulePointIndex: {
    type: Number,
    default: null
  },
  activeSchedulePoint: {
    type: Object,
    default: null
  },
  scheduleTimeline: {
    type: Object,
    default: null
  },
  scheduleGanttRows: {
    type: Array,
    default: () => []
  },
  shiftPlan: {
    type: Array,
    default: () => []
  },
  schedulePeakCoverage: {
    type: Number,
    default: 0
  },
  calculatedRows: {
    type: Array,
    default: () => []
  },
  results: {
    type: Array,
    default: () => []
  },
  dailyBreakdown: {
    type: Array,
    default: () => []
  },
  errors: {
    type: Array,
    default: () => []
  },
  focusedRowIndex: {
    type: Number,
    default: null
  },
  formatCount: {
    type: Function,
    required: true
  },
  formatVolume: {
    type: Function,
    required: true
  },
  formatPercent: {
    type: Function,
    required: true
  },
  formatAsaSeconds: {
    type: Function,
    required: true
  },
  formatDecimal: {
    type: Function,
    required: true
  },
  formatIntervalLabel: {
    type: Function,
    required: true
  }
})

const emit = defineEmits([
  'update:active-results-tab',
  'update:active-chart-point-index',
  'update:active-schedule-point-index',
  'export-primary',
  'export-daily-breakdown',
  'jump-to-row'
])

const overviewCards = computed(() => [
  props.primaryKpi,
  {
    label: 'Processed',
    value: props.formatCount(props.processedCount),
    meta: 'rows evaluated'
  },
  {
    label: 'Succeeded',
    value: props.formatCount(props.successfulCount),
    meta: 'rows with valid calculations'
  },
  {
    label: 'Failed',
    value: props.formatCount(props.failedCount),
    meta: 'rows requiring correction'
  }
])
</script>

<template>
  <AppPanel
    id="batch-results"
    :padded="false"
    class="grid content-start gap-4 p-5"
    aria-live="polite"
  >
    <AppSectionHeader
      kicker="Batch Results"
      title="Output Workspace"
      description="KPI summary, trend diagnostics, schedule visualization, and CSV exports."
    />

    <AppEmptyState
      v-if="!props.hasSubmitted && !props.isLoading && !props.parseError && !props.submitError"
      title="No workflow output yet"
      description="Select a workflow, upload a CSV, then run processing to populate this workspace."
    />

    <section v-if="props.hasSubmitted" class="grid gap-4" aria-label="Batch calculation results">
      <div class="results-sticky-summary">
        <article
          v-for="(card, index) in overviewCards"
          :key="card.label"
          class="answer-card"
          :class="index === 0 ? 'answer-card-primary' : ''"
        >
          <p class="metric-label">{{ card.label }}</p>
          <p class="metric-value">{{ card.value }}</p>
          <p class="metric-meta">{{ card.meta }}</p>
        </article>
      </div>

      <div class="flex flex-wrap gap-2" role="tablist" aria-label="Batch result views">
        <AppButton
          v-for="tab in props.availableTabs"
          :key="tab.id"
          variant="tab"
          size="sm"
          :active="props.activeResultsTab === tab.id"
          role="tab"
          :aria-selected="props.activeResultsTab === tab.id ? 'true' : 'false'"
          @click="emit('update:active-results-tab', tab.id)"
        >
          {{ tab.label }}
        </AppButton>
      </div>

      <CsvBatchSummaryTab
        v-if="props.activeResultsTab === 'summary'"
        :current-workflow="props.currentWorkflow"
        :selected-mode="props.selectedMode"
        :summary="props.summary"
        :file-processor-total-calls="props.fileProcessorTotalCalls"
        :primary-export-ready="props.primaryExportReady"
        :weekly-breakdown-export-ready="props.weeklyBreakdownExportReady"
        :format-count="props.formatCount"
        :format-volume="props.formatVolume"
        :format-percent="props.formatPercent"
        :format-asa-seconds="props.formatAsaSeconds"
        :format-decimal="props.formatDecimal"
        @export-primary="emit('export-primary')"
        @export-daily-breakdown="emit('export-daily-breakdown')"
      />

      <CsvBatchTrendTab
        v-if="props.activeResultsTab === 'trend' && props.hasTrendTab && props.trendChart && props.chartMeta"
        :chart-meta="props.chartMeta"
        :trend-chart="props.trendChart"
        :selected-mode="props.selectedMode"
        :active-chart-point-index="props.activeChartPointIndex"
        :active-chart-point="props.activeChartPoint"
        :active-chart-tooltip="props.activeChartTooltip"
        :format-count="props.formatCount"
        @update:active-chart-point-index="emit('update:active-chart-point-index', $event)"
      />

      <CsvBatchScheduleTab
        v-if="props.activeResultsTab === 'schedule' && props.hasScheduleTab && props.scheduleCoverageChart"
        :summary="props.summary"
        :schedule-totals="props.scheduleTotals"
        :schedule-coverage-chart="props.scheduleCoverageChart"
        :active-schedule-point-index="props.activeSchedulePointIndex"
        :active-schedule-point="props.activeSchedulePoint"
        :schedule-timeline="props.scheduleTimeline"
        :schedule-gantt-rows="props.scheduleGanttRows"
        :shift-plan="props.shiftPlan"
        :schedule-peak-coverage="props.schedulePeakCoverage"
        :format-count="props.formatCount"
        :format-decimal="props.formatDecimal"
        :format-interval-label="props.formatIntervalLabel"
        @update:active-schedule-point-index="emit('update:active-schedule-point-index', $event)"
      />

      <CsvBatchRowsTab
        v-if="props.activeResultsTab === 'rows' && props.hasRowsTab"
        :selected-mode="props.selectedMode"
        :calculated-rows="props.calculatedRows"
        :results="props.results"
        :daily-breakdown="props.dailyBreakdown"
        :focused-row-index="props.focusedRowIndex"
        :format-count="props.formatCount"
        :format-decimal="props.formatDecimal"
        :format-percent="props.formatPercent"
        :format-asa-seconds="props.formatAsaSeconds"
      />

      <CsvBatchErrorsTab
        v-if="props.activeResultsTab === 'errors' && props.errors.length"
        :errors="props.errors"
        :has-rows-tab="props.hasRowsTab"
        @jump-to-row="emit('jump-to-row', $event)"
      />
    </section>
  </AppPanel>
</template>
