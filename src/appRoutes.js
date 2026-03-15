export const defaultRoute = {
  app: 'home',
  page: 'home',
  tool: null,
  centerId: null,
  planId: null
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
      planId: null
    }
  }

  if (normalizedHash === 'csv-batch') {
    return {
      app: 'calculators',
      page: 'tool',
      tool: 'batch',
      centerId: null,
      planId: null
    }
  }

  if (normalizedHash === 'monthly-plan') {
    return {
      app: 'planning',
      page: 'home',
      tool: null,
      centerId: null,
      planId: null
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
      planId: null
    }
  }

  if (parts[0] === 'planning') {
    if (parts[1] === 'center' && parts[2] && !parts[3]) {
      return {
        app: 'planning',
        page: 'center',
        tool: null,
        centerId: parts[2],
        planId: null
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'new') {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        centerId: parts[2],
        planId: 'new'
      }
    }

    if (parts[1] === 'center' && parts[2] && parts[3] === 'plan' && parts[4]) {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        centerId: parts[2],
        planId: parts[4]
      }
    }

    if (parts[1] === 'plan' && parts[2]) {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        centerId: null,
        planId: parts[2]
      }
    }

    return {
      app: 'planning',
      page: 'home',
      tool: null,
      centerId: null,
      planId: null
    }
  }

  return defaultRoute
}
