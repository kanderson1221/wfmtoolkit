import { buildCsv, formatCsvNumber } from '../csvExport'
import { summarizePlanRecords } from './demandModel'
import { resolvePlanRequirementRecords } from './planRequirementRecords'
import { getPlanRequirementMethodLabel } from './shared'
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

export const buildPlanScenarioSnapshot = (plan, center, group = null) => {
  const planningYear = Number(plan?.planningYear)
  const requirementState = resolvePlanRequirementRecords({
    plan,
    center,
    group,
    planningYear
  })
  const requirementMethod = requirementState.requirementMethod
  const monthlyRecords = requirementState.records
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
  const resolveRequirementMetric = (savedValue, computedValue) =>
    requirementState.usesIntradayErlang
      ? finiteOrNull(computedValue)
      : preferSavedMetric(savedValue, computedValue)

  return {
    id: plan?.id || '',
    name: plan?.name || `${planningYear} Plan`,
    planningYear,
    planType: plan?.planType === 'update' ? 'update' : 'budget',
    requirementMethod,
    requirementMethodLabel: getPlanRequirementMethodLabel(requirementMethod),
    requirementStatus: requirementState.status,
    requirementMessage: requirementState.message,
    requirementsAvailable: requirementState.requirementsAvailable,
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
      annualRequiredStaffHours: resolveRequirementMetric(
        summary.annualRequiredStaffHours,
        planSummary.annualRequiredStaffHours
      ),
      averageRequiredHeadcount: resolveRequirementMetric(
        summary.averageRequiredHeadcount,
        planSummary.averageRequiredHeadcount
      ),
      peakRequiredHeadcount: resolveRequirementMetric(
        summary.peakRequiredHeadcount,
        planSummary.peakMonth?.requiredHeadcount
      ),
      endingFrontlineHeadcount: preferSavedMetric(
        summary.endingFrontlineHeadcount,
        staffingSummary.endingFrontlineHeadcount
      ),
      averageOpeningGapToRequirement: resolveRequirementMetric(
        summary.averageGapToRequirement,
        staffingSummary.averageGapToRequirement
      ),
      averageEndingGapToRequirement: finiteOrNull(staffingSummary.averageEndingGapToRequirement)
    },
    monthlyRows: monthlyRecords.map((row, index) => ({
      monthIndex: row.monthIndex,
      monthLabel: row.fullLabel,
      contacts: finiteOrNull(row.contacts),
      ahtSeconds: finiteOrNull(row.ahtSeconds),
      openDays: finiteOrNull(row.openDays),
      paidHoursPerDay: finiteOrNull(row.paidHoursPerDay),
      paidHoursPerMonth: finiteOrNull(row.paidHoursPerMonth),
      presencePercent: finiteOrNull(row.presencePercent),
      occupancyPercent: finiteOrNull(row.occupancyPercent),
      adherencePercent: finiteOrNull(row.adherencePercent),
      peakDayUpliftPercent: finiteOrNull(row.peakDayUpliftPercent),
      workloadHours: finiteOrNull(row.workloadHours),
      requiredStaffHours: finiteOrNull(row.requiredStaffHours),
      requiredHeadcount: finiteOrNull(row.requiredHeadcount),
      peakDayRequiredHeadcount: finiteOrNull(row.peakDayRequiredHeadcount),
      endingFrontlineHeadcount: finiteOrNull(staffingRecords[index]?.endingFrontlineHeadcount),
      openingGapToRequirement: finiteOrNull(
        staffingRecords[index]?.startingGapToRequirement ?? staffingRecords[index]?.gapToRequirement
      ),
      endingGapToRequirement: finiteOrNull(staffingRecords[index]?.endingGapToRequirement)
    }))
  }
}

const delta = (baselineValue, candidateValue) => {
  const baselineNumber = finiteOrNull(baselineValue)
  const candidateNumber = finiteOrNull(candidateValue)
  return baselineNumber == null || candidateNumber == null ? null : candidateNumber - baselineNumber
}

