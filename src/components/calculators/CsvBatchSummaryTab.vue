<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'

const props = defineProps({
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

const emit = defineEmits(['export-primary', 'export-daily-breakdown'])

const metricCards = computed(() => {
  if (props.selectedMode === 'weekly-plan') {
    return [
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
        label: 'Total Net Hours',
        value: props.formatDecimal(props.summary?.totalRequiredStaffHoursNet),
        meta: 'required labor net'
      },
      {
        label: 'Total Gross Hours',
        value: props.formatDecimal(props.summary?.totalRequiredStaffHoursGross),
        meta: 'required labor gross'
      },
      {
        label: 'Peak Net Staff',
        value: props.formatCount(props.summary?.peakStaffNet),
        meta: 'highest interval net staff'
      },
      {
        label: 'Peak Gross Staff',
        value: props.formatCount(props.summary?.peakStaffGross),
        meta: 'highest interval gross staff'
      },
      {
        label: 'Total Required HC Hours',
        value: props.formatDecimal(props.summary?.totalRequiredHeadcountHours),
        meta: 'week-level headcount demand'
      },
      {
        label: 'Average Daily FTE',
        value: props.formatDecimal(props.summary?.averageDailyFte),
        meta: 'daily average for included days'
      },
      {
        label: 'Peak Day',
        value: props.summary?.peakDay ?? '-',
        meta: `${props.formatDecimal(props.summary?.peakDayRequiredHeadcountHours)} HC hours`
      },
      {
        label: 'Staffing Variability',
        value: `${props.formatDecimal((props.summary?.staffingVariability ?? 0) * 100, 1)}%`,
        meta: 'range vs average daily FTE'
      }
    ]
  }

  return [
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
      meta: 'required agents (no shrinkage)'
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
  ]
})
</script>

<template>
  <section class="results-tab-panel">
    <AppSectionHeader
      :title="`${props.currentWorkflow.label} Results`"
      description="Use the tabs for trend diagnostics, schedule visualization, and workflow-specific detail views."
    />

    <p
      v-if="props.selectedMode === 'weekly-plan' && Array.isArray(props.summary?.planningNotes) && props.summary.planningNotes.length"
      class="helper-text"
    >
      {{ props.summary.planningNotes[0] }}
    </p>

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
        {{ props.currentWorkflow.exportLabel }}
      </AppButton>
      <AppButton
        v-if="props.selectedMode === 'weekly-plan'"
        variant="secondary"
        :disabled="!props.weeklyBreakdownExportReady"
        @click="emit('export-daily-breakdown')"
      >
        Export Weekly Daily Breakdown
      </AppButton>
    </div>
  </section>
</template>
