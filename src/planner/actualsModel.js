import { createPlanningGroupActuals } from './groupActuals'
import { buildMatchingIsoDatesInRange, buildMonthEndFromDate } from './dateValues'
import { average, MONTH_LABELS, toNumber } from './shared'

const hasEnteredValue = (value) => value !== null && value !== '' && Number.isFinite(Number(value))

const emptyActualsMonths = () =>
  MONTH_LABELS.map((label, monthIndex) => ({
    monthIndex,
    label,
    actualContacts: null,
    actualAhtSeconds: null,
    loadedDaysCount: 0,
    loadedOpenDaysCount: 0,
    expectedOpenDaysCount: null,
    unexpectedLoadedDaysCount: 0,
    missingOpenDates: [],
    coverageStatus: 'unassessed'
  }))

const monthStartForIndex = (planningYear, monthIndex) =>
  `${planningYear}-${String(monthIndex + 1).padStart(2, '0')}-01`

export const buildActualsCoverageByMonth = ({
  dailyRows = [],
  planningYear,
  isExpectedOpenDay
} = {}) => {
  const resolvedPlanningYear = Number(planningYear)
  const normalizedRows = createPlanningGroupActuals({ dailyRows }).dailyRows
    .filter((row) => Number(row.serviceDate.slice(0, 4)) === resolvedPlanningYear)
  const loadedDates = new Set(normalizedRows.map((row) => row.serviceDate))

  return MONTH_LABELS.map((label, monthIndex) => {
    const monthPrefix = `${resolvedPlanningYear}-${String(monthIndex + 1).padStart(2, '0')}-`
    const loadedMonthDates = [...loadedDates].filter((serviceDate) => serviceDate.startsWith(monthPrefix))

    if (!Number.isInteger(resolvedPlanningYear) || typeof isExpectedOpenDay !== 'function') {
      return {
        monthIndex,
        label,
        loadedOpenDaysCount: loadedMonthDates.length,
        expectedOpenDaysCount: null,
        unexpectedLoadedDaysCount: 0,
        missingOpenDates: [],
        coverageStatus: 'unassessed'
      }
    }

    const monthStart = monthStartForIndex(resolvedPlanningYear, monthIndex)
    const expectedOpenDates = buildMatchingIsoDatesInRange(
      monthStart,
      buildMonthEndFromDate(new Date(resolvedPlanningYear, monthIndex, 1, 12)),
      isExpectedOpenDay
    )
    const expectedOpenDateSet = new Set(expectedOpenDates)
    const loadedOpenDaysCount = expectedOpenDates.filter((serviceDate) => loadedDates.has(serviceDate)).length
    const missingOpenDates = expectedOpenDates.filter((serviceDate) => !loadedDates.has(serviceDate))
    const unexpectedLoadedDaysCount = loadedMonthDates.filter(
      (serviceDate) => !expectedOpenDateSet.has(serviceDate)
    ).length
    const coverageStatus = loadedMonthDates.length === 0
      ? expectedOpenDates.length === 0 ? 'not_applicable' : 'missing'
      : expectedOpenDates.length === 0
        ? 'calendar_mismatch'
        : unexpectedLoadedDaysCount > 0
          ? 'calendar_mismatch'
          : missingOpenDates.length > 0
          ? 'partial'
          : 'complete'

    return {
      monthIndex,
      label,
      loadedOpenDaysCount,
      expectedOpenDaysCount: expectedOpenDates.length,
      unexpectedLoadedDaysCount,
      missingOpenDates,
      coverageStatus
    }
  })
}

