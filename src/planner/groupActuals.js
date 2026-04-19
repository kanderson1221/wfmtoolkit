import {
  MONTH_LABELS,
  getCurrentCalendarYear
} from './shared'

export const GROUP_ACTUALS_SOURCE_MANUAL = 'manual_monthly'
export const GROUP_ACTUALS_SOURCE_UPLOAD = 'daily_upload'

const GROUP_ACTUALS_SOURCE_VALUES = new Set([
  GROUP_ACTUALS_SOURCE_MANUAL,
  GROUP_ACTUALS_SOURCE_UPLOAD
])

const toNullableNumber = (value) => {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeIsoDate = (value) => {
  const normalized = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : ''
}

export const normalizeGroupActualsSourceMode = (value, fallback = GROUP_ACTUALS_SOURCE_UPLOAD) => {
  const normalized = String(value || '').trim().toLowerCase()
  return GROUP_ACTUALS_SOURCE_VALUES.has(normalized) ? normalized : fallback
}

const sortDailyRows = (dailyRows) =>
  [...dailyRows].sort((left, right) => left.serviceDate.localeCompare(right.serviceDate))

const dedupeDailyRows = (dailyRows = []) => {
  const rowsByDate = new Map()

  ;(Array.isArray(dailyRows) ? dailyRows : []).forEach((row) => {
    rowsByDate.set(row.serviceDate, row)
  })

  return sortDailyRows([...rowsByDate.values()])
}

const buildMonthStart = (serviceDate = '') => `${serviceDate.slice(0, 7)}-01`

const buildMonthLabel = (monthStart = '') => {
  const year = monthStart.slice(0, 4)
  const monthIndex = Number(monthStart.slice(5, 7)) - 1

  if (!year || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex >= MONTH_LABELS.length) {
    return monthStart || 'Unknown Month'
  }

  return `${MONTH_LABELS[monthIndex]} ${year}`
}

const migrateLegacyActualsYears = (actualsYears = []) => {
  const normalizedYears = [...(Array.isArray(actualsYears) ? actualsYears : [])].sort((left, right) => {
    const leftStamp = new Date(left?.updatedAt || left?.createdAt || 0).getTime()
    const rightStamp = new Date(right?.updatedAt || right?.createdAt || 0).getTime()

    if (leftStamp !== rightStamp) {
      return leftStamp - rightStamp
    }

    return Number(left?.year || 0) - Number(right?.year || 0)
  })

  const latestYear = normalizedYears[normalizedYears.length - 1] || {}

  return createPlanningGroupActuals({
    sourceMode: latestYear.sourceMode,
    dailyRows: normalizedYears.flatMap((actualsYear) => actualsYear?.dailyRows || []),
    uploadedFileName: latestYear.uploadedFileName,
    uploadedHeaders: latestYear.uploadedHeaders,
    columnMapping: latestYear.columnMapping,
    updatedAt: latestYear.updatedAt
  })
}

export const createPlanningGroupActualsDay = (overrides = {}) => {
  const serviceDate = normalizeIsoDate(overrides?.serviceDate || overrides?.ds)
  const contacts = toNullableNumber(overrides?.contacts ?? overrides?.y)
  const ahtSeconds = toNullableNumber(
    overrides?.ahtSeconds ??
      overrides?.actualAhtSeconds ??
      overrides?.averageHandleTimeSeconds
  )

  if (!serviceDate) {
    return null
  }

  if (contacts == null || contacts < 0 || ahtSeconds == null || ahtSeconds < 0) {
    return null
  }

  return {
    serviceDate,
    contacts,
    ahtSeconds
  }
}

export const createPlanningGroupActuals = (overrides = {}) => {
  const snapshot = overrides || {}
  const dailyRows = dedupeDailyRows(
    (Array.isArray(snapshot.dailyRows) ? snapshot.dailyRows : [])
      .map((row) => createPlanningGroupActualsDay(row))
      .filter(Boolean)
  )

  return {
    sourceMode: normalizeGroupActualsSourceMode(snapshot.sourceMode, GROUP_ACTUALS_SOURCE_UPLOAD),
    dailyRows,
    uploadedFileName: String(snapshot.uploadedFileName || '').trim(),
    uploadedHeaders: Array.isArray(snapshot.uploadedHeaders)
      ? snapshot.uploadedHeaders.map((header) => String(header || '').trim()).filter(Boolean)
      : [],
    columnMapping: {
      dateColumn: String(snapshot.columnMapping?.dateColumn || '').trim(),
      volumeColumn: String(snapshot.columnMapping?.volumeColumn || '').trim(),
      ahtColumn: String(snapshot.columnMapping?.ahtColumn || '').trim()
    },
    updatedAt: String(snapshot.updatedAt || '').trim()
  }
}

export const resolvePlanningGroupActuals = (group = {}) => {
  const hasModernActuals =
    group?.actuals &&
    !Array.isArray(group.actuals) &&
    (
      Array.isArray(group.actuals.dailyRows) ||
      Boolean(group.actuals.uploadedFileName) ||
      Boolean(group.actuals.updatedAt) ||
      Boolean(group.actuals.columnMapping?.dateColumn) ||
      Boolean(group.actuals.columnMapping?.volumeColumn) ||
      Boolean(group.actuals.columnMapping?.ahtColumn)
    )

  if (hasModernActuals) {
    return createPlanningGroupActuals(group.actuals)
  }

  if (Array.isArray(group?.actualsYears) && group.actualsYears.length) {
    return migrateLegacyActualsYears(group.actualsYears)
  }

  return createPlanningGroupActuals()
}

export const mergePlanningGroupActuals = (currentActuals, importedActuals) => {
  const normalizedCurrent = createPlanningGroupActuals(currentActuals)
  const normalizedImported = createPlanningGroupActuals(importedActuals)
  const importedDates = new Set(normalizedImported.dailyRows.map((row) => row.serviceDate))

  return createPlanningGroupActuals({
    ...normalizedCurrent,
    ...normalizedImported,
    dailyRows: [
      ...normalizedCurrent.dailyRows.filter((row) => !importedDates.has(row.serviceDate)),
      ...normalizedImported.dailyRows
    ]
  })
}

const stripActualsSourceFileMetadata = (actuals = {}) => {
  const normalizedActuals = createPlanningGroupActuals(actuals)

  return createPlanningGroupActuals({
    ...normalizedActuals,
    uploadedFileName: '',
    uploadedHeaders: []
  })
}

export const clearPlanningGroupActualsData = (actuals = {}) =>
  stripActualsSourceFileMetadata({
    ...createPlanningGroupActuals(actuals),
    dailyRows: []
  })

export const deletePlanningGroupActualsByYear = (actuals = {}, year) => {
  const yearPrefix = String(year || '').trim()
  const normalizedActuals = createPlanningGroupActuals(actuals)

  if (!/^\d{4}$/.test(yearPrefix)) {
    return normalizedActuals
  }

  return stripActualsSourceFileMetadata({
    ...normalizedActuals,
    dailyRows: normalizedActuals.dailyRows.filter((row) => !row.serviceDate.startsWith(`${yearPrefix}-`))
  })
}

export const deletePlanningGroupActualsByMonth = (actuals = {}, monthStart) => {
  const monthPrefix = String(monthStart || '').slice(0, 7)
  const normalizedActuals = createPlanningGroupActuals(actuals)

  if (!/^\d{4}-\d{2}$/.test(monthPrefix)) {
    return normalizedActuals
  }

  return stripActualsSourceFileMetadata({
    ...normalizedActuals,
    dailyRows: normalizedActuals.dailyRows.filter((row) => !row.serviceDate.startsWith(monthPrefix))
  })
}

export const buildPlanningGroupMonthlyActualRecords = (dailyRows = []) => {
  const monthBuckets = new Map()

  ;(Array.isArray(dailyRows) ? dailyRows : []).forEach((row) => {
    const serviceDate = normalizeIsoDate(row?.serviceDate)
    if (!serviceDate) {
      return
    }

    const monthStart = buildMonthStart(serviceDate)
    const bucket = monthBuckets.get(monthStart) || {
      monthStart,
      monthLabel: buildMonthLabel(monthStart),
      daysLoaded: 0,
      contacts: 0,
      ahtWeight: 0,
      weightedAhtTotal: 0,
      ahtEntryCount: 0,
      ahtTotal: 0
    }

    const contacts = toNullableNumber(row?.contacts)
    const ahtSeconds = toNullableNumber(row?.ahtSeconds)

    bucket.daysLoaded += 1

    if (contacts != null) {
      bucket.contacts += contacts
    }

    if (ahtSeconds != null) {
      bucket.ahtEntryCount += 1
      bucket.ahtTotal += ahtSeconds

      if ((contacts ?? 0) > 0) {
        bucket.ahtWeight += contacts
        bucket.weightedAhtTotal += contacts * ahtSeconds
      }
    }

    monthBuckets.set(monthStart, bucket)
  })

  return [...monthBuckets.values()]
    .sort((left, right) => right.monthStart.localeCompare(left.monthStart))
    .map((bucket) => ({
      monthStart: bucket.monthStart,
      label: bucket.monthLabel,
      daysLoaded: bucket.daysLoaded,
      actualContacts: bucket.daysLoaded ? bucket.contacts : null,
      actualAhtSeconds:
        bucket.ahtWeight > 0
          ? bucket.weightedAhtTotal / bucket.ahtWeight
          : bucket.ahtEntryCount > 0
            ? bucket.ahtTotal / bucket.ahtEntryCount
            : null
    }))
}

const summarizeWeightedAht = (records = []) => {
  let weightedTotal = 0
  let weight = 0
  let averageTotal = 0
  let averageCount = 0

  records.forEach((record) => {
    const contacts = toNullableNumber(record?.actualContacts ?? record?.contacts)
    const ahtSeconds = toNullableNumber(record?.actualAhtSeconds ?? record?.ahtSeconds)

    if (ahtSeconds == null) {
      return
    }

    averageTotal += ahtSeconds
    averageCount += 1

    if ((contacts ?? 0) > 0) {
      weightedTotal += contacts * ahtSeconds
      weight += contacts
    }
  })

  if (weight > 0) {
    return weightedTotal / weight
  }

  return averageCount > 0 ? averageTotal / averageCount : null
}

export const summarizePlanningGroupActuals = (actuals = {}) => {
  const normalizedActuals = createPlanningGroupActuals(actuals)
  const monthlyRecords = buildPlanningGroupMonthlyActualRecords(normalizedActuals.dailyRows)
  const totalContacts = monthlyRecords.reduce((sum, record) => sum + (record.actualContacts ?? 0), 0)
  const coveredYears = new Set(
    normalizedActuals.dailyRows.map((row) => Number(row.serviceDate.slice(0, 4)) || getCurrentCalendarYear())
  )

  return {
    sourceMode: normalizedActuals.sourceMode,
    loadedMonthsCount: monthlyRecords.length,
    loadedDaysCount: normalizedActuals.dailyRows.length,
    totalContacts,
    averageAhtSeconds: summarizeWeightedAht(normalizedActuals.dailyRows),
    earliestServiceDate: normalizedActuals.dailyRows[0]?.serviceDate || '',
    latestServiceDate: normalizedActuals.dailyRows[normalizedActuals.dailyRows.length - 1]?.serviceDate || '',
    coveredYearCount: coveredYears.size,
    uploadedFileName: normalizedActuals.uploadedFileName || ''
  }
}
