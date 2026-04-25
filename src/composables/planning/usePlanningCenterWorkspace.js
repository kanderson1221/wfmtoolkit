import { computed } from 'vue'

import {
  buildPlanningGroupHash,
  buildPlanningGroupForecastsHash,
  buildPlanningHomeHash,
  buildPlanningNewPlanHash,
  buildPlanningPlanHash,
  navigateToHash
} from '../../appRoutes'
import { PLAN_TYPE_BUDGET, PLAN_TYPE_UPDATE, resolvePlanHolidaySnapshot } from '../../planningStorage'
import {
  getAnnualContacts,
  getCenterGroups,
  getGroupPlans,
  summarizeGroup
} from '../../planningSummary'
import { computeMonthlyRecords, summarizePlanRecords } from '../../planner/demandModel'
import { computeStaffingRecords, summarizeStaffingRecords } from '../../planner/staffingModel'
import { buildActualsThroughMonthOptions, buildPlanUpdateName } from '../../planner/planUpdates'
import {
  getPlanRequirementMethodLabel,
  normalizePlanRequirementMethod
} from '../../planner/shared'
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

const toFiniteNumberOrNull = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const chooseDemandMetric = (summaryValue, fallbackValue) => {
  const summaryNumber = toFiniteNumberOrNull(summaryValue)
  const fallbackNumber = toFiniteNumberOrNull(fallbackValue)

  if (summaryNumber != null && summaryNumber > 0) {
    return summaryNumber
  }

  if (fallbackNumber != null && fallbackNumber > 0) {
    return fallbackNumber
  }

  return summaryNumber ?? fallbackNumber ?? 0
}

const chooseSummaryMetric = (summaryValue, fallbackValue) => {
  const summaryNumber = toFiniteNumberOrNull(summaryValue)
  const fallbackNumber = toFiniteNumberOrNull(fallbackValue)
  return summaryNumber ?? fallbackNumber ?? 0
}

const formatMonthStartLabel = (value) => {
  const normalizedValue = String(value || '').trim()
  const match = normalizedValue.match(/^(\d{4})-(\d{2})-01$/)
  if (!match) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1))
}

const formatVariance = (value, digits = 1) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '—'
  }

  const prefix = numericValue > 0 ? '+' : ''
  return `${prefix}${formatNumber(numericValue, digits)}`
}

const buildComputedMonthlyRecords = (plan, center) => {
  const planningYear = Number(plan?.planningYear) || currentYear
  const holidaySnapshot = resolvePlanHolidaySnapshot(plan, center, planningYear)

  return computeMonthlyRecords({
    planningYear,
    requirementMethod: plan?.requirementMethod || plan?.summary?.requirementMethod,
    demandSource: plan?.demandSource,
    operatingWeekdays:
      Array.isArray(plan?.operatingWeekdays) && plan.operatingWeekdays.length
        ? plan.operatingWeekdays
        : Array.isArray(center?.operatingWeekdays) && center.operatingWeekdays.length
          ? center.operatingWeekdays
          : [1, 2, 3, 4, 5],
    holidayCalendarId: holidaySnapshot.holidayCalendarId,
    disabledHolidayRuleIds: holidaySnapshot.disabledHolidayRuleIds,
    customHolidays: holidaySnapshot.customHolidays,
    holidayScheduleMode: plan?.holidayScheduleMode,
    presenceMonths: Array.isArray(plan?.presenceMonths) ? plan.presenceMonths : [],
    randomDefaults: plan?.randomDefaults || {},
    useMonthlyRandomOverrides: Boolean(plan?.useMonthlyRandomOverrides),
    randomMonths: Array.isArray(plan?.randomMonths) ? plan.randomMonths : [],
    planMonths: Array.isArray(plan?.planMonths) ? plan.planMonths : []
  })
}

