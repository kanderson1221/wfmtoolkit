import {
  FULL_MONTH_LABELS,
  MONTH_LABELS,
  PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
  average,
  clamp,
  createPlanMonth,
  createPresenceMonth,
  createRandomMonth,
  normalizePlanRequirementMethod,
  toNumber
} from './shared'
import {
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_SCHEDULE_CLOSED,
  calculateHolidayImpactDays,
  normalizeCustomHolidays,
  normalizeDisabledHolidayRuleIds,
  normalizeHolidayCalendarId,
  normalizeHolidayScheduleMode
} from './holidayCalendars'
import {
  DEMAND_SOURCE_FORECAST,
  derivePeakDayUpliftPercent,
  summarizeForecastDailyDemandForOpenDays
} from './demandSources'

const normalizeMonthIndex = (value, fallback = 0) =>
  Math.max(0, Math.min(MONTH_LABELS.length - 1, Math.round(toNumber(value, fallback))))

const buildForecastMonthByMonthIndex = (demandSource = {}) =>
  new Map(
    (Array.isArray(demandSource?.forecastMonthSnapshot) ? demandSource.forecastMonthSnapshot : [])
      .map((month, fallbackMonthIndex) => [
        normalizeMonthIndex(month?.monthIndex, fallbackMonthIndex),
        month
      ])
  )

export const calculateCalendarOpenDays = (
  year,
  monthIndex,
  activeDays,
  holidayCalendarId = HOLIDAY_CALENDAR_NONE,
  _holidayScheduleMode = HOLIDAY_SCHEDULE_CLOSED,
  disabledHolidayRuleIds = [],
  customHolidays = []
) => {
  if (!activeDays.length) {
    return {
      weekdayOpenDays: 0,
      holidayCount: 0,
      holidayImpactDays: 0,
      calendarOpenDays: 0
    }
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  let weekdayOpenDays = 0

  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(year, monthIndex, day).getDay()
    if (activeDays.includes(weekday)) {
      weekdayOpenDays += 1
    }
  }

  const { holidayCount, holidayImpactDays } = calculateHolidayImpactDays({
    year,
    monthIndex,
    operatingWeekdays: activeDays,
    holidayCalendarId,
    disabledHolidayRuleIds,
    customHolidays
  })

  return {
    weekdayOpenDays,
    holidayCount,
    holidayImpactDays,
    calendarOpenDays: Math.max(weekdayOpenDays - holidayImpactDays, 0)
  }
}

const buildMonthlyWarnings = ({
  operatingWeekdays,
  openDays,
  paidHoursPerMonth,
  totalLossHours,
  otherLossHoursPerDay,
  paidHoursPerDay,
  presencePercentRaw,
  utilizationPercentRaw,
  randomLossPercent,
  scheduledPercent,
  contacts,
  ahtSeconds
}) => {
  const presenceWarnings = []
  const utilizationWarnings = []
  const randomWarnings = []
  const planWarnings = []

  if (!operatingWeekdays.length) {
    presenceWarnings.push('No operating weekdays are selected, so open days are zero until you turn at least one day on.')
    planWarnings.push('No operating weekdays are selected, so the final plan cannot create monthly capacity.')
  }

  if (openDays === 0 && operatingWeekdays.length) {
    presenceWarnings.push('Open days are zero after applying the operating days and holiday closures. Check the call center schedule.')
    planWarnings.push('Open days are zero for this month, so the plan shows no monthly paid capacity.')
  }

  if (paidHoursPerMonth === 0 && totalLossHours > 0) {
    presenceWarnings.push('Presence hours are entered, but monthly paid hours are zero. Check open days or paid hours per day.')
  }

  if (otherLossHoursPerDay >= paidHoursPerDay && paidHoursPerDay > 0) {
    presenceWarnings.push('Daily other loss is consuming all paid hours in the day. Recheck paid breaks or other away time.')
  }

  if (presencePercentRaw <= 0 && paidHoursPerMonth > 0) {
    presenceWarnings.push('Absence losses total 100% or more of paid hours. The planner is clamping presence to avoid impossible staffing math.')
  }

  if (utilizationPercentRaw <= 0) {
    utilizationWarnings.push('Scheduled and other utilization losses fully consume the present time in the month. Utilization is clamped to keep the plan calculable.')
  }

  if (randomLossPercent >= scheduledPercent && scheduledPercent > 0) {
    randomWarnings.push('Total scheduled random loss is consuming all scheduled capacity. Recheck the adherence and occupancy assumptions.')
  }

  if (contacts > 0 && paidHoursPerMonth === 0) {
    planWarnings.push('Contacts are forecasted, but paid hours per FTE are zero. The final staffing result will stay at zero until presence inputs are fixed.')
  }

  if (contacts === 0 && ahtSeconds > 0) {
    planWarnings.push('AHT is populated, but contacts are zero. The month will show no workload until demand is entered.')
  }

  return {
    presenceWarnings,
    utilizationWarnings,
    randomWarnings,
    planWarnings
  }
}

