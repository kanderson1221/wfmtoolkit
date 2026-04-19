import {
  GROUP_HOLIDAY_CALENDAR_INHERIT,
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_CALENDAR_US_FEDERAL,
  buildHolidayEntriesForYear,
  createHolidayTemplateHolidays,
  normalizeHolidayCalendarId
} from './holidayCalendars'
import { buildDateFromIso, dateToIsoValue } from './dateValues'
import { normalizeWeekdays } from './shared'
import { resolveCenterHolidayProfile } from '../planningStorage'

const resolveHolidaySnapshotForYear = (group = {}, center = {}, year) => {
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

export const createPlanningGroupOpenDayChecker = (group = {}, center = {}) => {
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
