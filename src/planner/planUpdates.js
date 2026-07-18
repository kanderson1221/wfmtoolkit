import { buildActualsMonthsFromDailyRows } from './actualsModel'
import {
  buildDateFromIso,
  buildMatchingIsoDatesInRange,
  buildMonthEndFromDate
} from './dateValues'
import { createPlanningGroupActuals } from './groupActuals'
import { createPlanningGroupOpenDayChecker } from './groupOpenDays'
import { createPlanDemandSource } from './demandSources'
import { MONTH_LABELS, createPlanMonth, toNumber } from './shared'
import { PLAN_TYPE_UPDATE } from '../planningStorage'

const clonePlain = (value) => JSON.parse(JSON.stringify(value))

const monthStartForIndex = (planningYear, monthIndex) =>
  `${planningYear}-${String(monthIndex + 1).padStart(2, '0')}-01`

const parseActualsThroughMonthIndex = (actualsThroughMonth, planningYear) => {
  const normalizedValue = String(actualsThroughMonth || '').trim()
  const match = normalizedValue.match(/^(\d{4})-(\d{2})-01$/)
  if (!match || Number(match[1]) !== Number(planningYear)) {
    return -1
  }

  const monthIndex = Number(match[2]) - 1
  return monthIndex >= 0 && monthIndex <= 11 ? monthIndex : -1
}

const formatUpdateMonthLabel = (planningYear, actualsThroughMonth) => {
  const cutoffMonthIndex = parseActualsThroughMonthIndex(actualsThroughMonth, planningYear)
  const updateMonthIndex = Math.min(cutoffMonthIndex + 1, MONTH_LABELS.length - 1)
  return MONTH_LABELS[Math.max(updateMonthIndex, 0)]
}

export const buildPlanUpdateName = (planningYear, actualsThroughMonth) =>
  `${planningYear} ${formatUpdateMonthLabel(planningYear, actualsThroughMonth)} Update`

const isPositiveContactsWithZeroAht = (month = {}) =>
  toNumber(month.actualContacts, 0) > 0 && toNumber(month.actualAhtSeconds, 0) <= 0

const buildZeroAhtActualizationBlocker = (month, planningYear) =>
  `${month.label} ${planningYear} actuals have positive contacts but zero weighted AHT. ` +
  `Import corrected daily actuals with positive AHT before creating an updated plan through ${month.label} or later.`

const missingDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

const buildExpectedOpenDatesByMonth = (planningYear, group = {}, center = {}) => {
  const isExpectedOpenDay = createPlanningGroupOpenDayChecker(group, center)

  return MONTH_LABELS.map((label, monthIndex) => {
    const monthStartDate = new Date(planningYear, monthIndex, 1, 12)
    const expectedOpenDates = buildMatchingIsoDatesInRange(
      monthStartForIndex(planningYear, monthIndex),
      buildMonthEndFromDate(monthStartDate),
      isExpectedOpenDay
    )

    return {
      monthIndex,
      label,
      expectedOpenDates
    }
  })
}

const buildActualsCompletenessByMonth = ({
  dailyRows,
  planningYear,
  group,
  center
}) => {
  const loadedDates = new Set(
    dailyRows
      .filter((row) => Number(row.serviceDate.slice(0, 4)) === Number(planningYear))
      .map((row) => row.serviceDate)
  )

  return buildExpectedOpenDatesByMonth(planningYear, group, center).map((month) => ({
    ...month,
    missingOpenDates: month.expectedOpenDates.filter((serviceDate) => !loadedDates.has(serviceDate))
  }))
}

const buildIncompleteActualsBlocker = (month, planningYear) => {
  const missingCount = month.missingOpenDates.length
  const firstMissingDate = buildDateFromIso(month.missingOpenDates[0])
  const missingDayLabel = missingCount === 1 ? 'expected open day' : 'expected open days'
  const firstMissingLabel = firstMissingDate
    ? missingDateFormatter.format(firstMissingDate)
    : month.missingOpenDates[0]

  return `${month.label} ${planningYear} actuals are missing ${missingCount} ${missingDayLabel}, ` +
    `starting with ${firstMissingLabel}. Import daily actuals for every open date before creating ` +
    `an updated plan through ${month.label} or later. Configured closed dates are excluded.`
}

