<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import PlannerMonthlyPlanTab from './planner/PlannerMonthlyPlanTab.vue'
import PlannerPresenceTab from './planner/PlannerPresenceTab.vue'
import PlannerRandomTab from './planner/PlannerRandomTab.vue'
import PlannerSettingsModal from './planner/PlannerSettingsModal.vue'
import PlannerStaffingPlanTab from './planner/PlannerStaffingPlanTab.vue'
import { buildPlannerDraftKey, clearPlannerDraft, loadPlannerDraft, persistPlannerDraft } from '../plannerDraftStorage'
import {
  MONTH_LABELS,
  buildPlanMonths,
  buildPresenceMonths,
  buildRandomMonths,
  buildStaffingMonths,
  buildTrainingClasses,
  calculateCalendarOpenDays,
  clamp,
  collectPlannerWarnings,
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

const props = defineProps({
  initialPlan: {
    type: Object,
    default: null
  },
  centerDefaults: {
    type: Object,
    default: null
  },
  draftKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['save', 'cancel'])

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]
const TABS = [
  {
    id: 'presence',
    title: 'Presence / Utilization'
  },
  {
    id: 'random',
    title: 'Random'
  },
  {
    id: 'plan',
    title: 'Headcount Requirement'
  }
]
const MODES = [
  { id: 'plan', title: 'Demand Model' },
  { id: 'staffing', title: 'Staffing Plan' }
]

const currentYear = new Date().getFullYear()
const currentMonthIndex = new Date().getMonth()
const yearOptions = Array.from({ length: 8 }, (_, index) => currentYear - 2 + index)
const autosaveTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
})

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const formatPercent = (value, digits = 1) => `${formatNumber(value, digits)}%`
const formatFactor = (value, digits = 2) => `${formatNumber(value, digits)}x`

const hydrateMonths = (months, fallbackBuilder, factory) =>
  Array.isArray(months) && months.length === MONTH_LABELS.length
    ? months.map((month) => factory(month))
    : fallbackBuilder()

const savedPlan = props.initialPlan || null
const isNewPlan = !savedPlan
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
const normalizedInitialMode = initialUi.activeMode === 'staffing' ? 'staffing' : 'plan'

const planName = ref(initialPlan.name?.trim() || '')
const planningYear = ref(toNumber(initialPlan.planningYear, currentYear))
const activeMode = ref(normalizedInitialMode)
const activeTab = ref(initialUi.activeTab || 'presence')
const selectedMonthIndex = ref(clamp(toNumber(initialUi.selectedMonthIndex, currentMonthIndex), 0, MONTH_LABELS.length - 1))
const settingsOpen = ref(savedPlan ? initialUi.settingsOpen ?? false : true)
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
const settingsStatusMessage = ref('')
const settingsStatusTone = ref('success')

let autosaveTimer = null

const createPresenceMonthFromProfile = ({
  year,
  monthIndex,
  weekdays,
  dayAdjustment = 0,
  paidHoursPerDay = 8,
  plannedTimeOffPercent = 0,
  unplannedTimeOffPercent = 0,
  leaveTimePercent = 0,
  meetingsPercent = 0,
  trainingPercent = 0,
  coachingPercent = 0,
  paidBreaksHoursPerDay = 0.5,
  otherAwayHoursPerDay = 0.1
}) => {
  const openDays = Math.max(calculateCalendarOpenDays(year, monthIndex, weekdays) + dayAdjustment, 0)
  const paidHoursPerMonth = openDays * paidHoursPerDay
  const convertPercentToHours = (percent) => Number(((paidHoursPerMonth * percent) / 100).toFixed(1))

  return createPresenceMonth({
    dayAdjustment,
    paidHoursPerDay,
    plannedTimeOffHours: convertPercentToHours(plannedTimeOffPercent),
    unplannedTimeOffHours: convertPercentToHours(unplannedTimeOffPercent),
    leaveTimeHours: convertPercentToHours(leaveTimePercent),
    meetingsHours: convertPercentToHours(meetingsPercent),
    trainingHours: convertPercentToHours(trainingPercent),
    coachingHours: convertPercentToHours(coachingPercent),
    paidBreaksHoursPerDay,
    otherAwayHoursPerDay
  })
}

const setActiveTab = (tabId) => {
  activeTab.value = tabId
}

const moveTab = (direction) => {
  const currentIndex = TABS.findIndex((tab) => tab.id === activeTab.value)
  const nextIndex = clamp(currentIndex + direction, 0, TABS.length - 1)
  activeTab.value = TABS[nextIndex].id
}

const clonePresenceMonth = (monthIndex) => ({ ...presenceMonths.value[monthIndex] })

const copyPresenceMonthToAll = (monthIndex) => {
  const source = clonePresenceMonth(monthIndex)
  presenceMonths.value = MONTH_LABELS.map(() => ({ ...source }))
}

