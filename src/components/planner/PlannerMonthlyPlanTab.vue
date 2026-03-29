<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
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
    value: props.formatWhole(props.planSummary?.annualContacts)
  },
  {
    label: 'Annual Workload Hours',
    value: props.formatWhole(props.planSummary?.annualWorkloadHours)
  },
  {
    label: 'Avg Required Staff Hours',
    value: props.formatNumber(props.planSummary?.averageRequiredStaffHours, 1)
  },
  {
    label: 'Avg Required Headcount',
    value: props.formatNumber(props.planSummary?.averageRequiredHeadcount, 1)
  },
  {
    label: 'Peak Required Headcount',
    value: props.formatNumber(props.planSummary?.peakMonth?.requiredHeadcount, 1)
  },
  {
    label: 'Peak Day Required Headcount',
    value: props.formatNumber(props.planSummary?.peakDayMonth?.peakDayRequiredHeadcount, 1)
  }
])
</script>

<template>
  <section class="monthly-tab-panel">
    <AppSectionHeader title="Demand Model" />

    <AppStatStrip :items="summaryItems" columns="md:grid-cols-2 xl:grid-cols-6" />

    <section class="grid gap-3">
      <AppSectionHeader title="Monthly Requirement Worksheet" />

      <div class="assumption-table-shell">
      <table class="assumption-table assumption-table-plan">
        <colgroup>
          <col class="plan-col-month" />
          <col class="plan-col-input plan-col-input-contacts" />
          <col class="plan-col-input plan-col-input-aht" />
          <col class="plan-col-input plan-col-input-peak" />
          <col class="plan-col-value" />
          <col class="plan-col-value" />
          <col class="plan-col-value" />
          <col class="plan-col-value" />
          <col class="plan-col-value" />
          <col class="plan-col-result" />
          <col class="plan-col-result" />
          <col class="plan-col-result" />
          <col class="plan-col-result" />
        </colgroup>
        <thead>
          <tr>
            <th title="Planning month. Click a month name to highlight that row.">Month</th>
            <th title="Monthly contact demand used to create workload hours.">Contacts</th>
            <th title="Average handle time in seconds used to create workload hours.">AHT</th>
            <th title="Peak Day Uplift % increases average open-day contacts to represent the busiest day of the month.">
              <span class="plan-head-label">Peak Day<br />%</span>
            </th>
            <th title="Business days flowing in from the call-center operating days and holiday closures.">
              <span class="plan-head-label">Business<br />Days</span>
            </th>
            <th title="Scheduled percentage flowing in from the presence / utilization step.">Scheduled %</th>
            <th title="Total scheduled random loss flowing in from the random step.">
              <span class="plan-head-label">Random<br />%</span>
            </th>
            <th title="Design Factor is calculated as Scheduled % - Total Random Loss %.">
              <span class="plan-head-label">Design<br />%</span>
            </th>
            <th title="Workload Staffing Ratio is calculated as 1 / Design Factor.">
              <span class="plan-head-label">Staffing<br />Ratio</span>
            </th>
            <th title="Monthly workload hours calculated from contacts and AHT.">
              <span class="plan-head-label">Workload<br />Hrs</span>
            </th>
            <th title="Required staff hours calculated as Workload Hours x Workload Staffing Ratio.">
              <span class="plan-head-label">Required<br />Hrs</span>
            </th>
            <th title="Required headcount calculated as Required Staff Hours / Monthly FTE Paid Hours from the presence / utilization step.">
              <span class="plan-head-label">Avg Req<br />HC</span>
            </th>
            <th title="Peak-day headcount calculated from average open-day contacts plus Peak Day Uplift %.">
              <span class="plan-head-label">Peak Day<br />Req HC</span>
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
                :title="record.fullLabel"
                @click="setSelectedMonth(record.monthIndex)"
              >
                {{ record.label }}
              </button>
            </td>
            <td>
              <AppTableNumberField
                v-model.number="planMonths[record.monthIndex].contacts"
                :min="0"
                :step="100"
                aria-label="Contacts"
              />
            </td>
            <td>
              <AppTableNumberField
                v-model.number="planMonths[record.monthIndex].ahtSeconds"
                :min="0"
                :step="1"
                aria-label="Average handle time in seconds"
              />
            </td>
            <td>
              <AppTableNumberField
                v-model.number="planMonths[record.monthIndex].peakDayUpliftPercent"
                :min="0"
                :step="1"
                :max-fraction-digits="1"
                suffix="%"
                aria-label="Peak day uplift percent"
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
            <td>{{ props.formatNumber(record.peakDayRequiredHeadcount, 1) }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </section>

    <div v-if="selectedMonth.planWarnings?.length" class="monthly-warning-stack">
      <AppStatusMessage
        v-for="warning in selectedMonth.planWarnings"
        :key="warning"
        tone="error"
      >
        {{ warning }}
      </AppStatusMessage>
    </div>

    <div class="monthly-tab-actions">
      <AppButton variant="secondary" @click="emit('previous')">Back to Random/Variability</AppButton>
      <AppButton variant="primary" @click="emit('continue')">Continue to Staffing Plan</AppButton>
    </div>
  </section>
</template>