export const buildPlanScenarioComparison = ({ baselinePlan, candidatePlan, center, group = null }) => {
  if (!baselinePlan || !candidatePlan) {
    return null
  }

  const baseline = buildPlanScenarioSnapshot(baselinePlan, center, group)
  const candidate = buildPlanScenarioSnapshot(candidatePlan, center, group)
  const sameYear = baseline.planningYear === candidate.planningYear
  const requirementMethodComparable = baseline.requirementMethod === candidate.requirementMethod
  const requirementsComparable = requirementMethodComparable &&
    baseline.requirementsAvailable &&
    candidate.requirementsAvailable
  const unavailablePlans = [baseline, candidate].filter((snapshot) => !snapshot.requirementsAvailable)

  return {
    baseline,
    candidate,
    sameYear,
    requirementMethodComparable,
    requirementsComparable,
    methodWarning: requirementMethodComparable
      ? ''
      : 'Requirement methods differ. Demand and workload remain comparable; requirement, supply-gap, and staffing-risk deltas are withheld.',
    requirementWarning: requirementMethodComparable && unavailablePlans.length
      ? `${unavailablePlans.map((snapshot) => `${snapshot.name}: ${snapshot.requirementMessage}`).join(' ')} Requirement and staffing-gap values are unavailable until the affected plan is recalculated.`
      : '',
    metricRows: [
      ['Annual contacts', 'contacts', baseline.metrics.annualContacts, candidate.metrics.annualContacts, true],
      ['Annual workload hours', 'hours', baseline.metrics.annualWorkloadHours, candidate.metrics.annualWorkloadHours, true],
      ['Annual required staff hours', 'hours', baseline.metrics.annualRequiredStaffHours, candidate.metrics.annualRequiredStaffHours, requirementsComparable],
      ['Average required headcount', 'headcount', baseline.metrics.averageRequiredHeadcount, candidate.metrics.averageRequiredHeadcount, requirementsComparable],
      ['Peak required headcount', 'headcount', baseline.metrics.peakRequiredHeadcount, candidate.metrics.peakRequiredHeadcount, requirementsComparable],
      ['Ending frontline headcount', 'headcount', baseline.metrics.endingFrontlineHeadcount, candidate.metrics.endingFrontlineHeadcount, requirementMethodComparable],
      ['Average opening staffing gap', 'headcount', baseline.metrics.averageOpeningGapToRequirement, candidate.metrics.averageOpeningGapToRequirement, requirementsComparable],
      ['Average ending staffing gap', 'headcount', baseline.metrics.averageEndingGapToRequirement, candidate.metrics.averageEndingGapToRequirement, requirementsComparable]
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
        baselinePaidHoursPerMonth: baselineRow.paidHoursPerMonth,
        candidatePaidHoursPerMonth: candidateRow.paidHoursPerMonth,
        paidHoursPerMonthDelta: delta(baselineRow.paidHoursPerMonth, candidateRow.paidHoursPerMonth),
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
        requiredHeadcountDelta: requirementsComparable
          ? delta(baselineRow.requiredHeadcount, candidateRow.requiredHeadcount)
          : null,
        baselinePeakDayRequiredHeadcount: baselineRow.peakDayRequiredHeadcount,
        candidatePeakDayRequiredHeadcount: candidateRow.peakDayRequiredHeadcount,
        peakDayRequiredHeadcountDelta: requirementsComparable
          ? delta(baselineRow.peakDayRequiredHeadcount, candidateRow.peakDayRequiredHeadcount)
          : null,
        baselineEndingFrontlineHeadcount: baselineRow.endingFrontlineHeadcount,
        candidateEndingFrontlineHeadcount: candidateRow.endingFrontlineHeadcount,
        endingFrontlineHeadcountDelta: requirementMethodComparable
          ? delta(baselineRow.endingFrontlineHeadcount, candidateRow.endingFrontlineHeadcount)
          : null,
        baselineOpeningGapToRequirement: baselineRow.openingGapToRequirement,
        candidateOpeningGapToRequirement: candidateRow.openingGapToRequirement,
        openingGapToRequirementDelta: requirementsComparable
          ? delta(baselineRow.openingGapToRequirement, candidateRow.openingGapToRequirement)
          : null,
        baselineEndingGapToRequirement: baselineRow.endingGapToRequirement,
        candidateEndingGapToRequirement: candidateRow.endingGapToRequirement,
        endingGapToRequirementDelta: requirementsComparable
          ? delta(baselineRow.endingGapToRequirement, candidateRow.endingGapToRequirement)
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
    { header: 'baseline_fte_paid_hours', value: (row) => formatCsvNumber(row.baselinePaidHoursPerMonth, 2) },
    { header: 'candidate_fte_paid_hours', value: (row) => formatCsvNumber(row.candidatePaidHoursPerMonth, 2) },
    { header: 'fte_paid_hours_delta', value: (row) => formatCsvNumber(row.paidHoursPerMonthDelta, 2) },
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
    { header: 'baseline_opening_staffing_gap', value: (row) => formatCsvNumber(row.baselineOpeningGapToRequirement, 2) },
    { header: 'candidate_opening_staffing_gap', value: (row) => formatCsvNumber(row.candidateOpeningGapToRequirement, 2) },
    { header: 'opening_staffing_gap_delta', value: (row) => formatCsvNumber(row.openingGapToRequirementDelta, 2) },
    { header: 'baseline_ending_staffing_gap', value: (row) => formatCsvNumber(row.baselineEndingGapToRequirement, 2) },
    { header: 'candidate_ending_staffing_gap', value: (row) => formatCsvNumber(row.candidateEndingGapToRequirement, 2) },
    { header: 'ending_staffing_gap_delta', value: (row) => formatCsvNumber(row.endingGapToRequirementDelta, 2) }
  ],
  comparison?.monthlyRows || []
)
