import {
  createPlanningGroupDraft,
  findPlanningCenter,
  findPlanningCenterByPlanId,
  findPlanningGroup,
  findPlanningGroupByPlanId,
  findPlanningPlan,
  loadPlanningCenters,
  persistPlanningCenters,
  removePlanningCenter,
  removePlanningGroup,
  removePlanningPlan,
  upsertPlanningCenter,
  upsertPlanningGroup,
  upsertPlanningPlan
} from './planningStorage'
import { isSupabaseConfigured, supabase } from './supabaseClient'

const GUEST_WORKSPACE_SCOPE = 'default'
const REMOTE_WORKSPACES_TABLE = 'planning_workspaces'

const normalizeScope = (scope = GUEST_WORKSPACE_SCOPE) => String(scope || GUEST_WORKSPACE_SCOPE)
const isRemoteScope = (scope) => Boolean(isSupabaseConfigured && supabase && normalizeScope(scope) !== GUEST_WORKSPACE_SCOPE)

const cacheWorkspace = (centers, scope = GUEST_WORKSPACE_SCOPE) => {
  persistPlanningCenters(centers, normalizeScope(scope))
  return loadPlanningCenters(normalizeScope(scope))
}

const loadCachedWorkspace = (scope = GUEST_WORKSPACE_SCOPE) => loadPlanningCenters(normalizeScope(scope))

const persistRemoteWorkspace = async (centers, scope) => {
  if (!isRemoteScope(scope) || !supabase) {
    return cacheWorkspace(centers, scope)
  }

  const normalizedCenters = cacheWorkspace(centers, scope)
  const { error } = await supabase
    .from(REMOTE_WORKSPACES_TABLE)
    .upsert(
      {
        user_id: normalizeScope(scope),
        workspace: normalizedCenters,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id'
      }
    )

  if (error) {
    throw error
  }

  return normalizedCenters
}

export const createLocalPlanningRepository = () => ({
  createGroupDraft: createPlanningGroupDraft,
  findCenter: findPlanningCenter,
  findCenterByPlanId: findPlanningCenterByPlanId,
  findGroup: findPlanningGroup,
  findGroupByPlanId: findPlanningGroupByPlanId,
  findPlan: findPlanningPlan,
  loadWorkspace: loadPlanningCenters,
  persistWorkspace: persistPlanningCenters,
  saveCenter: upsertPlanningCenter,
  deleteCenter: removePlanningCenter,
  saveGroup: upsertPlanningGroup,
  deleteGroup: removePlanningGroup,
  savePlan: upsertPlanningPlan,
  deletePlan: removePlanningPlan
})

export const createPlanningRepository = () => {
  const localRepository = createLocalPlanningRepository()

  return {
    ...localRepository,
    loadWorkspace: (scope = GUEST_WORKSPACE_SCOPE) => loadCachedWorkspace(scope),
    hydrateWorkspace: async (scope = GUEST_WORKSPACE_SCOPE, options = {}) => {
      const normalizedScope = normalizeScope(scope)
      const localCenters = loadCachedWorkspace(normalizedScope)

      if (!isRemoteScope(normalizedScope) || !supabase) {
        return localCenters
      }

      const { data, error } = await supabase
        .from(REMOTE_WORKSPACES_TABLE)
        .select('workspace')
        .eq('user_id', normalizedScope)
        .maybeSingle()

      if (error) {
        console.error('Unable to hydrate planning workspace from Supabase.', error)
        return localCenters
      }

      if (Array.isArray(data?.workspace)) {
        return cacheWorkspace(data.workspace, normalizedScope)
      }

      const seedScope = normalizeScope(options.seedScope)
      const seedCenters = localCenters.length ? localCenters : loadCachedWorkspace(seedScope)

      if (!seedCenters.length) {
        return localCenters
      }

      try {
        return await persistRemoteWorkspace(seedCenters, normalizedScope)
      } catch (persistError) {
        console.error('Unable to seed planning workspace in Supabase.', persistError)
        return cacheWorkspace(seedCenters, normalizedScope)
      }
    },
    persistWorkspace: (centers, scope = GUEST_WORKSPACE_SCOPE) => {
      const normalizedScope = normalizeScope(scope)
      const normalizedCenters = cacheWorkspace(centers, normalizedScope)

      if (!isRemoteScope(normalizedScope) || !supabase) {
        return normalizedCenters
      }

      void persistRemoteWorkspace(normalizedCenters, normalizedScope).catch((error) => {
        console.error('Unable to persist planning workspace to Supabase.', error)
      })

      return normalizedCenters
    }
  }
}

export const planningRepository = createPlanningRepository()
