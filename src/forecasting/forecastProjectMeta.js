import {
  FORECAST_SOURCE_IMPORTED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY
} from './forecastConstants'
import {
  getForecastPlanningYear,
  resolveForecastCoverageWindow,
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

const buildForecastSubjectName = ({
  groupName,
  centerName,
  planningYear
} = {}) => {
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

const getCoverageStartMonthLabel = (snapshot = {}, planningYear = null, forecastType = '') => {
  const coverageWindow = resolveForecastCoverageWindow({
    planningYear,
    forecastType,
    coverageStartMonthIndex: snapshot.coverageStartMonthIndex,
    coverageStartDate: snapshot.coverageStartDate,
    coverageEndDate: snapshot.coverageEndDate
  })
  const match = String(coverageWindow.coverageStartDate || '').match(/^\d{4}-(\d{2})-01$/)

  return match ? new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2000, Number(match[1]) - 1, 1)) : ''
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
  const forecastType = resolveForecastType(snapshot.forecastType, snapshot)
  const sourceKind = resolveForecastSourceKind(snapshot.sourceKind)
  const subjectName = buildForecastSubjectName({
    groupName,
    centerName,
    planningYear
  })
  const coverageStartMonthLabel = getCoverageStartMonthLabel(snapshot, planningYear, forecastType)
  const isRollingCoverage = Boolean(coverageStartMonthLabel && coverageStartMonthLabel !== 'Jan')

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
    if (isRollingCoverage) {
      return `${subjectName} ${coverageStartMonthLabel} Reforecast`
    }

    return `${subjectName} Demand Forecast`
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
