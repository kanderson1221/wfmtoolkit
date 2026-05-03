import {
  createForecastProject,
  getForecastSourceKindLabel,
  getForecastProjectDailyRows,
  getForecastProjectMonthlyRollup,
  resolveForecastCoverageWindow
} from '../shared'

describe('forecasting shared helpers', () => {
  it('defaults new forecasts to a 60 day test set', () => {
    const project = createForecastProject()

    expect(project.modelConfig.holdoutDays).toBe(60)
  })

  it('uses plan version names when creating default staffing-group forecast names', () => {
    const project = createForecastProject({
      groupName: 'Consumer Voice',
      planningYear: 2026,
      planName: '2026 Apr Update',
      forecastType: 'budget',
      planningContext: {
        groupId: 'group-1',
        planningYear: 2026,
        groupName: 'Consumer Voice',
        planId: 'update-1',
        planName: '2026 Apr Update',
        planType: 'update',
        actualsThroughMonth: '2026-03-01'
      }
    })

    expect(project.name).toBe('Consumer Voice 2026 Apr Update Forecast')
    expect(project.planningContext.planName).toBe('2026 Apr Update')
  })

  it('formats forecast coverage labels with endpoint years', () => {
    expect(resolveForecastCoverageWindow({
      planningYear: 2027,
      forecastType: 'budget',
      coverageStartDate: '2027-01-01',
      coverageEndDate: '2027-12-31'
    }).coverageMonthLabel).toBe('Jan 2027-Dec 2027')
    expect(resolveForecastCoverageWindow({
      planningYear: 2026,
      forecastType: 'budget',
      coverageStartDate: '2026-10-01',
      coverageEndDate: '2028-03-31'
    }).coverageMonthLabel).toBe('Oct 2026-Mar 2028')
  })

  it('uses source labels that describe forecast origin', () => {
    expect(getForecastSourceKindLabel('modeled_daily')).toBe('Modeled')
    expect(getForecastSourceKindLabel('manual_monthly')).toBe('Manual')
    expect(getForecastSourceKindLabel('imported_daily')).toBe('Imported')
  })

  it('applies range adjustment rules to future daily rows and recomputes monthly rollups', () => {
    const project = createForecastProject({
      planningYear: 2026,
      forecastType: 'budget',
      planningContext: {
        groupId: 'group-1',
        planningYear: 2026
      },
      manualAdjustments: [
        { startDate: '2026-01-02', endDate: '2026-01-02', adjustmentType: 'delta', value: 150, reason: 'Marketing launch' },
        { startDate: '2026-02-01', endDate: '2026-02-01', adjustmentType: 'delta', value: -50, reason: 'Weather event' }
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
      appliedAdjustments: [
        expect.objectContaining({
          startDate: '2026-01-02',
          endDate: '2026-01-02',
          adjustmentType: 'delta',
          value: 150
        })
      ],
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

  it('supports setting a daily volume directly across a range', () => {
    const project = createForecastProject({
      planningYear: 2026,
      forecastType: 'budget',
      planningContext: {
        groupId: 'group-1',
        planningYear: 2026
      },
      manualAdjustments: [
        { startDate: '2026-01-02', endDate: '2026-01-03', adjustmentType: 'set', value: 1250 }
      ],
      lastRun: {
        runAt: '2026-04-08T14:00:00Z',
        dailyForecast: [
          { ds: '2025-12-31', actualValue: 980, yhat: 980, yhatLower: 940, yhatUpper: 1010, isHistory: true },
          { ds: '2026-01-01', actualValue: null, yhat: 1000, yhatLower: 900, yhatUpper: 1100, isHistory: false },
          { ds: '2026-01-02', actualValue: null, yhat: 1000, yhatLower: 900, yhatUpper: 1100, isHistory: false },
          { ds: '2026-01-03', actualValue: null, yhat: 1100, yhatLower: 1000, yhatUpper: 1200, isHistory: false }
        ],
        monthlyRollup: [
          { monthStart: '2026-01-01', monthLabel: 'Jan 2026', contacts: 3100, lowerBoundContacts: 2800, upperBoundContacts: 3400 }
        ]
      }
    })

    const dailyRows = getForecastProjectDailyRows(project)
    const januarySecondRow = dailyRows.find((row) => row.ds === '2026-01-02')
    const januaryThirdRow = dailyRows.find((row) => row.ds === '2026-01-03')
    const januaryMonth = getForecastProjectMonthlyRollup(project).find((row) => row.monthStart === '2026-01-01')

    expect(januarySecondRow).toMatchObject({
      baselineYhat: 1000,
      manualAdjustmentDelta: 250,
      yhat: 1250,
      yhatLower: 1150,
      yhatUpper: 1350
    })

    expect(januaryThirdRow).toMatchObject({
      baselineYhat: 1100,
      manualAdjustmentDelta: 150,
      yhat: 1250,
      yhatLower: 1150,
      yhatUpper: 1350
    })

    expect(januaryMonth).toMatchObject({
      monthLabel: 'Jan 2026',
      contacts: 3500,
      lowerBoundContacts: 3200,
      upperBoundContacts: 3800
    })
  })
})
