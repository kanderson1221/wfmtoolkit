import {
  buildPlannerSeedDefaults,
  resolvePlannerInitialState
} from '../shared'

describe('monthly planner FTE capacity defaults and migration', () => {
  it('creates new plans with monthly FTE hours independent from seven-day center operations', () => {
    const defaults = buildPlannerSeedDefaults({
      planningYear: 2026,
      operatingWeekdays: [0, 1, 2, 3, 4, 5, 6],
      defaultPaidHoursPerDay: 8
    })

    expect(defaults.presenceMonths).toHaveLength(12)
    expect(defaults.presenceMonths.every((month) => month.monthlyPaidHoursPerFte === 173.33)).toBe(true)
  })

  it('migrates legacy saved plans to their prior open-days-based monthly capacity', () => {
    const state = resolvePlannerInitialState({
      sourcePlan: {
        planningYear: 2026,
        operatingWeekdays: [0, 1, 2, 3, 4, 5, 6],
        presenceMonths: Array.from({ length: 12 }, () => ({ paidHoursPerDay: 8 }))
      },
      centerDefaults: {
        planningYear: 2026,
        operatingWeekdays: [0, 1, 2, 3, 4, 5, 6],
        defaultPaidHoursPerDay: 8
      }
    })

    expect(state.presenceMonths[0].monthlyPaidHoursPerFte).toBe(248)
    expect(state.presenceMonths[1].monthlyPaidHoursPerFte).toBe(224)
  })

  it('preserves explicitly saved monthly FTE hours', () => {
    const state = resolvePlannerInitialState({
      sourcePlan: {
        planningYear: 2026,
        operatingWeekdays: [0, 1, 2, 3, 4, 5, 6],
        presenceMonths: Array.from({ length: 12 }, () => ({
          paidHoursPerDay: 8,
          monthlyPaidHoursPerFte: 176
        }))
      }
    })

    expect(state.presenceMonths.every((month) => month.monthlyPaidHoursPerFte === 176)).toBe(true)
  })

  it('inherits email context and forces workload-ratio planning', () => {
    const state = resolvePlannerInitialState({
      sourcePlan: {
        planningYear: 2027,
        channelType: 'email',
        serviceGoal: { targetPercent: 95, threshold: 8 },
        requirementMethod: 'intraday_erlang'
      }
    })

    expect(state.channelType).toBe('email')
    expect(state.serviceGoal).toEqual({
      targetPercent: 95,
      threshold: 8,
      thresholdUnit: 'business_hours'
    })
    expect(state.requirementMethod).toBe('workload_ratio')
  })
})
