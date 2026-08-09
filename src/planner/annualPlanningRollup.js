import { PLAN_TYPE_BUDGET, resolvePlanHolidaySnapshot } from '../planningStorage'
import { getCenterGroups, getGroupPlans } from '../planningSummary'
import { buildActualsMonthsFromDailyRows, computeActualsRecords } from './actualsModel'
import { resolvePlanningGroupActuals } from './groupActuals'
import { createPlanningGroupOpenDayChecker } from './groupOpenDays'
import {
  assessPlannerIntradayErlangResults,
  buildPlannerActualsIntradayErlangPayload
} from './intradayErlang'
import {
  MONTH_LABELS,
  getCurrentCalendarYear,
  resolvePlanningYear
} from './shared'
import { computeStaffingRecords } from './staffingModel'
import { createPlanOpenDayChecker } from './planOpenDays'
import {
  buildPlanIntradayPayloadArgs,
  resolvePlanRequirementRecords
} from './planRequirementRecords'

export {
  buildPlanDemandRecords,
  resolvePlanRequirementRecords
} from './planRequirementRecords'

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const buildMonthStart = (planningYear, monthIndex) =>
  `${planningYear}-${String(monthIndex + 1).padStart(2, '0')}-01`

const createMonthlyRollupRow = (planningYear, monthIndex) => ({
  monthIndex,
  monthStart: buildMonthStart(planningYear, monthIndex),
  label: MONTH_LABELS[monthIndex],
  monthLabel: `${MONTH_LABELS[monthIndex]} ${planningYear}`,
  expectedContacts: 0,
  expectedAhtSeconds: 0,
  actualContacts: null,
  actualAhtSeconds: null,
  contactVariance: null,
  contactVariancePercent: null,
  expectedWorkloadHours: 0,
  actualWorkloadHours: null,
  workloadVariance: null,
  requiredStaffHours: 0,
  requiredHeadcount: 0,
  actualRequiredHeadcount: null,
  requiredHeadcountVariance: null,
  peakRequiredHeadcount: 0,
  startingFrontlineHeadcount: 0,
  endingFrontlineHeadcount: 0,
  endingRosterHeadcount: 0,
  gapToRequirement: 0,
  gapVsActualRequiredHeadcount: null,
  hireHeadcount: 0,
  graduatingHeadcount: 0,
  frontlineReadyHeadcount: 0,
  frontlineAttritionHeadcount: 0,
  inTrainingHeadcount: 0,
  daysLoaded: 0,
  groupsPlannedCount: 0,
  groupsWithPlannedRequirementCount: 0,
  groupsWithPlannedGapCount: 0,
  groupsWithActualsCount: 0,
  groupsWithCompleteActualsCount: 0,
  groupsWithActualRequirementCount: 0,
  staffingGroupRows: [],
  isBelowRequirement: false
})

const comparePlanFreshness = (left, right) =>
  new Date(right?.updatedAt || right?.createdAt || 0).getTime() -
  new Date(left?.updatedAt || left?.createdAt || 0).getTime()

export const selectPlanningRollupPlan = (group, planningYear, planRole = 'current') => {
  const resolvedYear = resolvePlanningYear(planningYear)
  const yearPlans = getGroupPlans(group).filter((plan) => Number(plan?.planningYear) === resolvedYear)

  if (!yearPlans.length) {
    return null
  }

  if (planRole === 'budget') {
    return yearPlans.find((plan) => plan?.planType === PLAN_TYPE_BUDGET) || null
  }

  return yearPlans.find((plan) => plan?.isCurrent) ||
    yearPlans.find((plan) => plan?.planType === PLAN_TYPE_BUDGET) ||
    [...yearPlans].sort(comparePlanFreshness)[0] ||
    null
}

