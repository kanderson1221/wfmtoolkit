import { createPlanningGroupOpenDayChecker } from './groupOpenDays'

const cloneHolidayRows = (holidays) =>
  (Array.isArray(holidays) ? holidays : []).map((holiday) => ({ ...holiday }))

export const createPlanOpenDayChecker = ({
  planningYear,
  operatingWeekdays,
  holidayCalendarId,
  disabledHolidayRuleIds,
  customHolidays
}) =>
  createPlanningGroupOpenDayChecker(
    {
      operatingWeekdays
    },
    {
      operatingWeekdays,
      holidayProfiles: [
        {
          year: planningYear,
          holidayCalendarId,
          disabledHolidayRuleIds: [...(disabledHolidayRuleIds || [])],
          customHolidays: cloneHolidayRows(customHolidays)
        }
      ]
    }
  )
