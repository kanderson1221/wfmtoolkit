import { loadPlanningCenters, upsertPlanningPlan } from '../planningStorage'

const ensurePlanningStorageApi = () => {
  const storage = window.localStorage

  if (
    typeof storage?.getItem === 'function' &&
    typeof storage?.setItem === 'function' &&
    typeof storage?.removeItem === 'function'
  ) {
    return storage
  }

  const backingStore = {}
  const mockStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(backingStore, key) ? backingStore[key] : null
    },
    setItem(key, value) {
      backingStore[key] = String(value)
    },
    removeItem(key) {
      delete backingStore[key]
    },
    clear() {
      Object.keys(backingStore).forEach((key) => {
        delete backingStore[key]
      })
    }
  }

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    configurable: true
  })

  return mockStorage
}

const clearPlanningStorage = () => {
  const storage = ensurePlanningStorageApi()

  if (typeof storage?.clear === 'function') {
    storage.clear()
    return
  }

  if (storage && typeof storage === 'object') {
    Object.keys(storage).forEach((key) => {
      delete storage[key]
    })
  }
}

describe('planningStorage', () => {
  beforeEach(() => {
    clearPlanningStorage()
  })

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

  it('migrates legacy federal template centers to manual holiday rows', () => {
    ensurePlanningStorageApi().setItem(
      'wfmtoolkit.callCenters.v1.default',
      JSON.stringify([
        {
          id: 'center-1',
          name: 'North America Operations',
          defaultHolidayCalendarId: 'us_federal',
          disabledHolidayRuleIds: ['columbus_day'],
          customHolidays: [],
          operatingWeekdays: [1, 2, 3, 4, 5],
          defaultPaidHoursPerDay: 8,
          defaultOccupancyPercent: 90,
          defaultAdherencePercent: 95,
          groups: []
        }
      ])
    )

    const centers = loadPlanningCenters('default')

    expect(centers[0].defaultHolidayCalendarId).toBe('none')
    expect(centers[0].disabledHolidayRuleIds).toEqual([])
    expect(centers[0].customHolidays.length).toBeGreaterThan(0)
    expect(centers[0].customHolidays.some((holiday) => holiday.sourceRuleId === 'columbus_day')).toBe(false)
    expect(centers[0].customHolidays.some((holiday) => holiday.sourceRuleId === 'thanksgiving_day')).toBe(true)
  })
})
