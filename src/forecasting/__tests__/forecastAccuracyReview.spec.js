import { describe, expect, it } from 'vitest'

import {
  buildForecastAccuracyCsv,
  buildForecastAccuracyReview,
  buildForecastRollingOriginCsv
} from '../forecastAccuracyReview'

const holdout = {
  testRows: 2,
  testDateRange: '2026-01-01 to 2026-01-02',
  trainingDateRange: '2025-01-01 to 2025-12-31',
  wape: 8.4,
  mae: 42,
  bias: -12,
  intervalCoverage: 80,
  intervalWidthPercent: 80,
  meanActual: 500,
  benchmark: {
    id: 'weekday_average_8',
    label: '8-week weekday average',
    wape: 11.9,
    mae: 59.5,
    bias: 20
  },
  comparison: {
    lowerWape: 'model',
    wapeDeltaPoints: -3.5
  },
  rows: [
    {
      ds: '2026-01-01',
      actualValue: 500,
      forecastValue: 480,
      lowerBound: 450,
      upperBound: 520,
      absoluteError: 20,
      signedError: -20,
      percentError: 4,
      withinInterval: true,
      benchmarkValue: 460,
      benchmarkAbsoluteError: 40,
      benchmarkSignedError: -40
    }
  ],
  rollingOrigin: {
    maxFolds: 3,
    foldCount: 3,
    holdoutDaysPerFold: 2,
    totalTestRows: 6,
    folds: [
      {
        foldNumber: 1,
        trainingRows: 365,
        trainingDateRange: '2024-01-01 to 2024-12-31',
        testRows: 2,
        testDateRange: '2025-01-01 to 2025-01-02',
        wape: 10.2,
        mae: 51,
        bias: -18,
        intervalCoverage: 75,
        benchmarkWape: 12.4,
        benchmarkMae: 62,
        benchmarkBias: 20,
        lowerWape: 'model'
      },
      {
        foldNumber: 2,
        trainingRows: 367,
        trainingDateRange: '2024-01-01 to 2025-01-02',
        testRows: 2,
        testDateRange: '2025-01-03 to 2025-01-04',
        wape: 13.1,
        mae: 65.5,
        bias: 25,
        intervalCoverage: 50,
        benchmarkWape: 11,
        benchmarkMae: 55,
        benchmarkBias: 12,
        lowerWape: 'benchmark'
      },
      {
        foldNumber: 3,
        trainingRows: 369,
        trainingDateRange: '2024-01-01 to 2025-01-04',
        testRows: 2,
        testDateRange: '2025-01-05 to 2025-01-06',
        wape: 8.4,
        mae: 42,
        bias: -12,
        intervalCoverage: 80,
        benchmarkWape: 11.9,
        benchmarkMae: 59.5,
        benchmarkBias: 20,
        lowerWape: 'model'
      }
    ]
  }
}

describe('forecast accuracy review', () => {
  it('compares model evidence to the weekday benchmark without declaring acceptance', () => {
    const review = buildForecastAccuracyReview(holdout)

    expect(review.summary).toBe(
      'The modeled forecast has 3.5 percentage points lower WAPE than the weekday baseline on this test period.'
    )
    expect(review.metricRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'wape', modelValue: 8.4, benchmarkValue: 11.9 }),
      expect.objectContaining({
        id: 'intervalCoverage',
        modelValue: 80,
        benchmarkValue: null,
        interpretation: 'Share of actual days inside the configured 80% modeled prediction interval.'
      })
    ]))
    expect(review.summary).not.toContain('accept')
  })

  it('keeps WAPE unavailable when actual test volume is zero', () => {
    const review = buildForecastAccuracyReview({
      ...holdout,
      wape: null,
      benchmark: { ...holdout.benchmark, wape: null },
      comparison: { lowerWape: 'unavailable', wapeDeltaPoints: null }
    })

    expect(review.summary).toContain('WAPE is unavailable')
    expect(review.metricRows.find((row) => row.id === 'wape')).toEqual(
      expect.objectContaining({ modelValue: null, benchmarkValue: null })
    )
  })

  it('exports all scored-day evidence with explicit model and benchmark columns', () => {
    const csv = buildForecastAccuracyCsv(holdout)

    expect(csv).toContain('actual_contacts,modeled_contacts')
    expect(csv).toContain('modeled_interval_width_percent,benchmark_method,benchmark_contacts')
    expect(csv).toContain('2026-01-01,500,480,450,520,20,-20,4,yes,80,8-week weekday average,460,40,-40')
  })

  it('summarizes non-overlapping rolling origins without inventing acceptance', () => {
    const stability = buildForecastAccuracyReview(holdout).rollingOrigin

    expect(stability.summary).toContain('lower WAPE than the weekday baseline in 2 of 3 comparable windows')
    expect(stability.summary).toContain('8.4% to 13.1%')
    expect(stability.folds.at(-1)).toEqual(expect.objectContaining({
      label: 'Current window',
      trainingThrough: '2025-01-04'
    }))
    expect(stability.methodNote).toContain('not an automatic acceptance decision')
  })

  it('exports one reconciled row per rolling-origin window', () => {
    const stability = buildForecastAccuracyReview(holdout).rollingOrigin
    const csv = buildForecastRollingOriginCsv(stability)

    expect(csv).toContain('training_date_range,test_date_range,test_days')
    expect(csv).toContain('Earlier window 1,2024-01-01 to 2024-12-31,2025-01-01 to 2025-01-02,2,10.2,12.4')
    expect(csv).toContain('Current window,2024-01-01 to 2025-01-04,2025-01-05 to 2025-01-06,2,8.4,11.9')
  })

  it('explains when history supports only one cutoff', () => {
    const review = buildForecastAccuracyReview({
      ...holdout,
      rollingOrigin: {
        ...holdout.rollingOrigin,
        foldCount: 1,
        folds: [holdout.rollingOrigin.folds.at(-1)]
      }
    })

    expect(review.rollingOrigin.summary).toContain('Only one 2-day test window')
    expect(review.rollingOrigin.summary).toContain('Load at least 2 additional earlier daily observations')
  })
})
