import { computeMonthlyRecords, createHolidayTemplateHolidays } from '../../plannerModel'
import { summarizePlanRecords } from '../demandModel'

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

describe('computeMonthlyRecords peak planning', () => {
  const basePayload = {
    planningYear: 2026,
    operatingWeekdays: [1, 2, 3, 4, 5],
    holidayCalendarId: 'none',
    customHolidays: [],
    presenceMonths: Array.from({ length: 12 }, () => ({ paidHoursPerDay: 8 })),
    randomDefaults: {
      occupancyPercent: 85,
      adherencePercent: 92
    },
    useMonthlyRandomOverrides: false,
    randomMonths: [],
    planMonths: Array.from({ length: 12 }, () => ({
      contacts: 22000,
      ahtSeconds: 300,
      peakDayUpliftPercent: 0
    }))
  }

  it('calculates peak-day requirement from monthly uplift and summarizes the highest peak day', () => {
    const noUpliftMonth = computeMonthlyRecords(basePayload)[0]
    const withUpliftRecords = computeMonthlyRecords({
      ...basePayload,
      planMonths: basePayload.planMonths.map((month, monthIndex) => ({
        ...month,
        peakDayUpliftPercent: monthIndex === 0 ? 20 : 0
      }))
    })
    const withUpliftMonth = withUpliftRecords[0]
    const summary = summarizePlanRecords(withUpliftRecords)

    expect(noUpliftMonth.peakDayRequiredHeadcount).toBeCloseTo(noUpliftMonth.requiredHeadcount, 5)
    expect(withUpliftMonth.peakDayRequiredHeadcount).toBeGreaterThan(withUpliftMonth.requiredHeadcount)
    expect(withUpliftMonth.peakDayContacts).toBeGreaterThan(withUpliftMonth.averageDailyContacts)
    expect(summary.peakDayMonth.monthIndex).toBe(0)
    expect(summary.averagePeakRequiredHeadcount).toBeGreaterThan(summary.averageRequiredHeadcount)
  })
})