const buildPlanRowMetrics = (plan, center) => {
  const summary = plan?.summary || {}
  const monthlyRecords = buildComputedMonthlyRecords(plan, center)
  const computedPlanSummary = monthlyRecords.length ? summarizePlanRecords(monthlyRecords) : {}
  const planningYear = Number(plan?.planningYear) || currentYear
  const holidaySnapshot = resolvePlanHolidaySnapshot(plan, center, planningYear)
  const staffingRecords = monthlyRecords.length
    ? computeStaffingRecords(
        monthlyRecords,
        planningYear,
        plan?.startingHeadcount,
        plan?.startingFrontlineHeadcount,
        Array.isArray(plan?.staffingMonths) ? plan.staffingMonths : [],
        Array.isArray(plan?.trainingClasses) ? plan.trainingClasses : [],
        plan?.trainingSettings || {},
        {
          holidayCalendarId: holidaySnapshot.holidayCalendarId,
          disabledHolidayRuleIds: holidaySnapshot.disabledHolidayRuleIds,
          customHolidays: holidaySnapshot.customHolidays
        }
      )
    : []
  const computedStaffingSummary = staffingRecords.length ? summarizeStaffingRecords(staffingRecords) : {}
  const requirementMethod = normalizePlanRequirementMethod(summary.requirementMethod || plan?.requirementMethod)
  const peakDayRequiredHeadcount = chooseDemandMetric(
    summary.peakDayRequiredHeadcount,
    computedPlanSummary.peakDayMonth?.peakDayRequiredHeadcount
  )
  const peakRequiredHeadcount = chooseDemandMetric(
    summary.peakRequiredHeadcount,
    computedPlanSummary.peakMonth?.requiredHeadcount
  )

  return {
    requirementMethod,
    requirementMethodLabel: getPlanRequirementMethodLabel(requirementMethod),
    annualContacts: chooseDemandMetric(summary.annualContacts, computedPlanSummary.annualContacts),
    annualWorkloadHours: chooseDemandMetric(summary.annualWorkloadHours, computedPlanSummary.annualWorkloadHours),
    totalRequiredStaffHours: chooseDemandMetric(
      summary.annualRequiredStaffHours,
      computedPlanSummary.annualRequiredStaffHours
    ),
    averageTotalRequiredHeadcount: chooseDemandMetric(
      summary.averageRequiredHeadcount,
      computedPlanSummary.averageRequiredHeadcount
    ),
    peakTotalRequiredHeadcount: peakDayRequiredHeadcount || peakRequiredHeadcount,
    endingFrontlineHeadcount: chooseSummaryMetric(
      summary.endingFrontlineHeadcount,
      computedStaffingSummary.endingFrontlineHeadcount
    ),
    averageGapToRequirement: chooseSummaryMetric(
      summary.averageGapToRequirement,
      computedStaffingSummary.averageGapToRequirement
    )
  }
}

