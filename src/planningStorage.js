const CENTERS_STORAGE_KEY = 'wfmtoolkit.callCenters.v1'
const LEGACY_PLANS_STORAGE_KEY = 'wfmtoolkit.monthlyPlans.v1'

const buildScopedStorageKey = (baseKey, scope = 'default') => `${baseKey}.${String(scope || 'default')}`

const clonePlain = (value) => JSON.parse(JSON.stringify(value))

const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeWeekdays = (weekdays) =>
  Array.isArray(weekdays) && weekdays.length
    ? [...new Set(weekdays.map((value) => toNumber(value, 0)))].sort((left, right) => left - right)
    : [1, 2, 3, 4, 5]

const createEntityId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const getDefaultTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  } catch {
    return 'America/New_York'
  }
}

const sortPlans = (plans) =>
  [...plans].sort((left, right) => {
    const leftStamp = new Date(left.updatedAt || left.createdAt || 0).getTime()
    const rightStamp = new Date(right.updatedAt || right.createdAt || 0).getTime()
    return rightStamp - leftStamp
  })

const sortCenters = (centers) =>
  [...centers].sort((left, right) => {
    const leftStamp = new Date(left.updatedAt || left.createdAt || 0).getTime()
    const rightStamp = new Date(right.updatedAt || right.createdAt || 0).getTime()
    return rightStamp - leftStamp
  })

const normalizePlan = (draftPlan, timestamp = new Date().toISOString()) => {
  const snapshot = clonePlain(draftPlan)
  const { budgets: _discardBudgets, ...planSnapshot } = snapshot

  return {
    ...planSnapshot,
    id: planSnapshot.id || createEntityId('plan'),
    name: planSnapshot.name?.trim() || `${planSnapshot.planningYear || new Date().getFullYear()} Staffing Group`,
    createdAt: planSnapshot.createdAt || timestamp,
    updatedAt: planSnapshot.updatedAt || timestamp
  }
}

const normalizeCenter = (draftCenter, timestamp = new Date().toISOString()) => {
  const snapshot = clonePlain(draftCenter)

  return {
    ...snapshot,
    id: snapshot.id || createEntityId('center'),
    name: snapshot.name?.trim() || 'Call Center',
    timezone: snapshot.timezone?.trim() || getDefaultTimeZone(),
    operatingWeekdays: normalizeWeekdays(snapshot.operatingWeekdays),
    defaultPaidHoursPerDay: Math.max(toNumber(snapshot.defaultPaidHoursPerDay, 8), 0),
    defaultOccupancyPercent: Math.min(100, Math.max(toNumber(snapshot.defaultOccupancyPercent, 90), 1)),
    defaultAdherencePercent: Math.min(100, Math.max(toNumber(snapshot.defaultAdherencePercent, 95), 1)),
    createdAt: snapshot.createdAt || timestamp,
    updatedAt: snapshot.updatedAt || timestamp,
    plans: sortPlans(Array.isArray(snapshot.plans) ? snapshot.plans.map((plan) => normalizePlan(plan, timestamp)) : [])
  }
}

const readStorage = (storageKey) => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeCenters = (centers, scope = 'default') => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(buildScopedStorageKey(CENTERS_STORAGE_KEY, scope), JSON.stringify(sortCenters(centers)))
}

const migrateLegacyPlans = (legacyPlans) => {
  if (!Array.isArray(legacyPlans) || !legacyPlans.length) {
    return []
  }

  const timestamp = new Date().toISOString()
  const normalizedPlans = sortPlans(legacyPlans.map((plan) => normalizePlan(plan, timestamp)))
  const firstPlan = normalizedPlans[0]

  return [
    normalizeCenter(
      {
        name: 'Imported Call Center',
        timezone: getDefaultTimeZone(),
        operatingWeekdays: firstPlan.operatingWeekdays || [1, 2, 3, 4, 5],
        defaultPaidHoursPerDay: firstPlan.presenceMonths?.[0]?.paidHoursPerDay || 8,
        defaultOccupancyPercent: firstPlan.randomDefaults?.occupancyPercent || 90,
        defaultAdherencePercent: firstPlan.randomDefaults?.adherencePercent || 95,
        createdAt: timestamp,
        updatedAt: timestamp,
        plans: normalizedPlans
      },
      timestamp
    )
  ]
}

