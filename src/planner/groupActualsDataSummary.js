import {
  GROUP_HOLIDAY_CALENDAR_INHERIT,
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_CALENDAR_US_FEDERAL,
  buildHolidayEntriesForYear,
  createHolidayTemplateHolidays,
  normalizeHolidayCalendarId
} from './holidayCalendars'
import {
  buildPlanningGroupMonthlyActualRecords,
  createPlanningGroupActuals
} from './groupActuals'
import { normalizeWeekdays } from './shared'
import { resolveCenterHolidayProfile } from '../planningStorage'

const buildDateFromIso = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const candidate = new Date(year, month - 1, day, 12)

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  )
    ? candidate
    : null
}

const padTwo = (value) => String(value).padStart(2, '0')

const dateToIsoValue = (date) =>
  `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`

const buildMonthStart = (serviceDate = '') => `${serviceDate.slice(0, 7)}-01`

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric'
})

const formatMonthLabel = (monthStart) => {
  const candidate = buildDateFromIso(monthStart)
  return candidate ? monthFormatter.format(candidate) : monthStart || 'Unknown Month'
}

const maxIsoValue = (left, right) => {
  if (!left) {
    return right || null
  }

  if (!right) {
    return left
  }

  return left > right ? left : right
}

const minIsoValue = (left, right) => {
  if (!left) {
    return right || null
  }

  if (!right) {
    return left
  }

  return left < right ? left : right
}

const buildMonthStartFromDate = (date) => dateToIsoValue(new Date(date.getFullYear(), date.getMonth(), 1, 12))

const buildMonthEndFromDate = (date) =>
  dateToIsoValue(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12))

const buildYearStart = (year) => `${year}-01-01`

const buildYearEnd = (year) => `${year}-12-31`

const countExpectedOpenDaysInRange = (startIso, endIso, isExpectedOpenDay) => {
  const startDate = buildDateFromIso(startIso)
  const endDate = buildDateFromIso(endIso)

  if (!startDate || !endDate || startDate.getTime() > endDate.getTime()) {
    return 0
  }

  let expectedOpenDays = 0

  for (
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12);
    cursor.getTime() <= endDate.getTime();
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1, 12)
  ) {
    if (isExpectedOpenDay(dateToIsoValue(cursor))) {
      expectedOpenDays += 1
    }
  }

  return expectedOpenDays
}

const resolveHolidaySnapshotForYear = (group, center, year) => {
  const centerHolidayProfile = resolveCenterHolidayProfile(center, year)
  const groupHolidayCalendarId = group?.holidayCalendarId || GROUP_HOLIDAY_CALENDAR_INHERIT
  const usesCenterHolidayProfile =
    groupHolidayCalendarId === GROUP_HOLIDAY_CALENDAR_INHERIT ||
    groupHolidayCalendarId == null ||
    groupHolidayCalendarId === ''

  if (usesCenterHolidayProfile) {
    return {
      holidayCalendarId: centerHolidayProfile.holidayCalendarId || HOLIDAY_CALENDAR_NONE,
      disabledHolidayRuleIds: [...(centerHolidayProfile.disabledHolidayRuleIds || [])],
      customHolidays: (centerHolidayProfile.customHolidays || []).map((holiday) => ({ ...holiday }))
    }
  }

  const normalizedGroupCalendarId = normalizeHolidayCalendarId(
    groupHolidayCalendarId,
    HOLIDAY_CALENDAR_NONE
  )

  if (normalizedGroupCalendarId === HOLIDAY_CALENDAR_US_FEDERAL) {
    return {
      holidayCalendarId: HOLIDAY_CALENDAR_NONE,
      disabledHolidayRuleIds: [],
      customHolidays: createHolidayTemplateHolidays(HOLIDAY_CALENDAR_US_FEDERAL, year)
    }
  }

  return {
    holidayCalendarId: normalizedGroupCalendarId,
    disabledHolidayRuleIds: [],
    customHolidays: []
  }
}

const createOpenDayChecker = (group, center) => {
  const activeDays = normalizeWeekdays(group?.operatingWeekdays ?? center?.operatingWeekdays)
  const holidaySetsByYear = new Map()

  const resolveHolidaySet = (year) => {
    if (!holidaySetsByYear.has(year)) {
      const holidaySnapshot = resolveHolidaySnapshotForYear(group, center, year)
      const holidayDates = new Set(
        buildHolidayEntriesForYear({
          year,
          holidayCalendarId: holidaySnapshot.holidayCalendarId,
          disabledHolidayRuleIds: holidaySnapshot.disabledHolidayRuleIds,
          customHolidays: holidaySnapshot.customHolidays
        })
          .filter((entry) => activeDays.includes(entry.date.getDay()))
          .map((entry) => dateToIsoValue(entry.date))
      )

      holidaySetsByYear.set(year, holidayDates)
    }

    return holidaySetsByYear.get(year)
  }

  return (serviceDate) => {
    const date = buildDateFromIso(serviceDate)

    if (!date || !activeDays.includes(date.getDay())) {
      return false
    }

    return !resolveHolidaySet(date.getFullYear()).has(serviceDate)
  }
}

const createEmptySummary = () => ({
  annualRows: []
})

const summarizeWeightedAht = (records = []) => {
  let weightedTotal = 0
  let weight = 0
  let averageTotal = 0
  let averageCount = 0

  records.forEach((record) => {
    const contacts = record?.contacts
    const ahtSeconds = record?.weightedAhtSeconds

    if (!Number.isFinite(ahtSeconds)) {
      return
    }

    averageTotal += ahtSeconds
    averageCount += 1

    if (Number.isFinite(contacts) && contacts > 0) {
      weightedTotal += contacts * ahtSeconds
      weight += contacts
    }
  })

  if (weight > 0) {
    return weightedTotal / weight
  }

  return averageCount > 0 ? averageTotal / averageCount : null
}

