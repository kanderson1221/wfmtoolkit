import {
  FULL_MONTH_LABELS,
  MONTH_LABELS,
  average,
  createStaffingMonth,
  createTrainingClass,
  createTrainingSettings,
  toNumber
} from './shared'
import { buildHolidayEntriesForYear } from './holidayCalendars'

const parseDate = (value) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value)
  }

  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const monthStart = (year, monthIndex) => new Date(year, monthIndex, 1)
const monthEnd = (year, monthIndex) => new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
const workdayWeekdays = new Set([1, 2, 3, 4, 5])
const millisecondsPerDay = 1000 * 60 * 60 * 24

const formatDateInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createTrainingCalendar = (calendar = {}) => {
  const holidaySetsByYear = new Map()

  const resolveHolidaySet = (year) => {
    if (!holidaySetsByYear.has(year)) {
      holidaySetsByYear.set(
        year,
        new Set(
          buildHolidayEntriesForYear({
            year,
            holidayCalendarId: calendar.holidayCalendarId,
            disabledHolidayRuleIds: calendar.disabledHolidayRuleIds,
            customHolidays: calendar.customHolidays
          })
            .filter((entry) => workdayWeekdays.has(entry.date.getDay()))
            .map((entry) => formatDateInput(entry.date))
        )
      )
    }

    return holidaySetsByYear.get(year)
  }

  return {
    isWorkday: (date) =>
      workdayWeekdays.has(date.getDay()) && !resolveHolidaySet(date.getFullYear()).has(formatDateInput(date))
  }
}

const resolveTrainingCalendar = (calendar) =>
  calendar?.isWorkday instanceof Function ? calendar : createTrainingCalendar(calendar)

const isWorkday = (date, calendar) => calendar.isWorkday(date)

const moveToWorkdayOnOrAfter = (date, calendar) => {
  const nextDate = new Date(date)

  while (!isWorkday(nextDate, calendar)) {
    nextDate.setDate(nextDate.getDate() + 1)
  }

  return nextDate
}

const moveToWorkdayOnOrBefore = (date, calendar) => {
  const nextDate = new Date(date)

  while (!isWorkday(nextDate, calendar)) {
    nextDate.setDate(nextDate.getDate() - 1)
  }

  return nextDate
}

const moveToFirstWorkdayOfWeek = (date, calendar) => {
  const nextDate = new Date(date)
  const weekdayOffset = (nextDate.getDay() + 6) % 7
  nextDate.setDate(nextDate.getDate() - weekdayOffset)
  return moveToWorkdayOnOrAfter(nextDate, calendar)
}

const moveToFirstWorkdayOfPreviousWeek = (date, calendar) => {
  const nextDate = moveToFirstWorkdayOfWeek(date, calendar)
  nextDate.setDate(nextDate.getDate() - 7)
  return moveToWorkdayOnOrAfter(nextDate, calendar)
}

const shiftWorkdays = (date, offset, calendar) => {
  const nextDate = new Date(date)

  if (offset === 0) {
    return nextDate
  }

  const direction = offset > 0 ? 1 : -1
  let remaining = Math.abs(offset)

  while (remaining > 0) {
    nextDate.setDate(nextDate.getDate() + direction)

    if (isWorkday(nextDate, calendar)) {
      remaining -= 1
    }
  }

  return nextDate
}

const roundHeadcount = (value) => Math.round(toNumber(value, 0) * 10) / 10
const hasExplicitNumericValue = (value) => value !== '' && value != null && Number.isFinite(Number(value))
const resolveHeadcount = (value, fallback) =>
  hasExplicitNumericValue(value) ? roundHeadcount(value) : roundHeadcount(fallback)

