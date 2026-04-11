import {
  applyForecastSnapshotToPlanMonths,
  buildForecastDemandSnapshot,
  createPlanDemandSource,
  summarizeForecastDemandSnapshot
} from '../demandSources'

describe('planner demand sources', () => {
  it('filters a forecast monthly rollup to the selected planning year', () => {
    const snapshot = buildForecastDemandSnapshot(
      {
        planningYear: 2026,
        forecastType: 'reforecast',
        coverageStartMonthIndex: 10,
        planningContext: {
          groupId: 'group-1',
          planningYear: 2026
        },
        lastRun: {
          runAt: '2026-04-08T14:00:00Z',
          monthlyRollup: [
            { monthStart: '2025-12-01', monthLabel: 'Dec 2025', contacts: 9000, lowerBoundContacts: 8400, upperBoundContacts: 9700 },
            { monthStart: '2026-11-01', monthLabel: 'Nov 2026', contacts: 12000, lowerBoundContacts: 11300, upperBoundContacts: 12700 },
            { monthStart: '2026-12-01', monthLabel: 'Dec 2026', contacts: 11000, lowerBoundContacts: 10500, upperBoundContacts: 11800 }
          ]
        }
      },
      2026
    )

    expect(snapshot).toEqual([
      {
        monthIndex: 10,
        monthLabel: 'Nov 2026',
        monthStart: '2026-11-01',
        contacts: 12000,
        lowerBoundContacts: 11300,
        upperBoundContacts: 12700
      },
      {
        monthIndex: 11,
        monthLabel: 'Dec 2026',
        monthStart: '2026-12-01',
        contacts: 11000,
        lowerBoundContacts: 10500,
        upperBoundContacts: 11800
      }
    ])
  })

  it('applies a forecast snapshot into monthly contacts without disturbing AHT inputs', () => {
    const appliedMonths = applyForecastSnapshotToPlanMonths(
      [
        { contacts: '', ahtSeconds: 300, peakDayUpliftPercent: 0 },
        { contacts: 5000, ahtSeconds: 320, peakDayUpliftPercent: 10 }
      ],
      [
        { monthIndex: 0, monthLabel: 'Jan 2026', monthStart: '2026-01-01', contacts: 14000 },
        { monthIndex: 1, monthLabel: 'Feb 2026', monthStart: '2026-02-01', contacts: 15000 }
      ]
    )

    expect(appliedMonths[0]).toMatchObject({
      contacts: 14000,
      ahtSeconds: 300,
      peakDayUpliftPercent: 0
    })
    expect(appliedMonths[1]).toMatchObject({
      contacts: 15000,
      ahtSeconds: 320,
      peakDayUpliftPercent: 10
    })
  })

  it('normalizes saved demand source metadata and summarizes imported coverage', () => {
    const demandSource = createPlanDemandSource({
      mode: 'forecast',
      forecastProjectId: 'forecast-1',
      forecastProjectName: 'Q1 Forecast',
      forecastMonthSnapshot: [
        { monthIndex: 0, monthLabel: 'Jan 2026', monthStart: '2026-01-01', contacts: 14000 },
        { monthIndex: 1, monthLabel: 'Feb 2026', monthStart: '2026-02-01', contacts: 15500 }
      ]
    })

    expect(summarizeForecastDemandSnapshot(demandSource.forecastMonthSnapshot)).toMatchObject({
      matchedMonthCount: 2,
      coverageLabel: '2/12 months',
      totalContacts: 29500,
      peakMonthLabel: 'Feb 2026',
      peakMonthContacts: 15500
    })
  })

  it('uses adjusted monthly totals when a forecast has manual daily overrides', () => {
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
          { ds: '2026-01-02', delta: 250, reason: 'Launch campaign' },
          { ds: '2026-02-01', delta: -100, reason: 'Weather event' }
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
        lowerBoundContacts: 2050,
        upperBoundContacts: 2450
      },
      {
        monthIndex: 1,
        monthLabel: 'Feb 2026',
        monthStart: '2026-02-01',
        contacts: 1100,
        lowerBoundContacts: 1000,
        upperBoundContacts: 1200
      }
    ])
    expect(snapshot).toHaveLength(12)
  })
})
