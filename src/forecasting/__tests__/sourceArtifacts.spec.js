import {
  buildMonthlyAhtOverridesFromImportedDailyRows,
  buildImportedDailySourceStateFromText,
  createManualMonthlyEntryRows,
  createManualMonthlyForecastResults
} from '../sourceArtifacts'

describe('forecast source artifacts', () => {
  it('rejects imported daily forecasts that do not match the selected planning window', () => {
    const state = buildImportedDailySourceStateFromText({
      fileName: 'forecasting_daily_volume_sample_2022_2024.csv',
      text: [
        'date,forecast,aht_seconds',
        '2022-01-01,100,300',
        '2024-12-31,125,320'
      ].join('\n'),
      currentMapping: {
        dateColumn: 'date',
        forecastColumn: 'forecast',
        ahtColumn: 'aht_seconds'
      },
      planningYear: 2025,
      forecastType: 'budget',
      coverageStartMonthIndex: 0
    })

    expect(state.importedDailyRows).toHaveLength(2)
    expect(state.issues).toContain(
      'This imported budget forecast must contain one complete daily forecast from 2025-01-01 through 2025-12-31.'
    )
  })

  it('accepts an imported daily forecast when it exactly matches the selected coverage window', () => {
    const dailyRows = Array.from({ length: 365 }, (_, index) => {
      const currentDate = new Date(Date.UTC(2025, 0, index + 1))
      const dateLabel = currentDate.toISOString().slice(0, 10)
      return `${dateLabel},${100 + index},${300 + (index % 12)}`
    })
    const state = buildImportedDailySourceStateFromText({
      fileName: 'consumer-voice-2025-budget.csv',
      text: ['date,forecast,aht_seconds', ...dailyRows].join('\n'),
      currentMapping: {
        dateColumn: 'date',
        forecastColumn: 'forecast',
        ahtColumn: 'aht_seconds'
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
      yhatUpper: 100,
      ahtSeconds: 300
    })
    expect(state.importedDailyRows.at(-1)).toMatchObject({
      ds: '2025-12-31',
      yhat: 464,
      ahtSeconds: 304
    })
    expect(state.ahtMonthOverrides).toHaveLength(12)
    expect(state.ahtMonthOverrides[0]).toMatchObject({
      monthStart: '2025-01-01'
    })
  })

  it('accepts an imported daily forecast for a custom month coverage range', () => {
    const dailyRows = Array.from({ length: 28 }, (_, index) => {
      const currentDate = new Date(Date.UTC(2025, 1, index + 1))
      const dateLabel = currentDate.toISOString().slice(0, 10)
      return `${dateLabel},${100 + index},${300 + (index % 12)}`
    })
    const state = buildImportedDailySourceStateFromText({
      fileName: 'consumer-voice-feb-2025.csv',
      text: ['date,forecast,aht_seconds', ...dailyRows].join('\n'),
      currentMapping: {
        dateColumn: 'date',
        forecastColumn: 'forecast',
        ahtColumn: 'aht_seconds'
      },
      planningYear: 2025,
      forecastType: 'budget',
      coverageStartDate: '2025-02-01',
      coverageEndDate: '2025-02-28'
    })

    expect(state.issues).toEqual([])
    expect(state.importedDailyRows).toHaveLength(28)
    expect(state.importedDailyRows[0].ds).toBe('2025-02-01')
    expect(state.importedDailyRows.at(-1).ds).toBe('2025-02-28')
  })

  it('builds manual monthly rows and planning-ready results across calendar years', () => {
    const rows = createManualMonthlyEntryRows({
      planningYear: 2026,
      forecastType: 'budget',
      coverageStartDate: '2026-10-01',
      coverageEndDate: '2027-03-31'
    })

    expect(rows).toHaveLength(6)
    expect(rows[0]).toMatchObject({ monthStart: '2026-10-01', monthLabel: 'Oct 2026' })
    expect(rows.at(-1)).toMatchObject({ monthStart: '2027-03-01', monthLabel: 'Mar 2027' })

    const results = createManualMonthlyForecastResults({
      rows: rows.map((row, index) => ({ ...row, contacts: 1000 + index })),
      planningYear: 2026,
      forecastType: 'budget',
      coverageStartDate: '2026-10-01',
      coverageEndDate: '2027-03-31'
    })

    expect(results.summary).toMatchObject({
      planningReady: true,
      coverageStartDate: '2026-10-01',
      coverageEndDate: '2027-03-31'
    })
    expect(results.monthlyRollup).toHaveLength(6)
  })

  it('requires imported daily forecasts to map average handle time', () => {
    const state = buildImportedDailySourceStateFromText({
      fileName: 'consumer-voice-2025-budget.csv',
      text: [
        'date,forecast',
        '2025-01-01,100'
      ].join('\n'),
      currentMapping: {
        dateColumn: 'date',
        forecastColumn: 'forecast'
      },
      planningYear: 2025,
      forecastType: 'budget',
      coverageStartMonthIndex: 0
    })

    expect(state.importedDailyRows).toHaveLength(0)
    expect(state.issues).toContain('Choose the average handle time column before loading an imported forecast.')
  })

  it('rejects zero average handle time because imported workload inputs must be positive', () => {
    const state = buildImportedDailySourceStateFromText({
      fileName: 'consumer-voice-jan-2025.csv',
      text: [
        'date,forecast,aht_seconds',
        '2025-01-01,100,0'
      ].join('\n'),
      currentMapping: {
        dateColumn: 'date',
        forecastColumn: 'forecast',
        ahtColumn: 'aht_seconds'
      },
      planningYear: 2025,
      forecastType: 'budget',
      coverageStartDate: '2025-01-01',
      coverageEndDate: '2025-01-01'
    })

    expect(state.importedDailyRows).toHaveLength(0)
    expect(state.issues).toContain('Row 2: enter positive average handle time seconds in "aht_seconds".')
  })

  it('builds monthly weighted AHT overrides from imported daily rows', () => {
    const overrides = buildMonthlyAhtOverridesFromImportedDailyRows([
      { ds: '2025-01-01', yhat: 100, ahtSeconds: 300 },
      { ds: '2025-01-02', yhat: 300, ahtSeconds: 360 },
      { ds: '2025-02-01', yhat: 0, ahtSeconds: 320 },
      { ds: '2025-02-02', yhat: 0, ahtSeconds: 340 }
    ])

    expect(overrides).toEqual([
      {
        monthStart: '2025-01-01',
        ahtSeconds: 345
      },
      {
        monthStart: '2025-02-01',
        ahtSeconds: 330
      }
    ])
  })
})
