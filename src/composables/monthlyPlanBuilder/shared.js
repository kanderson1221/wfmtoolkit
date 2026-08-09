import {
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_SCHEDULE_CLOSED,
  MONTH_LABELS,
  buildPlanMonths,
  buildPlanningYearRange,
  buildRandomMonths,
  buildStaffingMonths,
  calculateCalendarOpenDays,
  calculateDefaultMonthlyPaidHoursPerFte,
  createNextYearOpening,
  createPlanMonth,
  createPresenceMonth,
  createRandomMonth,
  createStaffingMonth,
  createTrainingClass,
  createTrainingSettings,
  deriveStartingFrontlineHeadcount,
  getCurrentCalendarMonthIndex,
  getCurrentCalendarYear,
  normalizeCustomHolidays,
  normalizeDisabledHolidayRuleIds,
  normalizeHolidayCalendarId,
  normalizeHolidayScheduleMode,
  normalizeRequirementMethodForChannel,
  normalizeStaffingChannel,
  resolveChannelServiceGoal,
  normalizeWeekdays,
  resolveLinkedOpeningPosition,
  toNumber
} from '../../plannerModel'
import { createPlanDemandSource } from '../../planner/demandSources'

export const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

export const currentYear = getCurrentCalendarYear()
export const currentMonthIndex = getCurrentCalendarMonthIndex()
export const yearOptions = buildPlanningYearRange(currentYear)

export const autosaveTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
})

export const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

export const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

export const formatPercent = (value, digits = 1) => `${formatNumber(value, digits)}%`
export const formatFactor = (value, digits = 2) => `${formatNumber(value, digits)}x`

export const hydrateMonths = (months, fallbackBuilder, factory) =>
  Array.isArray(months) && months.length === MONTH_LABELS.length
    ? months.map((month) => factory(month))
    : fallbackBuilder()

const createNewPresenceMonths = (paidHoursPerDay) => {
  const monthlyPaidHoursPerFte = calculateDefaultMonthlyPaidHoursPerFte(paidHoursPerDay)
  return MONTH_LABELS.map(() => createPresenceMonth({ paidHoursPerDay, monthlyPaidHoursPerFte }))
}

const hasMonthlyPaidHoursPerFte = (month) =>
  month?.monthlyPaidHoursPerFte !== null &&
  month?.monthlyPaidHoursPerFte !== '' &&
  Number.isFinite(Number(month?.monthlyPaidHoursPerFte))

export const hydratePresenceMonths = (months, fallbackBuilder, {
  planningYear,
  operatingWeekdays,
  holidayCalendarId,
  disabledHolidayRuleIds,
  customHolidays
}) => {
  if (!Array.isArray(months) || months.length !== MONTH_LABELS.length) {
    return fallbackBuilder()
  }

  return months.map((month, monthIndex) => {
    const normalizedMonth = createPresenceMonth(month)
    if (hasMonthlyPaidHoursPerFte(month)) {
      return normalizedMonth
    }

    const openDays = calculateCalendarOpenDays(
      planningYear,
      monthIndex,
      operatingWeekdays,
      holidayCalendarId,
      HOLIDAY_SCHEDULE_CLOSED,
      disabledHolidayRuleIds,
      customHolidays
    ).calendarOpenDays

    return createPresenceMonth({
      ...normalizedMonth,
      monthlyPaidHoursPerFte: Number((openDays * normalizedMonth.paidHoursPerDay).toFixed(2))
    })
  })
}

