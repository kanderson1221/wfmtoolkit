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

export const buildPresenceMonths = () => MONTH_LABELS.map(() => createPresenceMonth())
export const buildRandomMonths = () => MONTH_LABELS.map(() => createRandomMonth())
export const buildPlanMonths = () => MONTH_LABELS.map(() => createPlanMonth())
export const buildStaffingMonths = () => MONTH_LABELS.map(() => createStaffingMonth())
export const buildTrainingClasses = () => []