export const buildActualsMonthsFromDailyRows = (
  dailyRows = [],
  planningYear,
  { isExpectedOpenDay } = {}
) => {
  const resolvedPlanningYear = Number(planningYear)
  const normalizedRows = createPlanningGroupActuals({ dailyRows }).dailyRows
  const months = emptyActualsMonths().map((month) => ({
    ...month,
    contacts: 0,
    ahtWeight: 0,
    weightedAhtTotal: 0,
    ahtTotal: 0,
    ahtEntryCount: 0
  }))

  if (!Number.isInteger(resolvedPlanningYear)) {
    return emptyActualsMonths()
  }

  normalizedRows.forEach((row) => {
    if (Number(row.serviceDate.slice(0, 4)) !== resolvedPlanningYear) {
      return
    }

    const monthIndex = Number(row.serviceDate.slice(5, 7)) - 1
    const month = months[monthIndex]

    if (!month) {
      return
    }

    const contacts = Math.max(toNumber(row.contacts, 0), 0)
    const ahtSeconds = Math.max(toNumber(row.ahtSeconds, 0), 0)

    month.loadedDaysCount += 1
    month.contacts += contacts
    month.ahtTotal += ahtSeconds
    month.ahtEntryCount += 1

    if (contacts > 0) {
      month.ahtWeight += contacts
      month.weightedAhtTotal += contacts * ahtSeconds
    }
  })

  const coverageByMonth = buildActualsCoverageByMonth({
    dailyRows: normalizedRows,
    planningYear: resolvedPlanningYear,
    isExpectedOpenDay
  })

  return months.map((month) => {
    const coverage = coverageByMonth[month.monthIndex] || {}

    return {
      monthIndex: month.monthIndex,
      label: month.label,
      actualContacts: month.loadedDaysCount ? month.contacts : null,
      actualAhtSeconds:
        month.ahtWeight > 0
          ? month.weightedAhtTotal / month.ahtWeight
          : month.ahtEntryCount > 0
            ? month.ahtTotal / month.ahtEntryCount
            : null,
      loadedDaysCount: month.loadedDaysCount,
      loadedOpenDaysCount: coverage.loadedOpenDaysCount ?? month.loadedDaysCount,
      expectedOpenDaysCount: coverage.expectedOpenDaysCount ?? null,
      unexpectedLoadedDaysCount: coverage.unexpectedLoadedDaysCount ?? 0,
      missingOpenDates: coverage.missingOpenDates || [],
      coverageStatus: coverage.coverageStatus || 'unassessed'
    }
  })
}

