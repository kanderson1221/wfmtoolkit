import {
  GROUP_HOLIDAY_CALENDAR_INHERIT,
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_CALENDAR_US_FEDERAL,
  HOLIDAY_SCHEDULE_CLOSED,
  mergeHolidayRowsWithTemplate,
  normalizeCustomHolidays,
  normalizeDisabledHolidayRuleIds,
  normalizeGroupHolidayCalendarId,
  normalizeHolidayCalendarId,
  normalizeHolidayScheduleMode
} from './planner/holidayCalendars'
import { createPlanningGroupActuals, resolvePlanningGroupActuals } from './planner/groupActuals'
import { createPlanDemandSource } from './planner/demandSources'
import { createNextYearOpening, getCurrentCalendarYear, resolvePlanningYear } from './planner/shared'
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from './storage/browserStorage'

export const CENTERS_STORAGE_KEY = 'wfmtoolkit.callCenters.v1'
export const LEGACY_PLANS_STORAGE_KEY = 'wfmtoolkit.monthlyPlans.v1'

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

const normalizeHolidayProfileYear = (value, fallback = getCurrentCalendarYear()) =>
  resolvePlanningYear(value, fallback)

const sortHolidayProfiles = (profiles) =>
  [...profiles].sort((left, right) => normalizeHolidayProfileYear(left?.year) - normalizeHolidayProfileYear(right?.year))

const normalizeHolidayProfilesByYear = (holidayProfiles) => {
  const chosenByYear = new Map()

  ;(Array.isArray(holidayProfiles) ? holidayProfiles : []).forEach((profile) => {
    const normalizedProfile = createPlanningHolidayProfile(profile, normalizeHolidayProfileYear(profile?.year))
    chosenByYear.set(normalizedProfile.year, normalizedProfile)
  })

  return sortHolidayProfiles([...chosenByYear.values()])
}

export const createPlanningHolidayProfile = (overrides = {}, fallbackYear = getCurrentCalendarYear()) => {
  const snapshot = clonePlain(overrides || {})
  const resolvedYear = normalizeHolidayProfileYear(snapshot.year, fallbackYear)
  const normalizedCalendarId = normalizeHolidayCalendarId(snapshot.holidayCalendarId, HOLIDAY_CALENDAR_NONE)
  const normalizedDisabledHolidayRuleIds = normalizeDisabledHolidayRuleIds(snapshot.disabledHolidayRuleIds)
  const migratedFederalTemplate = normalizedCalendarId === HOLIDAY_CALENDAR_US_FEDERAL
  const normalizedCustomHolidays = migratedFederalTemplate
    ? mergeHolidayRowsWithTemplate(
        snapshot.customHolidays,
        resolvedYear,
        normalizedDisabledHolidayRuleIds
      )
    : normalizeCustomHolidays(snapshot.customHolidays)

  return {
    year: resolvedYear,
    holidayCalendarId: migratedFederalTemplate ? HOLIDAY_CALENDAR_NONE : normalizedCalendarId,
    disabledHolidayRuleIds: migratedFederalTemplate ? [] : normalizedDisabledHolidayRuleIds,
    customHolidays: normalizedCustomHolidays
  }
}

const migrateLegacyHolidayProfiles = (draftCenter = {}) => {
  const snapshot = clonePlain(draftCenter || {})
  const fallbackYear = getCurrentCalendarYear()
  const normalizedCalendarId = normalizeHolidayCalendarId(snapshot.defaultHolidayCalendarId, HOLIDAY_CALENDAR_NONE)
  const normalizedDisabledHolidayRuleIds = normalizeDisabledHolidayRuleIds(snapshot.disabledHolidayRuleIds)
  const normalizedCustomHolidays = normalizeCustomHolidays(snapshot.customHolidays)
  const groupedHolidaysByYear = new Map()

  normalizedCustomHolidays.forEach((holiday) => {
    const resolvedYear = holiday.date
      ? normalizeHolidayProfileYear(String(holiday.date).slice(0, 4), fallbackYear)
      : fallbackYear
    const existingHolidays = groupedHolidaysByYear.get(resolvedYear) || []

    groupedHolidaysByYear.set(resolvedYear, [...existingHolidays, holiday])
  })

  if (!groupedHolidaysByYear.size && normalizedCalendarId !== HOLIDAY_CALENDAR_NONE) {
    groupedHolidaysByYear.set(fallbackYear, [])
  }

  return sortHolidayProfiles(
    [...groupedHolidaysByYear.entries()].map(([year, customHolidays]) =>
      createPlanningHolidayProfile(
        {
          year,
          holidayCalendarId: normalizedCalendarId,
          disabledHolidayRuleIds: normalizedDisabledHolidayRuleIds,
          customHolidays
        },
        year
      )
    )
  )
}

