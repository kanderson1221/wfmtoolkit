import { parseCsvText, parseDateValue, parseNumberValue } from '../forecasting/csv'

const CANDIDATE_HEADERS = {
  dateColumn: ['date', 'service_date', 'day', 'ds'],
  volumeColumn: [
    'contacts',
    'call_volume',
    'volume',
    'calls',
    'contact_volume',
    'daily_calls',
    'emails',
    'email_volume',
    'daily_emails',
    'y'
  ],
  ahtColumn: [
    'aht',
    'aht_seconds',
    'average_handle_time',
    'average_handle_time_seconds',
    'average_handle_seconds',
    'avg_aht',
    'avg_aht_seconds',
    'avg_handle_time',
    'avg_handle_time_seconds',
    'handle_time_seconds',
    'email_handle_time_seconds',
    'email_handling_time_seconds',
    'average_email_handle_time_seconds'
  ]
}

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export const guessGroupActualsColumnMapping = (headers = []) => {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header)
  }))

  const pickHeader = (candidates) =>
    normalizedHeaders.find((header) => candidates.includes(header.normalized))?.original || ''

  return Object.fromEntries(
    Object.entries(CANDIDATE_HEADERS).map(([mappingKey, candidates]) => [mappingKey, pickHeader(candidates)])
  )
}

export const sanitizeGroupActualsColumnMapping = (headers = [], mapping = {}, guessed = {}) => {
  const availableHeaders = new Set(headers)

  return {
    dateColumn: availableHeaders.has(mapping.dateColumn) ? mapping.dateColumn : guessed.dateColumn || '',
    volumeColumn: availableHeaders.has(mapping.volumeColumn) ? mapping.volumeColumn : guessed.volumeColumn || '',
    ahtColumn: availableHeaders.has(mapping.ahtColumn) ? mapping.ahtColumn : guessed.ahtColumn || ''
  }
}

export const normalizeGroupActualsUploadedRows = ({
  rows = [],
  mapping = {}
} = {}) => {
  const issues = []
  const dailyRows = []
  const dateColumn = mapping.dateColumn || ''
  const volumeColumn = mapping.volumeColumn || ''
  const ahtColumn = mapping.ahtColumn || ''

  if (!Array.isArray(rows) || !rows.length) {
    return {
      dailyRows,
      issues
    }
  }

  if (!dateColumn) {
    issues.push('Choose the service date column before loading actuals.')
  }

  if (!volumeColumn) {
    issues.push('Choose the contacts column before loading actuals.')
  }

  if (!ahtColumn) {
    issues.push('Choose the average handle time column before loading actuals.')
  }

  if (issues.length) {
    return {
      dailyRows,
      issues
    }
  }

  rows.forEach((row) => {
    const serviceDate = parseDateValue(row[dateColumn])
    const contacts = parseNumberValue(row[volumeColumn])
    const ahtSeconds = parseNumberValue(row[ahtColumn])

    if (!serviceDate) {
      issues.push(`Row ${row.rowIndex}: enter a valid date in "${dateColumn}".`)
      return
    }

    if (contacts == null) {
      issues.push(`Row ${row.rowIndex}: enter numeric contacts in "${volumeColumn}".`)
      return
    }

    if (contacts < 0) {
      issues.push(`Row ${row.rowIndex}: contacts must be zero or greater.`)
      return
    }

    if (ahtSeconds == null) {
      issues.push(`Row ${row.rowIndex}: enter numeric average handle time seconds in "${ahtColumn}".`)
      return
    }

    if (ahtSeconds < 0) {
      issues.push(`Row ${row.rowIndex}: average handle time seconds must be zero or greater.`)
      return
    }

    dailyRows.push({
      sourceRowIndex: row.rowIndex,
      serviceDate,
      contacts,
      ahtSeconds
    })
  })

  return {
    dailyRows: dailyRows.sort((left, right) => left.serviceDate.localeCompare(right.serviceDate)),
    issues
  }
}

export const buildGroupActualsImportStateFromText = ({
  fileName = '',
  text = '',
  currentMapping = {}
} = {}) => {
  const parsed = parseCsvText(text)
  const guessedMapping = guessGroupActualsColumnMapping(parsed.headers)
  const columnMapping = sanitizeGroupActualsColumnMapping(parsed.headers, currentMapping, guessedMapping)
  const normalized = normalizeGroupActualsUploadedRows({
    rows: parsed.rows,
    mapping: columnMapping
  })

  return {
    uploadedFileName: fileName || '',
    uploadedHeaders: parsed.headers,
    uploadedRows: parsed.rows,
    parserIssues: parsed.issues,
    columnMapping,
    dailyRows: normalized.dailyRows,
    normalizationIssues: normalized.issues
  }
}

export const buildGroupActualsImportStateFromFile = async (
  file,
  currentMapping = {}
) => {
  const text = await file.text()

  return buildGroupActualsImportStateFromText({
    fileName: file?.name || '',
    text,
    currentMapping
  })
}
