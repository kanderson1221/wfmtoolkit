<script setup>
import { computed, reactive } from 'vue'
import {
  FULL_MONTH_LABELS,
  PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
  deriveTrainingClassMetrics,
  isValidTrainingClassHireCount,
  toNumber
} from '../plannerModel'

import PlannerActualsPanel from './planner/PlannerActualsPanel.vue'
import PlannerForecastPanel from './planner/PlannerForecastPanel.vue'
import PlannerMonthlyPlanTab from './planner/PlannerMonthlyPlanTab.vue'
import PlannerPresenceTab from './planner/PlannerPresenceTab.vue'
import PlannerRandomTab from './planner/PlannerRandomTab.vue'
import PlannerSectionNav from './planner/PlannerSectionNav.vue'
import PlannerStaffingPlanTab from './planner/PlannerStaffingPlanTab.vue'
import PlannerWorkspaceHeader from './planner/PlannerWorkspaceHeader.vue'
import AppBreadcrumbs from './ui/AppBreadcrumbs.vue'
import AppButton from './ui/AppButton.vue'
import AppPanel from './ui/AppPanel.vue'
import AppStatusMessage from './ui/AppStatusMessage.vue'
import {
  buildPlanningCenterHash,
  buildPlanningGroupHash,
  buildPlanningHomeHash
} from '../appRoutes'
import { useMonthlyPlanBuilder } from '../composables/useMonthlyPlanBuilder'

