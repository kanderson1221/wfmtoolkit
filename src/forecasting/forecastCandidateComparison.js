import {
  FORECAST_SOURCE_MODELED_DAILY,
  getForecastProjectSourceKind
} from './shared'

const finiteMetric = (value) => {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const getHoldout = (project = {}) => project?.lastRun?.diagnostics?.holdout || null

const getScoredRows = (project = {}) => {
  const rows = getHoldout(project)?.rows
  return Array.isArray(rows) ? rows : []
}

const normalizeText = (value) => String(value || '').trim()
const formatChoice = (value) => {
  const normalized = normalizeText(value).replaceAll('_', ' ')
  return normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : 'Not available'
}
const subtractMetrics = (candidateValue, referenceValue) =>
  Math.round((candidateValue - referenceValue) * 1_000_000) / 1_000_000

const settingDefinitions = [
  {
    id: 'trainingRange',
    label: 'Training period',
    value: (project) => normalizeText(getHoldout(project)?.trainingDateRange) || 'Not available'
  },
  {
    id: 'holdoutDays',
    label: 'Scored holdout',
    value: (project) => `${finiteMetric(getHoldout(project)?.testRows) ?? 0} days`
  },
  {
    id: 'growth',
    label: 'Growth model',
    value: (project) => formatChoice(project?.modelConfig?.growth)
  },
  {
    id: 'seasonalityMode',
    label: 'Seasonality mode',
    value: (project) => formatChoice(project?.modelConfig?.seasonalityMode)
  },
  {
    id: 'weeklySeasonality',
    label: 'Weekly seasonality',
    value: (project) => project?.modelConfig?.weeklySeasonalityEnabled ? 'Enabled' : 'Disabled'
  },
  {
    id: 'yearlySeasonality',
    label: 'Yearly seasonality',
    value: (project) => project?.modelConfig?.yearlySeasonalityEnabled ? 'Enabled' : 'Disabled'
  },
  {
    id: 'monthlySeasonality',
    label: 'Monthly seasonality',
    value: (project) => project?.modelConfig?.monthlySeasonalityEnabled ? 'Enabled' : 'Disabled'
  },
  {
    id: 'holidayCalendar',
    label: 'Built-in holidays',
    value: (project) => normalizeText(project?.modelConfig?.builtInHolidayCountry) || 'None'
  },
  {
    id: 'changepointPriorScale',
    label: 'Changepoint flexibility',
    value: (project) => String(finiteMetric(project?.modelConfig?.changepointPriorScale) ?? 'Not available')
  },
  {
    id: 'intervalWidth',
    label: 'Prediction interval',
    value: (project) => {
      const width = finiteMetric(getHoldout(project)?.intervalWidthPercent)
      return width == null ? 'Not available' : `${width}%`
    }
  }
]

const metricDefinitions = [
  {
    id: 'wape',
    label: 'WAPE',
    unit: 'percent',
    referenceValue: (holdout) => finiteMetric(holdout?.wape),
    interpretation: 'Total absolute error as a share of actual contacts; lower is better.'
  },
  {
    id: 'mae',
    label: 'MAE',
    unit: 'contacts',
    referenceValue: (holdout) => finiteMetric(holdout?.mae),
    interpretation: 'Average absolute error per scored day; lower is better.'
  },
  {
    id: 'bias',
    label: 'Mean bias',
    unit: 'signed-contacts',
    referenceValue: (holdout) => finiteMetric(holdout?.bias),
    interpretation: 'Forecast minus actual contacts per day; nearer zero is better.'
  },
  {
    id: 'intervalCoverage',
    label: 'Interval coverage',
    unit: 'percent',
    referenceValue: (holdout) => finiteMetric(holdout?.intervalCoverage),
    interpretation: 'Share of actual days inside each candidate’s configured interval.'
  },
  {
    id: 'benchmarkWape',
    label: 'Weekday benchmark WAPE',
    unit: 'percent',
    referenceValue: (holdout) => finiteMetric(holdout?.benchmark?.wape),
    interpretation: 'Training-only weekday baseline for the candidate’s own training period.'
  }
]

export const getForecastCandidateEligibility = (project = {}) => {
  if (getForecastProjectSourceKind(project) !== FORECAST_SOURCE_MODELED_DAILY) {
    return { eligible: false, reason: 'Only modeled daily forecasts can be compared.' }
  }

  if (!normalizeText(project?.id) || !normalizeText(project?.lastRun?.runAt)) {
    return { eligible: false, reason: 'Save and run this modeled forecast before comparing it.' }
  }

  const holdout = getHoldout(project)
  const rows = getScoredRows(project)
  if (!holdout || !rows.length) {
    return { eligible: false, reason: 'Rerun this forecast with a scored holdout period before comparing it.' }
  }

  if (rows.some((row) => !normalizeText(row?.ds) || finiteMetric(row?.actualValue) == null)) {
    return { eligible: false, reason: 'This saved holdout does not contain complete dated actuals.' }
  }

  return { eligible: true, reason: '' }
}

export const getComparableForecastCandidates = (projects = []) =>
  (Array.isArray(projects) ? projects : []).filter(
    (project) => getForecastCandidateEligibility(project).eligible
  )

const compareScoredActuals = (referenceRows, candidateRows) => {
  if (referenceRows.length !== candidateRows.length) {
    return false
  }

  return referenceRows.every((referenceRow, index) => {
    const candidateRow = candidateRows[index]
    return normalizeText(referenceRow?.ds) === normalizeText(candidateRow?.ds) &&
      Math.abs(Number(referenceRow?.actualValue) - Number(candidateRow?.actualValue)) < 0.0005
  })
}

export const buildForecastCandidateComparison = (referenceProject, candidateProject) => {
  const referenceEligibility = getForecastCandidateEligibility(referenceProject)
  const candidateEligibility = getForecastCandidateEligibility(candidateProject)

  if (!referenceEligibility.eligible || !candidateEligibility.eligible) {
    return {
      status: 'unavailable',
      message: referenceEligibility.reason || candidateEligibility.reason
    }
  }

  if (referenceProject.id === candidateProject.id) {
    return {
      status: 'same-candidate',
      message: 'Choose two different saved forecasts to compare.'
    }
  }

  const referenceRows = getScoredRows(referenceProject)
  const candidateRows = getScoredRows(candidateProject)
  if (!compareScoredActuals(referenceRows, candidateRows)) {
    return {
      status: 'incompatible',
      message: 'These forecasts were not scored against the same dated actual contacts. Rerun both with the same history and holdout window before comparing their metrics.'
    }
  }

  const referenceHoldout = getHoldout(referenceProject)
  const candidateHoldout = getHoldout(candidateProject)
  const metricRows = metricDefinitions.map((definition) => {
    const referenceValue = definition.referenceValue(referenceHoldout)
    const candidateValue = definition.referenceValue(candidateHoldout)

    return {
      ...definition,
      referenceValue,
      candidateValue,
      delta: referenceValue == null || candidateValue == null
        ? null
        : subtractMetrics(candidateValue, referenceValue)
    }
  })
  const settingRows = settingDefinitions.map((definition) => {
    const referenceValue = definition.value(referenceProject)
    const candidateValue = definition.value(candidateProject)

    return {
      id: definition.id,
      label: definition.label,
      referenceValue,
      candidateValue,
      changed: referenceValue !== candidateValue
    }
  })
  const referenceWape = finiteMetric(referenceHoldout?.wape)
  const candidateWape = finiteMetric(candidateHoldout?.wape)

  let summary = 'WAPE is unavailable because this holdout has no positive actual contact volume.'
  if (referenceWape != null && candidateWape != null) {
    const delta = candidateWape - referenceWape
    if (Math.abs(delta) < 0.0005) {
      summary = 'Both candidates have the same WAPE on this holdout.'
    } else {
      const lowerName = delta < 0 ? candidateProject.name : referenceProject.name
      summary = `${lowerName} has ${Math.abs(delta).toFixed(1)} percentage points lower WAPE on this holdout.`
    }
  }

  return {
    status: 'comparable',
    summary,
    decisionNote: 'This is comparative evidence, not an automatic acceptance decision.',
    referenceName: referenceProject.name,
    candidateName: candidateProject.name,
    testRows: referenceRows.length,
    testDateRange: normalizeText(referenceHoldout?.testDateRange),
    metricRows,
    settingRows
  }
}
