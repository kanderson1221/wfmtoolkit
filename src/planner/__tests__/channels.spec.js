import { describe, expect, it } from 'vitest'

import {
  STAFFING_CHANNEL_EMAIL,
  STAFFING_CHANNEL_VOICE,
  createChannelServiceGoal,
  describeChannelServiceGoal,
  normalizeRequirementMethodForChannel,
  normalizeStaffingChannel,
  resolveChannelServiceGoal
} from '../channels'

describe('staffing channels', () => {
  it('migrates missing channel data to voice', () => {
    expect(normalizeStaffingChannel()).toBe(STAFFING_CHANNEL_VOICE)
    expect(resolveChannelServiceGoal({
      serviceLevelPercent: 85,
      serviceLevelThresholdSeconds: 30
    })).toEqual({
      targetPercent: 85,
      threshold: 30,
      thresholdUnit: 'seconds'
    })
  })

  it('creates an email response target in business hours', () => {
    const serviceGoal = createChannelServiceGoal(STAFFING_CHANNEL_EMAIL)

    expect(serviceGoal).toEqual({
      targetPercent: 90,
      threshold: 24,
      thresholdUnit: 'business_hours'
    })
    expect(describeChannelServiceGoal({ channelType: 'email', serviceGoal })).toBe('90% within 24 business hours')
  })

  it('forces email plans to workload ratio', () => {
    expect(normalizeRequirementMethodForChannel('intraday_erlang', STAFFING_CHANNEL_EMAIL)).toBe('workload_ratio')
    expect(normalizeRequirementMethodForChannel('intraday_erlang', STAFFING_CHANNEL_VOICE)).toBe('intraday_erlang')
  })
})
