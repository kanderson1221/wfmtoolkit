export const defaultRoute = {
  app: 'home',
  page: 'home',
  tool: null,
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
      planId: null
    }
  }

  if (normalizedHash === 'csv-batch') {
    return {
      app: 'calculators',
      page: 'tool',
      tool: 'batch',
      planId: null
    }
  }

  if (normalizedHash === 'monthly-plan') {
    return {
      app: 'planning',
      page: 'home',
      tool: null,
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
      planId: null
    }
  }

  if (parts[0] === 'planning') {
    if (parts[1] === 'new') {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        planId: 'new'
      }
    }

    if (parts[1] === 'plan' && parts[2]) {
      return {
        app: 'planning',
        page: 'editor',
        tool: null,
        planId: parts[2]
      }
    }

    return {
      app: 'planning',
      page: 'home',
      tool: null,
      planId: null
    }
  }

  return defaultRoute
}