export const summarizePlanningGroupActualsDataset = ({
  actuals,
  group,
  center
} = {}) => {
  const normalizedActuals = createPlanningGroupActuals(actuals)
  const dailyRows = normalizedActuals.dailyRows || []

  if (!dailyRows.length) {
    return createEmptySummary()
  }

  const startDate = buildDateFromIso(dailyRows[0]?.serviceDate)
  const endDate = buildDateFromIso(dailyRows[dailyRows.length - 1]?.serviceDate)

  if (!startDate || !endDate) {
    return createEmptySummary()
  }

  const isExpectedOpenDay = createOpenDayChecker(group, center)
  const actualsByMonth = new Map(
    buildPlanningGroupMonthlyActualRecords(dailyRows).map((record) => [record.monthStart, record])
  )
  const overallStartIso = dateToIsoValue(startDate)
  const overallEndIso = dateToIsoValue(endDate)
  const monthSummaries = new Map()

  for (
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 12);
    cursor.getTime() <= endDate.getTime();
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12)
  ) {
    const monthStart = buildMonthStartFromDate(cursor)

    monthSummaries.set(monthStart, {
      monthStart,
      loadedOpenDays: 0,
      minServiceDate: null,
      maxServiceDate: null
    })
  }

  dailyRows.forEach((row) => {
    const serviceDate = row?.serviceDate

    if (!serviceDate) {
      return
    }

    const monthSummary = monthSummaries.get(buildMonthStart(serviceDate))

    if (!monthSummary) {
      return
    }

    monthSummary.minServiceDate = minIsoValue(monthSummary.minServiceDate, serviceDate)
    monthSummary.maxServiceDate = maxIsoValue(monthSummary.maxServiceDate, serviceDate)

    if (isExpectedOpenDay(serviceDate)) {
      monthSummary.loadedOpenDays += 1
    }
  })

  const monthlyRows = [...monthSummaries.values()]
    .map((summary) => {
      const actualsRecord = actualsByMonth.get(summary.monthStart)
      const monthStartDate = buildDateFromIso(summary.monthStart)
      const periodStartIso = summary.minServiceDate || maxIsoValue(summary.monthStart, overallStartIso)
      const periodEndIso =
        summary.maxServiceDate ||
        minIsoValue(monthStartDate ? buildMonthEndFromDate(monthStartDate) : null, overallEndIso)
      const expectedOpenDays = countExpectedOpenDaysInRange(periodStartIso, periodEndIso, isExpectedOpenDay)
      const coveragePercent =
        expectedOpenDays > 0 ? (summary.loadedOpenDays / expectedOpenDays) * 100 : null

      return {
        monthStart: summary.monthStart,
        monthLabel: actualsRecord?.label || formatMonthLabel(summary.monthStart),
        minServiceDate: summary.minServiceDate,
        maxServiceDate: summary.maxServiceDate,
        contacts: actualsRecord?.actualContacts ?? null,
        weightedAhtSeconds: actualsRecord?.actualAhtSeconds ?? null,
        loadedOpenDays: summary.loadedOpenDays,
        expectedOpenDays,
        coveragePercent
      }
    })
    .filter((summary) => summary.expectedOpenDays > 0 || summary.loadedOpenDays > 0)
    .sort((left, right) => right.monthStart.localeCompare(left.monthStart))

  const annualRows = [...monthlyRows.reduce((years, row) => {
    const year = row.monthStart.slice(0, 4)
    const existingYear = years.get(year) || {
      year,
      yearLabel: year,
      contacts: 0,
      loadedOpenDays: 0,
      minServiceDate: null,
      maxServiceDate: null,
      months: []
    }

    existingYear.contacts += row.contacts ?? 0
    existingYear.loadedOpenDays += row.loadedOpenDays
    existingYear.minServiceDate = minIsoValue(existingYear.minServiceDate, row.minServiceDate)
    existingYear.maxServiceDate = maxIsoValue(existingYear.maxServiceDate, row.maxServiceDate)
    existingYear.months.push(row)

    years.set(year, existingYear)
    return years
  }, new Map()).values()]
    .map((yearSummary) => {
      const yearStartIso = yearSummary.minServiceDate || maxIsoValue(buildYearStart(yearSummary.year), overallStartIso)
      const yearEndIso = yearSummary.maxServiceDate || minIsoValue(buildYearEnd(yearSummary.year), overallEndIso)
      const expectedOpenDays = countExpectedOpenDaysInRange(yearStartIso, yearEndIso, isExpectedOpenDay)
      const coveragePercent =
        expectedOpenDays > 0 ? (yearSummary.loadedOpenDays / expectedOpenDays) * 100 : null

      return {
        year: yearSummary.year,
        yearLabel: yearSummary.yearLabel,
        minServiceDate: yearSummary.minServiceDate,
        maxServiceDate: yearSummary.maxServiceDate,
        contacts: Number.isFinite(yearSummary.contacts) ? yearSummary.contacts : null,
        weightedAhtSeconds: summarizeWeightedAht(yearSummary.months),
        loadedOpenDays: yearSummary.loadedOpenDays,
        expectedOpenDays,
        coveragePercent,
        months: yearSummary.months
      }
    })
    .sort((left, right) => right.year.localeCompare(left.year))

  return {
    annualRows
  }
}
