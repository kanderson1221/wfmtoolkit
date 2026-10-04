const CANDIDATE_HEADERS = {
  dateColumn: ['date', 'service_date', 'day', 'ds'],
  volumeColumn: ['contacts', 'call_volume', 'volume', 'calls', 'daily_calls', 'emails', 'email_volume', 'daily_emails', 'y']
}

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const splitCsvText = (text) => {
  const rows = []
  let currentField = ''
  let currentRow = []
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentField += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentField)
      currentField = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentField)
      rows.push(currentRow)
      currentField = ''
      currentRow = []
      continue
    }

    currentField += character
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  return rows.filter((row) => row.some((cell) => String(cell || '').trim() !== ''))
}

export const parseDateValue = (value) => {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return ''
  }

  const isoMatch = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const usMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (usMatch) {
    const [, month, day, yearInput] = usMatch
    const year = yearInput.length === 2 ? `20${yearInput}` : yearInput
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toISOString().slice(0, 10)
}

export const parseNumberValue = (value) => {
  if (value == null || String(value).trim() === '') {
    return null
  }

  const normalized = String(value).replace(/,/g, '').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export const parseCsvText = (text) => {
  const parsedRows = splitCsvText(String(text || ''))
  if (!parsedRows.length) {
    return {
      headers: [],
      rows: [],
      issues: ['The uploaded CSV is empty.']
    }
  }

  const [headerRow, ...bodyRows] = parsedRows
  const headers = headerRow.map((header) => String(header || '').trim())
  const headerIssues = []

  if (!headers.length || headers.every((header) => !header)) {
    headerIssues.push('The uploaded CSV must include a header row.')
  }

  const rows = bodyRows.map((rowValues, rowIndex) => {
    const row = {}

    headers.forEach((header, headerIndex) => {
      row[header] = String(rowValues?.[headerIndex] || '').trim()
    })

    return {
      rowIndex: rowIndex + 2,
      ...row
    }
  })

  return {
    headers,
    rows,
    issues: headerIssues
  }
}

export const guessColumnMapping = (headers = []) => {
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

export const normalizeUploadedRows = ({ rows = [], mapping = {} } = {}) => {
  const issues = []
  const historyRows = []

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      historyRows,
      issues
    }
  }

  const dateColumn = mapping.dateColumn || ''
  const volumeColumn = mapping.volumeColumn || ''

  if (!dateColumn) {
    issues.push('Choose the date column before running a forecast.')
  }

  if (!volumeColumn) {
    issues.push('Choose the contact volume column before running a forecast.')
  }

  if (issues.length) {
    return {
      historyRows,
      issues
    }
  }

  rows.forEach((row) => {
    const ds = parseDateValue(row[dateColumn])
    const rawVolume = parseNumberValue(row[volumeColumn])

    if (!ds) {
      issues.push(`Row ${row.rowIndex}: enter a valid date in "${dateColumn}".`)
      return
    }

    if (rawVolume == null) {
      issues.push(`Row ${row.rowIndex}: enter a numeric daily contact volume in "${volumeColumn}".`)
      return
    }

    const y = rawVolume
    if (y == null || y < 0) {
      issues.push(`Row ${row.rowIndex}: daily contact volume must be zero or greater.`)
      return
    }

    historyRows.push({
      sourceRowIndex: row.rowIndex,
      ds,
      y,
      cap: null,
      floor: null
    })
  })

  return {
    historyRows: historyRows.sort((left, right) => left.ds.localeCompare(right.ds)),
    issues
  }
}
