import { computed, nextTick, ref } from 'vue'

import { usePlanningWorkspace } from '../usePlanningWorkspace'
import { planningRepository } from '../../planningRepository'

vi.mock('../../planningRepository', () => ({
  planningRepository: {
    createGroupDraft: vi.fn(),
    findCenter: vi.fn(),
    findCenterByPlanId: vi.fn(),
    findGroup: vi.fn(),
    findGroupByPlanId: vi.fn(),
    findPlan: vi.fn(),
    hydrateWorkspace: vi.fn(),
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
  const centers = [
    {
      id: 'center-1',
      name: 'North America Operations',
      timezone: 'America/New_York',
      defaultHolidayCalendarId: 'us_federal',
      disabledHolidayRuleIds: ['columbus_day'],
      customHolidays: [
        {
          id: 'company-day',
          label: 'Company Day',
          month: 12,
          day: 26
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
    planningRepository.hydrateWorkspace.mockResolvedValue(undefined)
    planningRepository.loadWorkspace.mockReturnValue(centers)
    planningRepository.persistWorkspace.mockImplementation((nextCenters) => nextCenters)
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
      defaultHolidayCalendarId: 'us_federal',
      holidayCalendarId: 'us_federal',
      disabledHolidayRuleIds: ['columbus_day'],
      customHolidays: [
        {
          id: 'company-day',
          label: 'Company Day',
          month: 12,
          day: 26
        }
      ],
      holidayScheduleMode: 'closed',
      randomDefaults: {
        occupancyPercent: 90,
        adherencePercent: 95
      }
    })
    expect(workspace.plannerDraftKey.value).toBe('user-1:plan:plan-1')
  })

  it('persists center saves through the planning storage layer', () => {
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
    window.location.hash = '#planning'

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    void workspace.loadCentersForScope()
    workspace.handleSaveCenter({ name: 'North America Operations' })

    expect(planningRepository.saveCenter).toHaveBeenCalled()
    expect(planningRepository.persistWorkspace).toHaveBeenCalledWith(centers, 'user-1')
    expect(window.location.hash).toBe('#planning/center/center-1')
  })

  it('persists staffing groups and routes into the saved group workspace', () => {
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
    window.location.hash = '#planning/center/center-1'

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    void workspace.loadCentersForScope()
    workspace.handleSaveGroup({ name: 'Consumer Voice' })

    expect(planningRepository.saveGroup).toHaveBeenCalledWith(centers, 'center-1', { name: 'Consumer Voice' })
    expect(planningRepository.persistWorkspace).toHaveBeenCalledWith(centers, 'user-1')
    expect(window.location.hash).toBe(`#planning/center/center-1/group/group-1/year/${new Date().getFullYear()}`)
  })

  it('persists plans and keeps the user in the editor route', () => {
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
    window.location.hash = '#planning/center/center-1/group/group-1/plan/new/year/2026'

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    void workspace.loadCentersForScope()
    workspace.handleSavePlan({ planningYear: 2026 })

    expect(planningRepository.savePlan).toHaveBeenCalledWith(centers, 'center-1', 'group-1', { planningYear: 2026 })
    expect(planningRepository.persistWorkspace).toHaveBeenCalledWith(centers, 'user-1')
    expect(window.location.hash).toBe('#planning/center/center-1/group/group-1/plan/plan-1')
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
    workspace.handleSaveCenter({ name: 'North America Operations' })

    expect(planningRepository.persistWorkspace).toHaveBeenCalledWith(centers, 'default')
    expect(workspace.plannerDraftKey.value).toBe('guest:plan:new')
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

    planningRepository.loadWorkspace.mockReturnValue(linkedCenters)

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
      startingFrontlineHeadcount: 42
    })
  })
})
