import { computed } from 'vue'

import {
  buildPlanningGroupHash,
  buildPlanningGroupForecastsHash,
  buildPlanningHomeHash,
  buildPlanningNewPlanHash,
  buildPlanningPlanHash,
  navigateToHash
} from '../../appRoutes'
import { resolvePlanHolidaySnapshot } from '../../planningStorage'
import {
  getAnnualContacts,
  getAnnualRequiredStaffHours,
  getAverageRequiredHeadcount,
  getCenterGroups,
  getGroupPlans,
  getPeakRequiredHeadcount,
  summarizeGroup
} from '../../planningSummary'
import { computeMonthlyRecords } from '../../planner/demandModel'
import { currentYear, yearOptions } from '../monthlyPlanBuilder/shared'

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

const formatPercent = (value, digits = 1) => `${formatNumber(value, digits)}%`

const summarizeAvailability = (plan, center) => {
  const summary = plan?.summary || {}
  const planningYear = Number(plan?.planningYear) || currentYear
  const holidaySnapshot = resolvePlanHolidaySnapshot(plan, center, planningYear)

  if (
    typeof summary.averagePresencePercent === 'number' &&
    typeof summary.averageUtilizationPercent === 'number'
  ) {
    return {
      averagePresencePercent: summary.averagePresencePercent,
      averageUtilizationPercent: summary.averageUtilizationPercent
    }
  }

  const monthlyRecords = computeMonthlyRecords({
    planningYear,
    operatingWeekdays:
      Array.isArray(plan?.operatingWeekdays) && plan.operatingWeekdays.length
        ? plan.operatingWeekdays
        : Array.isArray(center?.operatingWeekdays) && center.operatingWeekdays.length
          ? center.operatingWeekdays
          : [1, 2, 3, 4, 5],
    holidayCalendarId: holidaySnapshot.holidayCalendarId,
    disabledHolidayRuleIds: holidaySnapshot.disabledHolidayRuleIds,
    customHolidays: holidaySnapshot.customHolidays,
    presenceMonths: Array.isArray(plan?.presenceMonths) ? plan.presenceMonths : [],
    randomDefaults: plan?.randomDefaults || {},
    useMonthlyRandomOverrides: Boolean(plan?.useMonthlyRandomOverrides),
    randomMonths: Array.isArray(plan?.randomMonths) ? plan.randomMonths : [],
    planMonths: Array.isArray(plan?.planMonths) ? plan.planMonths : []
  })

  if (!monthlyRecords.length) {
    return {
      averagePresencePercent: 0,
      averageUtilizationPercent: 0
    }
  }

  return {
    averagePresencePercent:
      monthlyRecords.reduce((sum, record) => sum + (Number(record.presencePercent) || 0), 0) / monthlyRecords.length,
    averageUtilizationPercent:
      monthlyRecords.reduce((sum, record) => sum + (Number(record.utilizationPercent) || 0), 0) / monthlyRecords.length
  }
}

