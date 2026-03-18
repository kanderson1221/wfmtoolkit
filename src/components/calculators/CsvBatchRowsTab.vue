<script setup>
import AppSectionHeader from '../ui/AppSectionHeader.vue'

const props = defineProps({
  selectedMode: {
    type: String,
    required: true
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
  focusedRowIndex: {
    type: Number,
    default: null
  },
  formatCount: {
    type: Function,
    required: true
  },
  formatDecimal: {
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
  }
})
</script>

<template>
  <section class="results-tab-panel">
    <section
      v-if="props.selectedMode === 'daily-plan' && props.calculatedRows.length"
      class="results-detail"
    >
      <AppSectionHeader title="Interval Demand Rows" />
      <div class="detail-grid" role="table" aria-label="Daily interval demand table">
        <div class="detail-row detail-head detail-row-daily" role="row">
          <span role="columnheader">Queue</span>
          <span role="columnheader">Interval</span>
          <span role="columnheader">Offered Calls</span>
          <span role="columnheader">AHT</span>
          <span role="columnheader">Required Agents</span>
          <span role="columnheader">Required Headcount</span>
          <span role="columnheader">Service Level</span>
          <span role="columnheader">ASA</span>
          <span role="columnheader">Expected Occupancy</span>
        </div>
        <div
          v-for="(row, index) in props.calculatedRows"
          :id="`batch-row-${row.rowIndex ?? index + 1}`"
          :key="`daily-plan-row-${index}`"
          :class="[
            'detail-row',
            'detail-row-daily',
            { focused: props.focusedRowIndex === (row.rowIndex ?? index + 1) }
          ]"
          role="row"
        >
          <span role="cell">{{ row.queueId }}</span>
          <span role="cell">{{ row.intervalStart }}</span>
          <span role="cell">{{ props.formatCount(row.callsOffered) }}</span>
          <span role="cell">{{ props.formatDecimal(row.ahtSeconds, 1) }}</span>
          <span role="cell">{{ props.formatCount(row.requiredAgents) }}</span>
          <span role="cell">{{ props.formatCount(row.requiredHeadcount) }}</span>
          <span role="cell">{{ props.formatPercent(row.serviceLevel) }}</span>
          <span role="cell">{{ props.formatAsaSeconds(row.asaSeconds) }}</span>
          <span role="cell">{{ props.formatPercent(row.expectedOccupancy) }}</span>
        </div>
      </div>
    </section>

    <section
      v-if="props.selectedMode === 'weekly-plan' && props.results.length"
      class="results-detail"
    >
      <AppSectionHeader title="Weekly Day Summary" />
      <div class="detail-grid" role="table" aria-label="Weekly day-level summary table">
        <div class="detail-row detail-head detail-row-weekly" role="row">
          <span role="columnheader">Service Date</span>
          <span role="columnheader">Required Agent Hours</span>
          <span role="columnheader">Required Headcount Hours</span>
          <span role="columnheader">Peak Required Agents</span>
          <span role="columnheader">Peak Required Headcount</span>
          <span role="columnheader">Recommended Daily FTE</span>
        </div>
        <div
          v-for="row in props.results"
          :key="`weekly-row-${row.serviceDate}`"
          class="detail-row detail-row-weekly"
          role="row"
        >
          <span role="cell">{{ row.serviceDate }}</span>
          <span role="cell">{{ props.formatDecimal(row.requiredAgentHours) }}</span>
          <span role="cell">{{ props.formatDecimal(row.requiredHeadcountHours) }}</span>
          <span role="cell">{{ props.formatCount(row.peakRequiredAgents) }}</span>
          <span role="cell">{{ props.formatCount(row.peakRequiredHeadcount) }}</span>
          <span role="cell">{{ props.formatCount(row.recommendedDailyFte) }}</span>
        </div>
      </div>
    </section>

    <section
      v-if="props.selectedMode === 'weekly-plan' && props.dailyBreakdown.length"
      class="results-detail"
    >
      <AppSectionHeader title="Weekly Interval Breakdown" />
      <div class="detail-grid" role="table" aria-label="Weekly interval breakdown table">
        <div class="detail-row detail-head detail-row-daily" role="row">
          <span role="columnheader">Queue</span>
          <span role="columnheader">Interval</span>
          <span role="columnheader">Offered Calls</span>
          <span role="columnheader">AHT</span>
          <span role="columnheader">Required Agents</span>
          <span role="columnheader">Required Headcount</span>
          <span role="columnheader">Service Level</span>
          <span role="columnheader">ASA</span>
          <span role="columnheader">Expected Occupancy</span>
        </div>
        <div
          v-for="(row, index) in props.dailyBreakdown"
          :id="`batch-row-${row.rowIndex}`"
          :key="`breakdown-row-${index}`"
          :class="['detail-row', 'detail-row-daily', { focused: props.focusedRowIndex === row.rowIndex }]"
          role="row"
        >
          <span role="cell">{{ row.queueId }}</span>
          <span role="cell">{{ row.intervalStart }}</span>
          <span role="cell">{{ props.formatCount(row.callsOffered) }}</span>
          <span role="cell">{{ props.formatDecimal(row.ahtSeconds, 1) }}</span>
          <span role="cell">{{ props.formatCount(row.requiredAgents) }}</span>
          <span role="cell">{{ props.formatCount(row.requiredHeadcount) }}</span>
          <span role="cell">{{ props.formatPercent(row.serviceLevel) }}</span>
          <span role="cell">{{ props.formatAsaSeconds(row.asaSeconds) }}</span>
          <span role="cell">{{ props.formatPercent(row.expectedOccupancy) }}</span>
        </div>
      </div>
    </section>
  </section>
</template>
