<script setup>
import CsvBatchControlPanel from './calculators/CsvBatchControlPanel.vue'
import CsvBatchResultsPanel from './calculators/CsvBatchResultsPanel.vue'
import { useCsvBatchCalculator } from '../composables/useCsvBatchCalculator'

const {
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
} = useCsvBatchCalculator()
</script>

<template>
  <section id="csv-batch" class="calculator-section" aria-label="CSV File Processor">
    <div class="app-frame grid gap-4 xl:grid-cols-[minmax(22rem,0.84fr)_minmax(0,1.16fr)]">
      <CsvBatchControlPanel
        :workflow="currentWorkflow"
        :selected-file-name="selectedFileName"
        :parsed-row-count="parsedRowCount"
        :parse-error="parseError"
        :submit-error="submitError"
        :is-loading="isLoading"
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
        :workflow="currentWorkflow"
        :summary="summary"
        :file-processor-total-calls="fileProcessorTotalCalls"
        :primary-export-ready="primaryExportReady"
        :results="results"
        :errors="errors"
        :format-count="formatCount"
        :format-volume="formatVolume"
        :format-percent="formatPercent"
        :format-asa-seconds="formatAsaSeconds"
        :format-decimal="formatDecimal"
        @export-primary="exportPrimary"
      />
    </div>
  </section>
</template>