export const deriveTrainingClassMetrics = (trainingClass, trainingSettings, trainingCalendarOptions = {}) => {
  const normalizedClass = createTrainingClass(trainingClass)
  const normalizedSettings = createTrainingSettings(trainingSettings)
  const trainingCalendar = resolveTrainingCalendar(trainingCalendarOptions)
  const hireDate = parseDate(normalizedClass.hireDate)
  const graduatingHeadcount = resolveHeadcount(normalizedClass.graduatingHeadcount, normalizedClass.hireCount)
  const projectedGraduatingHeadcount = resolveHeadcount(
    normalizedClass.projectedGraduatingHeadcount,
    normalizedClass.hireCount * (normalizedSettings.graduationYieldPercent / 100)
  )
  const trainingFalloutHeadcount = resolveHeadcount(
    normalizedClass.trainingFalloutHeadcount,
    Math.max(graduatingHeadcount - projectedGraduatingHeadcount, 0)
  )

  if (!hireDate) {
    return {
      hireDate: null,
      graduationDate: null,
      frontlineReadyDate: null,
      isValid: false,
      trainingDurationWorkdays: normalizedSettings.trainingDurationWorkdays,
      postTrainingNestingDays: normalizedSettings.postTrainingNestingDays,
      graduatingHeadcount,
      projectedGraduatingHeadcount,
      trainingFalloutHeadcount
    }
  }

  const derivedGraduationDate = shiftWorkdays(
    hireDate,
    Math.max(normalizedSettings.trainingDurationWorkdays - 1, 0),
    trainingCalendar
  )
  const derivedFrontlineReadyDate = shiftWorkdays(
    derivedGraduationDate,
    normalizedSettings.postTrainingNestingDays,
    trainingCalendar
  )
  const graduationDate = parseDate(normalizedClass.graduationDate) || derivedGraduationDate
  const frontlineReadyDate = parseDate(normalizedClass.frontlineReadyDate) || derivedFrontlineReadyDate

  return {
    hireDate,
    graduationDate,
    frontlineReadyDate,
    isValid: true,
    trainingDurationWorkdays: normalizedSettings.trainingDurationWorkdays,
    postTrainingNestingDays: normalizedSettings.postTrainingNestingDays,
    graduatingHeadcount,
    projectedGraduatingHeadcount,
    trainingFalloutHeadcount
  }
}

