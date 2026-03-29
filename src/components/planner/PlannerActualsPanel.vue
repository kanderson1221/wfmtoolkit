<script setup>
import { computed, ref } from 'vue'
import { mdiChartTimelineVariant, mdiInformationOutline } from '@mdi/js'

import AppIcon from '../ui/AppIcon.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import PlannerActualsComparisonChart from './PlannerActualsComparisonChart.vue'

const props = defineProps({
  actualsRecords: {
    type: Array,
    required: true
  },
  actualsSummary: {
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
  }
})

const actualsMonths = defineModel('actualsMonths', {
  type: Array,
  default: null
})

const staffingMetricOptions = [
  { label: 'Starting Frontline Headcount', value: 'plannedStartingFrontlineHeadcount' },
  { label: 'Ending Frontline Headcount', value: 'plannedEndingFrontlineHeadcount' },
  { label: 'Starting Roster Headcount', value: 'plannedStartingTotalHeadcount' },
  { label: 'Ending Roster Headcount', value: 'plannedEndingTotalHeadcount' }
]

const selectedStaffingMetric = ref('plannedStartingFrontlineHeadcount')

const formatSignedNumber = (value, digits = 1) => {
  if (value == null) {
    return '—'
  }

  const numericValue = Number(value) || 0
  const prefix = numericValue > 0 ? '+' : ''
  return `${prefix}${props.formatNumber(numericValue, digits)}`
}

const summaryItems = computed(() => [
  {
    label: 'Months Loaded',
    value: props.formatWhole(props.actualsSummary.loadedMonthsCount),
    meta: 'Months with actual contacts or AHT entered'
  },
  {
    label: 'Contacts Variance',
    value: formatSignedNumber(props.actualsSummary.contactsVariance, 0),
    meta: 'Actual contacts versus the saved plan across loaded months'
  },
  {
    label: 'Avg AHT Variance',
    value: `${formatSignedNumber(props.actualsSummary.averageAhtVarianceSeconds, 1)} sec`,
    meta: 'Average handle-time variance across months with actual demand'
  },
  {
    label: 'Average Required Headcount Variance',
    value: formatSignedNumber(props.actualsSummary.averageRequiredHeadcountVariance, 1),
    meta: 'Actual required headcount versus planned requirement'
  },
  {
    label: 'Peak Actual Required Headcount',
    value: props.formatNumber(props.actualsSummary.peakActualRequiredHeadcount, 1),
    meta: 'Highest actual required headcount across loaded months'
  },
  {
    label: 'Peak Planned Required Headcount',
    value: props.formatNumber(props.actualsSummary.peakPlannedRequiredHeadcount, 1),
    meta: 'Highest planned required headcount across the year'
  }
])

const displayValue = (value, digits = 1) => (value == null ? '—' : props.formatNumber(value, digits))

const requirementVarianceClass = (value) => ({
  'variance-negative': (value ?? 0) > 0.05,
  'variance-positive': (value ?? 0) < -0.05
})

const workloadPercentDelta = (actual, planned) => {
  if (actual == null || planned == null || Number(planned) <= 0) {
    return null
  }

  return ((Number(actual) - Number(planned)) / Number(planned)) * 100
}

const workloadDeltaLabel = (actual, planned) => {
  const delta = workloadPercentDelta(actual, planned)

  if (delta == null) {
    return ''
  }

  if (Math.abs(delta) < 0.05) {
    return '0.0%'
  }

  return `${delta > 0 ? '+' : ''}${props.formatNumber(delta, 1)}%`
}

const workloadDeltaClass = (actual, planned) => {
  const delta = workloadPercentDelta(actual, planned)

  return {
    'variance-negative': (delta ?? 0) > 0.05,
    'variance-positive': (delta ?? 0) < -0.05,
    'actuals-inline-sup-neutral': delta != null && Math.abs(delta) < 0.05
  }
}

const selectedStaffingMetricValue = (record) => {
  const value = record?.[selectedStaffingMetric.value]
  return value == null ? null : Number(value)
}

const staffingGapToActualRequirement = (record) => {
  const selectedValue = selectedStaffingMetricValue(record)
  const actualRequirement = record?.actualRequiredHeadcount

  if (selectedValue == null || actualRequirement == null) {
    return null
  }

  return selectedValue - Number(actualRequirement)
}

const staffingGapClass = (value) => ({
  'variance-positive': (value ?? 0) > 0.05,
  'variance-negative': (value ?? 0) < -0.05
})

const infoIconPath = mdiInformationOutline
</script>

