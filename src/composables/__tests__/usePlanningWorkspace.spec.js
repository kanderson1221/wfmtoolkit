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
    savePlan: vi.fn()
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

  it('persists plans and keeps the user in the editor route', async () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'new',
      year: 2026
    })
    const currentUser = ref({ id: 'user-1' })
    const hasWorkspaceAccess = computed(() => true)
    const storageScope = computed(() => currentUser.value.id)

    planningRepository.savePlan.mockReturnValue(centers)
    window.location.hash = buildPlanningNewPlanHash('center-1', 'group-1', 2026)

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    await workspace.loadCentersForScope()
    await workspace.handleSavePlan({ planningYear: 2026 })

    expect(planningRepository.savePlan).toHaveBeenCalledWith(centers, 'center-1', 'group-1', { planningYear: 2026 })
    expect(planningRepository.persistWorkspace).toHaveBeenCalledWith(centers, 'user-1')
    expect(window.location.hash).toBe(buildPlanningGroupHash('center-1', 'group-1', 2026))
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
      year: 2027
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
})
