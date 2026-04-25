import {
  FORECAST_SOURCE_IMPORTED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  FORECAST_TYPE_BUDGET
} from './forecastConstants'
import {
  getForecastPlanningYear,
  resolveForecastSourceKind,
  resolveForecastType
} from './forecastResultPolicy'

export const mergeForecastProjectCollections = (...collections) => {
  const mergedProjects = []
  const seenProjectIds = new Set()

  collections.forEach((collection) => {
    ;(Array.isArray(collection) ? collection : []).forEach((project) => {
      if (!project?.id || seenProjectIds.has(project.id)) {
        return
      }

      seenProjectIds.add(project.id)
      mergedProjects.push(project)
    })
  })

  return mergedProjects
}

export const forecastProjectBelongsToPlanningContext = (project, centerId, groupId) => {
  const normalizedCenterId = String(centerId || '').trim()
  if (!normalizedCenterId) {
    return true
  }

  const projectCenterId = String(project?.centerId || project?.planningContext?.centerId || '').trim()
  if (projectCenterId && projectCenterId !== normalizedCenterId) {
    return false
  }

  const normalizedGroupId = String(groupId || '').trim()
  if (!normalizedGroupId) {
    return true
  }

  const projectGroupId = String(project?.groupId || project?.planningContext?.groupId || '').trim()
  return !projectGroupId || projectGroupId === normalizedGroupId
}

const startsWithName = (value, prefix) =>
  Boolean(
    value &&
      prefix &&
      value.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase())
  )

const buildForecastSubjectName = ({
  groupName,
  centerName,
  planningYear,
  planName
} = {}) => {
  const normalizedPlanName = String(planName || '').trim()

  if (normalizedPlanName) {
    if (startsWithName(normalizedPlanName, groupName) || startsWithName(normalizedPlanName, centerName)) {
      return normalizedPlanName
    }

    return groupName ? `${groupName} ${normalizedPlanName}` : normalizedPlanName
  }

  if (groupName && planningYear > 0) {
    return `${groupName} ${planningYear}`
  }

  if (groupName) {
    return groupName
  }

  if (centerName && planningYear > 0) {
    return `${centerName} ${planningYear}`
  }

  return centerName
}

export function buildForecastBaseName(seed = {}) {
  const snapshot = seed && typeof seed === 'object' ? seed : {}
  const planningContext = snapshot.planningContext || {}
  const groupName = String(snapshot.groupName || planningContext.groupName || '').trim()
  const planningYear = getForecastPlanningYear(snapshot)
  const centerName = String(
    snapshot.centerName ||
      snapshot.sourceCenterSnapshot?.centerName ||
      planningContext.centerName ||
      ''
  ).trim()
  const planName = String(snapshot.planName || planningContext.planName || '').trim()
  const forecastType = resolveForecastType(snapshot.forecastType, snapshot)
  const sourceKind = resolveForecastSourceKind(snapshot.sourceKind)
  const subjectName = buildForecastSubjectName({
    groupName,
    centerName,
    planningYear,
    planName
  })

  if (sourceKind === FORECAST_SOURCE_IMPORTED_DAILY) {
    if (subjectName) {
      return `${subjectName} Imported Daily Forecast`
    }
  }

  if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    if (subjectName) {
      return `${subjectName} Monthly Forecast`
    }
  }

  if (subjectName) {
    if (planName) {
      return `${subjectName} Forecast`
    }

    if (forecastType === FORECAST_TYPE_BUDGET) {
      return `${subjectName} Budget Forecast`
    }

    return `${subjectName} Forecast`
  }

  return 'Untitled Forecast'
}

export function createSavedForecastName(projects = [], seed = {}, options = {}) {
  const excludeId = String(options.excludeId || '').trim()
  const suffix = String(options.suffix || '').trim()
  const explicitName = String(seed?.name || '').trim()
  const derivedBaseName = buildForecastBaseName(seed)
  const baseName = derivedBaseName === 'Untitled Forecast' && explicitName
    ? explicitName
    : derivedBaseName
  const preferredName = suffix ? `${baseName} ${suffix}` : baseName
  const usedNames = new Set(
    (Array.isArray(projects) ? projects : [])
      .filter((project) => !excludeId || String(project?.id || '').trim() !== excludeId)
      .map((project) => String(project?.name || '').trim())
      .filter(Boolean)
  )

  if (!usedNames.has(preferredName)) {
    return preferredName
  }

  let index = 2
  let candidate = `${preferredName} ${index}`

  while (usedNames.has(candidate)) {
    index += 1
    candidate = `${preferredName} ${index}`
  }

  return candidate
}

export const createSavedProjectName = (projects = [], seed = {}, options = {}) =>
  createSavedForecastName(projects, seed, options)
