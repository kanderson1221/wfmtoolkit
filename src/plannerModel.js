export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const FULL_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

export const WEEKDAY_FALLBACK = [1, 2, 3, 4, 5]

export const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const average = (values) => {
  if (!Array.isArray(values) || !values.length) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export const normalizeWeekdays = (weekdays) =>
  Array.isArray(weekdays) && weekdays.length
    ? [...new Set(weekdays.map((value) => toNumber(value, 0)))].sort((left, right) => left - right)
    : [...WEEKDAY_FALLBACK]

export const createPresenceMonth = (overrides = {}) => ({
  dayAdjustment: 0,
  paidHoursPerDay: 8,
  plannedTimeOffHours: 0,
  unplannedTimeOffHours: 0,
  leaveTimeHours: 0,
  meetingsHours: 0,
  trainingHours: 0,
  coachingHours: 0,
  paidBreaksHoursPerDay: 0,
  otherAwayHoursPerDay: 0,
  ...overrides
})

export const createRandomMonth = (overrides = {}) => ({
  occupancyPercent: 90,
  adherencePercent: 95,
  ...overrides
})

export const createPlanMonth = (overrides = {}) => ({
  contacts: '',
  ahtSeconds: 300,
  ...overrides
})

export const createTrainingSettings = (overrides = {}) => ({
  trainingDurationWorkdays: clamp(Math.round(toNumber(overrides.trainingDurationWorkdays, 20)), 1, 260),
  graduationYieldPercent: clamp(toNumber(overrides.graduationYieldPercent, 100), 0, 100),
  availableTrainers: Math.max(Math.round(toNumber(overrides.availableTrainers, 1)), 0),
  maxClassSize: Math.max(Math.round(toNumber(overrides.maxClassSize, 10)), 0),
  postTrainingNestingDays: clamp(Math.round(toNumber(overrides.postTrainingNestingDays, 0)), 0, 260),
  startOnFirstBusinessDayOfWeek: overrides.startOnFirstBusinessDayOfWeek !== false
})

export const createStaffingMonth = (overrides = {}) => {
  const { frontlineAttritionHeadcount, attritionHeadcount, ...rest } = overrides || {}

  return {
    frontlineAttritionHeadcount: Math.max(toNumber(frontlineAttritionHeadcount ?? attritionHeadcount, 0), 0),
    ...rest
  }
}

export const createTrainingClass = (overrides = {}) => {
  const {
    id = '',
    hireDate,
    startDate,
    hireCount,
    targetGraduationHeadcount = 0,
    source = 'manual',
    ...rest
  } = overrides || {}

  return {
    id,
    hireDate: hireDate ?? startDate ?? '',
    hireCount: Math.max(Math.round(toNumber(hireCount ?? targetGraduationHeadcount, 0)), 0),
    source,
    ...rest
  }
}

export const createActualMonth = (overrides = {}) => ({
  actualPlannedTimeOffHours: 0,
  actualUnplannedTimeOffHours: 0,
  actualLeaveTimeHours: 0,
  actualMeetingsHours: 0,
  actualTrainingHours: 0,
  actualCoachingHours: 0,
  actualPaidBreaksHoursPerDay: 0,
  actualOtherAwayHoursPerDay: 0,
  actualAdherencePercent: 95,
  actualOccupancyPercent: 90,
  actualContacts: 0,
  actualAhtSeconds: 300,
  actualHeadcount: 0,
  ...overrides
})

export const buildPresenceMonths = () => MONTH_LABELS.map(() => createPresenceMonth())
export const buildRandomMonths = () => MONTH_LABELS.map(() => createRandomMonth())
export const buildPlanMonths = () => MONTH_LABELS.map(() => createPlanMonth())
export const buildStaffingMonths = () => MONTH_LABELS.map(() => createStaffingMonth())
export const buildActualMonths = () => MONTH_LABELS.map(() => createActualMonth())
export const buildTrainingClasses = () => []

export const calculateCalendarOpenDays = (year, monthIndex, activeDays) => {
  if (!activeDays.length) {
    return 0
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  let openDays = 0

  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(year, monthIndex, day).getDay()
    if (activeDays.includes(weekday)) {
      openDays += 1
    }
  }

  return openDays
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
    presenceWarnings.push('Open days are zero after the monthly day adjustment. Check holidays or temporary closures.')
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
  operatingWeekdays,
  presenceMonths,
  randomDefaults,
  useMonthlyRandomOverrides,
  randomMonths,
  planMonths
}) =>
  MONTH_LABELS.map((label, monthIndex) => {
    const presenceInput = createPresenceMonth(presenceMonths?.[monthIndex] || {})
    const randomInput = useMonthlyRandomOverrides
      ? createRandomMonth(randomMonths?.[monthIndex] || {})
      : createRandomMonth(randomDefaults || {})
    const planInput = createPlanMonth(planMonths?.[monthIndex] || {})

    const calendarOpenDays = calculateCalendarOpenDays(planningYear, monthIndex, operatingWeekdays)
    const dayAdjustment = Math.round(toNumber(presenceInput.dayAdjustment, 0))
    const openDays = Math.max(calendarOpenDays + dayAdjustment, 0)
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

    const contacts = Math.max(toNumber(planInput.contacts, 0), 0)
    const ahtSeconds = Math.max(toNumber(planInput.ahtSeconds, 0), 0)
    const workloadHours = (contacts * ahtSeconds) / 3600
    const requiredStaffHours = workloadHours * workloadStaffingRatio
    const requiredHeadcount = paidHoursPerMonth > 0 ? requiredStaffHours / paidHoursPerMonth : 0
    const roundedHeadcount = requiredHeadcount > 0 ? Math.ceil(requiredHeadcount) : 0

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
      calendarOpenDays,
      dayAdjustment,
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
      workloadHours,
      requiredStaffHours,
      requiredHeadcount,
      roundedHeadcount,
      ...warnings
    }
  })

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
  const peakMonth = monthlyRecords.reduce((peak, row) => (row.requiredHeadcount > peak.requiredHeadcount ? row : peak))
  const busiestMonth = monthlyRecords.reduce((busiest, row) =>
    row.workloadHours > busiest.workloadHours ? row : busiest
  )
  const annualContacts = monthlyRecords.reduce((sum, row) => sum + row.contacts, 0)
  const annualWorkloadHours = monthlyRecords.reduce((sum, row) => sum + row.workloadHours, 0)
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
    peakMonth,
    busiestMonth,
    annualContacts,
    annualWorkloadHours,
    annualRequiredStaffHours,
    averageAhtSeconds,
    minimumRequiredHeadcount,
    averageRequiredStaffHours: average(monthlyRecords.map((row) => row.requiredStaffHours)),
    averageRequiredHeadcount: average(monthlyRecords.map((row) => row.requiredHeadcount))
  }
}

