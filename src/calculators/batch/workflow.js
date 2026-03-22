export const createEmptyWorkflowState = () => ({
  hasSubmitted: false,
  summary: null,
  errors: [],
  results: [],
  exportData: {}
})

export const normalizeWorkflowPayload = (workflowPayload = {}) => {
  const workflowErrors = workflowPayload.errors ?? []
  const workflowResults = workflowPayload.results ?? []

  return {
    hasSubmitted: true,
    summary: workflowPayload.summary ?? null,
    errors: workflowErrors,
    results: workflowResults,
    exportData: workflowPayload.export ?? {}
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
