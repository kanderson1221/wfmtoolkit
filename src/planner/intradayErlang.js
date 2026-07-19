import {
  normalizePlanningGroupIntradayRatios,
  resolvePlanningGroupIntraday
} from './groupIntraday'
import { createPlanningGroupActuals } from './groupActuals'
import { createPlanOpenDayChecker } from './planOpenDays'
import { MONTH_LABELS, toNumber } from './shared'

const ERLANG_RESULTS_VERSION = 1

const hashText = (text) => {
  let hash = 2166136261

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

const cloneRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({ ...row }))

export const buildPlannerIntradayErlangInputSignature = (rows = []) => {
  const signatureRows = (Array.isArray(rows) ? rows : []).map((row) => ({
    monthIndex: row.monthIndex,
    serviceDate: row.serviceDate,
    intervalStart: row.intervalStart,
    callsOffered: row.callsOffered,
    averageHandleTime: row.averageHandleTime,
    intervalLengthMinutes: row.intervalLengthMinutes,
    serviceLevelGoal: row.serviceLevelGoal,
    serviceLevelThreshold: row.serviceLevelThreshold,
    maxOccupancy: row.maxOccupancy,
    averageCustomerPatience: row.averageCustomerPatience ?? null
  }))
  const serialized = JSON.stringify(signatureRows)

  return `v${ERLANG_RESULTS_VERSION}:${signatureRows.length}:${hashText(serialized)}`
}

export const normalizePlannerIntradayErlangResults = (results) => {
  if (!results || typeof results !== 'object') {
    return null
  }

  const monthlyOutputs = cloneRows(results.monthlyOutputs || results.monthlyPlans)
  const intervalOutputs = cloneRows(results.intervalOutputs || results.intervalPlans)
  const dailyOutputs = cloneRows(results.dailyOutputs || results.dailyPlans)

  if (!monthlyOutputs.length && !intervalOutputs.length && !dailyOutputs.length) {
    return null
  }

  return {
    version: Number(results.version) || ERLANG_RESULTS_VERSION,
    calculatedAt: String(results.calculatedAt || '').trim(),
    inputSignature: String(results.inputSignature || '').trim(),
    rowCount: Number(results.rowCount) || intervalOutputs.length,
    monthCount: Number(results.monthCount) || monthlyOutputs.length,
    monthlyOutputs,
    intervalOutputs,
    dailyOutputs
  }
}

export const assessPlannerIntradayErlangResults = (payloadState, storedResults) => {
  if (payloadState?.status !== 'ready') {
    return {
      status: payloadState?.status || 'unavailable',
      message: payloadState?.message || 'Intraday Erlang inputs are not ready.',
      inputSignature: '',
      results: null
    }
  }

  const inputSignature = buildPlannerIntradayErlangInputSignature(payloadState.rows)
  const results = normalizePlannerIntradayErlangResults(storedResults)

  if (!results) {
    return {
      status: 'missing',
      message: 'Run staffing calculations to populate monthly Erlang staffing outputs.',
      inputSignature,
      results: null
    }
  }

  if (results.inputSignature !== inputSignature) {
    return {
      status: 'stale',
      message: 'Plan inputs changed after the last staffing calculation. Rerun staffing calculations to refresh the Erlang outputs.',
      inputSignature,
      results
    }
  }

  const requiredMonthIndexes = new Set(payloadState.rows.map((row) => Number(row.monthIndex)))
  const completedMonthIndexes = new Set(results.monthlyOutputs.map((row) => Number(row.monthIndex)))
  const missingMonthIndexes = [...requiredMonthIndexes].filter((monthIndex) => !completedMonthIndexes.has(monthIndex))

  if (missingMonthIndexes.length) {
    return {
      status: 'incomplete',
      message: `Stored Intraday Erlang outputs are missing ${missingMonthIndexes.length} required month${missingMonthIndexes.length === 1 ? '' : 's'}. Rerun staffing calculations.`,
      inputSignature,
      results
    }
  }

  return {
    status: 'ready',
    message: '',
    inputSignature,
    results
  }
}

const normalizeMonthIndex = (value, fallback = 0) =>
  Math.max(0, Math.min(MONTH_LABELS.length - 1, Math.round(toNumber(value, fallback))))

