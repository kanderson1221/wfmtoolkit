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

  it('keeps U.S.-loaded holidays active when planning a future year', () => {
    const baselineNovember = computeMonthlyRecords({
      ...basePayload,
      planningYear: 2027,
      holidayCalendarId: 'none',
      customHolidays: []
    })[10]

    const migratedTemplateNovember = computeMonthlyRecords({
      ...basePayload,
      planningYear: 2027,
      holidayCalendarId: 'none',
      customHolidays: createHolidayTemplateHolidays('us_federal', 2026)
    })[10]

    expect(migratedTemplateNovember.holidayCount).toBeGreaterThan(0)
    expect(migratedTemplateNovember.calendarOpenDays).toBeLessThan(baselineNovember.calendarOpenDays)
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

  it('uses open-day-filtered forecast daily demand when a forecast source is applied', () => {
    const januaryMonth = computeMonthlyRecords({
      ...basePayload,
      demandSource: {
        mode: 'forecast',
        forecastDailySnapshot: [
          { serviceDate: '2026-01-01', monthIndex: 0, monthLabel: 'Jan', contacts: 100 },
          { serviceDate: '2026-01-02', monthIndex: 0, monthLabel: 'Jan', contacts: 200 },
          { serviceDate: '2026-01-03', monthIndex: 0, monthLabel: 'Jan', contacts: 300 },
          { serviceDate: '2026-01-05', monthIndex: 0, monthLabel: 'Jan', contacts: 400 }
        ]
      },
      customHolidays: [
        {
          id: 'jan-second-closure',
          label: 'Company Closure',
          date: '2026-01-02'
        }
      ],
      planMonths: basePayload.planMonths.map((month, monthIndex) => ({
        ...month,
        contacts: monthIndex === 0 ? 22000 : month.contacts,
        peakDayUpliftPercent: monthIndex === 0 ? 15 : month.peakDayUpliftPercent
      }))
    })[0]

    expect(januaryMonth.contacts).toBe(500)
    expect(januaryMonth.averageDailyContacts).toBe(250)
    expect(januaryMonth.peakDayContacts).toBe(400)
    expect(januaryMonth.peakDayUpliftPercent).toBe(60)
    expect(januaryMonth.workloadHours).toBeCloseTo((500 * 300) / 3600, 5)
  })
})