export const computeActualsRecords = (
  monthlyRecords = [],
  staffingRecords = [],
  monthlyActuals = [],
  actualErlangOutputsByMonthIndex = null
) =>
  monthlyRecords.map((record, monthIndex) => {
    const actualsMonth = monthlyActuals[monthIndex] || {}
    const staffingRecord = staffingRecords[monthIndex] || {}
    const actualErlangOutput = actualErlangOutputsByMonthIndex instanceof Map
      ? actualErlangOutputsByMonthIndex.get(monthIndex)
      : null

    const actualContacts = hasEnteredValue(actualsMonth.actualContacts)
      ? toNumber(actualsMonth.actualContacts, 0)
      : null
    const actualAhtSeconds = hasEnteredValue(actualsMonth.actualAhtSeconds)
      ? toNumber(actualsMonth.actualAhtSeconds, 0)
      : null

    const isLoaded = actualContacts != null || actualAhtSeconds != null
    const actualsCoverageStatus = String(actualsMonth.coverageStatus || 'unassessed')
    const actualsCoverageComplete = actualsCoverageStatus === 'complete' || actualsCoverageStatus === 'unassessed'

    const actualWorkloadHours =
      actualContacts != null && actualAhtSeconds != null
        ? (actualContacts * actualAhtSeconds) / 3600
        : null

    const actualErlangStaffedHours = actualErlangOutput
      ? Math.max(toNumber(actualErlangOutput.erlangStaffedHours, 0), 0)
      : null
    const usesActualErlangOutputs = actualErlangOutputsByMonthIndex instanceof Map
    const workloadStaffingRatio = typeof record.workloadStaffingRatio === 'number' &&
      Number.isFinite(record.workloadStaffingRatio) &&
      record.workloadStaffingRatio > 0
      ? record.workloadStaffingRatio
      : null

    const actualRequiredStaffHours = !actualsCoverageComplete
      ? null
      : actualErlangStaffedHours != null && workloadStaffingRatio != null
        ? actualErlangStaffedHours * workloadStaffingRatio
        : usesActualErlangOutputs
          ? null
          : actualWorkloadHours != null && workloadStaffingRatio != null
            ? actualWorkloadHours * workloadStaffingRatio
            : null

    const actualRequiredHeadcount =
      actualRequiredStaffHours != null && toNumber(record.paidHoursPerMonth, 0) > 0
        ? actualRequiredStaffHours / record.paidHoursPerMonth
        : null
    const plannedRequiredHeadcount = typeof record.requiredHeadcount === 'number' &&
      Number.isFinite(record.requiredHeadcount)
      ? record.requiredHeadcount
      : null
    const plannedGapToRequirement = typeof staffingRecord.gapToRequirement === 'number' &&
      Number.isFinite(staffingRecord.gapToRequirement)
      ? staffingRecord.gapToRequirement
      : null

    const contactsVariance =
      actualsCoverageComplete && actualContacts != null
        ? actualContacts - toNumber(record.contacts, 0)
        : null

    const ahtVarianceSeconds =
      actualsCoverageComplete && actualAhtSeconds != null
        ? actualAhtSeconds - toNumber(record.ahtSeconds, 0)
        : null

    const requiredHeadcountVariance =
      actualRequiredHeadcount != null && plannedRequiredHeadcount != null
        ? actualRequiredHeadcount - plannedRequiredHeadcount
        : null

    return {
      ...record,
      monthIndex,
      actualContacts,
      actualAhtSeconds,
      plannedContacts: toNumber(record.contacts, 0),
      plannedAhtSeconds: toNumber(record.ahtSeconds, 0),
      plannedWorkloadHours: toNumber(record.workloadHours, 0),
      plannedRequiredHeadcount,
      plannedStartingTotalHeadcount: toNumber(staffingRecord.startingRosterHeadcount, 0),
      plannedStartingFrontlineHeadcount: toNumber(staffingRecord.startingFrontlineHeadcount, 0),
      plannedEndingTotalHeadcount: toNumber(staffingRecord.endingRosterHeadcount, 0),
      plannedEndingFrontlineHeadcount: toNumber(staffingRecord.endingFrontlineHeadcount, 0),
      plannedGapToRequirement,
      actualWorkloadHours,
      actualErlangStaffedHours,
      actualRequiredStaffHours,
      actualRequiredHeadcount,
      actualLoadedDaysCount: Math.max(toNumber(actualsMonth.loadedDaysCount, 0), 0),
      actualLoadedOpenDaysCount: Math.max(toNumber(actualsMonth.loadedOpenDaysCount, 0), 0),
      actualExpectedOpenDaysCount: actualsMonth.expectedOpenDaysCount == null
        ? null
        : Math.max(toNumber(actualsMonth.expectedOpenDaysCount, 0), 0),
      actualUnexpectedLoadedDaysCount: Math.max(toNumber(actualsMonth.unexpectedLoadedDaysCount, 0), 0),
      actualMissingOpenDates: Array.isArray(actualsMonth.missingOpenDates)
        ? [...actualsMonth.missingOpenDates]
        : [],
      actualsCoverageStatus,
      actualsCoverageComplete,
      contactsVariance,
      ahtVarianceSeconds,
      requiredHeadcountVariance,
      isLoaded
    }
  })

export const summarizeActualsRecords = (records = []) => {
  const loadedRecords = records.filter((record) => record.isLoaded)
  const completeRecords = loadedRecords.filter((record) => record.actualsCoverageComplete !== false)
  const incompleteRecords = loadedRecords.filter((record) => record.actualsCoverageComplete === false)
  const contactVarianceRecords = completeRecords.filter((record) => record.contactsVariance != null)
  const demandVarianceRecords = records.filter((record) => record.requiredHeadcountVariance != null)
  const ahtVarianceRecords = records.filter((record) => record.ahtVarianceSeconds != null)
  const actualRequirementRecords = records.filter((record) => record.actualRequiredHeadcount != null)

  return {
    loadedMonthsCount: loadedRecords.length,
    completeMonthsCount: completeRecords.length,
    incompleteMonthsCount: incompleteRecords.length,
    contactsVariance: contactVarianceRecords.length
      ? contactVarianceRecords.reduce((sum, record) => sum + record.contactsVariance, 0)
      : null,
    averageAhtVarianceSeconds: ahtVarianceRecords.length
      ? average(ahtVarianceRecords.map((record) => record.ahtVarianceSeconds))
      : null,
    averageRequiredHeadcountVariance: demandVarianceRecords.length
      ? average(demandVarianceRecords.map((record) => record.requiredHeadcountVariance))
      : null,
    peakActualRequiredHeadcount: actualRequirementRecords.length
      ? Math.max(...actualRequirementRecords.map((record) => record.actualRequiredHeadcount))
      : null,
    peakPlannedRequiredHeadcount: Math.max(
      0,
      ...records.map((record) => toNumber(record.plannedRequiredHeadcount, 0))
    )
  }
}
