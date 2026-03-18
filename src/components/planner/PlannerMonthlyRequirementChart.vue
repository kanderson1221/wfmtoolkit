<script setup>
const props = defineProps({
  monthlyRecords: {
    type: Array,
    required: true
  },
  monthlyChartMax: {
    type: Number,
    required: true
  },
  formatWhole: {
    type: Function,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  },
  formatPercent: {
    type: Function,
    required: true
  }
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}
</script>

<template>
  <section class="monthly-chart-panel">
    <div class="workspace-output-header">
      <h3>Monthly Required Staffing</h3>
      <p>Required staff hours by month after the design factor is applied.</p>
    </div>
    <div class="monthly-bars">
      <button
        v-for="record in props.monthlyRecords"
        :key="record.label"
        type="button"
        class="monthly-bar-column"
        :class="{ active: selectedMonthIndex === record.monthIndex }"
        @click="setSelectedMonth(record.monthIndex)"
      >
        <small class="monthly-bar-month">{{ record.label }}</small>
        <div class="monthly-bar-cap">
          <strong>{{ props.formatWhole(record.roundedHeadcount) }}</strong>
          <span>HC</span>
        </div>
        <div class="monthly-bar-stack">
          <div class="monthly-bar-track">
            <div
              class="monthly-bar-segment monthly-bar-final"
              :style="{
                height: `${Math.max(((record.requiredStaffHours || 0) / props.monthlyChartMax) * 100, (record.requiredStaffHours || 0) > 0 ? 6 : 0)}%`
              }"
            ></div>
          </div>
        </div>
        <div class="monthly-bar-footer">
          <strong>{{ props.formatWhole(record.requiredStaffHours) }}</strong>
          <span>hours</span>
        </div>
        <div class="monthly-bar-tooltip">
          <p class="monthly-bar-tooltip-title">{{ record.fullLabel }}</p>
          <div class="monthly-bar-tooltip-grid">
            <span>Workload Hours</span>
            <strong>{{ props.formatNumber(record.workloadHours, 1) }}</strong>
            <span>Required Staff Hrs</span>
            <strong>{{ props.formatNumber(record.requiredStaffHours, 1) }}</strong>
            <span>Required HC</span>
            <strong>{{ props.formatNumber(record.requiredHeadcount, 1) }}</strong>
            <span>Total Random Loss</span>
            <strong>{{ props.formatPercent(record.randomLossPercent, 1) }}</strong>
            <span>Design Factor</span>
            <strong>{{ props.formatPercent(record.designFactorPercent, 1) }}</strong>
          </div>
        </div>
      </button>
    </div>
  </section>
</template>