export const computeMonthlyRecords = ({
  planningYear,
  requirementMethod,
  demandSource,
  operatingWeekdays,
  holidayCalendarId,
  disabledHolidayRuleIds,
  customHolidays,
  holidayScheduleMode,
  presenceMonths,
  randomDefaults,
  useMonthlyRandomOverrides,
  randomMonths,
  planMonths
}) =>
  {
    const forecastDailyDemandByMonthIndex =
      demandSource?.mode === DEMAND_SOURCE_FORECAST
        ? summarizeForecastDailyDemandForOpenDays({
            forecastDailySnapshot: demandSource?.forecastDailySnapshot,
            planningYear,
            operatingWeekdays,
            holidayCalendarId,
            disabledHolidayRuleIds,
            customHolidays
          })
        : new Map()
    const hasForecastDailyDemand =
      demandSource?.mode === DEMAND_SOURCE_FORECAST &&
      Array.isArray(demandSource?.forecastDailySnapshot) &&
      demandSource.forecastDailySnapshot.length > 0
    const forecastMonthByMonthIndex =
      demandSource?.mode === DEMAND_SOURCE_FORECAST
        ? buildForecastMonthByMonthIndex(demandSource)
        : new Map()

    return MONTH_LABELS.map((label, monthIndex) => {
    const resolvedRequirementMethod = normalizePlanRequirementMethod(requirementMethod)
    const presenceInput = createPresenceMonth(presenceMonths?.[monthIndex] || {})
    const randomInput = useMonthlyRandomOverrides
      ? createRandomMonth(randomMonths?.[monthIndex] || {})
      : createRandomMonth(randomDefaults || {})
    const planInput = createPlanMonth(planMonths?.[monthIndex] || {})
    const filteredForecastDemand = forecastDailyDemandByMonthIndex.get(monthIndex) || null
    const forecastMonth = forecastMonthByMonthIndex.get(monthIndex) || null

    const {
      weekdayOpenDays,
      holidayCount,
      holidayImpactDays,
      calendarOpenDays
    } = calculateCalendarOpenDays(
      planningYear,
      monthIndex,
      operatingWeekdays,
      normalizeHolidayCalendarId(holidayCalendarId, HOLIDAY_CALENDAR_NONE),
      normalizeHolidayScheduleMode(holidayScheduleMode, HOLIDAY_SCHEDULE_CLOSED),
      normalizeDisabledHolidayRuleIds(disabledHolidayRuleIds),
      normalizeCustomHolidays(customHolidays)
    )
    const openDays = calendarOpenDays
    const paidHoursPerDay = clamp(toNumber(presenceInput.paidHoursPerDay, 8), 0, 24)
    const paidHoursPerMonth = openDays * paidHoursPerDay

    const plannedTimeOffHours = Math.max(toNumber(presenceInput.plannedTimeOffHours, 0), 0)
    const unplannedTimeOffHours = Math.max(toNumber(presenceInput.unplannedTimeOffHours, 0), 0)
    const leaveTimeHours = Math.max(toNumber(presenceInput.leaveTimeHours, 0), 0)
    const meetingsHours = Math.max(toNumber(presenceInput.meetingsHours, 0), 0)
    const trainingHours = Math.max(toNumber(presenceInput.trainingHours, 0), 0)
    const coachingHours = Math.max(toNumber(presenceInput.coachingHours, 0), 0)
    const paidBreaksHoursPerDay = Math.max(toNumber(presenceInput.paidBreaksHoursPerDay, 0), 0)
    const otherAwayHoursPerDay = Math.max(toNumber(presenceInput.otherAwayHoursPerDay, 0), 0)

    const rawPaidBreaksHours = paidBreaksHoursPerDay * openDays
    const rawOtherAwayHours = otherAwayHoursPerDay * openDays
    const otherLossHoursPerDay = paidBreaksHoursPerDay + otherAwayHoursPerDay

    const absenceLossHours = plannedTimeOffHours + unplannedTimeOffHours + leaveTimeHours
    const scheduledLossHours = meetingsHours + trainingHours + coachingHours
    const absenceLossPercent = paidHoursPerMonth > 0 ? (absenceLossHours / paidHoursPerMonth) * 100 : 0

    const presencePercentRaw = 100 - absenceLossPercent
    const presencePercent = paidHoursPerMonth > 0 ? clamp(presencePercentRaw, 1, 100) : 0
    const presenceShare = paidHoursPerMonth > 0 ? clamp(presencePercentRaw, 1, 100) / 100 : 1
    const presentHours = paidHoursPerMonth * presenceShare
    const presenceFactor = paidHoursPerMonth > 0 ? 1 / presenceShare : 1

    const paidBreaksHours = rawPaidBreaksHours * presenceShare
    const otherAwayHours = rawOtherAwayHours * presenceShare
    const otherLossHours = paidBreaksHours + otherAwayHours
    const utilizationLossHours = scheduledLossHours + otherLossHours
    const totalLossHours = absenceLossHours + scheduledLossHours + otherLossHours

    const utilizationPercentRaw = presentHours > 0 ? 100 - (utilizationLossHours / presentHours) * 100 : 0
    const utilizationPercent = presentHours > 0 ? clamp(utilizationPercentRaw, 1, 100) : 0
    const utilizationShare = presentHours > 0 ? clamp(utilizationPercentRaw, 1, 100) / 100 : 1
    const utilizationFactor = 1 / utilizationShare
    const scheduledPercent = paidHoursPerMonth > 0 ? presenceShare * utilizationShare * 100 : 0
    const scheduledHours = paidHoursPerMonth * presenceShare * utilizationShare

    const occupancyPercent = clamp(toNumber(randomInput.occupancyPercent, 90), 1, 100)
    const adherencePercent = clamp(toNumber(randomInput.adherencePercent, 95), 1, 100)
    const occupancyShare = occupancyPercent / 100
    const adherenceShare = adherencePercent / 100
    const adherenceLossPercent = (1 - adherenceShare) * scheduledPercent
    const scheduledAfterAdherencePercent = scheduledPercent - adherenceLossPercent
    const occupancyLossPercent = (1 - occupancyShare) * scheduledAfterAdherencePercent
    const randomLossPercent = adherenceLossPercent + occupancyLossPercent
    const designFactorPercent = scheduledPercent - randomLossPercent
    const designFactorShare = designFactorPercent / 100
    const workloadStaffingRatio = designFactorShare > 0 ? 1 / designFactorShare : 0

    const contacts = hasForecastDailyDemand
      ? Math.max(toNumber(filteredForecastDemand?.contacts, 0), 0)
      : Math.max(toNumber(planInput.contacts, 0), 0)
    const forecastAhtSeconds = forecastMonth?.ahtSeconds == null
      ? null
      : Math.max(toNumber(forecastMonth.ahtSeconds, 0), 0)
    const ahtSeconds = forecastAhtSeconds != null
      ? forecastAhtSeconds
      : Math.max(toNumber(planInput.ahtSeconds, 0), 0)
    const peakDayUpliftPercent = hasForecastDailyDemand
      ? derivePeakDayUpliftPercent(filteredForecastDemand || {})
      : Math.max(toNumber(planInput.peakDayUpliftPercent, 0), 0)
    const averageDailyContacts = hasForecastDailyDemand
      ? Math.max(toNumber(filteredForecastDemand?.averageDailyVolume, 0), 0)
      : openDays > 0
        ? contacts / openDays
        : 0
    const peakDayContacts = hasForecastDailyDemand
      ? Math.max(toNumber(filteredForecastDemand?.peakDailyVolume, 0), 0)
      : averageDailyContacts * (1 + peakDayUpliftPercent / 100)
    const workloadHours = (contacts * ahtSeconds) / 3600
    const peakDayWorkloadHours = (peakDayContacts * ahtSeconds) / 3600
    const requiredStaffHours = workloadHours * workloadStaffingRatio
    const peakDayRequiredStaffHours = peakDayWorkloadHours * workloadStaffingRatio
    const requiredHeadcount = paidHoursPerMonth > 0 ? requiredStaffHours / paidHoursPerMonth : 0
    const peakDayRequiredHeadcount = paidHoursPerDay > 0 ? peakDayRequiredStaffHours / paidHoursPerDay : 0
    const roundedHeadcount = requiredHeadcount > 0 ? Math.ceil(requiredHeadcount) : 0
    const avgDailyContacts = openDays > 0 ? contacts / openDays : 0
    const isIntradayErlang = resolvedRequirementMethod === PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG

    const warnings = buildMonthlyWarnings({
      operatingWeekdays,
      openDays,
      paidHoursPerMonth,
      totalLossHours,
      otherLossHoursPerDay,
      paidHoursPerDay,
      presencePercentRaw,
      utilizationPercentRaw,
      randomLossPercent,
      scheduledPercent,
      contacts,
      ahtSeconds
    })

    return {
      monthIndex,
      label,
      fullLabel: FULL_MONTH_LABELS[monthIndex],
      requirementMethod: resolvedRequirementMethod,
      isIntradayErlang,
      weekdayOpenDays,
      holidayCount,
      holidayImpactDays,
      calendarOpenDays,
      openDays,
      paidHoursPerDay,
      paidHoursPerMonth,
      plannedTimeOffHours,
      unplannedTimeOffHours,
      leaveTimeHours,
      meetingsHours,
      trainingHours,
      coachingHours,
      paidBreaksHoursPerDay,
      otherAwayHoursPerDay,
      rawPaidBreaksHours,
      rawOtherAwayHours,
      paidBreaksHours,
      otherAwayHours,
      otherLossHoursPerDay,
      absenceLossHours,
      scheduledLossHours,
      otherLossHours,
      utilizationLossHours,
      presentHours,
      scheduledHours,
      totalLossHours,
      presencePercent,
      presenceFactor,
      utilizationPercent,
      utilizationFactor,
      scheduledPercent,
      occupancyPercent,
      adherencePercent,
      adherenceLossPercent,
      occupancyLossPercent,
      randomLossPercent,
      designFactorPercent,
      workloadStaffingRatio,
      contacts,
      ahtSeconds,
      peakDayUpliftPercent,
      averageDailyContacts,
      avgDailyContacts,
      peakDayContacts,
      workloadHours,
      erlangStaffedHours: null,
      weightedOccupancyPercent: null,
      weightedServiceLevelPercent: null,
      peakDayWorkloadHours,
      requiredStaffHours,
      peakDayRequiredStaffHours,
      requiredHeadcount,
      peakDayRequiredHeadcount,
      peakIntervalRequiredHeadcount: null,
      roundedHeadcount,
      ...warnings
    }
  })
  }

