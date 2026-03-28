import { onBeforeUnmount, onMounted, ref } from 'vue'

import { defaultRoute, parseHashRoute } from '../appRoutes'

const resolveCurrentRoute = () => (
  typeof window === 'undefined'
    ? defaultRoute
    : parseHashRoute(window.location.hash)
)

const resolveCurrentHash = () => (
  typeof window === 'undefined'
    ? ''
    : window.location.hash || ''
)

export const useHashNavigation = () => {
  const currentRoute = ref(resolveCurrentRoute())
  const currentHash = ref(resolveCurrentHash())
  const pendingRouteHash = ref('')

  const syncRouteFromHash = () => {
    currentHash.value = resolveCurrentHash()
    currentRoute.value = parseHashRoute(currentHash.value)
  }

  onMounted(() => {
    window.addEventListener('hashchange', syncRouteFromHash)
    syncRouteFromHash()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', syncRouteFromHash)
  })

  return {
    currentHash,
    currentRoute,
    pendingRouteHash,
    syncRouteFromHash
  }
}