export const buildSeedActualMonthsFromRecords = (monthlyRecords) =>
  monthlyRecords.map((record) =>
    createActualMonth({
      actualPlannedTimeOffHours: record.plannedTimeOffHours,
      actualUnplannedTimeOffHours: record.unplannedTimeOffHours,
      actualLeaveTimeHours: record.leaveTimeHours,
      actualMeetingsHours: record.meetingsHours,
      actualTrainingHours: record.trainingHours,
      actualCoachingHours: record.coachingHours,
      actualPaidBreaksHoursPerDay: record.paidBreaksHoursPerDay,
      actualOtherAwayHoursPerDay: record.otherAwayHoursPerDay,
      actualAdherencePercent: record.adherencePercent,
      actualOccupancyPercent: record.occupancyPercent,
      actualContacts: record.contacts,
      actualAhtSeconds: record.ahtSeconds,
      actualHeadcount: record.roundedHeadcount,
    })
  )

const buildActualWarnings = ({
  actualPaidHours,
  actualPaidHoursPerDay,
  actualAbsenceLossHours,
  actualScheduledLossHours,
  actualOtherLossHours,
  actualOtherLossHoursPerDay,
  actualPresencePercentRaw,
  actualUtilizationPercentRaw,
  actualScheduledPercent,
  actualRandomLossPercent,
  actualContacts,
  actualAhtSeconds
}) => {
  const warnings = []

  if (actualPaidHours === 0 && (actualAbsenceLossHours > 0 || actualScheduledLossHours > 0 || actualOtherLossHours > 0)) {
    warnings.push('Actual loss hours are entered, but actual FTE paid hours are zero.')
  }

  if (actualOtherLossHoursPerDay >= actualPaidHoursPerDay && actualPaidHoursPerDay > 0) {
    warnings.push('Actual daily other loss is consuming all paid hours in the day.')
  }

  if (actualPresencePercentRaw < 0 && actualPaidHours > 0) {
    warnings.push('Actual absence hours exceed actual FTE paid hours.')
  }

  if (actualUtilizationPercentRaw < 0 && actualPaidHours > 0) {
    warnings.push('Actual scheduled and other loss hours exceed actual present hours.')
  }

  if (actualRandomLossPercent >= actualScheduledPercent && actualScheduledPercent > 0) {
    warnings.push('Actual random loss consumes all scheduled capacity for the month.')
  }

  if (actualContacts > 0 && actualPaidHours === 0) {
    warnings.push('Actual contacts are entered, but actual FTE paid hours are zero.')
  }

  if (actualContacts === 0 && actualAhtSeconds > 0) {
    warnings.push('Actual AHT is entered, but actual contacts are zero.')
  }

  return warnings
}