export function usePlanningCenterWorkspace({
  center,
  selectedGroupId,
  selectedYear,
  weekdayOptions,
  newPlanYear
}) {
  const sortedPlansForGroup = (group) =>
    [...getGroupPlans(group)].sort((left, right) => Number(right.planningYear || 0) - Number(left.planningYear || 0))

  const groupRows = computed(() =>
    getCenterGroups(center.value).map((group) => {
      const summary = summarizeGroup(group)
      const plans = sortedPlansForGroup(group)
      const latestPlan = plans[0] || null
      const latestPlanYear = latestPlan?.planningYear || null

      return {
        ...group,
        summary,
        plans,
        latestPlanYear,
        selectionHref: buildPlanningGroupHash(
          center.value.id,
          group.id,
          selectedGroupId.value === group.id ? selectedYear.value : latestPlanYear || currentYear
        )
      }
    })
  )

  const selectedGroup = computed(() => {
    if (!groupRows.value.length) {
      return null
    }

    return groupRows.value.find((group) => group.id === selectedGroupId.value) || groupRows.value[0]
  })

  const resolveNextPlanYear = (group = selectedGroup.value) => {
    const usedYears = new Set((group?.plans || []).map((plan) => Number(plan.planningYear)))
    let candidateYear = currentYear

    while (usedYears.has(candidateYear)) {
      candidateYear += 1
    }

    return candidateYear
  }

  const availableYearOptions = computed(() => {
    const usedYears = new Set((selectedGroup.value?.plans || []).map((plan) => Number(plan.planningYear)))
    const yearSet = new Set(yearOptions.filter((year) => !usedYears.has(Number(year))))
    const nextAvailableYear = resolveNextPlanYear(selectedGroup.value)

    yearSet.add(nextAvailableYear)

    return [...yearSet]
      .sort((left, right) => right - left)
      .map((year) => ({
        label: String(year),
        value: year
      }))
  })

  const selectedYearModel = computed({
    get: () => {
      if (!selectedGroup.value) {
        return currentYear
      }

      const routeYear = Number(selectedYear.value)
      if (selectedGroup.value.id === selectedGroupId.value && Number.isFinite(routeYear) && routeYear > 0) {
        return routeYear
      }

      return Number(selectedGroup.value.latestPlanYear) || currentYear
    },
    set: (value) => {
      if (!selectedGroup.value) {
        return
      }

      navigateToHash(buildPlanningGroupHash(center.value.id, selectedGroup.value.id, Number(value) || currentYear))
    }
  })

  const planRows = computed(() =>
    (selectedGroup.value?.plans || []).map((plan) => {
      const availability = summarizeAvailability(plan, center.value)

      return {
        ...plan,
        annualContacts: getAnnualContacts(plan),
        neededStaffHours: getAnnualRequiredStaffHours(plan),
        averageRequiredHeadcount: getAverageRequiredHeadcount(plan),
        averagePresencePercent: availability.averagePresencePercent,
        averageUtilizationPercent: availability.averageUtilizationPercent,
        peakRequiredHeadcount: getPeakRequiredHeadcount(plan),
        openHref: buildPlanningPlanHash(center.value.id, selectedGroup.value.id, plan.id),
        isSelectedYear: Number(plan.planningYear) === Number(selectedYearModel.value)
      }
    })
  )

  const operatingDayLabel = computed(() =>
    weekdayOptions.value
      .filter((weekday) => center.value?.operatingWeekdays?.includes(weekday.value))
      .map((weekday) => weekday.label)
      .join(', ') || 'No operating days selected'
  )

  const operatingHoursLabel = computed(() =>
    center.value?.operatingOpenTime && center.value?.operatingCloseTime
      ? `${center.value.operatingOpenTime} to ${center.value.operatingCloseTime}`
      : 'Hours not set'
  )

  const selectedGroupDefaults = computed(() => {
    if (!selectedGroup.value) {
      return []
    }

    return [
      { label: 'Operating Days', value: operatingDayLabel.value },
      { label: 'Hours of Operation', value: operatingHoursLabel.value },
      { label: 'Paid Hours / Day', value: formatNumber(selectedGroup.value.defaultPaidHoursPerDay, 1) },
      { label: 'Default Occupancy', value: `${formatNumber(selectedGroup.value.defaultOccupancyPercent, 1)}%` },
      { label: 'Default Adherence', value: `${formatNumber(selectedGroup.value.defaultAdherencePercent, 1)}%` },
      {
        label: 'Service Level',
        value: `${formatNumber(selectedGroup.value.serviceLevelPercent, 1)}% in ${formatWhole(selectedGroup.value.serviceLevelThresholdSeconds)}s`
      }
    ]
  })

  const breadcrumbItems = computed(() => [
    { label: 'Home', href: '#home' },
    { label: 'Call Centers', href: buildPlanningHomeHash() },
    { label: center.value.name }
  ])

  const createPlanHref = computed(() => {
    if (!selectedGroup.value) {
      return ''
    }

    return buildPlanningNewPlanHash(center.value.id, selectedGroup.value.id, newPlanYear.value)
  })

  const selectedGroupForecastWorkspaceHref = computed(() => {
    if (!selectedGroup.value) {
      return ''
    }

    return buildPlanningGroupForecastsHash(center.value.id, selectedGroup.value.id, selectedYearModel.value)
  })

  const existingPlanForDraftYear = computed(() => {
    if (!selectedGroup.value) {
      return null
    }

    return selectedGroup.value.plans.find((plan) => Number(plan.planningYear) === Number(newPlanYear.value)) || null
  })

  const existingPlanHref = computed(() => {
    if (!selectedGroup.value || !existingPlanForDraftYear.value) {
      return ''
    }

    return buildPlanningPlanHash(center.value.id, selectedGroup.value.id, existingPlanForDraftYear.value.id)
  })

  return {
    availableYearOptions,
    breadcrumbItems,
    createPlanHref,
    existingPlanForDraftYear,
    existingPlanHref,
    formatNumber,
    formatPercent,
    formatWhole,
    groupRows,
    planRows,
    resolveNextPlanYear,
    selectedGroup,
    selectedGroupDefaults,
    selectedGroupForecastWorkspaceHref,
    selectedYearModel
  }
}
