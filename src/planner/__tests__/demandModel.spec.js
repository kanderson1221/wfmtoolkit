import { computeMonthlyRecords, createHolidayTemplateHolidays } from '../../plannerModel'

describe('computeMonthlyRecords holiday calendars', () => {
  const basePayload = {
    planningYear: 2026,
    operatingWeekdays: [1, 2, 3, 4, 5],
    presenceMonths: [],
    randomDefaults: {},
    useMonthlyRandomOverrides: false,
    randomMonths: [],
    planMonths: []
  }

  it('applies explicit holiday dates to monthly business days', () => {
    const defaultMonth = computeMonthlyRecords({
      ...basePayload,
      holidayCalendarId: 'us_federal',
      customHolidays: createHolidayTemplateHolidays('us_federal', 2026)
    })[0]

    const disabledHolidayMonth = computeMonthlyRecords({
      ...basePayload,
      holidayCalendarId: 'us_federal',
      customHolidays: createHolidayTemplateHolidays('us_federal', 2026, ['new_years_day'])
    })[0]

    const customHolidayMonth = computeMonthlyRecords({
      ...basePayload,
      holidayCalendarId: 'none',
      customHolidays: [
        {
          id: 'jan-second',
          label: 'Company Closure',
          date: '2026-01-02'
        }
      ]
    })[0]

    expect(defaultMonth.weekdayOpenDays).toBe(22)
    expect(defaultMonth.calendarOpenDays).toBe(20)
    expect(defaultMonth.holidayCount).toBe(2)
    expect(disabledHolidayMonth.calendarOpenDays).toBe(21)
    expect(disabledHolidayMonth.holidayCount).toBe(1)
    expect(customHolidayMonth.calendarOpenDays).toBe(21)
    expect(customHolidayMonth.holidayCount).toBe(1)
  })
})
