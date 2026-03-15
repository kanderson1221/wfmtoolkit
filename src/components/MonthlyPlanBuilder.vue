<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import PlannerMonthlyPlanTab from './planner/PlannerMonthlyPlanTab.vue'
import PlannerPresenceTab from './planner/PlannerPresenceTab.vue'
import PlannerRandomTab from './planner/PlannerRandomTab.vue'
import PlannerSettingsModal from './planner/PlannerSettingsModal.vue'
import { buildPlannerDraftKey, clearPlannerDraft, loadPlannerDraft, persistPlannerDraft } from '../plannerDraftStorage'

const props = defineProps({
  initialPlan: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]
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
    title: 'Monthly Plan'
  }
]

const currentYear = new Date().getFullYear()
const currentMonthIndex = new Date().getMonth()
const yearOptions = Array.from({ length: 8 }, (_, index) => currentYear - 2 + index)
const autosaveTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
})

const createPresenceMonth = (overrides = {}) => ({
  dayAdjustment: 0,
  paidHoursPerDay: 8,
  plannedTimeOffHours: 18,
  unplannedTimeOffHours: 6,
  leaveTimeHours: 2,
  meetingsHours: 4,
  trainingHours: 3,
  coachingHours: 1.5,
  paidBreaksHoursPerDay: 0.5,
  otherAwayHoursPerDay: 0.1,
  ...overrides
})

const createRandomMonth = (overrides = {}) => ({
  occupancyPercent: 90,
  adherencePercent: 95,
  ...overrides
})

const createPlanMonth = (overrides = {}) => ({
  contacts: '',
  ahtSeconds: 300,
  ...overrides
})

const buildPresenceMonths = () => MONTH_LABELS.map(() => createPresenceMonth())
const buildRandomMonths = () => MONTH_LABELS.map(() => createRandomMonth())
const buildPlanMonths = () => MONTH_LABELS.map(() => createPlanMonth())

