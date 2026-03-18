import { BASE_REQUIRED_HEADERS, EXTENDED_REQUIRED_HEADERS } from './config'

const hasValue = (value) => value !== '' && value !== null && value !== undefined

const normalizeOptionalNumber = (value, label) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    throw new Error(`${label} must be numeric.`)
  }
  return numeric
}

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

export const resolveDailyGlobalOverrides = (dailyGlobalAssumptions) => {
  const overrides = {}

  if (hasValue(dailyGlobalAssumptions.meanPatienceSeconds)) {
    const value = normalizeOptionalNumber(
      dailyGlobalAssumptions.meanPatienceSeconds,
      'Average Customer Patience'
    )
    if (value <= 0) throw new Error('Average Customer Patience must be > 0.')
    overrides.mean_patience_seconds = value
  }

  if (hasValue(dailyGlobalAssumptions.serviceLevelThreshold)) {
    const value = normalizeOptionalNumber(
      dailyGlobalAssumptions.serviceLevelThreshold,
      'Service Level Goal'
    )
    if (value <= 0) throw new Error('Service Level Goal must be > 0.')
    overrides.service_level_threshold = value
  }

  if (hasValue(dailyGlobalAssumptions.serviceLevelTargetSeconds)) {
    const value = normalizeOptionalNumber(
      dailyGlobalAssumptions.serviceLevelTargetSeconds,
      'Service Level Threshold'
    )
    if (value < 0) throw new Error('Service Level Threshold must be >= 0.')
    overrides.service_level_target_seconds = value
  }

  if (hasValue(dailyGlobalAssumptions.maxOccupancy)) {
    const value = normalizeOptionalNumber(
      dailyGlobalAssumptions.maxOccupancy,
      'Max Occupancy'
    )
    if (value <= 0) throw new Error('Max Occupancy must be > 0.')
    overrides.max_occupancy = value
  }

  if (hasValue(dailyGlobalAssumptions.shrinkage)) {
    const value = normalizeOptionalNumber(dailyGlobalAssumptions.shrinkage, 'Shrinkage Assumption')
    if (value < 0 || value >= 100) {
      throw new Error('Shrinkage Assumption must be in [0, 100).')
    }
    overrides.shrinkage = value
  }

  return overrides
}

export const missingHeadersForMode = (headers, mode, dailyOverrides) => {
  const headerSet = new Set(headers)

  if (mode === 'file-processor' || mode === 'weekly-plan') {
    return [...BASE_REQUIRED_HEADERS, ...EXTENDED_REQUIRED_HEADERS].filter(
      (required) => !headerSet.has(required)
    )
  }

  const requiredDailyHeaders = [
    ...BASE_REQUIRED_HEADERS,
    ...EXTENDED_REQUIRED_HEADERS.filter((field) => !hasValue(dailyOverrides[field]))
  ]

  return requiredDailyHeaders.filter((required) => !headerSet.has(required))
}

export const rowsWithOverrides = (rows, overrides = null) =>
  rows.map((row) => {
    const normalized = { ...row }
    if (normalized.shrinkage === '') {
      delete normalized.shrinkage
    }
    if (!overrides) {
      return normalized
    }

    return {
      ...normalized,
      ...overrides
    }
  })

const buildDailyPlanPayload = (dayPlannerInputs) => {
  const intervalDurationMinutes = Number(dayPlannerInputs.intervalDurationMinutes)
  const shiftPaidHours = Number(dayPlannerInputs.shiftPaidHours)
  const unpaidLunchMinutes = Number(dayPlannerInputs.unpaidLunchMinutes)
  const lunchWindowStartHours = Number(dayPlannerInputs.lunchWindowStartHours)
  const lunchWindowEndHours = Number(dayPlannerInputs.lunchWindowEndHours)

  if (!Number.isFinite(intervalDurationMinutes) || intervalDurationMinutes <= 0) {
    throw new Error('Interval duration must be > 0 minutes.')
  }
  if (!Number.isFinite(shiftPaidHours) || shiftPaidHours <= 0) {
    throw new Error('Shift paid hours must be > 0.')
  }
  if (!Number.isFinite(unpaidLunchMinutes) || unpaidLunchMinutes < 0) {
    throw new Error('Unpaid lunch must be >= 0 minutes.')
  }
  if (!Number.isFinite(lunchWindowStartHours) || lunchWindowStartHours < 0) {
    throw new Error('Lunch window start must be >= 0 hours.')
  }
  if (!Number.isFinite(lunchWindowEndHours) || lunchWindowEndHours < lunchWindowStartHours) {
    throw new Error('Lunch window end must be greater than or equal to lunch window start.')
  }

  const totalShiftLengthHours = shiftPaidHours + unpaidLunchMinutes / 60
  if (
    unpaidLunchMinutes > 0 &&
    lunchWindowEndHours + unpaidLunchMinutes / 60 > totalShiftLengthHours
  ) {
    throw new Error('Lunch window plus unpaid lunch must fit inside the total shift length.')
  }

  return {
    interval_duration_minutes: intervalDurationMinutes,
    shift_paid_hours: shiftPaidHours,
    unpaid_lunch_minutes: unpaidLunchMinutes,
    lunch_window_start_hours: lunchWindowStartHours,
    lunch_window_end_hours: lunchWindowEndHours
  }
}

const buildWeeklyPlanPayload = (weeklyPlannerInputs) => ({
  shift_length_hours: Number(weeklyPlannerInputs.shiftLengthHours),
  productive_hours_per_day: Number(weeklyPlannerInputs.productiveHoursPerDay)
})

export const buildWorkflowPayload = ({
  selectedMode,
  parsedRows,
  parsedHeaders,
  currentWorkflow,
  useFileDailyAssumptions,
  dayPlannerInputs,
  weeklyPlannerInputs,
  dailyGlobalAssumptions
}) => {
  let dailyOverrides = null
  if (selectedMode === 'daily-plan' && !useFileDailyAssumptions) {
    dailyOverrides = resolveDailyGlobalOverrides(dailyGlobalAssumptions)
  }

  const missingHeaders = missingHeadersForMode(parsedHeaders, selectedMode, dailyOverrides ?? {})
  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required columns for ${currentWorkflow.label}: ${missingHeaders.join(', ')}`
    )
  }

  const payload = {
    rows: rowsWithOverrides(parsedRows, dailyOverrides)
  }

  if (selectedMode === 'daily-plan') {
    Object.assign(payload, buildDailyPlanPayload(dayPlannerInputs))
  }

  if (selectedMode === 'weekly-plan') {
    Object.assign(payload, buildWeeklyPlanPayload(weeklyPlannerInputs))
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
