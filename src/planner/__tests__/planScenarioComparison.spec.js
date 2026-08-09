import { describe, expect, it } from 'vitest'

import {
  buildPlanScenarioComparison,
  buildPlanScenarioComparisonCsv
} from '../planScenarioComparison'

const center = {
  operatingWeekdays: [1, 2, 3, 4, 5],
  holidayCalendarId: 'none',
  customHolidays: []
}

const buildPlan = (overrides = {}) => ({
  id: 'budget-2027',
  name: '2027 Budget',
  planningYear: 2027,
  planType: 'budget',
  requirementMethod: 'workload_ratio',
  operatingWeekdays: [1, 2, 3, 4, 5],
  presenceMonths: Array.from({ length: 12 }, () => ({ paidHoursPerDay: 8 })),
  randomDefaults: { occupancyPercent: 100, adherencePercent: 100 },
  planMonths: Array.from({ length: 12 }, () => ({
    contacts: 1000,
    ahtSeconds: 360,
    peakDayUpliftPercent: 0
  })),
  startingHeadcount: 10,
  startingFrontlineHeadcount: 10,
  staffingMonths: Array.from({ length: 12 }, () => ({ frontlineAttritionHeadcount: 0 })),
  trainingClasses: [],
  trainingSettings: {},
  ...overrides
})

const buildUncalculatedIntradayPlan = (overrides = {}) => buildPlan({
  requirementMethod: 'intraday_erlang',
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
      { serviceDate: '2027-01-04', monthIndex: 0, contacts: 100, ahtSeconds: 300 }
    ],
    forecastMonthSnapshot: [
      { monthIndex: 0, monthLabel: 'Jan 2027', contacts: 100, ahtSeconds: 300 }
    ]
  },
  summary: {
    annualRequiredStaffHours: 9999,
    averageRequiredHeadcount: 99,
    peakRequiredHeadcount: 199,
    averageGapToRequirement: -89
  },
  ...overrides
})

