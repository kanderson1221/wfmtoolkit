import { normalizeWeekdays } from './shared'

export const HOLIDAY_CALENDAR_NONE = 'none'
export const HOLIDAY_CALENDAR_US_FEDERAL = 'us_federal'
export const GROUP_HOLIDAY_CALENDAR_INHERIT = 'inherit'
export const HOLIDAY_SCHEDULE_CLOSED = 'closed'

const HOLIDAY_CALENDAR_LABELS = {
  [HOLIDAY_CALENDAR_NONE]: 'No Holiday Calendar',
  [HOLIDAY_CALENDAR_US_FEDERAL]: 'United States Federal'
}

export const holidayCalendarOptions = [
  { label: HOLIDAY_CALENDAR_LABELS[HOLIDAY_CALENDAR_NONE], value: HOLIDAY_CALENDAR_NONE },
  { label: HOLIDAY_CALENDAR_LABELS[HOLIDAY_CALENDAR_US_FEDERAL], value: HOLIDAY_CALENDAR_US_FEDERAL }
]

export const groupHolidayCalendarOptions = [
  { label: 'Use Call Center Default', value: GROUP_HOLIDAY_CALENDAR_INHERIT },
  ...holidayCalendarOptions
]

export const usFederalHolidayDefinitions = [
  { id: 'new_years_day', label: "New Year's Day", type: 'observed_fixed', month: 1, day: 1 },
  { id: 'martin_luther_king_jr_day', label: 'Martin Luther King Jr. Day', type: 'nth_weekday', month: 1, weekday: 1, occurrence: 3 },
  { id: 'washingtons_birthday', label: "Washington's Birthday", type: 'nth_weekday', month: 2, weekday: 1, occurrence: 3 },
  { id: 'memorial_day', label: 'Memorial Day', type: 'last_weekday', month: 5, weekday: 1 },
  { id: 'juneteenth', label: 'Juneteenth National Independence Day', type: 'observed_fixed', month: 6, day: 19 },
  { id: 'independence_day', label: 'Independence Day', type: 'observed_fixed', month: 7, day: 4 },
  { id: 'labor_day', label: 'Labor Day', type: 'nth_weekday', month: 9, weekday: 1, occurrence: 1 },
  { id: 'columbus_day', label: 'Columbus Day', type: 'nth_weekday', month: 10, weekday: 1, occurrence: 2 },
  { id: 'veterans_day', label: 'Veterans Day', type: 'observed_fixed', month: 11, day: 11 },
  { id: 'thanksgiving_day', label: 'Thanksgiving Day', type: 'nth_weekday', month: 11, weekday: 4, occurrence: 4 },
  { id: 'christmas_day', label: 'Christmas Day', type: 'observed_fixed', month: 12, day: 25 }
]

const buildDate = (year, monthIndex, dayOfMonth) => new Date(year, monthIndex, dayOfMonth, 12)

const padTwo = (value) => String(value).padStart(2, '0')

const buildObservedFixedHoliday = (year, monthIndex, dayOfMonth) => {
  const actualDate = buildDate(year, monthIndex, dayOfMonth)
  const weekday = actualDate.getDay()

  if (weekday === 6) {
    return buildDate(year, monthIndex, dayOfMonth - 1)
  }

  if (weekday === 0) {
    return buildDate(year, monthIndex, dayOfMonth + 1)
  }

  return actualDate
}

const nthWeekdayOfMonth = (year, monthIndex, weekday, occurrence) => {
  const firstOfMonth = buildDate(year, monthIndex, 1)
  const offset = (weekday - firstOfMonth.getDay() + 7) % 7
  return buildDate(year, monthIndex, 1 + offset + (occurrence - 1) * 7)
}

const lastWeekdayOfMonth = (year, monthIndex, weekday) => {
  const lastDay = new Date(year, monthIndex + 1, 0, 12)
  const offset = (lastDay.getDay() - weekday + 7) % 7
  return buildDate(year, monthIndex, lastDay.getDate() - offset)
}

const buildRuleDate = (year, definition) => {
  if (definition.type === 'observed_fixed') {
    return buildObservedFixedHoliday(year, definition.month - 1, definition.day)
  }

  if (definition.type === 'nth_weekday') {
    return nthWeekdayOfMonth(year, definition.month - 1, definition.weekday, definition.occurrence)
  }

  if (definition.type === 'last_weekday') {
    return lastWeekdayOfMonth(year, definition.month - 1, definition.weekday)
  }

  return null
}

