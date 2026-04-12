import { guessColumnMapping, normalizeUploadedRows, parseCsvText } from './csv'

export const sanitizeForecastColumnMapping = (headers = [], mapping = {}, guessed = {}) => {
  const availableHeaders = new Set(headers)

  return {
    dateColumn: availableHeaders.has(mapping.dateColumn) ? mapping.dateColumn : guessed.dateColumn || '',
    volumeColumn: availableHeaders.has(mapping.volumeColumn) ? mapping.volumeColumn : guessed.volumeColumn || '',
    capColumn: availableHeaders.has(mapping.capColumn) ? mapping.capColumn : guessed.capColumn || '',
    floorColumn: availableHeaders.has(mapping.floorColumn) ? mapping.floorColumn : guessed.floorColumn || ''
  }
}

export const normalizeForecastHistoryDraft = ({ rows = [], mapping = {} } = {}) =>
  normalizeUploadedRows({
    rows,
    mapping
  })

export const buildForecastHistoryStateFromText = ({
  fileName = '',
  text = '',
  currentMapping = {}
} = {}) => {
  const parsed = parseCsvText(text)
  const guessedMapping = guessColumnMapping(parsed.headers)
  const columnMapping = sanitizeForecastColumnMapping(
    parsed.headers,
    currentMapping,
    guessedMapping
  )
  const normalized = normalizeForecastHistoryDraft({
    rows: parsed.rows,
    mapping: columnMapping
  })

  return {
    uploadedFileName: fileName || '',
    uploadedHeaders: parsed.headers,
    uploadedRows: parsed.rows,
    parserIssues: parsed.issues,
    columnMapping,
    historyRows: normalized.historyRows,
    normalizationIssues: normalized.issues
  }
}

export const buildForecastHistoryStateFromFile = async (file, currentMapping = {}) => {
  const text = await file.text()

  return buildForecastHistoryStateFromText({
    fileName: file?.name || '',
    text,
    currentMapping
  })
}

export const applyForecastHistoryState = (project, nextState = {}) => {
  if (!project || typeof project !== 'object') {
    return
  }

  project.uploadedFileName = nextState.uploadedFileName || ''
  project.uploadedHeaders = Array.isArray(nextState.uploadedHeaders) ? [...nextState.uploadedHeaders] : []
  project.uploadedRows = Array.isArray(nextState.uploadedRows)
    ? nextState.uploadedRows.map((row) => ({ ...row }))
    : []
  project.parserIssues = Array.isArray(nextState.parserIssues) ? [...nextState.parserIssues] : []
  project.historyRows = Array.isArray(nextState.historyRows)
    ? nextState.historyRows.map((row) => ({ ...row }))
    : []
  project.normalizationIssues = Array.isArray(nextState.normalizationIssues)
    ? [...nextState.normalizationIssues]
    : []
  project.columnMapping = {
    dateColumn: nextState.columnMapping?.dateColumn || '',
    volumeColumn: nextState.columnMapping?.volumeColumn || '',
    capColumn: nextState.columnMapping?.capColumn || '',
    floorColumn: nextState.columnMapping?.floorColumn || ''
  }
}
