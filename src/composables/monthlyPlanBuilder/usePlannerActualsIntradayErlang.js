import { computed, ref, watch } from 'vue'

import { MONTH_LABELS, PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../planner/shared'
import {
  assessPlannerIntradayErlangResults,
  buildPlannerActualsIntradayErlangPayload,
  buildPlannerIntradayErlangInputSignature,
  normalizePlannerIntradayErlangResults
} from '../../planner/intradayErlang'

const ERLANG_RESULTS_VERSION = 1

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
  intraday,
  storedResults
}) => {
  const status = ref('idle')
  const message = ref('')
  const progress = ref(emptyProgress())
  const monthlyOutputsByMonthIndex = ref(new Map())
  const currentInputSignature = ref('')
  const storedResultsRef = storedResults || ref(null)
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

  const applyResults = (results) => {
    const normalizedResults = normalizePlannerIntradayErlangResults(results)
    monthlyOutputsByMonthIndex.value = new Map(
      (normalizedResults?.monthlyOutputs || []).map((row) => [Number(row.monthIndex), row])
    )
    return normalizedResults
  }

  const evaluatePayloadState = (nextPayloadState) => {
    requestToken += 1
    resetProgress()

    if (nextPayloadState.status === 'inactive' || nextPayloadState.status === 'actuals_required') {
      status.value = 'idle'
      message.value = ''
      currentInputSignature.value = ''
      applyResults(null)
      return
    }

    if (nextPayloadState.status !== 'ready') {
      status.value = nextPayloadState.status
      message.value = nextPayloadState.message || ''
      currentInputSignature.value = ''
      applyResults(null)
      return
    }

    const assessment = assessPlannerIntradayErlangResults(
      nextPayloadState,
      storedResultsRef.value,
      { actuals: true }
    )
    currentInputSignature.value = assessment.inputSignature
    status.value = assessment.status === 'missing' ? 'ready_to_run' : assessment.status
    message.value = assessment.message
    applyResults(assessment.status === 'ready' ? assessment.results : null)
  }

  watch(
    [payloadState, () => storedResultsRef.value],
    ([nextPayloadState]) => {
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
      applyResults(null)
      resetProgress()
      return false
    }

    requestToken += 1
    const currentToken = requestToken
    const totalRows = nextPayloadState.rows.length
    const inputSignature = buildPlannerIntradayErlangInputSignature(nextPayloadState.rows)
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

      const nextResults = {
        version: ERLANG_RESULTS_VERSION,
        calculatedAt: new Date().toISOString(),
        inputSignature,
        rowCount: totalRows,
        monthCount: monthGroups.length,
        monthlyOutputs,
        intervalOutputs: [],
        dailyOutputs: []
      }

      storedResultsRef.value = nextResults
      currentInputSignature.value = inputSignature
      applyResults(nextResults)
      status.value = 'ready'
      message.value = ''

      return true
    } catch (error) {
      if (currentToken !== requestToken) {
        return false
      }

      applyResults(null)
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
    hasResults: Boolean(normalizePlannerIntradayErlangResults(storedResultsRef.value)),
    inputSignature: currentInputSignature.value,
    progress: { ...progress.value }
  }))

  return {
    actualsErlangStatus,
    runActualsErlangCalculations,
    monthlyOutputsByMonthIndex
  }
}
