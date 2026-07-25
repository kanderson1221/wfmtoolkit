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

  it('uses forecast-owned monthly AHT when daily forecast demand is applied', () => {
    const januaryMonth = computeMonthlyRecords({
      ...basePayload,
      demandSource: {
        mode: 'forecast',
        forecastDailySnapshot: [
          { serviceDate: '2026-01-02', monthIndex: 0, monthLabel: 'Jan', contacts: 200 },
          { serviceDate: '2026-01-05', monthIndex: 0, monthLabel: 'Jan', contacts: 300 }
        ],
        forecastMonthSnapshot: [
          { monthIndex: 0, monthLabel: 'Jan 2026', contacts: 500, ahtSeconds: 420 }
        ]
      },
      planMonths: basePayload.planMonths.map((month, monthIndex) => ({
        ...month,
        ahtSeconds: monthIndex === 0 ? 300 : month.ahtSeconds
      }))
    })[0]

    expect(januaryMonth.contacts).toBe(500)
    expect(januaryMonth.ahtSeconds).toBe(420)
    expect(januaryMonth.workloadHours).toBeCloseTo((500 * 420) / 3600, 5)
  })

  it('keeps actualized monthly requirements when an update forecast has only future daily rows', () => {
    const records = computeMonthlyRecords({
      ...basePayload,
      demandSource: {
        mode: 'forecast',
        forecastDailySnapshot: [
          { serviceDate: '2026-05-01', monthIndex: 4, monthLabel: 'May', contacts: 500 },
          { serviceDate: '2026-05-04', monthIndex: 4, monthLabel: 'May', contacts: 700 }
        ],
        forecastMonthSnapshot: [
          { monthIndex: 4, monthLabel: 'May 2026', contacts: 1200, ahtSeconds: 420 }
        ]
      },
      planMonths: basePayload.planMonths.map((month, monthIndex) => ({
        ...month,
        contacts: monthIndex < 4 ? 10000 + (monthIndex * 1000) : month.contacts,
        ahtSeconds: monthIndex < 4 ? 360 : month.ahtSeconds,
        peakDayUpliftPercent: monthIndex < 4 ? 20 : month.peakDayUpliftPercent
      }))
    })

    expect(records[0]).toMatchObject({
      contacts: 10000,
      ahtSeconds: 360,
      peakDayUpliftPercent: 20
    })
    expect(records[0].requiredHeadcount).toBeGreaterThan(0)
    expect(records[0].peakDayRequiredHeadcount).toBeGreaterThan(records[0].requiredHeadcount)
    expect(records[3].contacts).toBe(13000)
    expect(records[3].requiredHeadcount).toBeGreaterThan(0)
    expect(records[4]).toMatchObject({
      contacts: 1200,
      ahtSeconds: 420
    })
  })
})

describe('computeMonthlyRecords invalid capacity', () => {
  const basePayload = {
    planningYear: 2026,
    operatingWeekdays: [1, 2, 3, 4, 5],
    holidayCalendarId: 'none',
    customHolidays: [],
    presenceMonths: Array.from({ length: 12 }, () => ({ paidHoursPerDay: 8 })),
    randomDefaults: {
      occupancyPercent: 90,
      adherencePercent: 95
    },
    useMonthlyRandomOverrides: false,
    randomMonths: [],
    planMonths: Array.from({ length: 12 }, () => ({
      contacts: 22000,
      ahtSeconds: 300,
      peakDayUpliftPercent: 0
    }))
  }

  it('keeps zero capacity unavailable instead of silently clamping it positive', () => {
    const records = computeMonthlyRecords({
      ...basePayload,
      presenceMonths: basePayload.presenceMonths.map((month, monthIndex) => ({
        ...month,
        plannedTimeOffHours: monthIndex === 0 ? 1000 : 0,
        meetingsHours: monthIndex === 1 ? 1000 : 0
      }))
    })
    const summary = summarizePlanRecords(records)

    expect(records[0]).toMatchObject({
      presencePercent: 0,
      presentHours: 0,
      scheduledPercent: 0,
      designFactorPercent: 0,
      workloadStaffingRatio: null,
      requiredStaffHours: null,
      requiredHeadcount: null,
      roundedHeadcount: null
    })
    expect(records[0].presenceWarnings.join(' ')).toContain('all monthly paid capacity')
    expect(records[0].planWarnings.join(' ')).toContain('staffing requirement is unavailable')

    expect(records[1]).toMatchObject({
      presencePercent: 100,
      utilizationPercent: 0,
      scheduledPercent: 0,
      designFactorPercent: 0,
      workloadStaffingRatio: null,
      requiredStaffHours: null,
      requiredHeadcount: null,
      roundedHeadcount: null
    })
    expect(records[1].utilizationWarnings.join(' ')).toContain('all present capacity')
    expect([
      records[0].workloadStaffingRatio,
      records[0].requiredHeadcount,
      records[1].workloadStaffingRatio,
      records[1].requiredHeadcount
    ]).not.toContainEqual(expect.any(Number))
    expect(summary).toMatchObject({
      annualRequiredStaffHours: null,
      minimumRequiredHeadcount: null,
      averageRequiredStaffHours: null,
      averageRequiredHeadcount: null,
      averagePeakRequiredHeadcount: null
    })
  })

  it('keeps zero occupancy and adherence invalid instead of silently clamping them positive', () => {
    const records = computeMonthlyRecords({
      ...basePayload,
      useMonthlyRandomOverrides: true,
      randomMonths: Array.from({ length: 12 }, (_, monthIndex) => ({
        occupancyPercent: monthIndex === 0 ? 0 : 90,
        adherencePercent: monthIndex === 1 ? 0 : 95
      }))
    })
    const summary = summarizePlanRecords(records)

    expect(records[0]).toMatchObject({
      occupancyPercent: 0,
      designFactorPercent: 0,
      workloadStaffingRatio: null,
      requiredStaffHours: null,
      requiredHeadcount: null,
      roundedHeadcount: null
    })
    expect(records[0].randomWarnings.join(' ')).toContain('Occupancy must be greater than 0%')
    expect(records[1]).toMatchObject({
      adherencePercent: 0,
      designFactorPercent: 0,
      workloadStaffingRatio: null,
      requiredStaffHours: null,
      requiredHeadcount: null,
      roundedHeadcount: null
    })
    expect(records[1].randomWarnings.join(' ')).toContain('Adherence must be greater than 0%')
    expect(summary).toMatchObject({
      annualRequiredStaffHours: null,
      averageRequiredHeadcount: null
    })
  })
})
