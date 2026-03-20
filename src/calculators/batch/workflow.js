export const createEmptyWorkflowState = () => ({
  hasSubmitted: false,
  summary: null,
  errors: [],
  results: [],
  calculatedRows: [],
  dailyBreakdown: [],
  shiftPlan: [],
  scheduleCoverage: [],
  agentSchedules: [],
  exportData: {},
  activeResultsTab: 'summary',
  focusedRowIndex: null,
  activeChartPointIndex: null,
  activeSchedulePointIndex: null
})

export const normalizeWorkflowPayload = (workflowPayload = {}) => {
  const workflowErrors = workflowPayload.errors ?? []
  const workflowResults = workflowPayload.results ?? []
  const workflowCalculatedRows = workflowPayload.calculatedRows ?? workflowResults

  return {
    hasSubmitted: true,
    summary: workflowPayload.summary ?? null,
    errors: workflowErrors,
    results: workflowResults,
    calculatedRows: workflowCalculatedRows,
    dailyBreakdown: workflowPayload.dailyBreakdown ?? [],
    shiftPlan: workflowPayload.shiftPlan ?? [],
    scheduleCoverage: workflowPayload.scheduleCoverage ?? [],
    agentSchedules: workflowPayload.agentSchedules ?? [],
    exportData: workflowPayload.export ?? {},
    activeResultsTab:
      workflowErrors.length > 0 &&
      workflowResults.length === 0 &&
      workflowCalculatedRows.length === 0
        ? 'errors'
        : 'summary',
    focusedRowIndex: null,
    activeChartPointIndex: null,
    activeSchedulePointIndex: null
  }
}

export const extractWorkflowErrorMessage = async (response) => {
  const rawErrorText = await response.text().catch(() => '')
  let detailText = `Workflow failed (${response.status}).`

  if (!rawErrorText) {
    return detailText
  }

  try {
    const errorPayload = JSON.parse(rawErrorText)
    const detail = errorPayload?.detail

    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const firstDetail = detail[0]
      if (typeof firstDetail === 'string' && firstDetail.trim()) {
        return firstDetail
      }
      if (firstDetail?.msg) {
        return String(firstDetail.msg)
      }
    }
  } catch {
    const flattened = rawErrorText.replace(/\s+/g, ' ').trim()
    if (flattened.length > 0) {
      return flattened.slice(0, 220)
    }
  }

  return detailText
}
