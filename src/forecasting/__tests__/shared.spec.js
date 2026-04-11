import {
  createForecastProject,
  getForecastProjectDailyRows,
  getForecastProjectMonthlyRollup
} from '../shared'

describe('forecasting shared helpers', () => {
  it('applies manual adjustments to future daily rows and recomputes monthly rollups', () => {
    const project = createForecastProject({
      planningYear: 2026,
      forecastType: 'budget',
      planningContext: {
        groupId: 'group-1',
        planningYear: 2026
      },
      manualAdjustments: [
        { ds: '2026-01-02', delta: 150, reason: 'Marketing launch' },
        { ds: '2026-02-01', delta: -50, reason: 'Weather event' }
      ],
      lastRun: {
        runAt: '2026-04-08T14:00:00Z',
        dailyForecast: [
          { ds: '2025-12-31', actualValue: 980, yhat: 980, yhatLower: 940, yhatUpper: 1010, isHistory: true },
          { ds: '2026-01-01', actualValue: null, yhat: 1000, yhatLower: 900, yhatUpper: 1100, isHistory: false },
          { ds: '2026-01-02', actualValue: null, yhat: 1000, yhatLower: 900, yhatUpper: 1100, isHistory: false },
          { ds: '2026-02-01', actualValue: null, yhat: 1200, yhatLower: 1100, yhatUpper: 1300, isHistory: false }
        ],
        monthlyRollup: [
          { monthStart: '2026-01-01', monthLabel: 'Jan 2026', contacts: 2000, lowerBoundContacts: 1800, upperBoundContacts: 2200 },
          { monthStart: '2026-02-01', monthLabel: 'Feb 2026', contacts: 1200, lowerBoundContacts: 1100, upperBoundContacts: 1300 }
        ]
      }
    })

    const dailyRows = getForecastProjectDailyRows(project)
    const januarySecondRow = dailyRows.find((row) => row.ds === '2026-01-02')
    const januaryFirstMonth = getForecastProjectMonthlyRollup(project).find((row) => row.monthStart === '2026-01-01')
    const februaryMonth = getForecastProjectMonthlyRollup(project).find((row) => row.monthStart === '2026-02-01')

    expect(januarySecondRow).toMatchObject({
      baselineYhat: 1000,
      manualAdjustmentDelta: 150,
      adjustmentReason: 'Marketing launch',
      isAdjusted: true,
      yhat: 1150,
      yhatLower: 1050,
      yhatUpper: 1250
    })

    expect(januaryFirstMonth).toMatchObject({
      monthLabel: 'Jan 2026',
      contacts: 2150,
      lowerBoundContacts: 1950,
      upperBoundContacts: 2350
    })

    expect(februaryMonth).toMatchObject({
      monthLabel: 'Feb 2026',
      contacts: 1150,
      lowerBoundContacts: 1050,
      upperBoundContacts: 1250
    })
  })
})