const buildTrainingClassMonthlySummary = (planningYear, trainingClasses, trainingSettings, trainingCalendarOptions = {}) => {
  const normalizedSettings = createTrainingSettings(trainingSettings)
  const trainingCalendar = resolveTrainingCalendar(trainingCalendarOptions)
  const normalizedClasses = (Array.isArray(trainingClasses) ? trainingClasses : []).map((trainingClass, index) => {
    const nextClass = createTrainingClass(trainingClass)
    const metrics = deriveTrainingClassMetrics(nextClass, normalizedSettings, trainingCalendar)

    return {
      ...nextClass,
      id: nextClass.id || `training-class-${index + 1}`,
      parsedHireDate: metrics.hireDate,
      parsedGraduationDate: metrics.graduationDate,
      parsedFrontlineReadyDate: metrics.frontlineReadyDate,
      graduatingHeadcount: metrics.graduatingHeadcount,
      projectedGraduatingHeadcount: metrics.projectedGraduatingHeadcount,
      trainingFalloutHeadcount: metrics.trainingFalloutHeadcount,
      trainingDurationWorkdays: metrics.trainingDurationWorkdays,
      postTrainingNestingDays: metrics.postTrainingNestingDays,
      isValidDateRange: metrics.isValid
    }
  })

  const monthlySummary = MONTH_LABELS.map((label, monthIndex) => {
    const currentMonthStart = monthStart(planningYear, monthIndex)
    const currentMonthEnd = monthEnd(planningYear, monthIndex)

    const classesStarting = normalizedClasses.filter(
      (trainingClass) =>
        trainingClass.isValidDateRange &&
        trainingClass.parsedHireDate.getFullYear() === planningYear &&
        trainingClass.parsedHireDate.getMonth() === monthIndex
    )

    const classesGraduating = normalizedClasses.filter(
      (trainingClass) =>
        trainingClass.isValidDateRange &&
        trainingClass.parsedGraduationDate.getFullYear() === planningYear &&
        trainingClass.parsedGraduationDate.getMonth() === monthIndex
    )

    const classesFrontlineReady = normalizedClasses.filter(
      (trainingClass) =>
        trainingClass.isValidDateRange &&
        trainingClass.parsedFrontlineReadyDate.getFullYear() === planningYear &&
        trainingClass.parsedFrontlineReadyDate.getMonth() === monthIndex
    )

    const activeClasses = normalizedClasses.filter(
      (trainingClass) =>
        trainingClass.isValidDateRange &&
        trainingClass.parsedHireDate <= currentMonthEnd &&
        trainingClass.parsedGraduationDate >= currentMonthStart
    )

    return {
      monthIndex,
      label,
      fullLabel: FULL_MONTH_LABELS[monthIndex],
      classesStartingCount: classesStarting.length,
      classesGraduatingCount: classesGraduating.length,
      classesFrontlineReadyCount: classesFrontlineReady.length,
      activeClassesCount: activeClasses.length,
      classesStarting,
      classesGraduating,
      classesFrontlineReady,
      activeClasses,
      hireHeadcount: classesStarting.reduce((sum, trainingClass) => sum + trainingClass.hireCount, 0),
      graduatingHeadcount: classesGraduating.reduce((sum, trainingClass) => sum + trainingClass.graduatingHeadcount, 0),
      trainingFalloutHeadcount: classesGraduating.reduce((sum, trainingClass) => sum + trainingClass.trainingFalloutHeadcount, 0),
      frontlineReadyHeadcount: classesFrontlineReady.reduce(
        (sum, trainingClass) => sum + trainingClass.projectedGraduatingHeadcount,
        0
      ),
      startingInTrainingHeadcount: normalizedClasses
        .filter(
          (trainingClass) =>
            trainingClass.isValidDateRange &&
            trainingClass.parsedHireDate < currentMonthStart &&
            trainingClass.parsedGraduationDate >= currentMonthStart
        )
        .reduce((sum, trainingClass) => sum + trainingClass.hireCount, 0),
      inTrainingHeadcount: normalizedClasses
        .filter(
          (trainingClass) =>
            trainingClass.isValidDateRange &&
            trainingClass.parsedHireDate <= currentMonthEnd &&
            trainingClass.parsedGraduationDate > currentMonthEnd
        )
        .reduce((sum, trainingClass) => sum + trainingClass.hireCount, 0),
      startingNonFrontlineHeadcount: normalizedClasses
        .filter(
          (trainingClass) =>
            trainingClass.isValidDateRange &&
            trainingClass.parsedHireDate < currentMonthStart &&
            trainingClass.parsedFrontlineReadyDate >= currentMonthStart
        )
        .reduce((sum, trainingClass) => {
          if (trainingClass.parsedGraduationDate >= currentMonthStart) {
            return sum + trainingClass.hireCount
          }

          return sum + trainingClass.projectedGraduatingHeadcount
        }, 0)
    }
  })

  return {
    classes: normalizedClasses,
    monthlySummary
  }
}

export const deriveStartingFrontlineHeadcount = (
  planningYear,
  startingHeadcount,
  trainingClasses,
  trainingSettings,
  trainingCalendarOptions = {}
) => {
  const rosterHeadcount = Math.max(toNumber(startingHeadcount, 0), 0)
  const trainingSummary = buildTrainingClassMonthlySummary(
    planningYear,
    trainingClasses,
    trainingSettings,
    trainingCalendarOptions
  )
  const startingNonFrontlineHeadcount = trainingSummary.monthlySummary[0]?.startingNonFrontlineHeadcount || 0

  return Math.min(Math.max(rosterHeadcount - startingNonFrontlineHeadcount, 0), rosterHeadcount)
}

