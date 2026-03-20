import { computed, nextTick, ref } from 'vue'

import { usePlanningWorkspace } from '../usePlanningWorkspace'
import {
  createPlanningGroupDraft,
  findPlanningCenter,
  findPlanningCenterByPlanId,
  findPlanningGroup,
  findPlanningGroupByPlanId,
  findPlanningPlan,
  loadPlanningCenters,
  persistPlanningCenters,
  upsertPlanningPlan,
  upsertPlanningCenter,
  upsertPlanningGroup
} from '../../planningStorage'

vi.mock('../../planningStorage', () => ({
  createPlanningGroupDraft: vi.fn(),
  findPlanningCenter: vi.fn(),
  findPlanningCenterByPlanId: vi.fn(),
  findPlanningGroup: vi.fn(),
  findPlanningGroupByPlanId: vi.fn(),
  findPlanningPlan: vi.fn(),
  loadPlanningCenters: vi.fn(),
  persistPlanningCenters: vi.fn(),
  removePlanningCenter: vi.fn(),
  removePlanningGroup: vi.fn(),
  removePlanningPlan: vi.fn(),
  upsertPlanningCenter: vi.fn(),
  upsertPlanningGroup: vi.fn(),
  upsertPlanningPlan: vi.fn()
}))

describe('usePlanningWorkspace', () => {
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
              updatedAt: '2026-01-01T00:00:00.000Z'
            }
          ]
        }
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    createPlanningGroupDraft.mockImplementation((overrides = {}) => ({
      name: '',
      ...overrides
    }))
    loadPlanningCenters.mockReturnValue(centers)
    findPlanningCenter.mockImplementation((list, centerId) => list.find((center) => center.id === centerId) || null)
    findPlanningGroup.mockImplementation(
      (list, centerId, groupId) => list.find((center) => center.id === centerId)?.groups.find((group) => group.id === groupId) || null
    )
    findPlanningCenterByPlanId.mockImplementation(
      (list, planId) =>
        list.find((center) => center.groups.some((group) => group.plans.some((plan) => plan.id === planId))) || null
    )
    findPlanningGroupByPlanId.mockImplementation(
      (list, planId) =>
        list.flatMap((center) => center.groups).find((group) => group.plans.some((plan) => plan.id === planId)) || null
    )
    findPlanningPlan.mockImplementation(
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

    workspace.loadCentersForScope()
    await nextTick()

    expect(workspace.currentCenter.value?.id).toBe('center-1')
    expect(workspace.currentGroup.value?.id).toBe('group-1')
    expect(workspace.currentPlan.value?.id).toBe('plan-1')
    expect(workspace.plannerSeed.value).toMatchObject({
      centerId: 'center-1',
      groupId: 'group-1',
      groupName: 'Consumer Voice',
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

    upsertPlanningCenter.mockReturnValue(centers)
    window.location.hash = '#planning'

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    workspace.loadCentersForScope()
    workspace.handleSaveCenter({ name: 'North America Operations' })

    expect(upsertPlanningCenter).toHaveBeenCalled()
    expect(persistPlanningCenters).toHaveBeenCalledWith(centers, 'user-1')
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

    upsertPlanningGroup.mockReturnValue(centers)
    window.location.hash = '#planning/center/center-1'

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    workspace.loadCentersForScope()
    workspace.handleSaveGroup({ name: 'Consumer Voice' })

    expect(upsertPlanningGroup).toHaveBeenCalledWith(centers, 'center-1', { name: 'Consumer Voice' })
    expect(persistPlanningCenters).toHaveBeenCalledWith(centers, 'user-1')
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

    upsertPlanningPlan.mockReturnValue(centers)
    window.location.hash = '#planning/center/center-1/group/group-1/plan/new/year/2026'

    const workspace = usePlanningWorkspace({
      currentRoute,
      currentUser,
      hasWorkspaceAccess,
      storageScope
    })

    workspace.loadCentersForScope()
    workspace.handleSavePlan({ planningYear: 2026 })

    expect(upsertPlanningPlan).toHaveBeenCalledWith(centers, 'center-1', 'group-1', { planningYear: 2026 })
    expect(persistPlanningCenters).toHaveBeenCalledWith(centers, 'user-1')
    expect(window.location.hash).toBe('#planning/center/center-1/group/group-1/plan/plan-1')
  })
})