const resolveActualRequirementState = ({ plan, center, group, planningYear, requirementState }) => {
  if (!requirementState.usesIntradayErlang) {
    return {
      status: 'not_applicable',
      message: '',
      monthlyOutputsByMonthIndex: null
    }
  }

  const payloadState = buildPlannerActualsIntradayErlangPayload({
    actualDailyRows: resolvePlanningGroupActuals(group).dailyRows,
    ...buildPlanIntradayPayloadArgs({
      plan,
      center,
      group,
      planningYear,
      monthlyRecords: requirementState.baselineRecords
    })
  })
  const assessment = assessPlannerIntradayErlangResults(
    payloadState,
    plan?.actualsIntradayErlangResults,
    { actuals: true }
  )

  return {
    status: assessment.status,
    message: assessment.message,
    monthlyOutputsByMonthIndex: assessment.status === 'ready'
      ? new Map(assessment.results.monthlyOutputs.map((row) => [Number(row.monthIndex), row]))
      : new Map()
  }
}

export const buildPlanStaffingRecords = (plan, center, monthlyRecords, planningYear) => {
  const resolvedYear = resolvePlanningYear(planningYear, plan?.planningYear)
  const holidaySnapshot = resolvePlanHolidaySnapshot(plan, center, resolvedYear)

  return computeStaffingRecords(
    monthlyRecords,
    resolvedYear,
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
}

const average = (values) => {
  const numericValues = values.filter((value) => Number.isFinite(value))
  return numericValues.length
    ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
    : 0
}

const weightedAhtSeconds = (contacts, workloadHours) =>
  contacts > 0 ? (workloadHours * 3600) / contacts : null

const buildActualsOnlyRows = ({ group, monthlyActuals, planningYear }) =>
  monthlyActuals.map((actualsMonth, monthIndex) => {
    const actualContacts = actualsMonth.actualContacts ?? null
    const actualAhtSeconds = actualsMonth.actualAhtSeconds ?? null
    const actualWorkloadHours =
      actualContacts != null && actualAhtSeconds != null
        ? (actualContacts * actualAhtSeconds) / 3600
        : null

    return {
      monthIndex,
      monthStart: buildMonthStart(planningYear, monthIndex),
      label: MONTH_LABELS[monthIndex],
      fullLabel: `${MONTH_LABELS[monthIndex]} ${planningYear}`,
      groupId: group.id || group.name,
      groupName: group.name || 'Staffing Group',
      planId: null,
      hasPlan: false,
      isLoaded: actualContacts != null || actualAhtSeconds != null,
      plannedContacts: null,
      actualContacts,
      plannedAhtSeconds: null,
      actualAhtSeconds,
      plannedWorkloadHours: null,
      actualWorkloadHours,
      plannedRequiredHeadcount: null,
      actualRequiredHeadcount: null,
      requiredHeadcountVariance: null,
      plannedStartingFrontlineHeadcount: null,
      plannedEndingFrontlineHeadcount: null,
      plannedEndingTotalHeadcount: null,
      plannedGapToRequirement: null,
      gapVsActualRequiredHeadcount: null,
      actualLoadedDaysCount: Math.max(toNumber(actualsMonth.loadedDaysCount), 0),
      actualLoadedOpenDaysCount: Math.max(toNumber(actualsMonth.loadedOpenDaysCount), 0),
      actualExpectedOpenDaysCount: actualsMonth.expectedOpenDaysCount,
      actualsCoverageStatus: actualsMonth.coverageStatus,
      actualsCoverageComplete: actualsMonth.coverageStatus === 'complete'
    }
  })

const buildGroupActualRows = ({
  center,
  group,
  plan,
  requirementState,
  actualRequirementState,
  monthlyDemandRecords,
  staffingRecords,
  planningYear
}) => {
  const planHolidaySnapshot = plan
    ? resolvePlanHolidaySnapshot(plan, center, planningYear)
    : null
  const isExpectedOpenDay = plan
    ? createPlanOpenDayChecker({
        planningYear,
        operatingWeekdays:
          Array.isArray(plan.operatingWeekdays) && plan.operatingWeekdays.length
            ? plan.operatingWeekdays
            : center?.operatingWeekdays,
        holidayCalendarId: planHolidaySnapshot.holidayCalendarId,
        disabledHolidayRuleIds: planHolidaySnapshot.disabledHolidayRuleIds,
        customHolidays: planHolidaySnapshot.customHolidays
      })
    : createPlanningGroupOpenDayChecker(group, center)
  const monthlyActuals = buildActualsMonthsFromDailyRows(
    resolvePlanningGroupActuals(group).dailyRows,
    planningYear,
    { isExpectedOpenDay }
  )

  if (!plan) {
    return buildActualsOnlyRows({ group, monthlyActuals, planningYear })
  }

  const actualRequirementOutputs = requirementState.usesIntradayErlang
    ? actualRequirementState.monthlyOutputsByMonthIndex
    : null

  return computeActualsRecords(
    monthlyDemandRecords,
    staffingRecords,
    monthlyActuals,
    actualRequirementOutputs
  ).map((record, monthIndex) => {
    const plannedStartingFrontlineHeadcount = toNumber(record.plannedStartingFrontlineHeadcount)
    const actualRequiredHeadcount = record.actualRequiredHeadcount == null
      ? null
      : toNumber(record.actualRequiredHeadcount)

    return {
      monthIndex,
      monthStart: buildMonthStart(planningYear, monthIndex),
      label: record.label || MONTH_LABELS[monthIndex],
      fullLabel: record.fullLabel || `${MONTH_LABELS[monthIndex]} ${planningYear}`,
      groupId: group.id || group.name,
      groupName: group.name || 'Staffing Group',
      planId: plan.id || null,
      planName: plan.name || `${plan.planningYear || planningYear} Plan`,
      centerId: center.id || '',
      hasPlan: true,
      isLoaded: Boolean(record.isLoaded),
      plannedContacts: toNumber(record.plannedContacts),
      actualContacts: record.actualContacts == null ? null : toNumber(record.actualContacts),
      plannedAhtSeconds: toNumber(record.plannedAhtSeconds),
      actualAhtSeconds: record.actualAhtSeconds == null ? null : toNumber(record.actualAhtSeconds),
      plannedWorkloadHours: toNumber(record.plannedWorkloadHours),
      actualWorkloadHours: record.actualWorkloadHours == null ? null : toNumber(record.actualWorkloadHours),
      plannedRequiredHeadcount:
        record.plannedRequiredHeadcount == null ? null : toNumber(record.plannedRequiredHeadcount),
      plannedRequiredStaffHours:
        record.requiredStaffHours == null ? null : toNumber(record.requiredStaffHours),
      actualRequiredHeadcount,
      requiredHeadcountVariance:
        record.requiredHeadcountVariance == null ? null : toNumber(record.requiredHeadcountVariance),
      plannedStartingFrontlineHeadcount,
      plannedEndingFrontlineHeadcount: toNumber(record.plannedEndingFrontlineHeadcount),
      plannedEndingTotalHeadcount: toNumber(record.plannedEndingTotalHeadcount),
      plannedGapToRequirement:
        record.plannedGapToRequirement == null ? null : toNumber(record.plannedGapToRequirement),
      gapVsActualRequiredHeadcount:
        actualRequiredHeadcount == null ? null : plannedStartingFrontlineHeadcount - actualRequiredHeadcount,
      actualLoadedDaysCount: Math.max(toNumber(record.actualLoadedDaysCount), 0),
      actualLoadedOpenDaysCount: Math.max(toNumber(record.actualLoadedOpenDaysCount), 0),
      actualExpectedOpenDaysCount: record.actualExpectedOpenDaysCount,
      actualsCoverageStatus: record.actualsCoverageStatus,
      actualsCoverageComplete: record.actualsCoverageComplete
    }
  })
}

const finalizeMonthlyRows = (monthlyRows) =>
  monthlyRows.map((row) => {
    const plannedRequirementsComplete =
      row.groupsPlannedCount > 0 &&
      row.groupsWithPlannedRequirementCount === row.groupsPlannedCount
    const plannedGapsComplete =
      row.groupsPlannedCount > 0 &&
      row.groupsWithPlannedGapCount === row.groupsPlannedCount
    const actualRequirementsComplete =
      row.groupsWithActualsCount > 0 &&
      row.groupsWithActualRequirementCount === row.groupsWithActualsCount
    const actualsCoverageComplete =
      row.groupsWithActualsCount > 0 &&
      row.groupsWithCompleteActualsCount === row.groupsWithActualsCount
    const actualContacts = actualsCoverageComplete ? row.actualContacts || 0 : null
    const actualWorkloadHours = actualsCoverageComplete ? row.actualWorkloadHours || 0 : null
    const actualRequiredHeadcount = actualRequirementsComplete ? row.actualRequiredHeadcount || 0 : null
    const contactVariance = actualContacts == null ? null : actualContacts - row.expectedContacts
    const workloadVariance = actualWorkloadHours == null ? null : actualWorkloadHours - row.expectedWorkloadHours
    const requiredHeadcount = plannedRequirementsComplete ? row.requiredHeadcount : null
    const requiredStaffHours = plannedRequirementsComplete ? row.requiredStaffHours : null
    const peakRequiredHeadcount = plannedRequirementsComplete ? row.peakRequiredHeadcount : null
    const gapToRequirement = plannedGapsComplete ? row.gapToRequirement : null
    const requiredHeadcountVariance =
      actualRequiredHeadcount == null || requiredHeadcount == null
        ? null
        : actualRequiredHeadcount - requiredHeadcount
    const gapVsActualRequiredHeadcount =
      actualRequiredHeadcount == null ? null : row.startingFrontlineHeadcount - actualRequiredHeadcount
    const expectedAhtSeconds = weightedAhtSeconds(row.expectedContacts, row.expectedWorkloadHours) || 0
    const actualAhtSeconds = actualContacts != null
      ? weightedAhtSeconds(actualContacts, actualWorkloadHours || 0)
      : null

    return {
      ...row,
      staffingGroupRows: [...row.staffingGroupRows].sort((left, right) =>
        left.groupName.localeCompare(right.groupName)
      ),
      plannedContacts: row.expectedContacts,
      actualContacts,
      plannedAhtSeconds: expectedAhtSeconds,
      actualAhtSeconds,
      plannedWorkloadHours: row.expectedWorkloadHours,
      actualWorkloadHours,
      plannedRequiredHeadcount: requiredHeadcount,
      actualRequiredHeadcount,
      plannedStartingFrontlineHeadcount: row.startingFrontlineHeadcount,
      actualLoadedDaysCount: row.daysLoaded,
      actualsCoverageComplete,
      expectedAhtSeconds,
      contactVariance,
      contactVariancePercent:
        contactVariance != null && row.expectedContacts > 0
          ? (contactVariance / row.expectedContacts) * 100
          : null,
      workloadVariance,
      requiredStaffHours,
      requiredHeadcount,
      peakRequiredHeadcount,
      gapToRequirement,
      requiredHeadcountVariance,
      gapVsActualRequiredHeadcount,
      isBelowRequirement: gapToRequirement != null && gapToRequirement < 0
    }
  })

const summarizeAnnualRollup = ({
  centers,
  monthlyRows,
  plannedGroupIds,
  groupsWithActualsIds,
  planningYear
}) => {
  const groupCount = centers.reduce((sum, center) => sum + getCenterGroups(center).length, 0)
  const expectedContacts = monthlyRows.reduce((sum, row) => sum + row.expectedContacts, 0)
  const actualContacts = monthlyRows.reduce((sum, row) => sum + (row.actualContacts ?? 0), 0)
  const expectedWorkloadHours = monthlyRows.reduce((sum, row) => sum + row.expectedWorkloadHours, 0)
  const actualWorkloadHours = monthlyRows.reduce((sum, row) => sum + (row.actualWorkloadHours ?? 0), 0)
  const requiredStaffHours = monthlyRows.reduce((sum, row) => sum + row.requiredStaffHours, 0)
  const contactVariance = monthlyRows.some((row) => row.actualContacts != null)
    ? actualContacts - expectedContacts
    : null
  const actualRequirementRows = monthlyRows.filter((row) => row.actualRequiredHeadcount != null)
  const staffingGapRows = monthlyRows.filter((row) => row.gapVsActualRequiredHeadcount != null)
  const plannedRequirementsComplete = monthlyRows.every((row) => row.requiredHeadcount != null)
  const plannedGapsComplete = monthlyRows.every((row) => row.gapToRequirement != null)

  return {
    planningYear,
    centerCount: centers.length,
    groupCount,
    plannedGroupCount: plannedGroupIds.size,
    groupsWithActualsCount: groupsWithActualsIds.size,
    planCoveragePercent: groupCount > 0 ? (plannedGroupIds.size / groupCount) * 100 : 0,
    actualCoveragePercent: groupCount > 0 ? (groupsWithActualsIds.size / groupCount) * 100 : 0,
    monthsWithActualsCount: monthlyRows.filter((row) => row.actualContacts != null).length,
    expectedContacts,
    actualContacts,
    contactVariance,
    contactVariancePercent:
      contactVariance != null && expectedContacts > 0
        ? (contactVariance / expectedContacts) * 100
        : null,
    expectedAhtSeconds: weightedAhtSeconds(expectedContacts, expectedWorkloadHours) || 0,
    actualAhtSeconds:
      actualContacts > 0
        ? weightedAhtSeconds(actualContacts, actualWorkloadHours)
        : null,
    expectedWorkloadHours,
    actualWorkloadHours,
    workloadVariance:
      monthlyRows.some((row) => row.actualWorkloadHours != null)
        ? actualWorkloadHours - expectedWorkloadHours
        : null,
    requiredStaffHours: plannedRequirementsComplete ? requiredStaffHours : null,
    averageRequiredHeadcount: plannedRequirementsComplete
      ? average(monthlyRows.map((row) => row.requiredHeadcount))
      : null,
    averageActualRequiredHeadcount: average(actualRequirementRows.map((row) => row.actualRequiredHeadcount)),
    averageRequiredHeadcountVariance: average(actualRequirementRows.map((row) => row.requiredHeadcountVariance)),
    peakRequiredHeadcount: plannedRequirementsComplete
      ? monthlyRows.reduce((peak, row) => Math.max(peak, row.peakRequiredHeadcount), 0)
      : null,
    peakActualRequiredHeadcount: monthlyRows.reduce(
      (peak, row) => Math.max(peak, row.actualRequiredHeadcount || 0),
      0
    ),
    averageStartingFrontlineHeadcount: average(monthlyRows.map((row) => row.startingFrontlineHeadcount)),
    averageEndingFrontlineHeadcount: average(monthlyRows.map((row) => row.endingFrontlineHeadcount)),
    averageEndingRosterHeadcount: average(monthlyRows.map((row) => row.endingRosterHeadcount)),
    averageGapToRequirement: plannedGapsComplete
      ? average(monthlyRows.map((row) => row.gapToRequirement))
      : null,
    averageGapVsActualRequiredHeadcount: average(staffingGapRows.map((row) => row.gapVsActualRequiredHeadcount)),
    monthsBelowRequirement: plannedGapsComplete
      ? monthlyRows.filter((row) => row.isBelowRequirement).length
      : null,
    totalHireHeadcount: monthlyRows.reduce((sum, row) => sum + row.hireHeadcount, 0),
    totalFrontlineAttritionHeadcount: monthlyRows.reduce((sum, row) => sum + row.frontlineAttritionHeadcount, 0)
  }
}

const buildAnnualTotalRow = (monthlyRows, summary) => ({
  monthIndex: null,
  label: 'Total / Avg',
  monthLabel: 'Total / Avg',
  plannedContacts: summary.expectedContacts,
  actualContacts: summary.monthsWithActualsCount ? summary.actualContacts : null,
  plannedAhtSeconds: summary.expectedAhtSeconds,
  actualAhtSeconds: summary.actualAhtSeconds,
  plannedWorkloadHours: summary.expectedWorkloadHours,
  actualWorkloadHours: summary.monthsWithActualsCount ? summary.actualWorkloadHours : null,
  plannedRequiredHeadcount: summary.averageRequiredHeadcount,
  actualRequiredHeadcount: summary.averageActualRequiredHeadcount || null,
  requiredHeadcountVariance: summary.averageRequiredHeadcountVariance || null,
  plannedStartingFrontlineHeadcount: summary.averageStartingFrontlineHeadcount,
  gapVsActualRequiredHeadcount: summary.averageGapVsActualRequiredHeadcount || null,
  actualLoadedDaysCount: monthlyRows.reduce((sum, row) => sum + row.daysLoaded, 0),
  staffingGroupRows: []
})

export const buildAnnualPlanningRollup = ({
  centers = [],
  planningYear = getCurrentCalendarYear(),
  planRole = 'current'
} = {}) => {
  const resolvedYear = resolvePlanningYear(planningYear)
  const resolvedCenters = Array.isArray(centers) ? centers.filter(Boolean) : []
  const monthlyRows = Array.from({ length: 12 }, (_, monthIndex) =>
    createMonthlyRollupRow(resolvedYear, monthIndex)
  )
  const plannedGroupIds = new Set()
  const groupsWithActualsIds = new Set()
  const integrityIssues = []

  resolvedCenters.forEach((center) => {
    getCenterGroups(center).forEach((group) => {
      const groupKey = `${center.id || 'center'}:${group.id || group.name}`
      const plan = selectPlanningRollupPlan(group, resolvedYear, planRole)
      const requirementState = plan
        ? resolvePlanRequirementRecords({ plan, center, group, planningYear: resolvedYear })
        : {
            records: [],
            status: 'not_applicable',
            message: '',
            usesIntradayErlang: false,
            baselineRecords: []
          }
      const actualRequirementState = plan
        ? resolveActualRequirementState({
            plan,
            center,
            group,
            planningYear: resolvedYear,
            requirementState
          })
        : {
            status: 'not_applicable',
            message: '',
            monthlyOutputsByMonthIndex: null
          }
      const monthlyDemandRecords = requirementState.records
      const staffingRecords = plan
        ? buildPlanStaffingRecords(plan, center, monthlyDemandRecords, resolvedYear)
        : []
      const groupActualRows = buildGroupActualRows({
        center,
        group,
        plan,
        requirementState,
        actualRequirementState,
        monthlyDemandRecords,
        staffingRecords,
        planningYear: resolvedYear
      })
      const hasActuals = groupActualRows.some((row) => row.isLoaded)

      if (plan) {
        plannedGroupIds.add(groupKey)
      }

      if (
        plan &&
        requirementState.usesIntradayErlang &&
        (requirementState.status !== 'ready' || actualRequirementState.status !== 'ready')
      ) {
        const messages = []
        if (requirementState.status !== 'ready') {
          messages.push(`${requirementState.message} Planned requirement values are withheld.`)
        }
        if (actualRequirementState.status !== 'ready') {
          messages.push(`${actualRequirementState.message} Actual requirement values are withheld.`)
        }

        integrityIssues.push({
          centerId: center.id || '',
          groupId: group.id || '',
          groupName: group.name || 'Staffing Group',
          planId: plan.id || '',
          planName: plan.name || `${resolvedYear} Plan`,
          status: requirementState.status !== 'ready'
            ? requirementState.status
            : actualRequirementState.status,
          plannedRequirementAvailable: requirementState.status === 'ready',
          actualRequirementAvailable: actualRequirementState.status === 'ready',
          message: messages.join(' ')
        })
      }

      if (hasActuals) {
        groupsWithActualsIds.add(groupKey)
      }

      const incompleteActualMonths = groupActualRows.filter(
        (row) => row.isLoaded && row.actualsCoverageComplete === false
      )

      if (incompleteActualMonths.length) {
        const monthLabels = incompleteActualMonths.map((row) => row.label).join(', ')
        integrityIssues.push({
          type: 'actuals_coverage',
          centerId: center.id || '',
          groupId: group.id || '',
          groupName: group.name || 'Staffing Group',
          planId: plan?.id || '',
          planName: plan?.name || `${resolvedYear} actuals`,
          status: 'incomplete_actuals',
          plannedRequirementAvailable: Boolean(plan),
          actualRequirementAvailable: false,
          message: `${monthLabels} actuals do not cover every expected open date. Aggregate actuals, variances, and actual requirement are withheld for affected months.`
        })
      }

      monthlyRows.forEach((row, monthIndex) => {
        const groupActualRow = groupActualRows[monthIndex]
        const demandRecord = monthlyDemandRecords[monthIndex]
        const staffingRecord = staffingRecords[monthIndex]

        if (!groupActualRow) {
          return
        }

        row.staffingGroupRows.push(groupActualRow)

        if (groupActualRow.hasPlan) {
          row.expectedContacts += toNumber(groupActualRow.plannedContacts)
          row.expectedWorkloadHours += toNumber(groupActualRow.plannedWorkloadHours)
          row.groupsPlannedCount += 1
          row.startingFrontlineHeadcount += toNumber(groupActualRow.plannedStartingFrontlineHeadcount)
          row.endingFrontlineHeadcount += toNumber(groupActualRow.plannedEndingFrontlineHeadcount)
          row.endingRosterHeadcount += toNumber(groupActualRow.plannedEndingTotalHeadcount)
          if (
            groupActualRow.plannedRequiredHeadcount != null &&
            groupActualRow.plannedRequiredStaffHours != null
          ) {
            row.requiredStaffHours += toNumber(groupActualRow.plannedRequiredStaffHours)
            row.requiredHeadcount += toNumber(groupActualRow.plannedRequiredHeadcount)
            row.peakRequiredHeadcount += toNumber(
              demandRecord?.peakDayRequiredHeadcount ?? groupActualRow.plannedRequiredHeadcount
            )
            row.groupsWithPlannedRequirementCount += 1
          }
          if (groupActualRow.plannedGapToRequirement != null) {
            row.gapToRequirement += toNumber(groupActualRow.plannedGapToRequirement)
            row.groupsWithPlannedGapCount += 1
          }
          row.hireHeadcount += toNumber(staffingRecord?.hireHeadcount)
          row.graduatingHeadcount += toNumber(staffingRecord?.graduatingHeadcount)
          row.frontlineReadyHeadcount += toNumber(staffingRecord?.frontlineReadyHeadcount)
          row.frontlineAttritionHeadcount += toNumber(staffingRecord?.frontlineAttritionHeadcount)
          row.inTrainingHeadcount += toNumber(staffingRecord?.inTrainingHeadcount)
        }

        if (groupActualRow.isLoaded) {
          row.groupsWithActualsCount += 1
          row.daysLoaded += toNumber(groupActualRow.actualLoadedDaysCount)

          if (groupActualRow.actualsCoverageComplete) {
            row.groupsWithCompleteActualsCount += 1
          }

          if (groupActualRow.actualContacts != null) {
            row.actualContacts = (row.actualContacts || 0) + toNumber(groupActualRow.actualContacts)
          }

          if (groupActualRow.actualWorkloadHours != null) {
            row.actualWorkloadHours = (row.actualWorkloadHours || 0) + toNumber(groupActualRow.actualWorkloadHours)
          }

          if (groupActualRow.actualRequiredHeadcount != null) {
            row.actualRequiredHeadcount = (row.actualRequiredHeadcount || 0) +
              toNumber(groupActualRow.actualRequiredHeadcount)
            row.groupsWithActualRequirementCount += 1
          }
        }
      })
    })
  })

  const finalizedMonthlyRows = finalizeMonthlyRows(monthlyRows)
  const summary = summarizeAnnualRollup({
    centers: resolvedCenters,
    monthlyRows: finalizedMonthlyRows,
    plannedGroupIds,
    groupsWithActualsIds,
    planningYear: resolvedYear
  })

  return {
    planningYear: resolvedYear,
    monthlyRows: finalizedMonthlyRows,
    annualTotalRow: buildAnnualTotalRow(finalizedMonthlyRows, summary),
    integrityIssues,
    summary
  }
}
