import {
  buildForecastTrainingSeedFromPlanningGroupActuals,
  hasMinimumForecastTrainingHistory,
  MINIMUM_FORECAST_HISTORY_DAYS
} from '../groupActualsForecastSeed'

describe('groupActualsForecastSeed', () => {
  it('maps staffing-group history into forecast history rows', () => {
    expect(
      buildForecastTrainingSeedFromPlanningGroupActuals({
        dailyRows: [
          { serviceDate: '2025-01-01', contacts: 820, ahtSeconds: 280 },
          { serviceDate: '2025-01-02', contacts: 910, ahtSeconds: 285 }
        ]
      })
    ).toEqual({
      historyRows: [
        { ds: '2025-01-01', y: 820, cap: null, floor: null, holidayLabel: '' },
        { ds: '2025-01-02', y: 910, cap: null, floor: null, holidayLabel: '' }
      ],
      ahtHistoryRows: [
        { ds: '2025-01-01', contacts: 820, ahtSeconds: 280 },
        { ds: '2025-01-02', contacts: 910, ahtSeconds: 285 }
      ]
    })
  })

  it('checks the minimum shared-history threshold for modeled forecasts', () => {
    expect(
      hasMinimumForecastTrainingHistory({
        dailyRows: Array.from({ length: MINIMUM_FORECAST_HISTORY_DAYS - 1 }, (_, index) => ({
          serviceDate: `2025-01-${String(index + 1).padStart(2, '0')}`,
          contacts: 800 + index,
          ahtSeconds: 280
        }))
      })
    ).toBe(false)

    expect(
      hasMinimumForecastTrainingHistory({
        dailyRows: Array.from({ length: MINIMUM_FORECAST_HISTORY_DAYS }, (_, index) => ({
          serviceDate: `2025-01-${String(index + 1).padStart(2, '0')}`,
          contacts: 800 + index,
          ahtSeconds: 280
        }))
      })
    ).toBe(true)
  })
})
