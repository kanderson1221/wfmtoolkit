import { describe, expect, it } from 'vitest'

import { buildCsv, formatCsvNumber, sanitizeFileNamePart } from '../csvExport'

describe('csvExport', () => {
  it('escapes spreadsheet text and preserves missing values as blank cells', () => {
    const csv = buildCsv(
      [
        { header: 'name', value: (row) => row.name },
        { header: 'value', value: (row) => row.value }
      ],
      [
        { name: 'Voice, "Priority"', value: null },
        { name: 'Back Office', value: 0 }
      ]
    )

    expect(csv).toBe('name,value\r\n"Voice, ""Priority""",\r\nBack Office,0')
  })

  it('formats finite numbers and safe filename parts consistently', () => {
    expect(formatCsvNumber(10.12345678, 6)).toBe('10.123457')
    expect(formatCsvNumber(null, 6)).toBe('')
    expect(formatCsvNumber(Number.NaN, 6)).toBe('')
    expect(sanitizeFileNamePart(' Consumer Voice / 2027 ')).toBe('consumer-voice-2027')
    expect(sanitizeFileNamePart('', 'portfolio')).toBe('portfolio')
  })
})
