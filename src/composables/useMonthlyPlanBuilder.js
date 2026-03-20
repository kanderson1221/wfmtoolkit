import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { buildPlannerDraftKey, clearPlannerDraft, loadPlannerDraft, persistPlannerDraft } from '../plannerDraftStorage'
import {
  MONTH_LABELS,
  buildPlanMonths,
  buildPresenceMonths,
  buildRandomMonths,
  buildStaffingMonths,
  buildTrainingClasses,
  clamp,
  computeMonthlyRecords,
  computeStaffingRecords,
  deriveStartingFrontlineHeadcount,
  createPlanMonth,
  createPresenceMonth,
  createRandomMonth,
  createStaffingMonth,
  createTrainingClass,
  createTrainingSettings,
  getMonthlyChartMax,
  normalizeWeekdays,
  recommendTrainingClasses,
  summarizePlanRecords,
  summarizePresenceRecords,
  summarizeRandomRecords,
  summarizeStaffingRecords,
  toNumber
} from '../plannerModel'
import { copyMonthForward, copyMonthToAll, copyQuarterForward } from './monthlyPlanBuilder/copyActions'
import { buildExamplePlannerState } from './monthlyPlanBuilder/examplePlan'
import {
  WEEKDAY_OPTIONS,
  autosaveTimeFormatter,
  currentMonthIndex,
  currentYear,
  formatFactor,
  formatNumber,
  formatPercent,
  formatWhole,
  hydrateMonths,
  yearOptions
} from './monthlyPlanBuilder/shared'

