import {
  buildPlannerDraftKey,
  clearPlannerDraft,
  loadPlannerDraft,
  persistPlannerDraft
} from './plannerDraftStorage'

export const createLocalPlannerDraftRepository = () => ({
  buildDraftKey: buildPlannerDraftKey,
  loadDraft: loadPlannerDraft,
  persistDraft: persistPlannerDraft,
  clearDraft: clearPlannerDraft
})

export const plannerDraftRepository = createLocalPlannerDraftRepository()
