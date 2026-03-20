import { upsertPlanningPlan } from '../planningStorage'

describe('planningStorage', () => {
  it('does not overwrite an existing plan when a new plan targets the same year', () => {
    const centers = [
      {
        id: 'center-1',
        name: 'North America Operations',
        timezone: 'America/New_York',
        operatingWeekdays: [1, 2, 3, 4, 5],
        defaultPaidHoursPerDay: 8,
        defaultOccupancyPercent: 90,
        defaultAdherencePercent: 95,
        groups: [
          {
            id: 'group-1',
            name: 'Consumer Voice',
            plans: [
              {
                id: 'plan-1',
                name: '2026 Operating Plan',
                planningYear: 2026,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
              }
            ]
          }
        ]
      }
    ]

    const nextCenters = upsertPlanningPlan(centers, 'center-1', 'group-1', {
      name: '2026 Updated Plan',
      planningYear: 2026
    })

    const nextPlans = nextCenters[0].groups[0].plans

    expect(nextPlans).toHaveLength(1)
    expect(nextPlans[0]).toMatchObject({
      id: 'plan-1',
      name: '2026 Operating Plan',
      planningYear: 2026
    })
  })

  it('updates the existing plan when the same plan id is saved', () => {
    const centers = [
      {
        id: 'center-1',
        name: 'North America Operations',
        timezone: 'America/New_York',
        operatingWeekdays: [1, 2, 3, 4, 5],
        defaultPaidHoursPerDay: 8,
        defaultOccupancyPercent: 90,
        defaultAdherencePercent: 95,
        groups: [
          {
            id: 'group-1',
            name: 'Consumer Voice',
            plans: [
              {
                id: 'plan-1',
                name: '2026 Operating Plan',
                planningYear: 2026,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
              }
            ]
          }
        ]
      }
    ]

    const nextCenters = upsertPlanningPlan(centers, 'center-1', 'group-1', {
      id: 'plan-1',
      name: '2026 Updated Plan',
      planningYear: 2026
    })

    const nextPlans = nextCenters[0].groups[0].plans

    expect(nextPlans).toHaveLength(1)
    expect(nextPlans[0]).toMatchObject({
      id: 'plan-1',
      name: '2026 Plan',
      planningYear: 2026
    })
  })
})