export const createPlanningCenterDraft = (overrides = {}) => ({
  name: '',
  timezone: getDefaultTimeZone(),
  operatingWeekdays: [1, 2, 3, 4, 5],
  defaultPaidHoursPerDay: 8,
  defaultOccupancyPercent: 90,
  defaultAdherencePercent: 95,
  ...overrides
})

export const loadPlanningCenters = (scope = 'default') => {
  const scopedStorageKey = buildScopedStorageKey(CENTERS_STORAGE_KEY, scope)
  const storedCenters = readStorage(scopedStorageKey)

  if (Array.isArray(storedCenters)) {
    const normalizedCenters = sortCenters(
      storedCenters.map((center) => normalizeCenter(center, center.updatedAt || center.createdAt || new Date().toISOString()))
    )
    writeCenters(normalizedCenters, scope)
    return normalizedCenters
  }

  const sharedCenters = scope !== 'default' ? readStorage(CENTERS_STORAGE_KEY) : null

  if (Array.isArray(sharedCenters) && sharedCenters.length) {
    const normalizedCenters = sortCenters(
      sharedCenters.map((center) => normalizeCenter(center, center.updatedAt || center.createdAt || new Date().toISOString()))
    )
    writeCenters(normalizedCenters, scope)
    return normalizedCenters
  }

  const legacyPlans = readStorage(LEGACY_PLANS_STORAGE_KEY)
  const migratedCenters = migrateLegacyPlans(legacyPlans)

  if (migratedCenters.length) {
    writeCenters(migratedCenters, scope)
  }

  return migratedCenters
}

export const persistPlanningCenters = (centers, scope = 'default') => {
  writeCenters(
    sortCenters(centers.map((center) => normalizeCenter(center, center.updatedAt || center.createdAt || new Date().toISOString()))),
    scope
  )
}

export const findPlanningCenter = (centers, centerId) =>
  centers.find((center) => center.id === centerId) || null

export const findPlanningCenterByPlanId = (centers, planId) =>
  centers.find((center) => Array.isArray(center.plans) && center.plans.some((plan) => plan.id === planId)) || null

export const findPlanningPlan = (centers, centerId, planId) =>
  findPlanningCenter(centers, centerId)?.plans.find((plan) => plan.id === planId) || null

export const upsertPlanningCenter = (centers, draftCenter) => {
  const timestamp = new Date().toISOString()
  const snapshot = clonePlain(draftCenter)
  const existingCenter = snapshot.id ? centers.find((center) => center.id === snapshot.id) : null
  const nextCenter = normalizeCenter(
    {
      ...existingCenter,
      ...snapshot,
      plans: existingCenter?.plans || snapshot.plans || []
    },
    timestamp
  )
  nextCenter.updatedAt = timestamp

  const existingIndex = centers.findIndex((center) => center.id === nextCenter.id)
  const nextCenters = existingIndex >= 0 ? [...centers] : [...centers, nextCenter]

  if (existingIndex >= 0) {
    nextCenters[existingIndex] = nextCenter
  }

  return sortCenters(nextCenters)
}

export const removePlanningCenter = (centers, centerId) =>
  sortCenters(centers.filter((center) => center.id !== centerId))

export const upsertPlanningPlan = (centers, centerId, draftPlan) => {
  const timestamp = new Date().toISOString()
  const nextPlan = normalizePlan(
    {
      ...draftPlan,
      updatedAt: timestamp
    },
    timestamp
  )

  return sortCenters(
    centers.map((center) => {
      if (center.id !== centerId) {
        return center
      }

      const existingIndex = center.plans.findIndex((plan) => plan.id === nextPlan.id)
      const nextPlans = existingIndex >= 0 ? [...center.plans] : [...center.plans, nextPlan]

      if (existingIndex >= 0) {
        nextPlans[existingIndex] = {
          ...nextPlans[existingIndex],
          ...nextPlan
        }
      }

      return {
        ...center,
        plans: sortPlans(nextPlans),
        updatedAt: timestamp
      }
    })
  )
}

export const removePlanningPlan = (centers, centerId, planId) => {
  const timestamp = new Date().toISOString()

  return sortCenters(
    centers.map((center) => {
      if (center.id !== centerId) {
        return center
      }

      return {
        ...center,
        plans: sortPlans(center.plans.filter((plan) => plan.id !== planId)),
        updatedAt: timestamp
      }
    })
  )
}
