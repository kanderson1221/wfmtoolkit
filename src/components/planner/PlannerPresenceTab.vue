<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'

const props = defineProps({
  monthlyRecords: {
    type: Array,
    required: true
  },
  summary: {
    type: Object,
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

const emit = defineEmits(['copy-action', 'continue'])

const presenceMonths = defineModel('presenceMonths', {
  type: Array,
  default: null
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const selectedMonth = computed(
  () => props.monthlyRecords[selectedMonthIndex.value] ?? props.monthlyRecords[0] ?? { label: 'month' }
)

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}

const handleCopyAction = (event) => {
  const action = event.target.value
  if (!action) return

  emit('copy-action', action)
  event.target.value = ''
}
</script>

<template>
  <section class="results-panel monthly-tab-panel">
    <header class="monthly-tab-header">
      <div>
        <h3>Build presence / utilization month by month</h3>
      </div>
    </header>

    <div class="results-metrics monthly-summary-grid">
      <article class="metric-card">
        <p class="metric-label">Total Open Days</p>
        <p class="metric-value">{{ props.formatWhole(props.summary.totalOpenDays) }}</p>
        <p class="metric-meta">Open business days across the full year after the plan calendar is applied</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Avg Absence Loss / Month</p>
        <p class="metric-value">{{ props.formatNumber(props.summary.averageAbsenceLossHours, 1) }}</p>
        <p class="metric-meta">Planned time off, unplanned time off, and leave time per agent</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Avg Scheduled Loss / Month</p>
        <p class="metric-value">{{ props.formatNumber(props.summary.averageScheduledLossHours, 1) }}</p>
        <p class="metric-meta">Meetings, training, and coaching per agent</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Avg Other Loss / Month</p>
        <p class="metric-value">{{ props.formatNumber(props.summary.averageOtherLossHours, 1) }}</p>
        <p class="metric-meta">Paid breaks and other away time converted into monthly totals and reduced by presence</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Average Total Loss / Month</p>
        <p class="metric-value">{{ props.formatNumber(props.summary.averageTotalLossHours, 1) }}</p>
        <p class="metric-meta">Combined monthly and daily losses converted into monthly hours</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Average Presence</p>
        <p class="metric-value">{{ props.formatPercent(props.summary.averagePresence, 1) }}</p>
        <p class="metric-meta">Average monthly presence across the full plan year</p>
      </article>
    </div>

    <section class="input-group-card monthly-loss-group">
      <div class="workspace-output-header">
        <h3>Monthly Presence / Utilization Inputs</h3>
        <p>Use one table to build absence-based presence, scheduled-time utilization, and final scheduled %.</p>
      </div>

      <div class="monthly-copy-toolbar">
        <label class="monthly-copy-select" for="presence-copy-action">
          <span class="monthly-copy-label">Copy {{ selectedMonth.label }}</span>
          <select
            id="presence-copy-action"
            class="monthly-copy-select-input"
            @change="handleCopyAction"
          >
            <option value="">Choose action</option>
            <option value="all">To all months</option>
            <option value="forward">Forward</option>
            <option value="quarter">Through quarter</option>
          </select>
        </label>
      </div>

      <div class="assumption-table-shell">
        <table class="assumption-table assumption-table-presence-main">
          <thead>
            <tr class="presence-super-row">
              <th rowspan="3" class="presence-sticky-head" title="Planning month. Click a month name to highlight that row.">Month</th>
              <th rowspan="3" class="presence-sticky-head" title="Monthly business days after the weekday pattern and any day adjustment are applied.">
                <span class="presence-head-label">Business<br />Days</span>
              </th>
              <th rowspan="3" class="presence-sticky-head" title="Day adjustment from the plan calendar.">Day Adj.</th>
              <th rowspan="3" class="presence-sticky-head presence-paid-head" title="Full paid hours for one agent in one business day before paid breaks are removed.">
                <span class="presence-head-label">Daily Paid<br />Hours</span>
              </th>
              <th colspan="3" class="presence-super-head presence-super-presence" title="Absence-driven losses that determine how much paid time remains available to work.">Presence</th>
              <th colspan="5" class="presence-super-head presence-super-utilization" title="Scheduled and daily working-time losses that determine how much present time remains usable.">Utilization</th>
              <th rowspan="3" class="presence-sticky-head presence-month-hours-head" title="Monthly paid hours for one FTE. Calculated as business days multiplied by daily paid hours.">
                <span class="presence-head-label">FTE Paid<br />Hours</span>
              </th>
              <th rowspan="3" class="presence-sticky-head" title="Combined monthly absence, scheduled, and presence-adjusted daily losses in hours.">Total Loss</th>
              <th rowspan="3" class="presence-sticky-head" title="Share of paid time left after absence loss is removed.">Presence %</th>
              <th rowspan="3" class="presence-sticky-head" title="Share of present time left after scheduled and other utilization loss is removed.">Utilization %</th>
              <th rowspan="3" class="presence-sticky-head" title="Share of total paid time still available for handling after both presence and utilization are applied.">Scheduled %</th>
            </tr>
            <tr class="presence-group-row">
              <th colspan="3" class="presence-group-head presence-group-absence" title="Monthly absence hours per agent that reduce presence.">
                Absence (Hours / Month)
              </th>
              <th colspan="3" class="presence-group-head presence-group-scheduled" title="Monthly scheduled hours per agent that reduce utilization.">
                Scheduled (Hours / Month)
              </th>
              <th colspan="2" class="presence-group-head presence-group-other" title="Daily paid-away hours per agent that reduce utilization after presence is applied.">
                Other (Hours / Day)
              </th>
            </tr>
            <tr class="presence-detail-row">
              <th title="Planned time off hours per agent for the month.">Planned</th>
              <th title="Unplanned absence hours per agent for the month.">Unplanned Off</th>
              <th title="Leave hours per agent for the month.">Leave</th>
              <th title="Meeting hours per agent for the month.">Meetings</th>
              <th title="Training hours per agent for the month.">Training</th>
              <th title="Coaching hours per agent for the month.">Coaching</th>
              <th title="Paid break hours per agent per business day. These daily hours are reduced by presence before they hit utilization.">Breaks</th>
              <th title="Other away time per agent per business day. These daily hours are reduced by presence before they hit utilization.">Away</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in props.monthlyRecords"
              :key="`presence-main-${record.label}`"
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
              <td>{{ props.formatWhole(record.openDays) }}</td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].dayAdjustment"
                  type="number"
                  step="1"
                  aria-label="Business day adjustment for the month"
                />
              </td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].paidHoursPerDay"
                  type="number"
                  min="0"
                  max="24"
                  step="0.25"
                  aria-label="Paid hours per day"
                />
              </td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].plannedTimeOffHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Planned time off hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].unplannedTimeOffHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Unplanned time off hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].leaveTimeHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Leave time hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].meetingsHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Meetings hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].trainingHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Training hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].coachingHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Coaching hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].paidBreaksHoursPerDay"
                  type="number"
                  min="0"
                  step="0.05"
                  aria-label="Paid breaks hours per agent per day"
                />
              </td>
              <td>
                <input
                  v-model.number="presenceMonths[record.monthIndex].otherAwayHoursPerDay"
                  type="number"
                  min="0"
                  step="0.05"
                  aria-label="Other away hours per agent per day"
                />
              </td>
              <td>{{ props.formatNumber(record.paidHoursPerMonth, 1) }}</td>
              <td>{{ props.formatNumber(record.totalLossHours, 1) }}</td>
              <td>{{ props.formatPercent(record.presencePercent, 1) }}</td>
              <td>{{ props.formatPercent(record.utilizationPercent, 1) }}</td>
              <td>{{ props.formatPercent(record.scheduledPercent, 1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="monthly-tab-actions">
      <AppButton variant="primary" @click="emit('continue')">Continue to Random</AppButton>
    </div>
  </section>
</template>