const dedupeEntries = (entries) => {
  const seen = new Set()

  return entries.filter((entry) => {
    const key = `${entry.date.getFullYear()}-${entry.date.getMonth()}-${entry.date.getDate()}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

const isValidDateValue = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const candidate = buildDate(year, month - 1, day)

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  )
}

const dateValueToDate = (value) => {
  if (!isValidDateValue(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  return buildDate(year, month - 1, day)
}

const dateToInputValue = (date) =>
  `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`

const isValidMonthDay = (month, day) => {
  const normalizedMonth = Number(month)
  const normalizedDay = Number(day)

  if (!Number.isInteger(normalizedMonth) || !Number.isInteger(normalizedDay)) {
    return false
  }

  if (normalizedMonth < 1 || normalizedMonth > 12 || normalizedDay < 1) {
    return false
  }

  const maxDays = new Date(2024, normalizedMonth, 0).getDate()
  return normalizedDay <= maxDays
}

const buildCustomHolidayId = ({ month, day, label }) =>
  `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${String(label || 'holiday')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'holiday'}`

export const createCustomHoliday = (overrides = {}) => {
  const normalizedDate = isValidDateValue(overrides.date) ? overrides.date : ''
  const fallbackMonth = Number(overrides.month ?? 1)
  const fallbackDay = Number(overrides.day ?? 1)
  const month = normalizedDate ? Number(normalizedDate.slice(5, 7)) : fallbackMonth
  const day = normalizedDate ? Number(normalizedDate.slice(8, 10)) : fallbackDay

  return {
    id: overrides.id || buildCustomHolidayId({ month, day, label: overrides.label }),
    label: typeof overrides.label === 'string' ? overrides.label.trim() : '',
    date: normalizedDate,
    month,
    day
  }
}

export const normalizeCustomHolidays = (holidays) => {
  if (!Array.isArray(holidays)) {
    return []
  }

  return holidays
    .map((holiday) => createCustomHoliday(holiday))
    .filter((holiday) => holiday.date || isValidMonthDay(holiday.month, holiday.day))
    .filter((holiday, index, collection) =>
      collection.findIndex((candidate) => candidate.id === holiday.id) === index
    )
}

export const normalizeDisabledHolidayRuleIds = (ruleIds) =>
  Array.isArray(ruleIds)
    ? [...new Set(ruleIds.filter((ruleId) => usFederalHolidayDefinitions.some((definition) => definition.id === ruleId)))]
    : []

const buildUsFederalHolidayEntries = (year, disabledRuleIds = []) =>
  usFederalHolidayDefinitions
    .filter((definition) => !disabledRuleIds.includes(definition.id))
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      date: buildRuleDate(year, definition)
    }))
    .filter((entry) => entry.date instanceof Date && !Number.isNaN(entry.date.getTime()))

export const createHolidayTemplateHolidays = (
  holidayCalendarId,
  year = new Date().getFullYear(),
  disabledHolidayRuleIds = []
) => {
  const normalizedCalendarId = normalizeHolidayCalendarId(holidayCalendarId, HOLIDAY_CALENDAR_NONE)

  if (normalizedCalendarId !== HOLIDAY_CALENDAR_US_FEDERAL) {
    return []
  }

  return buildUsFederalHolidayEntries(year, normalizeDisabledHolidayRuleIds(disabledHolidayRuleIds)).map((holiday) =>
    createCustomHoliday({
      id: holiday.id,
      label: holiday.label,
      date: dateToInputValue(holiday.date)
    })
  )
}

export const buildHolidayEntriesForYear = ({
  year,
  holidayCalendarId,
  disabledHolidayRuleIds = [],
  customHolidays = []
}) => {
  normalizeHolidayCalendarId(holidayCalendarId, HOLIDAY_CALENDAR_NONE)
  normalizeDisabledHolidayRuleIds(disabledHolidayRuleIds)
  const normalizedCustomHolidays = normalizeCustomHolidays(customHolidays)

  const customEntries = normalizedCustomHolidays
    .map((holiday) => ({
      id: holiday.id,
      label: holiday.label,
      date:
        holiday.date
          ? dateValueToDate(holiday.date)
          : buildDate(year, holiday.month - 1, holiday.day)
    }))
    .filter((entry) => entry.date instanceof Date && !Number.isNaN(entry.date.getTime()))
    .filter((entry) => entry.date.getFullYear() === year || !normalizedCustomHolidays.find((holiday) => holiday.id === entry.id)?.date)

  return dedupeEntries(customEntries)
}

export const normalizeHolidayCalendarId = (value, fallback = HOLIDAY_CALENDAR_NONE) =>
  value === HOLIDAY_CALENDAR_US_FEDERAL || value === HOLIDAY_CALENDAR_NONE ? value : fallback

export const normalizeGroupHolidayCalendarId = (value, fallback = GROUP_HOLIDAY_CALENDAR_INHERIT) => {
  if (value === GROUP_HOLIDAY_CALENDAR_INHERIT || value == null || value === '') {
    return GROUP_HOLIDAY_CALENDAR_INHERIT
  }

  return normalizeHolidayCalendarId(value, fallback === GROUP_HOLIDAY_CALENDAR_INHERIT ? HOLIDAY_CALENDAR_NONE : fallback)
}

export const normalizeHolidayScheduleMode = () => HOLIDAY_SCHEDULE_CLOSED

export const getHolidayCalendarLabel = (calendarId) => {
  if (calendarId === GROUP_HOLIDAY_CALENDAR_INHERIT) {
    return 'Use Call Center Default'
  }

  return HOLIDAY_CALENDAR_LABELS[normalizeHolidayCalendarId(calendarId)] || HOLIDAY_CALENDAR_LABELS[HOLIDAY_CALENDAR_NONE]
}

export const calculateHolidayImpactDays = ({
  year,
  monthIndex,
  operatingWeekdays,
  holidayCalendarId,
  disabledHolidayRuleIds = [],
  customHolidays = []
}) => {
  const normalizedCalendarId = normalizeHolidayCalendarId(holidayCalendarId)
  const normalizedCustomHolidays = normalizeCustomHolidays(customHolidays)

  if (normalizedCalendarId === HOLIDAY_CALENDAR_NONE && !normalizedCustomHolidays.length) {
    return {
      holidayCount: 0,
      holidayImpactDays: 0
    }
  }

  const activeDays = normalizeWeekdays(operatingWeekdays)
  const holidayEntries = buildHolidayEntriesForYear({
    year,
    holidayCalendarId: normalizedCalendarId,
    disabledHolidayRuleIds,
    customHolidays: normalizedCustomHolidays
  }).filter((entry) => {
    const holidayDate = entry.date
    return holidayDate.getMonth() === monthIndex && activeDays.includes(holidayDate.getDay())
  })

  return {
    holidayCount: holidayEntries.length,
    holidayImpactDays: holidayEntries.length
  }
}
