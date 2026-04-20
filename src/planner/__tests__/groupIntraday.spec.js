import {
  createPlanningGroupIntraday,
  normalizePlanningGroupIntradayRatios,
  resolvePlanningGroupIntraday,
  summarizePlanningGroupIntraday
} from '../groupIntraday'

describe('groupIntraday', () => {
  it('builds an even 30-minute profile across the configured operating window by default', () => {
    const intraday = resolvePlanningGroupIntraday(
      {},
      {
        center: {
          operatingOpenTime: '08:00',
          operatingCloseTime: '10:00'
        }
      }
    )

    expect(intraday.intervalRatios).toEqual([
      { startTime: '08:00', endTime: '08:30', label: '08:00 - 08:30', ratioPercent: 25 },
      { startTime: '08:30', endTime: '09:00', label: '08:30 - 09:00', ratioPercent: 25 },
      { startTime: '09:00', endTime: '09:30', label: '09:00 - 09:30', ratioPercent: 25 },
      { startTime: '09:30', endTime: '10:00', label: '09:30 - 10:00', ratioPercent: 25 }
    ])
  })

  it('preserves saved ratios for matching intervals', () => {
    const intraday = resolvePlanningGroupIntraday(
      {
        intraday: {
          intervalRatios: [
            { startTime: '08:00', ratioPercent: 40 },
            { startTime: '08:30', ratioPercent: 35 },
            { startTime: '09:00', ratioPercent: 15 },
            { startTime: '09:30', ratioPercent: 10 }
          ]
        }
      },
      {
        center: {
          operatingOpenTime: '08:00',
          operatingCloseTime: '10:00'
        }
      }
    )

    expect(intraday.intervalRatios.map((row) => row.ratioPercent)).toEqual([40, 35, 15, 10])
  })

  it('normalizes ratio rows back to a 100% total', () => {
    const normalizedRows = normalizePlanningGroupIntradayRatios([
      { startTime: '08:00', ratioPercent: 50 },
      { startTime: '08:30', ratioPercent: 25 },
      { startTime: '09:00', ratioPercent: 25 },
      { startTime: '09:30', ratioPercent: 25 }
    ])

    const summary = summarizePlanningGroupIntraday({
      intervalRatios: normalizedRows
    })

    expect(summary.isBalanced).toBe(true)
    expect(summary.totalRatioPercent).toBe(100)
  })

  it('strips UI-only interval metadata when saving the intraday profile', () => {
    expect(
      createPlanningGroupIntraday({
        intervalRatios: [
          {
            startTime: '08:00',
            endTime: '08:30',
            label: '08:00 - 08:30',
            ratioPercent: 30
          }
        ]
      })
    ).toEqual({
      intervalLengthMinutes: 30,
      intervalRatios: [
        {
          startTime: '08:00',
          ratioPercent: 30
        }
      ]
    })
  })
})