<template>
  <section class="grid gap-4">
    <AppSectionHeader title="Actuals & Variance" :icon="mdiChartTimelineVariant" />

    <AppStatStrip :items="summaryItems" columns="md:grid-cols-2 xl:grid-cols-6" />

    <section class="grid gap-3">
      <AppSectionHeader title="Planned vs Actual Requirement" />
      <PlannerActualsComparisonChart
        :records="props.actualsRecords"
        :format-number="props.formatNumber"
      />
    </section>

    <section class="grid gap-3">
      <AppSectionHeader title="Monthly Actuals Worksheet" />

      <div class="assumption-table-shell">
        <table class="assumption-table assumption-table-actuals">
          <colgroup>
            <col class="actuals-col-month" />
            <col class="actuals-col-input actuals-col-contacts" />
            <col class="actuals-col-input actuals-col-contacts" />
            <col class="actuals-col-input actuals-col-aht" />
            <col class="actuals-col-input actuals-col-aht" />
            <col class="actuals-col-value actuals-col-hours" />
            <col class="actuals-col-value actuals-col-hours" />
            <col class="actuals-col-value actuals-col-requirement" />
            <col class="actuals-col-value actuals-col-requirement" />
            <col class="actuals-col-value actuals-col-variance" />
            <col class="actuals-col-value actuals-col-staffing-lens" />
            <col class="actuals-col-value actuals-col-gap" />
          </colgroup>
          <thead>
            <tr class="actuals-super-row">
              <th rowspan="2">
                <span class="actuals-head-cell">
                  <span>Month</span>
                  <span
                    class="actuals-head-info"
                    title="Planning month for the worksheet row."
                    aria-label="Month help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th colspan="9" class="actuals-super-head actuals-super-workload">Workload</th>
              <th colspan="2" class="actuals-super-head actuals-super-staffing">Staffing</th>
            </tr>
            <tr>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Planned<br />Contacts</span>
                  <span
                    class="actuals-head-info"
                    title="Monthly planned contacts from the saved Demand Model worksheet."
                    aria-label="Planned contacts help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Actual<br />Contacts</span>
                  <span
                    class="actuals-head-info"
                    title="Monthly actual contacts. This is a manual actuals entry field."
                    aria-label="Actual contacts help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Planned AHT<br />Sec</span>
                  <span
                    class="actuals-head-info"
                    title="Monthly planned average handle time in seconds from the saved Demand Model worksheet."
                    aria-label="Planned AHT seconds help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Actual AHT<br />Sec</span>
                  <span
                    class="actuals-head-info"
                    title="Average actual handle time in seconds. This is a manual actuals entry field."
                    aria-label="Actual AHT seconds help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Planned Wkld<br />Hrs</span>
                  <span
                    class="actuals-head-info"
                    title="Monthly planned workload hours from the saved Demand Model worksheet."
                    aria-label="Planned workload hours help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Actual Wkld<br />Hrs</span>
                  <span
                    class="actuals-head-info"
                    title="Actual workload hours derived from Actual Contacts and Actual AHT."
                    aria-label="Actual workload hours help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Planned Req<br />HC</span>
                  <span
                    class="actuals-head-info"
                    title="Planned required headcount from the saved Demand Model worksheet."
                    aria-label="Planned required headcount help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Actual Req<br />HC</span>
                  <span
                    class="actuals-head-info"
                    title="Actual required headcount derived from Actual Contacts and Actual AHT using the saved requirement math."
                    aria-label="Actual required headcount help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Req HC<br />Variance</span>
                  <span
                    class="actuals-head-info"
                    title="Actual required headcount minus planned required headcount."
                    aria-label="Required headcount variance help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th class="actuals-adjustable-head">
                <span class="actuals-head-cell actuals-head-cell-select">
                  <AppSelect
                    v-model="selectedStaffingMetric"
                    :options="staffingMetricOptions"
                    option-label="label"
                    option-value="value"
                    compact
                    plain
                    class="actuals-head-select"
                    aria-label="Planned staffing headcount metric"
                  />
                  <span
                    class="actuals-head-info"
                    title="Choose which planned headcount metric to compare against actual required headcount."
                    aria-label="Planned staffing headcount metric help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
              <th>
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Gap vs<br />Actual Req HC</span>
                  <span
                    class="actuals-head-info"
                    title="Selected planned headcount metric minus actual required headcount."
                    aria-label="Staffing gap to actual requirement help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in props.actualsRecords" :key="record.label">
              <td class="month-cell">
                <span class="actuals-month-label" :title="record.fullLabel">{{ record.label }}</span>
              </td>
              <td>{{ displayValue(record.plannedContacts, 0) }}</td>
              <td>
                <AppTableNumberField
                  v-model.number="actualsMonths[record.monthIndex].actualContacts"
                  :min="0"
                  :step="100"
                  :min-fraction-digits="0"
                  :max-fraction-digits="0"
                  :use-grouping="true"
                  aria-label="Actual contacts"
                />
              </td>
              <td>{{ displayValue(record.plannedAhtSeconds, 0) }}</td>
              <td>
                <AppTableNumberField
                  v-model.number="actualsMonths[record.monthIndex].actualAhtSeconds"
                  :min="0"
                  :step="1"
                    aria-label="Actual average handle time in seconds"
                />
              </td>
              <td>{{ displayValue(record.plannedWorkloadHours, 1) }}</td>
              <td>
                <span class="actuals-value-with-sup">
                  <span>{{ displayValue(record.actualWorkloadHours, 1) }}</span>
                  <sup
                    v-if="workloadDeltaLabel(record.actualWorkloadHours, record.plannedWorkloadHours)"
                    class="actuals-inline-sup"
                    :class="workloadDeltaClass(record.actualWorkloadHours, record.plannedWorkloadHours)"
                  >
                    {{ workloadDeltaLabel(record.actualWorkloadHours, record.plannedWorkloadHours) }}
                  </sup>
                </span>
              </td>
              <td>{{ displayValue(record.plannedRequiredHeadcount, 1) }}</td>
              <td>{{ displayValue(record.actualRequiredHeadcount, 1) }}</td>
              <td :class="requirementVarianceClass(record.requiredHeadcountVariance)">
                {{ displayValue(record.requiredHeadcountVariance, 1) }}
              </td>
              <td>{{ displayValue(selectedStaffingMetricValue(record), 1) }}</td>
              <td :class="staffingGapClass(staffingGapToActualRequirement(record))">
                {{ displayValue(staffingGapToActualRequirement(record), 1) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
