import {
  buildMonthlyRollupFromDailyForecastRows,
  buildForecastCoverageMonthStarts,
  createEmptyForecastResults,
  FORECAST_SOURCE_IMPORTED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  formatWhole,
  getForecastTypeLabel,
  resolveForecastCoverageWindow,
  resolveForecastType
} from './shared'
import { guessColumnMapping, parseCsvText, parseDateValue, parseNumberValue } from './csv'

const formatMonthLabel = (value) => {
  const parsed = parseDateValue(value)

  if (!parsed) {
    return String(value || '')
  }

  const [year, month, day] = parsed.split('-').map((part) => Number(part))

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

const getMonthDayCount = (monthStart) => {
  const parsed = parseDateValue(monthStart)

  if (!parsed) {
    return 0
  }

  const [yearText, monthText] = String(parsed).slice(0, 7).split('-')
  const year = Number(yearText)
  const monthIndex = Number(monthText) - 1
  return new Date(year, monthIndex + 1, 0).getDate()
}

const toUtcDate = (value) => {
  const normalized = parseDateValue(value)
  if (!normalized) {
    return null
  }

  const [year, month, day] = normalized.split('-').map((part) => Number(part))
  return new Date(Date.UTC(year, month - 1, day))
}

const getInclusiveDateCount = (startDate, endDate) => {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime()) || !(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
    return 0
  }

  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1
}

const matchesCoverageWindowExactly = (rows = [], coverageWindow = {}) => {
  const startDate = toUtcDate(coverageWindow.coverageStartDate)
  const endDate = toUtcDate(coverageWindow.coverageEndDate)

  if (!startDate || !endDate || !Array.isArray(rows) || !rows.length) {
    return false
  }

  const expectedRowCount = getInclusiveDateCount(startDate, endDate)
  if (rows.length !== expectedRowCount) {
    return false
  }

  for (let index = 0; index < rows.length; index += 1) {
    const expectedDate = new Date(startDate.getTime() + (index * 86400000)).toISOString().slice(0, 10)
    if (rows[index]?.ds !== expectedDate) {
      return false
    }
  }

  return true
}

const buildImportedCoverageIssue = (coverageWindow = {}) => {
  const forecastTypeLabel = String(getForecastTypeLabel(coverageWindow.forecastType || '') || 'Forecast').toLowerCase()

  if (!coverageWindow.planningYear || !coverageWindow.coverageStartDate || !coverageWindow.coverageEndDate) {
    return 'This imported forecast must match the selected staffing-group forecast window.'
  }

  return `This imported ${forecastTypeLabel} must contain one complete daily forecast from ${coverageWindow.coverageStartDate} through ${coverageWindow.coverageEndDate}.`
}

const buildSummary = ({
  dailyForecast = [],
  monthlyRollup = [],
  planningYear = null,
  forecastType = '',
  coverageStartMonthIndex = 0,
  coverageStartDate = '',
  coverageEndDate = ''
} = {}) => {
  const projectedTotalContacts = monthlyRollup.reduce((sum, row) => sum + Number(row?.contacts || 0), 0)
  const peakMonth = monthlyRollup.reduce(
    (currentPeak, row) => (
      Number(row?.contacts || 0) > Number(currentPeak?.contacts || -1)
        ? row
        : currentPeak
    ),
    null
  )
  const peakDay = dailyForecast.reduce(
    (currentPeak, row) => (
      Number(row?.yhat || 0) > Number(currentPeak?.yhat || -1)
        ? row
        : currentPeak
    ),
    null
  )
  const firstForecastDate = dailyForecast[0]?.ds || monthlyRollup[0]?.monthStart || ''
  const lastForecastDate = dailyForecast.at(-1)?.ds || monthlyRollup.at(-1)?.monthStart || ''
  const coverageWindow = resolveForecastCoverageWindow({
    planningYear,
    forecastType,
    coverageStartMonthIndex,
    coverageStartDate,
    coverageEndDate
  })
  const expectedMonthStarts = buildForecastCoverageMonthStarts(
    coverageWindow.coverageStartDate,
    coverageWindow.coverageEndDate
  )
  const monthlyRollupMonthStarts = monthlyRollup.map((row) => String(row?.monthStart || ''))
  const planningReady = Boolean(
    expectedMonthStarts.length &&
      monthlyRollupMonthStarts.length === expectedMonthStarts.length &&
      expectedMonthStarts.every((monthStart, index) => monthlyRollupMonthStarts[index] === monthStart)
  )

  return {
    originalObservations: dailyForecast.length,
    observationsUsed: dailyForecast.length,
    forecastDateRange: firstForecastDate && lastForecastDate ? `${firstForecastDate} to ${lastForecastDate}` : '',
    projectedTotalContacts,
    peakForecastMonthLabel: peakMonth?.monthLabel || '',
    peakForecastDayDate: peakDay?.ds || '',
    peakForecastDayVolume: Number(peakDay?.yhat || 0),
    planningYear,
    forecastType,
    coverageStartMonthIndex: coverageWindow.coverageStartMonthIndex,
    coverageStartDate: coverageWindow.coverageStartDate,
    coverageEndDate: coverageWindow.coverageEndDate,
    planningReady
  }
}

