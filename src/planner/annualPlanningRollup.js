import { PLAN_TYPE_BUDGET, resolvePlanHolidaySnapshot } from '../planningStorage'
import { getCenterGroups, getGroupPlans } from '../planningSummary'
import { buildActualsMonthsFromDailyRows, computeActualsRecords } from './actualsModel'
import { computeMonthlyRecords } from './demandModel'
import { resolvePlanningGroupActuals } from './groupActuals'
import { MONTH_LABELS, WEEKDAY_FALLBACK, getCurrentCalendarYear, resolvePlanningYear } from './shared'
import { computeStaffingRecords } from './staffingModel'

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
  groupsWithActualsCount: 0,
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

export const buildPlanDemandRecords = (plan, center, planningYear) => {
  const resolvedYear = resolvePlanningYear(planningYear, plan?.planningYear)
  const holidaySnapshot = resolvePlanHolidaySnapshot(plan, center, resolvedYear)

  return computeMonthlyRecords({
    planningYear: resolvedYear,
    requirementMethod: plan?.requirementMethod || plan?.summary?.requirementMethod,
    demandSource: plan?.demandSource,
    operatingWeekdays:
      Array.isArray(plan?.operatingWeekdays) && plan.operatingWeekdays.length
        ? plan.operatingWeekdays
        : Array.isArray(center?.operatingWeekdays) && center.operatingWeekdays.length
          ? center.operatingWeekdays
          : WEEKDAY_FALLBACK,
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
      actualLoadedDaysCount: Math.max(toNumber(actualsMonth.loadedDaysCount), 0)
    }
  })

const buildGroupActualRows = ({ center, group, plan, monthlyDemandRecords, staffingRecords, planningYear }) => {
  const monthlyActuals = buildActualsMonthsFromDailyRows(
    resolvePlanningGroupActuals(group).dailyRows,
    planningYear
  )

  if (!plan) {
    return buildActualsOnlyRows({ group, monthlyActuals, planningYear })
  }

  return computeActualsRecords(monthlyDemandRecords, staffingRecords, monthlyActuals).map((record, monthIndex) => {
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
      plannedRequiredHeadcount: toNumber(record.plannedRequiredHeadcount),
      plannedRequiredStaffHours: toNumber(record.requiredStaffHours),
      actualRequiredHeadcount,
      requiredHeadcountVariance:
        record.requiredHeadcountVariance == null ? null : toNumber(record.requiredHeadcountVariance),
      plannedStartingFrontlineHeadcount,
      plannedEndingFrontlineHeadcount: toNumber(record.plannedEndingFrontlineHeadcount),
      plannedEndingTotalHeadcount: toNumber(record.plannedEndingTotalHeadcount),
      plannedGapToRequirement: toNumber(record.plannedGapToRequirement),
      gapVsActualRequiredHeadcount:
        actualRequiredHeadcount == null ? null : plannedStartingFrontlineHeadcount - actualRequiredHeadcount,
      actualLoadedDaysCount: Math.max(toNumber(record.actualLoadedDaysCount), 0)
    }
  })
}

