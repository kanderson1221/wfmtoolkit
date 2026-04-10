import {
  findForecastProject,
  upsertForecastProject
} from './forecastingStorage'
import {
  loadForecastWorkspaceFromDexie,
  persistForecastWorkspaceToDexie
} from './storage/localDataStore'

const GUEST_WORKSPACE_SCOPE = 'default'
const normalizeScope = (scope = GUEST_WORKSPACE_SCOPE) => String(scope || GUEST_WORKSPACE_SCOPE)

export const buildForecastStorageScope = (scope = GUEST_WORKSPACE_SCOPE, centerId = '', groupId = '') => {
  const normalizedScope = normalizeScope(scope)
  const normalizedCenterId = String(centerId || '').trim()
  const normalizedGroupId = String(groupId || '').trim()

  if (normalizedCenterId && normalizedGroupId) {
    return `${normalizedScope}:center:${normalizedCenterId}:group:${normalizedGroupId}:forecasts`
  }

  return normalizedCenterId
    ? `${normalizedScope}:center:${normalizedCenterId}:forecasts`
    : normalizedScope
}

export const createForecastingRepository = () => ({
  findProject: findForecastProject,
  loadWorkspace: async (scope = GUEST_WORKSPACE_SCOPE) => loadForecastWorkspaceFromDexie(normalizeScope(scope)),
  loadWorkspaceResult: async (scope = GUEST_WORKSPACE_SCOPE) => {
    try {
      const projects = await loadForecastWorkspaceFromDexie(normalizeScope(scope))
      return { projects, error: null }
    } catch (error) {
      return { projects: [], error }
    }
  },
  persistWorkspace: async (projects, scope = GUEST_WORKSPACE_SCOPE) =>
    persistForecastWorkspaceToDexie(projects, normalizeScope(scope)),
  saveProject: upsertForecastProject
})

export const forecastingRepository = createForecastingRepository()
