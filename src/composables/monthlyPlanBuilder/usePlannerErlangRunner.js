import { computed, ref, watch } from 'vue'

import { MONTH_LABELS } from '../../planner/shared'
import {
  assessPlannerIntradayErlangResults,
  buildPlannerIntradayErlangInputSignature,
  normalizePlannerIntradayErlangResults
} from '../../planner/intradayErlang'

const cloneRows = (rows) => Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []
const emptyProgress = () => ({
  completedMonths: 0,
  totalMonths: 0,
  currentMonthLabel: '',
  completedRows: 0,
  totalRows: 0
})

const buildMonthGroups = (rows) => {
  const groups = new Map()
  for (const row of rows) {
    const monthIndex = Math.max(0, Math.min(MONTH_LABELS.length - 1, Math.round(Number(row?.monthIndex) || 0)))
    if (!groups.has(monthIndex)) {
      groups.set(monthIndex, { monthIndex, monthLabel: MONTH_LABELS[monthIndex], rows: [] })
    }
    groups.get(monthIndex).rows.push(row)
  }
  return [...groups.values()].sort((a, b) => a.monthIndex - b.monthIndex)
}

const extractApiErrorMessage = async (response, label) => {
  const text = await response.text().catch(() => '')
  try {
    const detail = JSON.parse(text)?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  } catch {
    const flattened = text.replace(/\s+/g, ' ').trim()
    if (flattened) return flattened.slice(0, 240)
  }
  return `${label} Erlang request failed (${response.status}).`
}

// Share execution and recovery while keeping forecast/actuals input validation
// in their feature composables. Actuals retain monthly evidence only.
export const usePlannerErlangRunner = ({
  payloadState,
  storedResults,
  actuals = false,
  enrichIntervalOutputs = cloneRows
}) => {
  const storedResultsRef = storedResults || ref(null)
  const status = ref('idle')
  const message = ref('')
  const progress = ref(emptyProgress())
  const currentInputSignature = ref('')
  const monthlyOutputsByMonthIndex = ref(new Map())
  const intervalOutputs = ref([])
  const dailyOutputs = ref([])
  let requestToken = 0

  const applyResults = (results) => {
    const normalized = normalizePlannerIntradayErlangResults(results)
    monthlyOutputsByMonthIndex.value = new Map(
      (normalized?.monthlyOutputs || []).map((row) => [Number(row.monthIndex), row])
    )
    if (!actuals) {
      intervalOutputs.value = cloneRows(normalized?.intervalOutputs)
      dailyOutputs.value = cloneRows(normalized?.dailyOutputs)
    }
  }

  const evaluatePayloadState = (payload) => {
    requestToken += 1
    progress.value = emptyProgress()
    if (payload.status !== 'ready') {
      const idle = payload.status === 'inactive' || (actuals && payload.status === 'actuals_required')
      status.value = idle ? 'idle' : payload.status
      message.value = idle ? '' : payload.message || ''
      currentInputSignature.value = ''
      applyResults(null)
      return
    }
    const assessment = assessPlannerIntradayErlangResults(payload, storedResultsRef.value, { actuals })
    currentInputSignature.value = assessment.inputSignature
    status.value = assessment.status === 'missing' ? 'ready_to_run' : assessment.status
    message.value = assessment.message
    applyResults(actuals && assessment.status !== 'ready' ? null : assessment.results)
  }

  watch([payloadState, () => storedResultsRef.value], ([payload]) => evaluatePayloadState(payload), {
    deep: true,
    immediate: true
  })

  const runCalculations = async () => {
    if (status.value === 'loading') return false
    const payload = payloadState.value
    if (payload.status !== 'ready') {
      evaluatePayloadState(payload)
      return false
    }
    const groups = buildMonthGroups(payload.rows)
    if (!groups.length) {
      status.value = 'no_open_days'
      message.value = `No open ${actuals ? 'actual' : 'forecast'} days are available in this plan year after applying operating days and holiday closures.`
      applyResults(null)
      progress.value = emptyProgress()
      return false
    }
    const token = ++requestToken
    const inputSignature = buildPlannerIntradayErlangInputSignature(payload.rows)
    const monthlyOutputs = []
    const intervalRows = []
    const dailyRows = []
    let completedRows = 0
    status.value = 'loading'

    const updateProgress = (monthLabel, completedMonths) => {
      message.value = `Calculating ${actuals ? 'actual ' : ''}staffing for ${monthLabel}.`
      progress.value = {
        completedMonths,
        totalMonths: groups.length,
        currentMonthLabel: monthLabel,
        completedRows,
        totalRows: payload.rows.length
      }
    }
    updateProgress(groups[0].monthLabel, 0)

    try {
      for (const [index, group] of groups.entries()) {
        if (token !== requestToken) return false
        updateProgress(group.monthLabel, index)
        const response = await fetch('/api/planner/intraday-erlang/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: group.rows })
        })
        if (!response.ok) {
          throw new Error(await extractApiErrorMessage(response, actuals ? 'Actuals' : 'Intraday'))
        }
        const result = await response.json()
        if (token !== requestToken) return false
        monthlyOutputs.push(...cloneRows(result?.monthlyPlans))
        if (!actuals) {
          intervalRows.push(...enrichIntervalOutputs(result?.intervalPlans, group.rows))
          dailyRows.push(...cloneRows(result?.dailyPlans))
        }
        completedRows += group.rows.length
        updateProgress(group.monthLabel, index + 1)
      }
      if (token !== requestToken) return false
      const results = {
        version: 2,
        calculatedAt: new Date().toISOString(),
        inputSignature,
        rowCount: payload.rows.length,
        monthCount: groups.length,
        monthlyOutputs,
        intervalOutputs: intervalRows,
        dailyOutputs: dailyRows
      }
      storedResultsRef.value = results
      currentInputSignature.value = inputSignature
      applyResults(results)
      status.value = 'ready'
      message.value = ''
      return true
    } catch (error) {
      if (token !== requestToken) return false
      if (actuals) {
        applyResults(null)
        progress.value = emptyProgress()
      }
      status.value = 'error'
      message.value = error instanceof TypeError && /fetch/i.test(error.message || '')
        ? 'Unable to reach the planner API. If you are running locally, make sure the backend is running on 127.0.0.1:8000.'
        : error instanceof Error ? error.message : actuals
          ? 'Unable to calculate actual Intraday Erlang requirements.'
          : 'Unable to calculate interval Erlang outputs.'
      return false
    }
  }

  const erlangStatus = computed(() => ({
    status: status.value,
    message: message.value,
    canRun: payloadState.value.status === 'ready' && status.value !== 'loading',
    isRunning: status.value === 'loading',
    isStale: status.value === 'stale',
    hasResults: Boolean(normalizePlannerIntradayErlangResults(storedResultsRef.value)),
    calculatedAt: normalizePlannerIntradayErlangResults(storedResultsRef.value)?.calculatedAt || '',
    inputSignature: currentInputSignature.value,
    progress: { ...progress.value }
  }))

  return { erlangStatus, runCalculations, monthlyOutputsByMonthIndex, intervalOutputs, dailyOutputs }
}
