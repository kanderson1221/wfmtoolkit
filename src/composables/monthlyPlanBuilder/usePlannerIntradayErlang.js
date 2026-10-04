import { computed } from 'vue'

import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../planner/shared'
import { buildPlannerIntradayErlangPayload } from '../../planner/intradayErlang'
import { usePlannerErlangRunner } from './usePlannerErlangRunner'

const parseFiniteNumber = (value) => {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const firstFiniteNumber = (...values) => {
  for (const value of values) {
    const number = parseFiniteNumber(value)

    if (number != null) {
      return number
    }
  }

  return null
}

const roundMetric = (value) => {
  const number = parseFiniteNumber(value)
  return number == null ? null : Number(number.toFixed(6))
}

const enrichIntervalOutputRows = (intervalPlans = [], requestRows = []) =>
  (Array.isArray(intervalPlans) ? intervalPlans : []).map((intervalPlan, index) => {
    const requestRow = Array.isArray(requestRows) ? requestRows[index] || {} : {}
    const intervalLengthMinutes = firstFiniteNumber(
      intervalPlan?.intervalLengthMinutes,
      requestRow.intervalLengthMinutes
    )
    const callsOffered = firstFiniteNumber(intervalPlan?.callsOffered, requestRow.callsOffered)
    const averageHandleTimeSeconds = firstFiniteNumber(
      intervalPlan?.averageHandleTimeSeconds,
      requestRow.averageHandleTime,
      requestRow.averageHandleTimeSeconds
    )
    const workloadHours = firstFiniteNumber(
      intervalPlan?.workloadHours,
      callsOffered == null || averageHandleTimeSeconds == null
        ? null
        : callsOffered * averageHandleTimeSeconds / 3600
    )
    const requiredStaffNet = firstFiniteNumber(intervalPlan?.requiredStaffNet)
    const erlangRequiredStaffNet = firstFiniteNumber(
      intervalPlan?.erlangRequiredStaffNet,
      requiredStaffNet
    )
    const minimumHeadcount = firstFiniteNumber(
      intervalPlan?.minimumHeadcount,
      requestRow.minimumHeadcount,
      0
    )
    const intervalHours = intervalLengthMinutes == null ? null : intervalLengthMinutes / 60
    const laborHoursNet = firstFiniteNumber(
      intervalPlan?.laborHoursNet,
      requiredStaffNet == null || intervalHours == null ? null : requiredStaffNet * intervalHours
    )

    return {
      ...intervalPlan,
      monthIndex: firstFiniteNumber(intervalPlan?.monthIndex, requestRow.monthIndex),
      serviceDate: intervalPlan?.serviceDate || requestRow.serviceDate || '',
      intervalStart: intervalPlan?.intervalStart || requestRow.intervalStart || '',
      intervalLengthMinutes,
      callsOffered,
      averageHandleTimeSeconds,
      workloadHours: roundMetric(workloadHours),
      erlangRequiredStaffNet,
      minimumHeadcount,
      requiredStaffNet,
      minimumApplied: Boolean(
        intervalPlan?.minimumApplied ?? (
          requiredStaffNet != null && erlangRequiredStaffNet != null && requiredStaffNet > erlangRequiredStaffNet
        )
      ),
      laborHoursNet: roundMetric(laborHoursNet)
    }
  })

export const usePlannerIntradayErlang = ({
  requirementMethod,
  planningYear,
  demandSource,
  monthlyRecords,
  operatingWeekdays,
  holidayCalendarId,
  disabledHolidayRuleIds,
  customHolidays,
  operatingScheduleMode,
  operatingOpenTime,
  operatingCloseTime,
  serviceLevelPercent,
  serviceLevelThresholdSeconds,
  intraday,
  storedResults
}) => {
  const payloadState = computed(() => {
    if (requirementMethod.value !== PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG) {
      return {
        status: 'inactive',
        message: '',
        rows: []
      }
    }

    return buildPlannerIntradayErlangPayload({
      planningYear: planningYear.value,
      demandSource: demandSource.value,
      monthlyRecords: monthlyRecords.value,
      operatingWeekdays: operatingWeekdays.value,
      holidayCalendarId: holidayCalendarId.value,
      disabledHolidayRuleIds: disabledHolidayRuleIds.value,
      customHolidays: customHolidays.value,
      operatingScheduleMode: operatingScheduleMode?.value || '',
      operatingOpenTime: operatingOpenTime.value,
      operatingCloseTime: operatingCloseTime.value,
      serviceLevelPercent: serviceLevelPercent.value,
      serviceLevelThresholdSeconds: serviceLevelThresholdSeconds.value,
      intraday: intraday.value
    })
  })

  const runner = usePlannerErlangRunner({
    payloadState,
    storedResults,
    enrichIntervalOutputs: enrichIntervalOutputRows
  })

  return {
    erlangStatus: runner.erlangStatus,
    runErlangCalculations: runner.runCalculations,
    monthlyOutputsByMonthIndex: runner.monthlyOutputsByMonthIndex,
    intervalOutputs: runner.intervalOutputs,
    dailyOutputs: runner.dailyOutputs
  }
}
