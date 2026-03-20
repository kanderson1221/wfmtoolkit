<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'
import PlannerCopyMenu from './PlannerCopyMenu.vue'

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

const handleCopyAction = (action) => {
  emit('copy-action', action)
}

const summaryItems = computed(() => [
  {
    label: 'Total Open Days',
    value: props.formatWhole(props.summary.totalOpenDays),
    meta: 'Open business days across the full year after the plan calendar is applied'
  },
  {
    label: 'Avg Absence Loss / Month',
    value: props.formatNumber(props.summary.averageAbsenceLossHours, 1),
    meta: 'Planned time off, unplanned time off, and leave time per agent'
  },
  {
    label: 'Avg Scheduled Loss / Month',
    value: props.formatNumber(props.summary.averageScheduledLossHours, 1),
    meta: 'Meetings, training, and coaching per agent'
  },
  {
    label: 'Avg Other Loss / Month',
    value: props.formatNumber(props.summary.averageOtherLossHours, 1),
    meta: 'Paid breaks and other away time converted into monthly totals and reduced by presence'
  },
  {
    label: 'Average Total Loss / Month',
    value: props.formatNumber(props.summary.averageTotalLossHours, 1),
    meta: 'Combined monthly and daily losses converted into monthly hours'
  },
  {
    label: 'Average Presence',
    value: props.formatPercent(props.summary.averagePresence, 1),
    meta: 'Average monthly presence across the full plan year'
  }
])
</script>

