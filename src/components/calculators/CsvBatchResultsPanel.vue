<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppPanel from '../ui/AppPanel.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import CsvBatchErrorsTab from './CsvBatchErrorsTab.vue'

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
  workflow: {
    type: Object,
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
  results: {
    type: Array,
    default: () => []
  },
  errors: {
    type: Array,
    default: () => []
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
  }
})

const emit = defineEmits(['export-primary'])

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

const metricCards = computed(() => [
  {
    label: 'Total Calls Offered',
    value: props.formatVolume(props.fileProcessorTotalCalls),
    meta: 'sum of interval demand'
  },
  {
    label: 'Avg Service Level',
    value: props.formatPercent(props.summary?.avgServiceLevel),
    meta: 'across successful rows'
  },
  {
    label: 'Avg ASA',
    value: props.formatAsaSeconds(props.summary?.avgAsaSeconds),
    meta: 'across successful rows'
  },
  {
    label: 'Total Agent Hours',
    value: props.formatDecimal(props.summary?.totalRequiredStaffHoursNet),
    meta: 'required agents without shrinkage'
  },
  {
    label: 'Total Headcount Hours',
    value: props.formatDecimal(props.summary?.totalRequiredStaffHoursGross),
    meta: 'required headcount with shrinkage'
  },
  {
    label: 'Peak Agent Need',
    value: props.formatCount(props.summary?.peakStaffNet),
    meta: 'highest interval requirement'
  },
  {
    label: 'Peak Headcount Need',
    value: props.formatCount(props.summary?.peakStaffGross),
    meta: 'highest gross requirement'
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
      kicker="Processed Output"
      title="Output Workspace"
      description="Review the staffing summary and export the enriched results file."
    />

    <AppEmptyState
      v-if="!props.hasSubmitted && !props.isLoading && !props.parseError && !props.submitError"
      title="No processed file yet"
      description="Upload a CSV and run the file processor to populate this workspace."
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

      <section class="results-tab-panel">
        <AppSectionHeader
          :title="`${props.workflow.label} Results`"
          description="Use these metrics to review the processed file before exporting it."
        />

        <div class="results-metrics">
          <article v-for="card in metricCards" :key="card.label" class="metric-card">
            <p class="metric-label">{{ card.label }}</p>
            <p class="metric-value">{{ card.value }}</p>
            <p class="metric-meta">{{ card.meta }}</p>
          </article>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <AppButton
            variant="secondary"
            :disabled="!props.primaryExportReady"
            @click="emit('export-primary')"
          >
            {{ props.workflow.exportLabel }}
          </AppButton>
          <p class="text-sm leading-6 text-slate-600">
            {{ props.formatCount(props.results.length) }} result rows ready for export.
          </p>
        </div>
      </section>

      <CsvBatchErrorsTab v-if="props.errors.length" :errors="props.errors" />
    </section>
  </AppPanel>
</template>
