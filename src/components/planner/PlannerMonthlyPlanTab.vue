<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import { DEMAND_SOURCE_FORECAST, derivePeakDayUpliftPercent } from '../../planner/demandSources'
import {
  PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
  getPlanRequirementMethodLabel
} from '../../plannerModel'

const props = defineProps({
  monthlyRecords: {
    type: Array,
    required: true
  },
  requirementMethod: {
    type: String,
    default: ''
  },
  planSummary: {
    type: Object,
    default: null
  },
  demandSource: {
    type: Object,
    required: true
  },
  currentDemandSourceSummary: {
    type: Object,
    default: null
  },
  erlangStatus: {
    type: Object,
    default: () => ({
      status: '',
      message: ''
    })
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

const isIntradayErlang = computed(() => props.requirementMethod === PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG)
const requirementTitle = computed(() => 'Demand Model')
const previousLabel = computed(() => isIntradayErlang.value ? 'Back to Erlang Inputs' : 'Back to Random/Variability')

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}

const formatOptionalNumber = (value, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value)
    ? props.formatNumber(value, digits)
    : '—'

const formatOptionalPercent = (value, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value)
    ? props.formatPercent(value, digits)
    : '—'

const forecastAhtByMonthIndex = computed(() =>
  new Map(
    (Array.isArray(props.demandSource?.forecastMonthSnapshot) ? props.demandSource.forecastMonthSnapshot : [])
      .map((month, fallbackMonthIndex) => [
        Math.max(0, Math.min(11, Math.round(Number(month?.monthIndex ?? fallbackMonthIndex) || 0))),
        Number.isFinite(Number(month?.ahtSeconds)) && Number(month?.ahtSeconds) > 0
          ? Number(month.ahtSeconds)
          : null
      ])
  )
)

const forecastPeakDayUpliftByMonthIndex = computed(() =>
  new Map(
    (Array.isArray(props.demandSource?.forecastMonthSnapshot) ? props.demandSource.forecastMonthSnapshot : [])
      .map((month, fallbackMonthIndex) => [
        Math.max(0, Math.min(11, Math.round(Number(month?.monthIndex ?? fallbackMonthIndex) || 0))),
        derivePeakDayUpliftPercent(month)
      ])
  )
)

const resolveWorkloadRatioAht = (monthIndex) => {
  const forecastAht = forecastAhtByMonthIndex.value.get(monthIndex)
  if (Number.isFinite(forecastAht) && forecastAht > 0) {
    return forecastAht
  }

  const planAht = Number(planMonths.value?.[monthIndex]?.ahtSeconds)
  return Number.isFinite(planAht) && planAht >= 0 ? planAht : null
}

const resolveWorkloadRatioPeakDayUplift = (monthIndex) => {
  const forecastPeakDay = forecastPeakDayUpliftByMonthIndex.value.get(monthIndex)
  if (Number.isFinite(forecastPeakDay) && forecastPeakDay >= 0) {
    return forecastPeakDay
  }

  const planPeakDay = Number(planMonths.value?.[monthIndex]?.peakDayUpliftPercent)
  return Number.isFinite(planPeakDay) && planPeakDay >= 0 ? planPeakDay : null
}

const summaryItems = computed(() => {
  if (isIntradayErlang.value) {
    return [
      {
        label: 'Annual Contacts',
        value: props.formatWhole(props.planSummary?.annualContacts)
      },
      {
        label: 'Annual Workload Hrs',
        value: props.formatWhole(props.planSummary?.annualWorkloadHours)
      },
      {
        label: 'Annual Erlang Hrs',
        value: formatOptionalNumber(props.planSummary?.annualErlangStaffedHours, 1)
      },
      {
        label: 'Avg Weighted Occ',
        value: formatOptionalPercent(props.planSummary?.averageWeightedOccupancyPercent, 1)
      },
      {
        label: 'Avg Service Level',
        value: formatOptionalPercent(props.planSummary?.averageWeightedServiceLevelPercent, 1)
      },
      {
        label: 'Req Headcount',
        value: props.formatNumber(props.planSummary?.averageRequiredHeadcount, 1)
      },
      {
        label: 'Peak Interval Req HC',
        value: formatOptionalNumber(props.planSummary?.peakIntervalMonth?.peakIntervalRequiredHeadcount, 1)
      }
    ]
  }

  return [
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
  ]
})

const contactsSourceMessage = computed(() => {
  if (isIntradayErlang.value) {
    if (props.demandSource?.mode === DEMAND_SOURCE_FORECAST && props.currentDemandSourceSummary?.projectName) {
      return `Daily contacts and monthly AHT assumptions come from ${props.currentDemandSourceSummary.projectName}. Intraday Erlang uses those forecast-owned inputs as read-only demand.`
    }

    return 'Intraday Erlang plans require an applied daily forecast. Contacts and monthly AHT assumptions are forecast-owned in this mode.'
  }

  if (props.demandSource?.mode === DEMAND_SOURCE_FORECAST && props.currentDemandSourceSummary?.projectName) {
    if (props.currentDemandSourceSummary.sourceMissing) {
      return `Monthly contacts, AHT assumptions, and peak-day assumptions came from ${props.currentDemandSourceSummary.projectName}, which has been deleted. Current values remain in this plan until you apply a different forecast.`
    }

    return `Monthly contacts, AHT assumptions, and peak-day assumptions come from ${props.currentDemandSourceSummary.projectName} and are read-only here. Update that saved forecast in Staffing Group Forecasts to refresh those values.`
  }

  return 'Monthly contacts, AHT assumptions, and peak-day assumptions are managed in Forecast and stay read-only in Demand Model.'
})

const requirementModeMessage = computed(() => {
  if (!isIntradayErlang.value) {
    return ''
  }

  const status = String(props.erlangStatus?.status || '').trim()
  const message = String(props.erlangStatus?.message || '').trim()

  if (!message) {
    if (status === 'ready') {
      return `Monthly Erlang hours and peak interval staffing are being calculated from the applied daily forecast in ${getPlanRequirementMethodLabel(props.requirementMethod)} mode.`
    }

    return ''
  }

  return message
})

const requirementModeTone = computed(() => {
  if (!isIntradayErlang.value) {
    return 'info'
  }

  return ['error', 'forecast_required', 'aht_required', 'service_level_required', 'schedule_required', 'intraday_required', 'no_open_days'].includes(props.erlangStatus?.status)
    ? 'error'
    : 'info'
})
</script>

<template>
  <section class="monthly-tab-panel">
    <AppSectionHeader :title="requirementTitle" />

    <AppStatStrip :items="summaryItems" columns="md:grid-cols-2 xl:grid-cols-6" />

    <AppStatusMessage>
      {{ contactsSourceMessage }}
    </AppStatusMessage>

    <AppStatusMessage v-if="requirementModeMessage" :tone="requirementModeTone">
      {{ requirementModeMessage }}
    </AppStatusMessage>

    <section class="grid gap-3">
      <AppSectionHeader title="Monthly Requirement Worksheet" />

      <div class="assumption-table-shell">
      <table
        :class="[
          'assumption-table assumption-table-plan',
          isIntradayErlang ? 'assumption-table-plan--intraday' : 'assumption-table-plan--standard'
        ]"
      >
        <colgroup v-if="isIntradayErlang">
          <col class="plan-col-month" />
          <col class="plan-col-input plan-col-input-contacts" />
          <col class="plan-col-input plan-col-input-aht" />
          <col class="plan-col-context plan-col-context-days" />
          <col class="plan-col-output plan-col-output-workload" />
          <col class="plan-col-output plan-col-output-erlang" />
          <col class="plan-col-output plan-col-output-occupancy" />
          <col class="plan-col-output plan-col-output-service" />
          <col class="plan-col-context plan-col-context-scheduled" />
          <col class="plan-col-context plan-col-context-random" />
          <col class="plan-col-context plan-col-context-design" />
          <col class="plan-col-context plan-col-context-ratio" />
          <col class="plan-col-output plan-col-output-average" />
          <col class="plan-col-output plan-col-output-peak" />
          <col class="plan-col-output plan-col-output-peak" />
        </colgroup>
        <colgroup v-else>
          <col class="plan-col-month" />
          <col class="plan-col-input plan-col-input-contacts" />
          <col class="plan-col-input plan-col-input-aht" />
          <col class="plan-col-input plan-col-input-peak" />
          <col class="plan-col-context plan-col-context-days" />
          <col class="plan-col-context plan-col-context-scheduled" />
          <col class="plan-col-context plan-col-context-random" />
          <col class="plan-col-context plan-col-context-design" />
          <col class="plan-col-context plan-col-context-ratio" />
          <col class="plan-col-output plan-col-output-workload" />
          <col class="plan-col-output plan-col-output-required" />
          <col class="plan-col-output plan-col-output-average" />
          <col class="plan-col-output plan-col-output-peak" />
        </colgroup>
        <thead>
          <tr class="plan-group-row">
            <template v-if="isIntradayErlang">
              <th colspan="4" scope="colgroup">Context</th>
              <th colspan="4" scope="colgroup" class="plan-output-group-head">Erlang</th>
              <th colspan="4" scope="colgroup">Overhead</th>
              <th colspan="3" scope="colgroup" class="plan-output-group-head">Outputs</th>
            </template>
            <template v-else>
              <th colspan="4" scope="colgroup">Inputs</th>
              <th colspan="5" scope="colgroup">Context</th>
              <th colspan="4" scope="colgroup" class="plan-output-group-head">Outputs</th>
            </template>
          </tr>
          <tr>
            <th title="Planning month. Click a month name to highlight that row.">Month</th>
            <th :title="isIntradayErlang ? 'Daily forecast-owned contacts are flattened into monthly workload context in Intraday Erlang mode.' : 'Monthly contact demand used to create workload hours.'">Contacts</th>
            <th :title="isIntradayErlang ? 'Monthly AHT assumptions come from the applied forecast and stay read-only in Intraday Erlang mode.' : 'Average handle time in seconds used to create workload hours.'">AHT</th>
            <th
              v-if="!isIntradayErlang"
              title="Peak Day Uplift % increases average open-day contacts to represent the busiest day of the month."
            >
              <span class="plan-head-label">Peak Day<br />%</span>
            </th>
            <th title="Business days flowing in from the call-center operating days and holiday closures.">
              <span class="plan-head-label">Business<br />Days</span>
            </th>
            <th v-if="isIntradayErlang" title="Monthly workload hours calculated from contacts and AHT.">
              <span class="plan-head-label plan-output-head-label">Workload<br />Hrs</span>
            </th>
            <th v-if="isIntradayErlang" title="Monthly staffed hours returned from interval Erlang calculations.">
              <span class="plan-head-label plan-output-head-label">Erlang<br />Hrs</span>
            </th>
            <th
              v-if="isIntradayErlang"
              title="Weighted monthly occupancy calculated from the interval Erlang outputs."
            >
              <span class="plan-head-label plan-output-head-label">Occupancy</span>
            </th>
            <th
              v-if="isIntradayErlang"
              title="Weighted achieved service level calculated from the interval Erlang outputs."
            >
              <span class="plan-head-label plan-output-head-label">Service<br />Level</span>
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
            <th v-if="!isIntradayErlang" title="Monthly workload hours calculated from contacts and AHT.">
              <span class="plan-head-label">Workload<br />Hrs</span>
            </th>
            <th v-if="!isIntradayErlang" title="Required staff hours calculated as Workload Hours x Workload Staffing Ratio.">
              <span class="plan-head-label">Required<br />Hrs</span>
            </th>
            <th :title="isIntradayErlang ? 'Required headcount calculated from monthly required hours and paid hours per month after applying the overhead section.' : 'Required headcount calculated as Required Staff Hours / Monthly FTE Paid Hours from the presence / utilization step.'">
              <span :class="['plan-head-label', isIntradayErlang && 'plan-output-head-label']">
                {{ isIntradayErlang ? 'Required' : 'Avg Req' }}<br />{{ isIntradayErlang ? 'Headcount' : 'HC' }}
              </span>
            </th>
            <th
              v-if="isIntradayErlang"
              title="Peak day required headcount calculated from the busiest open day after applying the overhead section."
            >
              <span :class="['plan-head-label', 'plan-output-head-label']">Peak Day<br />Req HC</span>
            </th>
            <th
              :title="isIntradayErlang
                ? 'Peak interval headcount returned from the monthly interval Erlang run.'
                : 'Peak-day headcount calculated from average open-day contacts plus Peak Day Uplift %.'"
            >
              <span :class="['plan-head-label', isIntradayErlang && 'plan-output-head-label']">
                {{ isIntradayErlang ? 'Peak Interval' : 'Peak Day' }}<br />Req HC
              </span>
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
              {{ props.formatWhole(planMonths[record.monthIndex].contacts) }}
            </td>
            <td>
              <template v-if="isIntradayErlang">
                {{ formatOptionalNumber(forecastAhtByMonthIndex.get(record.monthIndex), 0) }}
              </template>
              <template v-else>
                {{ formatOptionalNumber(resolveWorkloadRatioAht(record.monthIndex), 0) }}
              </template>
            </td>
            <td v-if="!isIntradayErlang">
              {{ formatOptionalPercent(resolveWorkloadRatioPeakDayUplift(record.monthIndex), 1) }}
            </td>
            <td>{{ props.formatWhole(record.openDays) }}</td>
            <td v-if="isIntradayErlang" class="plan-output-cell">{{ props.formatNumber(record.workloadHours, 1) }}</td>
            <td v-if="isIntradayErlang" class="plan-output-cell">{{ formatOptionalNumber(record.erlangStaffedHours, 1) }}</td>
            <td v-if="isIntradayErlang" class="plan-output-cell">{{ formatOptionalPercent(record.weightedOccupancyPercent, 1) }}</td>
            <td v-if="isIntradayErlang" class="plan-output-cell">{{ formatOptionalPercent(record.weightedServiceLevelPercent, 1) }}</td>
            <td>{{ props.formatPercent(record.scheduledPercent, 1) }}</td>
            <td>{{ props.formatPercent(record.randomLossPercent, 1) }}</td>
            <td>{{ props.formatPercent(record.designFactorPercent, 1) }}</td>
            <td>{{ props.formatFactor(record.workloadStaffingRatio) }}</td>
            <td v-if="!isIntradayErlang">{{ props.formatNumber(record.workloadHours, 1) }}</td>
            <td v-if="!isIntradayErlang">{{ props.formatNumber(record.requiredStaffHours, 1) }}</td>
            <td :class="{ 'plan-output-cell': isIntradayErlang }">{{ props.formatNumber(record.requiredHeadcount, 1) }}</td>
            <td v-if="isIntradayErlang" :class="{ 'plan-output-cell': isIntradayErlang }">
              {{ props.formatNumber(record.peakDayRequiredHeadcount, 1) }}
            </td>
            <td :class="{ 'plan-output-cell': isIntradayErlang }">
              {{ isIntradayErlang
                ? formatOptionalNumber(record.peakIntervalRequiredHeadcount, 1)
                : props.formatNumber(record.peakDayRequiredHeadcount, 1) }}
            </td>
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
      <AppButton variant="secondary" @click="emit('previous')">{{ previousLabel }}</AppButton>
      <AppButton variant="primary" @click="emit('continue')">Continue to Staffing Plan</AppButton>
    </div>
  </section>
</template>
