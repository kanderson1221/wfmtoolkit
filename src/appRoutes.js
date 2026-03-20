export const defaultRoute = {
  app: 'home',
  page: 'home',
  tool: null,
  centerId: null,
  groupId: null,
  planId: null,
  year: null
}

export const parseHashRoute = (hash) => {
  const normalizedHash = hash.replace(/^#\/?/, '')
  const parts = normalizedHash.split('/').filter(Boolean)

  if (normalizedHash === 'erlang-c' || normalizedHash === 'erlang') {
    return {
      app: 'calculators',
      page: 'tool',
      tool: 'interval',
      centerId: null,
      groupId: null,
      planId: null,
      year: null
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
      year: null
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
      year: null
    }
  }

  if (!parts.length || parts[0] === 'apps' || parts[0] === 'home') {
    return defaultRoute
  }

  if (parts[0] === 'calculators') {
    return {
      app: 'calculators',
      page: 'tool',
      tool: parts[1] === 'batch' ? 'batch' : 'interval',
      centerId: null,
      groupId: null,
      planId: null,
      year: null
    }
  }

  if (parts[0] === 'planning') {
    if (parts[1] === 'center' && parts[2] && !parts[3]) {
      return {
        app: 'planning',
        page: 'center',
        tool: null,
        centerId: parts[2],
        groupId: null,
        planId: null,
        year: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'group' && parts[4] && !parts[5]) {
      return {
        app: 'planning',
        page: 'center',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: null,
        year: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'group' && parts[4] && parts[5] === 'year' && parts[6]) {
      return {
        app: 'planning',
        page: 'center',
        tool: null,
        centerId: parts[2],
        groupId: parts[4],
        planId: null,
        year: Number(parts[6]) || null
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
        year: Number(parts[8]) || null
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
        year: null
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
        year: null
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
        year: null
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
        year: null
      }
    }

    return {
      app: 'planning',
      page: 'home',
      tool: null,
      centerId: null,
      groupId: null,
      planId: null,
      year: null
    }
  }

  return defaultRoute
}