const copyPresenceMonthForward = (monthIndex) => {
  const source = clonePresenceMonth(monthIndex)
  presenceMonths.value = presenceMonths.value.map((month, index) =>
    index >= monthIndex ? { ...source } : month
  )
}

const copyPresenceQuarterForward = (monthIndex) => {
  const source = clonePresenceMonth(monthIndex)
  const quarterStart = Math.floor(monthIndex / 3) * 3
  const quarterEnd = Math.min(quarterStart + 3, MONTH_LABELS.length)

  presenceMonths.value = presenceMonths.value.map((month, index) =>
    index >= monthIndex && index < quarterEnd ? { ...source } : month
  )
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

const cloneRandomMonth = (monthIndex) => ({ ...randomMonths.value[monthIndex] })

const copyRandomMonthToAll = (monthIndex) => {
  const source = cloneRandomMonth(monthIndex)
  randomMonths.value = MONTH_LABELS.map(() => ({ ...source }))
}

const copyRandomMonthForward = (monthIndex) => {
  const source = cloneRandomMonth(monthIndex)
  randomMonths.value = randomMonths.value.map((month, index) =>
    index >= monthIndex ? { ...source } : month
  )
}

const copyRandomQuarterForward = (monthIndex) => {
  const source = cloneRandomMonth(monthIndex)
  const quarterStart = Math.floor(monthIndex / 3) * 3
  const quarterEnd = Math.min(quarterStart + 3, MONTH_LABELS.length)

  randomMonths.value = randomMonths.value.map((month, index) =>
    index >= monthIndex && index < quarterEnd ? { ...source } : month
  )
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
  planningYear.value = currentYear + 1
  operatingWeekdays.value = [1, 2, 3, 4, 5]

  presenceMonths.value = [
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 0, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 7, unplannedTimeOffPercent: 3.2, leaveTimePercent: 0.8, meetingsPercent: 1.8, trainingPercent: 1.2, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 1, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 7, unplannedTimeOffPercent: 3.2, leaveTimePercent: 0.8, meetingsPercent: 1.8, trainingPercent: 1.2, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 2, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 8, unplannedTimeOffPercent: 3.4, leaveTimePercent: 0.9, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 3, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 8, unplannedTimeOffPercent: 3.4, leaveTimePercent: 0.9, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 4, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 9.5, unplannedTimeOffPercent: 3.6, leaveTimePercent: 1, meetingsPercent: 2, trainingPercent: 1.4, coachingPercent: 1.3, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.15 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 5, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 10, unplannedTimeOffPercent: 3.8, leaveTimePercent: 1, meetingsPercent: 2, trainingPercent: 1.5, coachingPercent: 1.3, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.15 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 6, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 12, unplannedTimeOffPercent: 4, leaveTimePercent: 1.2, meetingsPercent: 1.8, trainingPercent: 1.1, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.18 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 7, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 12, unplannedTimeOffPercent: 4, leaveTimePercent: 1.2, meetingsPercent: 1.8, trainingPercent: 1.1, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.18 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 8, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 9.5, unplannedTimeOffPercent: 3.6, leaveTimePercent: 1, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.14 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 9, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 8.8, unplannedTimeOffPercent: 3.5, leaveTimePercent: 0.9, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.14 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 10, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 9.5, unplannedTimeOffPercent: 3.7, leaveTimePercent: 1.1, meetingsPercent: 2, trainingPercent: 1.4, coachingPercent: 1.3, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.16 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 11, weekdays: [1, 2, 3, 4, 5], plannedTimeOffPercent: 11.5, unplannedTimeOffPercent: 4.2, leaveTimePercent: 1.3, meetingsPercent: 2.2, trainingPercent: 1.5, coachingPercent: 1.4, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.2 })
  ]

  randomDefaults.value = createRandomMonth({ occupancyPercent: 90, adherencePercent: 95 })
  useMonthlyRandomOverrides.value = false
  syncRandomMonthsToDefaults()

  const exampleContacts = [44000, 42500, 44800, 46200, 47800, 49900, 53100, 54800, 50500, 48200, 47100, 52800]
  const exampleAht = [315, 312, 310, 305, 302, 300, 298, 300, 304, 308, 312, 320]

  planMonths.value = MONTH_LABELS.map((_, index) =>
    createPlanMonth({
      contacts: exampleContacts[index],
      ahtSeconds: exampleAht[index]
    })
  )
  startingHeadcount.value = 52
  startingFrontlineHeadcount.value = 52
  trainingSettings.value = createTrainingSettings({
    trainingDurationWorkdays: 20,
    graduationYieldPercent: 85,
    availableTrainers: 2,
    maxClassSize: 12,
    postTrainingNestingDays: 5
  })
  staffingMonths.value = MONTH_LABELS.map((_, index) =>
    createStaffingMonth({
      frontlineAttritionHeadcount: [1.3, 1.3, 1.5, 1.5, 1.7, 1.7, 1.9, 1.9, 1.7, 1.7, 1.5, 1.5][index]
    })
  )
  trainingClasses.value = [
    createTrainingClass({
      id: 'class-spring',
      hireDate: `${currentYear + 1}-02-10`,
      hireCount: 8
    }),
    createTrainingClass({
      id: 'class-summer',
      hireDate: `${currentYear + 1}-06-09`,
      hireCount: 10
    }),
    createTrainingClass({
      id: 'class-fall',
      hireDate: `${currentYear + 1}-09-08`,
      hireCount: 9
    })
  ]
  activeMode.value = 'plan'
  activeTab.value = 'presence'
  selectedMonthIndex.value = 0
  settingsStatusTone.value = 'success'
  settingsStatusMessage.value = planName.value.trim()
    ? 'Sample data loaded.'
    : 'Sample data loaded. Add a plan name to continue.'
}