const sanitizeImportedDailyColumnMapping = (headers = [], mapping = {}, guessed = {}) => {
  const availableHeaders = new Set(headers)

  return {
    dateColumn: availableHeaders.has(mapping.dateColumn) ? mapping.dateColumn : guessed.dateColumn || '',
    forecastColumn: availableHeaders.has(mapping.forecastColumn) ? mapping.forecastColumn : guessed.forecastColumn || '',
    ahtColumn: availableHeaders.has(mapping.ahtColumn) ? mapping.ahtColumn : guessed.ahtColumn || ''
  }
}

const guessImportedDailyColumnMapping = (headers = []) => {
  const baseGuess = guessColumnMapping(headers)
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: String(header || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }))
  const ahtCandidates = [
    'aht',
    'aht_seconds',
    'avg_aht',
    'avg_aht_seconds',
    'average_aht',
    'average_aht_seconds',
    'average_handle_time',
    'average_handle_time_seconds',
    'handle_time_seconds'
  ]

  return {
    dateColumn: baseGuess.dateColumn || '',
    forecastColumn: baseGuess.volumeColumn || '',
    ahtColumn: normalizedHeaders.find((header) => ahtCandidates.includes(header.normalized))?.original || ''
  }
}

const normalizeImportedDailyRows = ({ rows = [], mapping = {} } = {}) => {
  const issues = []
  const importedRows = []
  const dateColumn = mapping.dateColumn || ''
  const forecastColumn = mapping.forecastColumn || ''
  const ahtColumn = mapping.ahtColumn || ''

  if (!dateColumn) {
    issues.push('Choose the date column before loading an imported forecast.')
  }

  if (!forecastColumn) {
    issues.push('Choose the contacts column before loading an imported forecast.')
  }

  if (!ahtColumn) {
    issues.push('Choose the average handle time column before loading an imported forecast.')
  }

  if (issues.length) {
    return { rows: importedRows, issues }
  }

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const ds = parseDateValue(row?.[dateColumn])
    const forecastValue = parseNumberValue(row?.[forecastColumn])
    const ahtSeconds = parseNumberValue(row?.[ahtColumn])

    if (!ds) {
      issues.push(`Row ${row.rowIndex}: enter a valid date in "${dateColumn}".`)
      return
    }

    if (forecastValue == null || forecastValue < 0) {
      issues.push(`Row ${row.rowIndex}: enter a numeric contacts value in "${forecastColumn}".`)
      return
    }

    if (ahtSeconds == null || ahtSeconds < 0) {
      issues.push(`Row ${row.rowIndex}: enter numeric average handle time seconds in "${ahtColumn}".`)
      return
    }

    importedRows.push({
      ds,
      yhat: forecastValue,
      yhatLower: forecastValue,
      yhatUpper: forecastValue,
      ahtSeconds,
      actualValue: null,
      isHistory: false
    })
  })

  return {
    rows: importedRows.sort((left, right) => left.ds.localeCompare(right.ds)),
    issues
  }
}

