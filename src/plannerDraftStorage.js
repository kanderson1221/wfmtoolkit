import {
  readJsonFromLocalStorage,
  writeJsonToLocalStorage
} from './storage/browserStorage'

export const DRAFT_STORAGE_KEY = 'wfmtoolkit.monthlyPlanDrafts.v1'

const clonePlain = (value) => JSON.parse(JSON.stringify(value))

const readDraftMap = () => {
  const parsed = readJsonFromLocalStorage(DRAFT_STORAGE_KEY, {})
  return parsed && typeof parsed === 'object' ? parsed : {}
}

const writeDraftMap = (draftMap) => {
  writeJsonToLocalStorage(DRAFT_STORAGE_KEY, draftMap)
}

export const buildPlannerDraftKey = (planId) => String(planId || 'new')

export const loadPlannerDraft = (draftKey) => {
  const draftMap = readDraftMap()
  const draft = draftMap[buildPlannerDraftKey(draftKey)]

  return draft && typeof draft === 'object' ? clonePlain(draft) : null
}

export const persistPlannerDraft = (draftKey, draftValue) => {
  const draftMap = readDraftMap()
  const nextDraft = {
    ...clonePlain(draftValue),
    autosavedAt: new Date().toISOString()
  }

  draftMap[buildPlannerDraftKey(draftKey)] = nextDraft
  writeDraftMap(draftMap)
  return nextDraft
}

export const clearPlannerDraft = (draftKey) => {
  const storageKey = buildPlannerDraftKey(draftKey)
  const draftMap = readDraftMap()

  if (!(storageKey in draftMap)) {
    return
  }

  delete draftMap[storageKey]
  writeDraftMap(draftMap)
}
