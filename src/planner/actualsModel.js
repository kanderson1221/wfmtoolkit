import { average, createActualsMonth, toNumber } from './shared'

const hasEnteredValue = (value) => value !== null && value !== '' && Number.isFinite(Number(value))

export const computeActualsRecords = (monthlyRecords = [], staffingRecords = [], actualsMonths = []) =>
  monthlyRecords.map((record, monthIndex) => {
    const actualsMonth = createActualsMonth(actualsMonths[monthIndex] || {})
    const staffingRecord = staffingRecords[monthIndex] || {}

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

    const actualRequiredStaffHours =
      actualWorkloadHours != null
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
      actualRequiredStaffHours,
      actualRequiredHeadcount,
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
