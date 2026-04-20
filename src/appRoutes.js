export const defaultRoute = {
  app: 'planning',
  page: 'home',
  tool: null,
  centerId: null,
  groupId: null,
  groupTab: null,
  planId: null,
  year: null,
  forecastId: null,
  sourceKind: null,
  forecastType: null,
  coverageStartMonthIndex: null
}

const PLANNING_HOME_HASH = '#planning'
const PLANNING_GROUP_TABS = ['data', 'forecasts', 'intraday', 'plans']

export const normalizeHashPath = (hash = '') => hash.replace(/^#\/?/, '')

const normalizePlanningGroupTab = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  return PLANNING_GROUP_TABS.includes(normalizedValue) ? normalizedValue : ''
}

export const buildPlanningHomeHash = () => PLANNING_HOME_HASH

export const buildPlanningCenterHash = (centerId) => (
  centerId
    ? `${PLANNING_HOME_HASH}/center/${centerId}`
    : buildPlanningHomeHash()
)

export const buildPlanningCenterForecastsHash = (centerId) => (
  centerId
    ? `${PLANNING_HOME_HASH}/center/${centerId}/forecasts`
    : buildPlanningHomeHash()
)

export const buildPlanningGroupForecastsHash = (centerId, groupId, year = null, forecastId = null) => {
  if (!centerId) {
    return buildPlanningHomeHash()
  }

  if (!groupId) {
    return buildPlanningCenterHash(centerId)
  }

  const normalizedYear = Number(year)
  const normalizedForecastId = typeof forecastId === 'string' && forecastId.trim()
    ? encodeURIComponent(forecastId.trim())
    : ''

  if (Number.isInteger(normalizedYear) && normalizedYear > 0) {
    return normalizedForecastId
      ? `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}/forecasts/year/${normalizedYear}/project/${normalizedForecastId}`
      : `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}/forecasts/year/${normalizedYear}`
  }

  return normalizedForecastId
    ? `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}/forecasts/project/${normalizedForecastId}`
    : `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}/forecasts`
}

export const buildPlanningGroupNewForecastHash = (
  centerId,
  groupId,
  year,
  options = {}
) => {
  if (!centerId) {
    return buildPlanningHomeHash()
  }

  if (!groupId) {
    return buildPlanningCenterHash(centerId)
  }

  const normalizedYear = Number(year)
  if (!Number.isInteger(normalizedYear) || normalizedYear <= 0) {
    return buildPlanningGroupForecastsHash(centerId, groupId)
  }

  const normalizedSourceKind = String(options.sourceKind || '').trim().toLowerCase()
  const sourceSegment =
    normalizedSourceKind && normalizedSourceKind !== 'modeled_daily'
      ? `/source/${encodeURIComponent(normalizedSourceKind)}`
      : ''

  return `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}/forecasts/year/${normalizedYear}/new${sourceSegment}/type/budget`
}

export const buildPlanningGroupHash = (centerId, groupId, year = null, options = {}) => {
  if (!centerId) {
    return buildPlanningHomeHash()
  }

  if (!groupId) {
    return buildPlanningCenterHash(centerId)
  }

  const normalizedYear = Number(year)
  const normalizedTab = normalizePlanningGroupTab(options.tab)
  const tabSegment = normalizedTab ? `/tab/${normalizedTab}` : ''

  return Number.isInteger(normalizedYear) && normalizedYear > 0
    ? `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}/year/${normalizedYear}${tabSegment}`
    : `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}${tabSegment}`
}

export const buildPlanningPlanHash = (centerId, groupId, planId) => {
  if (!centerId || !groupId) {
    return buildPlanningGroupHash(centerId, groupId)
  }

  return planId
    ? `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}/plan/${planId}`
    : buildPlanningGroupHash(centerId, groupId)
}

export const buildPlanningNewPlanHash = (centerId, groupId, year = null) => {
  if (!centerId || !groupId) {
    return buildPlanningGroupHash(centerId, groupId)
  }

  const normalizedYear = Number(year)

  return Number.isInteger(normalizedYear) && normalizedYear > 0
    ? `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}/plan/new/year/${normalizedYear}`
    : `${PLANNING_HOME_HASH}/center/${centerId}/group/${groupId}/plan/new`
}

