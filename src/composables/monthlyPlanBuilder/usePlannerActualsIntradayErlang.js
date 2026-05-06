import { computed, ref, watch } from 'vue'

import { MONTH_LABELS, PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../planner/shared'
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

const cloneRows = (rows) =>
  Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []

const buildInputSignature = (rows) =>
  JSON.stringify(Array.isArray(rows) ? rows : [])

const buildMonthGroups = (rows) => {
  const groupsByMonthIndex = new Map()

  for (const row of Array.isArray(rows) ? rows : []) {
    const monthIndex = Math.max(0, Math.min(MONTH_LABELS.length - 1, Math.round(Number(row?.monthIndex) || 0)))
    const existingGroup = groupsByMonthIndex.get(monthIndex)

    if (existingGroup) {
      existingGroup.rows.push(row)
      continue
    }

    groupsByMonthIndex.set(monthIndex, {
      monthIndex,
      monthLabel: MONTH_LABELS[monthIndex] || `Month ${monthIndex + 1}`,
      rows: [row]
    })
  }

  return [...groupsByMonthIndex.values()].sort((a, b) => a.monthIndex - b.monthIndex)
}

const emptyProgress = () => ({
  completedMonths: 0,
  totalMonths: 0,
  currentMonthLabel: '',
  completedRows: 0,
  totalRows: 0
})

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
  const progress = ref(emptyProgress())
  const monthlyOutputsByMonthIndex = ref(new Map())
  const currentInputSignature = ref('')
  const completedInputSignature = ref('')
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

  const resetProgress = () => {
    progress.value = emptyProgress()
  }

  const evaluatePayloadState = (nextPayloadState) => {
    requestToken += 1
    resetProgress()

    if (nextPayloadState.status === 'inactive' || nextPayloadState.status === 'actuals_required') {
      status.value = 'idle'
      message.value = ''
      currentInputSignature.value = ''
      completedInputSignature.value = ''
      monthlyOutputsByMonthIndex.value = new Map()
      return
    }

    if (nextPayloadState.status !== 'ready') {
      status.value = nextPayloadState.status
      message.value = nextPayloadState.message || ''
      currentInputSignature.value = ''
      completedInputSignature.value = ''
      monthlyOutputsByMonthIndex.value = new Map()
      return
    }

    const inputSignature = buildInputSignature(nextPayloadState.rows)
    currentInputSignature.value = inputSignature

    if (!completedInputSignature.value) {
      status.value = 'ready_to_run'
      message.value = 'Run actual staffing calculations to populate actual Intraday Erlang requirements.'
      monthlyOutputsByMonthIndex.value = new Map()
      return
    }

    if (completedInputSignature.value === inputSignature) {
      status.value = 'ready'
      message.value = ''
      return
    }

    status.value = 'stale'
    message.value = 'Actuals or plan inputs changed after the last actual staffing calculation. Rerun actual staffing calculations to refresh the comparison.'
  }

  watch(
    payloadState,
    (nextPayloadState) => {
      evaluatePayloadState(nextPayloadState)
    },
    { deep: true, immediate: true }
  )

  const runActualsErlangCalculations = async () => {
    const nextPayloadState = payloadState.value

    if (status.value === 'loading') {
      return false
    }

    if (nextPayloadState.status !== 'ready') {
      evaluatePayloadState(nextPayloadState)
      return false
    }

    const monthGroups = buildMonthGroups(nextPayloadState.rows)

    if (!monthGroups.length) {
      status.value = 'no_open_days'
      message.value = 'No open actual days are available in this plan year after applying operating days and holiday closures.'
      completedInputSignature.value = ''
      monthlyOutputsByMonthIndex.value = new Map()
      resetProgress()
      return false
    }

    requestToken += 1
    const currentToken = requestToken
    const totalRows = nextPayloadState.rows.length
    const inputSignature = buildInputSignature(nextPayloadState.rows)
    const monthlyOutputs = []
    let completedRows = 0

    status.value = 'loading'
    message.value = `Calculating actual staffing for ${monthGroups[0].monthLabel}.`
    progress.value = {
      completedMonths: 0,
      totalMonths: monthGroups.length,
      currentMonthLabel: monthGroups[0].monthLabel,
      completedRows: 0,
      totalRows
    }

    try {
      for (const [groupIndex, monthGroup] of monthGroups.entries()) {
        if (currentToken !== requestToken) {
          return false
        }

        message.value = `Calculating actual staffing for ${monthGroup.monthLabel}.`
        progress.value = {
          completedMonths: groupIndex,
          totalMonths: monthGroups.length,
          currentMonthLabel: monthGroup.monthLabel,
          completedRows,
          totalRows
        }

        const response = await fetch('/api/planner/intraday-erlang/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rows: monthGroup.rows
          })
        })

        if (!response.ok) {
          throw new Error(await extractApiErrorMessage(response))
        }

        const payload = await response.json()

        if (currentToken !== requestToken) {
          return false
        }

        monthlyOutputs.push(...cloneRows(payload?.monthlyPlans))
        completedRows += monthGroup.rows.length

        progress.value = {
          completedMonths: groupIndex + 1,
          totalMonths: monthGroups.length,
          currentMonthLabel: monthGroup.monthLabel,
          completedRows,
          totalRows
        }
      }

      if (currentToken !== requestToken) {
        return false
      }

      completedInputSignature.value = inputSignature
      currentInputSignature.value = inputSignature
      monthlyOutputsByMonthIndex.value = new Map(
        monthlyOutputs.map((row) => [row.monthIndex, row])
      )
      status.value = 'ready'
      message.value = ''

      return true
    } catch (error) {
      if (currentToken !== requestToken) {
        return false
      }

      completedInputSignature.value = ''
      monthlyOutputsByMonthIndex.value = new Map()
      resetProgress()

      if (error instanceof TypeError && /fetch/i.test(error.message || '')) {
        status.value = 'error'
        message.value = 'Unable to reach the planner API. If you are running locally, make sure the backend is running on 127.0.0.1:8000.'
        return false
      }

      status.value = 'error'
      message.value = error instanceof Error ? error.message : 'Unable to calculate actual Intraday Erlang requirements.'
      return false
    }
  }

  const actualsCanRun = computed(() =>
    payloadState.value.status === 'ready' && status.value !== 'loading'
  )

  const actualsErlangStatus = computed(() => ({
    status: status.value,
    message: message.value,
    canRun: actualsCanRun.value,
    isRunning: status.value === 'loading',
    isStale: status.value === 'stale',
    hasResults: Boolean(completedInputSignature.value),
    inputSignature: currentInputSignature.value,
    progress: { ...progress.value }
  }))

  return {
    actualsErlangStatus,
    runActualsErlangCalculations,
    monthlyOutputsByMonthIndex
  }
}