export const summarizePresenceRecords = (monthlyRecords) => ({
  totalOpenDays: monthlyRecords.reduce((sum, row) => sum + row.openDays, 0),
  averageAbsenceLossHours: average(monthlyRecords.map((row) => row.absenceLossHours)),
  averageScheduledLossHours: average(monthlyRecords.map((row) => row.scheduledLossHours)),
  averageOtherLossHours: average(monthlyRecords.map((row) => row.otherLossHours)),
  averageTotalLossHours: average(monthlyRecords.map((row) => row.totalLossHours)),
  averagePresence: average(monthlyRecords.map((row) => row.presencePercent))
})

export const summarizeRandomRecords = (monthlyRecords, randomDefaults, useMonthlyRandomOverrides) => ({
  usesMonthlyOverrides: Boolean(useMonthlyRandomOverrides),
  globalOccupancyPercent: clamp(toNumber(randomDefaults?.occupancyPercent, 90), 1, 100),
  globalAdherencePercent: clamp(toNumber(randomDefaults?.adherencePercent, 95), 1, 100),
  averageOccupancyPercent: average(monthlyRecords.map((row) => row.occupancyPercent)),
  averageAdherencePercent: average(monthlyRecords.map((row) => row.adherencePercent)),
  averageAdherenceLossPercent: average(monthlyRecords.map((row) => row.adherenceLossPercent)),
  averageOccupancyLossPercent: average(monthlyRecords.map((row) => row.occupancyLossPercent)),
  averageRandomLossPercent: average(monthlyRecords.map((row) => row.randomLossPercent))
})

