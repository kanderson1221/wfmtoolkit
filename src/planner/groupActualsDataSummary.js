import {
  buildDateFromIso,
  buildMonthEndFromDate,
  buildMonthStart,
  buildMonthStartFromDate,
  buildMatchingIsoDatesInRange,
  maxIsoValue,
  minIsoValue
} from './dateValues'
import {
  buildPlanningGroupMonthlyActualRecords,
  createPlanningGroupActuals
} from './groupActuals'
import { createPlanningGroupOpenDayChecker } from './groupOpenDays'

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric'
})

const formatMonthLabel = (monthStart) => {
  const candidate = buildDateFromIso(monthStart)
  return candidate ? monthFormatter.format(candidate) : monthStart || 'Unknown Month'
}

const createEmptySummary = () => ({
  annualRows: []
})

const summarizeWeightedAht = (records = []) => {
  let weightedTotal = 0
  let weight = 0
  let averageTotal = 0
  let averageCount = 0

  records.forEach((record) => {
    const contacts = record?.contacts
    const ahtSeconds = record?.weightedAhtSeconds

    if (!Number.isFinite(ahtSeconds)) {
      return
    }

    averageTotal += ahtSeconds
    averageCount += 1

    if (Number.isFinite(contacts) && contacts > 0) {
      weightedTotal += contacts * ahtSeconds
      weight += contacts
    }
  })

  if (weight > 0) {
    return weightedTotal / weight
  }

  return averageCount > 0 ? averageTotal / averageCount : null
}

export const summarizePlanningGroupActualsDataset = ({
  actuals,
  group,
  center
} = {}) => {
  const normalizedActuals = createPlanningGroupActuals(actuals)
  const dailyRows = normalizedActuals.dailyRows || []

  if (!dailyRows.length) {
    return createEmptySummary()
  }

  const startDate = buildDateFromIso(dailyRows[0]?.serviceDate)
  const endDate = buildDateFromIso(dailyRows[dailyRows.length - 1]?.serviceDate)

  if (!startDate || !endDate) {
    return createEmptySummary()
  }

  const isExpectedOpenDay = createPlanningGroupOpenDayChecker(group, center)
  const loadedDates = new Set(dailyRows.map((row) => row.serviceDate))
  const actualsByMonth = new Map(
    buildPlanningGroupMonthlyActualRecords(dailyRows).map((record) => [record.monthStart, record])
  )
  const monthSummaries = new Map()

  for (
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 12);
    cursor.getTime() <= endDate.getTime();
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12)
  ) {
    const monthStart = buildMonthStartFromDate(cursor)

    monthSummaries.set(monthStart, {
      monthStart,
      loadedOpenDays: 0,
      minServiceDate: null,
      maxServiceDate: null
    })
  }

  dailyRows.forEach((row) => {
    const serviceDate = row?.serviceDate

    if (!serviceDate) {
      return
    }

    const monthSummary = monthSummaries.get(buildMonthStart(serviceDate))

    if (!monthSummary) {
      return
    }

    monthSummary.minServiceDate = minIsoValue(monthSummary.minServiceDate, serviceDate)
    monthSummary.maxServiceDate = maxIsoValue(monthSummary.maxServiceDate, serviceDate)

    if (isExpectedOpenDay(serviceDate)) {
      monthSummary.loadedOpenDays += 1
    }
  })

  const monthlyRows = [...monthSummaries.values()]
    .map((summary) => {
      const actualsRecord = actualsByMonth.get(summary.monthStart)
      const monthStartDate = buildDateFromIso(summary.monthStart)
      const monthEnd = monthStartDate ? buildMonthEndFromDate(monthStartDate) : null
      const expectedOpenDates = buildMatchingIsoDatesInRange(
        summary.monthStart,
        monthEnd,
        isExpectedOpenDay
      )
      const missingOpenDates = expectedOpenDates.filter((serviceDate) => !loadedDates.has(serviceDate))
      const expectedOpenDays = expectedOpenDates.length
      const coveragePercent =
        expectedOpenDays > 0 ? (summary.loadedOpenDays / expectedOpenDays) * 100 : null

      return {
        monthStart: summary.monthStart,
        monthLabel: actualsRecord?.label || formatMonthLabel(summary.monthStart),
        minServiceDate: summary.minServiceDate,
        maxServiceDate: summary.maxServiceDate,
        contacts: actualsRecord?.actualContacts ?? null,
        weightedAhtSeconds: actualsRecord?.actualAhtSeconds ?? null,
        loadedOpenDays: summary.loadedOpenDays,
        expectedOpenDays,
        coveragePercent,
        missingOpenDates
      }
    })
    .filter((summary) => summary.expectedOpenDays > 0 || summary.loadedOpenDays > 0)
    .sort((left, right) => right.monthStart.localeCompare(left.monthStart))

  const annualRows = [...monthlyRows.reduce((years, row) => {
    const year = row.monthStart.slice(0, 4)
    const existingYear = years.get(year) || {
      year,
      yearLabel: year,
      contacts: 0,
      loadedOpenDays: 0,
      minServiceDate: null,
      maxServiceDate: null,
      expectedOpenDays: 0,
      missingOpenDates: [],
      months: []
    }

    existingYear.contacts += row.contacts ?? 0
    existingYear.loadedOpenDays += row.loadedOpenDays
    existingYear.minServiceDate = minIsoValue(existingYear.minServiceDate, row.minServiceDate)
    existingYear.maxServiceDate = maxIsoValue(existingYear.maxServiceDate, row.maxServiceDate)
    existingYear.expectedOpenDays += row.expectedOpenDays
    existingYear.missingOpenDates.push(...row.missingOpenDates)
    existingYear.months.push(row)

    years.set(year, existingYear)
    return years
  }, new Map()).values()]
    .map((yearSummary) => {
      const coveragePercent =
        yearSummary.expectedOpenDays > 0
          ? (yearSummary.loadedOpenDays / yearSummary.expectedOpenDays) * 100
          : null

      return {
        year: yearSummary.year,
        yearLabel: yearSummary.yearLabel,
        minServiceDate: yearSummary.minServiceDate,
        maxServiceDate: yearSummary.maxServiceDate,
        contacts: Number.isFinite(yearSummary.contacts) ? yearSummary.contacts : null,
        weightedAhtSeconds: summarizeWeightedAht(yearSummary.months),
        loadedOpenDays: yearSummary.loadedOpenDays,
        expectedOpenDays: yearSummary.expectedOpenDays,
        coveragePercent,
        missingOpenDates: yearSummary.missingOpenDates,
        months: yearSummary.months
      }
    })
    .sort((left, right) => right.year.localeCompare(left.year))

  return {
    annualRows
  }
}
