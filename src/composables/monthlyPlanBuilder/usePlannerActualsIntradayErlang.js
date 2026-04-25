import { computed, ref, watch } from 'vue'

import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../planner/shared'
import { buildPlannerActualsIntradayErlangPayload } from '../../planner/intradayErlang'

const extractApiErrorMessage = async (response) => {
  const rawErrorText = await response.text().catch(() => '')

  if (!rawErrorText) {
    return `Actuals Erlang request failed (${response.status}).`
  }

  try {
    const errorPayload = JSON.parse(rawErrorText)
    const detail = errorPayload?.detail

    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }
  } catch {
    const flattened = rawErrorText.replace(/\s+/g, ' ').trim()
    if (flattened) {
      return flattened.slice(0, 240)
    }
  }

  return `Actuals Erlang request failed (${response.status}).`
}

export const usePlannerActualsIntradayErlang = ({
  requirementMethod,
  planningYear,
  actualDailyRows,
  monthlyRecords,
  operatingWeekdays,
  holidayCalendarId,
  disabledHolidayRuleIds,
  customHolidays,
  operatingOpenTime,
  operatingCloseTime,
  serviceLevelPercent,
  serviceLevelThresholdSeconds,
  intraday
}) => {
  const status = ref('idle')
  const message = ref('')
  const monthlyOutputsByMonthIndex = ref(new Map())
  let requestToken = 0

  const payloadState = computed(() => {
    if (requirementMethod.value !== PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG) {
      return {
        status: 'inactive',
        message: '',
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
      operatingOpenTime: operatingOpenTime.value,
      operatingCloseTime: operatingCloseTime.value,
      serviceLevelPercent: serviceLevelPercent.value,
      serviceLevelThresholdSeconds: serviceLevelThresholdSeconds.value,
      intraday: intraday.value
    })
  })

  watch(
    payloadState,
    async (nextPayloadState) => {
      requestToken += 1
      const currentToken = requestToken

      if (nextPayloadState.status === 'inactive' || nextPayloadState.status === 'actuals_required') {
        status.value = 'idle'
        message.value = ''
        monthlyOutputsByMonthIndex.value = new Map()
        return
      }

      if (nextPayloadState.status !== 'ready') {
        status.value = nextPayloadState.status
        message.value = nextPayloadState.message || ''
        monthlyOutputsByMonthIndex.value = new Map()
        return
      }

      status.value = 'loading'
      message.value = 'Calculating actual Intraday Erlang requirements.'

      try {
        const response = await fetch('/api/planner/intraday-erlang/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rows: nextPayloadState.rows
          })
        })

        if (!response.ok) {
          throw new Error(await extractApiErrorMessage(response))
        }

        const payload = await response.json()

        if (currentToken !== requestToken) {
          return
        }

        monthlyOutputsByMonthIndex.value = new Map(
          (Array.isArray(payload?.monthlyPlans) ? payload.monthlyPlans : []).map((row) => [row.monthIndex, row])
        )
        status.value = 'ready'
        message.value = ''
      } catch (error) {
        if (currentToken !== requestToken) {
          return
        }

        monthlyOutputsByMonthIndex.value = new Map()

        if (error instanceof TypeError && /fetch/i.test(error.message || '')) {
          status.value = 'error'
          message.value = 'Unable to reach the planner API. If you are running locally, make sure the backend is running on 127.0.0.1:8000.'
          return
        }

        status.value = 'error'
        message.value = error instanceof Error ? error.message : 'Unable to calculate actual Intraday Erlang requirements.'
      }
    },
    { deep: true, immediate: true }
  )

  const actualsErlangStatus = computed(() => ({
    status: status.value,
    message: message.value
  }))

  return {
    actualsErlangStatus,
    monthlyOutputsByMonthIndex
  }
}
