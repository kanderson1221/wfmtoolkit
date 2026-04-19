import {
  buildGroupActualsImportStateFromText,
  normalizeGroupActualsUploadedRows
} from '../groupActualsImport'

describe('groupActualsImport', () => {
  it('normalizes mapped daily actual rows and ignores extra columns', () => {
    const normalized = normalizeGroupActualsUploadedRows({
      rows: [
        {
          rowIndex: 2,
          service_date: '2026-01-02',
          contacts: '120',
          average_handle_time_seconds: '315',
          notes: 'ignore me'
        }
      ],
      mapping: {
        dateColumn: 'service_date',
        volumeColumn: 'contacts',
        ahtColumn: 'average_handle_time_seconds'
      }
    })

    expect(normalized.issues).toEqual([])
    expect(normalized.dailyRows).toEqual([
      {
        sourceRowIndex: 2,
        serviceDate: '2026-01-02',
        contacts: 120,
        ahtSeconds: 315
      }
    ])
  })

  it('accepts uploaded dates across multiple years', () => {
    const normalized = normalizeGroupActualsUploadedRows({
      rows: [
        {
          rowIndex: 2,
          service_date: '2025-12-31',
          contacts: '120',
          average_handle_time_seconds: '315'
        }
      ],
      mapping: {
        dateColumn: 'service_date',
        volumeColumn: 'contacts',
        ahtColumn: 'average_handle_time_seconds'
      }
    })

    expect(normalized.issues).toEqual([])
    expect(normalized.dailyRows).toEqual([
      {
        sourceRowIndex: 2,
        serviceDate: '2025-12-31',
        contacts: 120,
        ahtSeconds: 315
      }
    ])
  })

  it('guesses common headers when building import state from CSV text', () => {
    const importState = buildGroupActualsImportStateFromText({
      fileName: 'actuals.csv',
      text: 'service_date,contacts,average_handle_time_seconds\n2025-12-31,90,280\n2026-01-01,150,320\n'
    })

    expect(importState.uploadedFileName).toBe('actuals.csv')
    expect(importState.columnMapping).toEqual({
      dateColumn: 'service_date',
      volumeColumn: 'contacts',
      ahtColumn: 'average_handle_time_seconds'
    })
    expect(importState.dailyRows).toEqual([
      {
        sourceRowIndex: 2,
        serviceDate: '2025-12-31',
        contacts: 90,
        ahtSeconds: 280
      },
      {
        sourceRowIndex: 3,
        serviceDate: '2026-01-01',
        contacts: 150,
        ahtSeconds: 320
      }
    ])
  })
})
