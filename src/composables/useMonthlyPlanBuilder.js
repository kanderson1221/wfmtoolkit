import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { plannerDraftRepository } from '../plannerDraftRepository'
import {
  MONTH_LABELS,
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_SCHEDULE_CLOSED,
  buildPlanMonths,
  buildActualsMonths,
  buildPresenceMonths,
  buildRandomMonths,
  buildStaffingMonths,
  buildTrainingClasses,
  clamp,
  computeMonthlyRecords,
  computeActualsRecords,
  computeStaffingRecords,
  createNextYearOpening,
  deriveStartingFrontlineHeadcount,
  buildInheritedTrainingClasses,
  createPlanMonth,
  createActualsMonth,
  createPresenceMonth,
  createRandomMonth,
  createStaffingMonth,
  createTrainingClass,
  createTrainingSettings,
  findLinkedPriorPlan,
  normalizeCustomHolidays,
  normalizeDisabledHolidayRuleIds,
  normalizeWeekdays,
  normalizeHolidayCalendarId,
  normalizeHolidayScheduleMode,
  persistTrainingClassOutcomes,
  recommendTrainingClasses,
  summarizePlanRecords,
  summarizeActualsRecords,
  summarizePresenceRecords,
  summarizeRandomRecords,
  summarizeStaffingRecords,
  toNumber
} from '../plannerModel'
import { copyMonthForward, copyMonthToAll, copyQuarterForward } from './monthlyPlanBuilder/copyActions'
import { buildExamplePlannerState } from './monthlyPlanBuilder/examplePlan'
import {
  autosaveTimeFormatter,
  currentMonthIndex,
  currentYear,
  formatFactor,
  formatNumber,
  formatPercent,
  formatWhole,
  hydrateMonths
} from './monthlyPlanBuilder/shared'

