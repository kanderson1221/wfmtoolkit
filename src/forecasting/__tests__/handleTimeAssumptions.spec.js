import {
  buildForecastMonthlyHandleTimeAssumptions,
  formatForecastAhtSeconds,
  summarizeForecastAhtTrainingData
} from '../handleTimeAssumptions'
import { createForecastProject } from '../shared'

describe('handleTimeAssumptions', () => {
  it('blends recent and same-month history into monthly AHT assumptions', () => {
    const project = createForecastProject({
      planningYear: 2025,
      historyRows: [
        { ds: '2023-01-05', y: 100, cap: null, floor: null },
        { ds: '2024-01-05', y: 100, cap: null, floor: null },
        { ds: '2024-10-05', y: 100, cap: null, floor: null },
        { ds: '2024-11-05', y: 100, cap: null, floor: null },
        { ds: '2024-12-05', y: 100, cap: null, floor: null }
      ],
      ahtHistoryRows: [
        { ds: '2023-01-05', contacts: 100, ahtSeconds: 300 },
        { ds: '2024-01-05', contacts: 100, ahtSeconds: 320 },
        { ds: '2024-10-05', contacts: 100, ahtSeconds: 350 },
        { ds: '2024-11-05', contacts: 100, ahtSeconds: 360 },
        { ds: '2024-12-05', contacts: 100, ahtSeconds: 370 }
      ],
      lastRun: {
        runAt: '2026-04-19T12:00:00.000Z',
        monthlyRollup: [
          { monthStart: '2025-01-01', monthLabel: 'Jan 2025', contacts: 10000 },
          { monthStart: '2025-02-01', monthLabel: 'Feb 2025', contacts: 10500 }
        ]
      },
      modelConfig: {
        trainingStartDate: '2023-01-01',
        trainingEndDate: '2024-12-31',
        ahtAssumptionMethod: 'blend_recent_seasonal',
        ahtRecentMonthsWindow: 3
      }
    })

    expect(buildForecastMonthlyHandleTimeAssumptions(project)).toEqual([
      expect.objectContaining({
        monthStart: '2025-01-01',
        assumedAhtSeconds: 335
      }),
      expect.objectContaining({
        monthStart: '2025-02-01',
        assumedAhtSeconds: 360
      })
    ])
  })

  it('applies month-level AHT overrides on top of the suggested assumptions', () => {
    const project = createForecastProject({
      planningYear: 2025,
      historyRows: [
        { ds: '2024-10-05', y: 100, cap: null, floor: null },
        { ds: '2024-11-05', y: 100, cap: null, floor: null },
        { ds: '2024-12-05', y: 100, cap: null, floor: null }
      ],
      ahtHistoryRows: [
        { ds: '2024-10-05', contacts: 100, ahtSeconds: 350 },
        { ds: '2024-11-05', contacts: 100, ahtSeconds: 360 },
        { ds: '2024-12-05', contacts: 100, ahtSeconds: 370 }
      ],
      lastRun: {
        runAt: '2026-04-19T12:00:00.000Z',
        monthlyRollup: [
          { monthStart: '2025-01-01', monthLabel: 'Jan 2025', contacts: 10000 },
          { monthStart: '2025-02-01', monthLabel: 'Feb 2025', contacts: 10500 }
        ]
      },
      modelConfig: {
        ahtAssumptionMethod: 'weighted_average',
        ahtMonthOverrides: [
          { monthStart: '2025-02-01', ahtSeconds: 415 }
        ]
      }
    })

    expect(buildForecastMonthlyHandleTimeAssumptions(project)).toEqual([
      expect.objectContaining({
        monthStart: '2025-01-01',
        suggestedAhtSeconds: 360,
        overrideAhtSeconds: null,
        assumedAhtSeconds: 360
      }),
      expect.objectContaining({
        monthStart: '2025-02-01',
        suggestedAhtSeconds: 360,
        overrideAhtSeconds: 415,
        assumedAhtSeconds: 415
      })
    ])
  })

  it('summarizes available and in-window AHT training history separately', () => {
    const project = createForecastProject({
      historyRows: [
        { ds: '2024-01-01', y: 100, cap: null, floor: null },
        { ds: '2024-01-02', y: 120, cap: null, floor: null },
        { ds: '2024-01-03', y: 140, cap: null, floor: null }
      ],
      ahtHistoryRows: [
        { ds: '2024-01-01', contacts: 100, ahtSeconds: 300 },
        { ds: '2024-01-02', contacts: 120, ahtSeconds: 330 },
        { ds: '2024-01-03', contacts: 140, ahtSeconds: 360 }
      ],
      modelConfig: {
        trainingStartDate: '2024-01-02',
        trainingEndDate: '2024-01-03'
      }
    })

    expect(summarizeForecastAhtTrainingData(project)).toMatchObject({
      availableRowCount: 3,
      trainingRowCount: 2,
      monthlyHistoryCount: 1
    })
  })

  it('renders missing AHT values as an em dash instead of zero', () => {
    expect(formatForecastAhtSeconds(null)).toBe('—')
    expect(formatForecastAhtSeconds('')).toBe('—')
  })
})
