import {
  buildPlanningGroupIntradayImportStateFromText,
  normalizePlanningGroupIntradayImportRows
} from '../groupIntradayImport'

const intervalRatios = [
  { startTime: '08:00', endTime: '08:30', label: '08:00 - 08:30', ratioPercent: 25 },
  { startTime: '08:30', endTime: '09:00', label: '08:30 - 09:00', ratioPercent: 25 },
  { startTime: '09:00', endTime: '09:30', label: '09:00 - 09:30', ratioPercent: 25 },
  { startTime: '09:30', endTime: '10:00', label: '09:30 - 10:00', ratioPercent: 25 }
]

describe('groupIntradayImport', () => {
  it('imports complete interval ratios in operating-time order', () => {
    const importState = buildPlanningGroupIntradayImportStateFromText({
      fileName: 'ratios.csv',
      text: [
        'interval_start,ratio_percent',
        '09:30,40%',
        '8:00,10',
        '09:00,30',
        '08:30,20'
      ].join('\n'),
      intervalRatios
    })

    expect(importState).toMatchObject({
      uploadedFileName: 'ratios.csv',
      importedCount: 4,
      totalRatioPercent: 100,
      isBalanced: true,
      issues: []
    })
    expect(importState.intervalRatios.map((row) => row.ratioPercent)).toEqual([10, 20, 30, 40])
    expect(importState.intervalRatios[0]).toMatchObject({
      startTime: '08:00',
      label: '08:00 - 08:30'
    })
  })

  it('rejects a file that does not cover every active interval', () => {
    const importState = buildPlanningGroupIntradayImportStateFromText({
      fileName: 'partial.csv',
      text: 'interval_start,ratio_percent\n08:00,50\n08:30,50\n',
      intervalRatios
    })

    expect(importState.issues).toContain(
      'Include every active interval. Missing 2: 09:00, 09:30.'
    )
    expect(importState.intervalRatios).toEqual(intervalRatios)
  })

  it('rejects duplicates, inactive intervals, and invalid percentages', () => {
    const normalized = normalizePlanningGroupIntradayImportRows({
      headers: ['interval_start', 'ratio_percent'],
      rows: [
        { rowIndex: 2, interval_start: '08:00', ratio_percent: '20' },
        { rowIndex: 3, interval_start: '08:00', ratio_percent: '30' },
        { rowIndex: 4, interval_start: '07:30', ratio_percent: '10' },
        { rowIndex: 5, interval_start: '08:30', ratio_percent: '101' },
        { rowIndex: 6, interval_start: '09:00', ratio_percent: 'not-a-number' },
        { rowIndex: 7, interval_start: '09:30', ratio_percent: '40' }
      ],
      intervalRatios
    })

    expect(normalized.issues).toEqual(expect.arrayContaining([
      'Row 3: 08:00 appears more than once.',
      'Row 4: 07:30 is not an active interval in the current operating window.',
      'Row 5: ratio_percent must be between 0 and 100.',
      'Row 6: enter a numeric ratio_percent.'
    ]))
    expect(normalized.intervalRatios).toEqual(intervalRatios)
  })

  it('loads a complete unbalanced profile for correction before save', () => {
    const importState = buildPlanningGroupIntradayImportStateFromText({
      fileName: 'unbalanced.csv',
      text: 'interval_start,ratio_percent\n08:00,20\n08:30,20\n09:00,20\n09:30,20\n',
      intervalRatios
    })

    expect(importState.issues).toEqual([])
    expect(importState.totalRatioPercent).toBe(80)
    expect(importState.isBalanced).toBe(false)
    expect(importState.intervalRatios.map((row) => row.ratioPercent)).toEqual([20, 20, 20, 20])
  })

  it('requires the canonical template columns', () => {
    const importState = buildPlanningGroupIntradayImportStateFromText({
      text: 'start,percent\n08:00,100\n',
      intervalRatios
    })

    expect(importState.issues).toEqual(expect.arrayContaining([
      'Add the required "interval_start" column.',
      'Add the required "ratio_percent" column.'
    ]))
  })
})