export function usePlanningCenterWorkspace({
  center,
  selectedGroupId,
  selectedYear,
  weekdayOptions,
  newPlanYear,
  newPlanRequirementMethod
}) {
  const sortedPlansForGroup = (group) =>
    [...getGroupPlans(group)].sort((left, right) => {
      const yearDelta = Number(right.planningYear || 0) - Number(left.planningYear || 0)
      if (yearDelta !== 0) {
        return yearDelta
      }

      if (left.planType === PLAN_TYPE_BUDGET && right.planType !== PLAN_TYPE_BUDGET) {
        return -1
      }

      if (right.planType === PLAN_TYPE_BUDGET && left.planType !== PLAN_TYPE_BUDGET) {
        return 1
      }

      if (left.isCurrent && !right.isCurrent) {
        return -1
      }

      if (right.isCurrent && !left.isCurrent) {
        return 1
      }

      return new Date(right.updatedAt || right.createdAt || 0).getTime() -
        new Date(left.updatedAt || left.createdAt || 0).getTime()
    })

  const groupRows = computed(() =>
    getCenterGroups(center.value).map((group) => {
      const summary = summarizeGroup(group)
      const plans = sortedPlansForGroup(group)
      const latestPlan = plans.find((plan) => plan.isCurrent) || plans[0] || null
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
    const usedYears = new Set(
      (group?.plans || [])
        .filter((plan) => plan.planType === PLAN_TYPE_BUDGET)
        .map((plan) => Number(plan.planningYear))
    )
    let candidateYear = currentYear

    while (usedYears.has(candidateYear)) {
      candidateYear += 1
    }

    return candidateYear
  }

  const availableYearOptions = computed(() => {
    const usedYears = new Set(
      (selectedGroup.value?.plans || [])
        .filter((plan) => plan.planType === PLAN_TYPE_BUDGET)
        .map((plan) => Number(plan.planningYear))
    )
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

  const buildPlanRow = (plan, budgetRow = null) => {
      const rowMetrics = buildPlanRowMetrics(plan, center.value)
      const planType = plan.planType === PLAN_TYPE_UPDATE ? PLAN_TYPE_UPDATE : PLAN_TYPE_BUDGET
      const actualsThroughLabel = formatMonthStartLabel(plan.actualsThroughMonth)
      const contactsVarianceToBudget = budgetRow ? rowMetrics.annualContacts - budgetRow.annualContacts : null
      const totalRequiredHoursVarianceToBudget = budgetRow ? rowMetrics.totalRequiredStaffHours - budgetRow.totalRequiredStaffHours : null
      const averageRequiredHeadcountVarianceToBudget = budgetRow ? rowMetrics.averageTotalRequiredHeadcount - budgetRow.averageTotalRequiredHeadcount : null
      const averageGapVarianceToBudget = budgetRow ? rowMetrics.averageGapToRequirement - budgetRow.averageGapToRequirement : null

      return {
        ...plan,
        planType,
        planTypeLabel: planType === PLAN_TYPE_UPDATE ? 'Update' : 'Budget',
        isBudget: planType === PLAN_TYPE_BUDGET,
        isUpdate: planType === PLAN_TYPE_UPDATE,
        isCurrent: Boolean(plan.isCurrent),
        actualsThroughLabel,
        actualsThroughBadge: actualsThroughLabel ? `Actuals through ${actualsThroughLabel}` : '',
        annualContacts: rowMetrics.annualContacts || getAnnualContacts(plan),
        requirementMethodLabel: rowMetrics.requirementMethodLabel,
        annualWorkloadHours: rowMetrics.annualWorkloadHours,
        totalRequiredStaffHours: rowMetrics.totalRequiredStaffHours,
        averageTotalRequiredHeadcount: rowMetrics.averageTotalRequiredHeadcount,
        peakTotalRequiredHeadcount: rowMetrics.peakTotalRequiredHeadcount,
        endingFrontlineHeadcount: rowMetrics.endingFrontlineHeadcount,
        averageGapToRequirement: rowMetrics.averageGapToRequirement,
        contactsVarianceToBudget,
        totalRequiredHoursVarianceToBudget,
        averageRequiredHeadcountVarianceToBudget,
        averageGapVarianceToBudget,
        contactsVarianceLabel: budgetRow && planType === PLAN_TYPE_UPDATE ? formatVariance(contactsVarianceToBudget, 0) : '—',
        totalRequiredHoursVarianceLabel: budgetRow && planType === PLAN_TYPE_UPDATE ? formatVariance(totalRequiredHoursVarianceToBudget, 0) : '—',
        averageRequiredHeadcountVarianceLabel: budgetRow && planType === PLAN_TYPE_UPDATE ? formatVariance(averageRequiredHeadcountVarianceToBudget, 1) : '—',
        averageGapVarianceLabel: budgetRow && planType === PLAN_TYPE_UPDATE ? formatVariance(averageGapVarianceToBudget, 1) : '—',
        openHref: buildPlanningPlanHash(center.value.id, selectedGroup.value.id, plan.id),
        isSelectedYear: Number(plan.planningYear) === Number(selectedYearModel.value)
      }
  }

  const planYearSections = computed(() => {
    const plansByYear = new Map()

    ;(selectedGroup.value?.plans || []).forEach((plan) => {
      const planningYear = Number(plan.planningYear)
      if (!Number.isFinite(planningYear) || planningYear <= 0) {
        return
      }

      const existingPlans = plansByYear.get(planningYear) || []
      plansByYear.set(planningYear, [...existingPlans, plan])
    })

    return [...plansByYear.entries()]
      .sort(([leftYear], [rightYear]) => rightYear - leftYear)
      .map(([planningYear, plans]) => {
        const budgetPlan = plans.find((plan) => plan.planType === PLAN_TYPE_BUDGET) || plans[0]
        const budgetRow = buildPlanRow(budgetPlan)
        const rows = plans
          .filter((plan) => plan.id !== budgetPlan.id)
          .map((plan) => buildPlanRow(plan, budgetRow))
          .sort((left, right) => {
            if (left.isCurrent && !right.isCurrent) {
              return -1
            }

            if (right.isCurrent && !left.isCurrent) {
              return 1
            }

            return new Date(right.updatedAt || right.createdAt || 0).getTime() -
              new Date(left.updatedAt || left.createdAt || 0).getTime()
          })

        const actualsThroughOptions = buildActualsThroughMonthOptions(selectedGroup.value?.actuals, planningYear)
        const defaultActualsThroughMonth = actualsThroughOptions[actualsThroughOptions.length - 1]?.value || ''

        return {
          planningYear,
          budgetPlanId: budgetRow.id,
          currentPlan: [budgetRow, ...rows].find((plan) => plan.isCurrent) || budgetRow,
          budgetPlan: budgetRow,
          rows: [budgetRow, ...rows],
          actualsThroughOptions,
          defaultActualsThroughMonth,
          defaultUpdateName: buildPlanUpdateName(planningYear, defaultActualsThroughMonth)
        }
      })
  })

  const planRows = computed(() => planYearSections.value.flatMap((section) => section.rows))

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

    return buildPlanningNewPlanHash(center.value.id, selectedGroup.value.id, newPlanYear.value, {
      requirementMethod: newPlanRequirementMethod?.value
    })
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

    return selectedGroup.value.plans.find(
      (plan) => Number(plan.planningYear) === Number(newPlanYear.value) && plan.planType === PLAN_TYPE_BUDGET
    ) || null
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
    planYearSections,
    planRows,
    resolveNextPlanYear,
    selectedGroup,
    selectedGroupDefaults,
    selectedGroupForecastWorkspaceHref,
    selectedYearModel
  }
}
