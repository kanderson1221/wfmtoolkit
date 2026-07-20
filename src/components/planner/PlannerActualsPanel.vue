<script setup>
import { computed, ref } from 'vue'
import { mdiCalculatorVariantOutline, mdiChartTimelineVariant, mdiInformationOutline } from '@mdi/js'

import AppButton from '../ui/AppButton.vue'
import AppIcon from '../ui/AppIcon.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableShell from '../ui/AppTableShell.vue'
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
  actualsErlangStatus: {
    type: Object,
    default: () => ({
      status: '',
      message: '',
      canRun: false,
      isRunning: false
    })
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

const emit = defineEmits(['run-actuals-erlang'])

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
    label: 'Coverage-ready months',
    value: `${props.formatWhole(props.actualsSummary.completeMonthsCount || 0)} / ${props.formatWhole(props.actualsSummary.loadedMonthsCount)}`,
    meta: 'Loaded months with every expected open date present'
  },
  {
    label: 'Contacts Variance',
    value: formatSignedNumber(props.actualsSummary.contactsVariance, 0),
    meta: 'Data tab contacts versus plan across coverage-ready months'
  },
  {
    label: 'Avg AHT Variance',
    value: props.actualsSummary.averageAhtVarianceSeconds == null
      ? '—'
      : `${formatSignedNumber(props.actualsSummary.averageAhtVarianceSeconds, 1)} sec`,
    meta: 'Average handle-time variance across coverage-ready months'
  },
  {
    label: 'Average Required Headcount Variance',
    value: formatSignedNumber(props.actualsSummary.averageRequiredHeadcountVariance, 1),
    meta: 'Actual required headcount versus planned requirement'
  },
  {
    label: 'Peak Actual Required Headcount',
    value: displayValue(props.actualsSummary.peakActualRequiredHeadcount, 1),
    meta: 'Highest actual required headcount across coverage-ready months'
  },
  {
    label: 'Peak Planned Required Headcount',
    value: props.formatNumber(props.actualsSummary.peakPlannedRequiredHeadcount, 1),
    meta: 'Highest planned required headcount across the year'
  }
])

const displayValue = (value, digits = 1) => (value == null ? '—' : props.formatNumber(value, digits))

const incompleteActualsRecords = computed(() => props.actualsRecords.filter(
  (record) => record.isLoaded && record.actualsCoverageComplete === false
))

const coverageWarning = computed(() => {
  if (!incompleteActualsRecords.value.length) {
    return ''
  }

  const monthLabels = incompleteActualsRecords.value.map((record) => record.label).join(', ')
  return `${monthLabels} ${incompleteActualsRecords.value.length === 1 ? 'has' : 'have'} incomplete Data tab coverage. Observed actuals remain visible, but full-month variances, actual requirement, and staffing gap are withheld until every expected open date is loaded.`
})

const coverageLabel = (record) => {
  const expected = record.actualExpectedOpenDaysCount

  if (expected == null) {
    return record.isLoaded ? `${props.formatWhole(record.actualLoadedDaysCount)} loaded` : 'Not loaded'
  }

  const loaded = props.formatWhole(record.actualLoadedOpenDaysCount)
  const expectedLabel = props.formatWhole(expected)

  if (!record.isLoaded) {
    return `${loaded} / ${expectedLabel}`
  }

  return record.actualsCoverageComplete
    ? `${loaded} / ${expectedLabel} complete`
    : `${loaded} / ${expectedLabel} partial`
}

const coverageClass = (record) => ({
  'font-semibold text-emerald-700': record.isLoaded && record.actualsCoverageComplete,
  'font-semibold text-amber-700': record.isLoaded && record.actualsCoverageComplete === false,
  'text-slate-500': !record.isLoaded
})

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
const actualsErlangStatusValue = computed(() => String(props.actualsErlangStatus?.status || '').trim())
const actualsErlangCanRun = computed(() => Boolean(props.actualsErlangStatus?.canRun))
const actualsErlangIsRunning = computed(() => Boolean(props.actualsErlangStatus?.isRunning))
const actualsErlangHasAction = computed(() =>
  actualsErlangCanRun.value ||
  actualsErlangIsRunning.value ||
  ['ready_to_run', 'ready', 'stale', 'error'].includes(actualsErlangStatusValue.value)
)
const actualsErlangButtonLabel = computed(() => {
  if (actualsErlangIsRunning.value) {
    return 'Calculating Actual Requirements'
  }

  return props.actualsErlangStatus?.hasResults
    ? 'Rerun Actual Calculations'
    : 'Run Actual Calculations'
})
const actualsErlangMessage = computed(() => {
  const status = actualsErlangStatusValue.value
  const message = String(props.actualsErlangStatus?.message || '').trim()
  const progress = props.actualsErlangStatus?.progress || {}
  const totalMonths = Number(progress.totalMonths) || 0

  if (status === 'loading') {
    if (totalMonths > 0) {
      const completedMonths = Math.max(0, Number(progress.completedMonths) || 0)
      const currentMonthLabel = String(progress.currentMonthLabel || '').trim()
      const progressLabel = `${Math.min(completedMonths, totalMonths)}/${totalMonths} months complete`
      return currentMonthLabel
        ? `${message || `Calculating actual staffing for ${currentMonthLabel}.`} ${progressLabel}.`
        : `${message || 'Calculating actual Intraday Erlang requirements.'} ${progressLabel}.`
    }

    return message || 'Calculating actual Intraday Erlang requirements from Data tab daily actuals.'
  }

  if (message) {
    return message
  }

  if (status === 'ready_to_run') {
    return 'Run actual staffing calculations to populate actual Intraday Erlang requirements.'
  }

  if (status === 'ready') {
    return 'Actual staffing calculations are complete for loaded actuals.'
  }

  return ''
})