const findFirstActualizationBlocker = ({
  monthlyActuals,
  completenessByMonth,
  planningYear,
  throughMonthIndex
}) => {
  for (let monthIndex = 0; monthIndex <= throughMonthIndex; monthIndex += 1) {
    const month = monthlyActuals[monthIndex]
    const completeness = completenessByMonth[monthIndex]

    if (completeness?.missingOpenDates.length) {
      return {
        monthIndex,
        message: buildIncompleteActualsBlocker(completeness, planningYear)
      }
    }

    if (isPositiveContactsWithZeroAht(month)) {
      return {
        monthIndex,
        message: buildZeroAhtActualizationBlocker(month, planningYear)
      }
    }
  }

  return null
}

export const buildPlanUpdateActualsState = (
  actuals = {},
  planningYear,
  { group = {}, center = {} } = {}
) => {
  const dailyRows = createPlanningGroupActuals(actuals).dailyRows
  const monthlyActuals = buildActualsMonthsFromDailyRows(
    dailyRows,
    planningYear
  )
  const lastLoadedMonthIndex = monthlyActuals.reduce(
    (lastIndex, month) => month.loadedDaysCount > 0 ? month.monthIndex : lastIndex,
    -1
  )
  const completenessByMonth = buildActualsCompletenessByMonth({
    dailyRows,
    planningYear,
    group,
    center
  })
  const firstBlocker = lastLoadedMonthIndex >= 0
    ? findFirstActualizationBlocker({
        monthlyActuals,
        completenessByMonth,
        planningYear,
        throughMonthIndex: lastLoadedMonthIndex
      })
    : null

  return {
    options: monthlyActuals
      .filter((month) => month.actualContacts != null || month.actualAhtSeconds != null)
      .filter((month) => !firstBlocker || month.monthIndex < firstBlocker.monthIndex)
      .map((month) => ({
        label: `Actuals through ${month.label} ${planningYear}`,
        value: monthStartForIndex(planningYear, month.monthIndex),
        monthIndex: month.monthIndex
      })),
    blocker: firstBlocker?.message || ''
  }
}

export const buildActualsThroughMonthOptions = (actuals = {}, planningYear, calendarContext = {}) =>
  buildPlanUpdateActualsState(actuals, planningYear, calendarContext).options

const assertActualsSupportCutoff = ({
  monthlyActuals,
  completenessByMonth,
  planningYear,
  cutoffMonthIndex
}) => {
  const blocker = findFirstActualizationBlocker({
    monthlyActuals,
    completenessByMonth,
    planningYear,
    throughMonthIndex: cutoffMonthIndex
  })

  if (blocker) {
    throw new Error(blocker.message)
  }
}

const summarizeDailyActualsByMonthIndex = (dailyRows, planningYear) => {
  const buckets = new Map()

  createPlanningGroupActuals({ dailyRows }).dailyRows.forEach((row) => {
    if (Number(row.serviceDate.slice(0, 4)) !== Number(planningYear)) {
      return
    }

    const monthIndex = Number(row.serviceDate.slice(5, 7)) - 1
    if (monthIndex < 0 || monthIndex > 11) {
      return
    }

    const bucket = buckets.get(monthIndex) || {
      contacts: 0,
      daysLoaded: 0,
      peakDailyVolume: 0
    }
    const contacts = Math.max(toNumber(row.contacts, 0), 0)

    bucket.contacts += contacts
    bucket.daysLoaded += 1
    bucket.peakDailyVolume = Math.max(bucket.peakDailyVolume, contacts)
    buckets.set(monthIndex, bucket)
  })

  return buckets
}