const buildForecastAhtByMonthIndex = (demandSource = {}, monthlyRecords = []) => {
  const ahtByMonthIndex = new Map(
    (Array.isArray(demandSource?.forecastMonthSnapshot) ? demandSource.forecastMonthSnapshot : [])
      .map((month, monthIndex) => ({
        monthIndex: normalizeMonthIndex(month?.monthIndex, monthIndex),
        ahtSeconds: Math.max(toNumber(month?.ahtSeconds, 0), 0)
      }))
      .filter((row) => row.ahtSeconds > 0)
      .map((row) => [row.monthIndex, row.ahtSeconds])
  )

  ;(Array.isArray(monthlyRecords) ? monthlyRecords : []).forEach((record, fallbackMonthIndex) => {
    const monthIndex = normalizeMonthIndex(record?.monthIndex, fallbackMonthIndex)

    if (ahtByMonthIndex.has(monthIndex)) {
      return
    }

    const ahtSeconds = Math.max(toNumber(record?.ahtSeconds, 0), 0)
    if (ahtSeconds > 0) {
      ahtByMonthIndex.set(monthIndex, ahtSeconds)
    }
  })

  return ahtByMonthIndex
}

export const buildPlannerIntradayErlangPayload = ({
  planningYear,
  demandSource,
  monthlyRecords,
  operatingWeekdays,
  holidayCalendarId,
  disabledHolidayRuleIds,
  customHolidays,
  operatingOpenTime,
  operatingCloseTime,
  serviceLevelPercent,
  serviceLevelThresholdSeconds,
  intraday
} = {}) => {
  const dailyForecastRows = Array.isArray(demandSource?.forecastDailySnapshot)
    ? demandSource.forecastDailySnapshot
    : []

  if (!dailyForecastRows.length) {
    return {
      rows: [],
      status: 'forecast_required',
      message: 'Intraday Erlang plans require an applied daily forecast.'
    }
  }

  if (!/^\d{2}:\d{2}$/.test(String(operatingOpenTime || '').trim()) || !/^\d{2}:\d{2}$/.test(String(operatingCloseTime || '').trim())) {
    return {
      rows: [],
      status: 'schedule_required',
      message: 'Set the staffing group operating hours before running intraday Erlang.'
    }
  }

  const resolvedServiceLevelPercent = Math.min(100, Math.max(toNumber(serviceLevelPercent, 0), 0))
  const resolvedServiceLevelThresholdSeconds = Math.max(toNumber(serviceLevelThresholdSeconds, 0), 0)

  if (resolvedServiceLevelPercent <= 0 || resolvedServiceLevelThresholdSeconds <= 0) {
    return {
      rows: [],
      status: 'service_level_required',
      message: 'Set a valid staffing group service level target before running intraday Erlang.'
    }
  }

  const intervalProfile = resolvePlanningGroupIntraday(
    intraday || {},
    {
      center: {
        operatingOpenTime,
        operatingCloseTime
      }
    }
  )
  const intervalRows = Array.isArray(intervalProfile.intervalRatios) ? intervalProfile.intervalRatios : []
  const normalizedIntervalRows = normalizePlanningGroupIntradayRatios(intervalRows).map((row) => {
    const matchingInterval = intervalRows.find((candidate) => candidate.startTime === row.startTime)
    return {
      ...matchingInterval,
      ...row
    }
  })

  if (!normalizedIntervalRows.length) {
    return {
      rows: [],
      status: 'intraday_required',
      message: 'Set a valid intraday profile before running intraday Erlang.'
    }
  }

  const monthlyRecordByMonthIndex = new Map(
    (Array.isArray(monthlyRecords) ? monthlyRecords : [])
      .map((row, fallbackMonthIndex) => [normalizeMonthIndex(row?.monthIndex, fallbackMonthIndex), row])
  )
  const firstInvalidRandomRecord = [...monthlyRecordByMonthIndex.values()].find((record) =>
    (
      Object.prototype.hasOwnProperty.call(record || {}, 'occupancyPercent') &&
      toNumber(record?.occupancyPercent, 0) <= 0
    ) || (
      Object.prototype.hasOwnProperty.call(record || {}, 'adherencePercent') &&
      toNumber(record?.adherencePercent, 0) <= 0
    )
  )

  if (firstInvalidRandomRecord) {
    const monthIndex = normalizeMonthIndex(firstInvalidRandomRecord.monthIndex)
    return {
      rows: [],
      status: 'random_assumptions_required',
      message: `Set occupancy and adherence above 0% for ${MONTH_LABELS[monthIndex]} before running intraday Erlang.`
    }
  }

  const monthlyAhtByMonthIndex = buildForecastAhtByMonthIndex(demandSource, monthlyRecords)
  const firstMissingAhtRow = dailyForecastRows.find((row) => {
    const rowAhtSeconds = Math.max(toNumber(row?.ahtSeconds, 0), 0)
    return rowAhtSeconds <= 0 && !monthlyAhtByMonthIndex.has(normalizeMonthIndex(row.monthIndex))
  })

  if (firstMissingAhtRow) {
    const monthLabel = MONTH_LABELS[Math.max(0, Math.min(MONTH_LABELS.length - 1, toNumber(firstMissingAhtRow.monthIndex, 0)))]
    return {
      rows: [],
      status: 'aht_required',
      message: `Apply a forecast with monthly AHT assumptions before running intraday Erlang for ${monthLabel}.`
    }
  }

  const isOpenDay = createPlanOpenDayChecker({
    planningYear,
    operatingWeekdays,
    holidayCalendarId,
    disabledHolidayRuleIds,
    customHolidays
  })

  const payloadRows = dailyForecastRows
    .filter((row) => isOpenDay(row.serviceDate))
    .flatMap((row) => {
      const monthIndex = normalizeMonthIndex(row.monthIndex)
      const rowAhtSeconds = Math.max(toNumber(row.ahtSeconds, 0), 0)
      const ahtSeconds = rowAhtSeconds > 0 ? rowAhtSeconds : monthlyAhtByMonthIndex.get(monthIndex)
      const monthlyRecord = monthlyRecordByMonthIndex.get(monthIndex)
      const maxOccupancyPercent = Math.min(100, Math.max(toNumber(monthlyRecord?.occupancyPercent, 85), 1), 100)

      return normalizedIntervalRows.map((interval) => ({
        monthIndex,
        serviceDate: row.serviceDate,
        intervalStart: `${row.serviceDate}T${interval.startTime}:00`,
        callsOffered: Number(((Math.max(toNumber(row.contacts, 0), 0) * Math.max(toNumber(interval.ratioPercent, 0), 0)) / 100).toFixed(6)),
        averageHandleTime: ahtSeconds,
        intervalLengthMinutes: intervalProfile.intervalLengthMinutes || 30,
        serviceLevelGoal: resolvedServiceLevelPercent,
        serviceLevelThreshold: resolvedServiceLevelThresholdSeconds,
        maxOccupancy: maxOccupancyPercent
      }))
    })

  if (!payloadRows.length) {
    return {
      rows: [],
      status: 'no_open_days',
      message: 'No open forecast days are available in this plan year after applying operating days and holiday closures.'
    }
  }

  return {
    rows: payloadRows,
    status: 'ready',
    message: '',
    intervalLengthMinutes: intervalProfile.intervalLengthMinutes || 30
  }
}

