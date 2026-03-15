const DRAFT_STORAGE_KEY = 'wfmtoolkit.monthlyPlanDrafts.v1'

const clonePlain = (value) => JSON.parse(JSON.stringify(value))

const readDraftMap = () => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeDraftMap = (draftMap) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftMap))
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