export const createUpdatedPlanDraft = ({
  sourcePlan,
  budgetPlan,
  actuals,
  group,
  center,
  actualsThroughMonth,
  name,
  timestamp = new Date().toISOString()
} = {}) => {
  const basePlan = clonePlain(sourcePlan || {})
  const planningYear = toNumber(basePlan.planningYear, new Date().getFullYear())
  const cutoffMonthIndex = parseActualsThroughMonthIndex(actualsThroughMonth, planningYear)
  const normalizedDailyRows = createPlanningGroupActuals(actuals).dailyRows
  const monthlyActuals = buildActualsMonthsFromDailyRows(normalizedDailyRows, planningYear)
  const completenessByMonth = buildActualsCompletenessByMonth({
    dailyRows: normalizedDailyRows,
    planningYear,
    group,
    center
  })
  assertActualsSupportCutoff({
    monthlyActuals,
    completenessByMonth,
    planningYear,
    cutoffMonthIndex
  })
  const dailyActualRows = normalizedDailyRows
    .filter((row) => Number(row.serviceDate.slice(0, 4)) === planningYear)
    .filter((row) => {
      const monthIndex = Number(row.serviceDate.slice(5, 7)) - 1
      return monthIndex >= 0 && monthIndex <= cutoffMonthIndex
    })
  const actualsByMonthIndex = summarizeDailyActualsByMonthIndex(dailyActualRows, planningYear)
  const sourcePlanMonths = Array.isArray(basePlan.planMonths) && basePlan.planMonths.length
    ? basePlan.planMonths
    : MONTH_LABELS.map(() => createPlanMonth())
  const actualizedPlanMonths = sourcePlanMonths
    .map((month, monthIndex) => {
      const actualsMonth = monthlyActuals[monthIndex]
      if (monthIndex > cutoffMonthIndex || !actualsMonth) {
        return createPlanMonth(month)
      }

      return createPlanMonth({
        ...month,
        contacts: actualsMonth.actualContacts ?? month.contacts,
        ahtSeconds: actualsMonth.actualAhtSeconds ?? month.ahtSeconds
      })
    })
  const sourceDemand = createPlanDemandSource(basePlan.demandSource)
  const actualizedForecastMonthsByIndex = new Map(
    (Array.isArray(sourceDemand.forecastMonthSnapshot) ? sourceDemand.forecastMonthSnapshot : [])
      .map((month, fallbackIndex) => [Math.max(0, Math.min(11, toNumber(month.monthIndex, fallbackIndex))), { ...month }])
  )

  monthlyActuals.forEach((actualsMonth, monthIndex) => {
    if (monthIndex > cutoffMonthIndex || (actualsMonth.actualContacts == null && actualsMonth.actualAhtSeconds == null)) {
      return
    }

    const dailySummary = actualsByMonthIndex.get(monthIndex) || {}
    const existingMonth = actualizedForecastMonthsByIndex.get(monthIndex) || {}

    actualizedForecastMonthsByIndex.set(monthIndex, {
      ...existingMonth,
      monthIndex,
      monthLabel: existingMonth.monthLabel || MONTH_LABELS[monthIndex],
      monthStart: existingMonth.monthStart || monthStartForIndex(planningYear, monthIndex),
      contacts: actualsMonth.actualContacts ?? existingMonth.contacts ?? 0,
      ahtSeconds: actualsMonth.actualAhtSeconds ?? existingMonth.ahtSeconds ?? null,
      averageDailyVolume: dailySummary.daysLoaded > 0
        ? (dailySummary.contacts || 0) / dailySummary.daysLoaded
        : existingMonth.averageDailyVolume || 0,
      peakDailyVolume: dailySummary.peakDailyVolume || existingMonth.peakDailyVolume || 0,
      lowerBoundContacts: actualsMonth.actualContacts ?? existingMonth.lowerBoundContacts ?? 0,
      upperBoundContacts: actualsMonth.actualContacts ?? existingMonth.upperBoundContacts ?? 0
    })
  })

  const futureForecastDailyRows = sourceDemand.forecastDailySnapshot
    .filter((row) => toNumber(row.monthIndex, Number(row.serviceDate?.slice(5, 7)) - 1) > cutoffMonthIndex)
  const actualizedDailyRows = dailyActualRows.map((row) => {
    const monthIndex = Number(row.serviceDate.slice(5, 7)) - 1
    return {
      serviceDate: row.serviceDate,
      monthIndex,
      monthLabel: MONTH_LABELS[monthIndex],
      contacts: row.contacts
    }
  })
  const nextDemandSource = createPlanDemandSource({
    ...sourceDemand,
    forecastMonthSnapshot: [...actualizedForecastMonthsByIndex.values()].sort((left, right) => left.monthIndex - right.monthIndex),
    forecastDailySnapshot: [...actualizedDailyRows, ...futureForecastDailyRows].sort((left, right) =>
      String(left.serviceDate || '').localeCompare(String(right.serviceDate || ''))
    )
  })

  return {
    ...basePlan,
    id: null,
    name: String(name || '').trim() || buildPlanUpdateName(planningYear, actualsThroughMonth),
    planType: PLAN_TYPE_UPDATE,
    isCurrent: true,
    sourcePlanId: basePlan.id || '',
    budgetPlanId: budgetPlan?.id || basePlan.budgetPlanId || basePlan.id || '',
    actualsThroughMonth: String(actualsThroughMonth || '').trim(),
    actualizedAt: timestamp,
    createdAt: null,
    updatedAt: null,
    planMonths: actualizedPlanMonths,
    demandSource: nextDemandSource
  }
}