const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const average = (values) => {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

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

const normalizeWeekdays = (weekdays) =>
  Array.isArray(weekdays) && weekdays.length
    ? [...new Set(weekdays.map((value) => toNumber(value, 0)))].sort((left, right) => left - right)
    : [1, 2, 3, 4, 5]

const hydrateMonths = (months, fallbackBuilder, factory) =>
  Array.isArray(months) && months.length === MONTH_LABELS.length
    ? months.map((month) => factory(month))
    : fallbackBuilder()

const savedPlan = props.initialPlan || null
const draftKey = buildPlannerDraftKey(savedPlan?.id)
const restoredDraft = loadPlannerDraft(draftKey)
const initialPlan = restoredDraft?.plan || savedPlan || {}
const initialUi = restoredDraft?.ui || {}

const planName = ref(initialPlan.name?.trim() || `${toNumber(initialPlan.planningYear, currentYear)} Staffing Plan`)
const planningYear = ref(toNumber(initialPlan.planningYear, currentYear))
const activeTab = ref(initialUi.activeTab || 'presence')
const selectedMonthIndex = ref(clamp(toNumber(initialUi.selectedMonthIndex, currentMonthIndex), 0, MONTH_LABELS.length - 1))
const settingsOpen = ref(initialUi.settingsOpen ?? !savedPlan)
const operatingWeekdays = ref(normalizeWeekdays(initialPlan.operatingWeekdays))
const presenceMonths = ref(hydrateMonths(initialPlan.presenceMonths, buildPresenceMonths, createPresenceMonth))
const randomDefaults = ref(createRandomMonth(initialPlan.randomDefaults || {}))
const useMonthlyRandomOverrides = ref(Boolean(initialPlan.useMonthlyRandomOverrides))
const randomMonths = ref(hydrateMonths(initialPlan.randomMonths, buildRandomMonths, createRandomMonth))
const planMonths = ref(hydrateMonths(initialPlan.planMonths, buildPlanMonths, createPlanMonth))
const autosaveState = ref(restoredDraft ? 'restored' : 'idle')
const lastAutosavedAt = ref(restoredDraft?.autosavedAt || null)
const autosaveReady = ref(false)
const suspendAutosave = ref(false)

let autosaveTimer = null

const calculateCalendarOpenDays = (year, monthIndex, activeDays) => {
  if (!activeDays.length) {
    return 0
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  let openDays = 0

  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(year, monthIndex, day).getDay()
    if (activeDays.includes(weekday)) {
      openDays += 1
    }
  }

  return openDays
}

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

const toggleWeekday = (weekdayValue) => {
  if (operatingWeekdays.value.includes(weekdayValue)) {
    operatingWeekdays.value = operatingWeekdays.value.filter((value) => value !== weekdayValue)
    return
  }

  operatingWeekdays.value = [...operatingWeekdays.value, weekdayValue].sort((left, right) => left - right)
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
  planName.value = `${currentYear + 1} Example Staffing Plan`
  planningYear.value = currentYear + 1
  operatingWeekdays.value = [1, 2, 3, 4, 5, 6]

  presenceMonths.value = [
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 0, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 7, unplannedTimeOffPercent: 3.2, leaveTimePercent: 0.8, meetingsPercent: 1.8, trainingPercent: 1.2, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 1, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 7, unplannedTimeOffPercent: 3.2, leaveTimePercent: 0.8, meetingsPercent: 1.8, trainingPercent: 1.2, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 2, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 8, unplannedTimeOffPercent: 3.4, leaveTimePercent: 0.9, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 3, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 8, unplannedTimeOffPercent: 3.4, leaveTimePercent: 0.9, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 4, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 9.5, unplannedTimeOffPercent: 3.6, leaveTimePercent: 1, meetingsPercent: 2, trainingPercent: 1.4, coachingPercent: 1.3, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.15 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 5, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 10, unplannedTimeOffPercent: 3.8, leaveTimePercent: 1, meetingsPercent: 2, trainingPercent: 1.5, coachingPercent: 1.3, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.15 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 6, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 12, unplannedTimeOffPercent: 4, leaveTimePercent: 1.2, meetingsPercent: 1.8, trainingPercent: 1.1, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.18 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 7, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 12, unplannedTimeOffPercent: 4, leaveTimePercent: 1.2, meetingsPercent: 1.8, trainingPercent: 1.1, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.18 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 8, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 9.5, unplannedTimeOffPercent: 3.6, leaveTimePercent: 1, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.14 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 9, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 8.8, unplannedTimeOffPercent: 3.5, leaveTimePercent: 0.9, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.14 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 10, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 9.5, unplannedTimeOffPercent: 3.7, leaveTimePercent: 1.1, meetingsPercent: 2, trainingPercent: 1.4, coachingPercent: 1.3, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.16 }),
    createPresenceMonthFromProfile({ year: currentYear + 1, monthIndex: 11, weekdays: [1, 2, 3, 4, 5, 6], plannedTimeOffPercent: 11.5, unplannedTimeOffPercent: 4.2, leaveTimePercent: 1.3, meetingsPercent: 2.2, trainingPercent: 1.5, coachingPercent: 1.4, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.2 })
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

  activeTab.value = 'presence'
  selectedMonthIndex.value = 0
  settingsOpen.value = false
}

const resetPlanner = () => {
  planName.value = `${currentYear} Staffing Plan`
  planningYear.value = currentYear
  operatingWeekdays.value = [1, 2, 3, 4, 5]
  presenceMonths.value = buildPresenceMonths()
  randomDefaults.value = createRandomMonth()
  useMonthlyRandomOverrides.value = false
  randomMonths.value = buildRandomMonths()
  planMonths.value = buildPlanMonths()
  activeTab.value = 'presence'
  selectedMonthIndex.value = currentMonthIndex
  settingsOpen.value = false
}

const openSettings = () => {
  settingsOpen.value = true
}

const closeSettings = () => {
  settingsOpen.value = false
}

