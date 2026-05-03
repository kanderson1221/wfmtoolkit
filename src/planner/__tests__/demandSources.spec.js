import {
  applyForecastSnapshotToPlanMonths,
  buildForecastDailyDemandSnapshot,
  buildForecastDemandSnapshot,
  summarizeForecastCoverageForPlan,
  createPlanDemandSource,
  summarizeForecastDailyDemandForOpenDays,
  summarizeForecastDemandSnapshot
} from '../demandSources'

describe('planner demand sources', () => {
  it('filters a forecast monthly rollup to the selected planning year', () => {
    const snapshot = buildForecastDemandSnapshot(
      {
        planningYear: 2026,
        forecastType: 'budget',
        planningContext: {
          groupId: 'group-1',
          planningYear: 2026
        },
        lastRun: {
          runAt: '2026-04-08T14:00:00Z',
          monthlyRollup: [
            { monthStart: '2025-12-01', monthLabel: 'Dec 2025', contacts: 9000, lowerBoundContacts: 8400, upperBoundContacts: 9700 },
            ...Array.from({ length: 12 }, (_, index) => ({
              monthStart: `2026-${String(index + 1).padStart(2, '0')}-01`,
              monthLabel: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]} 2026`,
              contacts: 10000 + (index * 100),
              lowerBoundContacts: 9500 + (index * 100),
              upperBoundContacts: 10500 + (index * 100)
            }))
          ]
        }
      },
      2026
    )

    expect(snapshot).toHaveLength(12)
    expect(snapshot[0]).toMatchObject({
      monthIndex: 0,
      monthLabel: 'Jan 2026',
      monthStart: '2026-01-01',
      contacts: 10000
    })
    expect(snapshot.at(-1)).toMatchObject({
      monthIndex: 11,
      monthLabel: 'Dec 2026',
      monthStart: '2026-12-01',
      contacts: 11100
    })
  })

  it('applies a forecast snapshot into monthly contacts and derives peak-day uplift without disturbing AHT inputs', () => {
    const appliedMonths = applyForecastSnapshotToPlanMonths(
      [
        { contacts: '', ahtSeconds: 300, peakDayUpliftPercent: 0 },
        { contacts: 5000, ahtSeconds: 320, peakDayUpliftPercent: 10 }
      ],
      [
        {
          monthIndex: 0,
          monthLabel: 'Jan 2026',
          monthStart: '2026-01-01',
          contacts: 14000,
          averageDailyVolume: 700,
          peakDailyVolume: 910
        },
        {
          monthIndex: 1,
          monthLabel: 'Feb 2026',
          monthStart: '2026-02-01',
          contacts: 15000,
          averageDailyVolume: 750,
          peakDailyVolume: 900
        }
      ]
    )

    expect(appliedMonths[0]).toMatchObject({
      contacts: 14000,
      ahtSeconds: 300,
      peakDayUpliftPercent: 30
    })
    expect(appliedMonths[1]).toMatchObject({
      contacts: 15000,
      ahtSeconds: 320,
      peakDayUpliftPercent: 20
    })
  })

  it('includes assumed monthly AHT when building and applying a forecast snapshot', () => {
    const trailingMonthlyRows = Array.from({ length: 10 }, (_, index) => {
      const monthNumber = index + 3
      const monthStart = `2026-${String(monthNumber).padStart(2, '0')}-01`
      const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${monthStart}T00:00:00Z`))

      return {
        monthStart,
        monthLabel,
        contacts: 10000 + (index * 100),
        lowerBoundContacts: 9500 + (index * 100),
        upperBoundContacts: 10500 + (index * 100),
        averageDailyVolume: 500 + (index * 5),
        peakDailyVolume: 650 + (index * 5)
      }
    })

    const snapshot = buildForecastDemandSnapshot(
      {
        planningYear: 2026,
        forecastType: 'budget',
        planningContext: {
          groupId: 'group-1',
          planningYear: 2026
        },
        historyRows: [
          { ds: '2025-01-05', y: 100, cap: null, floor: null },
          { ds: '2025-02-05', y: 100, cap: null, floor: null },
          { ds: '2025-10-05', y: 100, cap: null, floor: null },
          { ds: '2025-11-05', y: 100, cap: null, floor: null },
          { ds: '2025-12-05', y: 100, cap: null, floor: null }
        ],
        ahtHistoryRows: [
          { ds: '2025-01-05', contacts: 100, ahtSeconds: 300 },
          { ds: '2025-02-05', contacts: 100, ahtSeconds: 310 },
          { ds: '2025-10-05', contacts: 100, ahtSeconds: 330 },
          { ds: '2025-11-05', contacts: 100, ahtSeconds: 340 },
          { ds: '2025-12-05', contacts: 100, ahtSeconds: 350 }
        ],
        modelConfig: {
          ahtAssumptionMethod: 'blend_recent_seasonal',
          ahtRecentMonthsWindow: 3,
          ahtMonthOverrides: [
            {
              monthStart: '2026-02-01',
              ahtSeconds: 402
            }
          ]
        },
        lastRun: {
          runAt: '2026-04-08T14:00:00Z',
          monthlyRollup: [
            { monthStart: '2026-01-01', monthLabel: 'Jan 2026', contacts: 10000, lowerBoundContacts: 9500, upperBoundContacts: 10500, averageDailyVolume: 500, peakDailyVolume: 650 },
            { monthStart: '2026-02-01', monthLabel: 'Feb 2026', contacts: 10500, lowerBoundContacts: 9900, upperBoundContacts: 11100, averageDailyVolume: 525, peakDailyVolume: 640 },
            ...trailingMonthlyRows
          ]
        }
      },
      2026
    )

    expect(snapshot[0]).toMatchObject({
      monthStart: '2026-01-01',
      ahtSeconds: 320
    })
    expect(snapshot[1]).toMatchObject({
      monthStart: '2026-02-01',
      ahtSeconds: 402
    })

    const appliedMonths = applyForecastSnapshotToPlanMonths(
      [
        { contacts: '', ahtSeconds: 280, peakDayUpliftPercent: 0 },
        { contacts: '', ahtSeconds: 280, peakDayUpliftPercent: 0 }
      ],
      snapshot
    )

    expect(appliedMonths[0]).toMatchObject({
      contacts: 10000,
      ahtSeconds: 320
    })
    expect(appliedMonths[1]).toMatchObject({
      contacts: 10500,
      ahtSeconds: 402
    })
  })

  it('normalizes saved demand source metadata and summarizes imported coverage', () => {
    const demandSource = createPlanDemandSource({
      mode: 'forecast',
      forecastProjectId: 'forecast-1',
      forecastProjectName: 'Q1 Forecast',
      forecastMonthSnapshot: [
        { monthIndex: 0, monthLabel: 'Jan 2026', monthStart: '2026-01-01', contacts: 14000, averageDailyVolume: 700, peakDailyVolume: 910 },
        { monthIndex: 1, monthLabel: 'Feb 2026', monthStart: '2026-02-01', contacts: 15500, averageDailyVolume: 775, peakDailyVolume: 930 }
      ],
      forecastDailySnapshot: [
        { serviceDate: '2026-02-02', monthIndex: 1, contacts: 320 },
        { serviceDate: '2026-01-03', monthIndex: 0, contacts: 300 }
      ]
    })

    expect(demandSource.forecastDailySnapshot).toEqual([
      { serviceDate: '2026-01-03', monthIndex: 0, monthLabel: 'Jan', contacts: 300 },
      { serviceDate: '2026-02-02', monthIndex: 1, monthLabel: 'Feb', contacts: 320 }
    ])
    expect(summarizeForecastDemandSnapshot(demandSource.forecastMonthSnapshot)).toMatchObject({
      matchedMonthCount: 2,
      coverageLabel: 'Covers 2/12 required months',
      totalContacts: 29500,
      peakMonthLabel: 'Feb 2026',
      peakMonthContacts: 15500
    })
  })

  it('accepts a forecast that covers required plan months when metadata year differs', () => {
    const snapshot = buildForecastDemandSnapshot(
      {
        planningYear: 2026,
        forecastType: 'budget',
        groupId: 'group-1',
        coverageStartDate: '2027-01-01',
        coverageEndDate: '2027-12-31',
        lastRun: {
          runAt: '2026-04-08T14:00:00Z',
          monthlyRollup: Array.from({ length: 12 }, (_, index) => ({
            monthStart: `2027-${String(index + 1).padStart(2, '0')}-01`,
            monthLabel: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]} 2027`,
            contacts: 10000 + (index * 100),
            lowerBoundContacts: 9500 + (index * 100),
            upperBoundContacts: 10500 + (index * 100)
          }))
        }
      },
      2027
    )

    expect(snapshot).toHaveLength(12)
    expect(snapshot[0]).toMatchObject({
      monthStart: '2027-01-01',
      contacts: 10000
    })
    expect(snapshot.at(-1)).toMatchObject({
      monthStart: '2027-12-01',
      contacts: 11100
    })
  })

  it('summarizes required forecast coverage for update plans after actuals', () => {
    const forecastProject = {
      planningYear: 2027,
      forecastType: 'budget',
      groupId: 'group-1',
      coverageStartDate: '2027-07-01',
      coverageEndDate: '2027-12-31',
      lastRun: {
        runAt: '2026-04-08T14:00:00Z',
        monthlyRollup: Array.from({ length: 6 }, (_, index) => ({
          monthStart: `2027-${String(index + 7).padStart(2, '0')}-01`,
          monthLabel: `${['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]} 2027`,
          contacts: 10000 + (index * 100)
        }))
      }
    }

    expect(summarizeForecastCoverageForPlan(forecastProject, 2027, {
      planType: 'update',
      actualsThroughMonth: '2027-06-01'
    })).toMatchObject({
      matchedMonthCount: 6,
      requiredMonthCount: 6,
      hasRequiredCoverage: true,
      coverageLabel: 'Covers 6/6 required months',
      missingCoverageLabel: ''
    })
    expect(summarizeForecastCoverageForPlan(forecastProject, 2027)).toMatchObject({
      matchedMonthCount: 6,
      requiredMonthCount: 12,
      hasRequiredCoverage: false,
      missingCoverageLabel: 'Missing Jan 2027-Jun 2027'
    })
  })

  it('snapshots only the required update-plan months from a longer forecast', () => {
    const snapshot = buildForecastDemandSnapshot(
      {
        planningYear: 2027,
        forecastType: 'budget',
        groupId: 'group-1',
        coverageStartDate: '2027-01-01',
        coverageEndDate: '2027-12-31',
        lastRun: {
          runAt: '2026-04-08T14:00:00Z',
          monthlyRollup: Array.from({ length: 12 }, (_, index) => ({
            monthStart: `2027-${String(index + 1).padStart(2, '0')}-01`,
            monthLabel: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]} 2027`,
            contacts: 10000 + (index * 100)
          }))
        }
      },
      2027,
      {
        planType: 'update',
        actualsThroughMonth: '2027-03-01'
      }
    )

    expect(snapshot).toHaveLength(9)
    expect(snapshot[0]).toMatchObject({
      monthStart: '2027-04-01',
      monthIndex: 3
    })
    expect(snapshot.at(-1)).toMatchObject({
      monthStart: '2027-12-01',
      monthIndex: 11
    })
  })

  it('uses adjusted monthly totals when a forecast has range adjustment rules', () => {
    const trailingDailyRows = Array.from({ length: 10 }, (_, index) => {
      const monthNumber = index + 3
      const monthStart = `2026-${String(monthNumber).padStart(2, '0')}-01`
      return { ds: monthStart, yhat: 100, yhatLower: 90, yhatUpper: 110, isHistory: false }
    })
    const trailingMonthlyRows = Array.from({ length: 10 }, (_, index) => {
      const monthNumber = index + 3
      const monthStart = `2026-${String(monthNumber).padStart(2, '0')}-01`
      const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${monthStart}T00:00:00Z`))
      return { monthStart, monthLabel, contacts: 100, lowerBoundContacts: 90, upperBoundContacts: 110 }
    })

    const snapshot = buildForecastDemandSnapshot(
      {
        planningYear: 2026,
        forecastType: 'budget',
        planningContext: {
          groupId: 'group-1',
          planningYear: 2026
        },
        manualAdjustments: [
          { startDate: '2026-01-02', endDate: '2026-01-02', adjustmentType: 'delta', value: 250, reason: 'Launch campaign' },
          { startDate: '2026-02-01', endDate: '2026-02-01', adjustmentType: 'delta', value: -100, reason: 'Weather event' }
        ],
        lastRun: {
          runAt: '2026-04-08T14:00:00Z',
          dailyForecast: [
            { ds: '2026-01-01', yhat: 1000, yhatLower: 900, yhatUpper: 1100, isHistory: false },
            { ds: '2026-01-02', yhat: 1000, yhatLower: 900, yhatUpper: 1100, isHistory: false },
            { ds: '2026-02-01', yhat: 1200, yhatLower: 1100, yhatUpper: 1300, isHistory: false },
            ...trailingDailyRows
          ],
          monthlyRollup: [
            { monthStart: '2026-01-01', monthLabel: 'Jan 2026', contacts: 2000, lowerBoundContacts: 1800, upperBoundContacts: 2200 },
            { monthStart: '2026-02-01', monthLabel: 'Feb 2026', contacts: 1200, lowerBoundContacts: 1100, upperBoundContacts: 1300 },
            ...trailingMonthlyRows
          ]
        }
      },
      2026
    )

    expect(snapshot.slice(0, 2)).toEqual([
      {
        monthIndex: 0,
        monthLabel: 'Jan 2026',
        monthStart: '2026-01-01',
        contacts: 2250,
        ahtSeconds: null,
        lowerBoundContacts: 2050,
        upperBoundContacts: 2450,
        averageDailyVolume: 1125,
        peakDailyVolume: 1250
      },
      {
        monthIndex: 1,
        monthLabel: 'Feb 2026',
        monthStart: '2026-02-01',
        contacts: 1100,
        ahtSeconds: null,
        lowerBoundContacts: 1000,
        upperBoundContacts: 1200,
        averageDailyVolume: 1100,
        peakDailyVolume: 1100
      }
    ])
    expect(snapshot).toHaveLength(12)
  })

  it('builds a daily forecast snapshot for the selected planning year', () => {
    const snapshot = buildForecastDailyDemandSnapshot(
      {
        planningYear: 2026,
        forecastType: 'budget',
        planningContext: {
          groupId: 'group-1',
          planningYear: 2026
        },
        lastRun: {
          runAt: '2026-04-08T14:00:00Z',
          monthlyRollup: Array.from({ length: 12 }, (_, index) => ({
            monthStart: `2026-${String(index + 1).padStart(2, '0')}-01`,
            monthLabel: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]} 2026`,
            contacts: 10000 + (index * 100),
            lowerBoundContacts: 9500 + (index * 100),
            upperBoundContacts: 10500 + (index * 100)
          })),
          dailyForecast: [
            { ds: '2025-12-31', yhat: 900, isHistory: false },
            { ds: '2026-01-01', actualValue: 1300, yhat: 1000, isHistory: true },
            { ds: '2026-01-02', yhat: 1100, isHistory: true },
            { ds: '2026-01-03', yhat: 1150, isHistory: false },
            { ds: '2026-02-01', yhat: 1200, isHistory: false }
          ]
        }
      },
      2026
    )

    expect(snapshot).toEqual([
      { serviceDate: '2026-01-01', monthIndex: 0, monthLabel: 'Jan', contacts: 1300 },
      { serviceDate: '2026-01-02', monthIndex: 0, monthLabel: 'Jan', contacts: 1100 },
      { serviceDate: '2026-01-03', monthIndex: 0, monthLabel: 'Jan', contacts: 1150 },
      { serviceDate: '2026-02-01', monthIndex: 1, monthLabel: 'Feb', contacts: 1200 }
    ])
  })

  it('does not create daily demand rows for monthly-only forecasts', () => {
    const snapshot = buildForecastDailyDemandSnapshot(
      {
        planningYear: 2026,
        forecastType: 'budget',
        planningContext: {
          groupId: 'group-1',
          planningYear: 2026
        },
        lastRun: {
          runAt: '2026-04-08T14:00:00Z',
          monthlyRollup: Array.from({ length: 12 }, (_, index) => ({
            monthStart: `2026-${String(index + 1).padStart(2, '0')}-01`,
            monthLabel: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]} 2026`,
            contacts: 10000 + (index * 100)
          }))
        }
      },
      2026
    )

    expect(snapshot).toEqual([])
  })

  it('summarizes daily forecast demand using only open days', () => {
    const summaryByMonthIndex = summarizeForecastDailyDemandForOpenDays({
      planningYear: 2026,
      operatingWeekdays: [1, 2, 3, 4, 5],
      holidayCalendarId: 'none',
      customHolidays: [
        {
          id: 'jan-second-closure',
          label: 'Company Closure',
          date: '2026-01-02'
        }
      ],
      forecastDailySnapshot: [
        { serviceDate: '2025-12-31', monthIndex: 11, monthLabel: 'Dec', contacts: 900 },
        { serviceDate: '2026-01-01', monthIndex: 0, monthLabel: 'Jan', contacts: 100 },
        { serviceDate: '2026-01-02', monthIndex: 0, monthLabel: 'Jan', contacts: 200 },
        { serviceDate: '2026-01-03', monthIndex: 0, monthLabel: 'Jan', contacts: 300 },
        { serviceDate: '2026-02-02', monthIndex: 1, monthLabel: 'Feb', contacts: 400 }
      ]
    })

    expect(summaryByMonthIndex.get(0)).toMatchObject({
      monthIndex: 0,
      monthLabel: 'Jan',
      contacts: 100,
      openForecastDays: 1,
      averageDailyVolume: 100,
      peakDailyVolume: 100
    })
    expect(summaryByMonthIndex.get(1)).toMatchObject({
      monthIndex: 1,
      monthLabel: 'Feb',
      contacts: 400,
      openForecastDays: 1,
      averageDailyVolume: 400,
      peakDailyVolume: 400
    })
  })
})