export const navigateToHash = (hash) => {
  if (typeof window === 'undefined' || !hash || window.location.hash === hash) {
    return
  }

  window.location.hash = hash
}

export const isPublicHomeHash = (hash = '') => {
  const normalizedHash = normalizeHashPath(hash)
  const parts = normalizedHash.split('/').filter(Boolean)

  return !parts.length || parts[0] === 'apps' || parts[0] === 'home'
}

export const parseHashRoute = (hash) => {
  const normalizedHash = normalizeHashPath(hash)
  const parts = normalizedHash.split('/').filter(Boolean)

  if (normalizedHash === 'erlang-c' || normalizedHash === 'erlang') {
    return {
      app: 'calculators',
      page: 'tool',
      tool: 'interval',
      centerId: null,
      groupId: null,
      planId: null,
      year: null,
      forecastId: null
    }
  }

  if (normalizedHash === 'csv-batch') {
    return {
      app: 'calculators',
      page: 'tool',
      tool: 'batch',
      centerId: null,
      groupId: null,
      planId: null,
      year: null,
      forecastId: null
    }
  }

  if (normalizedHash === 'forecasting' || normalizedHash === 'forecast') {
    return {
      app: 'calculators',
      page: 'tool',
      tool: 'forecasting',
      centerId: null,
      groupId: null,
      planId: null,
      year: null,
      forecastId: null
    }
  }

  if (normalizedHash === 'monthly-plan') {
    return {
      app: 'planning',
      page: 'home',
      tool: null,
      centerId: null,
      groupId: null,
      planId: null,
      year: null,
      forecastId: null
    }
  }

  if (isPublicHomeHash(hash)) {
    return defaultRoute
  }

  if (parts[0] === 'calculators') {
    return {
      app: 'calculators',
      page: 'tool',
      tool:
        parts[1] === 'batch'
          ? 'batch'
          : parts[1] === 'forecasting' || parts[1] === 'forecast'
            ? 'forecasting'
            : 'interval',
      centerId: null,
      groupId: null,
      planId: null,
      year: null,
      forecastId: null
    }
  }

  if (parts[0] === 'planning') {
    if (
      parts[1] === 'center' &&
      parts[2] &&
      parts[3] === 'group' &&
      parts[4] &&
      parts[5] === 'forecasts' &&
      parts[6] === 'year' &&
      parts[7] &&
      parts[8] === 'new'
    ) {
      const year = Number(parts[7]) || null
      let cursor = 9
      let sourceKind = null

      if (parts[cursor] === 'source' && parts[cursor + 1]) {
        sourceKind = decodeURIComponent(parts[cursor + 1])
        cursor += 2
      }

      if (parts[cursor] === 'type' && parts[cursor + 1]) {
        const forecastType = String(parts[cursor + 1] || '').trim().toLowerCase()
        if (forecastType === 'budget') {
          return {
            app: 'planning',
            page: 'group-forecasts',
            tool: null,
            centerId: parts[2],
            groupId: parts[4],
            planId: null,
            year,
            forecastId: null,
            sourceKind,
            forecastType: 'budget',
            coverageStartMonthIndex: 0
          }
        }
      }
    }

    if (
      parts[1] === 'center' &&
      parts[2] &&
      parts[3] === 'group' &&
      parts[4] &&
      parts[5] === 'forecasts' &&
      parts[6] === 'year' &&
      parts[7] &&
      parts[8] === 'new' &&
      parts[9] === 'type' &&
      parts[10] === 'budget'
    ) {
      return {
        app: 'planning',
        page: 'group-forecasts',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: null,
        year: Number(parts[7]) || null,
        forecastId: null,
        forecastType: 'budget',
        coverageStartMonthIndex: 0
      }
    }

    if (
      parts[1] === 'center' &&
      parts[2] &&
      parts[3] === 'group' &&
      parts[4] &&
      parts[5] === 'forecasts' &&
      parts[6] === 'year' &&
      parts[7] &&
      parts[8] === 'project' &&
      parts[9]
    ) {
      return {
        app: 'planning',
        page: 'group-forecasts',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: null,
        year: Number(parts[7]) || null,
        forecastId: decodeURIComponent(parts[9]),
        sourceKind: null,
        forecastType: null,
        coverageStartMonthIndex: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'group' && parts[4] && parts[5] === 'forecasts' && parts[6] === 'year' && parts[7]) {
      return {
        app: 'planning',
        page: 'group-forecasts',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: null,
        year: Number(parts[7]) || null,
        forecastId: null,
        sourceKind: null,
        forecastType: null,
        coverageStartMonthIndex: null
      }
    }

    if (
      parts[1] === 'center' &&
      parts[2] &&
      parts[3] === 'group' &&
      parts[4] &&
      parts[5] === 'forecasts' &&
      parts[6] === 'project' &&
      parts[7]
    ) {
      return {
        app: 'planning',
        page: 'group-forecasts',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: null,
        year: null,
        forecastId: decodeURIComponent(parts[7]),
        forecastType: null,
        coverageStartMonthIndex: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'group' && parts[4] && parts[5] === 'forecasts') {
      return {
        app: 'planning',
        page: 'group-forecasts',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: null,
        year: null,
        forecastId: null,
        forecastType: null,
        coverageStartMonthIndex: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'forecasts') {
      return {
        app: 'planning',
        page: 'forecasts',
        tool: null,
        centerId: parts[2],
        groupId: null,
        planId: null,
        year: null,
        forecastId: null
      }
    }

    if (parts[1] === 'center' && parts[2] && !parts[3]) {
      return {
        app: 'planning',
        page: 'center',
        tool: null,
        centerId: parts[2],
        groupId: null,
        groupTab: null,
        planId: null,
        year: null,
        forecastId: null
      }
    }

    if (
      parts[1] === 'center' &&
      parts[2] &&
      parts[3] === 'group' &&
      parts[4] &&
      parts[5] === 'tab' &&
      parts[6]
    ) {
      return {
        app: 'planning',
        page: 'center',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        groupTab: normalizePlanningGroupTab(parts[6]) || null,
        planId: null,
        year: null,
        forecastId: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'group' && parts[4] && !parts[5]) {
      return {
        app: 'planning',
        page: 'center',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        groupTab: null,
        planId: null,
        year: null,
        forecastId: null
      }
    }

    if (
      parts[1] === 'center' &&
      parts[2] &&
      parts[3] === 'group' &&
      parts[4] &&
      parts[5] === 'year' &&
      parts[6] &&
      parts[7] === 'tab' &&
      parts[8]
    ) {
      return {
        app: 'planning',
        page: 'center',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        groupTab: normalizePlanningGroupTab(parts[8]) || null,
        planId: null,
        year: Number(parts[6]) || null,
        forecastId: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'group' && parts[4] && parts[5] === 'year' && parts[6]) {
      return {
        app: 'planning',
        page: 'center',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        groupTab: null,
        planId: null,
        year: Number(parts[6]) || null,
        forecastId: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'group' && parts[4] && parts[5] === 'plan' && parts[6] === 'new' && parts[7] === 'year' && parts[8]) {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: 'new',
        year: Number(parts[8]) || null,
        forecastId: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'group' && parts[4] && parts[5] === 'plan' && parts[6] === 'new') {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: 'new',
        year: null,
        forecastId: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'group' && parts[4] && parts[5] === 'plan' && parts[6]) {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: parts[6],
        year: null,
        forecastId: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'plan' && parts[4]) {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        centerId: parts[2],
        groupId: null,
        planId: parts[4],
        year: null,
        forecastId: null
      }
    }

    if (parts[1] === 'plan' && parts[2]) {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        centerId: null,
        groupId: null,
        planId: parts[2],
        year: null,
        forecastId: null
      }
    }

    return {
      app: 'planning',
      page: 'home',
      tool: null,
      centerId: null,
      groupId: null,
      planId: null,
      year: null,
      forecastId: null
    }
  }

  return defaultRoute
}
