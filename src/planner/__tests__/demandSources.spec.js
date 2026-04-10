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
})
