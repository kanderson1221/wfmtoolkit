export const DRAFT_STORAGE_KEY = 'wfmtoolkit.monthlyPlanDrafts.v1'

export const buildPlannerDraftKey = (planId) => String(planId ?? '').trim()