export const buildMonthlyAhtOverridesFromImportedDailyRows = (rows = []) => {
  const monthBuckets = new Map()

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const ds = parseDateValue(row?.ds)
    const monthStart = ds ? `${ds.slice(0, 7)}-01` : ''
    const ahtSeconds = Number(row?.ahtSeconds)

    if (!monthStart || !Number.isFinite(ahtSeconds) || ahtSeconds < 0) {
      return
    }

    const contacts = Math.max(Number(row?.yhat || 0), 0)
    const bucket = monthBuckets.get(monthStart) || {
      monthStart,
      weightedAhtTotal: 0,
      weightedContacts: 0,
      simpleAhtTotal: 0,
      simpleCount: 0
    }

    bucket.simpleAhtTotal += ahtSeconds
    bucket.simpleCount += 1

    if (contacts > 0) {
      bucket.weightedAhtTotal += contacts * ahtSeconds
      bucket.weightedContacts += contacts
    }

    monthBuckets.set(monthStart, bucket)
  })

  return [...monthBuckets.values()]
    .sort((left, right) => left.monthStart.localeCompare(right.monthStart))
    .map((bucket) => ({
      monthStart: bucket.monthStart,
      ahtSeconds: bucket.weightedContacts > 0
        ? bucket.weightedAhtTotal / bucket.weightedContacts
        : bucket.simpleCount > 0
          ? bucket.simpleAhtTotal / bucket.simpleCount
          : null
    }))
    .filter((row) => Number.isFinite(row.ahtSeconds) && row.ahtSeconds >= 0)
}

const validateImportedDailyCoverage = ({
  rows = [],
  planningYear = null,
  forecastType = '',
  coverageStartMonthIndex = 0,
  coverageStartDate = '',
  coverageEndDate = ''
} = {}) => {
  const coverageWindow = resolveForecastCoverageWindow({
    planningYear,
    forecastType,
    coverageStartMonthIndex,
    coverageStartDate,
    coverageEndDate
  })

  if (!coverageWindow.coverageStartDate || !coverageWindow.coverageEndDate) {
    return []
  }

  return matchesCoverageWindowExactly(rows, coverageWindow)
    ? []
    : [buildImportedCoverageIssue(coverageWindow)]
}

export const buildImportedDailySourceState = ({
  fileName = '',
  headers = [],
  rows = [],
  currentMapping = {},
  parserIssues = [],
  planningYear = null,
  forecastType = '',
  coverageStartMonthIndex = 0,
  coverageStartDate = '',
  coverageEndDate = ''
} = {}) => {
  const guessedMapping = guessImportedDailyColumnMapping(headers)
  const columnMapping = sanitizeImportedDailyColumnMapping(headers, currentMapping, guessedMapping)
  const normalized = normalizeImportedDailyRows({
    rows,
    mapping: columnMapping
  })
  const coverageIssues = validateImportedDailyCoverage({
    rows: normalized.rows,
    planningYear,
    forecastType,
    coverageStartMonthIndex,
    coverageStartDate,
    coverageEndDate
  })

  return {
    fileName: fileName || '',
    headers,
    rows,
    mapping: columnMapping,
    issues: [...parserIssues, ...normalized.issues, ...coverageIssues],
    importedDailyRows: normalized.rows,
    ahtMonthOverrides: buildMonthlyAhtOverridesFromImportedDailyRows(normalized.rows)
  }
}

export const buildImportedDailySourceStateFromText = ({
  fileName = '',
  text = '',
  currentMapping = {},
  planningYear = null,
  forecastType = '',
  coverageStartMonthIndex = 0,
  coverageStartDate = '',
  coverageEndDate = ''
} = {}) => {
  const parsed = parseCsvText(text)

  return buildImportedDailySourceState({
    fileName,
    headers: parsed.headers,
    rows: parsed.rows,
    currentMapping,
    parserIssues: parsed.issues,
    planningYear,
    forecastType,
    coverageStartMonthIndex,
    coverageStartDate,
    coverageEndDate
  })
}

export const buildImportedDailySourceStateFromFile = async (file, currentMapping = {}, options = {}) => {
  const text = await file.text()

  return buildImportedDailySourceStateFromText({
    fileName: file?.name || '',
    text,
    currentMapping,
    planningYear: options.planningYear,
    forecastType: options.forecastType,
    coverageStartMonthIndex: options.coverageStartMonthIndex,
    coverageStartDate: options.coverageStartDate,
    coverageEndDate: options.coverageEndDate
  })
}

