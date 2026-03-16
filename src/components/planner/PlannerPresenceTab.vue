<script setup>
import { computed } from 'vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'plan'
  },
  monthlyRecords: {
    type: Array,
    required: true
  },
  actualRecords: {
    type: Array,
    default: () => []
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

const actualMonths = defineModel('actualMonths', {
  type: Array,
  default: null
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const isActualMode = computed(() => props.mode === 'actuals')

const rows = computed(() => (isActualMode.value ? props.actualRecords : props.monthlyRecords))

const selectedMonth = computed(
  () => rows.value[selectedMonthIndex.value] ?? rows.value[0] ?? { label: 'month' }
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
        <h3>{{ isActualMode ? 'Track actual presence / utilization month by month' : 'Build presence / utilization month by month' }}</h3>
      </div>
      <p v-if="isActualMode">
        Business days and paid hours stay anchored to the plan. Enter actual absence, scheduled, and daily away-time losses to derive actual presence, utilization, and scheduled %.
      </p>
    </header>

    <div class="results-metrics monthly-summary-grid">
      <article class="metric-card">
        <p class="metric-label">Total Open Days</p>
        <p class="metric-value">{{ props.formatWhole(props.summary.totalOpenDays) }}</p>
        <p class="metric-meta">Open business days across the full year after the plan calendar is applied</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Avg Actual Absence Loss / Month' : 'Avg Absence Loss / Month' }}</p>
        <p class="metric-value">{{ props.formatNumber(props.summary.averageAbsenceLossHours, 1) }}</p>
        <p class="metric-meta">{{ isActualMode ? 'Actual time off and leave hours per agent' : 'Planned time off, unplanned time off, and leave time per agent' }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Avg Actual Scheduled Loss / Month' : 'Avg Scheduled Loss / Month' }}</p>
        <p class="metric-value">{{ props.formatNumber(props.summary.averageScheduledLossHours, 1) }}</p>
        <p class="metric-meta">{{ isActualMode ? 'Actual meetings, training, and coaching per agent' : 'Meetings, training, and coaching per agent' }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Avg Actual Other Loss / Month' : 'Avg Other Loss / Month' }}</p>
        <p class="metric-value">{{ props.formatNumber(props.summary.averageOtherLossHours, 1) }}</p>
        <p class="metric-meta">Paid breaks and other away time converted into monthly totals and reduced by presence</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Avg Actual Total Loss / Month' : 'Average Total Loss / Month' }}</p>
        <p class="metric-value">{{ props.formatNumber(props.summary.averageTotalLossHours, 1) }}</p>
        <p class="metric-meta">Combined monthly and daily losses converted into monthly hours</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Average Actual Presence' : 'Average Presence' }}</p>
        <p class="metric-value">{{ props.formatPercent(props.summary.averagePresence, 1) }}</p>
        <p class="metric-meta">{{ isActualMode ? 'Average actual monthly presence across the year' : 'Average monthly presence across the full plan year' }}</p>
      </article>
    </div>

    <section class="input-group-card monthly-loss-group">
      <div class="workspace-output-header">
        <h3>{{ isActualMode ? 'Monthly Actual Presence / Utilization' : 'Monthly Presence / Utilization Inputs' }}</h3>
        <p>
          {{
            isActualMode
              ? 'Enter actual driver hours using the same worksheet shape as the plan. The planner derives actual presence, utilization, and scheduled %.'
              : 'Use one table to build absence-based presence, scheduled-time utilization, and final scheduled %.'
          }}
        </p>
      </div>
      <div v-if="!isActualMode" class="monthly-copy-toolbar">
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
              <th rowspan="3" class="presence-sticky-head" title="Day adjustment from the plan calendar.">
                Day Adj.
              </th>
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
              <th colspan="3" class="presence-group-head presence-group-absence" :title="isActualMode ? 'Actual monthly absence hours per agent.' : 'Monthly absence hours per agent that reduce presence.'">
                Absence (Hours / Month)
              </th>
              <th colspan="3" class="presence-group-head presence-group-scheduled" :title="isActualMode ? 'Actual monthly scheduled hours per agent.' : 'Monthly scheduled hours per agent that reduce utilization.'">
                Scheduled (Hours / Month)
              </th>
              <th colspan="2" class="presence-group-head presence-group-other" :title="isActualMode ? 'Actual daily paid-away hours per agent.' : 'Daily paid-away hours per agent that reduce utilization after presence is applied.'">
                Other (Hours / Day)
              </th>
            </tr>
            <tr class="presence-detail-row">
              <th :title="isActualMode ? 'Actual planned time off hours per agent for the month.' : 'Planned time off hours per agent for the month.'">Planned</th>
              <th :title="isActualMode ? 'Actual unplanned absence hours per agent for the month.' : 'Unplanned absence hours per agent for the month.'">Unplanned Off</th>
              <th :title="isActualMode ? 'Actual leave hours per agent for the month.' : 'Leave hours per agent for the month.'">Leave</th>
              <th :title="isActualMode ? 'Actual meeting hours per agent for the month.' : 'Meeting hours per agent for the month.'">Meetings</th>
              <th :title="isActualMode ? 'Actual training hours per agent for the month.' : 'Training hours per agent for the month.'">Training</th>
              <th :title="isActualMode ? 'Actual coaching hours per agent for the month.' : 'Coaching hours per agent for the month.'">Coaching</th>
              <th :title="isActualMode ? 'Actual paid break hours per agent per business day.' : 'Paid break hours per agent per business day. These daily hours are reduced by presence before they hit utilization.'">Breaks</th>
              <th :title="isActualMode ? 'Actual other away time per agent per business day.' : 'Other away time per agent per business day. These daily hours are reduced by presence before they hit utilization.'">Away</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in rows"
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
              <td>{{ props.formatWhole(isActualMode ? record.planned.openDays : record.openDays) }}</td>
              <td>
                <template v-if="isActualMode">{{ props.formatWhole(record.planned.dayAdjustment) }}</template>
                <input
                  v-else
                  v-model.number="presenceMonths[record.monthIndex].dayAdjustment"
                  type="number"
                  step="1"
                  aria-label="Business day adjustment for the month"
                />
              </td>
              <td>
                <template v-if="isActualMode">{{ props.formatNumber(record.actualPaidHoursPerDay, 2) }}</template>
                <input
                  v-else
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
                  v-if="isActualMode"
                  v-model.number="actualMonths[record.monthIndex].actualPlannedTimeOffHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Actual planned time off hours per agent per month"
                />
                <input
                  v-else
                  v-model.number="presenceMonths[record.monthIndex].plannedTimeOffHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Planned time off hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-if="isActualMode"
                  v-model.number="actualMonths[record.monthIndex].actualUnplannedTimeOffHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Actual unplanned time off hours per agent per month"
                />
                <input
                  v-else
                  v-model.number="presenceMonths[record.monthIndex].unplannedTimeOffHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Unplanned time off hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-if="isActualMode"
                  v-model.number="actualMonths[record.monthIndex].actualLeaveTimeHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Actual leave time hours per agent per month"
                />
                <input
                  v-else
                  v-model.number="presenceMonths[record.monthIndex].leaveTimeHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Leave time hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-if="isActualMode"
                  v-model.number="actualMonths[record.monthIndex].actualMeetingsHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Actual meetings hours per agent per month"
                />
                <input
                  v-else
                  v-model.number="presenceMonths[record.monthIndex].meetingsHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Meetings hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-if="isActualMode"
                  v-model.number="actualMonths[record.monthIndex].actualTrainingHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Actual training hours per agent per month"
                />
                <input
                  v-else
                  v-model.number="presenceMonths[record.monthIndex].trainingHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Training hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-if="isActualMode"
                  v-model.number="actualMonths[record.monthIndex].actualCoachingHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Actual coaching hours per agent per month"
                />
                <input
                  v-else
                  v-model.number="presenceMonths[record.monthIndex].coachingHours"
                  type="number"
                  min="0"
                  step="0.25"
                  aria-label="Coaching hours per agent per month"
                />
              </td>
              <td>
                <input
                  v-if="isActualMode"
                  v-model.number="actualMonths[record.monthIndex].actualPaidBreaksHoursPerDay"
                  type="number"
                  min="0"
                  step="0.05"
                  aria-label="Actual paid breaks hours per agent per day"
                />
                <input
                  v-else
                  v-model.number="presenceMonths[record.monthIndex].paidBreaksHoursPerDay"
                  type="number"
                  min="0"
                  step="0.05"
                  aria-label="Paid breaks hours per agent per day"
                />
              </td>
              <td>
                <input
                  v-if="isActualMode"
                  v-model.number="actualMonths[record.monthIndex].actualOtherAwayHoursPerDay"
                  type="number"
                  min="0"
                  step="0.05"
                  aria-label="Actual other away hours per agent per day"
                />
                <input
                  v-else
                  v-model.number="presenceMonths[record.monthIndex].otherAwayHoursPerDay"
                  type="number"
                  min="0"
                  step="0.05"
                  aria-label="Other away hours per agent per day"
                />
              </td>
              <td>{{ props.formatNumber(isActualMode ? record.actualPaidHours : record.paidHoursPerMonth, 1) }}</td>
              <td>{{ props.formatNumber(isActualMode ? record.actualAbsenceLossHours + record.actualScheduledLossHours + record.actualOtherLossHours : record.totalLossHours, 1) }}</td>
              <td>{{ props.formatPercent(isActualMode ? record.actualPresencePercent : record.presencePercent, 1) }}</td>
              <td>{{ props.formatPercent(isActualMode ? record.actualUtilizationPercent : record.utilizationPercent, 1) }}</td>
              <td>{{ props.formatPercent(isActualMode ? record.actualScheduledPercent : record.scheduledPercent, 1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isActualMode && selectedMonth.warnings?.length" class="monthly-warning-stack">
      <p v-for="warning in selectedMonth.warnings" :key="warning" class="status-message error">
        {{ warning }}
      </p>
    </div>

    <div class="monthly-tab-actions">
      <button type="button" class="submit-btn" @click="emit('continue')">Continue to Random</button>
    </div>
  </section>
</template>
