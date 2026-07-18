import { nextTick, ref, watch } from 'vue'

import { forecastingRepository } from '../../forecastingRepository'
import {
  clonePlain,
  createSavedForecastName,
  forecastProjectBelongsToPlanningContext,
  mergeForecastProjectCollections
} from '../../forecasting/shared'
import { describeBrowserStorageError } from '../../storage/browserStorage'
import {
  mergeProjectSeed,
  normalizeProjectForEditor,
  resolveMaybeRef
} from './forecastWorkspaceHelpers'

export const useForecastProjectLibrary = (storageScope, options = {}) => {
  const workspaceProjects = ref([])
  const fallbackProjects = ref([])
  const savedProjects = ref([])
  const currentProject = ref(normalizeProjectForEditor())
  const isLoadingProjects = ref(false)
  const loadError = ref('')
  const saveError = ref('')
  const saveStatusMessage = ref('')
  const isDirty = ref(false)
  const activeScope = ref('default')

  let suspendDirtyTracking = false

  const resolveProjectSeed = () => clonePlain(resolveMaybeRef(options.projectSeed) || {})
  const resolveFallbackScopes = () => {
    const configuredFallbackScopes = resolveMaybeRef(options.fallbackScopes)
    return Array.isArray(configuredFallbackScopes) ? configuredFallbackScopes : []
  }
  const resolveRefreshToken = () => resolveMaybeRef(options.refreshToken)
  const resolveCenterId = () => String(resolveProjectSeed()?.centerId || resolveProjectSeed()?.planningContext?.centerId || '').trim()
  const resolveGroupId = () => String(resolveProjectSeed()?.groupId || resolveProjectSeed()?.planningContext?.groupId || '').trim()

  const runProjectReplaced = () => {
    if (typeof options.onProjectReplaced === 'function') {
      options.onProjectReplaced()
    }
  }

  const replaceCurrentProject = (project) => {
    suspendDirtyTracking = true
    currentProject.value = normalizeProjectForEditor(
      savedProjects.value,
      mergeProjectSeed(resolveProjectSeed(), project)
    )
    isDirty.value = false
    saveError.value = ''
    saveStatusMessage.value = ''
    runProjectReplaced()
    nextTick(() => {
      suspendDirtyTracking = false
    })
  }

  const loadProjectsForScope = async (scope = 'default', scopeOptions = {}) => {
    activeScope.value = String(scope || 'default')
    isLoadingProjects.value = true
    loadError.value = ''
    const centerId = String(scopeOptions.centerId || resolveCenterId() || '').trim()
    const groupId = String(scopeOptions.groupId || resolveGroupId() || '').trim()
    const fallbackScopes = resolveFallbackScopes().filter(
      (fallbackScope) => String(fallbackScope || '') && String(fallbackScope || '') !== activeScope.value
    )

    const workspaceResult = await forecastingRepository.loadWorkspaceResult(activeScope.value)
    const fallbackResults = await Promise.all(
      fallbackScopes.map(async (fallbackScope) => ({
        scope: fallbackScope,
        ...(await forecastingRepository.loadWorkspaceResult(fallbackScope))
      }))
    )

    workspaceProjects.value = Array.isArray(workspaceResult.projects) ? workspaceResult.projects : []
    fallbackProjects.value = mergeForecastProjectCollections(
      ...fallbackResults.map((result) => result.projects)
    ).filter(
      (project) =>
        forecastProjectBelongsToPlanningContext(project, centerId, groupId) &&
        !workspaceProjects.value.some((workspaceProject) => workspaceProject.id === project.id)
    )
    savedProjects.value = mergeForecastProjectCollections(workspaceProjects.value, fallbackProjects.value)

    const hadReadError = Boolean(
      workspaceResult.error || fallbackResults.some((result) => result.error)
    )

    if (hadReadError) {
      loadError.value = savedProjects.value.length
        ? 'Some saved forecasts could not be read from this device. Showing the forecasts available on this device.'
        : 'Unable to read saved forecasts from this device.'
    }

    replaceCurrentProject({})
    isLoadingProjects.value = false
  }

  const createNewProject = (overrides = {}) => {
    replaceCurrentProject(overrides)
  }

  const openProjectById = (projectId) => {
    const selectedProject = forecastingRepository.findProject(savedProjects.value, projectId)
    if (!selectedProject) {
      return
    }

    replaceCurrentProject(selectedProject)
  }

  const saveProjectSnapshot = async (projectSnapshot, successMessage = 'Forecast saved.') => {
    saveError.value = ''
    saveStatusMessage.value = ''

    try {
      const projectToSave = {
        ...clonePlain(projectSnapshot),
        name: createSavedForecastName(savedProjects.value, projectSnapshot, {
          excludeId: projectSnapshot?.id || ''
        })
      }
      const nextProjects = forecastingRepository.saveProject(workspaceProjects.value, projectToSave)
      const persistedProjects = await forecastingRepository.persistWorkspace(nextProjects, activeScope.value)
      workspaceProjects.value = Array.isArray(persistedProjects) ? persistedProjects : nextProjects
      savedProjects.value = mergeForecastProjectCollections(workspaceProjects.value, fallbackProjects.value)
      const savedProject = forecastingRepository.findProject(savedProjects.value, projectToSave.id)
      replaceCurrentProject(savedProject || projectToSave)
      saveStatusMessage.value = successMessage
      return true
    } catch (error) {
      console.error('Unable to save forecasting project.', error)
      saveError.value = `Unable to save the forecast. ${describeBrowserStorageError(
        error,
        'This browser could not store the latest forecast.'
      )}`
      return false
    }
  }

  const saveCurrentProject = async (successMessage = 'Forecast saved.') =>
    saveProjectSnapshot(currentProject.value, successMessage)

  const duplicateCurrentProject = async () => {
    const duplicateProject = normalizeProjectForEditor(savedProjects.value, {
      ...clonePlain(currentProject.value),
      id: '',
      name: `${currentProject.value.name || 'Forecast'} Copy`,
      createdAt: '',
      updatedAt: ''
    })

    replaceCurrentProject(duplicateProject)
    await saveCurrentProject('Forecast duplicated.')
  }

  watch(
    currentProject,
    () => {
      if (!suspendDirtyTracking) {
        isDirty.value = true
      }
    },
    { deep: true }
  )

  watch(
    [() => resolveMaybeRef(storageScope), () => resolveRefreshToken()],
    ([nextScope]) => {
      void loadProjectsForScope(nextScope || 'default', {
        centerId: resolveCenterId(),
        groupId: resolveGroupId()
      })
    },
    { immediate: true }
  )

  return {
    savedProjects,
    currentProject,
    isLoadingProjects,
    loadError,
    saveError,
    saveStatusMessage,
    isDirty,
    loadProjectsForScope,
    createNewProject,
    openProjectById,
    saveProjectSnapshot,
    saveCurrentProject,
    duplicateCurrentProject
  }
}
