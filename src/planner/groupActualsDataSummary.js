import {
  buildDateFromIso,
  buildMonthEndFromDate,
  buildMonthStart,
  buildMonthStartFromDate,
  buildYearEnd,
  buildYearStart,
  countMatchingIsoDatesInRange,
  dateToIsoValue,
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
  const actualsByMonth = new Map(
    buildPlanningGroupMonthlyActualRecords(dailyRows).map((record) => [record.monthStart, record])
  )
  const overallStartIso = dateToIsoValue(startDate)
  const overallEndIso = dateToIsoValue(endDate)
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
      const periodStartIso = summary.minServiceDate || maxIsoValue(summary.monthStart, overallStartIso)
      const periodEndIso =
        summary.maxServiceDate ||
        minIsoValue(monthStartDate ? buildMonthEndFromDate(monthStartDate) : null, overallEndIso)
      const expectedOpenDays = countMatchingIsoDatesInRange(periodStartIso, periodEndIso, isExpectedOpenDay)
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
        coveragePercent
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
      months: []
    }

    existingYear.contacts += row.contacts ?? 0
    existingYear.loadedOpenDays += row.loadedOpenDays
    existingYear.minServiceDate = minIsoValue(existingYear.minServiceDate, row.minServiceDate)
    existingYear.maxServiceDate = maxIsoValue(existingYear.maxServiceDate, row.maxServiceDate)
    existingYear.months.push(row)

    years.set(year, existingYear)
    return years
  }, new Map()).values()]
    .map((yearSummary) => {
      const yearStartIso = yearSummary.minServiceDate || maxIsoValue(buildYearStart(yearSummary.year), overallStartIso)
      const yearEndIso = yearSummary.maxServiceDate || minIsoValue(buildYearEnd(yearSummary.year), overallEndIso)
      const expectedOpenDays = countMatchingIsoDatesInRange(yearStartIso, yearEndIso, isExpectedOpenDay)
      const coveragePercent =
        expectedOpenDays > 0 ? (yearSummary.loadedOpenDays / expectedOpenDays) * 100 : null

      return {
        year: yearSummary.year,
        yearLabel: yearSummary.yearLabel,
        minServiceDate: yearSummary.minServiceDate,
        maxServiceDate: yearSummary.maxServiceDate,
        contacts: Number.isFinite(yearSummary.contacts) ? yearSummary.contacts : null,
        weightedAhtSeconds: summarizeWeightedAht(yearSummary.months),
        loadedOpenDays: yearSummary.loadedOpenDays,
        expectedOpenDays,
        coveragePercent,
        months: yearSummary.months
      }
    })
    .sort((left, right) => right.year.localeCompare(left.year))

  return {
    annualRows
  }
}
