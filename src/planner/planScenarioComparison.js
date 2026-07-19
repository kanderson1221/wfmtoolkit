import { buildCsv, formatCsvNumber } from '../csvExport'
import { computeMonthlyRecords, summarizePlanRecords } from './demandModel'
import { mergeIntradayErlangMonthlyRecords } from './intradayErlang'
import {
  getPlanRequirementMethodLabel,
  normalizePlanRequirementMethod,
  PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
} from './shared'
import { computeStaffingRecords, summarizeStaffingRecords } from './staffingModel'
import { resolvePlanHolidaySnapshot } from '../planningStorage'

const finiteOrNull = (value) => {
  if (value == null || value === '') {
    return null
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

const preferSavedMetric = (savedValue, computedValue) =>
  finiteOrNull(savedValue) ?? finiteOrNull(computedValue)

const average = (values) => {
  const finiteValues = values.map(finiteOrNull).filter((value) => value != null)
  return finiteValues.length
    ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
    : null
}

const buildMonthlyRecords = (plan, center) => {
  const planningYear = Number(plan?.planningYear)
  const requirementMethod = normalizePlanRequirementMethod(
    plan?.summary?.requirementMethod || plan?.requirementMethod
  )
  const holidaySnapshot = resolvePlanHolidaySnapshot(plan, center, planningYear)
  const baselineRecords = computeMonthlyRecords({
    planningYear,
    requirementMethod,
    demandSource: plan?.demandSource,
    operatingWeekdays:
      Array.isArray(plan?.operatingWeekdays) && plan.operatingWeekdays.length
        ? plan.operatingWeekdays
        : Array.isArray(center?.operatingWeekdays) && center.operatingWeekdays.length
          ? center.operatingWeekdays
          : [1, 2, 3, 4, 5],
    holidayCalendarId: holidaySnapshot.holidayCalendarId,
    disabledHolidayRuleIds: holidaySnapshot.disabledHolidayRuleIds,
    customHolidays: holidaySnapshot.customHolidays,
    holidayScheduleMode: plan?.holidayScheduleMode,
    presenceMonths: Array.isArray(plan?.presenceMonths) ? plan.presenceMonths : [],
    randomDefaults: plan?.randomDefaults || {},
    useMonthlyRandomOverrides: Boolean(plan?.useMonthlyRandomOverrides),
    randomMonths: Array.isArray(plan?.randomMonths) ? plan.randomMonths : [],
    planMonths: Array.isArray(plan?.planMonths) ? plan.planMonths : []
  })

  if (requirementMethod !== PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG) {
    return baselineRecords
  }

  const storedResults = plan?.intradayErlangResults || {}
  const monthlyOutputs = Array.isArray(storedResults.monthlyOutputs)
    ? storedResults.monthlyOutputs
    : Array.isArray(storedResults.monthlyPlans)
      ? storedResults.monthlyPlans
      : []
  const dailyOutputs = Array.isArray(storedResults.dailyOutputs)
    ? storedResults.dailyOutputs
    : Array.isArray(storedResults.dailyPlans)
      ? storedResults.dailyPlans
      : []

  return mergeIntradayErlangMonthlyRecords(
    baselineRecords,
    new Map(monthlyOutputs.map((row) => [Number(row.monthIndex), row])),
    dailyOutputs
  )
}

const resolveDemandSourceLabel = (plan) => {
  const demandSource = plan?.demandSource || {}
  return String(
    demandSource.forecastName ||
    demandSource.name ||
    demandSource.uploadedFileName ||
    demandSource.forecastVersionId ||
    (demandSource.mode === 'forecast' ? 'Saved forecast snapshot' : 'Plan worksheet')
  )
}

export const buildPlanScenarioSnapshot = (plan, center) => {
  const planningYear = Number(plan?.planningYear)
  const requirementMethod = normalizePlanRequirementMethod(
    plan?.summary?.requirementMethod || plan?.requirementMethod
  )
  const monthlyRecords = buildMonthlyRecords(plan, center)
  const planSummary = summarizePlanRecords(monthlyRecords)
  const holidaySnapshot = resolvePlanHolidaySnapshot(plan, center, planningYear)
  const staffingRecords = computeStaffingRecords(
    monthlyRecords,
    planningYear,
    plan?.startingHeadcount,
    plan?.startingFrontlineHeadcount,
    Array.isArray(plan?.staffingMonths) ? plan.staffingMonths : [],
    Array.isArray(plan?.trainingClasses) ? plan.trainingClasses : [],
    plan?.trainingSettings || {},
    {
      holidayCalendarId: holidaySnapshot.holidayCalendarId,
      disabledHolidayRuleIds: holidaySnapshot.disabledHolidayRuleIds,
      customHolidays: holidaySnapshot.customHolidays
    }
  )
  const staffingSummary = summarizeStaffingRecords(staffingRecords)
  const summary = plan?.summary || {}

  return {
    id: plan?.id || '',
    name: plan?.name || `${planningYear} Plan`,
    planningYear,
    planType: plan?.planType === 'update' ? 'update' : 'budget',
    requirementMethod,
    requirementMethodLabel: getPlanRequirementMethodLabel(requirementMethod),
    demandSourceLabel: resolveDemandSourceLabel(plan),
    actualsThroughMonth: String(plan?.actualsThroughMonth || ''),
    updatedAt: String(plan?.updatedAt || plan?.createdAt || ''),
    assumptions: {
      averagePaidHoursPerDay: average(monthlyRecords.map((row) => row.paidHoursPerDay)),
      averagePresencePercent: average(monthlyRecords.map((row) => row.presencePercent)),
      averageOccupancyPercent: average(monthlyRecords.map((row) => row.occupancyPercent)),
      averageAdherencePercent: average(monthlyRecords.map((row) => row.adherencePercent)),
      startingRosterHeadcount: finiteOrNull(plan?.startingHeadcount),
      startingFrontlineHeadcount: finiteOrNull(plan?.startingFrontlineHeadcount)
    },
    metrics: {
      annualContacts: preferSavedMetric(summary.annualContacts, planSummary.annualContacts),
      annualWorkloadHours: preferSavedMetric(summary.annualWorkloadHours, planSummary.annualWorkloadHours),
      annualRequiredStaffHours: preferSavedMetric(summary.annualRequiredStaffHours, planSummary.annualRequiredStaffHours),
      averageRequiredHeadcount: preferSavedMetric(summary.averageRequiredHeadcount, planSummary.averageRequiredHeadcount),
      peakRequiredHeadcount: preferSavedMetric(summary.peakRequiredHeadcount, planSummary.peakMonth?.requiredHeadcount),
      endingFrontlineHeadcount: preferSavedMetric(summary.endingFrontlineHeadcount, staffingSummary.endingFrontlineHeadcount),
      averageGapToRequirement: preferSavedMetric(summary.averageGapToRequirement, staffingSummary.averageGapToRequirement)
    },
    monthlyRows: monthlyRecords.map((row, index) => ({
      monthIndex: row.monthIndex,
      monthLabel: row.fullLabel,
      contacts: finiteOrNull(row.contacts),
      workloadHours: finiteOrNull(row.workloadHours),
      requiredStaffHours: finiteOrNull(row.requiredStaffHours),
      requiredHeadcount: finiteOrNull(row.requiredHeadcount),
      endingFrontlineHeadcount: finiteOrNull(staffingRecords[index]?.endingFrontlineHeadcount),
      gapToRequirement: finiteOrNull(staffingRecords[index]?.gapToRequirement)
    }))
  }
}

const delta = (baselineValue, candidateValue) => {
  const baselineNumber = finiteOrNull(baselineValue)
  const candidateNumber = finiteOrNull(candidateValue)
  return baselineNumber == null || candidateNumber == null ? null : candidateNumber - baselineNumber
}

export const buildPlanScenarioComparison = ({ baselinePlan, candidatePlan, center }) => {
  if (!baselinePlan || !candidatePlan) {
    return null
  }

  const baseline = buildPlanScenarioSnapshot(baselinePlan, center)
  const candidate = buildPlanScenarioSnapshot(candidatePlan, center)
  const sameYear = baseline.planningYear === candidate.planningYear
  const requirementMethodComparable = baseline.requirementMethod === candidate.requirementMethod

  return {
    baseline,
    candidate,
    sameYear,
    requirementMethodComparable,
    methodWarning: requirementMethodComparable
      ? ''
      : 'Requirement methods differ. Demand and workload remain comparable; requirement, supply-gap, and staffing-risk deltas are withheld.',
    metricRows: [
      ['Annual contacts', 'contacts', baseline.metrics.annualContacts, candidate.metrics.annualContacts, true],
      ['Annual workload hours', 'hours', baseline.metrics.annualWorkloadHours, candidate.metrics.annualWorkloadHours, true],
      ['Annual required staff hours', 'hours', baseline.metrics.annualRequiredStaffHours, candidate.metrics.annualRequiredStaffHours, requirementMethodComparable],
      ['Average required headcount', 'headcount', baseline.metrics.averageRequiredHeadcount, candidate.metrics.averageRequiredHeadcount, requirementMethodComparable],
      ['Peak required headcount', 'headcount', baseline.metrics.peakRequiredHeadcount, candidate.metrics.peakRequiredHeadcount, requirementMethodComparable],
      ['Ending frontline headcount', 'headcount', baseline.metrics.endingFrontlineHeadcount, candidate.metrics.endingFrontlineHeadcount, requirementMethodComparable],
      ['Average staffing gap', 'headcount', baseline.metrics.averageGapToRequirement, candidate.metrics.averageGapToRequirement, requirementMethodComparable]
    ].map(([label, unit, baselineValue, candidateValue, comparable]) => ({
      label,
      unit,
      baselineValue,
      candidateValue,
      comparable,
      delta: comparable ? delta(baselineValue, candidateValue) : null
    })),
    monthlyRows: baseline.monthlyRows.map((baselineRow, index) => {
      const candidateRow = candidate.monthlyRows[index] || {}
      return {
        monthIndex: baselineRow.monthIndex,
        monthLabel: baselineRow.monthLabel,
        baselineContacts: baselineRow.contacts,
        candidateContacts: candidateRow.contacts,
        contactsDelta: delta(baselineRow.contacts, candidateRow.contacts),
        baselineRequiredHeadcount: baselineRow.requiredHeadcount,
        candidateRequiredHeadcount: candidateRow.requiredHeadcount,
        requiredHeadcountDelta: requirementMethodComparable
          ? delta(baselineRow.requiredHeadcount, candidateRow.requiredHeadcount)
          : null,
        baselineEndingFrontlineHeadcount: baselineRow.endingFrontlineHeadcount,
        candidateEndingFrontlineHeadcount: candidateRow.endingFrontlineHeadcount,
        endingFrontlineHeadcountDelta: requirementMethodComparable
          ? delta(baselineRow.endingFrontlineHeadcount, candidateRow.endingFrontlineHeadcount)
          : null,
        baselineGapToRequirement: baselineRow.gapToRequirement,
        candidateGapToRequirement: candidateRow.gapToRequirement,
        gapToRequirementDelta: requirementMethodComparable
          ? delta(baselineRow.gapToRequirement, candidateRow.gapToRequirement)
          : null
      }
    })
  }
}

export const buildPlanScenarioComparisonCsv = (comparison) => buildCsv(
  [
    { header: 'month', value: (row) => row.monthLabel },
    { header: 'baseline_contacts', value: (row) => formatCsvNumber(row.baselineContacts, 0) },
    { header: 'candidate_contacts', value: (row) => formatCsvNumber(row.candidateContacts, 0) },
    { header: 'contacts_delta', value: (row) => formatCsvNumber(row.contactsDelta, 0) },
    { header: 'baseline_required_headcount', value: (row) => formatCsvNumber(row.baselineRequiredHeadcount, 2) },
    { header: 'candidate_required_headcount', value: (row) => formatCsvNumber(row.candidateRequiredHeadcount, 2) },
    { header: 'required_headcount_delta', value: (row) => formatCsvNumber(row.requiredHeadcountDelta, 2) },
    { header: 'baseline_ending_frontline_headcount', value: (row) => formatCsvNumber(row.baselineEndingFrontlineHeadcount, 2) },
    { header: 'candidate_ending_frontline_headcount', value: (row) => formatCsvNumber(row.candidateEndingFrontlineHeadcount, 2) },
    { header: 'ending_frontline_headcount_delta', value: (row) => formatCsvNumber(row.endingFrontlineHeadcountDelta, 2) },
    { header: 'baseline_staffing_gap', value: (row) => formatCsvNumber(row.baselineGapToRequirement, 2) },
    { header: 'candidate_staffing_gap', value: (row) => formatCsvNumber(row.candidateGapToRequirement, 2) },
    { header: 'staffing_gap_delta', value: (row) => formatCsvNumber(row.gapToRequirementDelta, 2) }
  ],
  comparison?.monthlyRows || []
)
