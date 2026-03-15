const STORAGE_KEY = 'wfmtoolkit.monthlyPlans.v1'

const clonePlain = (value) => JSON.parse(JSON.stringify(value))

const sortPlans = (plans) =>
  [...plans].sort((left, right) => {
    const leftStamp = new Date(left.updatedAt || left.createdAt || 0).getTime()
    const rightStamp = new Date(right.updatedAt || right.createdAt || 0).getTime()
    return rightStamp - leftStamp
  })

const createPlanId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const loadPlannerPlans = () => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? sortPlans(parsed) : []
  } catch {
    return []
  }
}

export const persistPlannerPlans = (plans) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortPlans(plans)))
}

export const upsertPlannerPlan = (plans, draftPlan) => {
  const snapshot = clonePlain(draftPlan)
  const now = new Date().toISOString()
  const nextPlan = {
    ...snapshot,
    id: snapshot.id || createPlanId(),
    name: snapshot.name?.trim() || `${snapshot.planningYear || new Date().getFullYear()} Staffing Plan`,
    createdAt: snapshot.createdAt || now,
    updatedAt: now
  }

  const existingIndex = plans.findIndex((plan) => plan.id === nextPlan.id)
  const nextPlans = existingIndex >= 0 ? [...plans] : [...plans, nextPlan]

  if (existingIndex >= 0) {
    nextPlans[existingIndex] = {
      ...nextPlans[existingIndex],
      ...nextPlan
    }
  }

  return sortPlans(nextPlans)
}
