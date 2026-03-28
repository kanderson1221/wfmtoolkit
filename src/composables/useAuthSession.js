import { computed, ref } from 'vue'

import { AUTH_BYPASS_ENABLED } from '../authMode'
import { isSupabaseConfigured, supabase } from '../supabaseClient'

const GUEST_STORAGE_SCOPE = 'default'

export const useAuthSession = () => {
  const authReady = ref(false)
  const authSession = ref(null)
  let authSubscription = null

  const currentUser = computed(() => authSession.value?.user || null)
  const authEnabled = computed(() => isSupabaseConfigured && !AUTH_BYPASS_ENABLED)
  const authGateEnabled = computed(() => false)
  const isAuthenticated = computed(() => Boolean(currentUser.value))
  const hasWorkspaceAccess = computed(() => true)
  const storageScope = computed(() => currentUser.value?.id || GUEST_STORAGE_SCOPE)

  const syncWorkspaceForSession = async (session, loadCentersForScope) => {
    const nextScope = session?.user?.id || GUEST_STORAGE_SCOPE
    const loadOptions = session?.user
      ? { seedScope: GUEST_STORAGE_SCOPE }
      : {}

    await loadCentersForScope(nextScope, loadOptions)
  }

  const initializeAuth = ({
    loadCentersForScope,
    syncRouteFromHash
  }) => {
    if (!authEnabled.value || !supabase) {
      void Promise.resolve(loadCentersForScope(GUEST_STORAGE_SCOPE))
        .catch(() => {})
        .finally(() => {
          authReady.value = true
          syncRouteFromHash()
        })
      return
    }

    supabase.auth.getSession()
      .then(async ({ data }) => {
        authSession.value = data.session
        await syncWorkspaceForSession(data.session, loadCentersForScope)
        authReady.value = true

        syncRouteFromHash()
      })
      .catch(async () => {
        authSession.value = null
        await syncWorkspaceForSession(null, loadCentersForScope)
        authReady.value = true
        syncRouteFromHash()
      })

    const authListener = supabase.auth.onAuthStateChange(async (_event, session) => {
      authSession.value = session

      await syncWorkspaceForSession(session, loadCentersForScope)

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