export const computeActualRecords = (monthlyRecords, actualMonths) =>
  monthlyRecords.map((planned, monthIndex) => {
    const actualInput = createActualMonth(actualMonths?.[monthIndex] || {})

    const actualHeadcount = Math.max(toNumber(actualInput.actualHeadcount, 0), 0)
    const actualPaidHoursPerDay = Math.max(toNumber(planned.paidHoursPerDay, 0), 0)
    const actualPaidHours = Math.max(toNumber(planned.paidHoursPerMonth, 0), 0)
    const actualPlannedTimeOffHours = Math.max(toNumber(actualInput.actualPlannedTimeOffHours, planned.plannedTimeOffHours), 0)
    const actualUnplannedTimeOffHours = Math.max(toNumber(actualInput.actualUnplannedTimeOffHours, planned.unplannedTimeOffHours), 0)
    const actualLeaveTimeHours = Math.max(toNumber(actualInput.actualLeaveTimeHours, planned.leaveTimeHours), 0)
    const actualMeetingsHours = Math.max(toNumber(actualInput.actualMeetingsHours, planned.meetingsHours), 0)
    const actualTrainingHours = Math.max(toNumber(actualInput.actualTrainingHours, planned.trainingHours), 0)
    const actualCoachingHours = Math.max(toNumber(actualInput.actualCoachingHours, planned.coachingHours), 0)
    const actualPaidBreaksHoursPerDay = Math.max(
      toNumber(actualInput.actualPaidBreaksHoursPerDay, planned.paidBreaksHoursPerDay),
      0
    )
    const actualOtherAwayHoursPerDay = Math.max(
      toNumber(actualInput.actualOtherAwayHoursPerDay, planned.otherAwayHoursPerDay),
      0
    )
    const actualRawPaidBreaksHours = actualPaidBreaksHoursPerDay * planned.openDays
    const actualRawOtherAwayHours = actualOtherAwayHoursPerDay * planned.openDays
    const actualAbsenceLossHours =
      actualPlannedTimeOffHours + actualUnplannedTimeOffHours + actualLeaveTimeHours
    const actualScheduledLossHours =
      actualMeetingsHours + actualTrainingHours + actualCoachingHours
    const actualAdherencePercent = clamp(toNumber(actualInput.actualAdherencePercent, planned.adherencePercent), 0, 100)
    const actualOccupancyPercent = clamp(toNumber(actualInput.actualOccupancyPercent, planned.occupancyPercent), 0, 100)
    const actualContacts = Math.max(toNumber(actualInput.actualContacts, planned.contacts), 0)
    const actualAhtSeconds = Math.max(toNumber(actualInput.actualAhtSeconds, planned.ahtSeconds), 0)

    const actualPresencePercentRaw = actualPaidHours > 0 ? ((actualPaidHours - actualAbsenceLossHours) / actualPaidHours) * 100 : 0
    const actualPresencePercent = actualPaidHours > 0 ? clamp(actualPresencePercentRaw, 0, 100) : 0
    const actualPresenceShare = actualPresencePercent / 100
    const actualPresentHours = actualPaidHours * actualPresenceShare
    const actualPaidBreaksHours = actualRawPaidBreaksHours * actualPresenceShare
    const actualOtherAwayHours = actualRawOtherAwayHours * actualPresenceShare
    const actualOtherLossHours = actualPaidBreaksHours + actualOtherAwayHours
    const actualOtherLossHoursPerDay = actualPaidBreaksHoursPerDay + actualOtherAwayHoursPerDay

    const actualUtilizationPercentRaw =
      actualPresentHours > 0
        ? ((actualPresentHours - actualScheduledLossHours - actualOtherLossHours) / actualPresentHours) * 100
        : 0
    const actualUtilizationPercent = actualPresentHours > 0 ? clamp(actualUtilizationPercentRaw, 0, 100) : 0
    const actualScheduledHours = Math.max(actualPresentHours - actualScheduledLossHours - actualOtherLossHours, 0)
    const actualScheduledPercent = actualPaidHours > 0 ? (actualScheduledHours / actualPaidHours) * 100 : 0

    const actualAdherenceLossPercent = (1 - actualAdherencePercent / 100) * actualScheduledPercent
    const actualScheduledAfterAdherencePercent = actualScheduledPercent - actualAdherenceLossPercent
    const actualOccupancyLossPercent = (1 - actualOccupancyPercent / 100) * actualScheduledAfterAdherencePercent
    const actualRandomLossPercent = actualAdherenceLossPercent + actualOccupancyLossPercent
    const actualDesignFactorPercent = Math.max(actualScheduledPercent - actualRandomLossPercent, 0)
    const actualDesignFactorShare = actualDesignFactorPercent / 100
    const actualWorkloadStaffingRatio = actualDesignFactorShare > 0 ? 1 / actualDesignFactorShare : 0
    const actualWorkloadHours = (actualContacts * actualAhtSeconds) / 3600
    const actualRequiredStaffHours = actualWorkloadHours * actualWorkloadStaffingRatio
    const actualRequiredHeadcount = actualPaidHours > 0 ? actualRequiredStaffHours / actualPaidHours : 0
    const actualRoundedHeadcount = actualRequiredHeadcount > 0 ? Math.ceil(actualRequiredHeadcount) : 0

    return {
      monthIndex,
      label: planned.label,
      fullLabel: planned.fullLabel,
      planned,
      actualHeadcount,
      actualPaidHoursPerDay,
      actualPaidHours,
      actualPlannedTimeOffHours,
      actualUnplannedTimeOffHours,
      actualLeaveTimeHours,
      actualMeetingsHours,
      actualTrainingHours,
      actualCoachingHours,
      actualPaidBreaksHoursPerDay,
      actualOtherAwayHoursPerDay,
      actualRawPaidBreaksHours,
      actualRawOtherAwayHours,
      actualPaidBreaksHours,
      actualOtherAwayHours,
      actualAbsenceLossHours,
      actualScheduledLossHours,
      actualOtherLossHours,
      actualOtherLossHoursPerDay,
      actualAdherencePercent,
      actualOccupancyPercent,
      actualContacts,
      actualAhtSeconds,
      actualPresencePercent,
      actualUtilizationPercent,
      actualScheduledPercent,
      actualAdherenceLossPercent,
      actualOccupancyLossPercent,
      actualRandomLossPercent,
      actualDesignFactorPercent,
      actualWorkloadStaffingRatio,
      actualWorkloadHours,
      actualRequiredStaffHours,
      actualRequiredHeadcount,
      actualRoundedHeadcount,
      workloadHoursVariance: actualWorkloadHours - planned.workloadHours,
      requiredStaffHoursVariance: actualRequiredStaffHours - planned.requiredStaffHours,
      requiredHeadcountVariance: actualRequiredHeadcount - planned.requiredHeadcount,
      actualHeadcountVariance: actualHeadcount - planned.requiredHeadcount,
      contactsVariance: actualContacts - planned.contacts,
      ahtSecondsVariance: actualAhtSeconds - planned.ahtSeconds,
      presenceVariance: actualPresencePercent - planned.presencePercent,
      utilizationVariance: actualUtilizationPercent - planned.utilizationPercent,
      scheduledVariance: actualScheduledPercent - planned.scheduledPercent,
      adherenceVariance: actualAdherencePercent - planned.adherencePercent,
      occupancyVariance: actualOccupancyPercent - planned.occupancyPercent,
      randomLossVariance: actualRandomLossPercent - planned.randomLossPercent,
      designFactorVariance: actualDesignFactorPercent - planned.designFactorPercent,
      warnings: buildActualWarnings({
        actualPaidHours,
        actualPaidHoursPerDay,
        actualAbsenceLossHours,
        actualScheduledLossHours,
        actualOtherLossHours,
        actualOtherLossHoursPerDay,
        actualPresencePercentRaw,
        actualUtilizationPercentRaw,
        actualScheduledPercent,
        actualRandomLossPercent,
        actualContacts,
        actualAhtSeconds
      })
    }
  })

