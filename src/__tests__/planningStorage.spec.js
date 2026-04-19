import { getCurrentCalendarYear } from '../planner/shared'
import {
  createPlanningCenterDraft,
  loadPlanningCenters,
  resolveCenterHolidayProfile,
  resolvePlanHolidaySnapshot,
  upsertPlanningPlan
} from '../planningStorage'

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
    const activeHolidayProfile = resolveCenterHolidayProfile(centers[0], getCurrentCalendarYear())

    expect(centers[0]).not.toHaveProperty('defaultHolidayCalendarId')
    expect(centers[0]).not.toHaveProperty('disabledHolidayRuleIds')
    expect(centers[0]).not.toHaveProperty('customHolidays')
    expect(centers[0].holidayProfiles).toHaveLength(1)
    expect(activeHolidayProfile.customHolidays.length).toBeGreaterThan(0)
    expect(activeHolidayProfile.customHolidays.some((holiday) => holiday.sourceRuleId === 'columbus_day')).toBe(false)
    expect(activeHolidayProfile.customHolidays.some((holiday) => holiday.sourceRuleId === 'thanksgiving_day')).toBe(true)
  })

  it('defaults new call center drafts to Monday through Friday operating days', () => {
    expect(createPlanningCenterDraft().operatingWeekdays).toEqual([1, 2, 3, 4, 5])
    expect(createPlanningCenterDraft({ operatingWeekdays: undefined }).operatingWeekdays).toEqual([1, 2, 3, 4, 5])
  })

  it('migrates legacy staffing-group actuals years into one shared actuals history', () => {
    ensurePlanningStorageApi().setItem(
      'wfmtoolkit.callCenters.v1.default',
      JSON.stringify([
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
              actualsYears: [
                {
                  year: 2025,
                  dailyRows: [
                    { serviceDate: '2025-12-31', contacts: 90, ahtSeconds: 280 }
                  ]
                },
                {
                  year: 2026,
                  dailyRows: [
                    { serviceDate: '2026-01-01', contacts: 110, ahtSeconds: 300 }
                  ],
                  uploadedFileName: 'latest.csv'
                }
              ],
              plans: []
            }
          ]
        }
      ])
    )

    const centers = loadPlanningCenters('default')

    expect(centers[0].groups[0].actuals).toMatchObject({
      uploadedFileName: 'latest.csv'
    })
    expect(centers[0].groups[0].actuals.dailyRows).toEqual([
      { serviceDate: '2025-12-31', contacts: 90, ahtSeconds: 280 },
      { serviceDate: '2026-01-01', contacts: 110, ahtSeconds: 300 }
    ])
    expect(centers[0].groups[0]).not.toHaveProperty('actualsYears')
  })

  it('keeps year-scoped holiday profiles on center drafts', () => {
    const draft = createPlanningCenterDraft({
      holidayProfiles: [
        {
          year: 2027,
          customHolidays: [
            {
              id: 'company-day',
              label: 'Company Day',
              date: '2027-12-24'
            }
          ]
        }
      ]
    })

    expect(resolveCenterHolidayProfile(draft, 2027).customHolidays).toEqual([
      {
        id: 'company-day',
        label: 'Company Day',
        date: '2027-12-24',
        sourceRuleId: null,
        month: 12,
        day: 24
      }
    ])
  })

  it('prefers the saved plan holiday snapshot over center year defaults', () => {
    const center = {
      id: 'center-1',
      holidayProfiles: [
        {
          year: 2027,
          holidayCalendarId: 'none',
          disabledHolidayRuleIds: [],
          customHolidays: [
            {
              id: 'company-day',
              label: 'Company Day',
              date: '2027-12-24'
            }
          ]
        }
      ]
    }
    const plan = {
      planningYear: 2027,
      holidayCalendarId: 'us_federal',
      disabledHolidayRuleIds: ['columbus_day'],
      customHolidays: [
        {
          id: 'team-day',
          label: 'Team Day',
          date: '2027-06-18'
        }
      ]
    }

    expect(resolvePlanHolidaySnapshot(plan, center, 2027)).toEqual({
      holidayCalendarId: 'us_federal',
      disabledHolidayRuleIds: ['columbus_day'],
      customHolidays: [
        {
          id: 'team-day',
          label: 'Team Day',
          date: '2027-06-18',
          sourceRuleId: null,
          month: 6,
          day: 18
        }
      ]
    })
  })

  it('normalizes next-year opening handoff values on saved plans', () => {
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
            plans: []
          }
        ]
      }
    ]

    const nextCenters = upsertPlanningPlan(centers, 'center-1', 'group-1', {
      planningYear: 2026,
      nextYearOpening: {
        rosterHeadcount: '',
        frontlineHeadcount: '36'
      }
    })

    expect(nextCenters[0].groups[0].plans[0].nextYearOpening).toEqual({
      rosterHeadcount: null,
      frontlineHeadcount: 36
    })
  })
})