export const useMonthlyPlanBuilder = (props, emit) => {
  const CORE_SECTION_IDS = new Set(['availability', 'variability', 'requirement', 'staffing'])
  const SAME_YEAR_RECOMMENDATION_SOURCE = 'recommended'
  const isEditableTrainingClassInPlanYear = (trainingClass, planningYear) => {
    const hireDate = createTrainingClass(trainingClass).hireDate

    if (!hireDate) {
      return true
    }

    const parsedYear = Number(String(hireDate).slice(0, 4))
    return !Number.isFinite(parsedYear) || parsedYear === planningYear
  }
  const savedPlan = props.initialPlan || null
  const prefilledYear = props.prefilledYear == null || props.prefilledYear === ''
    ? NaN
    : toNumber(props.prefilledYear, NaN)
  const hasPrefilledYear = Number.isFinite(prefilledYear)
  const resolvedDraftKey = computed(() => plannerDraftRepository.buildDraftKey(props.draftKey || savedPlan?.id))
  const activeDraftKey = ref(resolvedDraftKey.value)
  const restoredDraft = plannerDraftRepository.loadDraft(activeDraftKey.value)
  const initialPlan = restoredDraft?.plan || savedPlan || props.centerDefaults || {}
  const initialUi = restoredDraft?.ui || {}
  const initialReviewedSections = Array.isArray(initialUi.reviewedSections)
    ? initialUi.reviewedSections.filter((sectionId) => CORE_SECTION_IDS.has(sectionId))
    : savedPlan?.id || initialPlan.id
      ? [...CORE_SECTION_IDS]
      : []
  const centerOperatingWeekdays = computed(() => normalizeWeekdays(props.centerDefaults?.operatingWeekdays))
  const centerHolidayCalendarId = computed(() =>
    normalizeHolidayCalendarId(props.centerDefaults?.defaultHolidayCalendarId, HOLIDAY_CALENDAR_NONE)
  )
  const centerDisabledHolidayRuleIds = computed(() =>
    normalizeDisabledHolidayRuleIds(props.centerDefaults?.disabledHolidayRuleIds)
  )
  const centerCustomHolidays = computed(() =>
    normalizeCustomHolidays(props.centerDefaults?.customHolidays)
  )
  const centerHolidayScheduleMode = computed(() =>
    normalizeHolidayScheduleMode(props.centerDefaults?.holidayScheduleMode, HOLIDAY_SCHEDULE_CLOSED)
  )
  const centerPaidHoursPerDay = computed(() =>
    toNumber(props.centerDefaults?.presenceMonths?.[0]?.paidHoursPerDay, 8)
  )
  const centerRandomDefaults = computed(() =>
    createRandomMonth(props.centerDefaults?.randomDefaults || {})
  )
  const initialStartingHeadcount = Math.max(toNumber(initialPlan.startingHeadcount, 0), 0)
  const hydratedTrainingClasses = Array.isArray(initialPlan.trainingClasses)
    ? initialPlan.trainingClasses.map((trainingClass) => createTrainingClass(trainingClass))
    : buildTrainingClasses()
  const legacyInitialTab = initialUi.activeTab === 'random' || initialUi.activeTab === 'plan'
    ? initialUi.activeTab
    : 'presence'
  const normalizedInitialForecastStep = (() => {
    if (initialUi.activeForecastStep === 'variability' || initialUi.activeForecastStep === 'requirement') {
      return initialUi.activeForecastStep
    }

    if (legacyInitialTab === 'random') {
      return 'variability'
    }

    if (legacyInitialTab === 'plan') {
      return 'requirement'
    }

    return 'availability'
  })()
  const normalizedInitialSection = (() => {
    if (
      initialUi.activeSection === 'overview' ||
      initialUi.activeSection === 'availability' ||
      initialUi.activeSection === 'variability' ||
      initialUi.activeSection === 'requirement' ||
      initialUi.activeSection === 'staffing' ||
      initialUi.activeSection === 'actuals'
    ) {
      return initialUi.activeSection
    }

    if (initialUi.activeSection === 'forecast') {
      return normalizedInitialForecastStep
    }

    if (initialUi.activeSection === 'budget' || initialUi.activeSection === 'review') {
      return 'overview'
    }

    if (initialUi.activeMode === 'staffing') {
      return 'staffing'
    }

    if (legacyInitialTab === 'random') {
      return 'variability'
    }

    if (legacyInitialTab === 'plan') {
      return 'requirement'
    }

    return 'overview'
  })()

  const initialPlanningYear = toNumber(initialPlan.planningYear, hasPrefilledYear ? prefilledYear : currentYear)
  const planningYear = ref(initialPlanningYear)
  const activeSection = ref(normalizedInitialSection)
  const activeForecastStep = ref(normalizedInitialForecastStep)
  const selectedMonthIndex = ref(clamp(toNumber(initialUi.selectedMonthIndex, currentMonthIndex), 0, MONTH_LABELS.length - 1))
  const operatingWeekdays = ref([...centerOperatingWeekdays.value])
  const holidayCalendarId = ref(centerHolidayCalendarId.value)
  const disabledHolidayRuleIds = ref([...centerDisabledHolidayRuleIds.value])
  const customHolidays = ref(centerCustomHolidays.value.map((holiday) => ({ ...holiday })))
  const holidayScheduleMode = ref(centerHolidayScheduleMode.value)
  const presenceMonths = ref(hydrateMonths(initialPlan.presenceMonths, buildPresenceMonths, createPresenceMonth))
  const randomDefaults = ref(createRandomMonth(initialPlan.randomDefaults || {}))
  const useMonthlyRandomOverrides = ref(Boolean(initialPlan.useMonthlyRandomOverrides))
  const randomMonths = ref(hydrateMonths(initialPlan.randomMonths, buildRandomMonths, createRandomMonth))
  const planMonths = ref(hydrateMonths(initialPlan.planMonths, buildPlanMonths, createPlanMonth))
  const actualsMonths = ref(hydrateMonths(initialPlan.actualsMonths, buildActualsMonths, createActualsMonth))
  const trainingSettings = ref(createTrainingSettings(initialPlan.trainingSettings || {}))
  const nextYearOpening = ref(createNextYearOpening(initialPlan.nextYearOpening || {}))
  const startingHeadcount = ref(initialStartingHeadcount)
  const startingFrontlineHeadcount = ref(
    Math.min(
      Math.max(
        toNumber(
          initialPlan.startingFrontlineHeadcount,
          deriveStartingFrontlineHeadcount(
            toNumber(initialPlan.planningYear, currentYear),
            initialStartingHeadcount,
            hydratedTrainingClasses,
            trainingSettings.value
          )
        ),
        0
      ),
      initialStartingHeadcount
    )
  )
  const staffingMonths = ref(hydrateMonths(initialPlan.staffingMonths, buildStaffingMonths, createStaffingMonth))
  const trainingClasses = ref(hydratedTrainingClasses)
  const reviewedSections = ref([...new Set(initialReviewedSections)])
  const autosaveState = ref(restoredDraft ? 'restored' : savedPlan?.updatedAt ? 'saved' : 'idle')
  const lastAutosavedAt = ref(restoredDraft?.autosavedAt || savedPlan?.updatedAt || null)
  const autosaveReady = ref(false)
  const suspendAutosave = ref(false)

  let autosaveTimer = null

  const markSectionReviewed = (sectionId) => {
    if (!CORE_SECTION_IDS.has(sectionId) || reviewedSections.value.includes(sectionId)) {
      return
    }

    reviewedSections.value = [...reviewedSections.value, sectionId]
  }

  const setActiveSection = (sectionId) => {
    if (sectionId === 'availability' || sectionId === 'variability' || sectionId === 'requirement') {
      markSectionReviewed(sectionId)
      activeForecastStep.value = sectionId
      activeSection.value = sectionId
      return
    }

    markSectionReviewed(sectionId)
    activeSection.value = sectionId === 'budget' || sectionId === 'review' ? 'overview' : sectionId
  }

  const setActiveForecastStep = (stepId) => {
    markSectionReviewed(stepId)
    activeSection.value = stepId
    activeForecastStep.value = stepId
  }

  const moveForecastStep = (direction) => {
    const steps = ['availability', 'variability', 'requirement']
    const currentIndex = steps.indexOf(activeForecastStep.value)
    const nextIndex = clamp(currentIndex + direction, 0, steps.length - 1)

    setActiveForecastStep(steps[nextIndex])
  }

  const copyPresenceMonthToAll = (monthIndex) => {
    presenceMonths.value = copyMonthToAll(presenceMonths.value, monthIndex)
  }

  const copyPresenceMonthForward = (monthIndex) => {
    presenceMonths.value = copyMonthForward(presenceMonths.value, monthIndex)
  }

  const copyPresenceQuarterForward = (monthIndex) => {
    presenceMonths.value = copyQuarterForward(presenceMonths.value, monthIndex)
  }

  const handlePresenceCopyAction = ({ monthIndex, action }) => {
    if (action === 'all') {
      copyPresenceMonthToAll(monthIndex)
    } else if (action === 'forward') {
      copyPresenceMonthForward(monthIndex)
    } else if (action === 'quarter') {
      copyPresenceQuarterForward(monthIndex)
    }
  }

  const syncRandomMonthsToDefaults = () => {
    const source = { ...randomDefaults.value }
    randomMonths.value = MONTH_LABELS.map(() => ({ ...source }))
  }

  const setRandomOverrideMode = (enabled) => {
    useMonthlyRandomOverrides.value = enabled

    if (enabled) {
      syncRandomMonthsToDefaults()
    }
  }

  const copyRandomMonthToAll = (monthIndex) => {
    randomMonths.value = copyMonthToAll(randomMonths.value, monthIndex)
  }

  const copyRandomMonthForward = (monthIndex) => {
    randomMonths.value = copyMonthForward(randomMonths.value, monthIndex)
  }

  const copyRandomQuarterForward = (monthIndex) => {
    randomMonths.value = copyQuarterForward(randomMonths.value, monthIndex)
  }

  const handleRandomCopyAction = ({ monthIndex, action }) => {
    if (action === 'all') {
      copyRandomMonthToAll(monthIndex)
    } else if (action === 'forward') {
      copyRandomMonthForward(monthIndex)
    } else if (action === 'quarter') {
      copyRandomQuarterForward(monthIndex)
    }
  }

  const loadExamplePlan = () => {
    const examplePlan = buildExamplePlannerState(currentYear + 1)

    planningYear.value = currentYear + 1
    operatingWeekdays.value = examplePlan.operatingWeekdays
    holidayCalendarId.value = normalizeHolidayCalendarId(examplePlan.holidayCalendarId, HOLIDAY_CALENDAR_NONE)
    disabledHolidayRuleIds.value = normalizeDisabledHolidayRuleIds(examplePlan.disabledHolidayRuleIds)
    customHolidays.value = normalizeCustomHolidays(examplePlan.customHolidays)
    holidayScheduleMode.value = normalizeHolidayScheduleMode(examplePlan.holidayScheduleMode, HOLIDAY_SCHEDULE_CLOSED)
    presenceMonths.value = examplePlan.presenceMonths
    randomDefaults.value = examplePlan.randomDefaults
    useMonthlyRandomOverrides.value = false
    randomMonths.value = examplePlan.randomMonths
    planMonths.value = examplePlan.planMonths
    actualsMonths.value = buildActualsMonths()
    startingHeadcount.value = examplePlan.startingHeadcount
    startingFrontlineHeadcount.value = examplePlan.startingFrontlineHeadcount
    trainingSettings.value = examplePlan.trainingSettings
    nextYearOpening.value = createNextYearOpening(examplePlan.nextYearOpening || {})
    staffingMonths.value = examplePlan.staffingMonths
    trainingClasses.value = examplePlan.trainingClasses
    reviewedSections.value = [...CORE_SECTION_IDS]
    activeSection.value = 'overview'
    activeForecastStep.value = 'availability'
    selectedMonthIndex.value = 0
  }

  const resetPlanner = () => {
    planningYear.value = currentYear
    operatingWeekdays.value = [...centerOperatingWeekdays.value]
    holidayCalendarId.value = centerHolidayCalendarId.value
    disabledHolidayRuleIds.value = [...centerDisabledHolidayRuleIds.value]
    customHolidays.value = centerCustomHolidays.value.map((holiday) => ({ ...holiday }))
    holidayScheduleMode.value = centerHolidayScheduleMode.value
    presenceMonths.value = MONTH_LABELS.map(() =>
      createPresenceMonth({
        paidHoursPerDay: centerPaidHoursPerDay.value
      })
    )
    randomDefaults.value = createRandomMonth(centerRandomDefaults.value)
    useMonthlyRandomOverrides.value = false
    randomMonths.value = MONTH_LABELS.map(() => createRandomMonth(centerRandomDefaults.value))
    planMonths.value = buildPlanMonths()
    actualsMonths.value = buildActualsMonths()
    trainingSettings.value = createTrainingSettings()
    nextYearOpening.value = createNextYearOpening()
    startingHeadcount.value = 0
    startingFrontlineHeadcount.value = 0
    staffingMonths.value = buildStaffingMonths()
    trainingClasses.value = buildTrainingClasses()
    reviewedSections.value = []
    activeSection.value = 'overview'
    activeForecastStep.value = 'availability'
    selectedMonthIndex.value = currentMonthIndex
  }

  const monthlyRecords = computed(() =>
    computeMonthlyRecords({
      planningYear: planningYear.value,
      operatingWeekdays: operatingWeekdays.value,
      holidayCalendarId: holidayCalendarId.value,
      disabledHolidayRuleIds: disabledHolidayRuleIds.value,
      customHolidays: customHolidays.value,
      holidayScheduleMode: holidayScheduleMode.value,
      presenceMonths: presenceMonths.value,
      randomDefaults: randomDefaults.value,
      useMonthlyRandomOverrides: useMonthlyRandomOverrides.value,
      randomMonths: randomMonths.value,
      planMonths: planMonths.value
    })
  )

  const staffingRecords = computed(() =>
    computeStaffingRecords(
      monthlyRecords.value,
      planningYear.value,
      startingHeadcount.value,
      startingFrontlineHeadcount.value,
      staffingMonths.value,
      effectiveTrainingClasses.value,
      trainingSettings.value
    )
  )

  const linkedPriorPlan = computed(() =>
    findLinkedPriorPlan(props.groupPlans || [], {
      id: savedPlan?.id || initialPlan.id || null,
      planningYear: planningYear.value
    })
  )

  const inheritedStartingPosition = computed(() => {
    if (!linkedPriorPlan.value) {
      return null
    }

    const explicitRosterHeadcount = toNumber(linkedPriorPlan.value?.nextYearOpening?.rosterHeadcount, 0)
    const explicitFrontlineHeadcount = toNumber(linkedPriorPlan.value?.nextYearOpening?.frontlineHeadcount, 0)
    const endingRosterHeadcount = toNumber(linkedPriorPlan.value?.summary?.endingRosterHeadcount, 0)
    const endingFrontlineHeadcount = toNumber(linkedPriorPlan.value?.summary?.endingFrontlineHeadcount, 0)
    const rosterHeadcount = Math.max(explicitRosterHeadcount, explicitFrontlineHeadcount, endingRosterHeadcount, 0)
    const frontlineHeadcount = Math.min(
      Math.max(
        linkedPriorPlan.value?.nextYearOpening?.frontlineHeadcount != null
          ? explicitFrontlineHeadcount
          : endingFrontlineHeadcount,
        0
      ),
      rosterHeadcount
    )

    return {
      rosterHeadcount,
      frontlineHeadcount
    }
  })

  const startingPositionInherited = computed(() => inheritedStartingPosition.value != null)
  const startingPositionInheritedFromYear = computed(() => {
    const linkedPlanningYear = Number(linkedPriorPlan.value?.planningYear)
    return Number.isFinite(linkedPlanningYear) ? linkedPlanningYear : null
  })

  const inheritedTrainingClasses = computed(() =>
    buildInheritedTrainingClasses({
      priorPlan: linkedPriorPlan.value,
      planningYear: planningYear.value
    })
  )

  const ownedTrainingClasses = computed(() =>
    trainingClasses.value.filter((trainingClass) => isEditableTrainingClassInPlanYear(trainingClass, planningYear.value))
  )

  const effectiveTrainingClasses = computed(() => [
    ...inheritedTrainingClasses.value,
    ...ownedTrainingClasses.value
  ])

  const actualsRecords = computed(() =>
    computeActualsRecords(monthlyRecords.value, staffingRecords.value, actualsMonths.value)
  )

  const generateRecommendedTrainingClasses = () => {
    const recommendations = recommendTrainingClasses({
      monthlyRecords: monthlyRecords.value,
      planningYear: planningYear.value,
      startingHeadcount: startingHeadcount.value,
      startingFrontlineHeadcount: startingFrontlineHeadcount.value,
      staffingMonths: staffingMonths.value,
      trainingClasses: effectiveTrainingClasses.value,
      trainingSettings: trainingSettings.value,
      targetNextYearStartingFrontlineHeadcount: nextYearOpening.value.frontlineHeadcount,
      ignoredRecommendationSources: [SAME_YEAR_RECOMMENDATION_SOURCE],
      recommendationSource: SAME_YEAR_RECOMMENDATION_SOURCE
    })

    trainingClasses.value = [
      ...trainingClasses.value.filter(
        (trainingClass) => createTrainingClass(trainingClass).source !== SAME_YEAR_RECOMMENDATION_SOURCE
      ),
      ...recommendations
    ]
  }

  const displayPlanLabel = computed(() => `${planningYear.value} Plan`)
  const duplicateYearPlan = computed(() => {
    const targetYear = toNumber(planningYear.value, currentYear)
    const currentPlanId = savedPlan?.id || initialPlan.id || null

    return (props.groupPlans || []).find(
      (plan) => plan?.id !== currentPlanId && toNumber(plan?.planningYear, currentYear) === targetYear
    ) || null
  })
  const duplicateYearMessage = computed(() =>
    duplicateYearPlan.value
      ? `A ${planningYear.value} plan already exists for ${props.centerDefaults?.groupName || 'this staffing group'}. Open the existing plan or choose another year.`
      : ''
  )
  const presenceSummary = computed(() => summarizePresenceRecords(monthlyRecords.value))
  const randomSummary = computed(() =>
    summarizeRandomRecords(monthlyRecords.value, randomDefaults.value, useMonthlyRandomOverrides.value)
  )
  const planSummary = computed(() => summarizePlanRecords(monthlyRecords.value))
  const staffingSummary = computed(() => summarizeStaffingRecords(staffingRecords.value))
  const actualsSummary = computed(() => summarizeActualsRecords(actualsRecords.value))
  const hasNextYearStartingFrontlineTarget = computed(() => nextYearOpening.value.frontlineHeadcount != null)

  const buildPlanPayload = () => ({
    id: savedPlan?.id || initialPlan.id || null,
    createdAt: savedPlan?.createdAt || initialPlan.createdAt || null,
    name: `${planningYear.value} Plan`,
    planningYear: planningYear.value,
    operatingWeekdays: [...operatingWeekdays.value],
    holidayCalendarId: holidayCalendarId.value,
    disabledHolidayRuleIds: [...disabledHolidayRuleIds.value],
    customHolidays: customHolidays.value.map((holiday) => ({ ...holiday })),
    holidayScheduleMode: holidayScheduleMode.value,
    presenceMonths: presenceMonths.value.map((month) => createPresenceMonth(month)),
    randomDefaults: createRandomMonth(randomDefaults.value),
    useMonthlyRandomOverrides: useMonthlyRandomOverrides.value,
    randomMonths: randomMonths.value.map((month) => createRandomMonth(month)),
    planMonths: planMonths.value.map((month) => createPlanMonth(month)),
    actualsMonths: actualsMonths.value.map((month) => createActualsMonth(month)),
    trainingSettings: createTrainingSettings(trainingSettings.value),
    nextYearOpening: createNextYearOpening({
      frontlineHeadcount: nextYearOpening.value.frontlineHeadcount
    }),
    startingHeadcount: startingHeadcount.value,
    startingFrontlineHeadcount: startingFrontlineHeadcount.value,
    staffingMonths: staffingMonths.value.map((month) => createStaffingMonth(month)),
    trainingClasses: ownedTrainingClasses.value.map((trainingClass) =>
      persistTrainingClassOutcomes(trainingClass, planningYear.value, trainingSettings.value)
    ),
    summary: {
      annualContacts: planSummary.value.annualContacts,
      annualWorkloadHours: planSummary.value.annualWorkloadHours,
      annualRequiredStaffHours: planSummary.value.annualRequiredStaffHours,
      averageAhtSeconds: planSummary.value.averageAhtSeconds,
      minimumRequiredHeadcount: planSummary.value.minimumRequiredHeadcount,
      averageRequiredStaffHours: planSummary.value.averageRequiredStaffHours,
      averageRequiredHeadcount: planSummary.value.averageRequiredHeadcount,
      peakRequiredHeadcount: planSummary.value.peakMonth.requiredHeadcount,
      peakMonthLabel: planSummary.value.peakMonth.fullLabel,
      averagePeakRequiredHeadcount: planSummary.value.averagePeakRequiredHeadcount,
      peakDayRequiredHeadcount: planSummary.value.peakDayMonth.peakDayRequiredHeadcount,
      peakDayMonthLabel: planSummary.value.peakDayMonth.fullLabel,
      startingRosterHeadcount: staffingSummary.value.startingRosterHeadcount,
      startingFrontlineHeadcount: staffingSummary.value.startingFrontlineHeadcount,
      endingRosterHeadcount: staffingSummary.value.endingRosterHeadcount,
      endingFrontlineHeadcount: staffingSummary.value.endingFrontlineHeadcount,
      totalHireHeadcount: staffingSummary.value.totalHireHeadcount,
      totalGraduatingHeadcount: staffingSummary.value.totalGraduatingHeadcount,
      totalFrontlineAttritionHeadcount: staffingSummary.value.totalFrontlineAttritionHeadcount,
      averageGapToRequirement: staffingSummary.value.averageGapToRequirement,
      peakInTrainingHeadcount: staffingSummary.value.peakInTrainingHeadcount
    }
  })

  const buildDraftPayload = () => ({
    plan: buildPlanPayload(),
    ui: {
      activeSection: activeSection.value,
      activeForecastStep: activeForecastStep.value,
      activeMode: activeSection.value === 'staffing' ? 'staffing' : 'plan',
      activeTab:
        activeSection.value === 'variability'
          ? 'random'
          : activeSection.value === 'requirement'
            ? 'plan'
            : 'presence',
      selectedMonthIndex: selectedMonthIndex.value,
      reviewedSections: [...reviewedSections.value]
    }
  })

  watch(
    [
      centerOperatingWeekdays,
      centerHolidayCalendarId,
      centerDisabledHolidayRuleIds,
      centerCustomHolidays,
      centerHolidayScheduleMode
    ],
    ([nextOperatingWeekdays, nextHolidayCalendarId, nextDisabledHolidayRuleIds, nextCustomHolidays, nextHolidayScheduleMode]) => {
      operatingWeekdays.value = [...nextOperatingWeekdays]
      holidayCalendarId.value = nextHolidayCalendarId
      disabledHolidayRuleIds.value = [...nextDisabledHolidayRuleIds]
      customHolidays.value = nextCustomHolidays.map((holiday) => ({ ...holiday }))
      holidayScheduleMode.value = nextHolidayScheduleMode
    }
  )

  watch(activeSection, (sectionId) => {
    markSectionReviewed(sectionId)
  })

  const clearPendingAutosave = () => {
    if (autosaveTimer) {
      window.clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
  }

  const persistDraftNow = () => {
    if (suspendAutosave.value) {
      return
    }

    const nextDraft = plannerDraftRepository.persistDraft(activeDraftKey.value, buildDraftPayload())
    lastAutosavedAt.value = nextDraft.autosavedAt
    autosaveState.value = 'saved'
  }

  const queueAutosave = () => {
    if (!autosaveReady.value || suspendAutosave.value) {
      return
    }

    clearPendingAutosave()
    autosaveState.value = 'saving'
    autosaveTimer = window.setTimeout(() => {
      persistDraftNow()
      autosaveTimer = null
    }, 700)
  }

  const flushAutosave = () => {
    if (!autosaveReady.value || suspendAutosave.value) {
      return
    }

    clearPendingAutosave()
    persistDraftNow()
  }

  const removeDraft = () => {
    clearPendingAutosave()
    plannerDraftRepository.clearDraft(activeDraftKey.value)
    lastAutosavedAt.value = null
    autosaveState.value = 'idle'
  }

  watch(resolvedDraftKey, (nextDraftKey, previousDraftKey) => {
    if (!nextDraftKey || nextDraftKey === previousDraftKey) {
      return
    }

    activeDraftKey.value = nextDraftKey

    if (!autosaveReady.value || suspendAutosave.value) {
      return
    }

    clearPendingAutosave()

    const nextDraft = plannerDraftRepository.persistDraft(nextDraftKey, buildDraftPayload())
    lastAutosavedAt.value = nextDraft.autosavedAt
    autosaveState.value = 'saved'
  })

  const validatePlanDetails = () => {
    if (duplicateYearPlan.value) {
      window.alert(duplicateYearMessage.value)
      return false
    }

    return true
  }

  const savePlan = () => {
    if (!validatePlanDetails()) {
      return
    }

    const savedAt = new Date().toISOString()
    suspendAutosave.value = true
    removeDraft()
    lastAutosavedAt.value = savedAt
    autosaveState.value = 'saved'
    emit('save', buildPlanPayload())
  }

  const cancelEditor = () => {
    flushAutosave()
    emit('cancel')
  }

  const autosaveStatusMessage = computed(() => {
    if (autosaveState.value === 'saving') {
      return 'Autosaving draft...'
    }

    if (lastAutosavedAt.value) {
      const formattedTime = autosaveTimeFormatter.format(new Date(lastAutosavedAt.value))
      if (autosaveState.value === 'saved') {
        return `Saved ${formattedTime}`
      }
      return autosaveState.value === 'restored'
        ? `Draft restored from ${formattedTime}`
        : `Autosaved ${formattedTime}`
    }

    return 'Autosave ready'
  })
  watch(
    [
      planningYear,
      activeSection,
      activeForecastStep,
      selectedMonthIndex,
      operatingWeekdays,
      holidayCalendarId,
      disabledHolidayRuleIds,
      customHolidays,
      holidayScheduleMode,
      presenceMonths,
      randomDefaults,
      useMonthlyRandomOverrides,
      randomMonths,
      planMonths,
      actualsMonths,
      trainingSettings,
      nextYearOpening,
      startingHeadcount,
      startingFrontlineHeadcount,
      staffingMonths,
      trainingClasses
    ],
    () => {
      if (autosaveState.value === 'restored' || autosaveState.value === 'saved') {
        autosaveState.value = 'idle'
      }

      queueAutosave()
    },
    { deep: true }
  )

  watch(startingHeadcount, (value) => {
    if (startingFrontlineHeadcount.value > value) {
      startingFrontlineHeadcount.value = value
    }
  })

  watch(
    inheritedStartingPosition,
    (position) => {
      if (!position) {
        return
      }

      startingHeadcount.value = position.rosterHeadcount
      startingFrontlineHeadcount.value = position.frontlineHeadcount
    },
    { immediate: true }
  )

  onMounted(() => {
    autosaveReady.value = true
    window.addEventListener('beforeunload', flushAutosave)
  })

  onBeforeUnmount(() => {
    if (!suspendAutosave.value) {
      flushAutosave()
    }

    window.removeEventListener('beforeunload', flushAutosave)
  })

  return {
    planningYear,
    activeSection,
    activeForecastStep,
    selectedMonthIndex,
    holidayCalendarId,
    disabledHolidayRuleIds,
    customHolidays,
    holidayScheduleMode,
    presenceMonths,
    randomDefaults,
    useMonthlyRandomOverrides,
    randomMonths,
    planMonths,
    actualsMonths,
    trainingSettings,
    nextYearOpening,
    startingHeadcount,
    startingFrontlineHeadcount,
    staffingMonths,
    trainingClasses,
    ownedTrainingClasses,
    startingPositionInherited,
    startingPositionInheritedFromYear,
    inheritedTrainingClasses,
    effectiveTrainingClasses,
    reviewedSections,
    autosaveState,
    monthlyRecords,
    displayPlanLabel,
    presenceSummary,
    randomSummary,
    planSummary,
    staffingSummary,
    staffingRecords,
    hasNextYearStartingFrontlineTarget,
    actualsRecords,
    actualsSummary,
    autosaveStatusMessage,
    formatNumber,
    formatWhole,
    formatPercent,
    formatFactor,
    setActiveSection,
    setActiveForecastStep,
    moveForecastStep,
    handlePresenceCopyAction,
    handleRandomCopyAction,
    setRandomOverrideMode,
    loadExamplePlan,
    resetPlanner,
    generateRecommendedTrainingClasses,
    savePlan,
    cancelEditor
  }
}
