import { FULL_MONTH_LABELS, MONTH_LABELS, buildStaffingMonths, createTrainingSettings } from '../shared'
import {
  computeStaffingRecords,
  deriveTrainingClassMetrics,
  recommendTrainingClasses,
  summarizeStaffingRecords
} from '../staffingModel'

const buildMonthlyRecords = (requirements = {}) =>
  MONTH_LABELS.map((label, monthIndex) => ({
    monthIndex,
    label,
    fullLabel: FULL_MONTH_LABELS[monthIndex],
    requiredHeadcount: requirements[monthIndex] ?? 0,
    peakDayRequiredHeadcount: requirements[monthIndex] ?? 0,
    roundedHeadcount: requirements[monthIndex] ?? 0
  }))

describe('staffingModel', () => {
  it('rejects invalid ISO hire dates instead of rolling them into another month', () => {
    const invalidTrainingClass = {
      id: 'invalid-date-class',
      hireDate: '2026-02-30',
      hireCount: 10
    }
    const metrics = deriveTrainingClassMetrics(
      invalidTrainingClass,
      createTrainingSettings({
        trainingDurationWorkdays: 5,
        postTrainingNestingDays: 0
      })
    )
    const staffingRecords = computeStaffingRecords(
      buildMonthlyRecords(),
      2026,
      20,
      20,
      buildStaffingMonths(),
      [invalidTrainingClass],
      createTrainingSettings({
        trainingDurationWorkdays: 5,
        postTrainingNestingDays: 0
      })
    )

    expect(metrics).toMatchObject({
      hireDate: null,
      graduationDate: null,
      frontlineReadyDate: null,
      isValid: false
    })
    expect(staffingRecords[2]).toMatchObject({
      hireHeadcount: 0,
      graduatingHeadcount: 0,
      frontlineReadyHeadcount: 0,
      endingRosterHeadcount: 20,
      endingFrontlineHeadcount: 20
    })
  })

  it('extends training over weekday holidays while keeping a Monday-Friday calendar', () => {
    const metrics = deriveTrainingClassMetrics(
      {
        hireDate: '2026-12-22',
        hireCount: 10
      },
      createTrainingSettings({
        trainingDurationWorkdays: 4,
        postTrainingNestingDays: 1
      }),
      {
        customHolidays: [
          { id: 'christmas', label: 'Christmas Day', date: '2026-12-25' }
        ]
      }
    )

    expect(metrics.graduationDate.toISOString().slice(0, 10)).toBe('2026-12-28')
    expect(metrics.frontlineReadyDate.toISOString().slice(0, 10)).toBe('2026-12-29')
  })

  it('backs recommended class starts up over weekday holidays', () => {
    const recommendations = recommendTrainingClasses({
      monthlyRecords: buildMonthlyRecords({
        1: 10
      }),
      planningYear: 2026,
      startingHeadcount: 0,
      startingFrontlineHeadcount: 0,
      staffingMonths: buildStaffingMonths(),
      trainingClasses: [],
      trainingSettings: createTrainingSettings({
        trainingDurationWorkdays: 5,
        postTrainingNestingDays: 0,
        graduationYieldPercent: 100,
        availableTrainers: 1,
        maxClassSize: 10,
        startOnFirstBusinessDayOfWeek: false
      }),
      trainingCalendar: {
        customHolidays: [
          { id: 'january-holiday', label: 'January Holiday', date: '2026-01-28' }
        ]
      }
    })

    expect(recommendations).toHaveLength(1)
    expect(recommendations[0].hireDate).toBe('2026-01-23')
  })

  it('uses prior-year carry-in classes in January without counting them as next-year hires', () => {
    const staffingRecords = computeStaffingRecords(
      buildMonthlyRecords(),
      2027,
      30,
      10,
      buildStaffingMonths(),
      [
        {
          id: 'carry-in-class',
          hireDate: '2026-12-18',
          hireCount: 20,
          graduationDate: '2027-01-05',
          frontlineReadyDate: '2027-01-12',
          graduatingHeadcount: 20,
          projectedGraduatingHeadcount: 18,
          trainingFalloutHeadcount: 2
        }
      ],
      createTrainingSettings({
        trainingDurationWorkdays: 4,
        postTrainingNestingDays: 1,
        graduationYieldPercent: 50
      })
    )

    expect(staffingRecords[0]).toMatchObject({
      startingRosterHeadcount: 30,
      startingFrontlineHeadcount: 10,
      startingInTrainingHeadcount: 20,
      hireHeadcount: 0,
      graduatingHeadcount: 20,
      frontlineReadyHeadcount: 18
    })
    expect(staffingRecords[0].endingFrontlineHeadcount).toBe(28)
  })

  it('can add late-year classes to land on a next-January opening frontline target', () => {
    const recommendations = recommendTrainingClasses({
      monthlyRecords: buildMonthlyRecords(),
      planningYear: 2026,
      startingHeadcount: 0,
      startingFrontlineHeadcount: 0,
      staffingMonths: buildStaffingMonths(),
      trainingClasses: [],
      trainingSettings: createTrainingSettings({
        trainingDurationWorkdays: 5,
        postTrainingNestingDays: 0,
        graduationYieldPercent: 100,
        availableTrainers: 2,
        maxClassSize: 20
      }),
      targetNextYearStartingFrontlineHeadcount: 18
    })

    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations.every((trainingClass) => trainingClass.source === 'recommended')).toBe(true)
    expect(recommendations.every((trainingClass) => trainingClass.hireDate.startsWith('2026-12'))).toBe(true)

    const finalProjection = computeStaffingRecords(
      buildMonthlyRecords(),
      2026,
      0,
      0,
      buildStaffingMonths(),
      recommendations,
      createTrainingSettings({
        trainingDurationWorkdays: 5,
        postTrainingNestingDays: 0,
        graduationYieldPercent: 100,
        availableTrainers: 2,
        maxClassSize: 20
      })
    )

    expect(finalProjection[11].endingFrontlineHeadcount).toBeGreaterThanOrEqual(18)
  })

  it('accounts for prior-year carry-in classes when recommending current-year classes', () => {
    const recommendations = recommendTrainingClasses({
      monthlyRecords: buildMonthlyRecords({
        1: 28
      }),
      planningYear: 2027,
      startingHeadcount: 30,
      startingFrontlineHeadcount: 10,
      staffingMonths: buildStaffingMonths(),
      trainingClasses: [
        {
          id: 'carry-in-class',
          hireDate: '2026-12-18',
          hireCount: 20,
          graduationDate: '2027-01-05',
          frontlineReadyDate: '2027-01-12',
          graduatingHeadcount: 20,
          projectedGraduatingHeadcount: 18,
          trainingFalloutHeadcount: 2
        }
      ],
      trainingSettings: createTrainingSettings({
        trainingDurationWorkdays: 4,
        postTrainingNestingDays: 1,
        graduationYieldPercent: 90,
        availableTrainers: 2,
        maxClassSize: 20
      })
    })

    expect(recommendations).toHaveLength(0)
  })

  it('leaves the recommendation set empty when no next-year frontline target is needed', () => {
    const recommendations = recommendTrainingClasses({
      monthlyRecords: buildMonthlyRecords(),
      planningYear: 2026,
      startingHeadcount: 18,
      startingFrontlineHeadcount: 18,
      staffingMonths: buildStaffingMonths(),
      trainingClasses: [],
      trainingSettings: createTrainingSettings({
        trainingDurationWorkdays: 5,
        postTrainingNestingDays: 0,
        graduationYieldPercent: 100,
        availableTrainers: 2,
        maxClassSize: 20
      }),
      targetNextYearStartingFrontlineHeadcount: 12
    })

    expect(recommendations).toHaveLength(0)
  })

  it('preserves unavailable requirement gaps and skips hiring recommendations for them', () => {
    const monthlyRecords = buildMonthlyRecords()
    monthlyRecords[0] = {
      ...monthlyRecords[0],
      requiredHeadcount: null,
      roundedHeadcount: null,
      peakDayRequiredHeadcount: null
    }

    const staffingRecords = computeStaffingRecords(
      monthlyRecords,
      2026,
      10,
      10,
      buildStaffingMonths(),
      [],
      createTrainingSettings()
    )
    const recommendations = recommendTrainingClasses({
      monthlyRecords,
      planningYear: 2026,
      startingHeadcount: 10,
      startingFrontlineHeadcount: 10,
      staffingMonths: buildStaffingMonths(),
      trainingClasses: [],
      trainingSettings: createTrainingSettings()
    })
    const summary = summarizeStaffingRecords(staffingRecords)

    expect(staffingRecords[0]).toMatchObject({
      requiredHeadcount: null,
      roundedRequiredHeadcount: null,
      gapToRequirement: null,
      gapToRoundedRequirement: null,
      isBelowRequirement: false
    })
    expect(recommendations).toHaveLength(0)
    expect(summary).toMatchObject({
      averageGapToRequirement: null,
      peakShortageMonth: null
    })
  })
})