const props = defineProps({
  initialPlan: {
    type: Object,
    default: null
  },
  centerDefaults: {
    type: Object,
    default: null
  },
  groupPlans: {
    type: Array,
    default: () => []
  },
  prefilledYear: {
    type: Number,
    default: null
  },
  draftKey: {
    type: String,
    default: ''
  },
  storageScope: {
    type: String,
    default: 'default'
  },
  storageRefreshToken: {
    type: Number,
    default: 0
  },
  forecastSeed: {
    type: Object,
    default: null
  },
  savePlanAction: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

const builder = reactive(useMonthlyPlanBuilder(props, emit))

const TOTAL_PLAN_MONTHS = FULL_MONTH_LABELS.length
const reviewedSections = computed(() => new Set(builder.reviewedSections))
const isIntradayErlang = computed(() => builder.requirementMethod === PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG)
const variabilityTitle = computed(() => isIntradayErlang.value ? 'Erlang Inputs' : 'Random/Variability')
const requirementTitle = computed(() => 'Demand Model')
const hasAppliedForecastDemand = computed(() =>
  builder.demandSource.mode === 'forecast' &&
  Array.isArray(builder.demandSource.forecastMonthSnapshot) &&
  builder.demandSource.forecastMonthSnapshot.length > 0
)

const formatMonthCoverage = (count, total = TOTAL_PLAN_MONTHS) => `${count}/${total} months`
const formatMonthCount = (count) => `${count} ${count === 1 ? 'month' : 'months'}`

const getFirstMissingMonthLabel = (items, predicate) => {
  const monthIndex = items.findIndex((item, index) => !predicate(item, index))
  return monthIndex === -1 ? '' : FULL_MONTH_LABELS[monthIndex]
}

const availabilityProgress = computed(() => {
  const configuredCount = builder.monthlyRecords.filter(
    (record) => record.openDays > 0 && record.paidHoursPerMonth > 0 && record.scheduledPercent > 0
  ).length
  const firstMissingMonthLabel = getFirstMissingMonthLabel(
    builder.monthlyRecords,
    (record) => record.openDays > 0 && record.paidHoursPerMonth > 0 && record.scheduledPercent > 0
  )
  const defaultsPendingReview = configuredCount === TOTAL_PLAN_MONTHS && !reviewedSections.value.has('availability')
  const isReady = configuredCount === TOTAL_PLAN_MONTHS && reviewedSections.value.has('availability')

  return {
    id: 'availability',
    title: 'Agent Availability',
    description: 'Set paid time, absence, and off-phone losses so one FTE has realistic scheduled capacity.',
    statusLabel: defaultsPendingReview ? 'Using defaults' : formatMonthCoverage(configuredCount),
    detail: isReady
      ? 'Scheduled capacity is modeled across the full year.'
      : defaultsPendingReview
        ? 'Monthly paid time and off-phone assumptions are still using the starting defaults.'
      : `Scheduled capacity is incomplete in ${firstMissingMonthLabel}.`,
    blocker: isReady
      ? ''
      : defaultsPendingReview
        ? 'Open Agent Availability and confirm the default paid time and loss assumptions.'
        : `Open days or scheduled capacity drop to zero in ${firstMissingMonthLabel}.`,
    tone: isReady ? 'ready' : defaultsPendingReview || configuredCount > 0 ? 'attention' : 'default',
    isReady,
    isStarted: reviewedSections.value.has('availability'),
    nextTitle: 'Agent Availability',
    nextDescription: defaultsPendingReview
      ? 'Review the default paid time and off-phone assumptions before treating the yearly capacity model as complete.'
      : 'Confirm monthly paid time and off-phone losses so the model knows how much scheduled time one FTE can deliver.'
  }
})

const variabilityProgress = computed(() => {
  if (isIntradayErlang.value) {
    const hasServiceGoal =
      Number(builder.intradayErlangServiceLevelPercent) > 0 &&
      Number(builder.intradayErlangServiceLevelThresholdSeconds) > 0
    const hasOperatingWindow =
      Boolean(String(builder.intradayErlangOpenTime || '').trim()) &&
      Boolean(String(builder.intradayErlangCloseTime || '').trim())
    const intervalRatios = Array.isArray(builder.intradayErlangProfile?.intervalRatios)
      ? builder.intradayErlangProfile.intervalRatios
      : []
    const hasIntradayProfile =
      Number(builder.intradayErlangProfile?.intervalLengthMinutes || 0) === 30 &&
      intervalRatios.length > 0
    const hasMaxOccupancy = toNumber(builder.randomDefaults?.occupancyPercent, 0) > 0
    const hasAdherence = toNumber(builder.randomDefaults?.adherencePercent, 0) > 0
    const configuredCount = [hasServiceGoal, hasOperatingWindow, hasIntradayProfile, hasMaxOccupancy, hasAdherence].filter(Boolean).length
    const defaultsPendingReview = configuredCount === 5 && !reviewedSections.value.has('variability')
    const isReady = configuredCount === 5 && reviewedSections.value.has('variability')

    return {
      id: 'variability',
      title: variabilityTitle.value,
      description: 'Review the staffing-group inputs, occupancy cap, and adherence assumption that shape the monthly Erlang overhead.',
      statusLabel: defaultsPendingReview ? 'Using defaults' : `${configuredCount}/5 inputs`,
      detail: isReady
        ? 'Service goal, operating window, intraday profile, occupancy cap, and adherence are ready for interval calculations.'
        : defaultsPendingReview
          ? 'The staffing-group service goal, operating window, 30-minute interval profile, occupancy cap, and adherence assumption are loaded. Review them before running Erlang.'
          : !hasServiceGoal
            ? 'Service level is still missing from the staffing group settings.'
            : !hasOperatingWindow
              ? 'Operating hours are still missing from the call center settings.'
              : !hasIntradayProfile
                ? 'A 30-minute intraday profile is still missing from the staffing group.'
                : !hasMaxOccupancy
                  ? 'Set a valid occupancy cap before running Erlang.'
                  : 'Set a valid adherence assumption before running Erlang.',
      blocker: isReady
        ? ''
        : defaultsPendingReview
          ? 'Open Erlang Inputs and confirm the inherited assumptions before calculating interval staffing.'
          : !hasServiceGoal
            ? 'Set a staffing group service goal before calculating Erlang.'
            : !hasOperatingWindow
              ? 'Set call center operating hours before calculating Erlang.'
              : !hasIntradayProfile
                ? 'Configure a 30-minute intraday profile before calculating Erlang.'
                : !hasMaxOccupancy
                  ? 'Set a valid max occupancy before calculating Erlang.'
                  : 'Set a valid adherence assumption before calculating Erlang.',
      tone: isReady ? 'ready' : configuredCount > 0 ? 'attention' : 'default',
      isReady,
      isStarted: reviewedSections.value.has('variability') || configuredCount > 0,
      nextTitle: variabilityTitle.value,
      nextDescription: defaultsPendingReview
        ? 'Confirm the inherited service goal, operating window, intraday profile, occupancy cap, and adherence before reviewing monthly Erlang outputs.'
        : 'Review the staffing-group assumptions plus the occupancy cap and adherence that shape the interval Erlang result.'
    }
  }

  if (builder.useMonthlyRandomOverrides) {
    const configuredCount = builder.randomMonths.filter(
      (month) => toNumber(month.occupancyPercent, 0) > 0 && toNumber(month.adherencePercent, 0) > 0
    ).length
    const firstMissingMonthLabel = getFirstMissingMonthLabel(
      builder.randomMonths,
      (month) => toNumber(month.occupancyPercent, 0) > 0 && toNumber(month.adherencePercent, 0) > 0
    )
    const isReady = configuredCount === TOTAL_PLAN_MONTHS

    return {
      id: 'variability',
      title: variabilityTitle.value,
      description: isIntradayErlang.value
        ? 'Set the occupancy cap and adherence overhead that bridge monthly Erlang hours into final staffing outputs.'
        : 'Apply adherence and occupancy assumptions before the requirement is finalized.',
      statusLabel: formatMonthCoverage(configuredCount),
      detail: isReady
        ? 'Monthly occupancy and adherence overrides are set across the full year.'
        : `Occupancy or adherence is missing in ${firstMissingMonthLabel}.`,
      blocker: isReady ? '' : `Set occupancy and adherence assumptions for ${firstMissingMonthLabel}.`,
      tone: isReady ? 'ready' : configuredCount > 0 ? 'attention' : 'default',
      isReady,
      isStarted: configuredCount > 0,
      nextTitle: variabilityTitle.value,
      nextDescription: isIntradayErlang.value
        ? 'Review the occupancy cap and adherence overhead before finalizing the monthly Erlang outputs.'
        : 'Set the occupancy and adherence assumptions that convert scheduled time into a usable design factor.'
    }
  }

  const defaultsConfigured =
    toNumber(builder.randomDefaults.occupancyPercent, 0) > 0 &&
    toNumber(builder.randomDefaults.adherencePercent, 0) > 0
  const defaultsPendingReview = defaultsConfigured && !reviewedSections.value.has('variability')
  const isReady = defaultsConfigured && reviewedSections.value.has('variability')

  return {
    id: 'variability',
    title: variabilityTitle.value,
    description: isIntradayErlang.value
      ? 'Set the occupancy cap and adherence overhead that bridge monthly Erlang hours into final staffing outputs.'
      : 'Apply adherence and occupancy assumptions before the requirement is finalized.',
    statusLabel: defaultsPendingReview ? 'Using defaults' : defaultsConfigured ? 'Defaults confirmed' : 'Needs review',
    detail: isReady
      ? `Shared occupancy and adherence defaults apply across all ${TOTAL_PLAN_MONTHS} months.`
      : defaultsPendingReview
        ? `Shared occupancy and adherence defaults are in place, but they still need review before the design factor is considered complete.`
      : 'Occupancy and adherence defaults are still missing.',
    blocker: isReady
      ? ''
      : defaultsPendingReview
        ? `Open ${variabilityTitle.value} and confirm the default assumptions for this plan.`
        : 'Set occupancy and adherence defaults before finalizing requirement.',
    tone: isReady ? 'ready' : defaultsConfigured ? 'attention' : 'default',
    isReady,
    isStarted: reviewedSections.value.has('variability'),
    nextTitle: variabilityTitle.value,
    nextDescription: defaultsPendingReview
      ? 'Review the default occupancy and adherence assumptions before locking in the next step.'
      : isIntradayErlang.value
        ? 'Set the occupancy cap and adherence overhead before reviewing the monthly Erlang outputs.'
        : 'Set the occupancy and adherence assumptions that convert scheduled time into a usable design factor.'
  }
})

const intradayForecastMonthSnapshot = computed(() =>
  Array.isArray(builder.demandSource?.forecastMonthSnapshot)
    ? builder.demandSource.forecastMonthSnapshot
    : []
)

const intradayForecastDailySnapshot = computed(() =>
  Array.isArray(builder.demandSource?.forecastDailySnapshot)
    ? builder.demandSource.forecastDailySnapshot
    : []
)

const requiredForecastMonthIndexes = computed(() => {
  const indexes = Array.isArray(builder.demandSourceSummary?.requiredMonthIndexes)
    ? builder.demandSourceSummary.requiredMonthIndexes
    : []

  return indexes.length
    ? indexes
    : Array.from({ length: TOTAL_PLAN_MONTHS }, (_, monthIndex) => monthIndex)
})

const intradayForecastMonthsByIndex = computed(() =>
  new Map(
    intradayForecastMonthSnapshot.value.map((month, fallbackIndex) => [
      Number.isInteger(Number(month?.monthIndex)) ? Number(month.monthIndex) : fallbackIndex,
      month
    ])
  )
)

const intradayMonthsWithForecastAht = computed(() =>
  requiredForecastMonthIndexes.value.filter(
    (monthIndex) => toNumber(intradayForecastMonthsByIndex.value.get(monthIndex)?.ahtSeconds, 0) > 0
  ).length
)

const intradayFirstMissingAhtMonthLabel = computed(() => {
  const missingMonthIndex = requiredForecastMonthIndexes.value.find(
    (monthIndex) => toNumber(intradayForecastMonthsByIndex.value.get(monthIndex)?.ahtSeconds, 0) <= 0
  )

  return missingMonthIndex == null
    ? ''
    : intradayForecastMonthsByIndex.value.get(missingMonthIndex)?.monthLabel ||
        FULL_MONTH_LABELS[missingMonthIndex] ||
        ''
})

const forecastProgress = computed(() => {
  const forecastName = builder.demandSourceSummary?.projectName || 'Saved Forecast'
  const matchedMonthCount = Number(builder.demandSourceSummary?.matchedMonthCount || 0)
  const requiredMonthCount = Number(builder.demandSourceSummary?.requiredMonthCount || TOTAL_PLAN_MONTHS)
  const coverageLabel = builder.demandSourceSummary?.coverageLabel || formatMonthCoverage(matchedMonthCount)

  if (builder.hasLegacyManualDemandSource) {
    return {
      id: 'forecast',
      title: 'Forecasts',
      statusLabel: 'Legacy manual',
      overviewValue: 'Legacy manual',
      overviewMeta: 'Convert this plan to a saved staffing-group forecast before continuing.',
      summary: 'This plan still relies on legacy manual monthly demand.',
      blocker: 'Open Forecasts and convert the legacy monthly demand into a saved staffing-group forecast.',
      tone: 'attention',
      isReady: false,
      isStarted: true,
      nextTitle: 'Forecasts',
      nextDescription: 'Convert the legacy manual monthly demand into a saved staffing-group forecast before reviewing the rest of the plan.'
    }
  }

  if (!hasAppliedForecastDemand.value) {
    return {
      id: 'forecast',
      title: 'Forecasts',
      statusLabel: 'Not applied',
      overviewValue: 'Not applied',
      overviewMeta: 'Apply a saved staffing-group forecast to seed this plan.',
      summary: 'No saved staffing-group forecast is driving this plan yet.',
      blocker: 'Open Forecasts and apply a saved staffing-group forecast before moving on.',
      tone: 'default',
      isReady: false,
      isStarted: Boolean(builder.selectedForecastProjectId),
      nextTitle: 'Forecasts',
      nextDescription: 'Apply a saved staffing-group forecast first so the rest of the planner is working from the right demand basis.'
    }
  }

  if (isIntradayErlang.value) {
    const hasDailyForecast = intradayForecastDailySnapshot.value.length > 0
    const hasMonthlyAhtCoverage = intradayMonthsWithForecastAht.value === requiredMonthCount
    const missingAhtMonthLabel = intradayFirstMissingAhtMonthLabel.value

    if (!hasDailyForecast) {
      return {
        id: 'forecast',
        title: 'Forecasts',
        statusLabel: 'Daily rows missing',
        overviewValue: 'Incomplete',
        overviewMeta: `${forecastName} is applied, but it does not include the daily demand rows required for Erlang.`,
        summary: `${forecastName} is applied, but the daily demand rows required for Erlang are missing.`,
        blocker: 'Apply a saved daily staffing-group forecast before continuing with Intraday Erlang.',
        tone: 'attention',
        isReady: false,
        isStarted: true,
        nextTitle: 'Forecasts',
        nextDescription: 'Apply a saved daily staffing-group forecast so Erlang can flatten real forecast days into 30-minute intervals.'
      }
    }

    if (!hasMonthlyAhtCoverage) {
      return {
        id: 'forecast',
        title: 'Forecasts',
        statusLabel: 'AHT incomplete',
        overviewValue: 'AHT incomplete',
        overviewMeta: `${forecastName} is applied for ${coverageLabel}, but monthly AHT is still missing in ${missingAhtMonthLabel}.`,
        summary: `${forecastName} is applied for ${coverageLabel}, but monthly AHT is still missing in ${missingAhtMonthLabel}.`,
        blocker: `Update the forecast so ${missingAhtMonthLabel} has a monthly AHT assumption before continuing.`,
        tone: 'attention',
        isReady: false,
        isStarted: true,
        nextTitle: 'Forecasts',
        nextDescription: 'Finish the monthly AHT assumptions in the saved forecast before reviewing the Erlang setup.'
      }
    }

    return {
      id: 'forecast',
      title: 'Forecasts',
      statusLabel: 'Applied',
      overviewValue: 'Ready',
      overviewMeta: `${forecastName} is applied with daily demand and monthly AHT across ${coverageLabel}.`,
      summary: `${forecastName} is applied with daily demand and monthly AHT across ${coverageLabel}.`,
      blocker: '',
      tone: 'ready',
      isReady: true,
      isStarted: true,
      nextTitle: 'Agent Availability',
      nextDescription: 'Review Agent Availability next so the planner can bridge the forecast demand into staffing capacity.'
    }
  }

  if (matchedMonthCount < requiredMonthCount) {
    return {
      id: 'forecast',
      title: 'Forecasts',
      statusLabel: 'Coverage incomplete',
      overviewValue: 'Coverage incomplete',
      overviewMeta: `${forecastName} is applied for ${coverageLabel}.`,
      summary: `${forecastName} is applied for ${coverageLabel}.`,
      blocker: 'Apply a saved forecast with complete required-month coverage before reviewing the demand model.',
      tone: 'attention',
      isReady: false,
      isStarted: true,
      nextTitle: 'Forecasts',
      nextDescription: `Replace or refresh the saved forecast so all ${requiredMonthCount} required forecast months are covered before continuing.`
    }
  }

  return {
    id: 'forecast',
    title: 'Forecasts',
    statusLabel: 'Applied',
    overviewValue: 'Ready',
    overviewMeta: `${forecastName} is applied with forecast contacts and starting AHT across ${coverageLabel}.`,
    summary: `${forecastName} is applied with forecast contacts and starting AHT across ${coverageLabel}.`,
    blocker: '',
    tone: 'ready',
    isReady: true,
    isStarted: true,
    nextTitle: 'Agent Availability',
    nextDescription: 'Review Agent Availability next so the plan can translate forecast demand into scheduled capacity.'
  }
})

const requirementProgress = computed(() => {
  if (isIntradayErlang.value) {
    const erlangStatus = String(builder.erlangStatus?.status || '').trim()
    const hasDailyForecast = intradayForecastDailySnapshot.value.length > 0
    const configuredCount = intradayMonthsWithForecastAht.value
    const requiredMonthCount = Number(builder.demandSourceSummary?.requiredMonthCount || TOTAL_PLAN_MONTHS)
    const isReady = erlangStatus === 'ready'
    const isLoading = erlangStatus === 'loading'
    const hasStoredResults = Boolean(builder.erlangStatus?.hasResults)
    const isStale = erlangStatus === 'stale'
    const isStarted = hasDailyForecast || isLoading || isReady || hasStoredResults
    const forecastName = builder.demandSourceSummary?.projectName || ''
    const missingAhtMonthLabel = intradayFirstMissingAhtMonthLabel.value

    return {
      id: 'requirement',
      title: requirementTitle.value,
      description: 'Use the applied daily forecast, flatten it to 30-minute intervals, and roll monthly Erlang staffing outputs back into the plan.',
      statusLabel: isReady
        ? 'Calculated'
        : isLoading
          ? 'Calculating'
          : isStale
            ? 'Rerun needed'
            : erlangStatus === 'ready_to_run'
              ? 'Ready to run'
              : formatMonthCoverage(configuredCount, requiredMonthCount),
      detail: isReady
        ? forecastName
          ? `Daily demand and monthly AHT are locked from ${forecastName}. Interval Erlang outputs are stored with this plan.`
          : 'Daily forecast demand and monthly AHT assumptions are locked and driving stored monthly Erlang outputs.'
        : isLoading
          ? 'Flattening the applied daily forecast into 30-minute intervals and calculating monthly Erlang staffing outputs.'
          : isStale
            ? String(builder.erlangStatus?.message || '').trim()
          : !hasDailyForecast
            ? 'Apply a saved daily forecast to provide the daily demand stream this plan requires.'
            : configuredCount < requiredMonthCount
              ? `Monthly AHT assumptions are still missing in ${missingAhtMonthLabel}.`
              : forecastName
                ? `Daily forecast demand is applied from ${forecastName}. Run the interval Erlang calculation to populate monthly staffing outputs.`
                : 'Daily forecast demand is applied. Run the interval Erlang calculation to populate monthly staffing outputs.',
      blocker: isReady ? '' : String(builder.erlangStatus?.message || '').trim(),
      tone: isReady ? 'ready' : isStarted || configuredCount > 0 ? 'attention' : 'default',
      isReady,
      isStarted,
      nextTitle: requirementTitle.value,
      nextDescription: isReady
        ? 'Review the calculated monthly Erlang outputs before finalizing staffing.'
        : 'Apply a saved daily forecast with monthly AHT assumptions, then run the interval Erlang calculation for this plan.'
    }
  }

  const configuredCount = builder.planMonths.filter(
    (month) => toNumber(month.contacts, 0) > 0 && toNumber(month.ahtSeconds, 0) > 0
  ).length
  const firstMissingMonthLabel = getFirstMissingMonthLabel(
    builder.planMonths,
    (month) => toNumber(month.contacts, 0) > 0 && toNumber(month.ahtSeconds, 0) > 0
  )
  const isReady = configuredCount === TOTAL_PLAN_MONTHS

  return {
    id: 'requirement',
    title: requirementTitle.value,
    description: isIntradayErlang.value
      ? 'Shape the monthly shell that will flatten contacts and AHT into intervals, run Erlang, and roll the result back up.'
      : 'Use the applied staffing-group forecast to populate read-only demand inputs, then translate that workload into required frontline headcount.',
    statusLabel: formatMonthCoverage(configuredCount),
    detail: isReady
      ? hasAppliedForecastDemand.value && builder.demandSourceSummary?.projectName
        ? `Contacts are populated from ${builder.demandSourceSummary.projectName} and AHT is set across the full year.`
        : 'Contacts and AHT are populated for every month.'
      : configuredCount > 0
        ? hasAppliedForecastDemand.value
          ? `Forecast contacts are applied for ${configuredCount} months so far.`
          : builder.hasLegacyManualDemandSource
            ? `Legacy monthly demand is still carrying ${configuredCount} months of inputs until it is converted to a saved forecast.`
            : `Forecast-backed demand is only populated for ${configuredCount} months so far.`
        : builder.hasLegacyManualDemandSource
          ? 'This plan still relies on legacy manual demand that should be converted to a saved staffing-group forecast.'
          : 'No saved forecast has been applied to populate the monthly demand inputs yet.',
    blocker: isReady
      ? ''
      : hasAppliedForecastDemand.value
        ? `Refresh or replace the applied forecast so ${firstMissingMonthLabel} has complete demand inputs.`
        : builder.hasLegacyManualDemandSource
          ? 'Open Forecasts and convert the legacy manual monthly demand into a saved staffing-group forecast.'
          : 'Open Forecasts and apply a saved staffing-group forecast before reviewing the demand model.',
    tone: isReady ? 'ready' : configuredCount > 0 ? 'attention' : 'default',
    isReady,
    isStarted: configuredCount > 0,
    nextTitle: requirementTitle.value,
    nextDescription: isIntradayErlang.value
      ? 'Review the monthly intraday-Erlang contract that will feed interval staffing outputs back into this plan.'
      : 'Apply a saved staffing-group forecast, then review how that demand translates into required frontline headcount.'
  }
})

const staffingProgress = computed(() => {
  const startingRosterSet = toNumber(builder.startingHeadcount, 0) > 0
  const startingFrontlineSet =
    toNumber(builder.startingFrontlineHeadcount, 0) > 0 &&
    toNumber(builder.startingFrontlineHeadcount, 0) <= toNumber(builder.startingHeadcount, 0)
  const invalidTrainingClassCountIndex = builder.trainingClasses.findIndex(
    (trainingClass) => !isValidTrainingClassHireCount(trainingClass?.hireCount)
  )
  const invalidTrainingClassDateIndex = builder.trainingClasses.findIndex(
    (trainingClass) => isValidTrainingClassHireCount(trainingClass?.hireCount) && !deriveTrainingClassMetrics(
      trainingClass,
      builder.trainingSettings,
      builder.trainingCalendar
    ).isValid
  )
  const invalidTrainingClassBlocker = invalidTrainingClassCountIndex !== -1
    ? `Training class ${invalidTrainingClassCountIndex + 1} must have a hire count greater than zero.`
    : invalidTrainingClassDateIndex !== -1
      ? `Training class ${invalidTrainingClassDateIndex + 1} has an invalid hire date.`
      : ''
  const movementStarted =
    builder.effectiveTrainingClasses.length > 0 ||
    builder.staffingMonths.some((month) => toNumber(month.frontlineAttritionHeadcount, 0) > 0)
  const requiredInputsComplete = [startingRosterSet, startingFrontlineSet].filter(Boolean).length
  const isReady = startingRosterSet && startingFrontlineSet && !invalidTrainingClassBlocker

  return {
    id: 'staffing',
    title: 'Staffing Plan',
    description: 'Layer in starting position, hiring, training, and attrition against the requirement.',
    statusLabel: invalidTrainingClassBlocker ? 'Invalid class' : `${requiredInputsComplete}/2 required`,
    detail: !startingRosterSet
      ? 'Starting roster headcount is still missing.'
      : !startingFrontlineSet
        ? 'Starting frontline headcount is still missing.'
        : invalidTrainingClassBlocker
          ? invalidTrainingClassBlocker
        : builder.hasNextYearStartingFrontlineTarget && movementStarted
          ? 'Opening position is set, staffing movement is in progress, and a next January opening frontline target is active.'
          : builder.hasNextYearStartingFrontlineTarget
            ? 'Opening position is set and a next January opening frontline target is active.'
            : movementStarted
              ? 'Opening position is set and staffing movement assumptions are in progress.'
              : 'Opening position is set. Add attrition or training assumptions if the plan needs movement.',
    blocker: !startingRosterSet
      ? 'Set starting roster headcount for January.'
      : !startingFrontlineSet
        ? 'Set starting frontline headcount for January.'
        : invalidTrainingClassBlocker,
    tone: isReady ? 'ready' : requiredInputsComplete > 0 || movementStarted ? 'attention' : 'default',
    isReady,
    isStarted: requiredInputsComplete > 0 || movementStarted,
    nextTitle: 'Staffing Plan',
    nextDescription: 'Set starting roster and frontline headcount, then add attrition or training assumptions as needed.'
  }
})

const actualsStarted = computed(() => builder.actualsSummary.loadedMonthsCount > 0)

const workflowSections = computed(() => [
  {
    id: 'plan',
    label: 'Plan',
    items: [
      {
        id: 'forecast',
        title: 'Forecasts',
        statusLabel: forecastProgress.value.statusLabel,
        tone: forecastProgress.value.tone
      },
      {
        id: 'availability',
        title: 'Agent Availability',
        statusLabel: availabilityProgress.value.statusLabel,
        tone: availabilityProgress.value.tone
      },
      {
        id: 'variability',
        title: variabilityProgress.value.title,
        statusLabel: variabilityProgress.value.statusLabel,
        tone: variabilityProgress.value.tone
      },
      {
        id: 'requirement',
        title: requirementProgress.value.title,
        statusLabel: requirementProgress.value.statusLabel,
        tone: requirementProgress.value.tone
      },
      {
        id: 'staffing',
        title: 'Staffing Plan',
        statusLabel: staffingProgress.value.statusLabel,
        tone: staffingProgress.value.tone
      }
    ]
  },
  {
    id: 'actuals',
    label: 'Actuals',
    items: [
      {
        id: 'actuals',
        title: 'Actuals & Variance',
        statusLabel: actualsStarted.value ? formatMonthCount(builder.actualsSummary.loadedMonthsCount) : 'Not started',
        tone: actualsStarted.value ? 'ready' : 'default'
      }
    ]
  }
])

const budgetFinalizeProgressItems = computed(() => [
  forecastProgress.value,
  availabilityProgress.value,
  variabilityProgress.value,
  requirementProgress.value,
  staffingProgress.value
])
const budgetFinalizeBlocker = computed(() => {
  const blockedItem = budgetFinalizeProgressItems.value.find((item) => !item.isReady)
  return blockedItem?.blocker || blockedItem?.detail || 'Review the highlighted sections before finalizing.'
})
const canFinalizeBudget = computed(() =>
  builder.isDraftBudget && budgetFinalizeProgressItems.value.every((item) => item.isReady)
)
const savePlanButtonLabel = computed(() => builder.isDraftBudget ? 'Save Draft' : 'Save Plan')
const savePlanButtonVariant = computed(() => builder.isDraftBudget ? 'secondary' : 'primary')
const editableBudgetStatusMessage = computed(() =>
  canFinalizeBudget.value
    ? 'Budget draft is ready to finalize. Finalizing locks this plan as the budget baseline.'
    : `Budget draft is editable. Complete required sections before finalizing. Next: ${budgetFinalizeBlocker.value}`
)

const finalizeBudgetPlan = async () => {
  if (!canFinalizeBudget.value) {
    return
  }

  await builder.finalizePlan()
}

const handleWorkflowItemSelect = (item) => {
  if (item?.id) {
    builder.setActiveSection(item.id)
  }
}

const breadcrumbItems = computed(() => {
  const centerId = props.centerDefaults?.centerId
  const groupId = props.centerDefaults?.groupId
  const centerName = props.centerDefaults?.centerName || 'Call Center'
  const groupName = props.centerDefaults?.groupName || 'Staffing Group'

  return [
    { label: 'Home', href: '#home' },
    { label: 'Call Centers', href: buildPlanningHomeHash() },
    ...(centerId ? [{ label: centerName, href: buildPlanningCenterHash(centerId) }] : []),
    ...(centerId && groupId
      ? [{ label: groupName, href: buildPlanningGroupHash(centerId, groupId) }]
      : []),
    { label: builder.displayPlanLabel }
  ]
})
const planWorkspaceDisabled = computed(() =>
  builder.isReadOnlyBudget && builder.activeSection !== 'staffing'
)
</script>

<template>
  <section id="monthly-plan" class="calculator-section">
    <div class="app-frame">
      <div class="mb-1 flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-0.5">
          <AppBreadcrumbs :items="breadcrumbItems" />
          <h1 class="text-[clamp(1.35rem,1.8vw,1.75rem)] font-semibold tracking-[-0.04em] text-slate-950">
            {{ builder.displayPlanLabel }}
          </h1>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <PlannerWorkspaceHeader
            :autosave-status-message="builder.autosaveStatusMessage"
            :autosave-state="builder.autosaveState"
          />
          <template v-if="!builder.isReadOnlyBudget">
            <AppButton size="md" :variant="savePlanButtonVariant" @click="builder.savePlan">
              {{ savePlanButtonLabel }}
            </AppButton>
            <AppButton
              v-if="builder.isDraftBudget"
              size="md"
              variant="primary"
              :disabled="!canFinalizeBudget"
              @click="finalizeBudgetPlan"
            >
              Finalize Budget
            </AppButton>
          </template>
        </div>
      </div>

      <AppStatusMessage v-if="builder.plannerBootstrapping" class="mb-3">
        Restoring the latest planner draft from this browser.
      </AppStatusMessage>

      <AppStatusMessage v-else-if="builder.isReadOnlyBudget" tone="info" class="mb-3">
        {{ builder.readOnlyBudgetMessage }}
      </AppStatusMessage>

      <AppStatusMessage v-else-if="builder.validationMessage" tone="error" class="mb-3">
        {{ builder.validationMessage }}
      </AppStatusMessage>

      <AppStatusMessage v-else-if="builder.isDraftBudget" :tone="canFinalizeBudget ? 'success' : 'info'" class="mb-3">
        {{ editableBudgetStatusMessage }}
      </AppStatusMessage>

      <AppPanel :padded="false" class="monthly-flow-card">
        <div v-if="builder.plannerBootstrapping" class="grid gap-3 p-6">
          <AppStatusMessage>
            The planner will become editable as soon as the saved draft is restored.
          </AppStatusMessage>
        </div>

        <div v-else class="grid xl:grid-cols-[188px_minmax(0,1fr)] xl:items-start">
          <section class="border-b border-slate-200 p-3 xl:sticky xl:top-4 xl:border-b-0 xl:border-r">
            <div class="grid gap-2">
              <PlannerSectionNav
                v-model:active-id="builder.activeSection"
                :groups="workflowSections"
                @select="handleWorkflowItemSelect"
              />
            </div>
          </section>

          <section class="min-w-0 p-3">
            <fieldset :disabled="planWorkspaceDisabled" class="contents">
              <div class="grid gap-3">
                <div
                  v-if="builder.activeSection === 'forecast'"
                  class="grid gap-3"
                >
                  <PlannerForecastPanel
                    v-model:demand-source="builder.demandSource"
                    v-model:selected-forecast-project-id="builder.selectedForecastProjectId"
                    :saved-forecast-project-count="builder.savedForecastProjectCount"
                    :forecast-select-options="builder.forecastSelectOptions"
                    :forecasts-loading="builder.forecastsLoading"
                    :forecasts-error="builder.forecastsError"
                    :selected-forecast-preview-summary="builder.selectedForecastPreviewSummary"
                    :current-demand-source-summary="builder.demandSourceSummary"
                    :has-legacy-manual-demand-source="builder.hasLegacyManualDemandSource"
                    :legacy-manual-summary="builder.legacyManualSummary"
                    :forecast-can-apply="builder.forecastCanApply"
                    :forecast-apply-message="builder.forecastApplyMessage"
                    :forecast-apply-tone="builder.forecastApplyTone"
                    :read-only="builder.isReadOnlyBudget"
                    :read-only-message="builder.readOnlyBudgetMessage"
                    :requires-daily-forecast="isIntradayErlang"
                    :format-whole="builder.formatWhole"
                    :format-number="builder.formatNumber"
                    @apply-forecast="builder.applyForecastToDemand"
                    @convert-legacy-manual-demand-source="builder.convertLegacyManualDemandSource"
                  />
                </div>

                <PlannerPresenceTab
                  v-else-if="builder.activeSection === 'availability'"
                  v-model:presence-months="builder.presenceMonths"
                  :monthly-records="builder.monthlyRecords"
                  :summary="builder.presenceSummary"
                  :format-whole="builder.formatWhole"
                  :format-number="builder.formatNumber"
                  :format-percent="builder.formatPercent"
                  :continue-label="isIntradayErlang ? 'Continue to Erlang Inputs' : 'Continue to Random/Variability'"
                  @copy-action="builder.handlePresenceCopyAction"
                  @continue="builder.setActiveForecastStep('variability')"
                />

                <PlannerRandomTab
                  v-else-if="builder.activeSection === 'variability'"
                  v-model:random-defaults="builder.randomDefaults"
                  v-model:use-monthly-random-overrides="builder.useMonthlyRandomOverrides"
                  v-model:random-months="builder.randomMonths"
                  :requirement-method="builder.requirementMethod"
                  :monthly-records="builder.monthlyRecords"
                  :summary="builder.randomSummary"
                  :demand-source="builder.demandSource"
                  :current-demand-source-summary="builder.demandSourceSummary"
                  :service-level-percent="builder.intradayErlangServiceLevelPercent"
                  :service-level-threshold-seconds="builder.intradayErlangServiceLevelThresholdSeconds"
                  :operating-open-time="builder.intradayErlangOpenTime"
                  :operating-close-time="builder.intradayErlangCloseTime"
                  :intraday="builder.intradayErlangProfile"
                  :format-whole="builder.formatWhole"
                  :format-number="builder.formatNumber"
                  :format-percent="builder.formatPercent"
                  @copy-action="builder.handleRandomCopyAction"
                  @previous="builder.moveForecastStep(-1)"
                  @continue="builder.setActiveForecastStep('requirement')"
                  @toggle-override-mode="builder.setRandomOverrideMode"
                />

                <PlannerMonthlyPlanTab
                  v-else-if="builder.activeSection === 'requirement'"
                  v-model:plan-months="builder.planMonths"
                  v-model:selected-month-index="builder.selectedMonthIndex"
                  :requirement-method="builder.requirementMethod"
                  :monthly-records="builder.monthlyRecords"
                  :interval-records="builder.intradayErlangIntervalOutputs"
                  :plan-summary="builder.planSummary"
                  :demand-source="builder.demandSource"
                  :current-demand-source-summary="builder.demandSourceSummary"
                  :erlang-status="builder.erlangStatus"
                  :format-whole="builder.formatWhole"
                  :format-number="builder.formatNumber"
                  :format-percent="builder.formatPercent"
                  :format-factor="builder.formatFactor"
                  @run-erlang="builder.runIntradayErlangCalculations"
                  @previous="builder.moveForecastStep(-1)"
                  @continue="builder.setActiveSection('staffing')"
                />

                <PlannerStaffingPlanTab
                  v-else-if="builder.activeSection === 'staffing'"
                  :planning-year="builder.planningYear"
                  :requirement-method="builder.requirementMethod"
                  v-model:starting-headcount="builder.startingHeadcount"
                  v-model:starting-frontline-headcount="builder.startingFrontlineHeadcount"
                  v-model:training-settings="builder.trainingSettings"
                  v-model:next-year-opening="builder.nextYearOpening"
                  v-model:staffing-months="builder.staffingMonths"
                  v-model:training-classes="builder.trainingClasses"
                  v-model:selected-month-index="builder.selectedMonthIndex"
                  :training-calendar="builder.trainingCalendar"
                  :starting-position-inherited="builder.startingPositionInherited"
                  :starting-position-inherited-from-year="builder.startingPositionInheritedFromYear"
                  :inherited-training-classes="builder.inheritedTrainingClasses"
                  :staffing-records="builder.staffingRecords"
                  :format-number="builder.formatNumber"
                  :read-only="builder.isReadOnlyBudget"
                  :save-label="savePlanButtonLabel"
                  :year-end-target-defaults="{
                    frontlineHeadcount: builder.staffingSummary.endingFrontlineHeadcount,
                  }"
                  @recommend-classes="builder.generateRecommendedTrainingClasses"
                  @save="builder.savePlan"
                />

                <PlannerActualsPanel
                  v-else-if="builder.activeSection === 'actuals'"
                  :actuals-records="builder.actualsRecords"
                  :actuals-summary="builder.actualsSummary"
                  :actuals-erlang-status="builder.actualsErlangStatus"
                  :format-whole="builder.formatWhole"
                  :format-number="builder.formatNumber"
                  @run-actuals-erlang="builder.runActualsErlangCalculations"
                />
              </div>
            </fieldset>
          </section>
        </div>
      </AppPanel>
    </div>
  </section>
</template>
