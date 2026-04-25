import { computed, onMounted, ref, watch } from 'vue'

import { plannerDraftRepository } from '../plannerDraftRepository'
import {
  MONTH_LABELS,
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_SCHEDULE_CLOSED,
  buildActualsMonthsFromDailyRows,
  buildPlanMonths,
  buildStaffingMonths,
  buildTrainingClasses,
  clamp,
  computeMonthlyRecords,
  computeActualsRecords,
  computeStaffingRecords,
  createNextYearOpening,
  buildInheritedTrainingClasses,
  createPlanMonth,
  createPlanningGroupActuals,
  createPresenceMonth,
  createRandomMonth,
  createStaffingMonth,
  createTrainingClass,
  createTrainingSettings,
  findLinkedPriorPlan,
  normalizeCustomHolidays,
  normalizeDisabledHolidayRuleIds,
  normalizeHolidayCalendarId,
  normalizeHolidayScheduleMode,
  persistTrainingClassOutcomes,
  recommendTrainingClasses,
  resolveLinkedOpeningPosition,
  summarizePlanRecords,
  summarizeActualsRecords,
  summarizePresenceRecords,
  summarizeRandomRecords,
  summarizeStaffingRecords,
  toNumber
} from '../plannerModel'
import {
  createPlanDemandSource
} from '../planner/demandSources'
import { PLAN_TYPE_BUDGET, PLAN_TYPE_UPDATE } from '../planningStorage'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../planner/shared'
import { mergeIntradayErlangMonthlyRecords } from '../planner/intradayErlang'
import { copyMonthForward, copyMonthToAll, copyQuarterForward } from './monthlyPlanBuilder/copyActions'
import { buildExamplePlannerState } from './monthlyPlanBuilder/examplePlan'
import { usePlannerAutosave } from './monthlyPlanBuilder/usePlannerAutosave'
import { usePlannerActualsIntradayErlang } from './monthlyPlanBuilder/usePlannerActualsIntradayErlang'
import { usePlannerForecastDemandSource } from './monthlyPlanBuilder/usePlannerForecastDemandSource'
import { usePlannerIntradayErlang } from './monthlyPlanBuilder/usePlannerIntradayErlang'
import {
  currentMonthIndex,
  currentYear,
  formatFactor,
  formatNumber,
  formatPercent,
  formatWhole,
  buildPlannerSeedDefaults,
  resolvePlannerInitialState
} from './monthlyPlanBuilder/shared'