const finalizeMonthlyRows = (monthlyRows) =>
  monthlyRows.map((row) => {
    const actualContacts = row.groupsWithActualsCount > 0 ? row.actualContacts || 0 : null
    const actualWorkloadHours = row.groupsWithActualsCount > 0 ? row.actualWorkloadHours || 0 : null
    const actualRequiredHeadcount =
      row.groupsWithActualRequirementCount > 0 ? row.actualRequiredHeadcount || 0 : null
    const contactVariance = actualContacts == null ? null : actualContacts - row.expectedContacts
    const workloadVariance = actualWorkloadHours == null ? null : actualWorkloadHours - row.expectedWorkloadHours
    const requiredHeadcountVariance =
      actualRequiredHeadcount == null ? null : actualRequiredHeadcount - row.requiredHeadcount
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
      plannedRequiredHeadcount: row.requiredHeadcount,
      actualRequiredHeadcount,
      plannedStartingFrontlineHeadcount: row.startingFrontlineHeadcount,
      actualLoadedDaysCount: row.daysLoaded,
      expectedAhtSeconds,
      contactVariance,
      contactVariancePercent:
        contactVariance != null && row.expectedContacts > 0
          ? (contactVariance / row.expectedContacts) * 100
          : null,
      workloadVariance,
      requiredHeadcountVariance,
      gapVsActualRequiredHeadcount,
      isBelowRequirement: row.gapToRequirement < 0
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
    requiredStaffHours,
    averageRequiredHeadcount: average(monthlyRows.map((row) => row.requiredHeadcount)),
    averageActualRequiredHeadcount: average(actualRequirementRows.map((row) => row.actualRequiredHeadcount)),
    averageRequiredHeadcountVariance: average(actualRequirementRows.map((row) => row.requiredHeadcountVariance)),
    peakRequiredHeadcount: monthlyRows.reduce((peak, row) => Math.max(peak, row.peakRequiredHeadcount), 0),
    peakActualRequiredHeadcount: monthlyRows.reduce(
      (peak, row) => Math.max(peak, row.actualRequiredHeadcount || 0),
      0
    ),
    averageStartingFrontlineHeadcount: average(monthlyRows.map((row) => row.startingFrontlineHeadcount)),
    averageEndingFrontlineHeadcount: average(monthlyRows.map((row) => row.endingFrontlineHeadcount)),
    averageEndingRosterHeadcount: average(monthlyRows.map((row) => row.endingRosterHeadcount)),
    averageGapToRequirement: average(monthlyRows.map((row) => row.gapToRequirement)),
    averageGapVsActualRequiredHeadcount: average(staffingGapRows.map((row) => row.gapVsActualRequiredHeadcount)),
    monthsBelowRequirement: monthlyRows.filter((row) => row.isBelowRequirement).length,
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

  resolvedCenters.forEach((center) => {
    getCenterGroups(center).forEach((group) => {
      const groupKey = `${center.id || 'center'}:${group.id || group.name}`
      const plan = selectPlanningRollupPlan(group, resolvedYear, planRole)
      const monthlyDemandRecords = plan ? buildPlanDemandRecords(plan, center, resolvedYear) : []
      const staffingRecords = plan
        ? buildPlanStaffingRecords(plan, center, monthlyDemandRecords, resolvedYear)
        : []
      const groupActualRows = buildGroupActualRows({
        center,
        group,
        plan,
        monthlyDemandRecords,
        staffingRecords,
        planningYear: resolvedYear
      })
      const hasActuals = groupActualRows.some((row) => row.isLoaded)

      if (plan) {
        plannedGroupIds.add(groupKey)
      }

      if (hasActuals) {
        groupsWithActualsIds.add(groupKey)
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
          row.requiredStaffHours += toNumber(groupActualRow.plannedRequiredStaffHours)
          row.requiredHeadcount += toNumber(groupActualRow.plannedRequiredHeadcount)
          row.peakRequiredHeadcount += toNumber(
            demandRecord?.peakDayRequiredHeadcount || groupActualRow.plannedRequiredHeadcount
          )
          row.groupsPlannedCount += 1
          row.startingFrontlineHeadcount += toNumber(groupActualRow.plannedStartingFrontlineHeadcount)
          row.endingFrontlineHeadcount += toNumber(groupActualRow.plannedEndingFrontlineHeadcount)
          row.endingRosterHeadcount += toNumber(groupActualRow.plannedEndingTotalHeadcount)
          row.gapToRequirement += toNumber(groupActualRow.plannedGapToRequirement)
          row.hireHeadcount += toNumber(staffingRecord?.hireHeadcount)
          row.graduatingHeadcount += toNumber(staffingRecord?.graduatingHeadcount)
          row.frontlineReadyHeadcount += toNumber(staffingRecord?.frontlineReadyHeadcount)
          row.frontlineAttritionHeadcount += toNumber(staffingRecord?.frontlineAttritionHeadcount)
          row.inTrainingHeadcount += toNumber(staffingRecord?.inTrainingHeadcount)
        }

        if (groupActualRow.isLoaded) {
          row.groupsWithActualsCount += 1
          row.daysLoaded += toNumber(groupActualRow.actualLoadedDaysCount)

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
    summary
  }
}
