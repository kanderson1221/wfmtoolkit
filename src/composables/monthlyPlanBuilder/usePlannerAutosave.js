import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { plannerDraftRepository } from '../../plannerDraftRepository'
import { describeBrowserStorageError } from '../../storage/browserStorage'
import { autosaveTimeFormatter } from './shared'

export const usePlannerAutosave = ({
  resolvedDraftKey,
  restoredDraft,
  plannerBootstrapping,
  savedPlan,
  buildDraftPayload
}) => {
  const activeDraftKey = ref(resolvedDraftKey.value)
  const autosaveState = ref(restoredDraft.value ? 'restored' : savedPlan?.updatedAt ? 'saved' : 'idle')
  const lastAutosavedAt = ref(restoredDraft.value?.autosavedAt || savedPlan?.updatedAt || null)
  const autosaveErrorMessage = ref('')
  const autosaveReady = ref(false)
  const suspendAutosave = ref(false)

  let autosaveTimer = null

  const clearPendingAutosave = () => {
    if (autosaveTimer) {
      window.clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
  }

  const persistDraftNow = async () => {
    if (suspendAutosave.value || plannerBootstrapping?.value) {
      return
    }

    try {
      const nextDraft = await plannerDraftRepository.persistDraft(activeDraftKey.value, buildDraftPayload())
      lastAutosavedAt.value = nextDraft.autosavedAt
      autosaveErrorMessage.value = ''
      autosaveState.value = 'saved'
    } catch (error) {
      autosaveState.value = 'error'
      autosaveErrorMessage.value = `Autosave is unavailable. ${describeBrowserStorageError(
        error,
        'This browser could not store the latest draft.'
      )} Changes will stay in this tab until you save the plan.`
    }
  }

  const queueAutosave = async () => {
    if (!autosaveReady.value || suspendAutosave.value || plannerBootstrapping?.value) {
      return
    }

    clearPendingAutosave()
    autosaveState.value = 'saving'
    autosaveTimer = window.setTimeout(() => {
      void persistDraftNow()
      autosaveTimer = null
    }, 700)
  }

  const flushAutosave = async () => {
    if (!autosaveReady.value || suspendAutosave.value || plannerBootstrapping?.value) {
      return
    }

    clearPendingAutosave()
    await persistDraftNow()
  }

  const removeDraft = async () => {
    clearPendingAutosave()
    try {
      await plannerDraftRepository.clearDraft(activeDraftKey.value)
      autosaveErrorMessage.value = ''
    } catch (error) {
      autosaveState.value = 'error'
      autosaveErrorMessage.value = `Unable to clear the local draft. ${describeBrowserStorageError(
        error,
        'This browser could not update the saved draft state.'
      )}`
    }
    lastAutosavedAt.value = null
    if (autosaveState.value !== 'error') {
      autosaveState.value = 'idle'
    }
  }

  const completeManualSave = async (savedAt) => {
    suspendAutosave.value = true
    await removeDraft()
    lastAutosavedAt.value = savedAt
    if (autosaveState.value !== 'error') {
      autosaveState.value = 'saved'
    }
  }

  const autosaveStatusMessage = computed(() => {
    if (autosaveState.value === 'error' && autosaveErrorMessage.value) {
      return autosaveErrorMessage.value
    }

    if (autosaveState.value === 'saving') {
      return 'Autosaving draft...'
    }

    if (lastAutosavedAt.value) {
      const formattedTime = autosaveTimeFormatter.format(new Date(lastAutosavedAt.value))
      if (autosaveState.value === 'saved') {
        return `Saved ${formattedTime}`
      }
      return autosaveState.value === 'restored'
        ? `Draft restored from ${formattedTime}`
        : `Autosaved ${formattedTime}`
    }

    return 'Autosave ready'
  })

  watch(resolvedDraftKey, async (nextDraftKey, previousDraftKey) => {
    if (!nextDraftKey || nextDraftKey === previousDraftKey) {
      return
    }

    activeDraftKey.value = nextDraftKey

    if (!autosaveReady.value || suspendAutosave.value) {
      return
    }

    clearPendingAutosave()

    try {
      const nextDraft = await plannerDraftRepository.persistDraft(nextDraftKey, buildDraftPayload())
      lastAutosavedAt.value = nextDraft.autosavedAt
      autosaveErrorMessage.value = ''
      autosaveState.value = 'saved'
    } catch (error) {
      autosaveState.value = 'error'
      autosaveErrorMessage.value = `Autosave is unavailable. ${describeBrowserStorageError(
        error,
        'This browser could not store the latest draft.'
      )} Changes will stay in this tab until you save the plan.`
    }
  })

  watch(restoredDraft, (nextDraft) => {
    if (!nextDraft) {
      if (!savedPlan?.updatedAt) {
        autosaveState.value = 'idle'
        lastAutosavedAt.value = null
      }
      return
    }

    autosaveState.value = 'restored'
    lastAutosavedAt.value = nextDraft.autosavedAt || savedPlan?.updatedAt || null
    autosaveErrorMessage.value = ''
  })

  watch(
    plannerBootstrapping,
    (isHydrating) => {
      autosaveReady.value = !isHydrating
    },
    { immediate: true }
  )

  onMounted(() => {
    window.addEventListener('beforeunload', flushAutosave)
  })

  onBeforeUnmount(() => {
    if (!suspendAutosave.value) {
      void flushAutosave()
    }

    window.removeEventListener('beforeunload', flushAutosave)
  })

  return {
    autosaveState,
    lastAutosavedAt,
    autosaveReady,
    suspendAutosave,
    autosaveStatusMessage,
    queueAutosave,
    flushAutosave,
    completeManualSave
  }
}
