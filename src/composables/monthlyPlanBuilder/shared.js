import {
  MONTH_LABELS,
  buildPlanningYearRange,
  calculateCalendarOpenDays,
  createPresenceMonth,
  getCurrentCalendarMonthIndex,
  getCurrentCalendarYear
} from '../../plannerModel'

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

export const createPresenceMonthFromProfile = ({
  year,
  monthIndex,
  weekdays,
  paidHoursPerDay = 8,
  plannedTimeOffPercent = 0,
  unplannedTimeOffPercent = 0,
  leaveTimePercent = 0,
  meetingsPercent = 0,
  trainingPercent = 0,
  coachingPercent = 0,
  paidBreaksHoursPerDay = 0.5,
  otherAwayHoursPerDay = 0.1
}) => {
  const openDays = calculateCalendarOpenDays(year, monthIndex, weekdays).calendarOpenDays
  const paidHoursPerMonth = openDays * paidHoursPerDay
  const convertPercentToHours = (percent) => Number(((paidHoursPerMonth * percent) / 100).toFixed(1))

  return createPresenceMonth({
    paidHoursPerDay,
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