export const buildPlannerActualsIntradayErlangPayload = ({
  actualDailyRows,
  operatingWeekdays,
  holidayCalendarId,
  disabledHolidayRuleIds,
  customHolidays,
  ...payloadArgs
} = {}) => {
  const planningYear = Number(payloadArgs.planningYear)
  const normalizedActualRows = createPlanningGroupActuals({ dailyRows: actualDailyRows }).dailyRows
    .filter((row) => Number(row.serviceDate.slice(0, 4)) === planningYear)

  if (!normalizedActualRows.length) {
    return {
      rows: [],
      status: 'actuals_required',
      message: 'Load daily actuals for this plan year in the staffing group Data tab before calculating actual Intraday Erlang requirements.'
    }
  }

  const actualDailySnapshot = normalizedActualRows.map((row) => ({
    serviceDate: row.serviceDate,
    monthIndex: normalizeMonthIndex(Number(row.serviceDate.slice(5, 7)) - 1),
    contacts: row.contacts,
    ahtSeconds: row.ahtSeconds
  }))

  return buildPlannerIntradayErlangPayload({
    ...payloadArgs,
    demandSource: {
      forecastDailySnapshot: actualDailySnapshot,
      forecastMonthSnapshot: []
    },
    operatingWeekdays,
    holidayCalendarId,
    disabledHolidayRuleIds,
    customHolidays
  })
}

const buildIntradayOverhead = (record = {}) => {
  const scheduledPercent = Math.max(toNumber(record.scheduledPercent, 0), 0)
  const adherenceLossPercent = Math.max(toNumber(record.adherenceLossPercent, 0), 0)
  const randomLossPercent = Math.min(adherenceLossPercent, scheduledPercent)
  const designFactorPercent = Math.max(scheduledPercent - randomLossPercent, 0)
  const designFactorShare = designFactorPercent / 100
  const occupancyPercent = toNumber(record.occupancyPercent, 90)
  const workloadStaffingRatio = occupancyPercent > 0 && designFactorShare > 0
    ? 1 / designFactorShare
    : null

  return {
    occupancyLossPercent: 0,
    randomLossPercent,
    designFactorPercent,
    workloadStaffingRatio
  }
}

