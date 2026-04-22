import {
  normalizePlanningGroupIntradayRatios,
  resolvePlanningGroupIntraday
} from './groupIntraday'
import { createPlanOpenDayChecker } from './planOpenDays'
import { MONTH_LABELS, toNumber } from './shared'

const DEFAULT_MEAN_PATIENCE_SECONDS = 60

const buildForecastAhtByMonthIndex = (demandSource = {}) =>
  new Map(
    (Array.isArray(demandSource?.forecastMonthSnapshot) ? demandSource.forecastMonthSnapshot : [])
      .map((month, monthIndex) => ({
        monthIndex: Math.max(0, Math.min(MONTH_LABELS.length - 1, toNumber(month?.monthIndex, monthIndex))),
        ahtSeconds: Math.max(toNumber(month?.ahtSeconds, 0), 0)
      }))
      .filter((row) => row.ahtSeconds > 0)
      .map((row) => [row.monthIndex, row.ahtSeconds])
  )

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

  const monthlyAhtByMonthIndex = buildForecastAhtByMonthIndex(demandSource)
  const firstMissingAhtRow = dailyForecastRows.find((row) => !monthlyAhtByMonthIndex.has(row.monthIndex))

  if (firstMissingAhtRow) {
    const monthLabel = MONTH_LABELS[Math.max(0, Math.min(MONTH_LABELS.length - 1, toNumber(firstMissingAhtRow.monthIndex, 0)))]
    return {
      rows: [],
      status: 'aht_required',
      message: `Apply a forecast with monthly AHT assumptions before running intraday Erlang for ${monthLabel}.`
    }
  }

  const monthlyRecordByMonthIndex = new Map(
    (Array.isArray(monthlyRecords) ? monthlyRecords : []).map((row) => [row.monthIndex, row])
  )
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
      const ahtSeconds = monthlyAhtByMonthIndex.get(row.monthIndex)
      const monthlyRecord = monthlyRecordByMonthIndex.get(row.monthIndex)
      const maxOccupancyPercent = Math.min(100, Math.max(toNumber(monthlyRecord?.occupancyPercent, 85), 1), 100)

      return normalizedIntervalRows.map((interval) => ({
        monthIndex: row.monthIndex,
        serviceDate: row.serviceDate,
        intervalStart: `${row.serviceDate}T${interval.startTime}:00`,
        callsOffered: Number(((Math.max(toNumber(row.contacts, 0), 0) * Math.max(toNumber(interval.ratioPercent, 0), 0)) / 100).toFixed(6)),
        averageHandleTime: ahtSeconds,
        intervalLengthMinutes: intervalProfile.intervalLengthMinutes || 30,
        serviceLevelGoal: resolvedServiceLevelPercent,
        serviceLevelThreshold: resolvedServiceLevelThresholdSeconds,
        maxOccupancy: maxOccupancyPercent,
        averageCustomerPatience: DEFAULT_MEAN_PATIENCE_SECONDS
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

const buildIntradayOverhead = (record = {}) => {
  const scheduledPercent = Math.max(toNumber(record.scheduledPercent, 0), 0)
  const adherenceLossPercent = Math.max(toNumber(record.adherenceLossPercent, 0), 0)
  const randomLossPercent = Math.min(adherenceLossPercent, scheduledPercent)
  const designFactorPercent = Math.max(scheduledPercent - randomLossPercent, 0)
  const designFactorShare = designFactorPercent / 100
  const workloadStaffingRatio = designFactorShare > 0 ? 1 / designFactorShare : 0

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
      return {
        ...record,
        ...overhead,
        erlangStaffedHours: null,
        weightedOccupancyPercent: null,
        weightedServiceLevelPercent: null,
        requiredStaffHours: 0,
        requiredHeadcount: 0,
        peakDayRequiredHeadcount: 0,
        peakIntervalRequiredHeadcount: null
      }
    }

    const erlangStaffedHours = Math.max(toNumber(monthlyOutput.erlangStaffedHours, 0), 0)
    const requiredStaffHours = erlangStaffedHours * overhead.workloadStaffingRatio
    const requiredHeadcount = record.paidHoursPerMonth > 0
      ? requiredStaffHours / record.paidHoursPerMonth
      : 0
    const peakDayRequiredHeadcount = peakDayRequiredHeadcountByMonthIndex.get(record.monthIndex) ?? 0

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
      peakDayRequiredStaffHours: record.paidHoursPerDay > 0
        ? peakDayRequiredHeadcount * record.paidHoursPerDay
        : 0,
      peakIntervalRequiredHeadcount: Math.max(toNumber(monthlyOutput.peakIntervalRequiredHeadcount, 0), 0)
    }
  })
}
