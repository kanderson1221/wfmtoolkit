import {
  buildPlanningGroupIntradayIntervals,
  createPlanningGroupIntraday,
  normalizePlanningGroupIntradayRatios,
  resolvePlanningGroupIntraday,
  summarizePlanningGroupIntraday
} from '../groupIntraday'
import {
  OPERATING_SCHEDULE_ALWAYS_OPEN,
  OPERATING_SCHEDULE_CONFIGURED_HOURS
} from '../operatingSchedule'

describe('groupIntraday', () => {
  it('builds exactly 48 unique intervals for an explicit always-open schedule', () => {
    const intervals = buildPlanningGroupIntradayIntervals(
      '',
      '',
      30,
      OPERATING_SCHEDULE_ALWAYS_OPEN
    )

    expect(intervals).toHaveLength(48)
    expect(new Set(intervals.map((row) => row.startTime)).size).toBe(48)
    expect(intervals[0].label).toBe('00:00 - 00:30')
    expect(intervals.at(-1).label).toBe('23:30 - 00:00')
  })

  it('rejects missing, equal, overnight, and interval-misaligned configured windows', () => {
    expect(buildPlanningGroupIntradayIntervals('', '', 30, OPERATING_SCHEDULE_CONFIGURED_HOURS)).toEqual([])
    expect(buildPlanningGroupIntradayIntervals('00:00', '00:00', 30, OPERATING_SCHEDULE_CONFIGURED_HOURS)).toEqual([])
    expect(buildPlanningGroupIntradayIntervals('22:00', '06:00', 30, OPERATING_SCHEDULE_CONFIGURED_HOURS)).toEqual([])
    expect(buildPlanningGroupIntradayIntervals('00:00', '23:59', 30, OPERATING_SCHEDULE_CONFIGURED_HOURS)).toEqual([])
  })

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
