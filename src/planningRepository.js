import {
  createPlanningGroupDraft,
  findPlanningCenter,
  findPlanningCenterByPlanId,
  findPlanningGroup,
  findPlanningGroupByPlanId,
  findPlanningPlan,
  removePlanningCenter,
  removePlanningGroup,
  removePlanningPlan,
  setCurrentPlanningPlan,
  upsertPlanningCenter,
  upsertPlanningGroup,
  upsertPlanningPlan
} from './planningStorage'
import {
  loadPlanningWorkspaceFromDexie,
  persistPlanningWorkspaceToDexie
} from './storage/localDataStore'

const GUEST_WORKSPACE_SCOPE = 'default'
const normalizeScope = (scope = GUEST_WORKSPACE_SCOPE) => String(scope || GUEST_WORKSPACE_SCOPE)
export const createPlanningRepository = () => ({
  createGroupDraft: createPlanningGroupDraft,
  findCenter: findPlanningCenter,
  findCenterByPlanId: findPlanningCenterByPlanId,
  findGroup: findPlanningGroup,
  findGroupByPlanId: findPlanningGroupByPlanId,
  findPlan: findPlanningPlan,
  loadWorkspace: async (scope = GUEST_WORKSPACE_SCOPE) => loadPlanningWorkspaceFromDexie(normalizeScope(scope)),
  persistWorkspace: async (centers, scope = GUEST_WORKSPACE_SCOPE) =>
    persistPlanningWorkspaceToDexie(centers, normalizeScope(scope)),
  saveCenter: upsertPlanningCenter,
  deleteCenter: removePlanningCenter,
  saveGroup: upsertPlanningGroup,
  deleteGroup: removePlanningGroup,
  savePlan: upsertPlanningPlan,
  deletePlan: removePlanningPlan,
  setCurrentPlan: setCurrentPlanningPlan
})

export const planningRepository = createPlanningRepository()
