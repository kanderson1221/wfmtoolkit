import { computed, nextTick, ref } from 'vue'

import {
  buildPlanningCenterHash,
  buildPlanningGroupHash,
  buildPlanningHomeHash,
  buildPlanningNewPlanHash
} from '../../appRoutes'
import { createHolidayTemplateHolidays } from '../../planner/holidayCalendars'
import { getCurrentCalendarYear } from '../../planner/shared'
import { usePlanningWorkspace } from '../usePlanningWorkspace'
import { planningRepository } from '../../planningRepository'
import { BrowserStorageError } from '../../storage/browserStorage'

vi.mock('../../planningRepository', () => ({
  planningRepository: {
    createGroupDraft: vi.fn(),
    findCenter: vi.fn(),
    findCenterByPlanId: vi.fn(),
    findGroup: vi.fn(),
    findGroupByPlanId: vi.fn(),
    findPlan: vi.fn(),
    loadWorkspace: vi.fn(),
    persistWorkspace: vi.fn(),
    deleteCenter: vi.fn(),
    deleteGroup: vi.fn(),
    deletePlan: vi.fn(),
    saveCenter: vi.fn(),
    saveGroup: vi.fn(),
    savePlan: vi.fn(),
    setCurrentPlan: vi.fn()
  }
}))

