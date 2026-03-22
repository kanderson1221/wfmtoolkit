import { BASE_REQUIRED_HEADERS, EXTENDED_REQUIRED_HEADERS } from './config'

const escapeCsvCell = (value) => {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export const parseCsvLine = (line) => {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  if (inQuotes) {
    throw new Error('CSV contains an unmatched quote character.')
  }

  values.push(current)
  return values
}

export const parseCsvText = (text) => {
  const lines = text.split(/\r?\n/)
  if (!lines.length || !lines[0].trim()) {
    throw new Error('CSV is empty.')
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())
  const missingHeaders = BASE_REQUIRED_HEADERS.filter((required) => !headers.includes(required))
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
  }

  const rows = []
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim()) continue

    const values = parseCsvLine(line)
    const row = {}
    headers.forEach((header, headerIndex) => {
      row[header] = (values[headerIndex] ?? '').trim()
    })
    rows.push(row)
  }

  return { headers, rows }
}

const rowsWithNormalizedShrinkage = (rows) =>
  rows.map((row) => {
    const normalized = { ...row }
    if (normalized.shrinkage === '') {
      delete normalized.shrinkage
    }
    return normalized
  })

export const buildWorkflowPayload = ({
  parsedRows,
  parsedHeaders,
  currentWorkflow
}) => {
  const headerSet = new Set(parsedHeaders)
  const missingHeaders = [...BASE_REQUIRED_HEADERS, ...EXTENDED_REQUIRED_HEADERS].filter(
    (required) => !headerSet.has(required)
  )

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required columns for ${currentWorkflow.label}: ${missingHeaders.join(', ')}`
    )
  }

  const payload = {
    rows: rowsWithNormalizedShrinkage(parsedRows)
  }

  return payload
}

export const downloadCsv = (filename, headers, rows) => {
  if (!headers?.length) return

  const csvRows = [headers.join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))]
  const blob = new Blob([`${csvRows.join('\n')}\n`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
