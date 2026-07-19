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
    decisionReason: String(plan?.decisionReason || ''),
    updatedAt: String(plan?.updatedAt || plan?.createdAt || ''),
    assumptions: {
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
      ahtSeconds: finiteOrNull(row.ahtSeconds),
      openDays: finiteOrNull(row.openDays),
      paidHoursPerDay: finiteOrNull(row.paidHoursPerDay),
      presencePercent: finiteOrNull(row.presencePercent),
      occupancyPercent: finiteOrNull(row.occupancyPercent),
      adherencePercent: finiteOrNull(row.adherencePercent),
      peakDayUpliftPercent: finiteOrNull(row.peakDayUpliftPercent),
      workloadHours: finiteOrNull(row.workloadHours),
      requiredStaffHours: finiteOrNull(row.requiredStaffHours),
      requiredHeadcount: finiteOrNull(row.requiredHeadcount),
      peakDayRequiredHeadcount: finiteOrNull(row.peakDayRequiredHeadcount),
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
        baselineAhtSeconds: baselineRow.ahtSeconds,
        candidateAhtSeconds: candidateRow.ahtSeconds,
        ahtSecondsDelta: delta(baselineRow.ahtSeconds, candidateRow.ahtSeconds),
        baselineOpenDays: baselineRow.openDays,
        candidateOpenDays: candidateRow.openDays,
        openDaysDelta: delta(baselineRow.openDays, candidateRow.openDays),
        baselinePaidHoursPerDay: baselineRow.paidHoursPerDay,
        candidatePaidHoursPerDay: candidateRow.paidHoursPerDay,
        paidHoursPerDayDelta: delta(baselineRow.paidHoursPerDay, candidateRow.paidHoursPerDay),
        baselinePresencePercent: baselineRow.presencePercent,
        candidatePresencePercent: candidateRow.presencePercent,
        presencePercentDelta: delta(baselineRow.presencePercent, candidateRow.presencePercent),
        baselineOccupancyPercent: baselineRow.occupancyPercent,
        candidateOccupancyPercent: candidateRow.occupancyPercent,
        occupancyPercentDelta: delta(baselineRow.occupancyPercent, candidateRow.occupancyPercent),
        baselineAdherencePercent: baselineRow.adherencePercent,
        candidateAdherencePercent: candidateRow.adherencePercent,
        adherencePercentDelta: delta(baselineRow.adherencePercent, candidateRow.adherencePercent),
        baselinePeakDayUpliftPercent: baselineRow.peakDayUpliftPercent,
        candidatePeakDayUpliftPercent: candidateRow.peakDayUpliftPercent,
        peakDayUpliftPercentDelta: delta(
          baselineRow.peakDayUpliftPercent,
          candidateRow.peakDayUpliftPercent
        ),
        baselineRequiredHeadcount: baselineRow.requiredHeadcount,
        candidateRequiredHeadcount: candidateRow.requiredHeadcount,
        requiredHeadcountDelta: requirementMethodComparable
          ? delta(baselineRow.requiredHeadcount, candidateRow.requiredHeadcount)
          : null,
        baselinePeakDayRequiredHeadcount: baselineRow.peakDayRequiredHeadcount,
        candidatePeakDayRequiredHeadcount: candidateRow.peakDayRequiredHeadcount,
        peakDayRequiredHeadcountDelta: requirementMethodComparable
          ? delta(baselineRow.peakDayRequiredHeadcount, candidateRow.peakDayRequiredHeadcount)
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
    { header: 'baseline_aht_seconds', value: (row) => formatCsvNumber(row.baselineAhtSeconds, 2) },
    { header: 'candidate_aht_seconds', value: (row) => formatCsvNumber(row.candidateAhtSeconds, 2) },
    { header: 'aht_seconds_delta', value: (row) => formatCsvNumber(row.ahtSecondsDelta, 2) },
    { header: 'baseline_open_days', value: (row) => formatCsvNumber(row.baselineOpenDays, 2) },
    { header: 'candidate_open_days', value: (row) => formatCsvNumber(row.candidateOpenDays, 2) },
    { header: 'open_days_delta', value: (row) => formatCsvNumber(row.openDaysDelta, 2) },
    { header: 'baseline_paid_hours_per_day', value: (row) => formatCsvNumber(row.baselinePaidHoursPerDay, 2) },
    { header: 'candidate_paid_hours_per_day', value: (row) => formatCsvNumber(row.candidatePaidHoursPerDay, 2) },
    { header: 'paid_hours_per_day_delta', value: (row) => formatCsvNumber(row.paidHoursPerDayDelta, 2) },
    { header: 'baseline_presence_percent', value: (row) => formatCsvNumber(row.baselinePresencePercent, 2) },
    { header: 'candidate_presence_percent', value: (row) => formatCsvNumber(row.candidatePresencePercent, 2) },
    { header: 'presence_percentage_point_delta', value: (row) => formatCsvNumber(row.presencePercentDelta, 2) },
    { header: 'baseline_occupancy_percent', value: (row) => formatCsvNumber(row.baselineOccupancyPercent, 2) },
    { header: 'candidate_occupancy_percent', value: (row) => formatCsvNumber(row.candidateOccupancyPercent, 2) },
    { header: 'occupancy_percentage_point_delta', value: (row) => formatCsvNumber(row.occupancyPercentDelta, 2) },
    { header: 'baseline_adherence_percent', value: (row) => formatCsvNumber(row.baselineAdherencePercent, 2) },
    { header: 'candidate_adherence_percent', value: (row) => formatCsvNumber(row.candidateAdherencePercent, 2) },
    { header: 'adherence_percentage_point_delta', value: (row) => formatCsvNumber(row.adherencePercentDelta, 2) },
    { header: 'baseline_peak_day_uplift_percent', value: (row) => formatCsvNumber(row.baselinePeakDayUpliftPercent, 2) },
    { header: 'candidate_peak_day_uplift_percent', value: (row) => formatCsvNumber(row.candidatePeakDayUpliftPercent, 2) },
    { header: 'peak_day_uplift_percentage_point_delta', value: (row) => formatCsvNumber(row.peakDayUpliftPercentDelta, 2) },
    { header: 'baseline_required_headcount', value: (row) => formatCsvNumber(row.baselineRequiredHeadcount, 2) },
    { header: 'candidate_required_headcount', value: (row) => formatCsvNumber(row.candidateRequiredHeadcount, 2) },
    { header: 'required_headcount_delta', value: (row) => formatCsvNumber(row.requiredHeadcountDelta, 2) },
    { header: 'baseline_peak_day_required_headcount', value: (row) => formatCsvNumber(row.baselinePeakDayRequiredHeadcount, 2) },
    { header: 'candidate_peak_day_required_headcount', value: (row) => formatCsvNumber(row.candidatePeakDayRequiredHeadcount, 2) },
    { header: 'peak_day_required_headcount_delta', value: (row) => formatCsvNumber(row.peakDayRequiredHeadcountDelta, 2) },
    { header: 'baseline_ending_frontline_headcount', value: (row) => formatCsvNumber(row.baselineEndingFrontlineHeadcount, 2) },
    { header: 'candidate_ending_frontline_headcount', value: (row) => formatCsvNumber(row.candidateEndingFrontlineHeadcount, 2) },
    { header: 'ending_frontline_headcount_delta', value: (row) => formatCsvNumber(row.endingFrontlineHeadcountDelta, 2) },
    { header: 'baseline_staffing_gap', value: (row) => formatCsvNumber(row.baselineGapToRequirement, 2) },
    { header: 'candidate_staffing_gap', value: (row) => formatCsvNumber(row.candidateGapToRequirement, 2) },
    { header: 'staffing_gap_delta', value: (row) => formatCsvNumber(row.gapToRequirementDelta, 2) }
  ],
  comparison?.monthlyRows || []
)