export const normalizeCenterHolidayProfiles = (holidayProfiles) => normalizeHolidayProfilesByYear(holidayProfiles)

export const resolveCenterHolidayProfiles = (center = {}) => {
  if (Array.isArray(center?.holidayProfiles) && center.holidayProfiles.length) {
    return normalizeCenterHolidayProfiles(center.holidayProfiles)
  }

  return migrateLegacyHolidayProfiles(center)
}

export const resolveCenterHolidayProfile = (center, planningYear = getCurrentCalendarYear()) => {
  const resolvedYear = normalizeHolidayProfileYear(planningYear)
  const matchedProfile = resolveCenterHolidayProfiles(center).find(
    (profile) => profile.year === resolvedYear
  )

  return matchedProfile || createPlanningHolidayProfile({ year: resolvedYear }, resolvedYear)
}

export const resolvePlanHolidaySnapshot = (plan, center, planningYear = getCurrentCalendarYear()) => {
  const centerHolidayProfile = resolveCenterHolidayProfile(center, planningYear)

  return {
    holidayCalendarId: normalizeHolidayCalendarId(
      plan?.holidayCalendarId,
      centerHolidayProfile.holidayCalendarId || HOLIDAY_CALENDAR_NONE
    ),
    disabledHolidayRuleIds: Array.isArray(plan?.disabledHolidayRuleIds)
      ? normalizeDisabledHolidayRuleIds(plan.disabledHolidayRuleIds)
      : [...centerHolidayProfile.disabledHolidayRuleIds],
    customHolidays: Array.isArray(plan?.customHolidays)
      ? normalizeCustomHolidays(plan.customHolidays)
      : centerHolidayProfile.customHolidays.map((holiday) => ({ ...holiday }))
  }
}

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
    const yearDelta = getPlanYear(right) - getPlanYear(left)

    if (yearDelta !== 0) {
      return yearDelta
    }

    const leftStamp = new Date(left.updatedAt || left.createdAt || 0).getTime()
    const rightStamp = new Date(right.updatedAt || right.createdAt || 0).getTime()
    return rightStamp - leftStamp
  })

const getPlanYear = (plan) => resolvePlanningYear(plan?.planningYear)
const buildPlanName = (planningYear) => `${getPlanYear({ planningYear })} Plan`

const uniquePlansByYear = (plans) => {
  const sortedPlans = sortPlans(plans)
  const chosenByYear = new Map()

  for (const plan of sortedPlans) {
    const year = getPlanYear(plan)

    if (!chosenByYear.has(year)) {
      chosenByYear.set(year, plan)
    }
  }

  return sortPlans([...chosenByYear.values()])
}

export const sortPlanningGroups = (groups) =>
  [...groups].sort((left, right) => {
    const leftStamp = new Date(left.updatedAt || left.createdAt || 0).getTime()
    const rightStamp = new Date(right.updatedAt || right.createdAt || 0).getTime()
    return rightStamp - leftStamp
  })

export const sortPlanningCenters = (centers) =>
  [...centers].sort((left, right) => {
    const leftStamp = new Date(left.updatedAt || left.createdAt || 0).getTime()
    const rightStamp = new Date(right.updatedAt || right.createdAt || 0).getTime()
    return rightStamp - leftStamp
  })

const normalizeOperatingTime = (value, fallback = '') => {
  const normalized = String(value || '').trim()
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : fallback
}

export const normalizePlanningPlan = (draftPlan, timestamp = new Date().toISOString()) => {
  const snapshot = clonePlain(draftPlan)
  const { budgets: _discardBudgets, ...planSnapshot } = snapshot
  const resolvedYear = resolvePlanningYear(planSnapshot.planningYear)

  return {
    ...planSnapshot,
    id: planSnapshot.id || createEntityId('plan'),
    name: buildPlanName(resolvedYear),
    planningYear: resolvedYear,
    holidayCalendarId: normalizeHolidayCalendarId(planSnapshot.holidayCalendarId, HOLIDAY_CALENDAR_NONE),
    disabledHolidayRuleIds: normalizeDisabledHolidayRuleIds(planSnapshot.disabledHolidayRuleIds),
    customHolidays: normalizeCustomHolidays(planSnapshot.customHolidays),
    holidayScheduleMode: normalizeHolidayScheduleMode(planSnapshot.holidayScheduleMode, HOLIDAY_SCHEDULE_CLOSED),
    demandSource: createPlanDemandSource(planSnapshot.demandSource),
    nextYearOpening: createNextYearOpening(planSnapshot.nextYearOpening),
    createdAt: planSnapshot.createdAt || timestamp,
    updatedAt: planSnapshot.updatedAt || timestamp
  }
}

