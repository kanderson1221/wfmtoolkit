const FORECAST_DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const normalizeForecastHistoryRow = (row = {}) => {
  const normalizedRow = {
    ds: row?.ds || '',
    y: row?.y ?? 0,
    cap: row?.cap ?? null,
    floor: row?.floor ?? null
  }

  if (row?.sourceRowIndex != null) {
    normalizedRow.sourceRowIndex = row.sourceRowIndex
  }

  if (typeof row?.holidayLabel === 'string') {
    normalizedRow.holidayLabel = row.holidayLabel
  }

  return normalizedRow
}

export const normalizeForecastHistoryRows = (rows = []) =>
  Array.isArray(rows)
    ? rows.map((row) => normalizeForecastHistoryRow(row))
    : []

const normalizeForecastAhtHistoryRow = (row = {}) => {
  const ds = typeof row?.ds === 'string'
    ? row.ds
    : typeof row?.serviceDate === 'string'
      ? row.serviceDate
      : ''
  const ahtSeconds = Number(row?.ahtSeconds)
  const contacts = Number(row?.contacts ?? row?.y)

  if (!ds || !Number.isFinite(ahtSeconds) || ahtSeconds < 0) {
    return null
  }

  return {
    ds,
    contacts: Number.isFinite(contacts) && contacts >= 0 ? contacts : 0,
    ahtSeconds
  }
}

export const normalizeForecastAhtHistoryRows = (rows = []) =>
  Array.isArray(rows)
    ? rows
      .map((row) => normalizeForecastAhtHistoryRow(row))
      .filter(Boolean)
      .sort((left, right) => left.ds.localeCompare(right.ds))
    : []

export const normalizeForecastTrainingDate = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmedValue = value.trim()
  return FORECAST_DATE_TEXT_PATTERN.test(trimmedValue) ? trimmedValue : ''
}

const clampForecastTrainingDateToHistory = (value, minimumDate, maximumDate, fallbackValue) => {
  const normalizedValue = normalizeForecastTrainingDate(value)

  if (!normalizedValue) {
    return fallbackValue
  }

  if (minimumDate && normalizedValue < minimumDate) {
    return minimumDate
  }

  if (maximumDate && normalizedValue > maximumDate) {
    return maximumDate
  }

  return normalizedValue
}

export const getForecastAvailableHistoryRows = (snapshot = {}) =>
  normalizeForecastHistoryRows(snapshot?.historyRows)
    .filter((row) => normalizeForecastTrainingDate(row?.ds))
    .sort((left, right) => left.ds.localeCompare(right.ds))

export const getForecastTrainingWindow = (snapshot = {}) => {
  const historyRows = getForecastAvailableHistoryRows(snapshot)
  const availableStartDate = historyRows[0]?.ds || ''
  const availableEndDate = historyRows.at(-1)?.ds || ''

  if (!historyRows.length) {
    return {
      availableStartDate: '',
      availableEndDate: '',
      availableRowCount: 0,
      trainingStartDate: '',
      trainingEndDate: '',
      windowIsValid: false
    }
  }

  const trainingStartDate = clampForecastTrainingDateToHistory(
    snapshot?.modelConfig?.trainingStartDate,
    availableStartDate,
    availableEndDate,
    availableStartDate
  )
  const trainingEndDate = clampForecastTrainingDateToHistory(
    snapshot?.modelConfig?.trainingEndDate,
    availableStartDate,
    availableEndDate,
    availableEndDate
  )

  return {
    availableStartDate,
    availableEndDate,
    availableRowCount: historyRows.length,
    trainingStartDate,
    trainingEndDate,
    windowIsValid: Boolean(trainingStartDate && trainingEndDate && trainingStartDate <= trainingEndDate)
  }
}

export const getForecastTrainingHistoryRows = (snapshot = {}) => {
  const historyRows = getForecastAvailableHistoryRows(snapshot)
  const { trainingStartDate, trainingEndDate, windowIsValid } = getForecastTrainingWindow(snapshot)

  if (!windowIsValid) {
    return []
  }

  return historyRows.filter((row) => row.ds >= trainingStartDate && row.ds <= trainingEndDate)
}

export const getForecastHoldoutPartition = (snapshot = {}) => {
  const selectedRows = getForecastTrainingHistoryRows(snapshot)
  const requestedHoldoutDays = Math.max(0, Math.round(Number(snapshot?.modelConfig?.holdoutDays) || 0))
  const holdoutDays = requestedHoldoutDays > 0 && selectedRows.length - requestedHoldoutDays >= 14
    ? requestedHoldoutDays
    : 0
  const splitIndex = holdoutDays > 0 ? selectedRows.length - holdoutDays : selectedRows.length

  return {
    modelTrainingRows: selectedRows.slice(0, splitIndex),
    holdoutRows: selectedRows.slice(splitIndex),
    requestedHoldoutDays,
    holdoutDays
  }
}

export const getForecastAvailableAhtHistoryRows = (snapshot = {}) =>
  normalizeForecastAhtHistoryRows(snapshot?.ahtHistoryRows)
    .filter((row) => normalizeForecastTrainingDate(row?.ds))
    .sort((left, right) => left.ds.localeCompare(right.ds))

export const getForecastTrainingAhtHistoryRows = (snapshot = {}) => {
  const historyRows = getForecastAvailableAhtHistoryRows(snapshot)
  const { trainingStartDate, trainingEndDate, windowIsValid } = getForecastTrainingWindow(snapshot)

  if (!windowIsValid) {
    return []
  }

  return historyRows.filter((row) => row.ds >= trainingStartDate && row.ds <= trainingEndDate)
}

export const getForecastModelTrainingAhtHistoryRows = (snapshot = {}) => {
  const ahtRows = getForecastTrainingAhtHistoryRows(snapshot)
  const { modelTrainingRows, holdoutDays } = getForecastHoldoutPartition(snapshot)

  if (!holdoutDays) {
    return ahtRows
  }

  const trainingEndDate = modelTrainingRows.at(-1)?.ds || ''
  return trainingEndDate ? ahtRows.filter((row) => row.ds <= trainingEndDate) : []
}
