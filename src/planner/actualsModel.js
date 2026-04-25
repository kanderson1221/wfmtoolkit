import { createPlanningGroupActuals } from './groupActuals'
import { average, MONTH_LABELS, toNumber } from './shared'

const hasEnteredValue = (value) => value !== null && value !== '' && Number.isFinite(Number(value))

const emptyActualsMonths = () =>
  MONTH_LABELS.map((label, monthIndex) => ({
    monthIndex,
    label,
    actualContacts: null,
    actualAhtSeconds: null,
    loadedDaysCount: 0
  }))

export const buildActualsMonthsFromDailyRows = (dailyRows = [], planningYear) => {
  const resolvedPlanningYear = Number(planningYear)
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

  createPlanningGroupActuals({ dailyRows }).dailyRows.forEach((row) => {
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

  return months.map((month) => ({
    monthIndex: month.monthIndex,
    label: month.label,
    actualContacts: month.loadedDaysCount ? month.contacts : null,
    actualAhtSeconds:
      month.ahtWeight > 0
        ? month.weightedAhtTotal / month.ahtWeight
        : month.ahtEntryCount > 0
          ? month.ahtTotal / month.ahtEntryCount
          : null,
    loadedDaysCount: month.loadedDaysCount
  }))
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

    const actualWorkloadHours =
      actualContacts != null && actualAhtSeconds != null
        ? (actualContacts * actualAhtSeconds) / 3600
        : null

    const actualErlangStaffedHours = actualErlangOutput
      ? Math.max(toNumber(actualErlangOutput.erlangStaffedHours, 0), 0)
      : null
    const usesActualErlangOutputs = actualErlangOutputsByMonthIndex instanceof Map

    const actualRequiredStaffHours =
      actualErlangStaffedHours != null
        ? actualErlangStaffedHours * toNumber(record.workloadStaffingRatio, 0)
        : usesActualErlangOutputs
          ? null
          : actualWorkloadHours != null
            ? actualWorkloadHours * toNumber(record.workloadStaffingRatio, 0)
            : null

    const actualRequiredHeadcount =
      actualRequiredStaffHours != null && toNumber(record.paidHoursPerMonth, 0) > 0
        ? actualRequiredStaffHours / record.paidHoursPerMonth
        : null

    const contactsVariance =
      actualContacts != null ? actualContacts - toNumber(record.contacts, 0) : null

    const ahtVarianceSeconds =
      actualAhtSeconds != null ? actualAhtSeconds - toNumber(record.ahtSeconds, 0) : null

    const requiredHeadcountVariance =
      actualRequiredHeadcount != null
        ? actualRequiredHeadcount - toNumber(record.requiredHeadcount, 0)
        : null

    return {
      ...record,
      monthIndex,
      actualContacts,
      actualAhtSeconds,
      plannedContacts: toNumber(record.contacts, 0),
      plannedAhtSeconds: toNumber(record.ahtSeconds, 0),
      plannedWorkloadHours: toNumber(record.workloadHours, 0),
      plannedRequiredHeadcount: toNumber(record.requiredHeadcount, 0),
      plannedStartingTotalHeadcount: toNumber(staffingRecord.startingRosterHeadcount, 0),
      plannedStartingFrontlineHeadcount: toNumber(staffingRecord.startingFrontlineHeadcount, 0),
      plannedEndingTotalHeadcount: toNumber(staffingRecord.endingRosterHeadcount, 0),
      plannedEndingFrontlineHeadcount: toNumber(staffingRecord.endingFrontlineHeadcount, 0),
      plannedGapToRequirement: toNumber(staffingRecord.gapToRequirement, 0),
      actualWorkloadHours,
      actualErlangStaffedHours,
      actualRequiredStaffHours,
      actualRequiredHeadcount,
      actualLoadedDaysCount: Math.max(toNumber(actualsMonth.loadedDaysCount, 0), 0),
      contactsVariance,
      ahtVarianceSeconds,
      requiredHeadcountVariance,
      isLoaded
    }
  })

export const summarizeActualsRecords = (records = []) => {
  const loadedRecords = records.filter((record) => record.isLoaded)
  const demandVarianceRecords = records.filter((record) => record.requiredHeadcountVariance != null)
  const ahtVarianceRecords = records.filter((record) => record.ahtVarianceSeconds != null)
  const actualRequirementRecords = records.filter((record) => record.actualRequiredHeadcount != null)

  return {
    loadedMonthsCount: loadedRecords.length,
    contactsVariance: loadedRecords.reduce((sum, record) => sum + (record.contactsVariance ?? 0), 0),
    averageAhtVarianceSeconds: average(ahtVarianceRecords.map((record) => record.ahtVarianceSeconds)),
    averageRequiredHeadcountVariance: average(
      demandVarianceRecords.map((record) => record.requiredHeadcountVariance)
    ),
    peakActualRequiredHeadcount: Math.max(
      0,
      ...actualRequirementRecords.map((record) => record.actualRequiredHeadcount)
    ),
    peakPlannedRequiredHeadcount: Math.max(
      0,
      ...records.map((record) => toNumber(record.plannedRequiredHeadcount, 0))
    )
  }
}