export const buildPlannerSeedDefaults = (centerDefaults = {}, fallbackPlanningYear = currentYear) => {
  const planningYear = toNumber(centerDefaults?.planningYear, fallbackPlanningYear)
  const operatingWeekdays = normalizeWeekdays(centerDefaults?.operatingWeekdays)
  const holidayCalendarId = normalizeHolidayCalendarId(centerDefaults?.holidayCalendarId, HOLIDAY_CALENDAR_NONE)
  const disabledHolidayRuleIds = normalizeDisabledHolidayRuleIds(centerDefaults?.disabledHolidayRuleIds)
  const customHolidays = normalizeCustomHolidays(centerDefaults?.customHolidays)
  const holidayScheduleMode = normalizeHolidayScheduleMode(centerDefaults?.holidayScheduleMode, HOLIDAY_SCHEDULE_CLOSED)
  const paidHoursPerDay = Math.max(
    toNumber(centerDefaults?.presenceMonths?.[0]?.paidHoursPerDay ?? centerDefaults?.defaultPaidHoursPerDay, 8),
    0
  )
  const presenceMonths = hydratePresenceMonths(
    centerDefaults?.presenceMonths,
    () => createNewPresenceMonths(paidHoursPerDay),
    {
      planningYear,
      operatingWeekdays,
      holidayCalendarId,
      disabledHolidayRuleIds,
      customHolidays
    }
  )
  const randomDefaults = createRandomMonth(
    centerDefaults?.randomDefaults || {
      occupancyPercent: centerDefaults?.defaultOccupancyPercent,
      adherencePercent: centerDefaults?.defaultAdherencePercent
    }
  )
  const startingPosition = resolveLinkedOpeningPosition({
    priorPlan: null,
    startingHeadcount: centerDefaults?.startingHeadcount,
    startingFrontlineHeadcount: centerDefaults?.startingFrontlineHeadcount
  })
  const channelType = normalizeStaffingChannel(centerDefaults?.channelType)
  const serviceGoal = resolveChannelServiceGoal(centerDefaults, channelType)

  return {
    planningYear,
    channelType,
    serviceGoal,
    requirementMethod: normalizeRequirementMethodForChannel(
      centerDefaults?.requirementMethod,
      channelType
    ),
    operatingWeekdays,
    holidayCalendarId,
    disabledHolidayRuleIds,
    customHolidays,
    holidayScheduleMode,
    presenceMonths,
    randomDefaults,
    startingHeadcount: startingPosition.rosterHeadcount,
    startingFrontlineHeadcount: startingPosition.frontlineHeadcount
  }
}