export const summarizeActualRecords = (actualRecords) => ({
  annualActualContacts: actualRecords.reduce((sum, row) => sum + row.actualContacts, 0),
  annualActualWorkloadHours: actualRecords.reduce((sum, row) => sum + row.actualWorkloadHours, 0),
  annualActualRequiredStaffHours: actualRecords.reduce((sum, row) => sum + row.actualRequiredStaffHours, 0),
  averageActualHeadcount: average(actualRecords.map((row) => row.actualHeadcount)),
  averageActualRequiredHeadcount: average(actualRecords.map((row) => row.actualRequiredHeadcount)),
  peakActualHeadcount: actualRecords.reduce((peak, row) => Math.max(peak, row.actualHeadcount), 0),
  peakActualRequiredHeadcount: actualRecords.reduce((peak, row) => Math.max(peak, row.actualRequiredHeadcount), 0),
  averageActualPresence: average(actualRecords.map((row) => row.actualPresencePercent)),
  averageActualUtilization: average(actualRecords.map((row) => row.actualUtilizationPercent)),
  averageActualScheduled: average(actualRecords.map((row) => row.actualScheduledPercent)),
  averageActualRandomLoss: average(actualRecords.map((row) => row.actualRandomLossPercent)),
  averageActualDesignFactor: average(actualRecords.map((row) => row.actualDesignFactorPercent)),
  averageRequiredHeadcountVariance: average(actualRecords.map((row) => row.requiredHeadcountVariance)),
  averageActualHeadcountVariance: average(actualRecords.map((row) => row.actualHeadcountVariance)),
  averageDesignFactorVariance: average(actualRecords.map((row) => row.designFactorVariance)),
  warningCount: actualRecords.reduce((sum, row) => sum + row.warnings.length, 0)
})

export const summarizeActualPresenceRecords = (actualRecords) => ({
  totalOpenDays: actualRecords.reduce((sum, row) => sum + row.planned.openDays, 0),
  averageAbsenceLossHours: average(actualRecords.map((row) => row.actualAbsenceLossHours)),
  averageScheduledLossHours: average(actualRecords.map((row) => row.actualScheduledLossHours)),
  averageOtherLossHours: average(actualRecords.map((row) => row.actualOtherLossHours)),
  averageTotalLossHours: average(
    actualRecords.map((row) => row.actualAbsenceLossHours + row.actualScheduledLossHours + row.actualOtherLossHours)
  ),
  averagePresence: average(actualRecords.map((row) => row.actualPresencePercent)),
  averageUtilization: average(actualRecords.map((row) => row.actualUtilizationPercent)),
  averageScheduled: average(actualRecords.map((row) => row.actualScheduledPercent))
})

export const summarizeActualRandomRecords = (actualRecords) => ({
  averageOccupancyPercent: average(actualRecords.map((row) => row.actualOccupancyPercent)),
  averageAdherencePercent: average(actualRecords.map((row) => row.actualAdherencePercent)),
  averageAdherenceLossPercent: average(actualRecords.map((row) => row.actualAdherenceLossPercent)),
  averageOccupancyLossPercent: average(actualRecords.map((row) => row.actualOccupancyLossPercent)),
  averageRandomLossPercent: average(actualRecords.map((row) => row.actualRandomLossPercent))
})

export const summarizeActualPlanRecords = (actualRecords) => {
  const peakMonth = actualRecords.reduce(
    (peak, row) => (row.actualRequiredHeadcount > peak.actualRequiredHeadcount ? row : peak),
    actualRecords[0] || { actualRequiredHeadcount: 0, fullLabel: 'Month', actualWorkloadHours: 0 }
  )
  const busiestMonth = actualRecords.reduce(
    (busiest, row) => (row.actualWorkloadHours > busiest.actualWorkloadHours ? row : busiest),
    actualRecords[0] || { actualWorkloadHours: 0, fullLabel: 'Month' }
  )
  const annualActualContacts = actualRecords.reduce((sum, row) => sum + row.actualContacts, 0)
  const annualActualWorkloadHours = actualRecords.reduce((sum, row) => sum + row.actualWorkloadHours, 0)
  const annualActualRequiredStaffHours = actualRecords.reduce((sum, row) => sum + row.actualRequiredStaffHours, 0)
  const averageActualAhtSeconds =
    annualActualContacts > 0
      ? (annualActualWorkloadHours * 3600) / annualActualContacts
      : average(actualRecords.map((row) => row.actualAhtSeconds))

  return {
    peakMonth,
    busiestMonth,
    annualActualContacts,
    annualActualWorkloadHours,
    annualActualRequiredStaffHours,
    averageActualAhtSeconds,
    averageActualRequiredStaffHours: average(actualRecords.map((row) => row.actualRequiredStaffHours)),
    averageActualRequiredHeadcount: average(actualRecords.map((row) => row.actualRequiredHeadcount)),
    averageActualHeadcount: average(actualRecords.map((row) => row.actualHeadcount)),
    peakActualHeadcount: actualRecords.reduce((peak, row) => Math.max(peak, row.actualHeadcount), 0)
  }
}

