<script setup>
import { computed, ref } from 'vue'

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
    step: '1',
    title: 'Presence / Utilization',
    description: 'Build absence-based presence and scheduled-time utilization in one monthly table.'
  },
  {
    id: 'random',
    step: '2',
    title: 'Random',
    description: 'Set occupancy and adherence assumptions that convert roster need into budgeted headcount.'
  },
  {
    id: 'plan',
    step: '3',
    title: 'Monthly Plan',
    description: 'Enter call demand and let the staffing plan flow from prior assumptions.'
  }
]

const currentYear = new Date().getFullYear()
const currentMonthIndex = new Date().getMonth()

const yearOptions = Array.from({ length: 8 }, (_, index) => currentYear - 2 + index)

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

const planningYear = ref(currentYear)
const activeTab = ref('presence')
const selectedMonthIndex = ref(currentMonthIndex)
const operatingWeekdays = ref([1, 2, 3, 4, 5])
const presenceMonths = ref(buildPresenceMonths())
const randomDefaults = ref(createRandomMonth())
const useMonthlyRandomOverrides = ref(false)
const randomMonths = ref(buildRandomMonths())
const planMonths = ref(buildPlanMonths())

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

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
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

const handlePresenceCopyAction = (event) => {
  const action = event.target.value

  if (action === 'all') {
    copyPresenceMonthToAll(selectedMonthIndex.value)
  } else if (action === 'forward') {
    copyPresenceMonthForward(selectedMonthIndex.value)
  } else if (action === 'quarter') {
    copyPresenceQuarterForward(selectedMonthIndex.value)
  }

  event.target.value = ''
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

const handleRandomCopyAction = (event) => {
  const action = event.target.value

  if (action === 'all') {
    copyRandomMonthToAll(selectedMonthIndex.value)
  } else if (action === 'forward') {
    copyRandomMonthForward(selectedMonthIndex.value)
  } else if (action === 'quarter') {
    copyRandomQuarterForward(selectedMonthIndex.value)
  }

  event.target.value = ''
}

const loadExamplePlan = () => {
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
}

const resetPlanner = () => {
  planningYear.value = currentYear
  operatingWeekdays.value = [1, 2, 3, 4, 5]
  presenceMonths.value = buildPresenceMonths()
  randomDefaults.value = createRandomMonth()
  useMonthlyRandomOverrides.value = false
  randomMonths.value = buildRandomMonths()
  planMonths.value = buildPlanMonths()
  activeTab.value = 'presence'
  selectedMonthIndex.value = currentMonthIndex
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
    const rawOtherLossHours = rawPaidBreaksHours + rawOtherAwayHours

    const absenceLossHours = plannedTimeOffHours + unplannedTimeOffHours + leaveTimeHours
    const scheduledLossHours = meetingsHours + trainingHours + coachingHours

    const plannedTimeOffPercent = paidHoursPerMonth > 0 ? (plannedTimeOffHours / paidHoursPerMonth) * 100 : 0
    const unplannedTimeOffPercent = paidHoursPerMonth > 0 ? (unplannedTimeOffHours / paidHoursPerMonth) * 100 : 0
    const leaveTimePercent = paidHoursPerMonth > 0 ? (leaveTimeHours / paidHoursPerMonth) * 100 : 0
    const meetingsPercent = paidHoursPerMonth > 0 ? (meetingsHours / paidHoursPerMonth) * 100 : 0
    const trainingPercent = paidHoursPerMonth > 0 ? (trainingHours / paidHoursPerMonth) * 100 : 0
    const coachingPercent = paidHoursPerMonth > 0 ? (coachingHours / paidHoursPerMonth) * 100 : 0
    const absenceLossPercent = paidHoursPerMonth > 0 ? (absenceLossHours / paidHoursPerMonth) * 100 : 0

    const presenceLossHours = absenceLossHours
    const presenceLossPercent = absenceLossPercent
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

    const paidBreaksPercent = paidHoursPerMonth > 0 ? (paidBreaksHours / paidHoursPerMonth) * 100 : 0
    const otherAwayPercent = paidHoursPerMonth > 0 ? (otherAwayHours / paidHoursPerMonth) * 100 : 0
    const scheduledLossPercent = paidHoursPerMonth > 0 ? (scheduledLossHours / paidHoursPerMonth) * 100 : 0
    const otherLossPercent = paidHoursPerMonth > 0 ? (otherLossHours / paidHoursPerMonth) * 100 : 0
    const utilizationLossPercent = paidHoursPerMonth > 0 ? (utilizationLossHours / paidHoursPerMonth) * 100 : 0
    const totalLossPercent = paidHoursPerMonth > 0 ? (totalLossHours / paidHoursPerMonth) * 100 : 0

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
      randomWarnings.push('Adherence is low for a monthly staffing plan. Recheck the assumption before finalizing budgeted headcount.')
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
      rawOtherLossHours,
      paidBreaksHours,
      otherAwayHours,
      otherLossHoursPerDay,
      plannedTimeOffPercent,
      unplannedTimeOffPercent,
      leaveTimePercent,
      meetingsPercent,
      trainingPercent,
      coachingPercent,
      paidBreaksPercent,
      otherAwayPercent,
      absenceLossHours,
      scheduledLossHours,
      otherLossHours,
      utilizationLossHours,
      presentHours,
      scheduledHours,
      absenceLossPercent,
      scheduledLossPercent,
      otherLossPercent,
      utilizationLossPercent,
      totalLossHours,
      totalLossPercent,
      presenceLossHours,
      presenceLossPercent,
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

const selectedMonth = computed(() => monthlyRecords.value[selectedMonthIndex.value] ?? monthlyRecords.value[0])

const operatingWeekdayLabel = computed(() => {
  if (!operatingWeekdays.value.length) {
    return 'No days selected'
  }

  return operatingWeekdays.value
    .map((value) => WEEKDAY_OPTIONS.find((option) => option.value === value)?.label)
    .join(', ')
})

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

  return {
    peakMonth,
    busiestMonth,
    annualContacts: rows.reduce((sum, row) => sum + row.contacts, 0),
    annualWorkloadHours: rows.reduce((sum, row) => sum + row.workloadHours, 0),
    averageRequiredStaffHours: average(rows.map((row) => row.requiredStaffHours)),
    averageRequiredHeadcount: average(rows.map((row) => row.requiredHeadcount))
  }
})

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
</script>