export const resolvePlannerInitialState = ({ sourcePlan = null, centerDefaults = {}, prefilledYear = NaN } = {}) => {
  const hasPrefilledYear = Number.isFinite(prefilledYear)
  const seedDefaults = buildPlannerSeedDefaults(centerDefaults, hasPrefilledYear ? prefilledYear : currentYear)
  const basePlan = sourcePlan || {}
  const channelType = normalizeStaffingChannel(basePlan.channelType || seedDefaults.channelType)
  const planningYear = toNumber(basePlan.planningYear, seedDefaults.planningYear)
  const trainingSettings = createTrainingSettings(basePlan.trainingSettings || {})
  const trainingClasses = Array.isArray(basePlan.trainingClasses)
    ? basePlan.trainingClasses.map((trainingClass) => createTrainingClass(trainingClass))
    : []
  const startingHeadcount = Math.max(toNumber(basePlan.startingHeadcount, seedDefaults.startingHeadcount), 0)
  const trainingCalendar = {
    holidayCalendarId: basePlan.holidayCalendarId ?? seedDefaults.holidayCalendarId,
    disabledHolidayRuleIds: basePlan.disabledHolidayRuleIds ?? seedDefaults.disabledHolidayRuleIds,
    customHolidays: basePlan.customHolidays ?? seedDefaults.customHolidays
  }
  const startingFrontlineHeadcount = resolveLinkedOpeningPosition({
    priorPlan: null,
    startingHeadcount,
    startingFrontlineHeadcount:
      basePlan.startingFrontlineHeadcount ??
      seedDefaults.startingFrontlineHeadcount ??
      deriveStartingFrontlineHeadcount(planningYear, startingHeadcount, trainingClasses, trainingSettings, trainingCalendar)
  }).frontlineHeadcount
  const operatingWeekdays = normalizeWeekdays(basePlan.operatingWeekdays ?? seedDefaults.operatingWeekdays)
  const holidayCalendarId = normalizeHolidayCalendarId(basePlan.holidayCalendarId, seedDefaults.holidayCalendarId)
  const disabledHolidayRuleIds = normalizeDisabledHolidayRuleIds(basePlan.disabledHolidayRuleIds ?? seedDefaults.disabledHolidayRuleIds)
  const customHolidays = normalizeCustomHolidays(basePlan.customHolidays ?? seedDefaults.customHolidays)
  const presenceMonths = hydratePresenceMonths(
    basePlan.presenceMonths,
    () => seedDefaults.presenceMonths.map((month) => createPresenceMonth(month)),
    {
      planningYear,
      operatingWeekdays,
      holidayCalendarId,
      disabledHolidayRuleIds,
      customHolidays
    }
  )

  return {
    seedDefaults,
    planningYear,
    channelType,
    serviceGoal: resolveChannelServiceGoal(basePlan.serviceGoal ? basePlan : centerDefaults, channelType),
    requirementMethod: normalizeRequirementMethodForChannel(
      basePlan.requirementMethod || seedDefaults.requirementMethod,
      channelType
    ),
    operatingWeekdays,
    holidayCalendarId,
    disabledHolidayRuleIds,
    customHolidays,
    holidayScheduleMode: normalizeHolidayScheduleMode(basePlan.holidayScheduleMode, seedDefaults.holidayScheduleMode),
    presenceMonths,
    randomDefaults: createRandomMonth(basePlan.randomDefaults || seedDefaults.randomDefaults),
    useMonthlyRandomOverrides: Boolean(basePlan.useMonthlyRandomOverrides),
    randomMonths: hydrateMonths(basePlan.randomMonths, buildRandomMonths, createRandomMonth),
    planMonths: hydrateMonths(basePlan.planMonths, buildPlanMonths, createPlanMonth),
    demandSource: createPlanDemandSource(basePlan.demandSource),
    trainingSettings,
    nextYearOpening: createNextYearOpening(basePlan.nextYearOpening || {}),
    startingHeadcount,
    startingFrontlineHeadcount,
    staffingMonths: hydrateMonths(basePlan.staffingMonths, buildStaffingMonths, createStaffingMonth),
    trainingClasses
  }
}

export const createPresenceMonthFromProfile = ({
  paidHoursPerDay = 8,
  monthlyPaidHoursPerFte = calculateDefaultMonthlyPaidHoursPerFte(paidHoursPerDay),
  plannedTimeOffPercent = 0,
  unplannedTimeOffPercent = 0,
  leaveTimePercent = 0,
  meetingsPercent = 0,
  trainingPercent = 0,
  coachingPercent = 0,
  paidBreaksHoursPerDay = 0.5,
  otherAwayHoursPerDay = 0.1
}) => {
  const paidHoursPerMonth = Math.max(toNumber(monthlyPaidHoursPerFte, 0), 0)
  const convertPercentToHours = (percent) => Number(((paidHoursPerMonth * percent) / 100).toFixed(1))

  return createPresenceMonth({
    paidHoursPerDay,
    monthlyPaidHoursPerFte: paidHoursPerMonth,
    plannedTimeOffHours: convertPercentToHours(plannedTimeOffPercent),
    unplannedTimeOffHours: convertPercentToHours(unplannedTimeOffPercent),
    leaveTimeHours: convertPercentToHours(leaveTimePercent),
    meetingsHours: convertPercentToHours(meetingsPercent),
    trainingHours: convertPercentToHours(trainingPercent),
    coachingHours: convertPercentToHours(coachingPercent),
    paidBreaksHoursPerDay,
    otherAwayHoursPerDay
  })
}
