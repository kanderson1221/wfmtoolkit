import {
  buildImportedDailySourceStateFromText
} from '../sourceArtifacts'

describe('forecast source artifacts', () => {
  it('rejects imported daily forecasts that do not match the selected planning window', () => {
    const state = buildImportedDailySourceStateFromText({
      fileName: 'forecasting_daily_volume_sample_2022_2024.csv',
      text: [
        'date,forecast',
        '2022-01-01,100',
        '2024-12-31,125'
      ].join('\n'),
      currentMapping: {
        dateColumn: 'date',
        forecastColumn: 'forecast'
      },
      planningYear: 2025,
      forecastType: 'budget',
      coverageStartMonthIndex: 0
    })

    expect(state.importedDailyRows).toHaveLength(2)
    expect(state.issues).toContain(
      'This imported 2025 budget forecast must contain one complete daily forecast from 2025-01-01 through 2025-12-31.'
    )
  })

  it('accepts an imported daily forecast when it exactly matches the selected coverage window', () => {
    const dailyRows = Array.from({ length: 365 }, (_, index) => {
      const currentDate = new Date(Date.UTC(2025, 0, index + 1))
      const dateLabel = currentDate.toISOString().slice(0, 10)
      return `${dateLabel},${100 + index}`
    })
    const state = buildImportedDailySourceStateFromText({
      fileName: 'consumer-voice-2025-budget.csv',
      text: ['date,forecast', ...dailyRows].join('\n'),
      currentMapping: {
        dateColumn: 'date',
        forecastColumn: 'forecast'
      },
      planningYear: 2025,
      forecastType: 'budget',
      coverageStartMonthIndex: 0
    })

    expect(state.issues).toEqual([])
    expect(state.importedDailyRows).toHaveLength(365)
    expect(state.importedDailyRows[0]).toMatchObject({
      ds: '2025-01-01',
      yhat: 100,
      yhatLower: 100,
      yhatUpper: 100
    })
    expect(state.importedDailyRows.at(-1)).toMatchObject({
      ds: '2025-12-31',
      yhat: 464
    })
  })
})
