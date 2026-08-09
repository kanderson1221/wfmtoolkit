import { resolvePlanHolidaySnapshot } from '../planningStorage'
import { computeMonthlyRecords } from './demandModel'
import {
  assessPlannerIntradayErlangResults,
  buildPlannerIntradayErlangPayload,
  mergeIntradayErlangMonthlyRecords
} from './intradayErlang'
import {
  PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
  WEEKDAY_FALLBACK,
  normalizePlanRequirementMethod,
  resolvePlanningYear
} from './shared'

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

export const withholdPlanRequirementOutputs = (records = []) =>
  records.map((record) => ({
    ...record,
    erlangStaffedHours: null,
    requiredStaffHours: null,
    requiredHeadcount: null,
    peakDayRequiredStaffHours: null,
    peakDayRequiredHeadcount: null,
    peakIntervalRequiredHeadcount: null,
    roundedHeadcount: null
  }))

export const buildPlanIntradayPayloadArgs = ({ plan, center, group, planningYear, monthlyRecords }) => {
  const holidaySnapshot = resolvePlanHolidaySnapshot(plan, center, planningYear)

  return {
    planningYear,
    monthlyRecords,
    operatingWeekdays:
      Array.isArray(plan?.operatingWeekdays) && plan.operatingWeekdays.length
        ? plan.operatingWeekdays
        : Array.isArray(center?.operatingWeekdays) && center.operatingWeekdays.length
          ? center.operatingWeekdays
          : WEEKDAY_FALLBACK,
    holidayCalendarId: holidaySnapshot.holidayCalendarId,
    disabledHolidayRuleIds: holidaySnapshot.disabledHolidayRuleIds,
    customHolidays: holidaySnapshot.customHolidays,
    operatingScheduleMode:
      plan?.operatingScheduleMode || group?.operatingScheduleMode || center?.operatingScheduleMode,
    operatingOpenTime: plan?.operatingOpenTime || group?.operatingOpenTime || center?.operatingOpenTime,
    operatingCloseTime: plan?.operatingCloseTime || group?.operatingCloseTime || center?.operatingCloseTime,
    serviceLevelPercent: plan?.serviceLevelPercent ?? group?.serviceLevelPercent,
    serviceLevelThresholdSeconds:
      plan?.serviceLevelThresholdSeconds ?? group?.serviceLevelThresholdSeconds,
    intraday: plan?.intraday || group?.intraday
  }
}

export const resolvePlanRequirementRecords = ({ plan, center, group, planningYear }) => {
  const resolvedYear = resolvePlanningYear(planningYear, plan?.planningYear)
  const baselineRecords = buildPlanDemandRecords(plan, center, resolvedYear)
  const requirementMethod = normalizePlanRequirementMethod(
    plan?.requirementMethod || plan?.summary?.requirementMethod
  )

  if (requirementMethod !== PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG) {
    return {
      records: baselineRecords,
      requirementMethod,
      status: 'ready',
      message: '',
      requirementsAvailable: true,
      usesIntradayErlang: false,
      baselineRecords
    }
  }

  const payloadState = buildPlannerIntradayErlangPayload({
    demandSource: plan?.demandSource,
    ...buildPlanIntradayPayloadArgs({
      plan,
      center,
      group,
      planningYear: resolvedYear,
      monthlyRecords: baselineRecords
    })
  })
  const assessment = assessPlannerIntradayErlangResults(payloadState, plan?.intradayErlangResults)

  if (assessment.status !== 'ready') {
    return {
      records: withholdPlanRequirementOutputs(baselineRecords),
      requirementMethod,
      status: assessment.status,
      message: assessment.message,
      requirementsAvailable: false,
      usesIntradayErlang: true,
      baselineRecords
    }
  }

  return {
    records: mergeIntradayErlangMonthlyRecords(
      baselineRecords,
      new Map(assessment.results.monthlyOutputs.map((row) => [Number(row.monthIndex), row])),
      assessment.results.dailyOutputs
    ),
    requirementMethod,
    status: 'ready',
    message: '',
    requirementsAvailable: true,
    usesIntradayErlang: true,
    baselineRecords
  }
}