<template>
  <section class="results-panel monthly-tab-panel">
    <AppSectionHeader
      title="Set agent availability month by month"
      description="Use one worksheet to model paid time, absence, off-phone losses, and the final scheduled percentage one FTE can realistically deliver."
    />

    <AppStatStrip :items="summaryItems" columns="md:grid-cols-3 xl:grid-cols-6" />

    <AppWorkspaceSection
      class="monthly-loss-group gap-2.5 p-3"
      title="Agent Availability Worksheet"
      description="Edit one month per row, then copy the selected row when several months share the same assumption set."
    >
      <template #actions>
        <PlannerCopyMenu
          input-id="presence-copy-action"
          :label="selectedMonth.label"
          @select="handleCopyAction"
        />
      </template>

      <div class="assumption-table-shell">
        <table class="assumption-table assumption-table-presence-main">
          <colgroup>
            <col class="presence-col-month" />
            <col class="presence-col-business" />
            <col class="presence-col-adjust" />
            <col class="presence-col-paid" />
            <col class="presence-col-absence" />
            <col class="presence-col-absence" />
            <col class="presence-col-absence" />
            <col class="presence-col-utilization" />
            <col class="presence-col-utilization" />
            <col class="presence-col-utilization" />
            <col class="presence-col-other" />
            <col class="presence-col-other" />
            <col class="presence-col-result-wide" />
            <col class="presence-col-result-wide" />
            <col class="presence-col-result" />
            <col class="presence-col-result" />
            <col class="presence-col-result" />
          </colgroup>
          <thead>
            <tr class="presence-super-row">
              <th rowspan="2" class="presence-sticky-head" title="Planning month. Click a month name to highlight that row.">Month</th>
              <th colspan="3" class="presence-super-head presence-super-calendar" title="Calendar and paid time assumptions used to build the month.">Calendar</th>
              <th colspan="3" class="presence-super-head presence-super-presence" title="Monthly absence hours per agent that reduce presence.">Presence Loss</th>
              <th colspan="5" class="presence-super-head presence-super-utilization" title="Scheduled and daily working-time losses that reduce utilization.">Utilization Loss</th>
              <th colspan="5" class="presence-super-head presence-super-results" title="Calculated monthly paid hours, loss totals, and final availability percentages.">Results</th>
            </tr>
            <tr class="presence-detail-row">
              <th title="Monthly business days after the weekday pattern and any day adjustment are applied.">
                <span class="presence-head-label">Business<br />Days</span>
              </th>
              <th title="Day adjustment from the plan calendar.">Day Adj.</th>
              <th title="Full paid hours for one agent in one business day before paid breaks are removed.">
                <span class="presence-head-label">Daily Paid<br />Hours</span>
              </th>
              <th title="Planned time off hours per agent for the month.">Planned</th>
              <th title="Unplanned absence hours per agent for the month.">Unplanned Off</th>
              <th title="Leave hours per agent for the month.">Leave</th>
              <th title="Meeting hours per agent for the month.">Meetings</th>
              <th title="Training hours per agent for the month.">Training</th>
              <th title="Coaching hours per agent for the month.">Coaching</th>
              <th title="Paid break hours per agent per business day. These daily hours are reduced by presence before they hit utilization.">Breaks</th>
              <th title="Other away time per agent per business day. These daily hours are reduced by presence before they hit utilization.">Away</th>
              <th title="Monthly paid hours for one FTE. Calculated as business days multiplied by daily paid hours.">
                <span class="presence-head-label">FTE Paid<br />Hours</span>
              </th>
              <th title="Combined monthly absence, scheduled, and presence-adjusted daily losses in hours.">Total Loss</th>
              <th title="Share of paid time left after absence loss is removed.">Presence %</th>
              <th title="Share of present time left after scheduled and other utilization loss is removed.">Utilization %</th>
              <th title="Share of total paid time still available for handling after both presence and utilization are applied.">Scheduled %</th>
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
              <td class="presence-calendar-cell">{{ props.formatWhole(record.openDays) }}</td>
              <td class="presence-calendar-cell">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].dayAdjustment"
                  step="1"
                  aria-label="Business day adjustment for the month"
                />
              </td>
              <td class="presence-calendar-cell">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].paidHoursPerDay"
                  min="0"
                  max="24"
                  step="0.25"
                  :max-fraction-digits="2"
                  aria-label="Paid hours per day"
                />
              </td>
              <td class="presence-input-cell presence-input-presence">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].plannedTimeOffHours"
                  min="0"
                  step="0.25"
                  :max-fraction-digits="2"
                  aria-label="Planned time off hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-presence">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].unplannedTimeOffHours"
                  min="0"
                  step="0.25"
                  :max-fraction-digits="2"
                  aria-label="Unplanned time off hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-presence">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].leaveTimeHours"
                  min="0"
                  step="0.25"
                  :max-fraction-digits="2"
                  aria-label="Leave time hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-utilization">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].meetingsHours"
                  min="0"
                  step="0.25"
                  :max-fraction-digits="2"
                  aria-label="Meetings hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-utilization">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].trainingHours"
                  min="0"
                  step="0.25"
                  :max-fraction-digits="2"
                  aria-label="Training hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-utilization">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].coachingHours"
                  min="0"
                  step="0.25"
                  :max-fraction-digits="2"
                  aria-label="Coaching hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-other">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].paidBreaksHoursPerDay"
                  min="0"
                  step="0.05"
                  :max-fraction-digits="2"
                  aria-label="Paid breaks hours per agent per day"
                />
              </td>
              <td class="presence-input-cell presence-input-other">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].otherAwayHoursPerDay"
                  min="0"
                  step="0.05"
                  :max-fraction-digits="2"
                  aria-label="Other away hours per agent per day"
                />
              </td>
              <td class="presence-result-cell">{{ props.formatNumber(record.paidHoursPerMonth, 1) }}</td>
              <td class="presence-result-cell">{{ props.formatNumber(record.totalLossHours, 1) }}</td>
              <td class="presence-result-cell">{{ props.formatPercent(record.presencePercent, 1) }}</td>
              <td class="presence-result-cell">{{ props.formatPercent(record.utilizationPercent, 1) }}</td>
              <td class="presence-result-cell presence-result-final">{{ props.formatPercent(record.scheduledPercent, 1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppWorkspaceSection>

    <div class="monthly-tab-actions">
      <AppButton variant="primary" @click="emit('continue')">Continue to Variability Buffer</AppButton>
    </div>
  </section>
</template>
