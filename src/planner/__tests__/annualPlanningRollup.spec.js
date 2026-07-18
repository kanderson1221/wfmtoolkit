import { describe, expect, it } from 'vitest'

import { buildAnnualPlanningRollup, selectPlanningRollupPlan } from '../annualPlanningRollup'

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
})