export const useMonthlyPlanBuilder = (props, emit) => {
  const CORE_SECTION_IDS = new Set(['availability', 'variability', 'requirement', 'staffing'])
  const SAME_YEAR_RECOMMENDATION_SOURCE = 'recommended'
  const syncPlanScheduleWithSeed = (draftPlan) => ({
    ...draftPlan,
    operatingWeekdays: Array.isArray(props.centerDefaults?.operatingWeekdays)
      ? [...props.centerDefaults.operatingWeekdays]
      : draftPlan?.operatingWeekdays,
    holidayCalendarId: props.centerDefaults?.holidayCalendarId,
    disabledHolidayRuleIds: Array.isArray(props.centerDefaults?.disabledHolidayRuleIds)
      ? [...props.centerDefaults.disabledHolidayRuleIds]
      : [],
    customHolidays: Array.isArray(props.centerDefaults?.customHolidays)
      ? props.centerDefaults.customHolidays.map((holiday) => ({ ...holiday }))
      : [],
    holidayScheduleMode: props.centerDefaults?.holidayScheduleMode
  })
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
  const resolvedDraftKey = computed(() => {
    if (savedPlan?.id) {
      return plannerDraftRepository.buildDraftKey(savedPlan.id)
    }

    return plannerDraftRepository.buildDraftKey(props.draftKey)
  })
  const plannerSeedDefaults = computed(() =>
    buildPlannerSeedDefaults(props.centerDefaults, hasPrefilledYear ? prefilledYear : currentYear)
  )
  const restoredDraft = ref(null)
  const plannerBootstrapping = ref(true)

  const buildBootstrapState = (draftPayload = null) => {
    const sourcePlan =
      draftPayload?.plan
        ? syncPlanScheduleWithSeed(draftPayload.plan)
        : savedPlan
          ? syncPlanScheduleWithSeed(savedPlan)
          : null
    const initialPlan = sourcePlan || props.centerDefaults || {}
    const initialUi = draftPayload?.ui || {}
    const initialReviewedSections = Array.isArray(initialUi.reviewedSections)
      ? initialUi.reviewedSections.filter((sectionId) => CORE_SECTION_IDS.has(sectionId))
      : sourcePlan?.id || initialPlan.id
        ? [...CORE_SECTION_IDS]
        : []
    const initialState = resolvePlannerInitialState({
      sourcePlan,
      centerDefaults: props.centerDefaults,
      prefilledYear
    })
    const initialSelectedForecastProjectId = initialUi.selectedForecastProjectId || initialState.demandSource.forecastProjectId || ''
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
        initialUi.activeSection === 'forecast' ||
        initialUi.activeSection === 'availability' ||
        initialUi.activeSection === 'variability' ||
        initialUi.activeSection === 'requirement' ||
        initialUi.activeSection === 'staffing' ||
        initialUi.activeSection === 'actuals'
      ) {
        return initialUi.activeSection
      }

      if (initialUi.activeSection === 'overview' || initialUi.activeSection === 'budget' || initialUi.activeSection === 'review') {
        return 'forecast'
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

      return 'forecast'
    })()

    return {
      initialState,
      selectedForecastProjectId: initialSelectedForecastProjectId,
      activeSection: normalizedInitialSection,
      activeForecastStep: normalizedInitialForecastStep,
      selectedMonthIndex: clamp(toNumber(initialUi.selectedMonthIndex, currentMonthIndex), 0, MONTH_LABELS.length - 1),
      reviewedSections: [...new Set(initialReviewedSections)]
    }
  }

  const applyBootstrapState = (bootstrapState) => {
    planningYear.value = bootstrapState.initialState.planningYear
    requirementMethod.value = bootstrapState.initialState.requirementMethod
    activeSection.value = bootstrapState.activeSection
    activeForecastStep.value = bootstrapState.activeForecastStep
    selectedMonthIndex.value = bootstrapState.selectedMonthIndex
    operatingWeekdays.value = [...bootstrapState.initialState.operatingWeekdays]
    holidayCalendarId.value = bootstrapState.initialState.holidayCalendarId
    disabledHolidayRuleIds.value = [...bootstrapState.initialState.disabledHolidayRuleIds]
    customHolidays.value = bootstrapState.initialState.customHolidays.map((holiday) => ({ ...holiday }))
    holidayScheduleMode.value = bootstrapState.initialState.holidayScheduleMode
    presenceMonths.value = bootstrapState.initialState.presenceMonths.map((month) => createPresenceMonth(month))
    randomDefaults.value = createRandomMonth(bootstrapState.initialState.randomDefaults)
    useMonthlyRandomOverrides.value = bootstrapState.initialState.useMonthlyRandomOverrides
    randomMonths.value = bootstrapState.initialState.randomMonths.map((month) => createRandomMonth(month))
    planMonths.value = bootstrapState.initialState.planMonths.map((month) => createPlanMonth(month))
    demandSource.value = createPlanDemandSource(bootstrapState.initialState.demandSource)
    selectedForecastProjectId.value = bootstrapState.selectedForecastProjectId
    trainingSettings.value = createTrainingSettings(bootstrapState.initialState.trainingSettings)
    nextYearOpening.value = createNextYearOpening(bootstrapState.initialState.nextYearOpening)
    startingHeadcount.value = bootstrapState.initialState.startingHeadcount
    startingFrontlineHeadcount.value = bootstrapState.initialState.startingFrontlineHeadcount
    staffingMonths.value = bootstrapState.initialState.staffingMonths.map((month) => createStaffingMonth(month))
    trainingClasses.value = bootstrapState.initialState.trainingClasses.map((trainingClass) => createTrainingClass(trainingClass))
    reviewedSections.value = [...bootstrapState.reviewedSections]
  }

  const initialBootstrapState = buildBootstrapState()
  const sourcePlanReference = computed(() =>
    restoredDraft.value?.plan
      ? syncPlanScheduleWithSeed(restoredDraft.value.plan)
      : savedPlan
        ? syncPlanScheduleWithSeed(savedPlan)
        : props.centerDefaults || {}
  )
  const planType = computed(() =>
    sourcePlanReference.value?.planType === PLAN_TYPE_UPDATE ? PLAN_TYPE_UPDATE : PLAN_TYPE_BUDGET
  )
  const planVersionLabel = computed(() =>
    planType.value === PLAN_TYPE_UPDATE ? 'Update' : 'Budget'
  )
  const isReadOnlyBudget = computed(() =>
    Boolean(sourcePlanReference.value?.id && planType.value === PLAN_TYPE_BUDGET)
  )
  const readOnlyBudgetMessage = 'Budget plan is locked. Create an updated plan to change future assumptions.'

  const planningYear = ref(initialBootstrapState.initialState.planningYear)
  const requirementMethod = ref(initialBootstrapState.initialState.requirementMethod)
  const activeSection = ref(initialBootstrapState.activeSection)
  const activeForecastStep = ref(initialBootstrapState.activeForecastStep)
  const selectedMonthIndex = ref(initialBootstrapState.selectedMonthIndex)
  const operatingWeekdays = ref([...initialBootstrapState.initialState.operatingWeekdays])
  const holidayCalendarId = ref(initialBootstrapState.initialState.holidayCalendarId)
  const disabledHolidayRuleIds = ref([...initialBootstrapState.initialState.disabledHolidayRuleIds])
  const customHolidays = ref(initialBootstrapState.initialState.customHolidays.map((holiday) => ({ ...holiday })))
  const holidayScheduleMode = ref(initialBootstrapState.initialState.holidayScheduleMode)
  const presenceMonths = ref(initialBootstrapState.initialState.presenceMonths.map((month) => createPresenceMonth(month)))
  const randomDefaults = ref(createRandomMonth(initialBootstrapState.initialState.randomDefaults))
  const useMonthlyRandomOverrides = ref(initialBootstrapState.initialState.useMonthlyRandomOverrides)
  const randomMonths = ref(initialBootstrapState.initialState.randomMonths.map((month) => createRandomMonth(month)))
  const planMonths = ref(initialBootstrapState.initialState.planMonths.map((month) => createPlanMonth(month)))
  const demandSource = ref(createPlanDemandSource(initialBootstrapState.initialState.demandSource))
  const selectedForecastProjectId = ref(initialBootstrapState.selectedForecastProjectId)
  const trainingSettings = ref(createTrainingSettings(initialBootstrapState.initialState.trainingSettings))
  const nextYearOpening = ref(createNextYearOpening(initialBootstrapState.initialState.nextYearOpening))
  const startingHeadcount = ref(initialBootstrapState.initialState.startingHeadcount)
  const startingFrontlineHeadcount = ref(initialBootstrapState.initialState.startingFrontlineHeadcount)
  const staffingMonths = ref(initialBootstrapState.initialState.staffingMonths.map((month) => createStaffingMonth(month)))
  const trainingClasses = ref(initialBootstrapState.initialState.trainingClasses.map((trainingClass) => createTrainingClass(trainingClass)))
  const reviewedSections = ref([...new Set(initialBootstrapState.reviewedSections)])
  const validationMessage = ref('')
  const ensurePlannerEditable = () => {
    if (!isReadOnlyBudget.value) {
      return true
    }

    validationMessage.value = readOnlyBudgetMessage
    return false
  }

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
    activeSection.value = sectionId === 'overview' || sectionId === 'budget' || sectionId === 'review'
      ? 'forecast'
      : sectionId
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
    if (!ensurePlannerEditable()) {
      return
    }

    validationMessage.value = ''
    const examplePlan = buildExamplePlannerState(currentYear + 1)

    planningYear.value = currentYear + 1
    requirementMethod.value = examplePlan.requirementMethod || plannerSeedDefaults.value.requirementMethod
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
    demandSource.value = createPlanDemandSource(examplePlan.demandSource)
    selectedForecastProjectId.value = examplePlan.demandSource?.forecastProjectId || ''
    startingHeadcount.value = examplePlan.startingHeadcount
    startingFrontlineHeadcount.value = examplePlan.startingFrontlineHeadcount
    trainingSettings.value = examplePlan.trainingSettings
    nextYearOpening.value = createNextYearOpening(examplePlan.nextYearOpening || {})
    staffingMonths.value = examplePlan.staffingMonths
    trainingClasses.value = examplePlan.trainingClasses
    reviewedSections.value = [...CORE_SECTION_IDS]
    activeSection.value = 'forecast'
    activeForecastStep.value = 'availability'
    selectedMonthIndex.value = 0
  }

  const resetPlanner = () => {
    if (!ensurePlannerEditable()) {
      return
    }

    validationMessage.value = ''
    planningYear.value = plannerSeedDefaults.value.planningYear
    requirementMethod.value = plannerSeedDefaults.value.requirementMethod
    operatingWeekdays.value = [...plannerSeedDefaults.value.operatingWeekdays]
    holidayCalendarId.value = plannerSeedDefaults.value.holidayCalendarId
    disabledHolidayRuleIds.value = [...plannerSeedDefaults.value.disabledHolidayRuleIds]
    customHolidays.value = plannerSeedDefaults.value.customHolidays.map((holiday) => ({ ...holiday }))
    holidayScheduleMode.value = plannerSeedDefaults.value.holidayScheduleMode
    presenceMonths.value = plannerSeedDefaults.value.presenceMonths.map((month) => createPresenceMonth(month))
    randomDefaults.value = createRandomMonth(plannerSeedDefaults.value.randomDefaults)
    useMonthlyRandomOverrides.value = false
    randomMonths.value = MONTH_LABELS.map(() => createRandomMonth(plannerSeedDefaults.value.randomDefaults))
    planMonths.value = buildPlanMonths()
    demandSource.value = createPlanDemandSource()
    selectedForecastProjectId.value = ''
    trainingSettings.value = createTrainingSettings()
    nextYearOpening.value = createNextYearOpening()
    startingHeadcount.value = plannerSeedDefaults.value.startingHeadcount
    startingFrontlineHeadcount.value = plannerSeedDefaults.value.startingFrontlineHeadcount
    staffingMonths.value = buildStaffingMonths()
    trainingClasses.value = buildTrainingClasses()
    reviewedSections.value = []
    activeSection.value = 'forecast'
    activeForecastStep.value = 'availability'
    selectedMonthIndex.value = currentMonthIndex
  }

  const {
    availableForecastProjects,
    savedForecastProjectCount,
    forecastsLoading,
    forecastsError,
    forecastSelectOptions,
    selectedForecastProject,
    selectedForecastPreviewSummary,
    demandSourceSummary,
    forecastCanApply,
    forecastApplyMessage,
    forecastApplyTone,
    hasLegacyManualDemandSource,
    legacyManualSummary,
    applyForecastToDemand: applyForecastToDemandBase,
    convertLegacyManualDemandSource: convertLegacyManualDemandSourceBase,
    reloadForecastProjects: loadForecastProjects
  } = usePlannerForecastDemandSource({
    props,
    planningYear,
    demandSource,
    planMonths,
    selectedForecastProjectId
  })

  const applyForecastToDemand = () => {
    if (!ensurePlannerEditable()) {
      return false
    }

    return applyForecastToDemandBase()
  }

  const baselineMonthlyRecords = computed(() =>
    computeMonthlyRecords({
      planningYear: planningYear.value,
      requirementMethod: requirementMethod.value,
      demandSource: demandSource.value,
      operatingWeekdays: operatingWeekdays.value,
      holidayCalendarId: holidayCalendarId.value,
      disabledHolidayRuleIds: disabledHolidayRuleIds.value,
      customHolidays: customHolidays.value,
      holidayScheduleMode: holidayScheduleMode.value,
      presenceMonths: presenceMonths.value,
      randomDefaults: randomDefaults.value,
      useMonthlyRandomOverrides:
        requirementMethod.value === PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
          ? false
          : useMonthlyRandomOverrides.value,
      randomMonths: randomMonths.value,
      planMonths: planMonths.value
    })
  )

  const intradayErlangServiceLevelPercent = computed(() =>
    Math.min(
      100,
      Math.max(
        toNumber(
          sourcePlanReference.value?.serviceLevelPercent ?? props.centerDefaults?.serviceLevelPercent,
          80
        ),
        1
      )
    )
  )
  const intradayErlangServiceLevelThresholdSeconds = computed(() =>
    Math.max(
      Math.round(
        toNumber(
          sourcePlanReference.value?.serviceLevelThresholdSeconds ?? props.centerDefaults?.serviceLevelThresholdSeconds,
          20
        )
      ),
      1
    )
  )
  const intradayErlangOpenTime = computed(() =>
    String(sourcePlanReference.value?.operatingOpenTime || props.centerDefaults?.operatingOpenTime || '').trim()
  )
  const intradayErlangCloseTime = computed(() =>
    String(sourcePlanReference.value?.operatingCloseTime || props.centerDefaults?.operatingCloseTime || '').trim()
  )
  const intradayErlangProfile = computed(() => {
    const snapshot =
      sourcePlanReference.value?.intraday ||
      props.centerDefaults?.intraday ||
      {}

    return {
      intervalLengthMinutes: snapshot.intervalLengthMinutes,
      intervalRatios: Array.isArray(snapshot.intervalRatios)
        ? snapshot.intervalRatios.map((row) => ({ ...row }))
        : []
    }
  })

  const {
    erlangStatus: intradayErlangStatus,
    monthlyOutputsByMonthIndex: intradayErlangMonthlyOutputsByMonthIndex,
    intervalOutputs: intradayErlangIntervalOutputs,
    dailyOutputs: intradayErlangDailyOutputs
  } = usePlannerIntradayErlang({
    requirementMethod,
    planningYear,
    demandSource,
    monthlyRecords: baselineMonthlyRecords,
    operatingWeekdays,
    holidayCalendarId,
    disabledHolidayRuleIds,
    customHolidays,
    operatingOpenTime: intradayErlangOpenTime,
    operatingCloseTime: intradayErlangCloseTime,
    serviceLevelPercent: intradayErlangServiceLevelPercent,
    serviceLevelThresholdSeconds: intradayErlangServiceLevelThresholdSeconds,
    intraday: intradayErlangProfile
  })

  const monthlyRecords = computed(() =>
    requirementMethod.value === PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
      ? mergeIntradayErlangMonthlyRecords(
          baselineMonthlyRecords.value,
          intradayErlangMonthlyOutputsByMonthIndex.value,
          intradayErlangDailyOutputs.value
        )
      : baselineMonthlyRecords.value
  )

  const trainingCalendar = computed(() => ({
    holidayCalendarId: holidayCalendarId.value,
    disabledHolidayRuleIds: [...disabledHolidayRuleIds.value],
    customHolidays: customHolidays.value.map((holiday) => ({ ...holiday }))
  }))

  const staffingRecords = computed(() =>
    computeStaffingRecords(
      monthlyRecords.value,
      planningYear.value,
      startingHeadcount.value,
      startingFrontlineHeadcount.value,
      staffingMonths.value,
      effectiveTrainingClasses.value,
      trainingSettings.value,
      trainingCalendar.value
    )
  )

  const linkedPriorPlan = computed(() =>
    findLinkedPriorPlan(props.groupPlans || [], {
      id: sourcePlanReference.value?.id || null,
      planningYear: planningYear.value
    })
  )

  const inheritedStartingPosition = computed(() => {
    if (!linkedPriorPlan.value) {
      return null
    }

    return resolveLinkedOpeningPosition({
      priorPlan: linkedPriorPlan.value,
      startingHeadcount: startingHeadcount.value,
      startingFrontlineHeadcount: startingFrontlineHeadcount.value
    })
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

  const actualsDailyRows = computed(() =>
    createPlanningGroupActuals(props.centerDefaults?.actuals).dailyRows
      .filter((row) => Number(row.serviceDate.slice(0, 4)) === planningYear.value)
  )

  const actualsDataMonths = computed(() =>
    buildActualsMonthsFromDailyRows(actualsDailyRows.value, planningYear.value)
  )

  const {
    actualsErlangStatus,
    monthlyOutputsByMonthIndex: actualsIntradayErlangMonthlyOutputsByMonthIndex
  } = usePlannerActualsIntradayErlang({
    requirementMethod,
    planningYear,
    actualDailyRows: actualsDailyRows,
    monthlyRecords: baselineMonthlyRecords,
    operatingWeekdays,
    holidayCalendarId,
    disabledHolidayRuleIds,
    customHolidays,
    operatingOpenTime: intradayErlangOpenTime,
    operatingCloseTime: intradayErlangCloseTime,
    serviceLevelPercent: intradayErlangServiceLevelPercent,
    serviceLevelThresholdSeconds: intradayErlangServiceLevelThresholdSeconds,
    intraday: intradayErlangProfile
  })

  const actualsRecords = computed(() =>
    computeActualsRecords(
      monthlyRecords.value,
      staffingRecords.value,
      actualsDataMonths.value,
      requirementMethod.value === PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
        ? actualsIntradayErlangMonthlyOutputsByMonthIndex.value
        : null
    )
  )

  const generateRecommendedTrainingClasses = () => {
    if (!ensurePlannerEditable()) {
      return
    }

    const recommendations = recommendTrainingClasses({
      monthlyRecords: monthlyRecords.value,
      planningYear: planningYear.value,
      startingHeadcount: startingHeadcount.value,
      startingFrontlineHeadcount: startingFrontlineHeadcount.value,
      staffingMonths: staffingMonths.value,
      trainingClasses: effectiveTrainingClasses.value,
      trainingSettings: trainingSettings.value,
      trainingCalendar: trainingCalendar.value,
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

  const displayPlanLabel = computed(() =>
    String(sourcePlanReference.value?.name || '').trim() || `${planningYear.value} ${planVersionLabel.value}`
  )
  const duplicateYearPlan = computed(() => {
    if (planType.value === PLAN_TYPE_UPDATE) {
      return null
    }

    const targetYear = toNumber(planningYear.value, currentYear)
    const currentPlanId = sourcePlanReference.value?.id || null

    return (props.groupPlans || []).find(
      (plan) =>
        plan?.id !== currentPlanId &&
        plan?.planType !== PLAN_TYPE_UPDATE &&
        toNumber(plan?.planningYear, currentYear) === targetYear
    ) || null
  })
  const duplicateYearMessage = computed(() =>
    duplicateYearPlan.value
      ? `A ${planningYear.value} Budget already exists for ${props.centerDefaults?.groupName || 'this staffing group'}. Open the existing Budget or choose another year.`
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
    id: sourcePlanReference.value?.id || null,
    createdAt: sourcePlanReference.value?.createdAt || null,
    name: String(sourcePlanReference.value?.name || '').trim() || `${planningYear.value} ${planVersionLabel.value}`,
    planType: planType.value,
    isCurrent: planType.value === PLAN_TYPE_UPDATE
      ? true
      : Boolean(sourcePlanReference.value?.isCurrent ?? true),
    budgetPlanId: planType.value === PLAN_TYPE_BUDGET
      ? (sourcePlanReference.value?.budgetPlanId || sourcePlanReference.value?.id || null)
      : (sourcePlanReference.value?.budgetPlanId || sourcePlanReference.value?.sourcePlanId || null),
    sourcePlanId: planType.value === PLAN_TYPE_UPDATE ? (sourcePlanReference.value?.sourcePlanId || '') : '',
    actualsThroughMonth: planType.value === PLAN_TYPE_UPDATE ? (sourcePlanReference.value?.actualsThroughMonth || '') : '',
    actualizedAt: planType.value === PLAN_TYPE_UPDATE ? (sourcePlanReference.value?.actualizedAt || '') : '',
    planningYear: planningYear.value,
    requirementMethod: requirementMethod.value,
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
    serviceLevelPercent: intradayErlangServiceLevelPercent.value,
    serviceLevelThresholdSeconds: intradayErlangServiceLevelThresholdSeconds.value,
    operatingOpenTime: intradayErlangOpenTime.value,
    operatingCloseTime: intradayErlangCloseTime.value,
    intraday: {
      intervalLengthMinutes: intradayErlangProfile.value.intervalLengthMinutes,
      intervalRatios: intradayErlangProfile.value.intervalRatios.map((row) => ({ ...row }))
    },
    demandSource: createPlanDemandSource(demandSource.value),
    trainingSettings: createTrainingSettings(trainingSettings.value),
    nextYearOpening: createNextYearOpening({
      frontlineHeadcount: nextYearOpening.value.frontlineHeadcount
    }),
    startingHeadcount: startingHeadcount.value,
    startingFrontlineHeadcount: startingFrontlineHeadcount.value,
    staffingMonths: staffingMonths.value.map((month) => createStaffingMonth(month)),
    trainingClasses: ownedTrainingClasses.value.map((trainingClass) =>
      persistTrainingClassOutcomes(trainingClass, planningYear.value, trainingSettings.value, trainingCalendar.value)
    ),
    summary: {
      requirementMethod: planSummary.value.requirementMethod,
      annualContacts: planSummary.value.annualContacts,
      annualWorkloadHours: planSummary.value.annualWorkloadHours,
      annualErlangStaffedHours: planSummary.value.annualErlangStaffedHours,
      annualRequiredStaffHours: planSummary.value.annualRequiredStaffHours,
      averageAhtSeconds: planSummary.value.averageAhtSeconds,
      minimumRequiredHeadcount: planSummary.value.minimumRequiredHeadcount,
      averageCoveragePercent: planSummary.value.averageCoveragePercent,
      averageWeightedOccupancyPercent: planSummary.value.averageWeightedOccupancyPercent,
      averageWeightedServiceLevelPercent: planSummary.value.averageWeightedServiceLevelPercent,
      averageRequiredStaffHours: planSummary.value.averageRequiredStaffHours,
      averageRequiredHeadcount: planSummary.value.averageRequiredHeadcount,
      peakRequiredHeadcount: planSummary.value.peakMonth.requiredHeadcount,
      peakMonthLabel: planSummary.value.peakMonth.fullLabel,
      averagePeakRequiredHeadcount: planSummary.value.averagePeakRequiredHeadcount,
      peakDayRequiredHeadcount: planSummary.value.peakDayMonth.peakDayRequiredHeadcount,
      peakDayMonthLabel: planSummary.value.peakDayMonth.fullLabel,
      peakIntervalRequiredHeadcount: planSummary.value.peakIntervalMonth?.peakIntervalRequiredHeadcount ?? null,
      peakIntervalMonthLabel: planSummary.value.peakIntervalMonth?.fullLabel || '',
      averagePeakIntervalRequiredHeadcount: planSummary.value.averagePeakIntervalRequiredHeadcount,
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
      selectedForecastProjectId: selectedForecastProjectId.value,
      selectedMonthIndex: selectedMonthIndex.value,
      reviewedSections: [...reviewedSections.value]
    }
  })

  const hydratePlannerDraft = async () => {
    plannerBootstrapping.value = true

    try {
      if (isReadOnlyBudget.value) {
        restoredDraft.value = null
        validationMessage.value = ''
        return
      }

      if (!savedPlan?.id) {
        restoredDraft.value = null
        validationMessage.value = ''
        return
      }

      if (!resolvedDraftKey.value) {
        restoredDraft.value = null
        validationMessage.value = ''
        return
      }

      restoredDraft.value = await plannerDraftRepository.loadDraft(resolvedDraftKey.value)

      if (restoredDraft.value?.plan || restoredDraft.value?.ui) {
        applyBootstrapState(buildBootstrapState(restoredDraft.value))
      }

      validationMessage.value = ''
    } finally {
      plannerBootstrapping.value = false
    }
  }

  const {
    autosaveState,
    suspendAutosave,
    autosaveStatusMessage,
    queueAutosave,
    flushAutosave,
    completeManualSave
  } = usePlannerAutosave({
    resolvedDraftKey,
    restoredDraft,
    plannerBootstrapping,
    savedPlan,
    buildDraftPayload
  })

  watch(isReadOnlyBudget, (readOnly) => {
    if (readOnly) {
      suspendAutosave.value = true
    }
  }, { immediate: true })

  onMounted(() => {
    void hydratePlannerDraft()
  })

  watch(plannerSeedDefaults, (nextSeedDefaults) => {
    operatingWeekdays.value = [...nextSeedDefaults.operatingWeekdays]
    holidayCalendarId.value = nextSeedDefaults.holidayCalendarId
    disabledHolidayRuleIds.value = [...nextSeedDefaults.disabledHolidayRuleIds]
    customHolidays.value = nextSeedDefaults.customHolidays.map((holiday) => ({ ...holiday }))
    holidayScheduleMode.value = nextSeedDefaults.holidayScheduleMode
  })

  watch(activeSection, (sectionId) => {
    markSectionReviewed(sectionId)
  })

  watch([planningYear, () => props.groupPlans], () => {
    validationMessage.value = ''
  }, { deep: true })

  const validatePlanDetails = () => {
    if (duplicateYearPlan.value) {
      validationMessage.value = duplicateYearMessage.value
      return false
    }

    validationMessage.value = ''
    return true
  }

  const savePlan = async () => {
    if (!ensurePlannerEditable()) {
      return
    }

    if (!validatePlanDetails()) {
      return
    }

    const savedAt = new Date().toISOString()
    await completeManualSave(savedAt)
    emit('save', buildPlanPayload())
  }

  const convertLegacyManualDemandSource = async () => {
    if (!ensurePlannerEditable()) {
      return
    }

    const didConvert = await convertLegacyManualDemandSourceBase()

    if (!didConvert) {
      return
    }

    const savedAt = new Date().toISOString()
    await completeManualSave(savedAt)
    emit('save', buildPlanPayload())
  }

  const cancelEditor = () => {
    if (!isReadOnlyBudget.value) {
      void flushAutosave()
    }
    emit('cancel')
  }

  watch(
    [
      planningYear,
      requirementMethod,
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
      demandSource,
      selectedForecastProjectId,
      trainingSettings,
      nextYearOpening,
      startingHeadcount,
      startingFrontlineHeadcount,
      staffingMonths,
      trainingClasses
    ],
    () => {
      if (plannerBootstrapping.value) {
        return
      }

      if (isReadOnlyBudget.value) {
        return
      }

      if (autosaveState.value === 'restored' || autosaveState.value === 'saved') {
        autosaveState.value = 'idle'
      }

      void queueAutosave()
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

  return {
    planningYear,
    requirementMethod,
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
    demandSource,
    selectedForecastProjectId,
    availableForecastProjects,
    savedForecastProjectCount,
    forecastsLoading,
    forecastsError,
    forecastSelectOptions,
    selectedForecastProject,
    selectedForecastPreviewSummary,
    demandSourceSummary,
    forecastCanApply,
    forecastApplyMessage,
    forecastApplyTone,
    hasLegacyManualDemandSource,
    legacyManualSummary,
    trainingSettings,
    trainingCalendar,
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
    plannerBootstrapping,
    monthlyRecords,
    planType,
    planVersionLabel,
    isReadOnlyBudget,
    readOnlyBudgetMessage,
    displayPlanLabel,
    presenceSummary,
    randomSummary,
    planSummary,
    intradayErlangIntervalOutputs,
    staffingSummary,
    staffingRecords,
    hasNextYearStartingFrontlineTarget,
    actualsRecords,
    actualsSummary,
    intradayErlangServiceLevelPercent,
    intradayErlangServiceLevelThresholdSeconds,
    intradayErlangOpenTime,
    intradayErlangCloseTime,
    intradayErlangProfile,
    erlangStatus: intradayErlangStatus,
    actualsErlangStatus,
    autosaveStatusMessage,
    validationMessage,
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
    applyForecastToDemand,
    convertLegacyManualDemandSource,
    reloadForecastProjects: loadForecastProjects,
    loadExamplePlan,
    resetPlanner,
    generateRecommendedTrainingClasses,
    savePlan,
    cancelEditor
  }
}
