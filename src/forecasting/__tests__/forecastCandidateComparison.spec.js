import { describe, expect, it } from 'vitest'

import {
  buildForecastCandidateComparison,
  getComparableForecastCandidates,
  getForecastCandidateEligibility
} from '../forecastCandidateComparison'
import { createForecastProject } from '../shared'

const buildCandidate = (overrides = {}) => createForecastProject({
  id: overrides.id || 'forecast-a',
  name: overrides.name || 'Forecast A',
  sourceKind: overrides.sourceKind || 'modeled_daily',
  modelConfig: {
    growth: 'linear',
    seasonalityMode: 'additive',
    weeklySeasonalityEnabled: true,
    yearlySeasonalityEnabled: true,
    monthlySeasonalityEnabled: false,
    builtInHolidayCountry: 'US',
    changepointPriorScale: 0.05,
    intervalWidth: 0.8,
    ...(overrides.modelConfig || {})
  },
  lastRun: {
    runAt: '2026-07-19T12:00:00.000Z',
    diagnostics: {
      holdout: {
        testRows: 2,
        trainingDateRange: '2025-01-01 to 2025-12-31',
        testDateRange: '2026-01-01 to 2026-01-02',
        wape: 8.4,
        mae: 42,
        bias: -12,
        intervalCoverage: 80,
        intervalWidthPercent: 80,
        benchmark: { wape: 11.9 },
        rows: [
          { ds: '2026-01-01', actualValue: 500 },
          { ds: '2026-01-02', actualValue: 520 }
        ],
        ...(overrides.holdout || {})
      }
    }
  }
})

describe('saved forecast candidate comparison', () => {
  it('requires a saved modeled run with complete scored holdout actuals', () => {
    expect(getForecastCandidateEligibility(buildCandidate())).toEqual({ eligible: true, reason: '' })
    expect(getForecastCandidateEligibility(buildCandidate({
      id: 'imported',
      sourceKind: 'imported_daily'
    }))).toEqual(expect.objectContaining({ eligible: false }))

    const noHoldout = buildCandidate()
    noHoldout.lastRun.diagnostics.holdout = null
    expect(getForecastCandidateEligibility(noHoldout).reason).toContain('scored holdout')
    expect(getComparableForecastCandidates([buildCandidate(), noHoldout])).toHaveLength(1)
  })

  it('compares metrics and configuration deltas only on identical dated actuals', () => {
    const reference = buildCandidate()
    const candidate = buildCandidate({
      id: 'forecast-b',
      name: 'Forecast B',
      modelConfig: {
        growth: 'flat',
        intervalWidth: 0.9
      },
      holdout: {
        wape: 6.1,
        mae: 31,
        bias: 8,
        intervalCoverage: 90,
        intervalWidthPercent: 90,
        benchmark: { wape: 11.9 }
      }
    })

    const comparison = buildForecastCandidateComparison(reference, candidate)

    expect(comparison.status).toBe('comparable')
    expect(comparison.summary).toContain('Forecast B has 2.3 percentage points lower WAPE')
    expect(comparison.metricRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'wape', referenceValue: 8.4, candidateValue: 6.1, delta: -2.3 }),
      expect.objectContaining({ id: 'bias', referenceValue: -12, candidateValue: 8, delta: 20 })
    ]))
    expect(comparison.settingRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'growth', referenceValue: 'Linear', candidateValue: 'Flat', changed: true }),
      expect.objectContaining({ id: 'intervalWidth', referenceValue: '80%', candidateValue: '90%', changed: true })
    ]))
    expect(comparison.decisionNote).not.toContain('accepted')
  })

  it('withholds metrics when dates or actual contacts differ', () => {
    const reference = buildCandidate()
    const differentActuals = buildCandidate({
      id: 'forecast-b',
      holdout: {
        rows: [
          { ds: '2026-01-01', actualValue: 500 },
          { ds: '2026-01-02', actualValue: 521 }
        ]
      }
    })

    expect(buildForecastCandidateComparison(reference, differentActuals)).toEqual({
      status: 'incompatible',
      message: 'These forecasts were not scored against the same dated actual contacts. Rerun both with the same history and holdout window before comparing their metrics.'
    })
    expect(buildForecastCandidateComparison(reference, reference).status).toBe('same-candidate')
  })
})
