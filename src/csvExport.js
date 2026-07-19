import { downloadTextFile } from './fileDownload'

export const CSV_MIME_TYPE = 'text/csv;charset=utf-8'

export const formatCsvNumber = (value, digits = null) => {
  if (value == null || value === '') {
    return ''
  }

  const number = Number(value)
  if (!Number.isFinite(number)) {
    return ''
  }

  return digits == null ? String(number) : String(Number(number.toFixed(digits)))
}

export const escapeCsvValue = (value) => {
  if (value == null) {
    return ''
  }

  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const buildCsv = (columns, rows) => [
  columns.map((column) => escapeCsvValue(column.header)).join(','),
  ...rows.map((row) => columns.map((column) => escapeCsvValue(column.value(row))).join(','))
].join('\r\n')

export const downloadCsv = (fileName, csvText) =>
  downloadTextFile(fileName, csvText, CSV_MIME_TYPE)

export const sanitizeFileNamePart = (value, fallback = 'export') => {
  const sanitized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return sanitized || fallback
}
