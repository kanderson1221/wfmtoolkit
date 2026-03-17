import { computed, nextTick, ref } from 'vue'

import { usePlanningWorkspace } from '../usePlanningWorkspace'
import {
  findPlanningCenter,
  findPlanningCenterByPlanId,
  findPlanningPlan,
  loadPlanningCenters,
  persistPlanningCenters,
  upsertPlanningCenter
} from '../../planningStorage'

vi.mock('../../planningStorage', () => ({
  findPlanningCenter: vi.fn(),
  findPlanningCenterByPlanId: vi.fn(),
  findPlanningPlan: vi.fn(),
  loadPlanningCenters: vi.fn(),
  persistPlanningCenters: vi.fn(),
  removePlanningCenter: vi.fn(),
  removePlanningPlan: vi.fn(),
  upsertPlanningCenter: vi.fn(),
  upsertPlanningPlan: vi.fn()
}))

describe('usePlanningWorkspace', () => {
  const centers = [
    {
      id: 'center-1',
      operatingWeekdays: [1, 2, 3, 4, 5],
      defaultPaidHoursPerDay: 8,
      defaultOccupancyPercent: 90,
      defaultAdherencePercent: 95,
      plans: [
        {
          id: 'plan-1',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    loadPlanningCenters.mockReturnValue(centers)
    findPlanningCenter.mockImplementation((list, centerId) => list.find((center) => center.id === centerId) || null)
    findPlanningCenterByPlanId.mockImplementation(
      (list, planId) => list.find((center) => center.plans.some((plan) => plan.id === planId)) || null
    )
    findPlanningPlan.mockImplementation(
      (list, centerId, planId) =>
        list.find((center) => center.id === centerId)?.plans.find((plan) => plan.id === planId) || null
    )
  })

  it('derives the current center, plan, and planner seed from route state', async () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
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
    expect(workspace.currentPlan.value?.id).toBe('plan-1')
    expect(workspace.plannerSeed.value).toMatchObject({
      centerId: 'center-1',
      randomDefaults: {
        occupancyPercent: 90,
        adherencePercent: 95
      }
    })
    expect(workspace.plannerDraftKey.value).toBe('user-1:plan-1')
  })

  it('persists center saves through the planning storage layer', () => {
    const currentRoute = ref({
      app: 'planning',
      page: 'home',
      centerId: null,
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
    workspace.handleSaveCenter({ name: 'North America' })

    expect(upsertPlanningCenter).toHaveBeenCalled()
    expect(persistPlanningCenters).toHaveBeenCalledWith(centers, 'user-1')
    expect(window.location.hash).toBe('#planning/center/center-1')
  })
})
