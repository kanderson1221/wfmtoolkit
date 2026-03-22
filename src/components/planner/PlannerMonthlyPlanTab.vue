<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'

const props = defineProps({
  monthlyRecords: {
    type: Array,
    required: true
  },
  planSummary: {
    type: Object,
    default: null
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

const emit = defineEmits(['previous', 'continue'])

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

const summaryItems = computed(() => [
  {
    label: 'Annual Contacts',
    value: props.formatWhole(props.planSummary?.annualContacts),
    meta: 'Sum of all monthly demand entered in the demand model'
  },
  {
    label: 'Annual Workload Hours',
    value: props.formatWhole(props.planSummary?.annualWorkloadHours),
    meta: `${props.planSummary?.busiestMonth?.fullLabel || 'The busiest month'} is the busiest workload month`
  },
  {
    label: 'Avg Required Staff Hours',
    value: props.formatNumber(props.planSummary?.averageRequiredStaffHours, 1),
    meta: 'Average staffing hours required after design factor is applied'
  },
  {
    label: 'Avg Required Headcount',
    value: props.formatNumber(props.planSummary?.averageRequiredHeadcount, 1),
    meta: 'Average monthly required headcount before rounding'
  },
  {
    label: 'Peak Required Headcount',
    value: props.formatNumber(props.planSummary?.peakMonth?.requiredHeadcount, 1),
    meta: props.planSummary?.peakMonth?.fullLabel || 'Highest monthly requirement'
  }
])
</script>

<template>
  <section class="monthly-tab-panel">
    <AppSectionHeader title="Required Headcount" />

    <AppStatStrip :items="summaryItems" columns="md:grid-cols-2 xl:grid-cols-5" />

    <section class="grid gap-3">
      <AppSectionHeader title="Monthly Requirement Worksheet" />

      <div class="assumption-table-shell">
      <table class="assumption-table assumption-table-plan">
        <thead>
          <tr>
            <th title="Planning month. Click a month name to highlight that row.">Month</th>
            <th title="Monthly contact demand used to create workload hours.">Contacts</th>
            <th title="Average handle time in seconds used to create workload hours.">AHT Sec</th>
            <th title="Business days flowing in from the call-center operating days and holiday closures.">Business Days</th>
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
              <AppTableNumberField
                v-model.number="planMonths[record.monthIndex].contacts"
                min="0"
                step="100"
                aria-label="Contacts"
              />
            </td>
            <td>
              <AppTableNumberField
                v-model.number="planMonths[record.monthIndex].ahtSeconds"
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
    </section>

    <div v-if="selectedMonth.planWarnings?.length" class="monthly-warning-stack">
      <p
        v-for="warning in selectedMonth.planWarnings"
        :key="warning"
        class="status-message error"
      >
        {{ warning }}
      </p>
    </div>

    <div class="monthly-tab-actions">
      <AppButton variant="secondary" @click="emit('previous')">Back to Variability Buffer</AppButton>
      <AppButton variant="primary" @click="emit('continue')">Continue to Staffing Plan</AppButton>
    </div>
  </section>
</template>