<template>
  <section id="monthly-plan" class="calculator-section">
    <div class="container">
      <div class="calculator-card monthly-flow-card">
        <div class="monthly-flow-shell">
          <section class="monthly-flow-hero">
            <p class="pane-kicker">Monthly Budget Planner</p>
            <h2>Build a monthly staffing plan</h2>
            <p class="calculator-intro">Set monthly assumptions, then enter contacts and AHT to build the plan.</p>
          </section>

          <section class="input-group-card monthly-global-controls">
            <div class="input-group-header">
              <h3>Global setup</h3>
              <p class="helper-text">
                The selected year and operating weekdays drive each month&apos;s calendar open days before presence is
                applied.
              </p>
            </div>

            <div class="monthly-global-grid">
              <div class="field-group monthly-setup-card">
                <label for="planning-year">Planning year</label>
                <select id="planning-year" v-model.number="planningYear">
                  <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
                </select>
              </div>

              <div class="field-group monthly-weekday-field monthly-setup-card">
                <label>Operating days</label>
                <div class="weekday-toggle-group">
                  <button
                    v-for="weekday in WEEKDAY_OPTIONS"
                    :key="weekday.value"
                    type="button"
                    class="weekday-toggle"
                    :class="{ active: operatingWeekdays.includes(weekday.value) }"
                    @click="toggleWeekday(weekday.value)"
                  >
                    {{ weekday.label }}
                  </button>
                </div>
              </div>

              <div class="field-group monthly-action-field monthly-setup-card">
                <label>Planner actions</label>
                <div class="batch-actions">
                  <button type="button" class="secondary-btn" @click="loadExamplePlan">Load Example Plan</button>
                  <button type="button" class="secondary-btn" @click="resetPlanner">Reset Planner</button>
                </div>
              </div>
            </div>

            <p v-if="plannerWarnings.length" class="status-message error monthly-global-warning">
              {{ plannerWarnings.length }} monthly warning{{ plannerWarnings.length === 1 ? '' : 's' }} detected.
              Review the highlighted assumption notes in each step before finalizing headcount.
            </p>
          </section>

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

          <section v-if="activeTab === 'presence'" class="results-panel monthly-tab-panel">
            <header class="monthly-tab-header">
              <div>
                <h3>Build presence / utilization month by month</h3>
              </div>
            </header>

            <div class="results-metrics monthly-summary-grid">
              <article class="metric-card">
                <p class="metric-label">Total Open Days</p>
                <p class="metric-value">{{ formatWhole(presenceSummary.totalOpenDays) }}</p>
                <p class="metric-meta">Open business days across the full plan year after day adjustments</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Avg Absence Loss / Month</p>
                <p class="metric-value">{{ formatNumber(presenceSummary.averageAbsenceLossHours, 1) }}</p>
                <p class="metric-meta">Planned time off, unplanned time off, and leave time per agent</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Avg Scheduled Loss / Month</p>
                <p class="metric-value">{{ formatNumber(presenceSummary.averageScheduledLossHours, 1) }}</p>
                <p class="metric-meta">Meetings, training, and coaching per agent</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Avg Other Loss / Month</p>
                <p class="metric-value">{{ formatNumber(presenceSummary.averageOtherLossHours, 1) }}</p>
                <p class="metric-meta">Paid breaks and other away time converted into monthly totals and reduced by presence</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Average Total Loss / Month</p>
                <p class="metric-value">{{ formatNumber(presenceSummary.averageTotalLossHours, 1) }}</p>
                <p class="metric-meta">Combined monthly and daily losses converted into monthly hours</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Average Presence</p>
                <p class="metric-value">{{ formatPercent(presenceSummary.averagePresence, 1) }}</p>
                <p class="metric-meta">Average monthly presence across the full plan year</p>
              </article>
            </div>

            <section class="input-group-card monthly-loss-group">
              <div class="workspace-output-header">
                <h3>Monthly Presence / Utilization Inputs</h3>
                <p>Use one table to build absence-based presence, scheduled-time utilization, and final scheduled %.</p>
              </div>
              <div class="monthly-copy-toolbar">
                <label class="monthly-copy-select" for="presence-copy-action">
                  <span class="monthly-copy-label">Copy {{ selectedMonth.label }}</span>
                  <select
                    id="presence-copy-action"
                    class="monthly-copy-select-input"
                    @change="handlePresenceCopyAction"
                  >
                    <option value="">Choose action</option>
                    <option value="all">To all months</option>
                    <option value="forward">Forward</option>
                    <option value="quarter">Through quarter</option>
                  </select>
                </label>
              </div>
              <div class="assumption-table-shell">
                <table class="assumption-table assumption-table-presence-main">
                  <thead>
                    <tr class="presence-super-row">
                      <th rowspan="3" class="presence-sticky-head" title="Planning month. Click a month name to highlight that row.">Month</th>
                      <th rowspan="3" class="presence-sticky-head" title="Monthly business days after the weekday pattern and any day adjustment are applied.">
                        <span class="presence-head-label">Business<br />Days</span>
                      </th>
                      <th rowspan="3" class="presence-sticky-head" title="Add or remove business days for holidays, closures, or special events.">Day Adj.</th>
                      <th rowspan="3" class="presence-sticky-head presence-paid-head" title="Full paid hours for one agent in one business day before paid breaks are removed.">
                        <span class="presence-head-label">Daily Paid<br />Hours</span>
                      </th>
                      <th colspan="3" class="presence-super-head presence-super-presence" title="Absence-driven losses that determine how much paid time remains available to work.">Presence</th>
                      <th colspan="5" class="presence-super-head presence-super-utilization" title="Scheduled and daily working-time losses that determine how much present time remains usable.">Utilization</th>
                      <th rowspan="3" class="presence-sticky-head presence-month-hours-head" title="Monthly paid hours for one FTE. Calculated as business days multiplied by daily paid hours.">
                        <span class="presence-head-label">FTE Paid<br />Hours</span>
                      </th>
                      <th rowspan="3" class="presence-sticky-head" title="Combined monthly absence, scheduled, and presence-adjusted daily losses in hours.">Total Loss</th>
                      <th rowspan="3" class="presence-sticky-head" title="Share of paid time left after absence loss is removed.">Presence %</th>
                      <th rowspan="3" class="presence-sticky-head" title="Share of present time left after scheduled and other utilization loss is removed.">Utilization %</th>
                      <th rowspan="3" class="presence-sticky-head" title="Share of total paid time still available for handling after both presence and utilization are applied.">Scheduled %</th>
                    </tr>
                    <tr class="presence-group-row">
                      <th colspan="3" class="presence-group-head presence-group-absence" title="Monthly absence hours per agent that reduce presence.">Absence (Hours / Month)</th>
                      <th colspan="3" class="presence-group-head presence-group-scheduled" title="Monthly scheduled hours per agent that reduce utilization.">Scheduled (Hours / Month)</th>
                      <th colspan="2" class="presence-group-head presence-group-other" title="Daily paid-away hours per agent that reduce utilization after presence is applied.">Other (Hours / Day)</th>
                    </tr>
                    <tr class="presence-detail-row">
                      <th title="Planned time off hours per agent for the month.">Planned</th>
                      <th title="Unplanned absence hours per agent for the month.">Unplanned Off</th>
                      <th title="Leave hours per agent for the month.">Leave</th>
                      <th title="Meeting hours per agent for the month.">Meetings</th>
                      <th title="Training hours per agent for the month.">Training</th>
                      <th title="Coaching hours per agent for the month.">Coaching</th>
                      <th title="Paid break hours per agent per business day. These daily hours are reduced by presence before they hit utilization.">Breaks</th>
                      <th title="Other away time per agent per business day. These daily hours are reduced by presence before they hit utilization.">Away</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="record in monthlyRecords"
                      :key="`presence-main-${record.label}`"
                      :class="{ selected: selectedMonthIndex === record.monthIndex }"
                    >
                      <td class="month-cell">
                        <button
                          type="button"
                          class="assumption-month-btn"
                          @click="setSelectedMonth(record.monthIndex)"
                        >
                          {{ record.fullLabel }}
                        </button>
                      </td>
                      <td>{{ formatWhole(record.openDays) }}</td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].dayAdjustment"
                          type="number"
                          step="1"
                          aria-label="Business day adjustment for the month"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].paidHoursPerDay"
                          type="number"
                          min="0"
                          max="24"
                          step="0.25"
                          aria-label="Paid hours per day"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].plannedTimeOffHours"
                          type="number"
                          min="0"
                          step="0.25"
                          aria-label="Planned time off hours per agent per month"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].unplannedTimeOffHours"
                          type="number"
                          min="0"
                          step="0.25"
                          aria-label="Unplanned time off hours per agent per month"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].leaveTimeHours"
                          type="number"
                          min="0"
                          step="0.25"
                          aria-label="Leave time hours per agent per month"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].meetingsHours"
                          type="number"
                          min="0"
                          step="0.25"
                          aria-label="Meetings hours per agent per month"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].trainingHours"
                          type="number"
                          min="0"
                          step="0.25"
                          aria-label="Training hours per agent per month"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].coachingHours"
                          type="number"
                          min="0"
                          step="0.25"
                          aria-label="Coaching hours per agent per month"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].paidBreaksHoursPerDay"
                          type="number"
                          min="0"
                          step="0.05"
                          aria-label="Paid breaks hours per agent per day"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="presenceMonths[record.monthIndex].otherAwayHoursPerDay"
                          type="number"
                          min="0"
                          step="0.05"
                          aria-label="Other away hours per agent per day"
                        />
                      </td>
                      <td>{{ formatNumber(record.paidHoursPerMonth, 1) }}</td>
                      <td>{{ formatNumber(record.totalLossHours, 1) }}</td>
                      <td>{{ formatPercent(record.presencePercent, 1) }}</td>
                      <td>{{ formatPercent(record.utilizationPercent, 1) }}</td>
                      <td>{{ formatPercent(record.scheduledPercent, 1) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div class="monthly-tab-actions">
              <button type="button" class="submit-btn" @click="moveTab(1)">Continue to Random</button>
            </div>
          </section>

          <section v-else-if="activeTab === 'random'" class="results-panel monthly-tab-panel">
            <header class="monthly-tab-header">
              <div>
                <h3>Set occupancy and adherence assumptions</h3>
              </div>
              <p>Use one global assumption set for the year, and only turn on monthly overrides if a few months need different values.</p>
            </header>

            <div class="results-metrics monthly-summary-grid">
              <article class="metric-card">
                <p class="metric-label">{{ randomSummary.usesMonthlyOverrides ? 'Average Occupancy' : 'Occupancy' }}</p>
                <p class="metric-value">
                  {{ formatPercent(randomSummary.usesMonthlyOverrides ? randomSummary.averageOccupancyPercent : randomSummary.globalOccupancyPercent, 1) }}
                </p>
                <p class="metric-meta">
                  {{ randomSummary.usesMonthlyOverrides ? 'Average monthly occupancy assumption' : 'Global occupancy assumption used across the full year' }}
                </p>
              </article>
              <article class="metric-card">
                <p class="metric-label">{{ randomSummary.usesMonthlyOverrides ? 'Average Adherence' : 'Adherence' }}</p>
                <p class="metric-value">
                  {{ formatPercent(randomSummary.usesMonthlyOverrides ? randomSummary.averageAdherencePercent : randomSummary.globalAdherencePercent, 1) }}
                </p>
                <p class="metric-meta">
                  {{ randomSummary.usesMonthlyOverrides ? 'Average monthly adherence assumption' : 'Global adherence assumption used across the full year' }}
                </p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Avg Adherence Loss</p>
                <p class="metric-value">
                  {{ formatPercent(randomSummary.averageAdherenceLossPercent, 1) }}
                </p>
                <p class="metric-meta">Average monthly loss applied to scheduled % from adherence</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Avg Occupancy Loss</p>
                <p class="metric-value">
                  {{ formatPercent(randomSummary.averageOccupancyLossPercent, 1) }}
                </p>
                <p class="metric-meta">Average monthly loss applied after adherence loss is removed</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Avg Total Scheduled Random Loss</p>
                <p class="metric-value">
                  {{ formatPercent(randomSummary.averageRandomLossPercent, 1) }}
                </p>
                <p class="metric-meta">Adherence loss plus occupancy loss against scheduled %</p>
              </article>
            </div>

            <section class="input-group-card random-global-panel">
              <div class="workspace-output-header">
                <h3>Random Assumptions</h3>
                <p>These assumptions create adherence and occupancy losses against scheduled % and turn roster headcount into budgeted headcount.</p>
              </div>

              <div class="monthly-global-grid random-global-grid">
                <div class="field-group">
                  <label for="global-occupancy">{{ useMonthlyRandomOverrides ? 'Default Occupancy %' : 'Occupancy %' }}</label>
                  <input
                    id="global-occupancy"
                    v-model.number="randomDefaults.occupancyPercent"
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    aria-label="Global occupancy percent"
                  />
                  <p class="helper-text">
                    {{
                      useMonthlyRandomOverrides
                        ? 'Seeds the monthly override table.'
                        : 'Applies across the full plan year.'
                    }}
                  </p>
                </div>

                <div class="field-group">
                  <label for="global-adherence">{{ useMonthlyRandomOverrides ? 'Default Adherence %' : 'Adherence %' }}</label>
                  <input
                    id="global-adherence"
                    v-model.number="randomDefaults.adherencePercent"
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    aria-label="Global adherence percent"
                  />
                  <p class="helper-text">
                    {{
                      useMonthlyRandomOverrides
                        ? 'Seeds the monthly override table.'
                        : 'Applies across the full plan year.'
                    }}
                  </p>
                </div>

                <div class="field-group random-override-field">
                  <label for="use-random-overrides">Monthly overrides</label>
                  <label class="random-override-toggle">
                    <input
                      id="use-random-overrides"
                      :checked="useMonthlyRandomOverrides"
                      type="checkbox"
                      @change="setRandomOverrideMode($event.target.checked)"
                    />
                    <span>Use monthly overrides</span>
                  </label>
                  <p class="helper-text">Off for one yearly assumption set. On for month-level edits.</p>
                </div>
              </div>
            </section>

            <section v-if="useMonthlyRandomOverrides" class="input-group-card random-overrides-panel">
              <div class="workspace-output-header">
                <h3>Monthly Random Overrides</h3>
                <p>Adjust only the months that need different occupancy or adherence assumptions. Losses are calculated from scheduled % from Step 1.</p>
              </div>

              <div class="monthly-copy-toolbar">
                <label class="monthly-copy-select" for="random-copy-action">
                  <span class="monthly-copy-label">Copy {{ selectedMonth.label }}</span>
                  <select
                    id="random-copy-action"
                    class="monthly-copy-select-input"
                    @change="handleRandomCopyAction"
                  >
                    <option value="">Choose action</option>
                    <option value="all">To all months</option>
                    <option value="forward">Forward</option>
                    <option value="quarter">Through quarter</option>
                  </select>
                </label>
              </div>

              <div class="assumption-table-shell">
                <table class="assumption-table assumption-table-random">
                  <thead>
                    <tr>
                      <th title="Planning month. Click a month name to highlight that row.">Month</th>
                      <th title="Scheduled percentage flowing in from Step 1.">Scheduled %</th>
                      <th title="Expected monthly occupancy assumption used in the random loss build.">Occupancy %</th>
                      <th title="Expected monthly adherence assumption used in the random loss build.">Adherence %</th>
                      <th title="Adherence loss calculated as (1 - Adherence %) x Scheduled %.">Adherence Loss</th>
                      <th title="Occupancy loss calculated as (1 - Occupancy %) x (Scheduled % - Adherence Loss).">Occupancy Loss</th>
                      <th title="Total scheduled random loss calculated as Adherence Loss + Occupancy Loss.">Total Random Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="record in monthlyRecords"
                      :key="record.label"
                      :class="{ selected: selectedMonthIndex === record.monthIndex }"
                    >
                      <td class="month-cell">
                        <button
                          type="button"
                          class="assumption-month-btn"
                          @click="setSelectedMonth(record.monthIndex)"
                      >
                        {{ record.fullLabel }}
                      </button>
                    </td>
                      <td>{{ formatPercent(record.scheduledPercent, 1) }}</td>
                      <td>
                        <input
                          v-model.number="randomMonths[record.monthIndex].occupancyPercent"
                          type="number"
                          min="1"
                          max="100"
                          step="0.1"
                          aria-label="Occupancy percent"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="randomMonths[record.monthIndex].adherencePercent"
                          type="number"
                          min="1"
                          max="100"
                          step="0.1"
                          aria-label="Adherence percent"
                        />
                      </td>
                      <td>{{ formatPercent(record.adherenceLossPercent, 1) }}</td>
                      <td>{{ formatPercent(record.occupancyLossPercent, 1) }}</td>
                      <td>{{ formatPercent(record.randomLossPercent, 1) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div v-else class="answer-card random-global-note">
              <h4>Global mode is on</h4>
              <p>These occupancy and adherence assumptions apply to every month in the plan. Adherence and occupancy losses are calculated from each month’s scheduled % from Step 1.</p>
            </div>

            <div class="monthly-tab-actions">
              <button type="button" class="secondary-btn" @click="moveTab(-1)">Back to Presence / Utilization</button>
              <button type="button" class="submit-btn" @click="moveTab(1)">Continue to Monthly Plan</button>
            </div>
          </section>

          <section v-else class="results-panel monthly-tab-panel">
            <header class="monthly-tab-header">
              <div>
                <h3>Enter call demand and review the full monthly plan</h3>
              </div>
            </header>

            <div class="results-metrics monthly-summary-grid">
              <article class="metric-card">
                <p class="metric-label">Annual Contacts</p>
                <p class="metric-value">{{ formatWhole(planSummary.annualContacts) }}</p>
                <p class="metric-meta">Sum of all monthly demand entered in the plan</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Annual Workload Hours</p>
                <p class="metric-value">{{ formatWhole(planSummary.annualWorkloadHours) }}</p>
                <p class="metric-meta">{{ planSummary.busiestMonth.fullLabel }} is the busiest workload month</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Avg Required Staff Hours</p>
                <p class="metric-value">{{ formatNumber(planSummary.averageRequiredStaffHours, 1) }}</p>
                <p class="metric-meta">Average staffing hours required after design factor is applied</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Avg Required Headcount</p>
                <p class="metric-value">{{ formatNumber(planSummary.averageRequiredHeadcount, 1) }}</p>
                <p class="metric-meta">Average monthly required headcount before rounding</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Peak Required Headcount</p>
                <p class="metric-value">{{ formatNumber(planSummary.peakMonth.requiredHeadcount, 1) }}</p>
                <p class="metric-meta">{{ planSummary.peakMonth.fullLabel }}</p>
              </article>
            </div>

            <div class="assumption-table-shell">
              <table class="assumption-table assumption-table-plan">
                <thead>
                  <tr>
                    <th title="Planning month. Click a month name to highlight that row.">Month</th>
                    <th title="Monthly contact demand used to create workload hours.">Contacts</th>
                    <th title="Average handle time in seconds used to create workload hours.">AHT Sec</th>
                    <th title="Business days flowing in from Step 1 after weekday pattern and day adjustments.">Business Days</th>
                    <th title="Scheduled percentage flowing in from Step 1 after presence and utilization are applied.">Scheduled %</th>
                    <th title="Total scheduled random loss flowing in from Step 2.">
                      <span class="plan-head-label">Total Random<br />Loss %</span>
                    </th>
                    <th title="Design Factor is calculated as Scheduled % - Total Random Loss %.">Design Factor</th>
                    <th title="Workload Staffing Ratio is calculated as 1 / Design Factor. This ratio will later be used to convert workload into required staffing hours.">
                      <span class="plan-head-label">Workload<br />Staffing Ratio</span>
                    </th>
                    <th title="Monthly workload hours calculated from contacts and AHT.">Workload Hours</th>
                    <th title="Required staff hours calculated as Workload Hours x Workload Staffing Ratio.">
                      <span class="plan-head-label">Required Staff<br />Hours</span>
                    </th>
                    <th title="Required headcount calculated as Required Staff Hours / Monthly FTE Paid Hours from Step 1.">
                      <span class="plan-head-label">Required<br />Headcount</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="record in monthlyRecords"
                    :key="record.label"
                    :class="{ selected: selectedMonthIndex === record.monthIndex }"
                  >
                    <td class="month-cell">
                      <button
                        type="button"
                        class="assumption-month-btn"
                        @click="setSelectedMonth(record.monthIndex)"
                      >
                        {{ record.fullLabel }}
                      </button>
                    </td>
                    <td>
                      <input
                        v-model.number="planMonths[record.monthIndex].contacts"
                        type="number"
                        min="0"
                        step="100"
                        aria-label="Contacts"
                      />
                    </td>
                    <td>
                      <input
                        v-model.number="planMonths[record.monthIndex].ahtSeconds"
                        type="number"
                        min="0"
                        step="1"
                        aria-label="Average handle time in seconds"
                      />
                    </td>
                    <td>{{ formatWhole(record.openDays) }}</td>
                    <td>{{ formatPercent(record.scheduledPercent, 1) }}</td>
                    <td>{{ formatPercent(record.randomLossPercent, 1) }}</td>
                    <td>{{ formatPercent(record.designFactorPercent, 1) }}</td>
                    <td>{{ formatFactor(record.workloadStaffingRatio) }}</td>
                    <td>{{ formatNumber(record.workloadHours, 1) }}</td>
                    <td>{{ formatNumber(record.requiredStaffHours, 1) }}</td>
                    <td>{{ formatNumber(record.requiredHeadcount, 1) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="selectedMonth.planWarnings.length" class="monthly-warning-stack">
              <p v-for="warning in selectedMonth.planWarnings" :key="warning" class="status-message error">
                {{ warning }}
              </p>
            </div>

            <section class="monthly-chart-panel">
              <div class="workspace-output-header">
                <h3>Monthly Required Staffing</h3>
                <p>Required staff hours by month after the design factor is applied.</p>
              </div>
              <div class="monthly-bars">
                <button
                  v-for="record in monthlyRecords"
                  :key="record.label"
                  type="button"
                  class="monthly-bar-column"
                  :class="{ active: selectedMonthIndex === record.monthIndex }"
                  @click="setSelectedMonth(record.monthIndex)"
                >
                  <small class="monthly-bar-month">{{ record.label }}</small>
                  <div class="monthly-bar-cap">
                    <strong>{{ formatWhole(record.roundedHeadcount) }}</strong>
                    <span>HC</span>
                  </div>
                  <div class="monthly-bar-stack">
                    <div class="monthly-bar-track">
                      <div
                        class="monthly-bar-segment monthly-bar-final"
                        :style="{
                          height: `${Math.max((record.requiredStaffHours / monthlyChartMax) * 100, record.requiredStaffHours > 0 ? 6 : 0)}%`
                        }"
                      ></div>
                    </div>
                  </div>
                  <div class="monthly-bar-footer">
                    <strong>{{ formatWhole(record.requiredStaffHours) }}</strong>
                    <span>hours</span>
                  </div>
                  <div class="monthly-bar-tooltip">
                    <p class="monthly-bar-tooltip-title">{{ record.fullLabel }}</p>
                    <div class="monthly-bar-tooltip-grid">
                      <span>Workload Hours</span>
                      <strong>{{ formatNumber(record.workloadHours, 1) }}</strong>
                      <span>Required Staff Hrs</span>
                      <strong>{{ formatNumber(record.requiredStaffHours, 1) }}</strong>
                      <span>Required HC</span>
                      <strong>{{ formatNumber(record.requiredHeadcount, 1) }}</strong>
                      <span>Total Random Loss</span>
                      <strong>{{ formatPercent(record.randomLossPercent, 1) }}</strong>
                      <span>Design Factor</span>
                      <strong>{{ formatPercent(record.designFactorPercent, 1) }}</strong>
                    </div>
                  </div>
                </button>
              </div>
            </section>

            <div class="monthly-tab-actions">
              <button type="button" class="secondary-btn" @click="moveTab(-1)">Back to Random</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>
