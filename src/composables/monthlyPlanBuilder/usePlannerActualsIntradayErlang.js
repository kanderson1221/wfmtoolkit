import { computed } from 'vue'

import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../planner/shared'
import { buildPlannerActualsIntradayErlangPayload } from '../../planner/intradayErlang'
import { usePlannerErlangRunner } from './usePlannerErlangRunner'

export const usePlannerActualsIntradayErlang = ({
  requirementMethod,
  planningYear,
  actualDailyRows,
  actualsMonths,
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

    const incompleteMonth = (actualsMonths?.value || []).find(
      (month) => month.loadedDaysCount > 0 && !['complete', 'unassessed'].includes(month.coverageStatus)
    )

    if (incompleteMonth) {
      const missingCount = Array.isArray(incompleteMonth.missingOpenDates)
        ? incompleteMonth.missingOpenDates.length
        : 0
      const missingLabel = missingCount > 0
        ? `missing ${missingCount} expected open ${missingCount === 1 ? 'date' : 'dates'}`
        : 'not aligned with the saved operating calendar'

      return {
        status: 'incomplete_actuals',
        message: `${incompleteMonth.label} actuals are ${missingLabel}. Complete the Data tab coverage before running actual staffing calculations.`,
        rows: []
      }
    }

    return buildPlannerActualsIntradayErlangPayload({
      planningYear: planningYear.value,
      actualDailyRows: actualDailyRows.value,
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

  const runner = usePlannerErlangRunner({ payloadState, storedResults, actuals: true })

  return {
    actualsErlangStatus: runner.erlangStatus,
    runActualsErlangCalculations: runner.runCalculations,
    monthlyOutputsByMonthIndex: runner.monthlyOutputsByMonthIndex
  }
}
