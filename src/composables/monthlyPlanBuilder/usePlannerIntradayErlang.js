import { computed, ref, watch } from 'vue'

import { MONTH_LABELS, PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../planner/shared'
import {
  assessPlannerIntradayErlangResults,
  buildPlannerIntradayErlangInputSignature,
  buildPlannerIntradayErlangPayload,
  normalizePlannerIntradayErlangResults
} from '../../planner/intradayErlang'

const ERLANG_RESULTS_VERSION = 2

const extractApiErrorMessage = async (response) => {
  const rawErrorText = await response.text().catch(() => '')

  if (!rawErrorText) {
    return `Intraday Erlang request failed (${response.status}).`
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

  return `Intraday Erlang request failed (${response.status}).`
}

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

const cloneRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({ ...row }))

const buildMonthGroups = (rows = []) => {
  const groupsByMonthIndex = new Map()

  for (const row of Array.isArray(rows) ? rows : []) {
    const monthIndex = Math.max(0, Math.min(MONTH_LABELS.length - 1, Math.round(Number(row?.monthIndex) || 0)))
    const existingRows = groupsByMonthIndex.get(monthIndex) || []
    groupsByMonthIndex.set(monthIndex, [...existingRows, row])
  }

  return [...groupsByMonthIndex.entries()]
    .sort(([leftMonthIndex], [rightMonthIndex]) => leftMonthIndex - rightMonthIndex)
    .map(([monthIndex, groupRows]) => ({
      monthIndex,
      monthLabel: MONTH_LABELS[monthIndex] || `Month ${monthIndex + 1}`,
      rows: groupRows
    }))
}

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
  const status = ref('idle')
  const message = ref('')
  const progress = ref({
    completedMonths: 0,
    totalMonths: 0,
    currentMonthLabel: '',
    completedRows: 0,
    totalRows: 0
  })
  const currentInputSignature = ref('')
  const monthlyOutputsByMonthIndex = ref(new Map())
  const intervalOutputs = ref([])
  const dailyOutputs = ref([])
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

  const hasStoredResults = computed(() => Boolean(normalizePlannerIntradayErlangResults(storedResultsRef.value)))

  const applyResults = (results) => {
    const normalizedResults = normalizePlannerIntradayErlangResults(results)

    if (!normalizedResults) {
      monthlyOutputsByMonthIndex.value = new Map()
      intervalOutputs.value = []
      dailyOutputs.value = []
      return null
    }

    monthlyOutputsByMonthIndex.value = new Map(
      normalizedResults.monthlyOutputs.map((row) => [row.monthIndex, row])
    )
    intervalOutputs.value = cloneRows(normalizedResults.intervalOutputs)
    dailyOutputs.value = cloneRows(normalizedResults.dailyOutputs)

    return normalizedResults
  }

  const resetProgress = () => {
    progress.value = {
      completedMonths: 0,
      totalMonths: 0,
      currentMonthLabel: '',
      completedRows: 0,
      totalRows: 0
    }
  }

  const evaluatePayloadState = (nextPayloadState) => {
    requestToken += 1
    resetProgress()

    if (nextPayloadState.status === 'inactive') {
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

    const assessment = assessPlannerIntradayErlangResults(nextPayloadState, storedResultsRef.value)

    applyResults(assessment.results)
    currentInputSignature.value = assessment.inputSignature
    status.value = assessment.status === 'missing' ? 'ready_to_run' : assessment.status
    message.value = assessment.message
  }

  watch(
    [payloadState, () => storedResultsRef.value],
    ([nextPayloadState]) => {
      evaluatePayloadState(nextPayloadState)
    },
    { deep: true, immediate: true }
  )

  const runErlangCalculations = async () => {
    const nextPayloadState = payloadState.value

    if (nextPayloadState.status !== 'ready') {
      evaluatePayloadState(nextPayloadState)
      return false
    }

    const monthGroups = buildMonthGroups(nextPayloadState.rows)
    if (!monthGroups.length) {
      status.value = 'no_open_days'
      message.value = 'No open forecast days are available in this plan year after applying operating days and holiday closures.'
      applyResults(null)
      return false
    }

    requestToken += 1
    const currentToken = requestToken
    const totalRows = nextPayloadState.rows.length
    const inputSignature = buildPlannerIntradayErlangInputSignature(nextPayloadState.rows)
    const monthlyOutputs = []
    const intervalOutputRows = []
    const dailyOutputRows = []
    let completedRows = 0

    status.value = 'loading'
    message.value = `Calculating staffing for ${monthGroups[0].monthLabel}.`
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

        message.value = `Calculating staffing for ${monthGroup.monthLabel}.`
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
        intervalOutputRows.push(...enrichIntervalOutputRows(payload?.intervalPlans, monthGroup.rows))
        dailyOutputRows.push(...cloneRows(payload?.dailyPlans))
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
        intervalOutputs: intervalOutputRows,
        dailyOutputs: dailyOutputRows
      }

      storedResultsRef.value = nextResults
      applyResults(nextResults)
      currentInputSignature.value = inputSignature
      status.value = 'ready'
      message.value = ''

      return true
    } catch (error) {
      if (currentToken !== requestToken) {
        return false
      }

      if (error instanceof TypeError && /fetch/i.test(error.message || '')) {
        status.value = 'error'
        message.value = 'Unable to reach the planner API. If you are running locally, make sure the backend is running on 127.0.0.1:8000.'
        return false
      }

      status.value = 'error'
      message.value = error instanceof Error ? error.message : 'Unable to calculate interval Erlang outputs.'
      return false
    }
  }

  const erlangCanRun = computed(() =>
    payloadState.value.status === 'ready' && status.value !== 'loading'
  )

  const erlangStatus = computed(() => ({
    status: status.value,
    message: message.value,
    canRun: erlangCanRun.value,
    isRunning: status.value === 'loading',
    isStale: status.value === 'stale',
    hasResults: hasStoredResults.value,
    calculatedAt: normalizePlannerIntradayErlangResults(storedResultsRef.value)?.calculatedAt || '',
    inputSignature: currentInputSignature.value,
    progress: { ...progress.value }
  }))

  return {
    erlangStatus,
    runErlangCalculations,
    monthlyOutputsByMonthIndex,
    intervalOutputs,
    dailyOutputs
  }
}