export const normalizePlanningGroup = (draftGroup, timestamp = new Date().toISOString(), defaults = {}) => {
  const snapshot = clonePlain(draftGroup || {})
  const defaultOperatingWeekdays = normalizeWeekdays(defaults.operatingWeekdays)
  const defaultPaidHoursPerDay = Math.max(toNumber(defaults.defaultPaidHoursPerDay, 8), 0)
  const defaultOccupancyPercent = Math.min(100, Math.max(toNumber(defaults.defaultOccupancyPercent, 90), 1))
  const defaultAdherencePercent = Math.min(100, Math.max(toNumber(defaults.defaultAdherencePercent, 95), 1))

  return {
    id: snapshot.id || createEntityId('group'),
    name: snapshot.name?.trim() || 'Staffing Group',
    operatingWeekdays: normalizeWeekdays(snapshot.operatingWeekdays ?? defaultOperatingWeekdays),
    defaultPaidHoursPerDay: Math.max(toNumber(snapshot.defaultPaidHoursPerDay, defaultPaidHoursPerDay), 0),
    defaultOccupancyPercent: Math.min(100, Math.max(toNumber(snapshot.defaultOccupancyPercent, defaultOccupancyPercent), 1)),
    defaultAdherencePercent: Math.min(100, Math.max(toNumber(snapshot.defaultAdherencePercent, defaultAdherencePercent), 1)),
    holidayCalendarId: normalizeGroupHolidayCalendarId(snapshot.holidayCalendarId, GROUP_HOLIDAY_CALENDAR_INHERIT),
    holidayScheduleMode: normalizeHolidayScheduleMode(snapshot.holidayScheduleMode, HOLIDAY_SCHEDULE_CLOSED),
    actuals: resolvePlanningGroupActuals(snapshot),
    createdAt: snapshot.createdAt || timestamp,
    updatedAt: snapshot.updatedAt || timestamp,
    plans: uniquePlansByYear(
      Array.isArray(snapshot.plans)
        ? snapshot.plans.map((plan) => normalizePlanningPlan(plan, timestamp))
        : []
    )
  }
}

const createGroupFromLegacyPlan = (legacyPlan, timestamp = new Date().toISOString()) => {
  const groupName = legacyPlan?.name?.trim() || 'Staffing Group'

  return normalizePlanningGroup(
    {
      id: legacyPlan?.groupId || undefined,
      name: groupName,
      createdAt: legacyPlan?.createdAt || timestamp,
      updatedAt: legacyPlan?.updatedAt || timestamp,
      plans: [
        normalizePlanningPlan(
          {
            ...legacyPlan
          },
          timestamp
        )
      ],
      operatingWeekdays: legacyPlan?.operatingWeekdays,
      defaultPaidHoursPerDay: legacyPlan?.presenceMonths?.[0]?.paidHoursPerDay,
      defaultOccupancyPercent: legacyPlan?.randomDefaults?.occupancyPercent,
      defaultAdherencePercent: legacyPlan?.randomDefaults?.adherencePercent,
      holidayCalendarId: GROUP_HOLIDAY_CALENDAR_INHERIT,
      holidayScheduleMode: HOLIDAY_SCHEDULE_CLOSED
    },
    timestamp,
    {
      operatingWeekdays: legacyPlan?.operatingWeekdays || [1, 2, 3, 4, 5],
      defaultPaidHoursPerDay: legacyPlan?.presenceMonths?.[0]?.paidHoursPerDay || 8,
      defaultOccupancyPercent: legacyPlan?.randomDefaults?.occupancyPercent || 90,
      defaultAdherencePercent: legacyPlan?.randomDefaults?.adherencePercent || 95
    }
  )
}