const parseDate = (value) => {
  if (!value) {
    return null
  }

  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const monthStart = (year, monthIndex) => new Date(year, monthIndex, 1)
const monthEnd = (year, monthIndex) => new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
const workdayWeekdays = new Set([1, 2, 3, 4, 5])
const millisecondsPerDay = 1000 * 60 * 60 * 24

const isWorkday = (date) => workdayWeekdays.has(date.getDay())

const moveToWorkdayOnOrAfter = (date) => {
  const nextDate = new Date(date)

  while (!isWorkday(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1)
  }

  return nextDate
}

const moveToWorkdayOnOrBefore = (date) => {
  const nextDate = new Date(date)

  while (!isWorkday(nextDate)) {
    nextDate.setDate(nextDate.getDate() - 1)
  }

  return nextDate
}

const moveToFirstWorkdayOfWeek = (date) => {
  const nextDate = new Date(date)
  const weekdayOffset = (nextDate.getDay() + 6) % 7
  nextDate.setDate(nextDate.getDate() - weekdayOffset)
  return moveToWorkdayOnOrAfter(nextDate)
}

const moveToFirstWorkdayOfPreviousWeek = (date) => {
  const nextDate = moveToFirstWorkdayOfWeek(date)
  nextDate.setDate(nextDate.getDate() - 7)
  return moveToWorkdayOnOrAfter(nextDate)
}

const shiftWorkdays = (date, offset) => {
  const nextDate = new Date(date)

  if (offset === 0) {
    return nextDate
  }

  const direction = offset > 0 ? 1 : -1
  let remaining = Math.abs(offset)

  while (remaining > 0) {
    nextDate.setDate(nextDate.getDate() + direction)

    if (isWorkday(nextDate)) {
      remaining -= 1
    }
  }

  return nextDate
}

const formatDateInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const roundHeadcount = (value) => Math.round(toNumber(value, 0) * 10) / 10

export const deriveTrainingClassMetrics = (trainingClass, trainingSettings) => {
  const normalizedClass = createTrainingClass(trainingClass)
  const normalizedSettings = createTrainingSettings(trainingSettings)
  const hireDate = parseDate(normalizedClass.hireDate)
  const graduatingHeadcount = roundHeadcount(normalizedClass.hireCount)
  const projectedGraduatingHeadcount = roundHeadcount(
    normalizedClass.hireCount * (normalizedSettings.graduationYieldPercent / 100)
  )
  const trainingFalloutHeadcount = roundHeadcount(normalizedClass.hireCount - projectedGraduatingHeadcount)

  if (!hireDate) {
    return {
      hireDate: null,
      graduationDate: null,
      frontlineReadyDate: null,
      isValid: false,
      trainingDurationWorkdays: normalizedSettings.trainingDurationWorkdays,
      postTrainingNestingDays: normalizedSettings.postTrainingNestingDays,
      graduatingHeadcount,
      projectedGraduatingHeadcount,
      trainingFalloutHeadcount
    }
  }

  const graduationDate = shiftWorkdays(
    hireDate,
    Math.max(normalizedSettings.trainingDurationWorkdays - 1, 0)
  )
  const frontlineReadyDate = shiftWorkdays(
    graduationDate,
    normalizedSettings.postTrainingNestingDays
  )

  return {
    hireDate,
    graduationDate,
    frontlineReadyDate,
    isValid: true,
    trainingDurationWorkdays: normalizedSettings.trainingDurationWorkdays,
    postTrainingNestingDays: normalizedSettings.postTrainingNestingDays,
    graduatingHeadcount,
    projectedGraduatingHeadcount,
    trainingFalloutHeadcount
  }
}

const buildTrainingClassMonthlySummary = (planningYear, trainingClasses, trainingSettings) => {
  const normalizedSettings = createTrainingSettings(trainingSettings)
  const normalizedClasses = (Array.isArray(trainingClasses) ? trainingClasses : []).map((trainingClass, index) => {
    const nextClass = createTrainingClass(trainingClass)
    const metrics = deriveTrainingClassMetrics(nextClass, normalizedSettings)

    return {
      ...nextClass,
      id: nextClass.id || `training-class-${index + 1}`,
      parsedHireDate: metrics.hireDate,
      parsedGraduationDate: metrics.graduationDate,
      parsedFrontlineReadyDate: metrics.frontlineReadyDate,
      graduatingHeadcount: metrics.graduatingHeadcount,
      projectedGraduatingHeadcount: metrics.projectedGraduatingHeadcount,
      trainingFalloutHeadcount: metrics.trainingFalloutHeadcount,
      trainingDurationWorkdays: metrics.trainingDurationWorkdays,
      postTrainingNestingDays: metrics.postTrainingNestingDays,
      isValidDateRange: metrics.isValid
    }
  })

  const monthlySummary = MONTH_LABELS.map((label, monthIndex) => {
    const currentMonthStart = monthStart(planningYear, monthIndex)
    const currentMonthEnd = monthEnd(planningYear, monthIndex)

    const classesStarting = normalizedClasses.filter(
      (trainingClass) =>
        trainingClass.isValidDateRange &&
        trainingClass.parsedHireDate.getFullYear() === planningYear &&
        trainingClass.parsedHireDate.getMonth() === monthIndex
    )

    const classesGraduating = normalizedClasses.filter(
      (trainingClass) =>
        trainingClass.isValidDateRange &&
        trainingClass.parsedGraduationDate.getFullYear() === planningYear &&
        trainingClass.parsedGraduationDate.getMonth() === monthIndex
    )

    const classesFrontlineReady = normalizedClasses.filter(
      (trainingClass) =>
        trainingClass.isValidDateRange &&
        trainingClass.parsedFrontlineReadyDate.getFullYear() === planningYear &&
        trainingClass.parsedFrontlineReadyDate.getMonth() === monthIndex
    )

    const activeClasses = normalizedClasses.filter(
      (trainingClass) =>
        trainingClass.isValidDateRange &&
        trainingClass.parsedHireDate <= currentMonthEnd &&
        trainingClass.parsedGraduationDate >= currentMonthStart
    )

    return {
      monthIndex,
      label,
      fullLabel: FULL_MONTH_LABELS[monthIndex],
      classesStartingCount: classesStarting.length,
      classesGraduatingCount: classesGraduating.length,
      classesFrontlineReadyCount: classesFrontlineReady.length,
      activeClassesCount: activeClasses.length,
      classesStarting,
      classesGraduating,
      classesFrontlineReady,
      activeClasses,
      hireHeadcount: classesStarting.reduce((sum, trainingClass) => sum + trainingClass.hireCount, 0),
      graduatingHeadcount: classesGraduating.reduce((sum, trainingClass) => sum + trainingClass.graduatingHeadcount, 0),
      trainingFalloutHeadcount: classesGraduating.reduce((sum, trainingClass) => sum + trainingClass.trainingFalloutHeadcount, 0),
      frontlineReadyHeadcount: classesFrontlineReady.reduce(
        (sum, trainingClass) => sum + trainingClass.projectedGraduatingHeadcount,
        0
      ),
      startingInTrainingHeadcount: normalizedClasses
        .filter(
          (trainingClass) =>
            trainingClass.isValidDateRange &&
            trainingClass.parsedHireDate < currentMonthStart &&
            trainingClass.parsedGraduationDate >= currentMonthStart
        )
        .reduce((sum, trainingClass) => sum + trainingClass.hireCount, 0),
      inTrainingHeadcount: normalizedClasses
        .filter(
          (trainingClass) =>
            trainingClass.isValidDateRange &&
            trainingClass.parsedHireDate <= currentMonthEnd &&
            trainingClass.parsedGraduationDate > currentMonthEnd
        )
        .reduce((sum, trainingClass) => sum + trainingClass.hireCount, 0),
      startingNonFrontlineHeadcount: normalizedClasses
        .filter(
          (trainingClass) =>
            trainingClass.isValidDateRange &&
            trainingClass.parsedHireDate < currentMonthStart &&
            trainingClass.parsedFrontlineReadyDate >= currentMonthStart
        )
        .reduce((sum, trainingClass) => {
          if (trainingClass.parsedGraduationDate >= currentMonthStart) {
            return sum + trainingClass.hireCount
          }

          return sum + trainingClass.projectedGraduatingHeadcount
        }, 0)
    }
  })

  return {
    classes: normalizedClasses,
    monthlySummary
  }
}

export const deriveStartingFrontlineHeadcount = (planningYear, startingHeadcount, trainingClasses, trainingSettings) => {
  const rosterHeadcount = Math.max(toNumber(startingHeadcount, 0), 0)
  const trainingSummary = buildTrainingClassMonthlySummary(planningYear, trainingClasses, trainingSettings)
  const startingNonFrontlineHeadcount = trainingSummary.monthlySummary[0]?.startingNonFrontlineHeadcount || 0

  return Math.min(Math.max(rosterHeadcount - startingNonFrontlineHeadcount, 0), rosterHeadcount)
}

export const computeStaffingRecords = (
  monthlyRecords,
  planningYear,
  startingHeadcount,
  startingFrontlineHeadcount,
  staffingMonths,
  trainingClasses,
  trainingSettings
) => {
  const trainingSummary = buildTrainingClassMonthlySummary(planningYear, trainingClasses, trainingSettings)
  const normalizedStartingHeadcount = Math.max(toNumber(startingHeadcount, 0), 0)
  const normalizedStartingFrontlineHeadcount = Math.max(toNumber(startingFrontlineHeadcount, normalizedStartingHeadcount), 0)
  const openingCarryInNonFrontlineHeadcount = trainingSummary.monthlySummary[0]?.startingNonFrontlineHeadcount || 0

  let runningHeadcount = Math.max(
    normalizedStartingHeadcount,
    normalizedStartingFrontlineHeadcount + openingCarryInNonFrontlineHeadcount
  )
  let runningFrontlineHeadcount = Math.min(normalizedStartingFrontlineHeadcount, runningHeadcount)

  const records = monthlyRecords.map((planned, monthIndex) => {
    const staffingInput = createStaffingMonth(staffingMonths?.[monthIndex] || {})
    const trainingMonth = trainingSummary.monthlySummary[monthIndex]
    const plannedFrontlineAttritionHeadcount = Math.max(toNumber(staffingInput.frontlineAttritionHeadcount, 0), 0)
    const frontlineAttritionHeadcount = Math.min(plannedFrontlineAttritionHeadcount, runningFrontlineHeadcount, runningHeadcount)
    const frontlineAttritionPercent =
      runningFrontlineHeadcount > 0 ? (frontlineAttritionHeadcount / runningFrontlineHeadcount) * 100 : 0
    const hireHeadcount = trainingMonth?.hireHeadcount || 0
    const graduatingHeadcount = trainingMonth?.graduatingHeadcount || 0
    const trainingFalloutHeadcount = trainingMonth?.trainingFalloutHeadcount || 0
    const frontlineReadyHeadcount = trainingMonth?.frontlineReadyHeadcount || 0
    const startingFrontlineHeadcount = runningFrontlineHeadcount
    const endingHeadcount = Math.max(
      runningHeadcount + hireHeadcount - frontlineAttritionHeadcount - trainingFalloutHeadcount,
      0
    )
    const endingFrontlineHeadcount = Math.min(
      Math.max(runningFrontlineHeadcount + frontlineReadyHeadcount - frontlineAttritionHeadcount, 0),
      endingHeadcount
    )
    const startingGapToRequirement = startingFrontlineHeadcount - planned.requiredHeadcount
    const startingGapToRoundedRequirement = startingFrontlineHeadcount - planned.roundedHeadcount
    const endingGapToRequirement = endingFrontlineHeadcount - planned.requiredHeadcount
    const endingGapToRoundedRequirement = endingFrontlineHeadcount - planned.roundedHeadcount

    const record = {
      monthIndex,
      label: planned.label,
      fullLabel: planned.fullLabel,
      requiredHeadcount: planned.requiredHeadcount,
      roundedRequiredHeadcount: planned.roundedHeadcount,
      startingRosterHeadcount: runningHeadcount,
      startingFrontlineHeadcount,
      hireHeadcount,
      frontlineAttritionHeadcount,
      frontlineAttritionPercent,
      graduatingHeadcount,
      trainingFalloutHeadcount,
      frontlineReadyHeadcount,
      endingRosterHeadcount: endingHeadcount,
      endingFrontlineHeadcount,
      gapToRequirement: startingGapToRequirement,
      gapToRoundedRequirement: startingGapToRoundedRequirement,
      startingGapToRequirement,
      startingGapToRoundedRequirement,
      endingGapToRequirement,
      endingGapToRoundedRequirement,
      isBelowRequirement: startingGapToRequirement < 0,
      activeTrainingClasses: trainingMonth?.activeClassesCount || 0,
      startingInTrainingHeadcount: trainingMonth?.startingInTrainingHeadcount || 0,
      inTrainingHeadcount: trainingMonth?.inTrainingHeadcount || 0,
      classesStartingCount: trainingMonth?.classesStartingCount || 0,
      classesGraduatingCount: trainingMonth?.classesGraduatingCount || 0,
      classesFrontlineReadyCount: trainingMonth?.classesFrontlineReadyCount || 0,
      classesStarting: trainingMonth?.classesStarting || [],
      classesGraduating: trainingMonth?.classesGraduating || [],
      classesFrontlineReady: trainingMonth?.classesFrontlineReady || [],
      activeClasses: trainingMonth?.activeClasses || []
    }

    runningHeadcount = endingHeadcount
    runningFrontlineHeadcount = endingFrontlineHeadcount
    return record
  })

  records.trainingClasses = trainingSummary.classes
  return records
}

export const summarizeStaffingRecords = (staffingRecords) => {
  const firstRecord = staffingRecords[0] || null
  const endingRecord = staffingRecords[staffingRecords.length - 1] || null
  const peakShortageMonth =
    staffingRecords.length > 0
      ? staffingRecords.reduce((shortest, row) => (row.gapToRequirement < shortest.gapToRequirement ? row : shortest))
      : null

  return {
    startingRosterHeadcount: firstRecord?.startingRosterHeadcount || 0,
    startingFrontlineHeadcount: firstRecord?.startingFrontlineHeadcount || 0,
    endingRosterHeadcount: endingRecord?.endingRosterHeadcount || 0,
    endingFrontlineHeadcount: endingRecord?.endingFrontlineHeadcount || 0,
    totalFrontlineAttritionHeadcount: staffingRecords.reduce((sum, row) => sum + row.frontlineAttritionHeadcount, 0),
    totalHireHeadcount: staffingRecords.reduce((sum, row) => sum + row.hireHeadcount, 0),
    totalGraduatingHeadcount: staffingRecords.reduce((sum, row) => sum + row.graduatingHeadcount, 0),
    averageEndingRosterHeadcount: average(staffingRecords.map((row) => row.endingRosterHeadcount)),
    averageEndingFrontlineHeadcount: average(staffingRecords.map((row) => row.endingFrontlineHeadcount)),
    averageGapToRequirement: average(staffingRecords.map((row) => row.gapToRequirement)),
    monthsBelowRequirement: staffingRecords.filter((row) => row.isBelowRequirement).length,
    peakShortageMonth,
    peakInTrainingHeadcount: staffingRecords.reduce((peak, row) => Math.max(peak, row.inTrainingHeadcount), 0),
    activeTrainingClassCount: Array.isArray(staffingRecords.trainingClasses) ? staffingRecords.trainingClasses.length : 0
  }
}

const rangesOverlap = (leftStart, leftEnd, rightStart, rightEnd) => leftStart <= rightEnd && rightStart <= leftEnd

export const recommendTrainingClasses = ({
  monthlyRecords,
  planningYear,
  startingHeadcount,
  startingFrontlineHeadcount,
  staffingMonths,
  trainingClasses,
  trainingSettings
}) => {
  const normalizedSettings = createTrainingSettings(trainingSettings)
  const yieldShare = normalizedSettings.graduationYieldPercent / 100

  if (
    !Array.isArray(monthlyRecords) ||
    !monthlyRecords.length ||
    normalizedSettings.availableTrainers <= 0 ||
    normalizedSettings.maxClassSize <= 0 ||
    normalizedSettings.trainingDurationWorkdays <= 0 ||
    yieldShare <= 0
  ) {
    return []
  }

  const manualClasses = (Array.isArray(trainingClasses) ? trainingClasses : [])
    .map((trainingClass) => createTrainingClass(trainingClass))
    .filter((trainingClass) => trainingClass.source !== 'recommended')

  const recommendations = []
  let staffingProjection = computeStaffingRecords(
    monthlyRecords,
    planningYear,
    startingHeadcount,
    startingFrontlineHeadcount,
    staffingMonths,
    manualClasses,
    normalizedSettings
  )
  const planStartDate = moveToWorkdayOnOrAfter(monthStart(planningYear, 0))
  const totalWorkdayLag = Math.max(
    normalizedSettings.trainingDurationWorkdays - 1 + normalizedSettings.postTrainingNestingDays,
    0
  )

  monthlyRecords.forEach((monthlyRecord, monthIndex) => {
    if (monthIndex === 0) {
      return
    }

    const currentProjection = staffingProjection[monthIndex]
    const frontlineGap = Math.max(
      monthlyRecord.requiredHeadcount - (currentProjection?.startingFrontlineHeadcount || 0),
      0
    )

    if (frontlineGap <= 0.05) {
      return
    }

    const targetFrontlineReadyDate = moveToWorkdayOnOrBefore(
      new Date(monthStart(planningYear, monthIndex).getTime() - millisecondsPerDay)
    )
    let candidateHireDate = shiftWorkdays(targetFrontlineReadyDate, -totalWorkdayLag)

    if (normalizedSettings.startOnFirstBusinessDayOfWeek) {
      candidateHireDate = moveToFirstWorkdayOfWeek(candidateHireDate)
    }

    if (candidateHireDate < planStartDate) {
      return
    }

    let remainingHiresNeeded = Math.max(Math.ceil(frontlineGap / yieldShare), 0)
    let safetyCounter = 0

    while (remainingHiresNeeded > 0 && safetyCounter < 500) {
      safetyCounter += 1

      const candidateGraduationDate = shiftWorkdays(
        candidateHireDate,
        Math.max(normalizedSettings.trainingDurationWorkdays - 1, 0)
      )
      const candidateFrontlineReadyDate = shiftWorkdays(
        candidateGraduationDate,
        normalizedSettings.postTrainingNestingDays
      )

      if (candidateFrontlineReadyDate > targetFrontlineReadyDate) {
        break
      }

      const normalizedClasses = buildTrainingClassMonthlySummary(
        planningYear,
        [...manualClasses, ...recommendations],
        normalizedSettings
      ).classes

      const concurrentClassCount = normalizedClasses.filter(
        (trainingClass) =>
          trainingClass.isValidDateRange &&
          rangesOverlap(
            trainingClass.parsedHireDate,
            trainingClass.parsedGraduationDate,
            candidateHireDate,
            candidateGraduationDate
          )
      ).length

      if (concurrentClassCount >= normalizedSettings.availableTrainers) {
        const nextCandidateHireDate = normalizedSettings.startOnFirstBusinessDayOfWeek
          ? moveToFirstWorkdayOfPreviousWeek(candidateHireDate)
          : shiftWorkdays(candidateHireDate, -1)

        if (nextCandidateHireDate < planStartDate) {
          break
        }

        candidateHireDate = nextCandidateHireDate
        continue
      }

      const classHireCount = Math.min(remainingHiresNeeded, normalizedSettings.maxClassSize)
      recommendations.push(
        createTrainingClass({
          id: `recommended-class-${planningYear}-${monthIndex + 1}-${recommendations.length + 1}`,
          hireDate: formatDateInput(candidateHireDate),
          hireCount: classHireCount,
          source: 'recommended'
        })
      )
      remainingHiresNeeded -= classHireCount

      staffingProjection = computeStaffingRecords(
        monthlyRecords,
        planningYear,
        startingHeadcount,
        startingFrontlineHeadcount,
        staffingMonths,
        [...manualClasses, ...recommendations],
        normalizedSettings
      )

      remainingHiresNeeded = Math.max(
        Math.ceil(
          Math.max(
            monthlyRecord.requiredHeadcount - (staffingProjection[monthIndex]?.startingFrontlineHeadcount || 0),
            0
          ) / yieldShare
        ),
        0
      )
    }
  })

  return recommendations
}

export const collectPlannerWarnings = (monthlyRecords) =>
  monthlyRecords.flatMap((row) =>
    [...row.presenceWarnings, ...row.utilizationWarnings, ...row.randomWarnings, ...row.planWarnings].map(
      (message) => `${row.label}: ${message}`
    )
  )

export const getMonthlyChartMax = (monthlyRecords) =>
  Math.max(...monthlyRecords.flatMap((row) => [row.workloadHours, row.requiredStaffHours]), 1)