export const useMonthlyPlanBuilder = (props, emit) => {
  const savedPlan = props.initialPlan || null
  const prefilledYear = props.prefilledYear == null || props.prefilledYear === ''
    ? NaN
    : toNumber(props.prefilledYear, NaN)
  const hasPrefilledYear = Number.isFinite(prefilledYear)
  const draftKey = buildPlannerDraftKey(props.draftKey || savedPlan?.id)
  const restoredDraft = loadPlannerDraft(draftKey)
  const initialPlan = restoredDraft?.plan || savedPlan || props.centerDefaults || {}
  const initialUi = restoredDraft?.ui || {}
  const centerOperatingWeekdays = normalizeWeekdays(props.centerDefaults?.operatingWeekdays)
  const centerPaidHoursPerDay = toNumber(props.centerDefaults?.presenceMonths?.[0]?.paidHoursPerDay, 8)
  const centerRandomDefaults = createRandomMonth(props.centerDefaults?.randomDefaults || {})
  const initialStartingHeadcount = Math.max(toNumber(initialPlan.startingHeadcount, 0), 0)
  const hydratedTrainingClasses = Array.isArray(initialPlan.trainingClasses)
    ? initialPlan.trainingClasses.map((trainingClass) => createTrainingClass(trainingClass))
    : buildTrainingClasses()
  const legacyInitialTab = initialUi.activeTab === 'random' || initialUi.activeTab === 'plan'
    ? initialUi.activeTab
    : 'presence'
  const normalizedInitialSection = (() => {
    if (initialUi.activeSection === 'forecast' || initialUi.activeSection === 'staffing' || initialUi.activeSection === 'budget' || initialUi.activeSection === 'review') {
      return initialUi.activeSection
    }

    if (initialUi.activeSection === 'overview') {
      return 'overview'
    }

    if (initialUi.activeMode === 'staffing') {
      return 'staffing'
    }

    return 'overview'
  })()
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

  const initialPlanningYear = toNumber(initialPlan.planningYear, hasPrefilledYear ? prefilledYear : currentYear)
  const planningYear = ref(initialPlanningYear)
  const selectedPlanningYear = ref(initialPlanningYear)
  const activeSection = ref(normalizedInitialSection)
  const activeForecastStep = ref(normalizedInitialForecastStep)
  const selectedMonthIndex = ref(clamp(toNumber(initialUi.selectedMonthIndex, currentMonthIndex), 0, MONTH_LABELS.length - 1))
  const operatingWeekdays = ref(normalizeWeekdays(initialPlan.operatingWeekdays))
  const presenceMonths = ref(hydrateMonths(initialPlan.presenceMonths, buildPresenceMonths, createPresenceMonth))
  const randomDefaults = ref(createRandomMonth(initialPlan.randomDefaults || {}))
  const useMonthlyRandomOverrides = ref(Boolean(initialPlan.useMonthlyRandomOverrides))
  const randomMonths = ref(hydrateMonths(initialPlan.randomMonths, buildRandomMonths, createRandomMonth))
  const planMonths = ref(hydrateMonths(initialPlan.planMonths, buildPlanMonths, createPlanMonth))
  const trainingSettings = ref(createTrainingSettings(initialPlan.trainingSettings || {}))
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
  const autosaveState = ref(restoredDraft ? 'restored' : 'idle')
  const lastAutosavedAt = ref(restoredDraft?.autosavedAt || null)
  const autosaveReady = ref(false)
  const suspendAutosave = ref(false)

  let autosaveTimer = null

  const setActiveSection = (sectionId) => {
    activeSection.value = sectionId
  }

  const setActiveForecastStep = (stepId) => {
    activeSection.value = 'forecast'
    activeForecastStep.value = stepId
  }

  const moveForecastStep = (direction) => {
    const steps = ['availability', 'variability', 'requirement']
    const currentIndex = steps.indexOf(activeForecastStep.value)
    const nextIndex = clamp(currentIndex + direction, 0, steps.length - 1)

    activeSection.value = 'forecast'
    activeForecastStep.value = steps[nextIndex]
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

  const handlePresenceCopyAction = (action) => {
    if (action === 'all') {
      copyPresenceMonthToAll(selectedMonthIndex.value)
    } else if (action === 'forward') {
      copyPresenceMonthForward(selectedMonthIndex.value)
    } else if (action === 'quarter') {
      copyPresenceQuarterForward(selectedMonthIndex.value)
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

  const handleRandomCopyAction = (action) => {
    if (action === 'all') {
      copyRandomMonthToAll(selectedMonthIndex.value)
    } else if (action === 'forward') {
      copyRandomMonthForward(selectedMonthIndex.value)
    } else if (action === 'quarter') {
      copyRandomQuarterForward(selectedMonthIndex.value)
    }
  }

  const loadExamplePlan = () => {
    const examplePlan = buildExamplePlannerState(currentYear + 1)

    planningYear.value = currentYear + 1
    selectedPlanningYear.value = currentYear + 1
    operatingWeekdays.value = examplePlan.operatingWeekdays
    presenceMonths.value = examplePlan.presenceMonths
    randomDefaults.value = examplePlan.randomDefaults
    useMonthlyRandomOverrides.value = false
    randomMonths.value = examplePlan.randomMonths
    planMonths.value = examplePlan.planMonths
    startingHeadcount.value = examplePlan.startingHeadcount
    startingFrontlineHeadcount.value = examplePlan.startingFrontlineHeadcount
    trainingSettings.value = examplePlan.trainingSettings
    staffingMonths.value = examplePlan.staffingMonths
    trainingClasses.value = examplePlan.trainingClasses
    activeSection.value = 'overview'
    activeForecastStep.value = 'availability'
    selectedMonthIndex.value = 0
  }

  const resetPlanner = () => {
    planningYear.value = currentYear
    selectedPlanningYear.value = currentYear
    operatingWeekdays.value = centerOperatingWeekdays
    presenceMonths.value = MONTH_LABELS.map(() =>
      createPresenceMonth({
        paidHoursPerDay: centerPaidHoursPerDay
      })
    )
    randomDefaults.value = createRandomMonth(centerRandomDefaults)
    useMonthlyRandomOverrides.value = false
    randomMonths.value = MONTH_LABELS.map(() => createRandomMonth(centerRandomDefaults))
    planMonths.value = buildPlanMonths()
    trainingSettings.value = createTrainingSettings()
    startingHeadcount.value = 0
    startingFrontlineHeadcount.value = 0
    staffingMonths.value = buildStaffingMonths()
    trainingClasses.value = buildTrainingClasses()
    activeSection.value = 'overview'
    activeForecastStep.value = 'availability'
    selectedMonthIndex.value = currentMonthIndex
  }

  const monthlyRecords = computed(() =>
    computeMonthlyRecords({
      planningYear: planningYear.value,
      operatingWeekdays: operatingWeekdays.value,
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
      trainingClasses.value,
      trainingSettings.value
    )
  )

  const generateRecommendedTrainingClasses = () => {
    const recommendations = recommendTrainingClasses({
      monthlyRecords: monthlyRecords.value,
      planningYear: planningYear.value,
      startingHeadcount: startingHeadcount.value,
      startingFrontlineHeadcount: startingFrontlineHeadcount.value,
      staffingMonths: staffingMonths.value,
      trainingClasses: trainingClasses.value,
      trainingSettings: trainingSettings.value
    })

    trainingClasses.value = [
      ...trainingClasses.value.filter((trainingClass) => createTrainingClass(trainingClass).source !== 'recommended'),
      ...recommendations
    ]
  }

  const operatingWeekdayLabel = computed(() => {
    if (!operatingWeekdays.value.length) {
      return 'No days selected'
    }

    return operatingWeekdays.value
      .map((value) => WEEKDAY_OPTIONS.find((option) => option.value === value)?.label)
      .join(', ')
  })

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

  const buildPlanPayload = () => ({
    id: savedPlan?.id || initialPlan.id || null,
    createdAt: savedPlan?.createdAt || initialPlan.createdAt || null,
    name: `${planningYear.value} Plan`,
    planningYear: planningYear.value,
    operatingWeekdays: [...operatingWeekdays.value],
    presenceMonths: presenceMonths.value.map((month) => createPresenceMonth(month)),
    randomDefaults: createRandomMonth(randomDefaults.value),
    useMonthlyRandomOverrides: useMonthlyRandomOverrides.value,
    randomMonths: randomMonths.value.map((month) => createRandomMonth(month)),
    planMonths: planMonths.value.map((month) => createPlanMonth(month)),
    trainingSettings: createTrainingSettings(trainingSettings.value),
    startingHeadcount: startingHeadcount.value,
    startingFrontlineHeadcount: startingFrontlineHeadcount.value,
    staffingMonths: staffingMonths.value.map((month) => createStaffingMonth(month)),
    trainingClasses: trainingClasses.value.map((trainingClass) => createTrainingClass(trainingClass)),
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
        activeForecastStep.value === 'variability'
          ? 'random'
          : activeForecastStep.value === 'requirement'
            ? 'plan'
            : 'presence',
      selectedMonthIndex: selectedMonthIndex.value
    }
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

    const nextDraft = persistPlannerDraft(draftKey, buildDraftPayload())
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
    clearPlannerDraft(draftKey)
    lastAutosavedAt.value = null
    autosaveState.value = 'idle'
  }

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

    suspendAutosave.value = true
    removeDraft()
    emit('save', buildPlanPayload())
  }

  const cancelEditor = () => {
    flushAutosave()
    emit('cancel')
  }

  const monthlyChartMax = computed(() => getMonthlyChartMax(monthlyRecords.value))

  const autosaveStatusMessage = computed(() => {
    if (autosaveState.value === 'saving') {
      return 'Autosaving draft...'
    }

    if (lastAutosavedAt.value) {
      const formattedTime = autosaveTimeFormatter.format(new Date(lastAutosavedAt.value))
      return autosaveState.value === 'restored'
        ? `Draft restored from ${formattedTime}`
        : `Autosaved ${formattedTime}`
    }

    return 'Autosave ready'
  })
  const planningYearOptions = computed(() => {
    const yearSet = new Set(yearOptions)
    yearSet.add(Number(planningYear.value) || currentYear)
    yearSet.add(Number(selectedPlanningYear.value) || currentYear)

    ;(props.groupPlans || []).forEach((plan) => {
      const planYear = Number(plan?.planningYear)
      if (Number.isFinite(planYear)) {
        yearSet.add(planYear)
      }
    })

    return [...yearSet]
      .sort((left, right) => right - left)
      .map((year) => ({
        label: String(year),
        value: year
      }))
  })
  const selectedPlanningYearPlan = computed(() =>
    (props.groupPlans || []).find((plan) => Number(plan?.planningYear) === Number(selectedPlanningYear.value)) || null
  )
  const yearSwitchHref = computed(() => {
    if (!props.centerDefaults?.centerId || !props.centerDefaults?.groupId) {
      return ''
    }

    if (Number(selectedPlanningYear.value) === Number(planningYear.value)) {
      return ''
    }

    return selectedPlanningYearPlan.value
      ? `#planning/center/${props.centerDefaults.centerId}/group/${props.centerDefaults.groupId}/plan/${selectedPlanningYearPlan.value.id}`
      : `#planning/center/${props.centerDefaults.centerId}/group/${props.centerDefaults.groupId}/plan/new/year/${selectedPlanningYear.value}`
  })
  const yearSwitchLabel = computed(() => {
    if (!yearSwitchHref.value) {
      return ''
    }

    return selectedPlanningYearPlan.value
      ? `Open ${selectedPlanningYear.value} Plan`
      : `Create ${selectedPlanningYear.value} Plan`
  })
  const yearSwitchVariant = computed(() => (selectedPlanningYearPlan.value ? 'secondary' : 'primary'))

  watch(
    [
      planningYear,
      selectedPlanningYear,
      activeSection,
      activeForecastStep,
      selectedMonthIndex,
      operatingWeekdays,
      presenceMonths,
      randomDefaults,
      useMonthlyRandomOverrides,
      randomMonths,
      planMonths,
      trainingSettings,
      startingHeadcount,
      startingFrontlineHeadcount,
      staffingMonths,
      trainingClasses
    ],
    () => {
      if (autosaveState.value === 'restored') {
        autosaveState.value = 'idle'
      }

      queueAutosave()
    },
    { deep: true }
  )

  watch(planningYear, () => {
    selectedPlanningYear.value = planningYear.value
  })

  watch(startingHeadcount, (value) => {
    if (startingFrontlineHeadcount.value > value) {
      startingFrontlineHeadcount.value = value
    }
  })

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
    planningYearOptions,
    planningYear,
    selectedPlanningYear,
    activeSection,
    activeForecastStep,
    selectedMonthIndex,
    presenceMonths,
    randomDefaults,
    useMonthlyRandomOverrides,
    randomMonths,
    planMonths,
    trainingSettings,
    startingHeadcount,
    startingFrontlineHeadcount,
    staffingMonths,
    trainingClasses,
    autosaveState,
    monthlyRecords,
    operatingWeekdayLabel,
    displayPlanLabel,
    yearSwitchHref,
    yearSwitchLabel,
    yearSwitchVariant,
    presenceSummary,
    randomSummary,
    planSummary,
    staffingSummary,
    staffingRecords,
    monthlyChartMax,
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