export const computeStaffingRecords = (
  monthlyRecords,
  planningYear,
  startingHeadcount,
  startingFrontlineHeadcount,
  staffingMonths,
  trainingClasses,
  trainingSettings,
  trainingCalendarOptions = {}
) => {
  const trainingSummary = buildTrainingClassMonthlySummary(
    planningYear,
    trainingClasses,
    trainingSettings,
    trainingCalendarOptions
  )
  const normalizedStartingHeadcount = Math.max(toNumber(startingHeadcount, 0), 0)
  const normalizedStartingFrontlineHeadcount = Math.max(toNumber(startingFrontlineHeadcount, normalizedStartingHeadcount), 0)
  const openingCarryInNonFrontlineHeadcount = trainingSummary.monthlySummary[0]?.startingNonFrontlineHeadcount || 0

  let runningHeadcount = Math.max(
    normalizedStartingHeadcount,
    normalizedStartingFrontlineHeadcount + openingCarryInNonFrontlineHeadcount
  )
  let runningFrontlineHeadcount = Math.min(normalizedStartingFrontlineHeadcount, runningHeadcount)

  const records = monthlyRecords.map((planned, monthIndex) => {
    const staffingInput = createStaffingMonth(staffingMonths?.[monthIndex] || {})
    const trainingMonth = trainingSummary.monthlySummary[monthIndex]
    const plannedFrontlineAttritionHeadcount = Math.max(toNumber(staffingInput.frontlineAttritionHeadcount, 0), 0)
    const frontlineAttritionHeadcount = Math.min(plannedFrontlineAttritionHeadcount, runningFrontlineHeadcount, runningHeadcount)
    const frontlineAttritionPercent =
      runningFrontlineHeadcount > 0 ? (frontlineAttritionHeadcount / runningFrontlineHeadcount) * 100 : 0
    const hireHeadcount = trainingMonth?.hireHeadcount || 0
    const graduatingHeadcount = trainingMonth?.graduatingHeadcount || 0
    const trainingFalloutHeadcount = trainingMonth?.trainingFalloutHeadcount || 0
    const frontlineReadyHeadcount = trainingMonth?.frontlineReadyHeadcount || 0
    const openingFrontlineHeadcount = runningFrontlineHeadcount
    const endingHeadcount = Math.max(
      runningHeadcount + hireHeadcount - frontlineAttritionHeadcount - trainingFalloutHeadcount,
      0
    )
    const endingFrontlineHeadcount = Math.min(
      Math.max(runningFrontlineHeadcount + frontlineReadyHeadcount - frontlineAttritionHeadcount, 0),
      endingHeadcount
    )
    const startingGapToRequirement = openingFrontlineHeadcount - planned.requiredHeadcount
    const startingGapToRoundedRequirement = openingFrontlineHeadcount - planned.roundedHeadcount
    const endingGapToRequirement = endingFrontlineHeadcount - planned.requiredHeadcount
    const endingGapToRoundedRequirement = endingFrontlineHeadcount - planned.roundedHeadcount

    const record = {
      monthIndex,
      label: planned.label,
      fullLabel: planned.fullLabel,
      requiredHeadcount: planned.requiredHeadcount,
      peakDayRequiredHeadcount: planned.peakDayRequiredHeadcount,
      peakIntervalRequiredHeadcount: planned.peakIntervalRequiredHeadcount,
      roundedRequiredHeadcount: planned.roundedHeadcount,
      startingRosterHeadcount: runningHeadcount,
      startingFrontlineHeadcount: openingFrontlineHeadcount,
      hireHeadcount,
      frontlineAttritionHeadcount,
      frontlineAttritionPercent,
      graduatingHeadcount,
      trainingFalloutHeadcount,
      frontlineReadyHeadcount,
      endingRosterHeadcount: endingHeadcount,
      endingFrontlineHeadcount,
      gapToRequirement: startingGapToRequirement,
      gapToRoundedRequirement: startingGapToRoundedRequirement,
      startingGapToRequirement,
      startingGapToRoundedRequirement,
      endingGapToRequirement,
      endingGapToRoundedRequirement,
      isBelowRequirement: startingGapToRequirement < 0,
      activeTrainingClasses: trainingMonth?.activeClassesCount || 0,
      startingInTrainingHeadcount: trainingMonth?.startingInTrainingHeadcount || 0,
      inTrainingHeadcount: trainingMonth?.inTrainingHeadcount || 0,
      classesStartingCount: trainingMonth?.classesStartingCount || 0,
      classesGraduatingCount: trainingMonth?.classesGraduatingCount || 0,
      classesFrontlineReadyCount: trainingMonth?.classesFrontlineReadyCount || 0,
      classesStarting: trainingMonth?.classesStarting || [],
      classesGraduating: trainingMonth?.classesGraduating || [],
      classesFrontlineReady: trainingMonth?.classesFrontlineReady || [],
      activeClasses: trainingMonth?.activeClasses || []
    }

    runningHeadcount = endingHeadcount
    runningFrontlineHeadcount = endingFrontlineHeadcount
    return record
  })

  records.trainingClasses = trainingSummary.classes
  return records
}