export const normalizePlanningCenter = (draftCenter, timestamp = new Date().toISOString()) => {
  const snapshot = clonePlain(draftCenter || {})
  const {
    defaultHolidayCalendarId: _legacyDefaultHolidayCalendarId,
    disabledHolidayRuleIds: _legacyDisabledHolidayRuleIds,
    customHolidays: _legacyCustomHolidays,
    holidayProfiles,
    groups,
    plans,
    ...centerSnapshot
  } = snapshot
  const normalizedHolidayProfiles = Array.isArray(holidayProfiles) && holidayProfiles.length
    ? normalizeCenterHolidayProfiles(holidayProfiles)
    : migrateLegacyHolidayProfiles(snapshot)
  const normalizedGroups = Array.isArray(groups)
    ? groups.map((group) =>
        normalizePlanningGroup(group, timestamp, {
          operatingWeekdays: snapshot.operatingWeekdays,
          defaultPaidHoursPerDay: snapshot.defaultPaidHoursPerDay,
          defaultOccupancyPercent: snapshot.defaultOccupancyPercent,
          defaultAdherencePercent: snapshot.defaultAdherencePercent
        })
      )
    : Array.isArray(plans)
      ? plans.map((plan) => createGroupFromLegacyPlan(plan, timestamp))
      : []

  return {
    ...centerSnapshot,
    id: snapshot.id || createEntityId('center'),
    name: snapshot.name?.trim() || 'Call Center',
    timezone: snapshot.timezone?.trim() || getDefaultTimeZone(),
    holidayProfiles: normalizedHolidayProfiles,
    operatingWeekdays: normalizeWeekdays(snapshot.operatingWeekdays),
    operatingOpenTime: normalizeOperatingTime(snapshot.operatingOpenTime),
    operatingCloseTime: normalizeOperatingTime(snapshot.operatingCloseTime),
    defaultPaidHoursPerDay: Math.max(toNumber(snapshot.defaultPaidHoursPerDay, 8), 0),
    defaultOccupancyPercent: Math.min(100, Math.max(toNumber(snapshot.defaultOccupancyPercent, 90), 1)),
    defaultAdherencePercent: Math.min(100, Math.max(toNumber(snapshot.defaultAdherencePercent, 95), 1)),
    createdAt: snapshot.createdAt || timestamp,
    updatedAt: snapshot.updatedAt || timestamp,
    groups: sortPlanningGroups(normalizedGroups)
  }
}

const readStorage = (storageKey) => {
  return readJsonFromLocalStorage(storageKey, null)
}

const writeCenters = (centers, scope = 'default') => {
  writeJsonToLocalStorage(buildScopedStorageKey(CENTERS_STORAGE_KEY, scope), sortPlanningCenters(centers))
}

export const migrateLegacyPlansToCenters = (legacyPlans) => {
  if (!Array.isArray(legacyPlans) || !legacyPlans.length) {
    return []
  }

  const timestamp = new Date().toISOString()
  const normalizedGroups = sortPlanningGroups(legacyPlans.map((plan) => createGroupFromLegacyPlan(plan, timestamp)))
  const firstPlan = normalizedGroups[0]?.plans?.[0]

  return [
    normalizePlanningCenter(
      {
        name: 'Imported Call Center',
        timezone: getDefaultTimeZone(),
        operatingWeekdays: firstPlan?.operatingWeekdays || [1, 2, 3, 4, 5],
        defaultPaidHoursPerDay: firstPlan?.presenceMonths?.[0]?.paidHoursPerDay || 8,
        defaultOccupancyPercent: firstPlan?.randomDefaults?.occupancyPercent || 90,
        defaultAdherencePercent: firstPlan?.randomDefaults?.adherencePercent || 95,
        createdAt: timestamp,
        updatedAt: timestamp,
        groups: normalizedGroups
      },
      timestamp
    )
  ]
}

export const createPlanningCenterDraft = (overrides = {}) => {
  const snapshot = clonePlain(overrides || {})
  const {
    defaultHolidayCalendarId: _legacyDefaultHolidayCalendarId,
    disabledHolidayRuleIds: _legacyDisabledHolidayRuleIds,
    customHolidays: _legacyCustomHolidays,
    holidayProfiles,
    ...centerSnapshot
  } = snapshot

  return {
    ...centerSnapshot,
    name: overrides?.name ?? '',
    timezone: overrides?.timezone ?? getDefaultTimeZone(),
    holidayProfiles: normalizeCenterHolidayProfiles(holidayProfiles),
    operatingWeekdays: normalizeWeekdays(overrides?.operatingWeekdays),
    operatingOpenTime: normalizeOperatingTime(overrides?.operatingOpenTime),
    operatingCloseTime: normalizeOperatingTime(overrides?.operatingCloseTime),
    defaultPaidHoursPerDay: Math.max(toNumber(overrides?.defaultPaidHoursPerDay, 8), 0),
    defaultOccupancyPercent: Math.min(100, Math.max(toNumber(overrides?.defaultOccupancyPercent, 90), 1)),
    defaultAdherencePercent: Math.min(100, Math.max(toNumber(overrides?.defaultAdherencePercent, 95), 1))
  }
}

