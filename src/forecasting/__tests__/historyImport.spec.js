import { buildForecastHistoryStateFromText } from '../historyImport'

describe('forecast history import', () => {
  it('maps a daily history file with service date and call volume only', () => {
    const state = buildForecastHistoryStateFromText({
      fileName: 'history.csv',
      text: [
        'service_date,call_volume',
        '2025-01-01,820',
        '2025-01-02,910'
      ].join('\n')
    })

    expect(state.parserIssues).toEqual([])
    expect(state.columnMapping).toEqual({
      dateColumn: 'service_date',
      volumeColumn: 'call_volume'
    })
    expect(state.historyRows).toEqual([
      {
        sourceRowIndex: 2,
        ds: '2025-01-01',
        y: 820,
        cap: null,
        floor: null
      },
      {
        sourceRowIndex: 3,
        ds: '2025-01-02',
        y: 910,
        cap: null,
        floor: null
      }
    ])
  })

  it('ignores extra uploaded columns when the mapped date and call volume columns are valid', () => {
    const state = buildForecastHistoryStateFromText({
      fileName: 'legacy-history.csv',
      text: [
        'service_date,call_volume,cap,floor',
        '2025-01-01,820,2500,0',
        '2025-01-02,910,2500,0'
      ].join('\n')
    })

    expect(state.parserIssues).toEqual([])
    expect(state.columnMapping).toEqual({
      dateColumn: 'service_date',
      volumeColumn: 'call_volume'
    })
    expect(state.historyRows).toEqual([
      {
        sourceRowIndex: 2,
        ds: '2025-01-01',
        y: 820,
        cap: null,
        floor: null
      },
      {
        sourceRowIndex: 3,
        ds: '2025-01-02',
        y: 910,
        cap: null,
        floor: null
      }
    ])
  })
})