describe('usePlanningWorkspace', () => {
  const buildActualsRows = (count = 21) =>
    Array.from({ length: count }, (_, index) => {
      const date = new Date(2025, 0, 1 + index, 12)
      const serviceDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-')

      return {
        serviceDate,
        contacts: 900 + index,
        ahtSeconds: 280 + (index % 7)
      }
    })

  const buildCompleteWeekdayActuals = (year, monthIndex, overridesByDate = {}) => {
    const rows = []
    const lastDay = new Date(year, monthIndex + 1, 0, 12).getDate()

    for (let day = 1; day <= lastDay; day += 1) {
      const date = new Date(year, monthIndex, day, 12)
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue
      }

      const serviceDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      rows.push({
        serviceDate,
        contacts: 0,
        ahtSeconds: 0,
        ...overridesByDate[serviceDate]
      })
    }

    return rows
  }

  const centers = [
    {
      id: 'center-1',
      name: 'North America Operations',
      timezone: 'America/New_York',
      holidayProfiles: [
        {
          year: 2026,
          customHolidays: [
            {
              id: 'company-day-2026',
              label: 'Company Day',
              date: '2026-12-26'
            }
          ]
        },
        {
          year: 2027,
          customHolidays: [
            {
              id: 'company-day-2027',
              label: 'Company Day',
              date: '2027-12-24'
            }
          ]
        }
      ],
      operatingWeekdays: [1, 2, 3, 4, 5],
      defaultPaidHoursPerDay: 8,
      defaultOccupancyPercent: 90,
      defaultAdherencePercent: 95,
      groups: [
        {
          id: 'group-1',
          name: 'Consumer Voice',
          actuals: {
            sourceMode: 'daily_upload',
            dailyRows: buildActualsRows()
          },
          plans: [
            {
              id: 'plan-1',
              name: '2026 Operating Plan',
              planningYear: 2026,
              updatedAt: '2026-01-01T00:00:00.000Z'
            }
          ]
        }
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    planningRepository.createGroupDraft.mockImplementation((overrides = {}) => ({
      name: '',
      ...overrides
    }))
    planningRepository.loadWorkspace.mockResolvedValue(centers)
    planningRepository.persistWorkspace.mockImplementation(async (nextCenters) => nextCenters)
    planningRepository.findCenter.mockImplementation((list, centerId) => list.find((center) => center.id === centerId) || null)
    planningRepository.findGroup.mockImplementation(
      (list, centerId, groupId) => list.find((center) => center.id === centerId)?.groups.find((group) => group.id === groupId) || null
    )
    planningRepository.findCenterByPlanId.mockImplementation(
      (list, planId) =>
        list.find((center) => center.groups.some((group) => group.plans.some((plan) => plan.id === planId))) || null
    )
    planningRepository.findGroupByPlanId.mockImplementation(
      (list, planId) =>
        list.flatMap((center) => center.groups).find((group) => group.plans.some((plan) => plan.id === planId)) || null
    )
    planningRepository.findPlan.mockImplementation(
      (list, centerId, groupId, planId) =>
        list
          .find((center) => center.id === centerId)
          ?.groups.find((group) => group.id === groupId)
          ?.plans.find((plan) => plan.id === planId) || null
    )
  })

  it('derives the current center, group, plan, and planner seed from route state', async () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'plan-1'
    })
    const currentUser = ref({ id: 'user-1' })
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => currentUser.value.id)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    await nextTick()

    expect(workspace.currentCenter.value?.id).toBe('center-1')
    expect(workspace.currentGroup.value?.id).toBe('group-1')
    expect(workspace.currentPlan.value?.id).toBe('plan-1')
    expect(workspace.plannerSeed.value).toMatchObject({
      centerId: 'center-1',
      groupId: 'group-1',
      groupName: 'Consumer Voice',
      holidayCalendarId: 'none',
      disabledHolidayRuleIds: [],
      customHolidays: [
        {
          id: 'company-day-2026',
          label: 'Company Day',
          date: '2026-12-26'
        }
      ],
      holidayScheduleMode: 'closed',
      randomDefaults: {
        occupancyPercent: 90,
        adherencePercent: 95
      },
      forecastStorageScope: 'user-1:center:center-1:group:group-1:forecasts'
    })
    expect(workspace.forecastSeed.value).toMatchObject({
      centerId: 'center-1',
      centerName: 'North America Operations',
      groupId: 'group-1',
      groupName: 'Consumer Voice',
      planningYear: 2026,
      centerManagedHolidays: true,
      timezone: 'America/New_York',
      planningContext: {
        centerId: 'center-1',
        groupId: 'group-1',
        planId: 'plan-1',
        planningYear: 2026,
        groupName: 'Consumer Voice'
      },
      sourceCenterSnapshot: {
        centerId: 'center-1',
        centerName: 'North America Operations',
        holidayCalendarLabel: '1 custom holiday'
      },
      forecastStorageScope: 'user-1:center:center-1:group:group-1:forecasts',
      fallbackScopes: ['user-1:center:center-1:forecasts', 'user-1']
    })
    expect(workspace.plannerDraftKey.value).toBe('user-1:plan:plan-1')
  })

  it('resolves legacy actuals years when seeding group forecasts from planning', async () => {
    planningRepository.loadWorkspace.mockResolvedValue([
      {
        ...centers[0],
        groups: [
          {
            ...centers[0].groups[0],
            actuals: undefined,
            actualsYears: [
              {
                year: 2025,
                sourceMode: 'daily_upload',
                dailyRows: buildActualsRows()
              }
            ]
          }
        ]
      }
    ])

    const currentRoute = ref({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2026
    })
    const currentUser = ref({ id: 'user-1' })
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => currentUser.value.id)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    await nextTick()

    expect(workspace.forecastSeed.value?.historyRows).toHaveLength(15)
    expect(workspace.forecastSeed.value?.historyRows?.[0]).toMatchObject({
      ds: '2025-01-01',
      y: 900
    })
    expect(workspace.forecastSeed.value?.ahtHistoryRows).toHaveLength(15)
  })

  it('preserves recurring holiday rule metadata when seeding a forecast from planning', async () => {
    const holidayTemplateCenters = [
      {
        ...centers[0],
        holidayProfiles: [
          {
            year: 2026,
            holidayCalendarId: 'none',
            customHolidays: createHolidayTemplateHolidays('us_federal', 2026)
          }
        ]
      }
    ]

    planningRepository.loadWorkspace.mockResolvedValue(holidayTemplateCenters)

    const currentRoute = ref({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2026
    })
    const currentUser = ref({ id: 'user-1' })
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => currentUser.value.id)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    await nextTick()

    const independenceDay = workspace.forecastSeed.value?.modelConfig?.customHolidays.find(
      (holiday) => holiday.name === 'Independence Day'
    )

    expect(workspace.forecastSeed.value?.historyRows).toHaveLength(15)
    expect(workspace.forecastSeed.value?.historyRows?.[0]).toMatchObject({
      ds: '2025-01-01',
      y: 900
    })
    expect(workspace.forecastSeed.value?.ahtHistoryRows).toHaveLength(15)
    expect(workspace.forecastSeed.value?.ahtHistoryRows?.[0]).toMatchObject({
      ds: '2025-01-01',
      contacts: 900,
      ahtSeconds: 280
    })
    expect(independenceDay).toMatchObject({
      sourceRuleId: 'independence_day',
      month: 7,
      day: 3,
      date: '2026-07-03'
    })
  })

  it('ties group forecast seeds to the current plan version for the selected year', async () => {
    planningRepository.loadWorkspace.mockResolvedValue([
      {
        ...centers[0],
        groups: [
          {
            ...centers[0].groups[0],
            plans: [
              {
                id: 'budget-2026',
                name: '2026 Budget',
                planType: 'budget',
                isCurrent: false,
                planningYear: 2026
              },
              {
                id: 'update-2026-apr',
                name: '2026 Apr Update',
                planType: 'update',
                isCurrent: true,
                planningYear: 2026,
                actualsThroughMonth: '2026-03-01',
                budgetPlanId: 'budget-2026'
              }
            ]
          }
        ]
      }
    ])

    const currentRoute = ref({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2026
    })
    const currentUser = ref({ id: 'user-1' })
    const storageScope = computed(() => currentUser.value.id)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      storageScope
    })

    await workspace.loadCentersForScope()
    await nextTick()

    expect(workspace.forecastSeed.value).toMatchObject({
      planName: '2026 Apr Update',
      planType: 'update',
      actualsThroughMonth: '2026-03-01',
      planningContext: {
        planId: 'update-2026-apr',
        planName: '2026 Apr Update',
        planType: 'update',
        actualsThroughMonth: '2026-03-01'
      }
    })
  })

  it('persists center saves through the planning storage layer', async () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'home',
      centerId: null,
      groupId: null,
      planId: null
    })
    const currentUser = ref({ id: 'user-1' })
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => currentUser.value.id)

    planningRepository.saveCenter.mockReturnValue(centers)
    window.location.hash = buildPlanningHomeHash()

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    await workspace.handleSaveCenter({ name: 'North America Operations' })

    expect(planningRepository.saveCenter).toHaveBeenCalled()
    expect(planningRepository.persistWorkspace).toHaveBeenCalledWith(centers, 'user-1')
    expect(window.location.hash).toBe(buildPlanningCenterHash('center-1'))
  })

  it('persists staffing groups and routes into the saved group workspace', async () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'center',
      centerId: 'center-1',
      groupId: null,
      planId: null
    })
    const currentUser = ref({ id: 'user-1' })
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => currentUser.value.id)

    planningRepository.saveGroup.mockReturnValue(centers)
    window.location.hash = buildPlanningCenterHash('center-1')

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    await workspace.handleSaveGroup({ name: 'Consumer Voice' })

    expect(planningRepository.saveGroup).toHaveBeenCalledWith(centers, 'center-1', { name: 'Consumer Voice' })
    expect(planningRepository.persistWorkspace).toHaveBeenCalledWith(centers, 'user-1')
    expect(window.location.hash).toBe(buildPlanningGroupHash('center-1', 'group-1', getCurrentCalendarYear()))
  })

  it('persists plans and returns the user to the staffing-group plans tab', async () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'new',
      year: 2026,
      requirementMethod: 'workload_ratio'
    })
    const currentUser = ref({ id: 'user-1' })
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => currentUser.value.id)

    planningRepository.savePlan.mockReturnValue(centers)
    window.location.hash = buildPlanningNewPlanHash('center-1', 'group-1', 2026, { requirementMethod: 'workload_ratio' })

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    const didSave = await workspace.handleSavePlan({ planningYear: 2026 })

    expect(didSave).toBe(true)
    expect(planningRepository.savePlan).toHaveBeenCalledWith(centers, 'center-1', 'group-1', { planningYear: 2026 })
    expect(planningRepository.persistWorkspace).toHaveBeenCalledWith(centers, 'user-1')
    expect(window.location.hash).toBe(buildPlanningGroupHash('center-1', 'group-1', 2026, { tab: 'plans' }))
  })

  it('seeds a new update draft from the selected source plan and actuals cutoff', async () => {
    const versionedCenters = [
      {
        ...centers[0],
        groups: [
          {
            ...centers[0].groups[0],
            actuals: {
              sourceMode: 'daily_upload',
              dailyRows: buildCompleteWeekdayActuals(2026, 0, {
                '2026-01-02': { contacts: 100, ahtSeconds: 300 },
                '2026-01-05': { contacts: 200, ahtSeconds: 360 }
              })
            },
            plans: [
              {
                id: 'budget-2026',
                name: '2026 Budget',
                planType: 'budget',
                planningYear: 2026,
                isCurrent: true,
                planMonths: Array.from({ length: 12 }, (_, monthIndex) => ({
                  contacts: 1000 + (monthIndex * 100),
                  ahtSeconds: 300 + monthIndex
                })),
                demandSource: {
                  mode: 'forecast',
                  forecastProjectId: 'forecast-1',
                  forecastMonthSnapshot: Array.from({ length: 12 }, (_, monthIndex) => ({
                    monthIndex,
                    monthLabel: String(monthIndex + 1),
                    monthStart: `2026-${String(monthIndex + 1).padStart(2, '0')}-01`,
                    contacts: 1000 + (monthIndex * 100),
                    ahtSeconds: 300 + monthIndex
                  })),
                  forecastDailySnapshot: [
                    { serviceDate: '2026-01-02', monthIndex: 0, contacts: 100 },
                    { serviceDate: '2026-02-02', monthIndex: 1, contacts: 120 }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'new',
      year: 2026,
      requirementMethod: 'intraday_erlang',
      updateSourcePlanId: 'budget-2026',
      actualsThroughMonth: '2026-01-01',
      updatePlanName: '2026 Feb Update'
    })
    const currentUser = ref({ id: 'user-1' })
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => currentUser.value.id)

    planningRepository.loadWorkspace.mockResolvedValue(versionedCenters)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    await nextTick()

    expect(workspace.plannerSeed.value.updateDraftPlan).toMatchObject({
      id: null,
      name: '2026 Feb Update',
      planType: 'update',
      isCurrent: true,
      sourcePlanId: 'budget-2026',
      budgetPlanId: 'budget-2026',
      actualsThroughMonth: '2026-01-01'
    })
    expect(workspace.plannerSeed.value.updateDraftPlan.planMonths[0]).toMatchObject({
      contacts: 300,
      ahtSeconds: 340
    })
    expect(workspace.plannerSeed.value.updateDraftPlan.planMonths[1]).toMatchObject({
      contacts: 1100,
      ahtSeconds: 301
    })
    expect(workspace.plannerSeed.value.updateDraftPlan.demandSource.forecastDailySnapshot).toHaveLength(23)
    expect(workspace.plannerSeed.value.updateDraftPlan.demandSource.forecastDailySnapshot[0].serviceDate).toBe('2026-01-01')
    expect(workspace.plannerSeed.value.updateDraftPlan.demandSource.forecastDailySnapshot.at(-1)).toMatchObject({
      serviceDate: '2026-02-02',
      contacts: 120
    })
  })

  it('surfaces a blocked update route when the cutoff month is missing open dates', async () => {
    planningRepository.loadWorkspace.mockResolvedValue([
      {
        ...centers[0],
        groups: [
          {
            ...centers[0].groups[0],
            actuals: {
              sourceMode: 'daily_upload',
              dailyRows: [
                { serviceDate: '2026-01-02', contacts: 100, ahtSeconds: 300 }
              ]
            },
            plans: [
              {
                id: 'budget-2026',
                name: '2026 Budget',
                planType: 'budget',
                planningYear: 2026,
                planMonths: Array.from({ length: 12 }, () => ({
                  contacts: 1000,
                  ahtSeconds: 300
                }))
              }
            ]
          }
        ]
      }
    ])
    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'new',
      year: 2026,
      updateSourcePlanId: 'budget-2026',
      actualsThroughMonth: '2026-01-01',
      updatePlanName: '2026 Feb Update'
    })
    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser: ref({ id: 'user-1' }),
      storageScope: computed(() => 'user-1')
    })

    await workspace.loadCentersForScope()
    await nextTick()

    expect(workspace.plannerSeed.value.updateDraftPlan).toBeNull()
    expect(workspace.plannerSeed.value.updateDraftError).toBe(
      'Jan 2026 actuals are missing 21 expected open days, starting with Jan 1, 2026. ' +
      'Import daily actuals for every open date before creating an updated plan through Jan or later. ' +
      'Configured closed dates are excluded.'
    )
  })

  it('surfaces a blocked update route instead of seeding a plan from zero-AHT actuals', async () => {
    planningRepository.loadWorkspace.mockResolvedValue([
      {
        ...centers[0],
        groups: [
          {
            ...centers[0].groups[0],
            actuals: {
              sourceMode: 'daily_upload',
              dailyRows: buildCompleteWeekdayActuals(2026, 0, {
                '2026-01-02': { contacts: 100, ahtSeconds: 0 }
              })
            },
            plans: [
              {
                id: 'budget-2026',
                name: '2026 Budget',
                planType: 'budget',
                planningYear: 2026,
                planMonths: Array.from({ length: 12 }, () => ({
                  contacts: 1000,
                  ahtSeconds: 300
                }))
              }
            ]
          }
        ]
      }
    ])
    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'new',
      year: 2026,
      updateSourcePlanId: 'budget-2026',
      actualsThroughMonth: '2026-01-01',
      updatePlanName: '2026 Feb Update'
    })
    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser: ref({ id: 'user-1' }),
      storageScope: computed(() => 'user-1')
    })

    await workspace.loadCentersForScope()
    await nextTick()

    expect(workspace.plannerSeed.value.updateDraftPlan).toBeNull()
    expect(workspace.plannerSeed.value.updateDraftError).toBe(
      'Jan 2026 actuals have positive contacts but zero weighted AHT. ' +
      'Import corrected daily actuals with positive AHT before creating an updated plan through Jan or later.'
    )
  })

  it('persists guest workspace changes to the default local scope', async () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'home',
      centerId: null,
      groupId: null,
      planId: null
    })
    const currentUser = ref(null)
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => 'default')

    planningRepository.saveCenter.mockReturnValue(centers)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    await workspace.handleSaveCenter({ name: 'North America Operations' })

    expect(planningRepository.persistWorkspace).toHaveBeenCalledWith(centers, 'default')
    expect(workspace.plannerDraftKey.value).toBe('guest:plan:new')
  })

  it('surfaces a local persistence error and keeps the user on the current route when a save fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const currentRoute = ref({
      app: 'planning',
      page: 'home',
      centerId: null,
      groupId: null,
      planId: null
    })
    const currentUser = ref({ id: 'user-1' })
    const storageScope = computed(() => currentUser.value.id)

    planningRepository.saveCenter.mockReturnValue(centers)
    planningRepository.persistWorkspace.mockImplementation(async () => {
      throw new BrowserStorageError('Local storage is full.', {
        code: 'storage_quota_exceeded',
        storageKey: 'wfmtoolkit.callCenters.v1.user-1'
      })
    })

    window.location.hash = buildPlanningHomeHash()

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      storageScope
    })

    await workspace.loadCentersForScope()
    await workspace.handleSaveCenter({ name: 'North America Operations' })

    expect(workspace.workspaceSaveError.value).toContain('Unable to save planning changes locally.')
    expect(workspace.workspaceSaveError.value).toContain('out of local data storage space')
    expect(window.location.hash).toBe(buildPlanningHomeHash())
  })

  it('seeds a new plan from the prior year ending position or explicit next-year frontline target', async () => {
    const linkedCenters = [
      {
        ...centers[0],
        groups: [
          {
            ...centers[0].groups[0],
            plans: [
              {
                id: 'plan-1',
                name: '2026 Plan',
                planningYear: 2026,
                nextYearOpening: {
                  frontlineHeadcount: 42,
                },
                summary: {
                  endingRosterHeadcount: 40,
                  endingFrontlineHeadcount: 34
                }
              }
            ]
          }
        ]
      }
    ]

    planningRepository.loadWorkspace.mockResolvedValue(linkedCenters)

    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'new',
      year: 2027,
      requirementMethod: 'workload_ratio'
    })
    const currentUser = ref({ id: 'user-1' })
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => currentUser.value.id)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    expect(workspace.plannerSeed.value).toMatchObject({
      planningYear: 2027,
      startingHeadcount: 42,
      startingFrontlineHeadcount: 42,
      customHolidays: [
        {
          id: 'company-day-2027',
          label: 'Company Day',
          date: '2027-12-24'
        }
      ]
    })
  })

  it('scopes new-plan drafts by requirement method so workload-ratio and Erlang drafts stay separate', async () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'new',
      year: 2026,
      requirementMethod: 'workload_ratio'
    })
    const currentUser = ref({ id: 'user-1' })
    const storageScope = computed(() => currentUser.value.id)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      storageScope
    })

    await workspace.loadCentersForScope()
    await nextTick()

    expect(workspace.plannerDraftKey.value).toBe('user-1:group-1:plan:new:2026:workload_ratio')
    expect(workspace.monthlyPlannerKey.value).toBe('planner-group-1-new-2026-workload_ratio-budget-none')

    currentRoute.value = {
      ...currentRoute.value,
      requirementMethod: 'intraday_erlang'
    }

    await nextTick()

    expect(workspace.plannerDraftKey.value).toBe('user-1:group-1:plan:new:2026:intraday_erlang')
    expect(workspace.monthlyPlannerKey.value).toBe('planner-group-1-new-2026-intraday_erlang-budget-none')
  })

  it('keeps the new-plan draft key empty until the editor has a resolved group scope', async () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'new',
      year: 2026,
      requirementMethod: 'workload_ratio'
    })
    const currentUser = ref({ id: 'user-1' })
    const storageScope = computed(() => currentUser.value.id)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      storageScope
    })

    expect(workspace.plannerDraftKey.value).toBe('')

    await workspace.loadCentersForScope()
    await nextTick()

    expect(workspace.plannerDraftKey.value).toBe('user-1:group-1:plan:new:2026:workload_ratio')
  })
})
