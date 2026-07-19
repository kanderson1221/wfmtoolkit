import { describe, expect, it } from 'vitest'

import {
  buildAnnualPlanningRollup,
  buildPlanDemandRecords,
  selectPlanningRollupPlan
} from '../annualPlanningRollup'
import {
  buildPlannerActualsIntradayErlangPayload,
  buildPlannerIntradayErlangInputSignature,
  buildPlannerIntradayErlangPayload
} from '../intradayErlang'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../shared'

const buildPlanMonths = (contacts, ahtSeconds = 360) =>
  Array.from({ length: 12 }, () => ({
    contacts,
    ahtSeconds,
    peakDayUpliftPercent: 0
  }))

const buildPresenceMonths = () =>
  Array.from({ length: 12 }, () => ({
    paidHoursPerDay: 8
  }))

const buildIntradayPlan = () => ({
  id: 'erlang-2026',
  name: '2026 Erlang Plan',
  planningYear: 2026,
  planType: 'budget',
  isCurrent: true,
  requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
  operatingWeekdays: [1, 2, 3, 4, 5],
  operatingOpenTime: '08:00',
  operatingCloseTime: '09:00',
  serviceLevelPercent: 80,
  serviceLevelThresholdSeconds: 20,
  intraday: {
    intervalLengthMinutes: 30,
    intervalRatios: [
      { startTime: '08:00', ratioPercent: 50 },
      { startTime: '08:30', ratioPercent: 50 }
    ]
  },
  demandSource: {
    mode: 'forecast',
    forecastDailySnapshot: [
      { serviceDate: '2026-01-02', monthIndex: 0, contacts: 100 }
    ],
    forecastMonthSnapshot: [
      { monthIndex: 0, monthLabel: 'Jan 2026', contacts: 100, ahtSeconds: 300 }
    ]
  },
  presenceMonths: buildPresenceMonths(),
  randomDefaults: {
    occupancyPercent: 90,
    adherencePercent: 95
  },
  startingHeadcount: 5,
  startingFrontlineHeadcount: 5,
  staffingMonths: []
})

const attachCurrentIntradayResults = (plan, center) => {
  const monthlyRecords = buildPlanDemandRecords(plan, center, 2026)
  const payload = buildPlannerIntradayErlangPayload({
    planningYear: 2026,
    demandSource: plan.demandSource,
    monthlyRecords,
    operatingWeekdays: plan.operatingWeekdays,
    operatingOpenTime: plan.operatingOpenTime,
    operatingCloseTime: plan.operatingCloseTime,
    serviceLevelPercent: plan.serviceLevelPercent,
    serviceLevelThresholdSeconds: plan.serviceLevelThresholdSeconds,
    intraday: plan.intraday
  })

  plan.intradayErlangResults = {
    version: 1,
    inputSignature: buildPlannerIntradayErlangInputSignature(payload.rows),
    rowCount: payload.rows.length,
    monthCount: 1,
    monthlyOutputs: [
      {
        monthIndex: 0,
        workloadHours: 100 * 300 / 3600,
        erlangStaffedHours: 160,
        weightedOccupancyPercent: 84,
        weightedServiceLevelPercent: 80,
        peakIntervalRequiredHeadcount: 12
      }
    ],
    intervalOutputs: [],
    dailyOutputs: []
  }

  return plan
}

const attachCurrentActualsIntradayResults = (plan, center, erlangStaffedHours = 180) => {
  const group = center.groups[0]
  const baselineRecords = buildPlanDemandRecords(plan, center, 2026)
  const payload = buildPlannerActualsIntradayErlangPayload({
    planningYear: 2026,
    actualDailyRows: group.actuals.dailyRows,
    monthlyRecords: baselineRecords,
    operatingWeekdays: plan.operatingWeekdays,
    operatingOpenTime: plan.operatingOpenTime,
    operatingCloseTime: plan.operatingCloseTime,
    serviceLevelPercent: plan.serviceLevelPercent,
    serviceLevelThresholdSeconds: plan.serviceLevelThresholdSeconds,
    intraday: plan.intraday
  })

  plan.actualsIntradayErlangResults = {
    version: 1,
    inputSignature: buildPlannerIntradayErlangInputSignature(payload.rows),
    rowCount: payload.rows.length,
    monthCount: 1,
    monthlyOutputs: [{ monthIndex: 0, erlangStaffedHours }],
    intervalOutputs: [],
    dailyOutputs: []
  }

  return plan
}

