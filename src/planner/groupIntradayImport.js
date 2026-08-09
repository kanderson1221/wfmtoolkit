import { parseCsvText, parseNumberValue } from '../forecasting/csv'
import { summarizePlanningGroupIntraday } from './groupIntraday'

const REQUIRED_HEADERS = {
  intervalStart: 'interval_start',
  ratioPercent: 'ratio_percent'
}

const normalizeHeader = (value) =>
  String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const normalizeIntervalStart = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return ''
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return ''
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const parseRatioPercent = (value) =>
  parseNumberValue(String(value ?? '').trim().replace(/%$/, ''))

const summarizeMissingIntervals = (missingStarts = []) => {
  const visibleStarts = missingStarts.slice(0, 6)
  const remainderCount = missingStarts.length - visibleStarts.length
  const remainderLabel = remainderCount > 0 ? ` and ${remainderCount} more` : ''
  return `${visibleStarts.join(', ')}${remainderLabel}`
}

const resolveRequiredColumns = (headers = []) => {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header)
  }))
  const findHeader = (requiredHeader) =>
    normalizedHeaders.find((header) => header.normalized === requiredHeader)?.original || ''

  return {
    intervalStartColumn: findHeader(REQUIRED_HEADERS.intervalStart),
    ratioPercentColumn: findHeader(REQUIRED_HEADERS.ratioPercent)
  }
}

export const normalizePlanningGroupIntradayImportRows = ({
  rows = [],
  headers = [],
  intervalRatios = []
} = {}) => {
  const issues = []
  const activeRows = Array.isArray(intervalRatios) ? intervalRatios.map((row) => ({ ...row })) : []
  const activeStarts = new Set(activeRows.map((row) => row.startTime))
  const importedRatiosByStart = new Map()
  const { intervalStartColumn, ratioPercentColumn } = resolveRequiredColumns(headers)

  if (!intervalStartColumn) {
    issues.push('Add the required "interval_start" column.')
  }
  if (!ratioPercentColumn) {
    issues.push('Add the required "ratio_percent" column.')
  }
  if (!activeRows.length) {
    issues.push('No active operating intervals are available for this staffing group.')
  }
  if (issues.length) {
    return {
      intervalRatios: activeRows,
      importedCount: 0,
      totalRatioPercent: 0,
      isBalanced: false,
      issues
    }
  }

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const startTime = normalizeIntervalStart(row[intervalStartColumn])
    const ratioPercent = parseRatioPercent(row[ratioPercentColumn])

    if (!startTime) {
      issues.push(`Row ${row.rowIndex}: enter interval_start as a valid 24-hour time such as 08:00.`)
      return
    }
    if (!activeStarts.has(startTime)) {
      issues.push(`Row ${row.rowIndex}: ${startTime} is not an active interval in the current operating window.`)
      return
    }
    if (importedRatiosByStart.has(startTime)) {
      issues.push(`Row ${row.rowIndex}: ${startTime} appears more than once.`)
      return
    }
    if (ratioPercent == null) {
      issues.push(`Row ${row.rowIndex}: enter a numeric ratio_percent.`)
      return
    }
    if (ratioPercent < 0 || ratioPercent > 100) {
      issues.push(`Row ${row.rowIndex}: ratio_percent must be between 0 and 100.`)
      return
    }

    importedRatiosByStart.set(startTime, ratioPercent)
  })

  const missingStarts = activeRows
    .map((row) => row.startTime)
    .filter((startTime) => !importedRatiosByStart.has(startTime))
  if (missingStarts.length) {
    issues.push(
      `Include every active interval. Missing ${missingStarts.length}: ${summarizeMissingIntervals(missingStarts)}.`
    )
  }

  if (issues.length) {
    return {
      intervalRatios: activeRows,
      importedCount: importedRatiosByStart.size,
      totalRatioPercent: 0,
      isBalanced: false,
      issues
    }
  }

  const importedRows = activeRows.map((row) => ({
    ...row,
    ratioPercent: importedRatiosByStart.get(row.startTime)
  }))
  const summary = summarizePlanningGroupIntraday({ intervalRatios: importedRows })

  return {
    intervalRatios: importedRows,
    importedCount: importedRows.length,
    totalRatioPercent: summary.totalRatioPercent,
    isBalanced: summary.isBalanced,
    issues
  }
}

export const buildPlanningGroupIntradayImportStateFromText = ({
  fileName = '',
  text = '',
  intervalRatios = []
} = {}) => {
  const parsed = parseCsvText(text)
  const normalized = normalizePlanningGroupIntradayImportRows({
    rows: parsed.rows,
    headers: parsed.headers,
    intervalRatios
  })

  return {
    uploadedFileName: String(fileName || '').trim(),
    parserIssues: parsed.issues,
    ...normalized,
    issues: [...parsed.issues, ...normalized.issues]
  }
}

export const buildPlanningGroupIntradayImportStateFromFile = async (
  file,
  intervalRatios = []
) => buildPlanningGroupIntradayImportStateFromText({
  fileName: file?.name || '',
  text: await file.text(),
  intervalRatios
})