export const summarizePlanRecords = (monthlyRecords) => {
  const resolvedRequirementMethod = normalizePlanRequirementMethod(monthlyRecords[0]?.requirementMethod)
  const peakMonth = monthlyRecords.reduce((peak, row) => (row.requiredHeadcount > peak.requiredHeadcount ? row : peak))
  const peakDayMonth = monthlyRecords.reduce((peak, row) =>
    row.peakDayRequiredHeadcount > peak.peakDayRequiredHeadcount ? row : peak
  )
  const peakIntervalMonth = monthlyRecords.reduce((peak, row) =>
    (row.peakIntervalRequiredHeadcount || 0) > (peak.peakIntervalRequiredHeadcount || 0) ? row : peak
  )
  const busiestMonth = monthlyRecords.reduce((busiest, row) =>
    row.workloadHours > busiest.workloadHours ? row : busiest
  )
  const annualContacts = monthlyRecords.reduce((sum, row) => sum + row.contacts, 0)
  const annualWorkloadHours = monthlyRecords.reduce((sum, row) => sum + row.workloadHours, 0)
  const annualErlangStaffedHours = monthlyRecords.reduce((sum, row) => sum + (row.erlangStaffedHours || 0), 0)
  const annualRequiredStaffHours = monthlyRecords.reduce((sum, row) => sum + row.requiredStaffHours, 0)
  const averageAhtSeconds =
    annualContacts > 0
      ? (annualWorkloadHours * 3600) / annualContacts
      : average(monthlyRecords.map((row) => row.ahtSeconds))
  const minimumRequiredHeadcount = monthlyRecords.length
    ? monthlyRecords.reduce(
        (minimum, row) => Math.min(minimum, row.requiredHeadcount),
        monthlyRecords[0].requiredHeadcount
      )
    : 0

  return {
    requirementMethod: resolvedRequirementMethod,
    peakMonth,
    peakDayMonth,
    peakIntervalMonth,
    busiestMonth,
    annualContacts,
    annualWorkloadHours,
    annualErlangStaffedHours,
    annualRequiredStaffHours,
    averageAhtSeconds,
    minimumRequiredHeadcount,
    averageWeightedOccupancyPercent: average(
      monthlyRecords
        .map((row) => row.weightedOccupancyPercent)
        .filter((value) => typeof value === 'number' && Number.isFinite(value))
    ),
    averageWeightedServiceLevelPercent: average(
      monthlyRecords
        .map((row) => row.weightedServiceLevelPercent)
        .filter((value) => typeof value === 'number' && Number.isFinite(value))
    ),
    averageRequiredStaffHours: average(monthlyRecords.map((row) => row.requiredStaffHours)),
    averageRequiredHeadcount: average(monthlyRecords.map((row) => row.requiredHeadcount)),
    averagePeakRequiredHeadcount: average(monthlyRecords.map((row) => row.peakDayRequiredHeadcount)),
    averagePeakIntervalRequiredHeadcount: average(
      monthlyRecords
        .map((row) => row.peakIntervalRequiredHeadcount)
        .filter((value) => typeof value === 'number' && Number.isFinite(value))
    )
  }
}

export const collectPlannerWarnings = (monthlyRecords) =>
  monthlyRecords.flatMap((row) =>
    [...row.presenceWarnings, ...row.utilizationWarnings, ...row.randomWarnings, ...row.planWarnings].map(
      (message) => `${row.label}: ${message}`
    )
  )

export const getMonthlyChartMax = (monthlyRecords) =>
  Math.max(...monthlyRecords.flatMap((row) => [row.workloadHours, row.requiredStaffHours]), 1)
