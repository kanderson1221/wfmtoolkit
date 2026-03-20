import { computed, ref } from 'vue'

import { AUTH_BYPASS_ENABLED } from '../authMode'
import { isSupabaseConfigured, supabase } from '../supabaseClient'

export const useAuthSession = () => {
  const authReady = ref(false)
  const authSession = ref(null)
  let authSubscription = null

  const currentUser = computed(() => authSession.value?.user || null)
  const authGateEnabled = computed(() => isSupabaseConfigured && !AUTH_BYPASS_ENABLED)
  const isAuthenticated = computed(() => Boolean(currentUser.value))
  const hasWorkspaceAccess = computed(() => AUTH_BYPASS_ENABLED || isAuthenticated.value)
  const storageScope = computed(() => currentUser.value?.id || 'default')

  const initializeAuth = ({
    loadCentersForScope,
    clearCenters,
    syncRouteFromHash,
    pendingRouteHash
  }) => {
    if (!authGateEnabled.value || !supabase) {
      loadCentersForScope(storageScope.value)
      authReady.value = true
      syncRouteFromHash()
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      authSession.value = data.session
      if (data.session?.user) {
        loadCentersForScope(data.session.user.id)
      } else {
        clearCenters()
      }
      authReady.value = true
      syncRouteFromHash()
    })

    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      authSession.value = session

      if (session?.user) {
        loadCentersForScope(session.user.id)
      } else {
        clearCenters()
      }

      if (!session?.user && window.location.hash !== '#home') {
        pendingRouteHash.value = window.location.hash
        window.location.hash = '#home'
        return
      }

      if (session?.user && (window.location.hash === '#home' || !window.location.hash)) {
        const targetHash =
          pendingRouteHash.value && pendingRouteHash.value !== '#home'
            ? pendingRouteHash.value
            : '#planning'
        pendingRouteHash.value = ''
        window.location.hash = targetHash
        return
      }

      syncRouteFromHash()
    })

    authSubscription = authListener.data.subscription
  }

  const disposeAuth = () => {
    authSubscription?.unsubscribe()
    authSubscription = null
  }

  const handleSignOut = async () => {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
  }

  return {
    authReady,
    currentUser,
    authGateEnabled,
    isAuthenticated,
    hasWorkspaceAccess,
    storageScope,
    handleSignOut,
    initializeAuth,
    disposeAuth
  }
}