export const createPlanningGroupDraft = (overrides = {}) => {
  const snapshot = clonePlain(overrides || {})
  const { actualsYears: _legacyActualsYears, ...groupSnapshot } = snapshot

  return {
    name: '',
    operatingWeekdays: [1, 2, 3, 4, 5],
    defaultPaidHoursPerDay: 8,
    defaultOccupancyPercent: 90,
    defaultAdherencePercent: 95,
    holidayCalendarId: GROUP_HOLIDAY_CALENDAR_INHERIT,
    holidayScheduleMode: HOLIDAY_SCHEDULE_CLOSED,
    actuals: resolvePlanningGroupActuals(snapshot),
    ...groupSnapshot
  }
}

export const loadPlanningCenters = (scope = 'default') => {
  const scopedStorageKey = buildScopedStorageKey(CENTERS_STORAGE_KEY, scope)
  const storedCenters = readStorage(scopedStorageKey)

  if (Array.isArray(storedCenters)) {
    const normalizedCenters = sortPlanningCenters(
      storedCenters.map((center) => normalizePlanningCenter(center, center.updatedAt || center.createdAt || new Date().toISOString()))
    )
    try {
      writeCenters(normalizedCenters, scope)
    } catch {
      // Keep the workspace readable even if we cannot rewrite the normalized local copy.
    }
    return normalizedCenters
  }

  const sharedCenters = scope !== 'default' ? readStorage(CENTERS_STORAGE_KEY) : null

  if (Array.isArray(sharedCenters) && sharedCenters.length) {
    const normalizedCenters = sortPlanningCenters(
      sharedCenters.map((center) => normalizePlanningCenter(center, center.updatedAt || center.createdAt || new Date().toISOString()))
    )
    try {
      writeCenters(normalizedCenters, scope)
    } catch {
      // Keep the workspace readable even if we cannot copy shared data into the scoped key.
    }
    return normalizedCenters
  }

  const legacyPlans = readStorage(LEGACY_PLANS_STORAGE_KEY)
  const migratedCenters = migrateLegacyPlansToCenters(legacyPlans)

  if (migratedCenters.length) {
    try {
      writeCenters(migratedCenters, scope)
    } catch {
      // Keep migrated centers available in memory even if persistence is unavailable.
    }
  }

  return migratedCenters
}

export const persistPlanningCenters = (centers, scope = 'default') => {
  const normalizedCenters = sortPlanningCenters(
    centers.map((center) => normalizePlanningCenter(center, center.updatedAt || center.createdAt || new Date().toISOString()))
  )

  writeCenters(normalizedCenters, scope)
  return normalizedCenters
}

export const findPlanningCenter = (centers, centerId) =>
  centers.find((center) => center.id === centerId) || null

export const findPlanningGroup = (centers, centerId, groupId) =>
  findPlanningCenter(centers, centerId)?.groups.find((group) => group.id === groupId) || null

export const findPlanningGroupByPlanId = (centers, planId) => {
  for (const center of centers) {
    const foundGroup = (center.groups || []).find((group) => (group.plans || []).some((plan) => plan.id === planId))
    if (foundGroup) {
      return foundGroup
    }
  }

  return null
}

export const findPlanningCenterByPlanId = (centers, planId) => {
  for (const center of centers) {
    if ((center.groups || []).some((group) => (group.plans || []).some((plan) => plan.id === planId))) {
      return center
    }
  }

  return null
}

export const findPlanningPlan = (centers, centerId, groupId, planId) =>
  findPlanningGroup(centers, centerId, groupId)?.plans.find((plan) => plan.id === planId) || null

