import { upsertForecastProject } from '../forecastingStorage'

describe('forecastingStorage', () => {
  it('preserves monthly component rows when saving a forecast project', () => {
    const projects = upsertForecastProject([], {
      id: 'forecast-1',
      name: 'Monthly component forecast',
      sourceKind: 'imported_daily',
      sourceData: {
        fileName: 'forecast.csv',
        headers: ['date', 'forecast'],
        rows: [{ date: '2026-01-01', forecast: '1000' }],
        mapping: {
          dateColumn: 'date',
          forecastColumn: 'forecast'
        },
        issues: []
      },
      lastRun: {
        runAt: '2026-04-11T21:00:00.000Z',
        dailyForecast: [],
        monthlyRollup: [],
        components: {
          trend: [],
          yearly: [],
          monthly: [{ label: 'Jan 01', value: 4.2 }],
          weekly: [],
          holidays: []
        },
        diagnostics: {
          warnings: [],
          validationNotes: [],
          holdout: null
        }
      }
    })

    expect(projects[0].sourceKind).toBe('imported_daily')
    expect(projects[0].sourceData.fileName).toBe('forecast.csv')
    expect(projects[0].lastRun.components.monthly).toEqual([{ label: 'Jan 01', value: 4.2 }])
  })
})
