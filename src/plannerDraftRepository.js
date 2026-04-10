import {
  buildPlannerDraftKey
} from './plannerDraftStorage'
import {
  clearPlannerDraftFromDexie,
  loadPlannerDraftFromDexie,
  persistPlannerDraftToDexie
} from './storage/localDataStore'

export const createLocalPlannerDraftRepository = () => ({
  buildDraftKey: buildPlannerDraftKey,
  loadDraft: async (draftKey) => loadPlannerDraftFromDexie(buildPlannerDraftKey(draftKey)),
  persistDraft: async (draftKey, draftValue) =>
    persistPlannerDraftToDexie(buildPlannerDraftKey(draftKey), draftValue),
  clearDraft: async (draftKey) => clearPlannerDraftFromDexie(buildPlannerDraftKey(draftKey))
})

export const plannerDraftRepository = createLocalPlannerDraftRepository()
