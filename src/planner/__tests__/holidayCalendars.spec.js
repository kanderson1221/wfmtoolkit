import {
  buildHolidayEntriesForYear,
  createHolidayTemplateHolidays,
  mergeHolidayRowsWithTemplate
} from '../holidayCalendars'

describe('holidayCalendars', () => {
  it('merges U.S. holidays into an existing manual schedule without dropping custom dates', () => {
    const merged = mergeHolidayRowsWithTemplate([
      {
        id: 'company-day',
        label: 'Company Day',
        date: '2026-12-26'
      }
    ], 2026)

    expect(merged.some((holiday) => holiday.id === 'company-day')).toBe(true)
    expect(merged.some((holiday) => holiday.sourceRuleId === 'thanksgiving_day')).toBe(true)
  })

  it('projects U.S.-loaded holidays into the target planning year', () => {
    const loadedTemplate = createHolidayTemplateHolidays('us_federal', 2026)
    const projectedEntries = buildHolidayEntriesForYear({
      year: 2027,
      holidayCalendarId: 'none',
      customHolidays: loadedTemplate
    })

    const thanksgiving = projectedEntries.find((entry) => entry.id === 'thanksgiving_day')

    expect(thanksgiving).toBeTruthy()
    expect(thanksgiving?.date.getFullYear()).toBe(2027)
    expect(thanksgiving?.date.getMonth()).toBe(10)
    expect(thanksgiving?.date.getDate()).toBe(25)
  })
})