export const summarizeStaffingRecords = (staffingRecords) => {
  const firstRecord = staffingRecords[0] || null
  const endingRecord = staffingRecords[staffingRecords.length - 1] || null
  const peakShortageMonth =
    staffingRecords.length > 0
      ? staffingRecords.reduce((shortest, row) => (row.gapToRequirement < shortest.gapToRequirement ? row : shortest))
      : null

  return {
    startingRosterHeadcount: firstRecord?.startingRosterHeadcount || 0,
    startingFrontlineHeadcount: firstRecord?.startingFrontlineHeadcount || 0,
    endingRosterHeadcount: endingRecord?.endingRosterHeadcount || 0,
    endingFrontlineHeadcount: endingRecord?.endingFrontlineHeadcount || 0,
    totalFrontlineAttritionHeadcount: staffingRecords.reduce((sum, row) => sum + row.frontlineAttritionHeadcount, 0),
    totalHireHeadcount: staffingRecords.reduce((sum, row) => sum + row.hireHeadcount, 0),
    totalGraduatingHeadcount: staffingRecords.reduce((sum, row) => sum + row.graduatingHeadcount, 0),
    averageEndingRosterHeadcount: average(staffingRecords.map((row) => row.endingRosterHeadcount)),
    averageEndingFrontlineHeadcount: average(staffingRecords.map((row) => row.endingFrontlineHeadcount)),
    averageGapToRequirement: average(staffingRecords.map((row) => row.gapToRequirement)),
    monthsBelowRequirement: staffingRecords.filter((row) => row.isBelowRequirement).length,
    peakShortageMonth,
    peakInTrainingHeadcount: staffingRecords.reduce((peak, row) => Math.max(peak, row.inTrainingHeadcount), 0),
    activeTrainingClassCount: Array.isArray(staffingRecords.trainingClasses) ? staffingRecords.trainingClasses.length : 0
  }
}

const rangesOverlap = (leftStart, leftEnd, rightStart, rightEnd) => leftStart <= rightEnd && rightStart <= leftEnd