const actualsErlangTone = computed(() => {
  if (['error', 'stale', 'no_open_days', 'incomplete_actuals'].includes(actualsErlangStatusValue.value)) {
    return 'error'
  }

  return actualsErlangStatusValue.value === 'ready' ? 'success' : 'info'
})
</script>

<template>
  <section class="grid gap-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <AppSectionHeader title="Actuals & Variance" :icon="mdiChartTimelineVariant" />
      <AppButton
        v-if="actualsErlangHasAction"
        size="sm"
        :variant="actualsErlangIsRunning ? 'secondary' : 'primary'"
        :icon="mdiCalculatorVariantOutline"
        :disabled="!actualsErlangCanRun || actualsErlangIsRunning"
        @click="emit('run-actuals-erlang')"
      >
        {{ actualsErlangButtonLabel }}
      </AppButton>
    </div>

    <AppStatStrip :items="summaryItems" columns="md:grid-cols-2 xl:grid-cols-6" />

    <AppStatusMessage v-if="actualsErlangMessage" :tone="actualsErlangTone">
      {{ actualsErlangMessage }}
    </AppStatusMessage>

    <section class="grid gap-3">
      <AppSectionHeader title="Planned vs Actual Requirement" />
      <PlannerActualsComparisonChart
        :records="props.actualsRecords"
        :format-number="props.formatNumber"
      />
    </section>

    <section class="grid gap-3">
      <AppSectionHeader title="Monthly Actuals From Data" />

      <AppStatusMessage v-if="props.actualsSummary.loadedMonthsCount === 0" tone="warning">
        No daily actuals are loaded for this plan year in the staffing group Data tab.
      </AppStatusMessage>

      <AppStatusMessage v-else-if="coverageWarning" tone="warning">
        {{ coverageWarning }}
      </AppStatusMessage>

      <AppTableShell>
        <div
          class="actuals-coverage-scroll"
          role="region"
          aria-label="Monthly actuals coverage and variance worksheet"
          tabindex="0"
        >
        <table class="assumption-table assumption-table-actuals">
          <colgroup>
            <col class="actuals-col-month" />
            <col class="actuals-col-coverage" />
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
              <th colspan="2" class="actuals-super-head actuals-super-evidence">Evidence</th>
              <th colspan="9" class="actuals-super-head actuals-super-workload">Workload</th>
              <th colspan="2" class="actuals-super-head actuals-super-staffing">Staffing</th>
            </tr>
            <tr class="actuals-detail-row">
              <th scope="col" class="actuals-sticky-month-head">
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
              <th scope="col">
                <span class="actuals-head-cell">
                  <span class="plan-head-label">Open-date<br />Coverage</span>
                  <span
                    class="actuals-head-info"
                    title="Loaded expected open dates versus all expected open dates in the saved plan calendar."
                    aria-label="Actuals open-date coverage help"
                  >
                    <AppIcon :path="infoIconPath" size="12" />
                  </span>
                </span>
              </th>
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
                    title="Monthly actual contacts rolled up from the staffing group Data tab."
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
                    title="Weighted average actual handle time in seconds rolled up from the staffing group Data tab."
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
                    title="Actual workload hours derived from Data tab contacts and AHT."
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
                    title="Actual required headcount derived from Data tab actuals using the saved requirement math."
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
              <td :class="coverageClass(record)">
                <span class="text-[0.72rem] leading-4">{{ coverageLabel(record) }}</span>
              </td>
              <td>{{ displayValue(record.plannedContacts, 0) }}</td>
              <td>{{ displayValue(record.actualContacts, 0) }}</td>
              <td>{{ displayValue(record.plannedAhtSeconds, 0) }}</td>
              <td>{{ displayValue(record.actualAhtSeconds, 0) }}</td>
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
      </AppTableShell>
    </section>
  </section>
</template>
