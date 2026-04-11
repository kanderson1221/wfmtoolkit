import {
  clonePlain,
  createEmptyForecastResults,
  createForecastHoliday,
  createForecastProject,
  createForecastSeasonality,
  createSavedProjectName,
  toNumber
} from './forecasting/shared'
import {
  readJsonFromLocalStorage,
  readJsonFromLocalStorageResult,
  writeJsonToLocalStorage
} from './storage/browserStorage'

export const FORECAST_PROJECTS_STORAGE_KEY = 'wfmtoolkit.forecastProjects.v1'

const buildScopedStorageKey = (baseKey, scope = 'default') => `${baseKey}.${String(scope || 'default')}`

const createEntityId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const sortForecastProjects = (projects) =>
  [...projects].sort((left, right) => {
    const leftStamp = new Date(left.updatedAt || left.createdAt || 0).getTime()
    const rightStamp = new Date(right.updatedAt || right.createdAt || 0).getTime()
    return rightStamp - leftStamp
  })

export const normalizeForecastProject = (draftProject = {}, timestamp = new Date().toISOString(), existingProjects = []) => {
  const snapshot = clonePlain(draftProject || {})
  const defaultName = snapshot.id
    ? snapshot.name?.trim() || 'Untitled Forecast'
    : snapshot.name?.trim() || createSavedProjectName(existingProjects)

  return createForecastProject({
    ...snapshot,
    id: snapshot.id || createEntityId('forecast-project'),
    name: defaultName,
    forecastHorizonDays: Math.max(1, Math.round(toNumber(snapshot.forecastHorizonDays, 365))),
    uploadedHeaders: Array.isArray(snapshot.uploadedHeaders) ? [...snapshot.uploadedHeaders] : [],
    uploadedRows: Array.isArray(snapshot.uploadedRows) ? snapshot.uploadedRows.map((row) => ({ ...row })) : [],
    historyRows: Array.isArray(snapshot.historyRows) ? snapshot.historyRows.map((row) => ({ ...row })) : [],
    parserIssues: Array.isArray(snapshot.parserIssues) ? [...snapshot.parserIssues] : [],
    normalizationIssues: Array.isArray(snapshot.normalizationIssues) ? [...snapshot.normalizationIssues] : [],
    modelConfig: {
      ...createForecastProject().modelConfig,
      ...(snapshot.modelConfig || {}),
      customSeasonalities: Array.isArray(snapshot.modelConfig?.customSeasonalities)
        ? snapshot.modelConfig.customSeasonalities.map((item) => createForecastSeasonality(item))
        : [],
      customHolidays: Array.isArray(snapshot.modelConfig?.customHolidays)
        ? snapshot.modelConfig.customHolidays.map((item) => createForecastHoliday(item))
        : []
    },
    planningContext: {
      ...createForecastProject().planningContext,
      ...(snapshot.planningContext || {})
    },
    lastRun: snapshot.lastRun?.runAt
      ? createEmptyForecastResults({
          ...snapshot.lastRun,
          dailyForecast: Array.isArray(snapshot.lastRun?.dailyForecast)
            ? snapshot.lastRun.dailyForecast.map((row) => ({ ...row }))
            : [],
          monthlyRollup: Array.isArray(snapshot.lastRun?.monthlyRollup)
            ? snapshot.lastRun.monthlyRollup.map((row) => ({ ...row }))
            : [],
          components: {
            trend: Array.isArray(snapshot.lastRun?.components?.trend)
              ? snapshot.lastRun.components.trend.map((row) => ({ ...row }))
              : [],
            yearly: Array.isArray(snapshot.lastRun?.components?.yearly)
              ? snapshot.lastRun.components.yearly.map((row) => ({ ...row }))
              : [],
            weekly: Array.isArray(snapshot.lastRun?.components?.weekly)
              ? snapshot.lastRun.components.weekly.map((row) => ({ ...row }))
              : [],
            holidays: Array.isArray(snapshot.lastRun?.components?.holidays)
              ? snapshot.lastRun.components.holidays.map((row) => ({ ...row }))
              : []
          },
          diagnostics: {
            warnings: Array.isArray(snapshot.lastRun?.diagnostics?.warnings)
              ? [...snapshot.lastRun.diagnostics.warnings]
              : [],
            validationNotes: Array.isArray(snapshot.lastRun?.diagnostics?.validationNotes)
              ? [...snapshot.lastRun.diagnostics.validationNotes]
              : [],
            holdout: snapshot.lastRun?.diagnostics?.holdout || null
          }
        })
      : createEmptyForecastResults(),
    createdAt: snapshot.createdAt || timestamp,
    updatedAt: timestamp
  })
}

export const loadForecastProjects = (scope = 'default') => {
  const parsed = readJsonFromLocalStorage(buildScopedStorageKey(FORECAST_PROJECTS_STORAGE_KEY, scope), [])

  return Array.isArray(parsed)
    ? sortForecastProjects(parsed.map((project) => normalizeForecastProject(project, project.updatedAt || project.createdAt || new Date().toISOString(), parsed)))
    : []
}

export const loadForecastProjectsResult = (scope = 'default') => {
  const storageKey = buildScopedStorageKey(FORECAST_PROJECTS_STORAGE_KEY, scope)
  const { value, error } = readJsonFromLocalStorageResult(storageKey, [])

  return {
    projects: Array.isArray(value)
      ? sortForecastProjects(value.map((project) =>
          normalizeForecastProject(project, project.updatedAt || project.createdAt || new Date().toISOString(), value)
        ))
      : [],
    error
  }
}

export const persistForecastProjects = (projects, scope = 'default') => {
  const normalizedProjects = Array.isArray(projects)
    ? sortForecastProjects(projects.map((project) => normalizeForecastProject(project, project.updatedAt || new Date().toISOString(), projects)))
    : []

  writeJsonToLocalStorage(buildScopedStorageKey(FORECAST_PROJECTS_STORAGE_KEY, scope), normalizedProjects)

  return normalizedProjects
}

export const findForecastProject = (projects, projectId) =>
  (Array.isArray(projects) ? projects : []).find((project) => project.id === projectId) || null

export const upsertForecastProject = (projects, draftProject) => {
  const currentProjects = Array.isArray(projects) ? projects : []
  const timestamp = new Date().toISOString()
  const normalizedProject = normalizeForecastProject(draftProject, timestamp, currentProjects)
  const existingIndex = currentProjects.findIndex((project) => project.id === normalizedProject.id)

  if (existingIndex === -1) {
    return sortForecastProjects([...currentProjects, normalizedProject])
  }

  const nextProjects = [...currentProjects]
  nextProjects.splice(existingIndex, 1, normalizedProject)
  return sortForecastProjects(nextProjects)
}