const resetPlanner = () => {
  planName.value = ''
  planningYear.value = currentYear
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
  activeMode.value = 'plan'
  activeTab.value = 'presence'
  selectedMonthIndex.value = currentMonthIndex
  settingsOpen.value = true
  settingsStatusTone.value = 'success'
  settingsStatusMessage.value = ''
}

const openSettings = () => {
  settingsOpen.value = true
}

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

const cancelSettings = () => {
  if (isNewPlan) {
    suspendAutosave.value = true
    removeDraft()
    emit('cancel')
    return
  }

  settingsOpen.value = false
  settingsStatusMessage.value = ''
  settingsStatusTone.value = 'success'
}

const closeSettings = () => {
  if (!planName.value.trim()) {
    settingsStatusTone.value = 'error'
    settingsStatusMessage.value = 'Plan name is required before you can continue.'
    settingsOpen.value = true
    return
  }

  settingsOpen.value = false
  settingsStatusMessage.value = ''
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

const operatingWeekdayLabel = computed(() => {
  if (!operatingWeekdays.value.length) {
    return 'No days selected'
  }

  return operatingWeekdays.value
    .map((value) => WEEKDAY_OPTIONS.find((option) => option.value === value)?.label)
    .join(', ')
})

const displayPlanName = computed(() => planName.value.trim() || 'New staffing plan')

const presenceSummary = computed(() => summarizePresenceRecords(monthlyRecords.value))

const randomSummary = computed(() =>
  summarizeRandomRecords(monthlyRecords.value, randomDefaults.value, useMonthlyRandomOverrides.value)
)

const planSummary = computed(() => summarizePlanRecords(monthlyRecords.value))
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

const staffingSummary = computed(() => summarizeStaffingRecords(staffingRecords.value))

const buildPlanPayload = () => ({
  id: savedPlan?.id || initialPlan.id || null,
  createdAt: savedPlan?.createdAt || initialPlan.createdAt || null,
  name: planName.value.trim(),
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
    activeMode: activeMode.value,
    activeTab: activeTab.value,
    selectedMonthIndex: selectedMonthIndex.value,
    settingsOpen: settingsOpen.value
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

const savePlan = () => {
  if (!planName.value.trim()) {
    settingsOpen.value = true
    settingsStatusTone.value = 'error'
    settingsStatusMessage.value = 'Plan name is required before you can save this plan.'
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

const planWarnings = computed(() => collectPlannerWarnings(monthlyRecords.value))
const plannerWarnings = computed(() => {
  if (activeMode.value === 'staffing') {
    return []
  }

  return planWarnings.value
})

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

const autosaveStatusClass = computed(() => ({
  saving: autosaveState.value === 'saving',
  restored: autosaveState.value === 'restored'
}))

const canCloseSettings = computed(() => Boolean(planName.value.trim()))
const allowSettingsBackdropClose = computed(() => !isNewPlan && canCloseSettings.value)

watch(
  [
    planName,
    planningYear,
    activeMode,
    activeTab,
    selectedMonthIndex,
    settingsOpen,
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

watch(planName, (value) => {
  if (value.trim() && settingsStatusTone.value === 'error') {
    settingsStatusMessage.value = ''
    settingsStatusTone.value = 'success'
  }
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
</script>

<template>
  <section id="monthly-plan" class="calculator-section">
    <div class="container">
      <div class="calculator-card monthly-flow-card">
        <div class="monthly-flow-shell">
          <section class="input-group-card monthly-settings-bar">
            <div class="monthly-settings-summary">
              <div class="monthly-settings-primary">
                <p class="pane-kicker">Plan Settings</p>
                <h3>{{ displayPlanName }}</h3>
                <p>{{ planningYear }} plan using {{ operatingWeekdayLabel }} as the operating day pattern.</p>
              </div>

              <div class="monthly-settings-stats">
                <span>
                  <strong>Year</strong>
                  <em>{{ planningYear }}</em>
                </span>
                <span>
                  <strong>Operating Days</strong>
                  <em>{{ operatingWeekdayLabel }}</em>
                </span>
              </div>

              <div class="monthly-settings-actions-wrap">
                <div class="monthly-settings-actions">
                  <button type="button" class="secondary-btn" @click="openSettings">Edit Settings</button>
                  <button type="button" class="submit-btn" @click="savePlan">Save Plan</button>
                  <button type="button" class="secondary-btn" @click="cancelEditor">Back to Plans</button>
                </div>
                <p class="monthly-settings-autosave" :class="autosaveStatusClass">{{ autosaveStatusMessage }}</p>
              </div>
            </div>

            <p v-if="plannerWarnings.length" class="status-message error monthly-global-warning">
              {{ plannerWarnings.length }} monthly warning{{ plannerWarnings.length === 1 ? '' : 's' }} detected.
              {{ 'Review the plan for missing or invalid monthly inputs before finalizing headcount.' }}
            </p>
          </section>

          <PlannerSettingsModal
            v-if="settingsOpen"
            v-model:plan-name="planName"
            v-model:planning-year="planningYear"
            :can-close="canCloseSettings"
            :allow-backdrop-close="allowSettingsBackdropClose"
            :status-message="settingsStatusMessage"
            :status-tone="settingsStatusTone"
            :year-options="yearOptions"
            @cancel="cancelSettings"
            @close="closeSettings"
            @load-example="loadExamplePlan"
            @reset="resetPlanner"
          />

          <nav class="monthly-mode-strip" aria-label="Planner mode">
            <button
              v-for="mode in MODES"
              :key="mode.id"
              type="button"
              class="monthly-mode-btn"
              :class="{ active: activeMode === mode.id }"
              @click="activeMode = mode.id"
            >
              <strong>{{ mode.title }}</strong>
            </button>
          </nav>

          <nav
            v-if="activeMode !== 'staffing'"
            class="monthly-tab-strip"
            aria-label="Monthly planner sections"
          >
            <button
              v-for="tab in TABS"
              :key="tab.id"
              type="button"
              class="monthly-tab-btn"
              :class="{ active: activeTab === tab.id }"
              @click="setActiveTab(tab.id)"
            >
              <strong>{{ tab.title }}</strong>
            </button>
          </nav>

          <PlannerStaffingPlanTab
            v-if="activeMode === 'staffing'"
            :planning-year="planningYear"
            v-model:starting-headcount="startingHeadcount"
            v-model:starting-frontline-headcount="startingFrontlineHeadcount"
            v-model:training-settings="trainingSettings"
            v-model:staffing-months="staffingMonths"
            v-model:training-classes="trainingClasses"
            v-model:selected-month-index="selectedMonthIndex"
            :staffing-records="staffingRecords"
            :format-number="formatNumber"
            @recommend-classes="generateRecommendedTrainingClasses"
            @save="savePlan"
          />

          <PlannerPresenceTab
            v-else-if="activeTab === 'presence'"
            :mode="activeMode"
            v-model:presence-months="presenceMonths"
            v-model:selected-month-index="selectedMonthIndex"
            :monthly-records="monthlyRecords"
            :summary="presenceSummary"
            :format-whole="formatWhole"
            :format-number="formatNumber"
            :format-percent="formatPercent"
            @copy-action="handlePresenceCopyAction"
            @continue="moveTab(1)"
          />

          <PlannerRandomTab
            v-else-if="activeTab === 'random'"
            :mode="activeMode"
            v-model:random-defaults="randomDefaults"
            v-model:use-monthly-random-overrides="useMonthlyRandomOverrides"
            v-model:random-months="randomMonths"
            v-model:selected-month-index="selectedMonthIndex"
            :monthly-records="monthlyRecords"
            :summary="randomSummary"
            :format-percent="formatPercent"
            @copy-action="handleRandomCopyAction"
            @previous="moveTab(-1)"
            @continue="moveTab(1)"
            @toggle-override-mode="setRandomOverrideMode"
          />

          <PlannerMonthlyPlanTab
            v-else
            :mode="activeMode"
            v-model:plan-months="planMonths"
            v-model:selected-month-index="selectedMonthIndex"
            :monthly-records="monthlyRecords"
            :plan-summary="planSummary"
            :monthly-chart-max="monthlyChartMax"
            :format-whole="formatWhole"
            :format-number="formatNumber"
            :format-percent="formatPercent"
            :format-factor="formatFactor"
            @previous="moveTab(-1)"
            @save="savePlan"
          />
        </div>
      </div>
    </div>
  </section>
</template>
