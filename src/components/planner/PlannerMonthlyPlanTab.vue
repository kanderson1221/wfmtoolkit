<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'

const props = defineProps({
  monthlyRecords: {
    type: Array,
    required: true
  },
  planSummary: {
    type: Object,
    default: null
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
  },
  formatFactor: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['previous', 'save'])

const planMonths = defineModel('planMonths', {
  type: Array,
  default: null
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const selectedMonth = computed(
  () => props.monthlyRecords[selectedMonthIndex.value] ?? props.monthlyRecords[0] ?? { planWarnings: [], label: 'month' }
)

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}
</script>

<template>
  <section class="results-panel monthly-tab-panel">
    <header class="monthly-tab-header">
      <div>
        <h3>Build the monthly headcount requirement from demand</h3>
      </div>
    </header>

    <div class="results-metrics monthly-summary-grid">
      <article class="metric-card">
        <p class="metric-label">Annual Contacts</p>
        <p class="metric-value">{{ props.formatWhole(props.planSummary?.annualContacts) }}</p>
        <p class="metric-meta">Sum of all monthly demand entered in the demand model</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Annual Workload Hours</p>
        <p class="metric-value">{{ props.formatWhole(props.planSummary?.annualWorkloadHours) }}</p>
        <p class="metric-meta">{{ (props.planSummary?.busiestMonth?.fullLabel || 'The busiest month') + ' is the busiest workload month' }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Avg Required Staff Hours</p>
        <p class="metric-value">{{ props.formatNumber(props.planSummary?.averageRequiredStaffHours, 1) }}</p>
        <p class="metric-meta">Average staffing hours required after design factor is applied</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Avg Required Headcount</p>
        <p class="metric-value">{{ props.formatNumber(props.planSummary?.averageRequiredHeadcount, 1) }}</p>
        <p class="metric-meta">Average monthly required headcount before rounding</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Peak Required Headcount</p>
        <p class="metric-value">{{ props.formatNumber(props.planSummary?.peakMonth?.requiredHeadcount, 1) }}</p>
        <p class="metric-meta">{{ props.planSummary?.peakMonth?.fullLabel }}</p>
      </article>
    </div>

    <div class="assumption-table-shell">
      <table class="assumption-table assumption-table-plan">
        <thead>
          <tr>
            <th title="Planning month. Click a month name to highlight that row.">Month</th>
            <th title="Monthly contact demand used to create workload hours.">Contacts</th>
            <th title="Average handle time in seconds used to create workload hours.">AHT Sec</th>
            <th title="Business days flowing in from the presence / utilization step after weekday pattern and day adjustments.">Business Days</th>
            <th title="Scheduled percentage flowing in from the presence / utilization step.">Scheduled %</th>
            <th title="Total scheduled random loss flowing in from the random step.">
              <span class="plan-head-label">Total Random<br />Loss %</span>
            </th>
            <th title="Design Factor is calculated as Scheduled % - Total Random Loss %.">Design Factor</th>
            <th title="Workload Staffing Ratio is calculated as 1 / Design Factor.">
              <span class="plan-head-label">Workload<br />Staffing Ratio</span>
            </th>
            <th title="Monthly workload hours calculated from contacts and AHT.">Workload Hours</th>
            <th title="Required staff hours calculated as Workload Hours x Workload Staffing Ratio.">
              <span class="plan-head-label">Required Staff<br />Hours</span>
            </th>
            <th title="Required headcount calculated as Required Staff Hours / Monthly FTE Paid Hours from the presence / utilization step.">
              <span class="plan-head-label">Required<br />Headcount</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="record in props.monthlyRecords"
            :key="record.label"
            :class="{ selected: selectedMonthIndex === record.monthIndex }"
          >
            <td class="month-cell">
              <button
                type="button"
                class="assumption-month-btn"
                @click="setSelectedMonth(record.monthIndex)"
              >
                {{ record.fullLabel }}
              </button>
            </td>
            <td>
              <input
                v-model.number="planMonths[record.monthIndex].contacts"
                type="number"
                min="0"
                step="100"
                aria-label="Contacts"
              />
            </td>
            <td>
              <input
                v-model.number="planMonths[record.monthIndex].ahtSeconds"
                type="number"
                min="0"
                step="1"
                aria-label="Average handle time in seconds"
              />
            </td>
            <td>{{ props.formatWhole(record.openDays) }}</td>
            <td>{{ props.formatPercent(record.scheduledPercent, 1) }}</td>
            <td>{{ props.formatPercent(record.randomLossPercent, 1) }}</td>
            <td>{{ props.formatPercent(record.designFactorPercent, 1) }}</td>
            <td>{{ props.formatFactor(record.workloadStaffingRatio) }}</td>
            <td>{{ props.formatNumber(record.workloadHours, 1) }}</td>
            <td>{{ props.formatNumber(record.requiredStaffHours, 1) }}</td>
            <td>{{ props.formatNumber(record.requiredHeadcount, 1) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selectedMonth.planWarnings?.length" class="monthly-warning-stack">
      <p
        v-for="warning in selectedMonth.planWarnings"
        :key="warning"
        class="status-message error"
      >
        {{ warning }}
      </p>
    </div>

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

    <div class="monthly-tab-actions">
      <AppButton variant="secondary" @click="emit('previous')">Back to Random</AppButton>
      <AppButton variant="primary" @click="emit('save')">Save Staffing Group</AppButton>
    </div>
  </section>
</template>
