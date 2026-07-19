import {
  buildForecastAhtAccuracyCsv,
  buildForecastAhtAccuracyReview
} from '../forecastAhtAccuracyReview'
import {
  buildForecastMonthlyAhtHistory,
  summarizeForecastAhtTrainingData
} from '../handleTimeAssumptions'
import { createForecastProject } from '../shared'

const trainingRows = [
  ['2024-01-02', 300],
  ['2024-01-03', 320],
  ['2024-10-01', 360],
  ['2024-10-02', 360],
  ['2024-10-03', 360],
  ['2024-10-04', 360],
  ['2024-11-01', 370],
  ['2024-11-02', 370],
  ['2024-11-03', 370],
  ['2024-11-04', 370],
  ['2024-12-01', 380],
  ['2024-12-02', 380],
  ['2024-12-03', 380],
  ['2024-12-04', 380]
]

const holdoutRows = [
  ['2025-01-02', 342],
  ['2025-01-03', 338],
  ['2025-01-04', 340]
]

const buildProject = (ahtRows = [...trainingRows, ...holdoutRows]) => createForecastProject({
  name: 'Voice AHT 2025',
  historyRows: [...trainingRows, ...holdoutRows].map(([ds]) => ({ ds, y: 100 })),
  ahtHistoryRows: ahtRows.map(([ds, ahtSeconds]) => ({ ds, contacts: 100, ahtSeconds })),
  modelConfig: {
    holdoutDays: 3,
    ahtAssumptionMethod: 'blend_recent_seasonal',
    ahtRecentMonthsWindow: 3
  },
  lastRun: {
    runAt: '2025-01-05T12:00:00.000Z',
    monthlyRollup: [{ monthStart: '2025-02-01', monthLabel: 'Feb 2025', contacts: 10000 }]
  }
})

describe('forecastAhtAccuracyReview', () => {
  it('excludes contact holdout dates from AHT training assumptions', () => {
    const project = buildProject()

    expect(summarizeForecastAhtTrainingData(project).trainingRowCount).toBe(14)
    expect(buildForecastMonthlyAhtHistory(project).flatMap((row) => row.monthStart)).not.toContain('2025-01-01')
  })

  it('compares the configured method with a training-only weighted benchmark', () => {
    const review = buildForecastAhtAccuracyReview(buildProject())

    expect(review).toMatchObject({
      testRows: 3,
      scoredRows: 3,
      candidateLabel: 'Blend Recent + Seasonal',
      benchmarkLabel: 'Training weighted average'
    })
    expect(review.rows[0]).toMatchObject({
      actualAhtSeconds: 342,
      candidateAhtSeconds: 340
    })
    expect(review.metricRows.find((row) => row.id === 'workloadErrorPercent').candidateValue).toBeCloseTo(0.392, 3)
    expect(review.summary).toContain('lower workload error')
  })

  it('discloses incomplete AHT holdout coverage and exports only scored days', () => {
    const review = buildForecastAhtAccuracyReview(buildProject([
      ...trainingRows,
      holdoutRows[0],
      holdoutRows[2]
    ]))
    const csv = buildForecastAhtAccuracyCsv(review)

    expect(review.scoredRows).toBe(2)
    expect(csv).toContain('actual_aht_seconds')
    expect(csv).toContain('2025-01-02,100,342')
    expect(csv).not.toContain('2025-01-03')
  })

  it('does not present zero-contact holdout AHT as perfect accuracy', () => {
    const project = buildProject()
    project.ahtHistoryRows = project.ahtHistoryRows.map((row) => (
      row.ds >= '2025-01-02' ? { ...row, contacts: 0 } : row
    ))

    const review = buildForecastAhtAccuracyReview(project)

    expect(review.scoredRows).toBe(0)
    expect(review.summary).toContain('evidence is unavailable')
    expect(review.metricRows.every((row) => row.candidateValue == null)).toBe(true)
  })
})
