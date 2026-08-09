<script setup>
import { mdiCalculatorVariantOutline, mdiDownload } from '@mdi/js'
import { computed, ref } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppInfoTooltip from '../ui/AppInfoTooltip.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import { buildCsv, downloadCsv, formatCsvNumber, sanitizeFileNamePart } from '../../csvExport'
import { DEMAND_SOURCE_FORECAST, derivePeakDayUpliftPercent } from '../../planner/demandSources'
import {
  PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
} from '../../plannerModel'
import { getChannelPlanningTerms } from '../../planner/channels'

const props = defineProps({
  channelType: {
    type: String,
    default: 'voice'
  },
  monthlyRecords: {
    type: Array,
    required: true
  },
  intervalRecords: {
    type: Array,
    default: () => []
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
      message: '',
      canRun: false,
      isRunning: false,
      isStale: false,
      hasResults: false,
      calculatedAt: '',
      progress: {
        completedMonths: 0,
        totalMonths: 0,
        currentMonthLabel: '',
        completedRows: 0,
        totalRows: 0
      }
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

const emit = defineEmits(['previous', 'continue', 'run-erlang'])

const intervalPressureMetricOptions = [
  { label: 'Peak Day HC', value: 'peak_day_total' },
  { label: 'P80 Total HC', value: 'p80_interval_total' },
  { label: 'P90 Total HC', value: 'p90_interval_total' }
]

const planMonths = defineModel('planMonths', {
  type: Array,
  default: null
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const selectedIntervalPressureMetric = ref('peak_day_total')

const selectedMonth = computed(
  () => props.monthlyRecords[selectedMonthIndex.value] ?? props.monthlyRecords[0] ?? { planWarnings: [], label: 'month' }
)

const isIntradayErlang = computed(() => props.requirementMethod === PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG)
const channelTerms = computed(() => getChannelPlanningTerms(props.channelType))
const requirementTitle = computed(() => 'Demand Model')
const previousLabel = computed(() => isIntradayErlang.value ? 'Back to Erlang Inputs' : 'Back to Random/Variability')
const appliedDailyForecastRowCount = computed(() =>
  Array.isArray(props.demandSource?.forecastDailySnapshot)
    ? props.demandSource.forecastDailySnapshot.length
    : 0
)

const parseFiniteNumber = (value) => {
  if (value == null || value === '') {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const formatCsvRatioAsPercent = (value, digits = 4) => {
  const number = parseFiniteNumber(value)
  return number == null ? '' : formatCsvNumber(number * 100, digits)
}

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

  const recordAht = Number(props.monthlyRecords?.[monthIndex]?.ahtSeconds)
  if (Number.isFinite(recordAht) && recordAht > 0) {
    return recordAht
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

const resolveBaseHeadcount = (record = {}) => {
  const erlangStaffedHours = parseFiniteNumber(record.erlangStaffedHours)

  if (erlangStaffedHours == null) {
    return null
  }

  const paidHoursPerMonth = parseFiniteNumber(record.paidHoursPerMonth)
  if (paidHoursPerMonth != null && paidHoursPerMonth > 0) {
    return erlangStaffedHours / paidHoursPerMonth
  }

  const totalHeadcount = parseFiniteNumber(record.requiredHeadcount)
  const staffingRatio = parseFiniteNumber(record.workloadStaffingRatio)
  return totalHeadcount != null && staffingRatio != null && staffingRatio > 0
    ? totalHeadcount / staffingRatio
    : null
}

const monthLabelByIndex = computed(() =>
  new Map(
    props.monthlyRecords.map((record, fallbackMonthIndex) => [
      record.monthIndex ?? fallbackMonthIndex,
      record.label || record.fullLabel || `Month ${fallbackMonthIndex + 1}`
    ])
  )
)

const monthlyRecordByIndex = computed(() =>
  new Map(
    props.monthlyRecords.map((record, fallbackMonthIndex) => [
      record.monthIndex ?? fallbackMonthIndex,
      record
    ])
  )
)

const resolveIntervalStaffingRatio = (record) => {
  const monthIndex = parseFiniteNumber(record?.monthIndex)
  const monthlyRecord = monthIndex == null ? null : monthlyRecordByIndex.value.get(monthIndex)
  return parseFiniteNumber(monthlyRecord?.workloadStaffingRatio)
}

const resolveIntervalWfmLaborHoursGross = (record) => {
  const laborHoursNet = parseFiniteNumber(record.laborHoursNet)
  const staffingRatio = resolveIntervalStaffingRatio(record)

  return laborHoursNet == null || staffingRatio == null ? null : laborHoursNet * staffingRatio
}

const resolveIntervalTotalHeadcount = (record) => {
  const requiredStaffNet = parseFiniteNumber(record?.requiredStaffNet)
  const staffingRatio = resolveIntervalStaffingRatio(record)

  return requiredStaffNet == null || staffingRatio == null ? null : requiredStaffNet * staffingRatio
}

const resolveNearestRankPercentile = (values, percentile) => {
  const sortedValues = values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)

  if (!sortedValues.length) {
    return null
  }

  const percentileIndex = Math.ceil(percentile * sortedValues.length) - 1
  return sortedValues[Math.max(0, Math.min(sortedValues.length - 1, percentileIndex))]
}

const intervalPressureByMonthIndex = computed(() => {
  const groupedValues = new Map()

  for (const record of Array.isArray(props.intervalRecords) ? props.intervalRecords : []) {
    const monthIndex = parseFiniteNumber(record?.monthIndex)
    const intervalTotalHeadcount = resolveIntervalTotalHeadcount(record)

    if (monthIndex == null || intervalTotalHeadcount == null) {
      continue
    }

    const normalizedMonthIndex = Math.round(monthIndex)
    const values = groupedValues.get(normalizedMonthIndex) ?? []
    values.push(intervalTotalHeadcount)
    groupedValues.set(normalizedMonthIndex, values)
  }

  return new Map(
    Array.from(groupedValues.entries()).map(([monthIndex, values]) => [
      monthIndex,
      {
        p80: resolveNearestRankPercentile(values, 0.8),
        p90: resolveNearestRankPercentile(values, 0.9)
      }
    ])
  )
})

const resolveSelectedIntervalPressureHeadcount = (record) => {
  const monthIndex = parseFiniteNumber(record?.monthIndex)
  const intervalPressure = monthIndex == null
    ? null
    : intervalPressureByMonthIndex.value.get(Math.round(monthIndex))

  if (selectedIntervalPressureMetric.value === 'p80_interval_total') {
    return intervalPressure?.p80 ?? null
  }

  if (selectedIntervalPressureMetric.value === 'p90_interval_total') {
    return intervalPressure?.p90 ?? null
  }

  return parseFiniteNumber(record?.peakDayRequiredHeadcount)
}

const exportYear = computed(() => {
  const importedYear = parseFiniteNumber(props.demandSource?.importedPlanningYear)

  if (importedYear != null) {
    return Math.round(importedYear)
  }

  const datedRow = [
    ...(Array.isArray(props.intervalRecords) ? props.intervalRecords : []),
    ...(Array.isArray(props.demandSource?.forecastDailySnapshot) ? props.demandSource.forecastDailySnapshot : []),
    ...(Array.isArray(props.demandSource?.forecastMonthSnapshot) ? props.demandSource.forecastMonthSnapshot : [])
  ].find((row) => /^(\d{4})-/.test(String(row?.serviceDate || row?.monthStart || '')))
  const yearText = String(datedRow?.serviceDate || datedRow?.monthStart || '').slice(0, 4)
  const year = parseFiniteNumber(yearText)

  return year == null ? null : Math.round(year)
})

const exportFilePrefix = computed(() => {
  const defaultExportName = isIntradayErlang.value ? 'intraday-erlang' : 'staffing-ratio'
  const sourceName =
    props.currentDemandSourceSummary?.projectName ||
    props.demandSource?.forecastProjectName ||
    defaultExportName
  const yearSuffix = exportYear.value == null ? '' : `-${exportYear.value}`

  return `${sanitizeFileNamePart(sourceName, 'intraday-erlang')}${yearSuffix}`
})

const monthlyExportRows = computed(() =>
  Array.isArray(props.monthlyRecords) ? props.monthlyRecords : []
)

const intervalExportRows = computed(() =>
  isIntradayErlang.value
    ? [...(Array.isArray(props.intervalRecords) ? props.intervalRecords : [])].sort((left, right) => {
        const leftKey = `${left?.serviceDate || ''} ${left?.intervalStart || ''}`
        const rightKey = `${right?.serviceDate || ''} ${right?.intervalStart || ''}`
        return leftKey.localeCompare(rightKey)
      })
    : []
)

const standardMonthlyExportColumns = computed(() => [
  { header: 'month', value: (record) => record.label || record.fullLabel || '' },
  {
    header: 'contacts',
    value: (record) => formatCsvNumber(planMonths.value?.[record.monthIndex]?.contacts ?? record.contacts, 6)
  },
  { header: 'aht_seconds', value: (record) => formatCsvNumber(resolveWorkloadRatioAht(record.monthIndex), 6) },
  { header: 'peak_day_percent', value: (record) => formatCsvNumber(resolveWorkloadRatioPeakDayUplift(record.monthIndex), 6) },
  { header: 'open_days', value: (record) => formatCsvNumber(record.openDays, 6) },
  { header: 'fte_paid_hours', value: (record) => formatCsvNumber(record.paidHoursPerMonth, 6) },
  { header: 'scheduled_percent', value: (record) => formatCsvNumber(record.scheduledPercent, 6) },
  { header: 'random_percent', value: (record) => formatCsvNumber(record.randomLossPercent, 6) },
  { header: 'design_percent', value: (record) => formatCsvNumber(record.designFactorPercent, 6) },
  { header: 'staffing_ratio', value: (record) => formatCsvNumber(record.workloadStaffingRatio, 6) },
  { header: 'workload_hours', value: (record) => formatCsvNumber(record.workloadHours, 6) },
  { header: 'required_hours', value: (record) => formatCsvNumber(record.requiredStaffHours, 6) },
  { header: 'required_headcount', value: (record) => formatCsvNumber(record.requiredHeadcount, 6) },
  { header: 'peak_day_required_headcount', value: (record) => formatCsvNumber(record.peakDayRequiredHeadcount, 6) }
])

const selectedIntervalPressureExportHeader = computed(() => {
  if (selectedIntervalPressureMetric.value === 'p80_interval_total') {
    return 'p80_interval_total_headcount'
  }

  if (selectedIntervalPressureMetric.value === 'p90_interval_total') {
    return 'p90_interval_total_headcount'
  }

  return 'peak_day_total_headcount'
})

const intradayErlangMonthlyExportColumns = computed(() => [
  { header: 'month', value: (record) => record.label || record.fullLabel || '' },
  {
    header: 'contacts',
    value: (record) => formatCsvNumber(planMonths.value?.[record.monthIndex]?.contacts ?? record.contacts, 6)
  },
  { header: 'aht_seconds', value: (record) => formatCsvNumber(resolveWorkloadRatioAht(record.monthIndex), 6) },
  { header: 'open_days', value: (record) => formatCsvNumber(record.openDays, 6) },
  { header: 'fte_paid_hours', value: (record) => formatCsvNumber(record.paidHoursPerMonth, 6) },
  { header: 'workload_hours', value: (record) => formatCsvNumber(record.workloadHours, 6) },
  { header: 'erlang_hours', value: (record) => formatCsvNumber(record.erlangStaffedHours, 6) },
  { header: 'base_headcount', value: (record) => formatCsvNumber(resolveBaseHeadcount(record), 6) },
  { header: 'occupancy_percent', value: (record) => formatCsvNumber(record.weightedOccupancyPercent, 6) },
  { header: 'service_level_percent', value: (record) => formatCsvNumber(record.weightedServiceLevelPercent, 6) },
  { header: 'scheduled_percent', value: (record) => formatCsvNumber(record.scheduledPercent, 6) },
  { header: 'random_percent', value: (record) => formatCsvNumber(record.randomLossPercent, 6) },
  { header: 'design_percent', value: (record) => formatCsvNumber(record.designFactorPercent, 6) },
  { header: 'staffing_ratio', value: (record) => formatCsvNumber(record.workloadStaffingRatio, 6) },
  { header: 'total_required_hours', value: (record) => formatCsvNumber(record.requiredStaffHours, 6) },
  { header: 'total_required_headcount', value: (record) => formatCsvNumber(record.requiredHeadcount, 6) },
  { header: selectedIntervalPressureExportHeader.value, value: (record) => formatCsvNumber(resolveSelectedIntervalPressureHeadcount(record), 6) }
])

const monthlyExportColumns = computed(() =>
  isIntradayErlang.value
    ? intradayErlangMonthlyExportColumns.value
    : standardMonthlyExportColumns.value
)

const intervalExportColumns = computed(() => [
  { header: 'month_index', value: (record) => formatCsvNumber(record.monthIndex, 0) },
  { header: 'month', value: (record) => monthLabelByIndex.value.get(record.monthIndex) || '' },
  { header: 'service_date', value: (record) => record.serviceDate || '' },
  { header: 'interval_start', value: (record) => record.intervalStart || '' },
  { header: 'interval_length_minutes', value: (record) => formatCsvNumber(record.intervalLengthMinutes, 6) },
  { header: 'calls_offered', value: (record) => formatCsvNumber(record.callsOffered, 6) },
  { header: 'average_handle_time_seconds', value: (record) => formatCsvNumber(record.averageHandleTimeSeconds, 6) },
  { header: 'workload_hours', value: (record) => formatCsvNumber(record.workloadHours, 6) },
  { header: 'required_staff_net', value: (record) => formatCsvNumber(record.requiredStaffNet, 6) },
  { header: 'labor_hours_net', value: (record) => formatCsvNumber(record.laborHoursNet, 6) },
  { header: 'wfm_staffing_ratio', value: (record) => formatCsvNumber(resolveIntervalStaffingRatio(record), 6) },
  { header: 'wfm_labor_hours_gross', value: (record) => formatCsvNumber(resolveIntervalWfmLaborHoursGross(record), 6) },
  { header: 'service_level_percent', value: (record) => formatCsvRatioAsPercent(record.serviceLevel, 6) },
  { header: 'occupancy_percent', value: (record) => formatCsvRatioAsPercent(record.occupancy, 6) },
  { header: 'average_speed_of_answer_seconds', value: (record) => formatCsvNumber(record.averageSpeedOfAnswerSeconds, 6) },
  { header: 'answered_immediately_percent', value: (record) => formatCsvRatioAsPercent(record.percentAnsweredImmediately, 6) },
  { header: 'abandon_percent', value: (record) => formatCsvRatioAsPercent(record.abandonPercent, 6) }
])

const downloadMonthlyCsv = () => {
  if (!monthlyExportRows.value.length) {
    return
  }

  downloadCsv(
    `${exportFilePrefix.value}-monthly-demand-model.csv`,
    buildCsv(monthlyExportColumns.value, monthlyExportRows.value)
  )
}

const downloadIntervalCsv = () => {
  if (!intervalExportRows.value.length) {
    return
  }

  downloadCsv(
    `${exportFilePrefix.value}-interval-demand-model.csv`,
    buildCsv(intervalExportColumns.value, intervalExportRows.value)
  )
}

const summaryItems = computed(() => {
  if (isIntradayErlang.value) {
    return [
      {
        label: `Annual ${channelTerms.value.contactLabel}`,
        value: props.formatWhole(props.planSummary?.annualContacts)
      },
      {
        label: 'Annual Workload Hrs',
        value: props.formatWhole(props.planSummary?.annualWorkloadHours)
      },
      {
        label: 'Annual Base Erlang Hrs',
        value: formatOptionalNumber(props.planSummary?.annualErlangStaffedHours, 1)
      },
      {
        label: 'Annual Total Req Hrs',
        value: formatOptionalNumber(props.planSummary?.annualRequiredStaffHours, 1)
      },
      {
        label: 'Avg Total Req HC',
        value: formatOptionalNumber(props.planSummary?.averageRequiredHeadcount, 1)
      }
    ]
  }

  return [
    {
      label: `Annual ${channelTerms.value.contactLabel}`,
      value: props.formatWhole(props.planSummary?.annualContacts)
    },
    {
      label: 'Annual Workload Hours',
      value: props.formatWhole(props.planSummary?.annualWorkloadHours)
    },
    {
      label: 'Avg Required Staff Hours',
      value: formatOptionalNumber(props.planSummary?.averageRequiredStaffHours, 1)
    },
    {
      label: 'Avg Required Headcount',
      value: formatOptionalNumber(props.planSummary?.averageRequiredHeadcount, 1)
    },
    {
      label: 'Peak Required Headcount',
      value: formatOptionalNumber(props.planSummary?.peakMonth?.requiredHeadcount, 1)
    },
    {
      label: 'Peak Day Required Headcount',
      value: formatOptionalNumber(props.planSummary?.peakDayMonth?.peakDayRequiredHeadcount, 1)
    }
  ]
})

const summaryColumns = computed(() =>
  isIntradayErlang.value ? 'md:grid-cols-2 xl:grid-cols-5' : 'md:grid-cols-2 xl:grid-cols-6'
)

const contactsSourceMessage = computed(() => {
  if (isIntradayErlang.value) {
    if (props.demandSource?.mode === DEMAND_SOURCE_FORECAST && props.currentDemandSourceSummary?.projectName) {
      if (appliedDailyForecastRowCount.value > 0) {
        return `Forecast monthly values are applied from ${props.currentDemandSourceSummary.projectName}. ${props.formatWhole(appliedDailyForecastRowCount.value)} daily rows are available for Intraday Erlang.`
      }

      return `Forecast monthly values are applied from ${props.currentDemandSourceSummary.projectName}, but daily rows are missing. Apply a modeled or imported daily forecast before running Intraday Erlang.`
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

  if (status === 'loading') {
    return message || 'Staffing calculations are running.'
  }

  if (status === 'ready') {
    if (props.erlangStatus?.calculatedAt) {
      return `Staffing calculations are complete and stored with this plan. Last run: ${formatCalculatedAt(props.erlangStatus.calculatedAt)}.`
    }

    return 'Staffing calculations are complete and stored with this plan.'
  }

  if (status === 'ready_to_run') {
    return message || 'Run staffing calculations to populate monthly Erlang staffing outputs.'
  }

  if (status === 'stale') {
    return message || 'Plan inputs changed after the last staffing calculation. Rerun staffing calculations to refresh the Erlang outputs.'
  }

  return message
})

const requirementModeTone = computed(() => {
  if (!isIntradayErlang.value) {
    return 'info'
  }

  return ['error', 'stale', 'forecast_required', 'aht_required', 'service_level_required', 'schedule_required', 'intraday_required', 'no_open_days'].includes(props.erlangStatus?.status)
    ? 'error'
    : 'info'
})

const formatCalculatedAt = (value) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'recently'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

const erlangProgress = computed(() => props.erlangStatus?.progress || {})
const erlangProgressPercent = computed(() => {
  const totalMonths = Number(erlangProgress.value.totalMonths) || 0
  const completedMonths = Number(erlangProgress.value.completedMonths) || 0

  if (totalMonths <= 0) {
    return 0
  }

  return Math.max(0, Math.min(100, (completedMonths / totalMonths) * 100))
})
const erlangProgressRounded = computed(() => Math.round(erlangProgressPercent.value))
const erlangProgressLabel = computed(() => {
  const completedMonths = Number(erlangProgress.value.completedMonths) || 0
  const totalMonths = Number(erlangProgress.value.totalMonths) || 0
  const currentMonthLabel = String(erlangProgress.value.currentMonthLabel || '').trim()

  if (!totalMonths) {
    return 'Preparing staffing calculations.'
  }

  if (completedMonths >= totalMonths) {
    return `${completedMonths} of ${totalMonths} months calculated.`
  }

  return currentMonthLabel
    ? `Calculating ${currentMonthLabel}. ${completedMonths} of ${totalMonths} months complete.`
    : `${completedMonths} of ${totalMonths} months complete.`
})
const erlangRunButtonLabel = computed(() => {
  if (props.erlangStatus?.isRunning) {
    return 'Running Calculations'
  }

  return props.erlangStatus?.hasResults
    ? 'Rerun Staffing Calculations'
    : 'Run Staffing Calculations'
})
</script>

<template>
  <section class="monthly-tab-panel">
    <AppSectionHeader :title="requirementTitle" />

    <AppStatStrip :items="summaryItems" :columns="summaryColumns" />

    <AppStatusMessage>
      {{ contactsSourceMessage }}
    </AppStatusMessage>

    <AppStatusMessage v-if="requirementModeMessage" :tone="requirementModeTone">
      {{ requirementModeMessage }}
    </AppStatusMessage>

    <div
      v-if="isIntradayErlang && props.erlangStatus?.isRunning"
      class="grid gap-1 rounded-lg border border-[#d5e0ea] bg-white px-4 py-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-[#15395f]">
        <span>{{ erlangProgressLabel }}</span>
        <span>{{ props.formatNumber(erlangProgressPercent, 0) }}%</span>
      </div>
      <div
        class="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="erlangProgressRounded"
        aria-label="Staffing calculation progress"
      >
        <div
          class="h-full rounded-full bg-[#1f6f9f] transition-[width] duration-300"
          :style="{ width: `${erlangProgressPercent}%` }"
        />
      </div>
    </div>

    <section class="grid gap-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AppSectionHeader title="Monthly Requirement Worksheet" />

        <div class="flex flex-wrap items-center gap-2">
          <AppButton
            v-if="isIntradayErlang"
            variant="primary"
            size="sm"
            :icon="mdiCalculatorVariantOutline"
            :disabled="!props.erlangStatus?.canRun"
            @click="emit('run-erlang')"
          >
            {{ erlangRunButtonLabel }}
          </AppButton>
          <AppButton
            variant="secondary"
            size="sm"
            :icon="mdiDownload"
            :disabled="!monthlyExportRows.length"
            @click="downloadMonthlyCsv"
          >
            Download Monthly CSV
          </AppButton>
          <AppButton
            v-if="isIntradayErlang"
            variant="secondary"
            size="sm"
            :icon="mdiDownload"
            :disabled="!intervalExportRows.length"
            @click="downloadIntervalCsv"
          >
            Download Interval CSV
          </AppButton>
        </div>
      </div>

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
          <col class="plan-col-output plan-col-output-base" />
          <col class="plan-col-output plan-col-output-occupancy" />
          <col class="plan-col-output plan-col-output-service" />
          <col class="plan-col-context plan-col-context-scheduled" />
          <col class="plan-col-context plan-col-context-random" />
          <col class="plan-col-context plan-col-context-design" />
          <col class="plan-col-context plan-col-context-ratio" />
          <col class="plan-col-output plan-col-output-required" />
          <col class="plan-col-output plan-col-output-average" />
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
              <th colspan="5" scope="colgroup" class="plan-output-group-head">Base Erlang Need</th>
              <th colspan="4" scope="colgroup">Overhead</th>
              <th colspan="3" scope="colgroup" class="plan-output-group-head">Total Staffing Need</th>
            </template>
            <template v-else>
              <th colspan="4" scope="colgroup">Inputs</th>
              <th colspan="5" scope="colgroup">Context</th>
              <th colspan="4" scope="colgroup" class="plan-output-group-head">Outputs</th>
            </template>
          </tr>
          <tr>
            <th title="Planning month. Click a month name to highlight that row.">Month</th>
            <th :title="isIntradayErlang ? 'Daily forecast-owned contacts are flattened into monthly workload context in Intraday Erlang mode.' : `Monthly ${channelTerms.contactPlural} used to create workload hours.`">{{ channelTerms.contactLabel }}</th>
            <th :title="isIntradayErlang ? 'Monthly AHT assumptions come from the applied forecast and stay read-only in Intraday Erlang mode.' : 'Average handling time in seconds used to create workload hours.'">{{ channelTerms.handleTimeLabel }}</th>
            <th
              v-if="!isIntradayErlang"
              title="Peak Day Uplift % increases average open-day contacts to represent the busiest day of the month."
            >
              <span class="plan-head-label">Peak Day<br />%</span>
            </th>
            <th title="Open days flowing in from the call-center operating days and holiday closures.">
              <span class="plan-head-label">Open Days</span>
            </th>
            <th v-if="isIntradayErlang" title="Monthly workload hours calculated from contacts and AHT.">
              <span class="plan-head-label plan-output-head-label">Wkld Hrs</span>
            </th>
            <th v-if="isIntradayErlang" title="Monthly staffed hours returned from interval Erlang calculations.">
              <span class="plan-head-label plan-output-head-label">Erlang Hrs</span>
            </th>
            <th
              v-if="isIntradayErlang"
              title="Base headcount before overhead or random loss, calculated as monthly Erlang hours divided by monthly paid hours."
            >
              <span class="plan-head-label plan-output-head-label">Base HC</span>
            </th>
            <th
              v-if="isIntradayErlang"
              title="Weighted monthly occupancy calculated from the interval Erlang outputs."
            >
              <span class="plan-head-label plan-output-head-label">Occ. %</span>
            </th>
            <th
              v-if="isIntradayErlang"
              title="Weighted achieved service level calculated from the interval Erlang outputs."
            >
              <span class="plan-head-label plan-output-head-label">SL %</span>
            </th>
            <th title="Scheduled percentage flowing in from the presence / utilization step.">Sched. %</th>
            <th title="Total scheduled random loss flowing in from the random step.">
              <span class="plan-head-label">Random %</span>
            </th>
            <th title="Design Factor is calculated as Scheduled % - Total Random Loss %.">
              <span class="plan-head-label">Design %</span>
            </th>
            <th title="Workload Staffing Ratio is calculated as 1 / Design Factor.">
              <span class="plan-head-label">Staff Ratio</span>
            </th>
            <th v-if="!isIntradayErlang" title="Monthly workload hours calculated from contacts and AHT.">
              <span class="plan-head-label">Workload<br />Hrs</span>
            </th>
            <th v-if="!isIntradayErlang" title="Required staff hours calculated as Workload Hours x Workload Staffing Ratio.">
              <span class="plan-head-label">Required<br />Hrs</span>
            </th>
            <th
              v-if="isIntradayErlang"
              title="Total required staff hours after applying overhead and random loss assumptions to monthly Erlang hours."
            >
              <span class="plan-head-label plan-output-head-label">Total Hrs</span>
            </th>
            <th :title="isIntradayErlang ? 'Total required headcount calculated from total required hours and paid hours per month after applying overhead and random loss assumptions.' : 'Required headcount calculated as Required Staff Hours / Monthly FTE Paid Hours from the presence / utilization step.'">
              <span :class="['plan-head-label', isIntradayErlang && 'plan-output-head-label']">
                {{ isIntradayErlang ? 'Total HC' : 'Avg Req' }}<template v-if="!isIntradayErlang"><br />HC</template>
              </span>
            </th>
            <th
              v-if="isIntradayErlang"
              class="plan-adjustable-head"
            >
              <span class="plan-head-cell plan-head-cell-select">
                <AppSelect
                  v-model="selectedIntervalPressureMetric"
                  :options="intervalPressureMetricOptions"
                  option-label="label"
                  option-value="value"
                  compact
                  plain
                  class="plan-head-select"
                  aria-label="Interval pressure headcount metric"
                />
                <AppInfoTooltip
                  label="interval pressure headcount metric"
                  content="Choose the Erlang staffing pressure metric for this column. Peak Day uses the busiest open day. P80 and P90 use monthly interval total headcount after applying the staffing ratio."
                  class="plan-head-info"
                />
              </span>
            </th>
            <th
              v-if="!isIntradayErlang"
              title="Peak-day headcount calculated from average open-day contacts plus Peak Day Uplift %."
            >
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
              {{ props.formatWhole(planMonths[record.monthIndex].contacts) }}
            </td>
            <td>
              <template v-if="isIntradayErlang">
                {{ formatOptionalNumber(resolveWorkloadRatioAht(record.monthIndex), 0) }}
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
            <td v-if="isIntradayErlang" class="plan-output-cell">{{ formatOptionalNumber(resolveBaseHeadcount(record), 1) }}</td>
            <td v-if="isIntradayErlang" class="plan-output-cell">{{ formatOptionalPercent(record.weightedOccupancyPercent, 1) }}</td>
            <td v-if="isIntradayErlang" class="plan-output-cell">{{ formatOptionalPercent(record.weightedServiceLevelPercent, 1) }}</td>
            <td>{{ props.formatPercent(record.scheduledPercent, 1) }}</td>
            <td>{{ props.formatPercent(record.randomLossPercent, 1) }}</td>
            <td>{{ props.formatPercent(record.designFactorPercent, 1) }}</td>
            <td>{{ record.workloadStaffingRatio == null ? '—' : props.formatFactor(record.workloadStaffingRatio) }}</td>
            <td v-if="!isIntradayErlang">{{ props.formatNumber(record.workloadHours, 1) }}</td>
            <td v-if="!isIntradayErlang">{{ formatOptionalNumber(record.requiredStaffHours, 1) }}</td>
            <td v-if="isIntradayErlang" class="plan-output-cell">{{ formatOptionalNumber(record.requiredStaffHours, 1) }}</td>
            <td :class="{ 'plan-output-cell': isIntradayErlang }">{{ formatOptionalNumber(record.requiredHeadcount, 1) }}</td>
            <td v-if="isIntradayErlang" class="plan-output-cell">
              {{ formatOptionalNumber(resolveSelectedIntervalPressureHeadcount(record), 1) }}
            </td>
            <td v-if="!isIntradayErlang">
              {{ formatOptionalNumber(record.peakDayRequiredHeadcount, 1) }}
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