export const recommendTrainingClasses = ({
  monthlyRecords,
  planningYear,
  startingHeadcount,
  startingFrontlineHeadcount,
  staffingMonths,
  trainingClasses,
  trainingSettings,
  trainingCalendar: trainingCalendarOptions = {},
  targetNextYearStartingFrontlineHeadcount = null,
  minimumHireDate = null,
  maximumHireDate = null,
  includeFirstMonth = false,
  ignoredRecommendationSources = ['recommended'],
  recommendationSource = 'recommended'
}) => {
  const normalizedSettings = createTrainingSettings(trainingSettings)
  const trainingCalendar = resolveTrainingCalendar(trainingCalendarOptions)
  const yieldShare = normalizedSettings.graduationYieldPercent / 100

  if (
    !Array.isArray(monthlyRecords) ||
    !monthlyRecords.length ||
    normalizedSettings.availableTrainers <= 0 ||
    normalizedSettings.maxClassSize <= 0 ||
    normalizedSettings.trainingDurationWorkdays <= 0 ||
    yieldShare <= 0
  ) {
    return []
  }

  const ignoredSources = new Set(ignoredRecommendationSources)
  const manualClasses = (Array.isArray(trainingClasses) ? trainingClasses : [])
    .map((trainingClass) => createTrainingClass(trainingClass))
    .filter((trainingClass) => !ignoredSources.has(trainingClass.source))

  const recommendations = []
  let staffingProjection = computeStaffingRecords(
    monthlyRecords,
    planningYear,
    startingHeadcount,
    startingFrontlineHeadcount,
    staffingMonths,
    manualClasses,
    normalizedSettings,
    trainingCalendar
  )
  const parsedMinimumHireDate = parseDate(minimumHireDate) || monthStart(planningYear, 0)
  const parsedMaximumHireDate = parseDate(maximumHireDate)
  const planStartDate = moveToWorkdayOnOrAfter(parsedMinimumHireDate, trainingCalendar)
  const planEndDate = parsedMaximumHireDate ? moveToWorkdayOnOrBefore(parsedMaximumHireDate, trainingCalendar) : null
  const totalWorkdayLag = Math.max(
    normalizedSettings.trainingDurationWorkdays - 1 + normalizedSettings.postTrainingNestingDays,
    0
  )

  monthlyRecords.forEach((monthlyRecord, monthIndex) => {
    if (monthIndex === 0 && !includeFirstMonth) {
      return
    }

    const currentProjection = staffingProjection[monthIndex]
    const frontlineGap = Math.max(
      monthlyRecord.requiredHeadcount - (currentProjection?.startingFrontlineHeadcount || 0),
      0
    )

    if (frontlineGap <= 0.05) {
      return
    }

    const targetFrontlineReadyDate = moveToWorkdayOnOrBefore(
      new Date(monthStart(planningYear, monthIndex).getTime() - millisecondsPerDay),
      trainingCalendar
    )
    let candidateHireDate = shiftWorkdays(targetFrontlineReadyDate, -totalWorkdayLag, trainingCalendar)

    if (normalizedSettings.startOnFirstBusinessDayOfWeek) {
      candidateHireDate = moveToFirstWorkdayOfWeek(candidateHireDate, trainingCalendar)
    }

    if (candidateHireDate < planStartDate || (planEndDate && candidateHireDate > planEndDate)) {
      return
    }

    let remainingHiresNeeded = Math.max(Math.ceil(frontlineGap / yieldShare), 0)
    let safetyCounter = 0

    while (remainingHiresNeeded > 0 && safetyCounter < 500) {
      safetyCounter += 1

      const candidateGraduationDate = shiftWorkdays(
        candidateHireDate,
        Math.max(normalizedSettings.trainingDurationWorkdays - 1, 0),
        trainingCalendar
      )
      const candidateFrontlineReadyDate = shiftWorkdays(
        candidateGraduationDate,
        normalizedSettings.postTrainingNestingDays,
        trainingCalendar
      )

      if (candidateFrontlineReadyDate > targetFrontlineReadyDate) {
        break
      }

      const normalizedClasses = buildTrainingClassMonthlySummary(
        planningYear,
        [...manualClasses, ...recommendations],
        normalizedSettings,
        trainingCalendar
      ).classes

      const concurrentClassCount = normalizedClasses.filter(
        (trainingClass) =>
          trainingClass.isValidDateRange &&
          rangesOverlap(
            trainingClass.parsedHireDate,
            trainingClass.parsedGraduationDate,
            candidateHireDate,
            candidateGraduationDate
          )
      ).length

      if (concurrentClassCount >= normalizedSettings.availableTrainers) {
        const nextCandidateHireDate = normalizedSettings.startOnFirstBusinessDayOfWeek
          ? moveToFirstWorkdayOfPreviousWeek(candidateHireDate, trainingCalendar)
          : shiftWorkdays(candidateHireDate, -1, trainingCalendar)

        if (nextCandidateHireDate < planStartDate) {
          break
        }

        candidateHireDate = nextCandidateHireDate
        continue
      }

      const classHireCount = Math.min(remainingHiresNeeded, normalizedSettings.maxClassSize)
      recommendations.push(
        createTrainingClass({
          id: `recommended-class-${planningYear}-${monthIndex + 1}-${recommendations.length + 1}`,
          hireDate: formatDateInput(candidateHireDate),
          hireCount: classHireCount,
          source: recommendationSource
        })
      )

      staffingProjection = computeStaffingRecords(
        monthlyRecords,
        planningYear,
        startingHeadcount,
        startingFrontlineHeadcount,
        staffingMonths,
        [...manualClasses, ...recommendations],
        normalizedSettings,
        trainingCalendar
      )

      remainingHiresNeeded = Math.max(
        Math.ceil(
          Math.max(
            monthlyRecord.requiredHeadcount - (staffingProjection[monthIndex]?.startingFrontlineHeadcount || 0),
            0
          ) / yieldShare
        ),
        0
      )
    }
  })

  const normalizedTargetNextYearStartingFrontlineHeadcount = hasExplicitNumericValue(targetNextYearStartingFrontlineHeadcount)
    ? Math.max(roundHeadcount(targetNextYearStartingFrontlineHeadcount), 0)
    : null

  if (normalizedTargetNextYearStartingFrontlineHeadcount != null) {
    const targetFrontlineReadyDate = moveToWorkdayOnOrBefore(monthEnd(planningYear, 11), trainingCalendar)
    let remainingNextYearStartingFrontlineGap = Math.max(
      normalizedTargetNextYearStartingFrontlineHeadcount - (staffingProjection[staffingProjection.length - 1]?.endingFrontlineHeadcount || 0),
      0
    )
    let candidateHireDate = shiftWorkdays(targetFrontlineReadyDate, -totalWorkdayLag, trainingCalendar)

    if (normalizedSettings.startOnFirstBusinessDayOfWeek) {
      candidateHireDate = moveToFirstWorkdayOfWeek(candidateHireDate, trainingCalendar)
    }

    let safetyCounter = 0

    while (remainingNextYearStartingFrontlineGap > 0.05 && safetyCounter < 500) {
      safetyCounter += 1

      if (candidateHireDate < planStartDate || (planEndDate && candidateHireDate > planEndDate)) {
        break
      }

      const candidateGraduationDate = shiftWorkdays(
        candidateHireDate,
        Math.max(normalizedSettings.trainingDurationWorkdays - 1, 0),
        trainingCalendar
      )
      const candidateFrontlineReadyDate = shiftWorkdays(
        candidateGraduationDate,
        normalizedSettings.postTrainingNestingDays,
        trainingCalendar
      )

      if (candidateFrontlineReadyDate > targetFrontlineReadyDate) {
        break
      }

      const normalizedClasses = buildTrainingClassMonthlySummary(
        planningYear,
        [...manualClasses, ...recommendations],
        normalizedSettings,
        trainingCalendar
      ).classes
      const concurrentClassCount = normalizedClasses.filter(
        (trainingClass) =>
          trainingClass.isValidDateRange &&
          rangesOverlap(
            trainingClass.parsedHireDate,
            trainingClass.parsedGraduationDate,
            candidateHireDate,
            candidateGraduationDate
          )
      ).length

      if (concurrentClassCount >= normalizedSettings.availableTrainers) {
        candidateHireDate = normalizedSettings.startOnFirstBusinessDayOfWeek
          ? moveToFirstWorkdayOfPreviousWeek(candidateHireDate, trainingCalendar)
          : shiftWorkdays(candidateHireDate, -1, trainingCalendar)
        continue
      }

      const classHireCount = Math.min(
        Math.ceil(remainingNextYearStartingFrontlineGap / yieldShare),
        normalizedSettings.maxClassSize
      )
      recommendations.push(
        createTrainingClass({
          id: `recommended-class-${planningYear}-next-year-frontline-${recommendations.length + 1}`,
          hireDate: formatDateInput(candidateHireDate),
          hireCount: classHireCount,
          source: recommendationSource
        })
      )

      staffingProjection = computeStaffingRecords(
        monthlyRecords,
        planningYear,
        startingHeadcount,
        startingFrontlineHeadcount,
        staffingMonths,
        [...manualClasses, ...recommendations],
        normalizedSettings,
        trainingCalendar
      )

      remainingNextYearStartingFrontlineGap = Math.max(
        normalizedTargetNextYearStartingFrontlineHeadcount - (staffingProjection[staffingProjection.length - 1]?.endingFrontlineHeadcount || 0),
        0
      )

      if (remainingNextYearStartingFrontlineGap > 0.05) {
        candidateHireDate = normalizedSettings.startOnFirstBusinessDayOfWeek
          ? moveToFirstWorkdayOfPreviousWeek(candidateHireDate, trainingCalendar)
          : shiftWorkdays(candidateHireDate, -1, trainingCalendar)
      }
    }
  }

  return recommendations
}