export const upsertPlanningCenter = (centers, draftCenter) => {
  const timestamp = new Date().toISOString()
  const snapshot = clonePlain(draftCenter)
  const existingCenter = snapshot.id ? centers.find((center) => center.id === snapshot.id) : null
  const nextCenter = normalizePlanningCenter(
    {
      ...existingCenter,
      ...snapshot,
      groups: existingCenter?.groups || snapshot.groups || []
    },
    timestamp
  )
  nextCenter.updatedAt = timestamp

  const existingIndex = centers.findIndex((center) => center.id === nextCenter.id)
  const nextCenters = existingIndex >= 0 ? [...centers] : [...centers, nextCenter]

  if (existingIndex >= 0) {
    nextCenters[existingIndex] = nextCenter
  }

  return sortPlanningCenters(nextCenters)
}

export const removePlanningCenter = (centers, centerId) =>
  sortPlanningCenters(centers.filter((center) => center.id !== centerId))

export const upsertPlanningGroup = (centers, centerId, draftGroup) => {
  const timestamp = new Date().toISOString()
  const nextGroup = normalizePlanningGroup(
    {
      ...draftGroup,
      updatedAt: timestamp
    },
    timestamp
  )

  return sortPlanningCenters(
    centers.map((center) => {
      if (center.id !== centerId) {
        return center
      }

      const existingIndex = center.groups.findIndex((group) => group.id === nextGroup.id)
      const nextGroups = existingIndex >= 0 ? [...center.groups] : [...center.groups, nextGroup]

      if (existingIndex >= 0) {
        nextGroups[existingIndex] = {
          ...nextGroups[existingIndex],
          ...nextGroup,
          actuals: nextGroup.actuals || nextGroups[existingIndex].actuals || createPlanningGroupActuals(),
          plans: nextGroups[existingIndex].plans || nextGroup.plans || []
        }
      }

      return {
        ...center,
        groups: sortPlanningGroups(nextGroups),
        updatedAt: timestamp
      }
    })
  )
}

export const removePlanningGroup = (centers, centerId, groupId) => {
  const timestamp = new Date().toISOString()

  return sortPlanningCenters(
    centers.map((center) => {
      if (center.id !== centerId) {
        return center
      }

      return {
        ...center,
        groups: sortPlanningGroups(center.groups.filter((group) => group.id !== groupId)),
        updatedAt: timestamp
      }
    })
  )
}

export const upsertPlanningPlan = (centers, centerId, groupId, draftPlan) => {
  const timestamp = new Date().toISOString()

  return sortPlanningCenters(
    centers.map((center) => {
      if (center.id !== centerId) {
        return center
      }

      return {
        ...center,
        groups: sortPlanningGroups(
          center.groups.map((group) => {
            if (group.id !== groupId) {
              return group
            }

            const existingPlan = draftPlan.id
              ? group.plans.find((plan) => plan.id === draftPlan.id)
              : null
            const planningYear = getPlanYear({
              planningYear: draftPlan.planningYear ?? existingPlan?.planningYear
            })
            const yearMatchedPlan = group.plans.find(
              (plan) => plan.id !== draftPlan.id && getPlanYear(plan) === planningYear
            )

            if (yearMatchedPlan && yearMatchedPlan.id !== existingPlan?.id) {
              return group
            }

            const nextPlan = normalizePlanningPlan(
              {
                ...yearMatchedPlan,
                ...existingPlan,
                ...draftPlan,
                planningYear,
                id: yearMatchedPlan?.id || existingPlan?.id || draftPlan.id,
                createdAt: yearMatchedPlan?.createdAt || existingPlan?.createdAt || draftPlan.createdAt,
                updatedAt: timestamp
              },
              timestamp
            )
            const nextPlans = [
              ...group.plans.filter(
                (plan) => plan.id !== existingPlan?.id && plan.id !== yearMatchedPlan?.id && getPlanYear(plan) !== planningYear
              ),
              nextPlan
            ]

            return {
              ...group,
              plans: uniquePlansByYear(nextPlans),
              updatedAt: timestamp
            }
          })
        ),
        updatedAt: timestamp
      }
    })
  )
}

export const removePlanningPlan = (centers, centerId, groupId, planId) => {
  const timestamp = new Date().toISOString()

  return sortPlanningCenters(
    centers.map((center) => {
      if (center.id !== centerId) {
        return center
      }

      return {
        ...center,
        groups: sortPlanningGroups(
          center.groups.map((group) => {
            if (group.id !== groupId) {
              return group
            }

            return {
              ...group,
              plans: sortPlans(group.plans.filter((plan) => plan.id !== planId)),
              updatedAt: timestamp
            }
          })
        ),
        updatedAt: timestamp
      }
    })
  )
}
