import { describe, expect, it } from 'vitest'

import {
  buildPlannerIntradayErlangInputSignature,
  buildPlannerIntradayErlangPayload
} from '../intradayErlang'
import {
  buildPlanDemandRecords,
  buildPlanIntradayPayloadArgs,
  resolvePlanRequirementRecords
} from '../planRequirementRecords'

const center = {
  operatingWeekdays: [1, 2, 3, 4, 5],
  operatingOpenTime: '08:00',
  operatingCloseTime: '09:00'
}

const group = {
  serviceLevelPercent: 80,
  serviceLevelThresholdSeconds: 20,
  intraday: {
    intervalLengthMinutes: 30,
    intervalRatios: [
      { startTime: '08:00', ratioPercent: 50 },
      { startTime: '08:30', ratioPercent: 50 }
    ]
  }
}

const buildPlan = (overrides = {}) => ({
  id: 'erlang-plan',
  name: '2027 Erlang Plan',
  planningYear: 2027,
  requirementMethod: 'intraday_erlang',
  operatingWeekdays: [1, 2, 3, 4, 5],
  operatingOpenTime: '08:00',
  operatingCloseTime: '09:00',
  serviceLevelPercent: 80,
  serviceLevelThresholdSeconds: 20,
  intraday: group.intraday,
  presenceMonths: Array.from({ length: 12 }, () => ({ monthlyPaidHoursPerFte: 160 })),
  randomDefaults: { occupancyPercent: 90, adherencePercent: 95 },
  planMonths: Array.from({ length: 12 }, () => ({ contacts: 0, ahtSeconds: 300 })),
  demandSource: {
    mode: 'forecast',
    forecastDailySnapshot: [
      { serviceDate: '2027-01-04', monthIndex: 0, contacts: 100, ahtSeconds: 300 }
    ],
    forecastMonthSnapshot: [
      { monthIndex: 0, monthLabel: 'Jan 2027', contacts: 100, ahtSeconds: 300 }
    ]
  },
  ...overrides
})

const attachCurrentResults = (plan, monthlyOutputs = [
  {
    monthIndex: 0,
    workloadHours: 100 * 300 / 3600,
    erlangStaffedHours: 160,
    peakIntervalRequiredHeadcount: 12
  }
]) => {
  const baselineRecords = buildPlanDemandRecords(plan, center, 2027)
  const payload = buildPlannerIntradayErlangPayload({
    demandSource: plan.demandSource,
    ...buildPlanIntradayPayloadArgs({
      plan,
      center,
      group,
      planningYear: 2027,
      monthlyRecords: baselineRecords
    })
  })

  return {
    ...plan,
    intradayErlangResults: {
      version: 1,
      inputSignature: buildPlannerIntradayErlangInputSignature(payload.rows),
      rowCount: payload.rows.length,
      monthCount: monthlyOutputs.length,
      monthlyOutputs,
      dailyOutputs: [],
      intervalOutputs: []
    }
  }
}

describe('planRequirementRecords', () => {
  it('uses current stored Erlang outputs as the requirement source of truth', () => {
    const state = resolvePlanRequirementRecords({
      plan: attachCurrentResults(buildPlan()),
      center,
      group,
      planningYear: 2027
    })

    expect(state).toMatchObject({
      status: 'ready',
      requirementsAvailable: true,
      usesIntradayErlang: true
    })
    expect(state.records[0].erlangStaffedHours).toBe(160)
    expect(state.records[0].requiredStaffHours).toBeCloseTo(160 / 0.95, 6)
    expect(state.records[0].requiredHeadcount).toBeCloseTo((160 / 0.95) / 160, 6)
    expect(state.records[0].peakIntervalRequiredHeadcount).toBe(12)
  })

  it('withholds requirements when saved Erlang results are missing', () => {
    const state = resolvePlanRequirementRecords({
      plan: buildPlan(),
      center,
      group,
      planningYear: 2027
    })

    expect(state).toMatchObject({
      status: 'missing',
      requirementsAvailable: false
    })
    expect(state.records[0]).toMatchObject({
      requiredStaffHours: null,
      requiredHeadcount: null,
      peakDayRequiredHeadcount: null,
      peakIntervalRequiredHeadcount: null
    })
  })

  it('withholds requirements when saved Erlang results are stale or incomplete', () => {
    const currentPlan = attachCurrentResults(buildPlan())
    const staleState = resolvePlanRequirementRecords({
      plan: { ...currentPlan, serviceLevelPercent: 85 },
      center,
      group,
      planningYear: 2027
    })
    const incompleteState = resolvePlanRequirementRecords({
      plan: attachCurrentResults(buildPlan(), [{ monthIndex: 1, erlangStaffedHours: 10 }]),
      center,
      group,
      planningYear: 2027
    })

    expect(staleState.status).toBe('stale')
    expect(staleState.records[0].requiredHeadcount).toBeNull()
    expect(incompleteState.status).toBe('incomplete')
    expect(incompleteState.records[0].requiredHeadcount).toBeNull()
  })
})