const monthlyRecords = computed(() =>
  MONTH_LABELS.map((label, monthIndex) => {
    const presenceInput = presenceMonths.value[monthIndex]
    const randomInput = useMonthlyRandomOverrides.value ? randomMonths.value[monthIndex] : randomDefaults.value
    const planInput = planMonths.value[monthIndex]

    const calendarOpenDays = calculateCalendarOpenDays(planningYear.value, monthIndex, operatingWeekdays.value)
    const dayAdjustment = Math.round(toNumber(presenceInput.dayAdjustment, 0))
    const openDays = Math.max(calendarOpenDays + dayAdjustment, 0)
    const paidHoursPerDay = clamp(toNumber(presenceInput.paidHoursPerDay, 8), 0, 24)
    const paidHoursPerMonth = openDays * paidHoursPerDay

    const plannedTimeOffHours = Math.max(toNumber(presenceInput.plannedTimeOffHours, 0), 0)
    const unplannedTimeOffHours = Math.max(toNumber(presenceInput.unplannedTimeOffHours, 0), 0)
    const leaveTimeHours = Math.max(toNumber(presenceInput.leaveTimeHours, 0), 0)
    const meetingsHours = Math.max(toNumber(presenceInput.meetingsHours, 0), 0)
    const trainingHours = Math.max(toNumber(presenceInput.trainingHours, 0), 0)
    const coachingHours = Math.max(toNumber(presenceInput.coachingHours, 0), 0)
    const paidBreaksHoursPerDay = Math.max(toNumber(presenceInput.paidBreaksHoursPerDay, 0), 0)
    const otherAwayHoursPerDay = Math.max(toNumber(presenceInput.otherAwayHoursPerDay, 0), 0)

    const rawPaidBreaksHours = paidBreaksHoursPerDay * openDays
    const rawOtherAwayHours = otherAwayHoursPerDay * openDays
    const otherLossHoursPerDay = paidBreaksHoursPerDay + otherAwayHoursPerDay

    const absenceLossHours = plannedTimeOffHours + unplannedTimeOffHours + leaveTimeHours
    const scheduledLossHours = meetingsHours + trainingHours + coachingHours
    const absenceLossPercent = paidHoursPerMonth > 0 ? (absenceLossHours / paidHoursPerMonth) * 100 : 0

    const presencePercentRaw = 100 - absenceLossPercent
    const presencePercent = paidHoursPerMonth > 0 ? clamp(presencePercentRaw, 1, 100) : 0
    const presenceShare = paidHoursPerMonth > 0 ? clamp(presencePercentRaw, 1, 100) / 100 : 1
    const presentHours = paidHoursPerMonth * presenceShare
    const presenceFactor = paidHoursPerMonth > 0 ? 1 / presenceShare : 1

    const paidBreaksHours = rawPaidBreaksHours * presenceShare
    const otherAwayHours = rawOtherAwayHours * presenceShare
    const otherLossHours = paidBreaksHours + otherAwayHours
    const utilizationLossHours = scheduledLossHours + otherLossHours
    const totalLossHours = absenceLossHours + scheduledLossHours + otherLossHours

    const utilizationPercentRaw = presentHours > 0 ? 100 - (utilizationLossHours / presentHours) * 100 : 0
    const utilizationPercent = presentHours > 0 ? clamp(utilizationPercentRaw, 1, 100) : 0
    const utilizationShare = presentHours > 0 ? clamp(utilizationPercentRaw, 1, 100) / 100 : 1
    const utilizationFactor = 1 / utilizationShare
    const scheduledPercent = paidHoursPerMonth > 0 ? presenceShare * utilizationShare * 100 : 0
    const scheduledHours = paidHoursPerMonth * presenceShare * utilizationShare

    const occupancyPercent = clamp(toNumber(randomInput.occupancyPercent, 90), 1, 100)
    const adherencePercent = clamp(toNumber(randomInput.adherencePercent, 95), 1, 100)
    const occupancyShare = occupancyPercent / 100
    const adherenceShare = adherencePercent / 100
    const adherenceLossPercent = (1 - adherenceShare) * scheduledPercent
    const scheduledAfterAdherencePercent = scheduledPercent - adherenceLossPercent
    const occupancyLossPercent = (1 - occupancyShare) * scheduledAfterAdherencePercent
    const randomLossPercent = adherenceLossPercent + occupancyLossPercent
    const designFactorPercent = scheduledPercent - randomLossPercent
    const designFactorShare = designFactorPercent / 100
    const workloadStaffingRatio = designFactorShare > 0 ? 1 / designFactorShare : 0

    const contacts = Math.max(toNumber(planInput.contacts, 0), 0)
    const ahtSeconds = Math.max(toNumber(planInput.ahtSeconds, 0), 0)
    const workloadHours = (contacts * ahtSeconds) / 3600
    const requiredStaffHours = workloadHours * workloadStaffingRatio
    const requiredHeadcount = paidHoursPerMonth > 0 ? requiredStaffHours / paidHoursPerMonth : 0
    const roundedHeadcount = requiredHeadcount > 0 ? Math.ceil(requiredHeadcount) : 0

    const presenceWarnings = []
    const utilizationWarnings = []
    const randomWarnings = []
    const planWarnings = []

    if (!operatingWeekdays.value.length) {
      presenceWarnings.push('No operating weekdays are selected, so open days are zero until you turn at least one day on.')
      planWarnings.push('No operating weekdays are selected, so the final plan cannot create monthly capacity.')
    }

    if (openDays === 0 && operatingWeekdays.value.length) {
      presenceWarnings.push('Open days are zero after the monthly day adjustment. Check holidays or temporary closures.')
      planWarnings.push('Open days are zero for this month, so the plan shows no monthly paid capacity.')
    }

    if (paidHoursPerMonth === 0 && totalLossHours > 0) {
      presenceWarnings.push('Presence hours are entered, but monthly paid hours are zero. Check open days or paid hours per day.')
    }

    if (otherLossHoursPerDay >= paidHoursPerDay && paidHoursPerDay > 0) {
      presenceWarnings.push('Daily other loss is consuming all paid hours in the day. Recheck paid breaks or other away time.')
    }

    if (presencePercentRaw <= 0 && paidHoursPerMonth > 0) {
      presenceWarnings.push('Absence losses total 100% or more of paid hours. The planner is clamping presence to avoid impossible staffing math.')
    } else if (presencePercent < 55 && paidHoursPerMonth > 0) {
      presenceWarnings.push('Presence is very low for a monthly budget plan. Recheck planned time off, unplanned time off, and leave time.')
    }

    if (utilizationPercentRaw <= 0) {
      utilizationWarnings.push('Scheduled and other utilization losses fully consume the present time in the month. Utilization is clamped to keep the plan calculable.')
    } else if (utilizationPercent > 92) {
      utilizationWarnings.push('Utilization is very tight for a monthly plan. Make sure the team can sustain this without excessive strain.')
    } else if (utilizationPercent < 60) {
      utilizationWarnings.push('Utilization is unusually low. Confirm that meetings, training, breaks, or other away time are not overstated.')
    }

    if (occupancyPercent > 95) {
      randomWarnings.push('Occupancy is very high. Confirm the staffing plan can sustain this without excessive strain.')
    } else if (occupancyPercent < 80) {
      randomWarnings.push('Occupancy is unusually low. Confirm the assumption is intentional for this monthly budget.')
    }

    if (adherencePercent < 90) {
      randomWarnings.push('Adherence is low for a monthly staffing plan. Recheck the assumption before finalizing required headcount.')
    }

    if (randomLossPercent >= scheduledPercent && scheduledPercent > 0) {
      randomWarnings.push('Total scheduled random loss is consuming all scheduled capacity. Recheck the adherence and occupancy assumptions.')
    } else if (workloadStaffingRatio > 2.5) {
      randomWarnings.push('The adherence and occupancy assumptions produce a large staffing ratio. Confirm the model is not double counting execution losses elsewhere.')
    }

    if (contacts > 0 && paidHoursPerMonth === 0) {
      planWarnings.push('Contacts are forecasted, but paid hours per FTE are zero. The final staffing result will stay at zero until presence inputs are fixed.')
    }

    if (contacts === 0 && ahtSeconds > 0) {
      planWarnings.push('AHT is populated, but contacts are zero. The month will show no workload until demand is entered.')
    }

    return {
      monthIndex,
      label,
      fullLabel: FULL_MONTH_LABELS[monthIndex],
      calendarOpenDays,
      dayAdjustment,
      openDays,
      paidHoursPerDay,
      paidHoursPerMonth,
      plannedTimeOffHours,
      unplannedTimeOffHours,
      leaveTimeHours,
      meetingsHours,
      trainingHours,
      coachingHours,
      paidBreaksHoursPerDay,
      otherAwayHoursPerDay,
      rawPaidBreaksHours,
      rawOtherAwayHours,
      paidBreaksHours,
      otherAwayHours,
      otherLossHoursPerDay,
      absenceLossHours,
      scheduledLossHours,
      otherLossHours,
      utilizationLossHours,
      presentHours,
      scheduledHours,
      totalLossHours,
      presencePercent,
      presenceFactor,
      utilizationPercent,
      utilizationFactor,
      scheduledPercent,
      occupancyPercent,
      adherencePercent,
      adherenceLossPercent,
      occupancyLossPercent,
      randomLossPercent,
      designFactorPercent,
      workloadStaffingRatio,
      contacts,
      ahtSeconds,
      workloadHours,
      requiredStaffHours,
      requiredHeadcount,
      roundedHeadcount,
      presenceWarnings,
      utilizationWarnings,
      randomWarnings,
      planWarnings
    }
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

const displayPlanName = computed(() => planName.value.trim() || `${planningYear.value} Staffing Plan`)

const presenceSummary = computed(() => {
  const rows = monthlyRecords.value

  return {
    totalOpenDays: rows.reduce((sum, row) => sum + row.openDays, 0),
    averageAbsenceLossHours: average(rows.map((row) => row.absenceLossHours)),
    averageScheduledLossHours: average(rows.map((row) => row.scheduledLossHours)),
    averageOtherLossHours: average(rows.map((row) => row.otherLossHours)),
    averageTotalLossHours: average(rows.map((row) => row.totalLossHours)),
    averagePresence: average(rows.map((row) => row.presencePercent))
  }
})

const randomSummary = computed(() => {
  const rows = monthlyRecords.value
  const globalOccupancyPercent = clamp(toNumber(randomDefaults.value.occupancyPercent, 90), 1, 100)
  const globalAdherencePercent = clamp(toNumber(randomDefaults.value.adherencePercent, 95), 1, 100)

  return {
    usesMonthlyOverrides: useMonthlyRandomOverrides.value,
    globalOccupancyPercent,
    globalAdherencePercent,
    averageOccupancyPercent: average(rows.map((row) => row.occupancyPercent)),
    averageAdherencePercent: average(rows.map((row) => row.adherencePercent)),
    averageAdherenceLossPercent: average(rows.map((row) => row.adherenceLossPercent)),
    averageOccupancyLossPercent: average(rows.map((row) => row.occupancyLossPercent)),
    averageRandomLossPercent: average(rows.map((row) => row.randomLossPercent))
  }
})

const planSummary = computed(() => {
  const rows = monthlyRecords.value
  const peakMonth = rows.reduce((peak, row) => (row.requiredHeadcount > peak.requiredHeadcount ? row : peak))
  const busiestMonth = rows.reduce((busiest, row) =>
    row.workloadHours > busiest.workloadHours ? row : busiest
  )
  const annualContacts = rows.reduce((sum, row) => sum + row.contacts, 0)
  const annualWorkloadHours = rows.reduce((sum, row) => sum + row.workloadHours, 0)
  const annualRequiredStaffHours = rows.reduce((sum, row) => sum + row.requiredStaffHours, 0)
  const averageAhtSeconds =
    annualContacts > 0
      ? (annualWorkloadHours * 3600) / annualContacts
      : average(rows.map((row) => row.ahtSeconds))
  const minimumRequiredHeadcount = rows.length
    ? rows.reduce((minimum, row) => Math.min(minimum, row.requiredHeadcount), rows[0].requiredHeadcount)
    : 0

  return {
    peakMonth,
    busiestMonth,
    annualContacts,
    annualWorkloadHours,
    annualRequiredStaffHours,
    averageAhtSeconds,
    minimumRequiredHeadcount,
    averageRequiredStaffHours: average(rows.map((row) => row.requiredStaffHours)),
    averageRequiredHeadcount: average(rows.map((row) => row.requiredHeadcount))
  }
})

const buildPlanPayload = () => ({
  id: savedPlan?.id || initialPlan.id || null,
  createdAt: savedPlan?.createdAt || initialPlan.createdAt || null,
  name: planName.value.trim() || `${planningYear.value} Staffing Plan`,
  planningYear: planningYear.value,
  operatingWeekdays: [...operatingWeekdays.value],
  presenceMonths: presenceMonths.value.map((month) => createPresenceMonth(month)),
  randomDefaults: createRandomMonth(randomDefaults.value),
  useMonthlyRandomOverrides: useMonthlyRandomOverrides.value,
  randomMonths: randomMonths.value.map((month) => createRandomMonth(month)),
  planMonths: planMonths.value.map((month) => createPlanMonth(month)),
  summary: {
    annualContacts: planSummary.value.annualContacts,
    annualWorkloadHours: planSummary.value.annualWorkloadHours,
    annualRequiredStaffHours: planSummary.value.annualRequiredStaffHours,
    averageAhtSeconds: planSummary.value.averageAhtSeconds,
    minimumRequiredHeadcount: planSummary.value.minimumRequiredHeadcount,
    averageRequiredStaffHours: planSummary.value.averageRequiredStaffHours,
    averageRequiredHeadcount: planSummary.value.averageRequiredHeadcount,
    peakRequiredHeadcount: planSummary.value.peakMonth.requiredHeadcount,
    peakMonthLabel: planSummary.value.peakMonth.fullLabel
  }
})

const buildDraftPayload = () => ({
  plan: buildPlanPayload(),
  ui: {
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
  suspendAutosave.value = true
  removeDraft()
  emit('save', buildPlanPayload())
}

const cancelEditor = () => {
  flushAutosave()
  emit('cancel')
}

const plannerWarnings = computed(() => {
  const rows = monthlyRecords.value
  return rows.flatMap((row) =>
    [...row.presenceWarnings, ...row.utilizationWarnings, ...row.randomWarnings, ...row.planWarnings].map(
      (message) => `${row.label}: ${message}`
    )
  )
})

const monthlyChartMax = computed(() =>
  Math.max(...monthlyRecords.value.flatMap((row) => [row.workloadHours, row.requiredStaffHours]), 1)
)

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

watch(
  [
    planName,
    planningYear,
    activeTab,
    selectedMonthIndex,
    settingsOpen,
    operatingWeekdays,
    presenceMonths,
    randomDefaults,
    useMonthlyRandomOverrides,
    randomMonths,
    planMonths
  ],
  () => {
    if (autosaveState.value === 'restored') {
      autosaveState.value = 'idle'
    }

    queueAutosave()
  },
  { deep: true }
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
              Review the highlighted assumption notes in each step before finalizing headcount.
            </p>
          </section>

          <PlannerSettingsModal
            v-if="settingsOpen"
            v-model:plan-name="planName"
            v-model:planning-year="planningYear"
            v-model:operating-weekdays="operatingWeekdays"
            :year-options="yearOptions"
            :weekday-options="WEEKDAY_OPTIONS"
            @close="closeSettings"
            @load-example="loadExamplePlan"
            @reset="resetPlanner"
            @toggle-weekday="toggleWeekday"
          />

          <nav class="monthly-tab-strip" aria-label="Monthly planner sections">
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

          <PlannerPresenceTab
            v-if="activeTab === 'presence'"
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
