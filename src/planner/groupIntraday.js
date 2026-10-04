import {
  OPERATING_SCHEDULE_ALWAYS_OPEN,
  normalizeOperatingScheduleMode,
  parseOperatingTimeToMinutes,
  validateConfiguredOperatingWindow
} from './operatingSchedule'

const MINUTES_PER_DAY = 24 * 60
const DEFAULT_INTERVAL_LENGTH_MINUTES = 30
const DEFAULT_MINIMUM_HEADCOUNT = 0

const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const roundToTwo = (value) => Math.round(Number(value || 0) * 100) / 100

const normalizeTimeValue = (value) => {
  const normalized = String(value || '').trim()
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : ''
}

const parseTimeToMinutes = (value) => parseOperatingTimeToMinutes(normalizeTimeValue(value))

const formatMinutesToTime = (minutes) => {
  const normalizedMinutes = ((Number(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(normalizedMinutes / 60)
  const minutePortion = normalizedMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutePortion).padStart(2, '0')}`
}

const formatIntervalLabel = (startTime, endTime) => `${startTime} - ${endTime}`

export const buildPlanningGroupIntradayIntervals = (
  openTime = '',
  closeTime = '',
  intervalLengthMinutes = DEFAULT_INTERVAL_LENGTH_MINUTES,
  operatingScheduleMode = ''
) => {
  const intervalLength = Math.max(Math.round(toNumber(intervalLengthMinutes, DEFAULT_INTERVAL_LENGTH_MINUTES)), 1)
  const resolvedScheduleMode = normalizeOperatingScheduleMode(operatingScheduleMode, openTime, closeTime)

  if (resolvedScheduleMode === OPERATING_SCHEDULE_ALWAYS_OPEN) {
    return Array.from({ length: Math.floor(MINUTES_PER_DAY / intervalLength) }, (_, index) => {
      const startMinutes = index * intervalLength
      const endMinutes = (startMinutes + intervalLength) % MINUTES_PER_DAY
      const startTime = formatMinutesToTime(startMinutes)
      const endTime = formatMinutesToTime(endMinutes)

      return {
        startTime,
        endTime,
        label: formatIntervalLabel(startTime, endTime)
      }
    })
  }

  const validation = validateConfiguredOperatingWindow({
    openTime,
    closeTime,
    intervalLengthMinutes: intervalLength
  })
  if (!validation.valid) {
    return []
  }

  const { openMinutes, closeMinutes } = validation

  const intervals = []
  let cursor = openMinutes

  while (cursor < closeMinutes) {
    const nextCursor = (cursor + intervalLength) % MINUTES_PER_DAY
    const startTime = formatMinutesToTime(cursor)
    const endTime = formatMinutesToTime(nextCursor)

    intervals.push({
      startTime,
      endTime,
      label: formatIntervalLabel(startTime, endTime)
    })

    cursor += intervalLength
  }

  return intervals
}

const normalizeStoredRatioRows = (intervalRatios) => {
  const seen = new Map()

  ;(Array.isArray(intervalRatios) ? intervalRatios : []).forEach((row) => {
    const startTime = normalizeTimeValue(row?.startTime)
    if (!startTime) {
      return
    }

    seen.set(startTime, {
      startTime,
      ratioPercent: roundToTwo(Math.max(toNumber(row?.ratioPercent, 0), 0))
    })
  })

  return [...seen.values()].sort((left, right) => left.startTime.localeCompare(right.startTime))
}

const buildEvenRatioRows = (intervals) => {
  if (!intervals.length) {
    return []
  }

  const rawRatio = 100 / intervals.length
  const roundedRows = intervals.map((interval) => ({
    startTime: interval.startTime,
    ratioPercent: roundToTwo(rawRatio)
  }))
  const total = roundedRows.reduce((sum, row) => sum + row.ratioPercent, 0)
  const correction = roundToTwo(100 - total)

  if (roundedRows.length) {
    roundedRows[roundedRows.length - 1].ratioPercent = roundToTwo(
      roundedRows[roundedRows.length - 1].ratioPercent + correction
    )
  }

  return roundedRows
}

export const createPlanningGroupIntraday = (overrides = {}) => {
  const snapshot = overrides?.intraday ? overrides.intraday : overrides || {}

  return {
    intervalLengthMinutes: DEFAULT_INTERVAL_LENGTH_MINUTES,
    minimumHeadcount: Math.max(Math.round(toNumber(snapshot.minimumHeadcount, DEFAULT_MINIMUM_HEADCOUNT)), 0),
    intervalRatios: normalizeStoredRatioRows(snapshot.intervalRatios)
  }
}

export const resolvePlanningGroupIntraday = (source = {}, context = {}) => {
  const snapshot = createPlanningGroupIntraday(source)
  const center = context.center || {}
  const intervals = buildPlanningGroupIntradayIntervals(
    center.operatingOpenTime,
    center.operatingCloseTime,
    snapshot.intervalLengthMinutes,
    center.operatingScheduleMode
  )

  const storedRatios = normalizeStoredRatioRows(snapshot.intervalRatios)
  const storedRatioMap = new Map(storedRatios.map((row) => [row.startTime, row.ratioPercent]))
  const ratioRows = storedRatios.length
    ? intervals.map((interval) => ({
        startTime: interval.startTime,
        endTime: interval.endTime,
        label: interval.label,
        ratioPercent: roundToTwo(Math.max(toNumber(storedRatioMap.get(interval.startTime), 0), 0))
      }))
    : buildEvenRatioRows(intervals).map((row) => {
        const interval = intervals.find((candidate) => candidate.startTime === row.startTime)
        return {
          startTime: row.startTime,
          endTime: interval?.endTime || formatMinutesToTime(parseTimeToMinutes(row.startTime) + snapshot.intervalLengthMinutes),
          label: interval?.label || row.startTime,
          ratioPercent: row.ratioPercent
        }
      })

  return {
    intervalLengthMinutes: DEFAULT_INTERVAL_LENGTH_MINUTES,
    minimumHeadcount: snapshot.minimumHeadcount,
    intervalRatios: ratioRows
  }
}

export const summarizePlanningGroupIntraday = (intraday = {}) => {
  const intervalRatios = Array.isArray(intraday.intervalRatios) ? intraday.intervalRatios : []
  const totalRatioPercent = roundToTwo(
    intervalRatios.reduce((sum, row) => sum + Math.max(toNumber(row?.ratioPercent, 0), 0), 0)
  )

  return {
    intervalCount: intervalRatios.length,
    totalRatioPercent,
    isBalanced: Math.abs(totalRatioPercent - 100) <= 0.05
  }
}

export const normalizePlanningGroupIntradayRatios = (intervalRatios) => {
  const normalizedRows = (Array.isArray(intervalRatios) ? intervalRatios : []).map((row) => ({
    ...row,
    ratioPercent: roundToTwo(Math.max(toNumber(row?.ratioPercent, 0), 0))
  }))

  if (!normalizedRows.length) {
    return []
  }

  const total = normalizedRows.reduce((sum, row) => sum + row.ratioPercent, 0)

  if (total <= 0) {
    return buildEvenRatioRows(normalizedRows.map((row) => ({ startTime: row.startTime }))).map((row, index) => ({
      ...normalizedRows[index],
      ratioPercent: row.ratioPercent
    }))
  }

  const scaledRows = normalizedRows.map((row) => ({
    ...row,
    ratioPercent: roundToTwo((row.ratioPercent / total) * 100)
  }))
  const scaledTotal = scaledRows.reduce((sum, row) => sum + row.ratioPercent, 0)
  const correction = roundToTwo(100 - scaledTotal)

  scaledRows[scaledRows.length - 1].ratioPercent = roundToTwo(
    scaledRows[scaledRows.length - 1].ratioPercent + correction
  )

  return scaledRows
}