const buildPeakDayRequiredHeadcountByMonthIndex = (dailyOutputs = [], baselineRecords = [], staffingRatioByMonthIndex = new Map()) => {
  const paidHoursByMonthIndex = new Map(
    (Array.isArray(baselineRecords) ? baselineRecords : []).map((record) => [record.monthIndex, Math.max(toNumber(record.paidHoursPerDay, 0), 0)])
  )
  const peakDayRequiredHeadcountByMonthIndex = new Map()

  for (const row of Array.isArray(dailyOutputs) ? dailyOutputs : []) {
    const monthIndex = toNumber(row?.monthIndex, -1)
    if (monthIndex < 0) {
      continue
    }

    const paidHoursPerDay = paidHoursByMonthIndex.get(monthIndex) ?? 0
    const staffingRatio = staffingRatioByMonthIndex.get(monthIndex) ?? 0
    const totalLaborHoursNet = Math.max(toNumber(row?.totalLaborHoursNet, 0), 0)
    const peakDayRequiredStaffHours = totalLaborHoursNet * staffingRatio
    const peakDayRequiredHeadcount = paidHoursPerDay > 0
      ? peakDayRequiredStaffHours / paidHoursPerDay
      : 0

    peakDayRequiredHeadcountByMonthIndex.set(
      monthIndex,
      Math.max(peakDayRequiredHeadcountByMonthIndex.get(monthIndex) ?? 0, peakDayRequiredHeadcount)
    )
  }

  return peakDayRequiredHeadcountByMonthIndex
}

export const mergeIntradayErlangMonthlyRecords = (
  baselineRecords = [],
  monthlyOutputsByMonthIndex = new Map(),
  dailyOutputs = []
) => {
  const resolvedBaselineRecords = Array.isArray(baselineRecords) ? baselineRecords : []
  const staffingRatioByMonthIndex = new Map(
    resolvedBaselineRecords.map((row) => [row.monthIndex, buildIntradayOverhead(row).workloadStaffingRatio])
  )
  const peakDayRequiredHeadcountByMonthIndex = buildPeakDayRequiredHeadcountByMonthIndex(
    dailyOutputs,
    resolvedBaselineRecords,
    staffingRatioByMonthIndex
  )

  return resolvedBaselineRecords.map((record) => {
    const overhead = buildIntradayOverhead(record)
    const monthlyOutput = monthlyOutputsByMonthIndex.get(record.monthIndex)

    if (!monthlyOutput) {
      const hasValidCapacity = typeof overhead.workloadStaffingRatio === 'number' &&
        Number.isFinite(overhead.workloadStaffingRatio) &&
        record.paidHoursPerMonth > 0

      return {
        ...record,
        ...overhead,
        erlangStaffedHours: null,
        weightedOccupancyPercent: null,
        weightedServiceLevelPercent: null,
        requiredStaffHours: hasValidCapacity ? 0 : null,
        requiredHeadcount: hasValidCapacity ? 0 : null,
        peakDayRequiredHeadcount: hasValidCapacity ? 0 : null,
        peakIntervalRequiredHeadcount: null
      }
    }

    const erlangStaffedHours = Math.max(toNumber(monthlyOutput.erlangStaffedHours, 0), 0)
    const hasValidCapacity = typeof overhead.workloadStaffingRatio === 'number' &&
      Number.isFinite(overhead.workloadStaffingRatio) &&
      record.paidHoursPerMonth > 0
    const requiredStaffHours = hasValidCapacity
      ? erlangStaffedHours * overhead.workloadStaffingRatio
      : null
    const requiredHeadcount = requiredStaffHours != null
      ? requiredStaffHours / record.paidHoursPerMonth
      : null
    const peakDayRequiredHeadcount = hasValidCapacity
      ? peakDayRequiredHeadcountByMonthIndex.get(record.monthIndex) ?? 0
      : null

    return {
      ...record,
      ...overhead,
      workloadHours: monthlyOutput.workloadHours == null
        ? record.workloadHours
        : Math.max(toNumber(monthlyOutput.workloadHours, 0), 0),
      erlangStaffedHours,
      weightedOccupancyPercent: monthlyOutput.weightedOccupancyPercent == null
        ? null
        : toNumber(monthlyOutput.weightedOccupancyPercent, null),
      weightedServiceLevelPercent: monthlyOutput.weightedServiceLevelPercent == null
        ? null
        : toNumber(monthlyOutput.weightedServiceLevelPercent, null),
      requiredStaffHours,
      requiredHeadcount,
      peakDayRequiredHeadcount,
      peakDayRequiredStaffHours: peakDayRequiredHeadcount != null && record.paidHoursPerDay > 0
        ? peakDayRequiredHeadcount * record.paidHoursPerDay
        : null,
      peakIntervalRequiredHeadcount: Math.max(toNumber(monthlyOutput.peakIntervalRequiredHeadcount, 0), 0)
    }
  })
}
