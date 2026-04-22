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

export const buildPlannerDraftKey = (planId) => String(planId ?? '').trim()

export const loadPlannerDraft = (draftKey) => {
  const storageKey = buildPlannerDraftKey(draftKey)

  if (!storageKey) {
    return null
  }

  const draftMap = readDraftMap()
  const draft = draftMap[storageKey]

  return draft && typeof draft === 'object' ? clonePlain(draft) : null
}

export const persistPlannerDraft = (draftKey, draftValue) => {
  const storageKey = buildPlannerDraftKey(draftKey)
  const draftMap = readDraftMap()
  const nextDraft = {
    ...clonePlain(draftValue),
    autosavedAt: new Date().toISOString()
  }

  if (!storageKey) {
    return nextDraft
  }

  draftMap[storageKey] = nextDraft
  writeDraftMap(draftMap)
  return nextDraft
}

export const clearPlannerDraft = (draftKey) => {
  const storageKey = buildPlannerDraftKey(draftKey)

  if (!storageKey) {
    return
  }

  const draftMap = readDraftMap()

  if (!(storageKey in draftMap)) {
    return
  }

  delete draftMap[storageKey]
  writeDraftMap(draftMap)
}