export const createImportedDailyForecastResults = ({
  rows = [],
  planningYear = null,
  forecastType = '',
  coverageStartMonthIndex = 0,
  coverageStartDate = '',
  coverageEndDate = ''
} = {}) => {
  const dailyForecast = (Array.isArray(rows) ? rows : []).map((row) => ({ ...row }))
  const monthlyRollup = buildMonthlyRollupFromDailyForecastRows(dailyForecast)
  const resolvedForecastType = resolveForecastType(forecastType, { planningYear })

  return createEmptyForecastResults({
    runAt: new Date().toISOString(),
    dailyForecast,
    monthlyRollup,
    components: {},
    summary: buildSummary({
      dailyForecast,
      monthlyRollup,
      planningYear,
      forecastType: resolvedForecastType,
      coverageStartMonthIndex,
      coverageStartDate,
      coverageEndDate
    }),
    diagnostics: {
      warnings: [],
      validationNotes: [
        'Imported daily forecasts are read-only in the staffing-group forecast library.'
      ],
      holdout: null
    }
  })
}

export const createManualMonthlyEntryRows = ({
  planningYear = null,
  forecastType = '',
  coverageStartMonthIndex = 0,
  coverageStartDate = '',
  coverageEndDate = '',
  seedRows = []
} = {}) => {
  const coverageWindow = resolveForecastCoverageWindow({
    planningYear,
    forecastType,
    coverageStartMonthIndex,
    coverageStartDate,
    coverageEndDate
  })
  const seedByMonthStart = new Map(
    (Array.isArray(seedRows) ? seedRows : []).map((row) => [String(row?.monthStart || ''), row])
  )

  return buildForecastCoverageMonthStarts(coverageWindow.coverageStartDate, coverageWindow.coverageEndDate).map((monthStart) => {
    const monthIndex = Number(monthStart.slice(5, 7)) - 1
    const seededRow = seedByMonthStart.get(monthStart)

    return {
      monthIndex,
      monthStart,
      monthLabel: formatMonthLabel(monthStart),
      contacts: Number(seededRow?.contacts || 0)
    }
  })
}

export const createManualMonthlyForecastResults = ({
  rows = [],
  planningYear = null,
  forecastType = '',
  coverageStartMonthIndex = 0,
  coverageStartDate = '',
  coverageEndDate = ''
} = {}) => {
  const monthlyRollup = (Array.isArray(rows) ? rows : [])
    .filter((row) => String(row?.monthStart || '').trim())
    .map((row) => {
      const contacts = Math.max(Number(row?.contacts || 0), 0)
      const monthStart = row.monthStart
      const dayCount = getMonthDayCount(monthStart)

      return {
        monthStart,
        monthLabel: row.monthLabel || formatMonthLabel(monthStart),
        contacts,
        averageDailyVolume: dayCount > 0 ? contacts / dayCount : 0,
        peakDailyDate: '',
        peakDailyVolume: 0,
        lowerBoundContacts: contacts,
        upperBoundContacts: contacts
      }
    })
    .sort((left, right) => left.monthStart.localeCompare(right.monthStart))
  const resolvedForecastType = resolveForecastType(forecastType, { planningYear })

  return createEmptyForecastResults({
    runAt: new Date().toISOString(),
    dailyForecast: [],
    monthlyRollup,
    components: {},
    summary: buildSummary({
      dailyForecast: [],
      monthlyRollup,
      planningYear,
      forecastType: resolvedForecastType,
      coverageStartMonthIndex,
      coverageStartDate,
      coverageEndDate
    }),
    diagnostics: {
      warnings: [],
      validationNotes: [
        'Monthly forecast artifacts store monthly contacts only and do not include model output.'
      ],
      holdout: null
    }
  })
}

export const buildSourceDataForResults = ({
  sourceKind = FORECAST_SOURCE_IMPORTED_DAILY,
  fileName = '',
  headers = [],
  rows = [],
  mapping = {},
  issues = []
} = {}) => ({
  sourceKind,
  fileName,
  headers: Array.isArray(headers) ? [...headers] : [],
  rows: Array.isArray(rows) ? rows.map((row) => ({ ...row })) : [],
  mapping: mapping && typeof mapping === 'object' ? { ...mapping } : {},
  issues: Array.isArray(issues) ? [...issues] : []
})

export const describeReadOnlyForecastSource = (sourceKind) => {
  if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    return 'Monthly contacts'
  }

  return 'Imported daily forecast'
}

export const formatImportedDailyRowCountLabel = (dailyForecast = []) =>
  `${formatWhole((Array.isArray(dailyForecast) ? dailyForecast : []).length)} daily rows`
