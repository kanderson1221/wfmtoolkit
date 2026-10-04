import { PLAN_REQUIREMENT_METHOD_WORKLOAD_RATIO, normalizePlanRequirementMethod, toNumber } from './shared'

export const STAFFING_CHANNEL_VOICE = 'voice'
export const STAFFING_CHANNEL_EMAIL = 'email'

export const STAFFING_CHANNEL_OPTIONS = [
  { label: 'Phone Calls', value: STAFFING_CHANNEL_VOICE },
  { label: 'Email', value: STAFFING_CHANNEL_EMAIL }
]

export const SERVICE_GOAL_UNIT_SECONDS = 'seconds'
export const SERVICE_GOAL_UNIT_BUSINESS_HOURS = 'business_hours'

const DEFAULT_SERVICE_GOALS = {
  [STAFFING_CHANNEL_VOICE]: {
    targetPercent: 80,
    threshold: 20,
    thresholdUnit: SERVICE_GOAL_UNIT_SECONDS
  },
  [STAFFING_CHANNEL_EMAIL]: {
    targetPercent: 90,
    threshold: 24,
    thresholdUnit: SERVICE_GOAL_UNIT_BUSINESS_HOURS
  }
}

export const normalizeStaffingChannel = (value, fallback = STAFFING_CHANNEL_VOICE) => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  return normalizedValue === STAFFING_CHANNEL_EMAIL
    ? STAFFING_CHANNEL_EMAIL
    : normalizedValue === STAFFING_CHANNEL_VOICE
      ? STAFFING_CHANNEL_VOICE
      : fallback
}

export const isEmailChannel = (value) => normalizeStaffingChannel(value) === STAFFING_CHANNEL_EMAIL

export const getStaffingChannelLabel = (value) =>
  isEmailChannel(value) ? 'Email' : 'Phone Calls'

export const createChannelServiceGoal = (channelType, overrides = {}) => {
  const resolvedChannel = normalizeStaffingChannel(channelType)
  const defaults = DEFAULT_SERVICE_GOALS[resolvedChannel]
  const legacyThreshold = resolvedChannel === STAFFING_CHANNEL_EMAIL
    ? overrides.serviceLevelThresholdBusinessHours
    : overrides.serviceLevelThresholdSeconds

  return {
    targetPercent: Math.min(
      100,
      Math.max(toNumber(overrides.targetPercent ?? overrides.serviceLevelPercent, defaults.targetPercent), 1)
    ),
    threshold: Math.max(toNumber(overrides.threshold ?? legacyThreshold, defaults.threshold), 0.01),
    thresholdUnit: resolvedChannel === STAFFING_CHANNEL_EMAIL
      ? SERVICE_GOAL_UNIT_BUSINESS_HOURS
      : SERVICE_GOAL_UNIT_SECONDS
  }
}

export const resolveChannelServiceGoal = (entity = {}, fallbackChannel = STAFFING_CHANNEL_VOICE) => {
  const channelType = normalizeStaffingChannel(entity?.channelType, fallbackChannel)
  return createChannelServiceGoal(channelType, {
    ...(entity?.serviceGoal || {}),
    serviceLevelPercent: entity?.serviceLevelPercent,
    serviceLevelThresholdSeconds: entity?.serviceLevelThresholdSeconds,
    serviceLevelThresholdBusinessHours: entity?.serviceLevelThresholdBusinessHours
  })
}

export const normalizeRequirementMethodForChannel = (requirementMethod, channelType) =>
  isEmailChannel(channelType)
    ? PLAN_REQUIREMENT_METHOD_WORKLOAD_RATIO
    : normalizePlanRequirementMethod(requirementMethod)

export const getChannelPlanningTerms = (channelType) => {
  if (isEmailChannel(channelType)) {
    return {
      channelLabel: 'Email',
      contactSingular: 'email',
      contactPlural: 'emails',
      contactLabel: 'Emails',
      handleTimeLabel: 'Handling Time',
      averageHandleTimeLabel: 'Avg Handling Time',
      utilizationLabel: 'Productive Utilization'
    }
  }

  return {
    channelLabel: 'Phone Calls',
    contactSingular: 'contact',
    contactPlural: 'contacts',
    contactLabel: 'Contacts',
    handleTimeLabel: 'AHT',
    averageHandleTimeLabel: 'Avg AHT',
    utilizationLabel: 'Occupancy'
  }
}

export const describeChannelServiceGoal = (entity = {}) => {
  const channelType = normalizeStaffingChannel(entity?.channelType)
  const serviceGoal = resolveChannelServiceGoal(entity, channelType)
  const threshold = Number.isInteger(serviceGoal.threshold)
    ? String(serviceGoal.threshold)
    : serviceGoal.threshold.toFixed(1)

  return isEmailChannel(channelType)
    ? `${serviceGoal.targetPercent}% within ${threshold} business hours`
    : `${serviceGoal.targetPercent}% in ${threshold}s`
}
