import {
  buildPlanningGroupMonthlyActualRecords,
  clearPlanningGroupActualsData,
  createPlanningGroupActuals,
  deletePlanningGroupActualsByMonth,
  deletePlanningGroupActualsByYear,
  mergePlanningGroupActuals,
  resolvePlanningGroupActuals,
  summarizePlanningGroupActuals
} from '../groupActuals'
import { summarizePlanningGroupActualsDataset } from '../groupActualsDataSummary'

describe('groupActuals', () => {
  it('builds a descending monthly rollup across the full actuals history', () => {
    const records = buildPlanningGroupMonthlyActualRecords([
      { serviceDate: '2026-01-02', contacts: 100, ahtSeconds: 300 },
      { serviceDate: '2026-01-03', contacts: 50, ahtSeconds: 360 },
      { serviceDate: '2025-12-01', contacts: 40, ahtSeconds: 240 }
    ])

    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      label: 'Jan 2026',
      daysLoaded: 2,
      actualContacts: 150
    })
    expect(records[0].actualAhtSeconds).toBeCloseTo(320, 5)
    expect(records[1]).toMatchObject({
      label: 'Dec 2025',
      daysLoaded: 1,
      actualContacts: 40,
      actualAhtSeconds: 240
    })
  })

  it('merges imported rows into shared history by service date', () => {
    const mergedActuals = mergePlanningGroupActuals(
      createPlanningGroupActuals({
        dailyRows: [
          { serviceDate: '2026-01-01', contacts: 100, ahtSeconds: 300 },
          { serviceDate: '2026-01-02', contacts: 90, ahtSeconds: 280 }
        ],
        uploadedFileName: 'existing.csv'
      }),
      {
        dailyRows: [
          { serviceDate: '2026-01-02', contacts: 120, ahtSeconds: 315 },
          { serviceDate: '2026-02-01', contacts: 80, ahtSeconds: 260 }
        ],
        uploadedFileName: 'import.csv'
      }
    )

    expect(mergedActuals.uploadedFileName).toBe('import.csv')
    expect(mergedActuals.dailyRows).toEqual([
      { serviceDate: '2026-01-01', contacts: 100, ahtSeconds: 300 },
      { serviceDate: '2026-01-02', contacts: 120, ahtSeconds: 315 },
      { serviceDate: '2026-02-01', contacts: 80, ahtSeconds: 260 }
    ])
  })

  it('deletes scoped year and month data without disturbing other rows', () => {
    const actuals = createPlanningGroupActuals({
      uploadedFileName: 'actuals.csv',
      uploadedHeaders: ['service_date'],
      dailyRows: [
        { serviceDate: '2025-12-31', contacts: 40, ahtSeconds: 240 },
        { serviceDate: '2026-01-02', contacts: 100, ahtSeconds: 300 },
        { serviceDate: '2026-02-01', contacts: 80, ahtSeconds: 260 }
      ]
    })

    expect(deletePlanningGroupActualsByMonth(actuals, '2026-01-01')).toMatchObject({
      uploadedFileName: '',
      uploadedHeaders: [],
      dailyRows: [
        { serviceDate: '2025-12-31', contacts: 40, ahtSeconds: 240 },
        { serviceDate: '2026-02-01', contacts: 80, ahtSeconds: 260 }
      ]
    })

    expect(deletePlanningGroupActualsByYear(actuals, 2026)).toMatchObject({
      uploadedFileName: '',
      uploadedHeaders: [],
      dailyRows: [
        { serviceDate: '2025-12-31', contacts: 40, ahtSeconds: 240 }
      ]
    })
  })

  it('can clear all stored actuals rows while preserving the actuals shape', () => {
    const actuals = createPlanningGroupActuals({
      uploadedFileName: 'actuals.csv',
      dailyRows: [{ serviceDate: '2026-01-02', contacts: 100, ahtSeconds: 300 }]
    })

    expect(clearPlanningGroupActualsData(actuals)).toMatchObject({
      sourceMode: 'daily_upload',
      uploadedFileName: '',
      uploadedHeaders: [],
      dailyRows: []
    })
  })

  it('summarizes and migrates legacy year-bucketed actuals into one history', () => {
    const resolvedActuals = resolvePlanningGroupActuals({
      actualsYears: [
        {
          year: 2025,
          sourceMode: 'daily_upload',
          dailyRows: [
            { serviceDate: '2025-12-31', contacts: 90, ahtSeconds: 280 }
          ]
        },
        {
          year: 2026,
          sourceMode: 'daily_upload',
          dailyRows: [
            { serviceDate: '2026-01-01', contacts: 110, ahtSeconds: 300 }
          ],
          uploadedFileName: 'latest.csv'
        }
      ]
    })
    const summary = summarizePlanningGroupActuals(resolvedActuals)

    expect(resolvedActuals.uploadedFileName).toBe('latest.csv')
    expect(resolvedActuals.dailyRows).toEqual([
      { serviceDate: '2025-12-31', contacts: 90, ahtSeconds: 280 },
      { serviceDate: '2026-01-01', contacts: 110, ahtSeconds: 300 }
    ])
    expect(summary.loadedDaysCount).toBe(2)
    expect(summary.loadedMonthsCount).toBe(2)
    expect(summary.coveredYearCount).toBe(2)
    expect(summary.latestServiceDate).toBe('2026-01-01')
  })

  it('scores loaded months against every expected open date in the calendar month', () => {
    const summary = summarizePlanningGroupActualsDataset({
      actuals: {
        dailyRows: [
          { serviceDate: '2026-01-05', contacts: 100, ahtSeconds: 300 },
          { serviceDate: '2026-01-06', contacts: 120, ahtSeconds: 315 },
          { serviceDate: '2026-02-02', contacts: 90, ahtSeconds: 285 }
        ]
      },
      group: {
        operatingWeekdays: [1, 2, 3, 4, 5],
        holidayCalendarId: 'inherit'
      },
      center: {
        holidayProfiles: [
          {
            year: 2026,
            holidayCalendarId: 'none'
          }
        ]
      }
    })

    expect(summary.annualRows).toMatchObject([
      {
        year: '2026',
        minServiceDate: '2026-01-05',
        maxServiceDate: '2026-02-02',
        contacts: 310,
        loadedOpenDays: 3,
        expectedOpenDays: 42,
        coveragePercent: (3 / 42) * 100,
        months: [
          {
            monthLabel: 'Feb 2026',
            minServiceDate: '2026-02-02',
            maxServiceDate: '2026-02-02',
            loadedOpenDays: 1,
            expectedOpenDays: 20,
            coveragePercent: 5,
            missingOpenDates: expect.arrayContaining([
              '2026-02-03',
              '2026-02-27'
            ])
          },
          {
            monthLabel: 'Jan 2026',
            minServiceDate: '2026-01-05',
            maxServiceDate: '2026-01-06',
            loadedOpenDays: 2,
            expectedOpenDays: 22,
            coveragePercent: (2 / 22) * 100,
            missingOpenDates: expect.arrayContaining([
              '2026-01-01',
              '2026-01-30'
            ])
          }
        ]
      }
    ])

    expect(summary.annualRows[0].missingOpenDates).toHaveLength(39)
    expect(summary.annualRows[0].months[0].missingOpenDates).toHaveLength(19)
    expect(summary.annualRows[0].months[1].missingOpenDates).toHaveLength(20)
  })

  it('excludes configured closed holidays from completeness coverage', () => {
    const summary = summarizePlanningGroupActualsDataset({
      actuals: {
        dailyRows: [
          { serviceDate: '2026-01-01', contacts: 100, ahtSeconds: 300 },
          { serviceDate: '2026-01-02', contacts: 120, ahtSeconds: 315 }
        ]
      },
      group: {
        operatingWeekdays: [1, 2, 3, 4, 5],
        holidayCalendarId: 'inherit'
      },
      center: {
        holidayProfiles: [
          {
            year: 2026,
            holidayCalendarId: 'us_federal'
          }
        ]
      }
    })

    expect(summary.annualRows).toMatchObject([
      {
        year: '2026',
        minServiceDate: '2026-01-01',
        maxServiceDate: '2026-01-02',
        loadedOpenDays: 1,
        expectedOpenDays: 20,
        coveragePercent: 5,
        months: [
          {
            monthLabel: 'Jan 2026',
            minServiceDate: '2026-01-01',
            maxServiceDate: '2026-01-02',
            loadedOpenDays: 1,
            expectedOpenDays: 20,
            coveragePercent: 5,
            missingOpenDates: expect.not.arrayContaining(['2026-01-01'])
          }
        ]
      }
    ])

    expect(summary.annualRows[0].months[0].missingOpenDates).toHaveLength(19)
  })

  it('shows partial coverage when open days are missing anywhere in a loaded month', () => {
    const summary = summarizePlanningGroupActualsDataset({
      actuals: {
        dailyRows: [
          { serviceDate: '2026-02-02', contacts: 100, ahtSeconds: 300 },
          { serviceDate: '2026-02-03', contacts: 120, ahtSeconds: 315 },
          { serviceDate: '2026-02-05', contacts: 90, ahtSeconds: 285 },
          { serviceDate: '2026-02-06', contacts: 95, ahtSeconds: 295 }
        ]
      },
      group: {
        operatingWeekdays: [1, 2, 3, 4, 5],
        holidayCalendarId: 'inherit'
      },
      center: {
        holidayProfiles: [
          {
            year: 2026,
            holidayCalendarId: 'none'
          }
        ]
      }
    })

    expect(summary.annualRows).toMatchObject([
      {
        year: '2026',
        minServiceDate: '2026-02-02',
        maxServiceDate: '2026-02-06',
        loadedOpenDays: 4,
        expectedOpenDays: 20,
        coveragePercent: 20,
        months: [
          {
            monthLabel: 'Feb 2026',
            minServiceDate: '2026-02-02',
            maxServiceDate: '2026-02-06',
            loadedOpenDays: 4,
            expectedOpenDays: 20,
            coveragePercent: 20,
            missingOpenDates: expect.arrayContaining([
              '2026-02-04',
              '2026-02-27'
            ])
          }
        ]
      }
    ])

    expect(summary.annualRows[0].months[0].missingOpenDates).toHaveLength(16)
  })

  it('marks a month complete when every expected open date is loaded', () => {
    const summary = summarizePlanningGroupActualsDataset({
      actuals: {
        dailyRows: [
          { serviceDate: '2026-01-01', contacts: 100, ahtSeconds: 300 },
          { serviceDate: '2026-01-08', contacts: 110, ahtSeconds: 305 },
          { serviceDate: '2026-01-15', contacts: 120, ahtSeconds: 310 },
          { serviceDate: '2026-01-22', contacts: 130, ahtSeconds: 315 },
          { serviceDate: '2026-01-29', contacts: 140, ahtSeconds: 320 }
        ]
      },
      group: {
        operatingWeekdays: [4],
        holidayCalendarId: 'none'
      },
      center: {}
    })

    expect(summary.annualRows[0].months[0]).toMatchObject({
      loadedOpenDays: 5,
      expectedOpenDays: 5,
      coveragePercent: 100,
      missingOpenDates: []
    })
  })
})
