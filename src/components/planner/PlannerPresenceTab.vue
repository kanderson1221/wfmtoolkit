<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
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
  continueLabel: {
    type: String,
    default: 'Continue to Random/Variability'
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

const handleCopyAction = (monthIndex, action) => {
  emit('copy-action', {
    monthIndex,
    action
  })
}

const summaryItems = computed(() => [
  {
    label: 'Total Open Days',
    value: props.formatWhole(props.summary.totalOpenDays)
  },
  {
    label: 'Avg Absence Loss / Month',
    value: props.formatNumber(props.summary.averageAbsenceLossHours, 1)
  },
  {
    label: 'Avg Scheduled Loss / Month',
    value: props.formatNumber(props.summary.averageScheduledLossHours, 1)
  },
  {
    label: 'Avg Other Loss / Month',
    value: props.formatNumber(props.summary.averageOtherLossHours, 1)
  },
  {
    label: 'Average Total Loss / Month',
    value: props.formatNumber(props.summary.averageTotalLossHours, 1)
  },
  {
    label: 'Average Presence',
    value: props.formatPercent(props.summary.averagePresence, 1)
  }
])
</script>

<template>
  <section class="monthly-tab-panel">
    <AppSectionHeader title="Agent Availability Assumptions" />

    <AppStatStrip :items="summaryItems" columns="md:grid-cols-3 xl:grid-cols-6" />

    <section class="grid gap-2.5">
      <div class="assumption-table-shell">
        <table class="assumption-table assumption-table-presence-main">
          <colgroup>
            <col class="presence-col-month" />
            <col class="presence-col-business" />
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
              <th rowspan="2" class="presence-sticky-head" title="Planning month for the worksheet row.">Month</th>
              <th colspan="2" class="presence-super-head presence-super-calendar" title="Business days and paid time assumptions used to build the month.">Calendar</th>
              <th colspan="3" class="presence-super-head presence-super-presence" title="Monthly absence hours per agent that reduce presence.">Presence Loss</th>
              <th colspan="5" class="presence-super-head presence-super-utilization" title="Scheduled and daily working-time losses that reduce utilization.">Utilization Loss</th>
              <th colspan="5" class="presence-super-head presence-super-results" title="Calculated monthly paid hours, loss totals, and final availability percentages.">Results</th>
            </tr>
            <tr class="presence-detail-row">
              <th class="presence-detail-head presence-detail-calendar" title="Monthly business days after the call-center operating days and holiday closures are applied.">
                <span class="presence-head-label">Business<br />Days</span>
              </th>
              <th class="presence-detail-head presence-detail-calendar" title="Full paid hours for one agent in one business day before paid breaks are removed.">
                <span class="presence-head-label">Daily Paid<br />Hours</span>
              </th>
              <th class="presence-detail-head presence-detail-presence" title="Planned time off hours per agent for the month.">
                <span class="presence-head-label">
                  <span>Planned Off</span>
                  <span class="presence-head-unit">hrs/mo</span>
                </span>
              </th>
              <th class="presence-detail-head presence-detail-presence" title="Unplanned absence hours per agent for the month.">
                <span class="presence-head-label">
                  <span>Unplanned</span>
                  <span class="presence-head-unit">hrs/mo</span>
                </span>
              </th>
              <th class="presence-detail-head presence-detail-presence" title="Leave hours per agent for the month.">
                <span class="presence-head-label">
                  <span>Leave</span>
                  <span class="presence-head-unit">hrs/mo</span>
                </span>
              </th>
              <th class="presence-detail-head presence-detail-utilization" title="Meeting hours per agent for the month.">
                <span class="presence-head-label">
                  <span>Meetings</span>
                  <span class="presence-head-unit">hrs/mo</span>
                </span>
              </th>
              <th class="presence-detail-head presence-detail-utilization" title="Training hours per agent for the month.">
                <span class="presence-head-label">
                  <span>Training</span>
                  <span class="presence-head-unit">hrs/mo</span>
                </span>
              </th>
              <th class="presence-detail-head presence-detail-utilization" title="Coaching hours per agent for the month.">
                <span class="presence-head-label">
                  <span>Coaching</span>
                  <span class="presence-head-unit">hrs/mo</span>
                </span>
              </th>
              <th class="presence-detail-head presence-detail-utilization" title="Paid break hours per agent per business day. These daily hours are reduced by presence before they hit utilization.">
                <span class="presence-head-label">
                  <span>Breaks</span>
                  <span class="presence-head-unit">hrs/day</span>
                </span>
              </th>
              <th class="presence-detail-head presence-detail-utilization" title="Other away time per agent per business day. These daily hours are reduced by presence before they hit utilization.">
                <span class="presence-head-label">
                  <span>Away</span>
                  <span class="presence-head-unit">hrs/day</span>
                </span>
              </th>
              <th class="presence-detail-head presence-detail-results" title="Monthly paid hours for one FTE. Calculated as business days multiplied by daily paid hours.">
                <span class="presence-head-label">FTE Paid<br />Hours</span>
              </th>
              <th class="presence-detail-head presence-detail-results" title="Combined monthly absence, scheduled, and presence-adjusted daily losses in hours.">Total Loss</th>
              <th class="presence-detail-head presence-detail-results" title="Share of paid time left after absence loss is removed.">Presence %</th>
              <th class="presence-detail-head presence-detail-results" title="Share of present time left after scheduled and other utilization loss is removed.">Utilization %</th>
              <th class="presence-detail-head presence-detail-results" title="Share of total paid time still available for handling after both presence and utilization are applied.">Scheduled %</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in props.monthlyRecords"
              :key="`presence-main-${record.label}`"
            >
              <td class="month-cell">
                <div class="presence-month-row">
                  <span class="presence-month-label">
                    {{ record.fullLabel }}
                  </span>
                  <div class="presence-month-actions" @click.stop @keydown.stop>
                    <PlannerCopyMenu
                      :month-label="record.fullLabel"
                      @select="handleCopyAction(record.monthIndex, $event)"
                    />
                  </div>
                </div>
              </td>
              <td class="presence-calendar-cell">
                {{ Number.isInteger(record.openDays) ? props.formatWhole(record.openDays) : props.formatNumber(record.openDays, 2) }}
              </td>
              <td class="presence-calendar-cell presence-input-cell presence-input-calendar">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].paidHoursPerDay"
                  :min="0"
                  :max="24"
                  :step="0.01"
                  :min-fraction-digits="1"
                  :max-fraction-digits="2"
                  aria-label="Paid hours per day"
                />
              </td>
              <td class="presence-input-cell presence-input-presence">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].plannedTimeOffHours"
                  :min="0"
                  :step="0.01"
                  :min-fraction-digits="1"
                  :max-fraction-digits="2"
                  aria-label="Planned time off hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-presence">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].unplannedTimeOffHours"
                  :min="0"
                  :step="0.01"
                  :min-fraction-digits="1"
                  :max-fraction-digits="2"
                  aria-label="Unplanned time off hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-presence">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].leaveTimeHours"
                  :min="0"
                  :step="0.01"
                  :min-fraction-digits="1"
                  :max-fraction-digits="2"
                  aria-label="Leave time hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-utilization">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].meetingsHours"
                  :min="0"
                  :step="0.01"
                  :min-fraction-digits="1"
                  :max-fraction-digits="2"
                  aria-label="Meetings hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-utilization">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].trainingHours"
                  :min="0"
                  :step="0.01"
                  :min-fraction-digits="1"
                  :max-fraction-digits="2"
                  aria-label="Training hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-utilization">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].coachingHours"
                  :min="0"
                  :step="0.01"
                  :min-fraction-digits="1"
                  :max-fraction-digits="2"
                  aria-label="Coaching hours per agent per month"
                />
              </td>
              <td class="presence-input-cell presence-input-other">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].paidBreaksHoursPerDay"
                  :min="0"
                  :step="0.01"
                  :min-fraction-digits="1"
                  :max-fraction-digits="2"
                  aria-label="Paid breaks hours per agent per day"
                />
              </td>
              <td class="presence-input-cell presence-input-other">
                <AppTableNumberField
                  v-model.number="presenceMonths[record.monthIndex].otherAwayHoursPerDay"
                  :min="0"
                  :step="0.01"
                  :min-fraction-digits="1"
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
    </section>

    <div class="monthly-tab-actions">
      <AppButton variant="primary" @click="emit('continue')">{{ props.continueLabel }}</AppButton>
    </div>
  </section>
</template>
