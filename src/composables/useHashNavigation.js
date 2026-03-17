import { onBeforeUnmount, onMounted, ref } from 'vue'

import { defaultRoute, parseHashRoute } from '../appRoutes'

export const useHashNavigation = ({ authReady, authGateEnabled, isAuthenticated }) => {
  const currentRoute = ref(defaultRoute)
  const pendingRouteHash = ref('')

  const syncRouteFromHash = () => {
    const nextRoute = parseHashRoute(window.location.hash)

    if (!authReady.value) {
      currentRoute.value = defaultRoute
      return
    }

    if (!authGateEnabled.value) {
      if (nextRoute.app === 'home') {
        if (window.location.hash !== '#planning') {
          window.location.hash = '#planning'
          return
        }
      }

      currentRoute.value = nextRoute.app === 'home' ? parseHashRoute('#planning') : nextRoute
      return
    }

    if (!isAuthenticated.value) {
      if (nextRoute.app !== 'home') {
        pendingRouteHash.value = window.location.hash || '#planning'
        if (window.location.hash !== '#home') {
          window.location.hash = '#home'
          return
        }
      }

      currentRoute.value = defaultRoute
      return
    }

    if (nextRoute.app === 'home') {
      const targetHash =
        pendingRouteHash.value && pendingRouteHash.value !== '#home'
          ? pendingRouteHash.value
          : '#planning'
      pendingRouteHash.value = ''

      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash
        return
      }
    }

    currentRoute.value = nextRoute
  }

  onMounted(() => {
    window.addEventListener('hashchange', syncRouteFromHash)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', syncRouteFromHash)
  })

  return {
    currentRoute,
    pendingRouteHash,
    syncRouteFromHash
  }
}