describe('planScenarioComparison', () => {
  it('reconciles saved snapshots into annual and monthly candidate-minus-baseline deltas', () => {
    const baselinePlan = buildPlan()
    const candidatePlan = buildPlan({
      id: 'update-2027-03',
      name: '2027 March Update',
      planType: 'update',
      actualsThroughMonth: '2027-02-01',
      planMonths: Array.from({ length: 12 }, (_, index) => ({
        contacts: index === 2 ? 1250 : 1000,
        ahtSeconds: index === 2 ? 390 : 360,
        peakDayUpliftPercent: index === 2 ? 10 : 0
      })),
      randomDefaults: { occupancyPercent: 95, adherencePercent: 100 },
      startingHeadcount: 11,
      startingFrontlineHeadcount: 11
    })

    const comparison = buildPlanScenarioComparison({ baselinePlan, candidatePlan, center })

    expect(comparison.requirementMethodComparable).toBe(true)
    expect(comparison.baseline.metrics.annualContacts).toBe(12000)
    expect(comparison.candidate.metrics.annualContacts).toBe(12250)
    expect(comparison.metricRows.find((row) => row.label === 'Annual contacts')?.delta).toBe(250)
    expect(comparison.monthlyRows[2]).toMatchObject({
      monthLabel: 'March',
      contactsDelta: 250,
      ahtSecondsDelta: 30,
      occupancyPercentDelta: -5,
      peakDayUpliftPercentDelta: 10,
      endingFrontlineHeadcountDelta: 1
    })
    expect(comparison.monthlyRows[2].openingGapToRequirementDelta).toBeCloseTo(0.7688, 4)
    expect(comparison.monthlyRows[2].endingGapToRequirementDelta).toBeCloseTo(0.7688, 4)
    expect(comparison.monthlyRows[2].peakDayRequiredHeadcountDelta).toBeGreaterThan(0)
    expect(comparison.monthlyRows[0].contactsDelta).toBe(0)
  })

  it('withholds requirement and staffing deltas when saved plans use different methods', () => {
    const comparison = buildPlanScenarioComparison({
      baselinePlan: buildPlan(),
      candidatePlan: buildPlan({
        id: 'update-erlang',
        name: '2027 Erlang Update',
        planType: 'update',
        requirementMethod: 'intraday_erlang',
        summary: {
          annualContacts: 12500,
          annualWorkloadHours: 1250,
          annualRequiredStaffHours: 1800,
          averageRequiredHeadcount: 12,
          averageGapToRequirement: -2
        }
      }),
      center
    })

    expect(comparison.requirementMethodComparable).toBe(false)
    expect(comparison.methodWarning).toContain('Requirement methods differ')
    expect(comparison.metricRows.find((row) => row.label === 'Annual contacts')).toMatchObject({
      comparable: true,
      delta: 500
    })
    expect(comparison.metricRows.find((row) => row.label === 'Average required headcount')).toMatchObject({
      comparable: false,
      delta: null
    })
    expect(comparison.monthlyRows[0].requiredHeadcountDelta).toBeNull()
    expect(comparison.monthlyRows[0].openingGapToRequirementDelta).toBeNull()
    expect(comparison.monthlyRows[0].endingGapToRequirementDelta).toBeNull()
  })

  it('exports all monthly evidence and leaves withheld deltas blank', () => {
    const comparison = buildPlanScenarioComparison({
      baselinePlan: buildPlan(),
      candidatePlan: buildPlan({
        id: 'update-erlang',
        planType: 'update',
        requirementMethod: 'intraday_erlang'
      }),
      center
    })

    const csv = buildPlanScenarioComparisonCsv(comparison)
    const rows = csv.split('\r\n')
    const headers = rows[0].split(',')
    const january = rows[1].split(',')

    expect(rows).toHaveLength(13)
    expect(headers).toContain('aht_seconds_delta')
    expect(headers).toContain('presence_percentage_point_delta')
    expect(headers).toContain('peak_day_required_headcount_delta')
    expect(headers).toContain('opening_staffing_gap_delta')
    expect(headers).toContain('ending_staffing_gap_delta')
    expect(headers).not.toContain('staffing_gap_delta')
    expect(january[headers.indexOf('contacts_delta')]).toBe('0')
    expect(january[headers.indexOf('required_headcount_delta')]).toBe('')
    expect(january[headers.indexOf('peak_day_required_headcount_delta')]).toBe('')
  })

  it('withholds requirements and gaps when same-method Erlang results are unavailable', () => {
    const comparison = buildPlanScenarioComparison({
      baselinePlan: buildUncalculatedIntradayPlan({ name: '2027 Erlang Budget' }),
      candidatePlan: buildUncalculatedIntradayPlan({
        id: 'update-erlang',
        name: '2027 Erlang Update',
        planType: 'update'
      }),
      center
    })

    expect(comparison.requirementMethodComparable).toBe(true)
    expect(comparison.requirementsComparable).toBe(false)
    expect(comparison.requirementWarning).toContain('2027 Erlang Budget')
    expect(comparison.requirementWarning).toContain('2027 Erlang Update')
    expect(comparison.baseline.metrics).toMatchObject({
      annualRequiredStaffHours: null,
      averageRequiredHeadcount: null,
      peakRequiredHeadcount: null,
      averageOpeningGapToRequirement: null,
      averageEndingGapToRequirement: null
    })
    expect(comparison.monthlyRows[0]).toMatchObject({
      baselineRequiredHeadcount: null,
      candidateRequiredHeadcount: null,
      requiredHeadcountDelta: null,
      baselineOpeningGapToRequirement: null,
      openingGapToRequirementDelta: null
    })

    const csv = buildPlanScenarioComparisonCsv(comparison)
    const [headers, january] = csv.split('\r\n').map((row) => row.split(','))
    expect(january[headers.indexOf('baseline_required_headcount')]).toBe('')
    expect(january[headers.indexOf('candidate_required_headcount')]).toBe('')
    expect(january[headers.indexOf('required_headcount_delta')]).toBe('')
    expect(january[headers.indexOf('opening_staffing_gap_delta')]).toBe('')
  })
})
