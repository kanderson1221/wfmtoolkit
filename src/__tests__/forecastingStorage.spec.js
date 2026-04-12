import { upsertForecastProject } from '../forecastingStorage'

describe('forecastingStorage', () => {
  it('preserves monthly component rows when saving a forecast project', () => {
    const projects = upsertForecastProject([], {
      id: 'forecast-1',
      name: 'Monthly component forecast',
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

    expect(projects[0].lastRun.components.monthly).toEqual([{ label: 'Jan 01', value: 4.2 }])
  })
})