const buildCenter = (groupOverrides = {}) => ({
  id: 'center-1',
  name: 'Support',
  operatingWeekdays: [1, 2, 3, 4, 5],
  operatingOpenTime: '08:00',
  operatingCloseTime: '18:00',
  groups: [
    {
      id: 'group-1',
      name: 'Voice',
      actuals: {
        sourceMode: 'daily_upload',
        dailyRows: [
          { serviceDate: '2026-01-02', contacts: 1200, ahtSeconds: 300 },
          { serviceDate: '2026-01-03', contacts: 800, ahtSeconds: 300 }
        ]
      },
      plans: [
        {
          id: 'budget-2026',
          name: '2026 Budget',
          planningYear: 2026,
          planType: 'budget',
          isCurrent: true,
          planMonths: buildPlanMonths(1000, 360),
          presenceMonths: buildPresenceMonths(),
          randomDefaults: {
            occupancyPercent: 100,
            adherencePercent: 100
          },
          startingHeadcount: 5,
          startingFrontlineHeadcount: 5,
          staffingMonths: []
        }
      ],
      ...groupOverrides
    }
  ]
})

describe('annualPlanningRollup', () => {
  it('rolls expected monthly plan data together with loaded actuals', () => {
    const rollup = buildAnnualPlanningRollup({
      centers: [buildCenter()],
      planningYear: 2026
    })
    const january = rollup.monthlyRows[0]

    expect(january.monthLabel).toBe('Jan 2026')
    expect(january.expectedContacts).toBe(1000)
    expect(january.actualContacts).toBe(2000)
    expect(january.contactVariance).toBe(1000)
    expect(january.actualAhtSeconds).toBe(300)
    expect(january.daysLoaded).toBe(2)
    expect(january.actualRequiredHeadcount).toBeGreaterThan(0)
    expect(january.staffingGroupRows).toHaveLength(1)
    expect(january.staffingGroupRows[0]).toMatchObject({
      groupName: 'Voice',
      plannedContacts: 1000,
      actualContacts: 2000
    })
    expect(rollup.annualTotalRow).toMatchObject({
      monthLabel: 'Total / Avg',
      plannedContacts: 12000,
      actualContacts: 2000
    })
    expect(rollup.summary.groupCount).toBe(1)
    expect(rollup.summary.plannedGroupCount).toBe(1)
    expect(rollup.summary.groupsWithActualsCount).toBe(1)
    expect(rollup.summary.monthsWithActualsCount).toBe(1)
  })

  it('uses the current plan for the selected planning year when one exists', () => {
    const budgetPlan = {
      id: 'budget-2026',
      planningYear: 2026,
      planType: 'budget',
      isCurrent: false
    }
    const updatePlan = {
      id: 'update-2026',
      planningYear: 2026,
      planType: 'update',
      isCurrent: true
    }
    const group = {
      plans: [budgetPlan, updatePlan]
    }

    expect(selectPlanningRollupPlan(group, 2026)).toBe(updatePlan)
    expect(selectPlanningRollupPlan(group, 2026, 'budget')).toBe(budgetPlan)
  })

  it('rolls staffing movement fields for call-center reporting', () => {
    const rollup = buildAnnualPlanningRollup({
      centers: [
        buildCenter({
          plans: [
            {
              id: 'budget-2026',
              name: '2026 Budget',
              planningYear: 2026,
              planType: 'budget',
              isCurrent: true,
              planMonths: buildPlanMonths(1000, 360),
              presenceMonths: buildPresenceMonths(),
              randomDefaults: {
                occupancyPercent: 100,
                adherencePercent: 100
              },
              startingHeadcount: 10,
              startingFrontlineHeadcount: 10,
              staffingMonths: [
                { frontlineAttritionHeadcount: 3 }
              ],
              trainingClasses: [
                {
                  id: 'jan-class',
                  hireDate: '2026-01-02',
                  hireCount: 7,
                  graduationDate: '2026-01-09',
                  frontlineReadyDate: '2026-01-12',
                  graduatingHeadcount: 7,
                  projectedGraduatingHeadcount: 7,
                  trainingFalloutHeadcount: 0
                }
              ],
              trainingSettings: {}
            }
          ]
        })
      ],
      planningYear: 2026
    })
    const january = rollup.monthlyRows[0]

    expect(january.startingFrontlineHeadcount).toBe(10)
    expect(january.hireHeadcount).toBe(7)
    expect(january.graduatingHeadcount).toBe(7)
    expect(january.frontlineReadyHeadcount).toBe(7)
    expect(january.frontlineAttritionHeadcount).toBe(3)
    expect(january.endingFrontlineHeadcount).toBe(14)
  })

  it('uses only current saved Intraday Erlang outputs and withholds unpersisted actual requirements', () => {
    const center = buildCenter({ plans: [] })
    const plan = attachCurrentIntradayResults(buildIntradayPlan(), center)
    center.groups[0].plans = [plan]

    const rollup = buildAnnualPlanningRollup({ centers: [center], planningYear: 2026 })
    const january = rollup.monthlyRows[0]

    expect(january.plannedContacts).toBe(100)
    expect(january.plannedWorkloadHours).toBeCloseTo(100 * 300 / 3600, 6)
    expect(january.plannedRequiredHeadcount).toBeCloseTo((160 / 0.95) / (22 * 8), 6)
    expect(january.actualRequiredHeadcount).toBeNull()
    expect(january.requiredHeadcountVariance).toBeNull()
    expect(rollup.integrityIssues).toEqual([
      expect.objectContaining({
        groupName: 'Voice',
        planName: '2026 Erlang Plan',
        status: 'missing',
        plannedRequirementAvailable: true,
        actualRequirementAvailable: false
      })
    ])
  })

  it('uses matching saved actual Intraday Erlang outputs in call-center variance', () => {
    const center = buildCenter({ plans: [] })
    const plan = attachCurrentActualsIntradayResults(
      attachCurrentIntradayResults(buildIntradayPlan(), center),
      center
    )
    center.groups[0].plans = [plan]

    const rollup = buildAnnualPlanningRollup({ centers: [center], planningYear: 2026 })
    const january = rollup.monthlyRows[0]

    expect(january.actualRequiredHeadcount).toBeCloseTo((180 / 0.95) / (22 * 8), 6)
    expect(january.requiredHeadcountVariance).toBeCloseTo(
      january.actualRequiredHeadcount - january.plannedRequiredHeadcount,
      6
    )
    expect(january.gapVsActualRequiredHeadcount).toBeCloseTo(
      january.plannedStartingFrontlineHeadcount - january.actualRequiredHeadcount,
      6
    )
    expect(rollup.integrityIssues).toEqual([])
  })

  it('withholds saved actual Intraday Erlang outputs after actuals or plan inputs change', () => {
    const center = buildCenter({ plans: [] })
    const plan = attachCurrentActualsIntradayResults(
      attachCurrentIntradayResults(buildIntradayPlan(), center),
      center
    )
    plan.actualsIntradayErlangResults.inputSignature = 'v1:stale'
    center.groups[0].plans = [plan]

    const rollup = buildAnnualPlanningRollup({ centers: [center], planningYear: 2026 })

    expect(rollup.monthlyRows[0].actualRequiredHeadcount).toBeNull()
    expect(rollup.monthlyRows[0].requiredHeadcountVariance).toBeNull()
    expect(rollup.integrityIssues[0]).toMatchObject({
      status: 'stale',
      plannedRequirementAvailable: true,
      actualRequirementAvailable: false,
      message: expect.stringContaining('Rerun actual staffing calculations')
    })
  })

  it('withholds stale Intraday Erlang requirements without hiding demand and workload', () => {
    const center = buildCenter({ plans: [] })
    const plan = attachCurrentIntradayResults(buildIntradayPlan(), center)
    plan.serviceLevelPercent = 85
    center.groups[0].plans = [plan]

    const rollup = buildAnnualPlanningRollup({ centers: [center], planningYear: 2026 })
    const january = rollup.monthlyRows[0]

    expect(january.plannedContacts).toBe(100)
    expect(january.plannedWorkloadHours).toBeCloseTo(100 * 300 / 3600, 6)
    expect(january.plannedRequiredHeadcount).toBeNull()
    expect(january.gapToRequirement).toBeNull()
    expect(rollup.annualTotalRow.plannedRequiredHeadcount).toBeNull()
    expect(rollup.integrityIssues[0]).toMatchObject({
      status: 'stale',
      plannedRequirementAvailable: false,
      actualRequirementAvailable: false,
      message: expect.stringContaining('withheld')
    })
  })

  it('withholds partial actual requirement across workload-ratio and Intraday Erlang groups', () => {
    const center = buildCenter()
    const intradayPlan = attachCurrentIntradayResults(buildIntradayPlan(), center)
    center.groups.push({
      ...center.groups[0],
      id: 'group-2',
      name: 'Chat',
      plans: [intradayPlan]
    })

    const january = buildAnnualPlanningRollup({ centers: [center], planningYear: 2026 }).monthlyRows[0]
    const workloadGroupRow = january.staffingGroupRows.find((row) => row.groupName === 'Voice')
    const intradayGroupRow = january.staffingGroupRows.find((row) => row.groupName === 'Chat')

    expect(workloadGroupRow.actualRequiredHeadcount).toBeGreaterThan(0)
    expect(intradayGroupRow.actualRequiredHeadcount).toBeNull()
    expect(january.actualRequiredHeadcount).toBeNull()
    expect(january.requiredHeadcountVariance).toBeNull()
    expect(january.gapVsActualRequiredHeadcount).toBeNull()
  })
})
