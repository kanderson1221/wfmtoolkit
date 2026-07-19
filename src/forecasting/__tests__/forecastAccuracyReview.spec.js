import { describe, expect, it } from 'vitest'

import {
  buildForecastAccuracyCsv,
  buildForecastAccuracyReview
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
  ]
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
})
