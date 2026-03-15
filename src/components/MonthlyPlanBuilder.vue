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
    description: 'Add a variability buffer for forecast miss, seasonality, and events.'
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
  forecastRiskPercent: 4,
  seasonalityRiskPercent: 2,
  eventRiskPercent: 1,
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

  randomMonths.value = [
    createRandomMonth({ forecastRiskPercent: 3, seasonalityRiskPercent: 1, eventRiskPercent: 1 }),
    createRandomMonth({ forecastRiskPercent: 3, seasonalityRiskPercent: 1, eventRiskPercent: 1 }),
    createRandomMonth({ forecastRiskPercent: 3.5, seasonalityRiskPercent: 1.5, eventRiskPercent: 1 }),
    createRandomMonth({ forecastRiskPercent: 3.5, seasonalityRiskPercent: 1.5, eventRiskPercent: 1 }),
    createRandomMonth({ forecastRiskPercent: 4, seasonalityRiskPercent: 2, eventRiskPercent: 1.5 }),
    createRandomMonth({ forecastRiskPercent: 4, seasonalityRiskPercent: 2, eventRiskPercent: 1.5 }),
    createRandomMonth({ forecastRiskPercent: 5, seasonalityRiskPercent: 2.5, eventRiskPercent: 2 }),
    createRandomMonth({ forecastRiskPercent: 5, seasonalityRiskPercent: 2.5, eventRiskPercent: 2 }),
    createRandomMonth({ forecastRiskPercent: 4, seasonalityRiskPercent: 1.8, eventRiskPercent: 1.2 }),
    createRandomMonth({ forecastRiskPercent: 4, seasonalityRiskPercent: 1.8, eventRiskPercent: 1.2 }),
    createRandomMonth({ forecastRiskPercent: 4.2, seasonalityRiskPercent: 2.2, eventRiskPercent: 1.4 }),
    createRandomMonth({ forecastRiskPercent: 5.2, seasonalityRiskPercent: 3.2, eventRiskPercent: 2.3 })
  ]

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
  randomMonths.value = buildRandomMonths()
  planMonths.value = buildPlanMonths()
  activeTab.value = 'presence'
  selectedMonthIndex.value = currentMonthIndex
}

const monthlyRecords = computed(() =>
  MONTH_LABELS.map((label, monthIndex) => {
    const presenceInput = presenceMonths.value[monthIndex]
    const randomInput = randomMonths.value[monthIndex]
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

    const forecastRiskPercent = clamp(toNumber(randomInput.forecastRiskPercent, 0), 0, 100)
    const seasonalityRiskPercent = clamp(toNumber(randomInput.seasonalityRiskPercent, 0), 0, 100)
    const eventRiskPercent = clamp(toNumber(randomInput.eventRiskPercent, 0), 0, 100)
    const randomBufferPercent = forecastRiskPercent + seasonalityRiskPercent + eventRiskPercent
    const randomFactor = 1 + randomBufferPercent / 100

    const contacts = Math.max(toNumber(planInput.contacts, 0), 0)
    const ahtSeconds = Math.max(toNumber(planInput.ahtSeconds, 0), 0)
    const workloadHours = (contacts * ahtSeconds) / 3600
    const baseWorkloadFte = paidHoursPerMonth > 0 ? workloadHours / paidHoursPerMonth : 0
    const requiredPresentHeadcount = baseWorkloadFte * utilizationFactor
    const requiredRosterHeadcount = requiredPresentHeadcount * presenceFactor
    const finalFte = requiredRosterHeadcount * randomFactor
    const roundedHeadcount = finalFte > 0 ? Math.ceil(finalFte) : 0
    const expectedAveragePresentHeadcount = finalFte * presenceShare
    const effectiveHoursPerFte =
      paidHoursPerMonth > 0 ? paidHoursPerMonth * presenceShare * utilizationShare / randomFactor : 0
    const auditFte = effectiveHoursPerFte > 0 ? workloadHours / effectiveHoursPerFte : 0

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

    if (randomBufferPercent > 20) {
      randomWarnings.push('The random buffer is materially high. Confirm that variability is not already covered in your demand or utilization assumptions.')
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
      forecastRiskPercent,
      seasonalityRiskPercent,
      eventRiskPercent,
      randomBufferPercent,
      randomFactor,
      contacts,
      ahtSeconds,
      workloadHours,
      baseWorkloadFte,
      finalFte,
      roundedHeadcount,
      requiredPresentHeadcount,
      requiredRosterHeadcount,
      expectedAveragePresentHeadcount,
      effectiveHoursPerFte,
      auditFte,
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
  const highestBufferMonth = rows.reduce((highest, row) =>
    row.randomBufferPercent > highest.randomBufferPercent ? row : highest
  )

  return {
    averageRandomFactor: average(rows.map((row) => row.randomFactor)),
    averageRandomBuffer: average(rows.map((row) => row.randomBufferPercent)),
    highestBufferMonth
  }
})

const planSummary = computed(() => {
  const rows = monthlyRecords.value
  const peakMonth = rows.reduce((peak, row) => (row.finalFte > peak.finalFte ? row : peak))
  const busiestMonth = rows.reduce((busiest, row) =>
    row.workloadHours > busiest.workloadHours ? row : busiest
  )

  return {
    peakMonth,
    busiestMonth,
    annualWorkloadHours: rows.reduce((sum, row) => sum + row.workloadHours, 0),
    averagePresentHeadcount: average(rows.map((row) => row.requiredPresentHeadcount)),
    averageBudgetedHeadcount: average(rows.map((row) => row.finalFte)),
    annualBudgetedHeadcountMonths: rows.reduce((sum, row) => sum + row.finalFte, 0)
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

const monthlyBarMax = computed(() => Math.max(...monthlyRecords.value.map((row) => row.finalFte), 1))
</script>

<template>
  <section id="monthly-plan" class="calculator-section">
    <div class="container">
      <div class="calculator-card monthly-flow-card">
        <div class="monthly-flow-shell">
          <section class="monthly-flow-hero">
            <p class="pane-kicker">Monthly Budget Planner</p>
            <h2>Plan monthly staffing with one design-factor method from start to finish</h2>
            <p class="calculator-intro">
              This planner uses a single budgeting chain:
              <strong>presence</strong>,
              <strong>utilization</strong>,
              and
              <strong>random factor</strong>.
              Build those assumptions month by month, then enter only contacts and AHT on the final tab. This is a
              monthly budgeting tool for staffing plans, budgets, and headcount conversations.
            </p>
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
              <div class="field-group">
                <label for="planning-year">Planning year</label>
                <select id="planning-year" v-model.number="planningYear">
                  <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
                </select>
              </div>

              <div class="field-group monthly-weekday-field">
                <label>Operating weekdays</label>
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
                <p class="helper-text">
                  Current pattern:
                  <strong>{{ operatingWeekdayLabel }}</strong>
                </p>
              </div>

              <div class="field-group monthly-action-field">
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

          <nav class="monthly-tab-strip" aria-label="Monthly planner steps">
            <button
              v-for="tab in TABS"
              :key="tab.id"
              type="button"
              class="monthly-tab-btn"
              :class="{ active: activeTab === tab.id }"
              @click="setActiveTab(tab.id)"
            >
              <span class="monthly-tab-step">Step {{ tab.step }}</span>
              <strong>{{ tab.title }}</strong>
              <small>{{ tab.description }}</small>
            </button>
          </nav>

          <section v-if="activeTab === 'presence'" class="results-panel monthly-tab-panel">
            <header class="monthly-tab-header">
              <div>
                <p class="pane-kicker">Step 1</p>
                <h3>Build presence / utilization month by month</h3>
              </div>
              <p>
                Start with open days and paid hours, then enter absence, scheduled, and daily away-time losses. The
                planner converts those hours into presence %, utilization %, and final scheduled % for you.
              </p>
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
                <button type="button" class="secondary-btn" @click="copyPresenceMonthToAll(selectedMonthIndex)">
                  Copy {{ selectedMonth.label }} to All Months
                </button>
                <button type="button" class="secondary-btn" @click="copyPresenceMonthForward(selectedMonthIndex)">
                  Copy {{ selectedMonth.label }} Forward
                </button>
                <button type="button" class="secondary-btn" @click="copyPresenceQuarterForward(selectedMonthIndex)">
                  Copy {{ selectedMonth.label }} Through Quarter
                </button>
              </div>
              <div class="assumption-table-shell">
                <table class="assumption-table assumption-table-presence-main">
                  <thead>
                    <tr class="presence-super-row">
                      <th rowspan="3" class="presence-sticky-head">Month</th>
                      <th rowspan="3" class="presence-sticky-head">
                        <span class="presence-head-label">Business<br />Days</span>
                      </th>
                      <th rowspan="3" class="presence-sticky-head">Day Adj.</th>
                      <th rowspan="3" class="presence-sticky-head presence-paid-head">
                        <span class="presence-head-label">Daily Paid<br />Hours</span>
                      </th>
                      <th colspan="3" class="presence-super-head presence-super-presence">Presence</th>
                      <th colspan="5" class="presence-super-head presence-super-utilization">Utilization</th>
                      <th rowspan="3" class="presence-sticky-head presence-month-hours-head">
                        <span class="presence-head-label">FTE Paid<br />Hours /<br />Month</span>
                      </th>
                      <th rowspan="3" class="presence-sticky-head">Total Loss / Month</th>
                      <th rowspan="3" class="presence-sticky-head">Presence %</th>
                      <th rowspan="3" class="presence-sticky-head">Utilization %</th>
                      <th rowspan="3" class="presence-sticky-head">Scheduled %</th>
                    </tr>
                    <tr class="presence-group-row">
                      <th colspan="3" class="presence-group-head presence-group-absence">Absence (Hours / Month)</th>
                      <th colspan="3" class="presence-group-head presence-group-scheduled">Scheduled (Hours / Month)</th>
                      <th colspan="2" class="presence-group-head presence-group-other">Other (Hours / Day)</th>
                    </tr>
                    <tr class="presence-detail-row">
                      <th>Planned Off</th>
                      <th>Unplanned Off</th>
                      <th>Leave</th>
                      <th>Meetings</th>
                      <th>Training</th>
                      <th>Coaching</th>
                      <th>Breaks</th>
                      <th>Away</th>
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

            <section class="monthly-focus-card">
              <header class="monthly-focus-header">
                <div>
                  <p class="pane-kicker">Focused month</p>
                  <h4>{{ selectedMonth.fullLabel }} presence / utilization build</h4>
                </div>
                <p>
                  {{ formatPercent(selectedMonth.presencePercent, 1) }} presence x
                  {{ formatPercent(selectedMonth.utilizationPercent, 1) }} utilization =
                  {{ formatPercent(selectedMonth.scheduledPercent, 1) }} scheduled time.
                </p>
              </header>

              <div class="monthly-formula-grid">
                <div class="formula-card">
                  <p class="formula-expression">
                    Paid Hours / Month = {{ formatWhole(selectedMonth.openDays) }} x {{ formatNumber(selectedMonth.paidHoursPerDay, 2) }} = {{ formatNumber(selectedMonth.paidHoursPerMonth, 1) }}
                  </p>
                  <p class="helper-text">Paid hours per day should reflect the full paid day before paid breaks are removed.</p>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Absence Loss Hrs = {{ formatNumber(selectedMonth.plannedTimeOffHours, 1) }} + {{ formatNumber(selectedMonth.unplannedTimeOffHours, 1) }} + {{ formatNumber(selectedMonth.leaveTimeHours, 1) }} = {{ formatNumber(selectedMonth.absenceLossHours, 1) }}
                  </p>
                  <p class="helper-text">Planned time off, unplanned time off, and leave time all live in the monthly absence bucket.</p>
                  <div class="monthly-breakdown-list">
                    <span>Planned time off: {{ formatNumber(selectedMonth.plannedTimeOffHours, 1) }} hrs = {{ formatPercent(selectedMonth.plannedTimeOffPercent, 1) }}</span>
                    <span>Unplanned time off: {{ formatNumber(selectedMonth.unplannedTimeOffHours, 1) }} hrs = {{ formatPercent(selectedMonth.unplannedTimeOffPercent, 1) }}</span>
                    <span>Leave time: {{ formatNumber(selectedMonth.leaveTimeHours, 1) }} hrs = {{ formatPercent(selectedMonth.leaveTimePercent, 1) }}</span>
                  </div>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Presence % = 100 - ({{ formatNumber(selectedMonth.absenceLossHours, 1) }} / {{ formatNumber(selectedMonth.paidHoursPerMonth, 1) }} x 100) = {{ formatPercent(selectedMonth.presencePercent, 1) }}
                  </p>
                  <p class="helper-text">Presence is driven only by the monthly absence bucket in this model.</p>
                  <div class="monthly-breakdown-list">
                    <span>Absence loss: {{ formatNumber(selectedMonth.absenceLossHours, 1) }} hrs = {{ formatPercent(selectedMonth.absenceLossPercent, 1) }}</span>
                    <span>Present hours after absence: {{ formatNumber(selectedMonth.presentHours, 1) }}</span>
                    <span>Presence factor: {{ formatFactor(selectedMonth.presenceFactor) }}</span>
                  </div>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Scheduled Loss Hrs = {{ formatNumber(selectedMonth.meetingsHours, 1) }} + {{ formatNumber(selectedMonth.trainingHours, 1) }} + {{ formatNumber(selectedMonth.coachingHours, 1) }} = {{ formatNumber(selectedMonth.scheduledLossHours, 1) }}
                  </p>
                  <p class="helper-text">Meetings, training, and coaching are treated as scheduled monthly time away from handling work.</p>
                  <div class="monthly-breakdown-list">
                    <span>Meetings: {{ formatNumber(selectedMonth.meetingsHours, 1) }} hrs = {{ formatPercent(selectedMonth.meetingsPercent, 1) }}</span>
                    <span>Training: {{ formatNumber(selectedMonth.trainingHours, 1) }} hrs = {{ formatPercent(selectedMonth.trainingPercent, 1) }}</span>
                    <span>Coaching: {{ formatNumber(selectedMonth.coachingHours, 1) }} hrs = {{ formatPercent(selectedMonth.coachingPercent, 1) }}</span>
                  </div>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Other Loss Hrs = (({{ formatNumber(selectedMonth.paidBreaksHoursPerDay, 2) }} + {{ formatNumber(selectedMonth.otherAwayHoursPerDay, 2) }}) x {{ formatWhole(selectedMonth.openDays) }}) x {{ formatNumber(selectedMonth.presencePercent / 100, 3) }} = {{ formatNumber(selectedMonth.otherLossHours, 1) }}
                  </p>
                  <p class="helper-text">Daily paid breaks and daily other away time are multiplied by open days, then reduced by presence so they only apply to time the agent is actually at work.</p>
                  <div class="monthly-breakdown-list">
                    <span>Paid breaks: {{ formatNumber(selectedMonth.rawPaidBreaksHours, 1) }} raw hrs x {{ formatPercent(selectedMonth.presencePercent, 1) }} = {{ formatNumber(selectedMonth.paidBreaksHours, 1) }} hrs</span>
                    <span>Other away time: {{ formatNumber(selectedMonth.rawOtherAwayHours, 1) }} raw hrs x {{ formatPercent(selectedMonth.presencePercent, 1) }} = {{ formatNumber(selectedMonth.otherAwayHours, 1) }} hrs</span>
                    <span>Other loss total: {{ formatNumber(selectedMonth.otherLossHours, 1) }} hrs = {{ formatPercent(selectedMonth.otherLossPercent, 1) }}</span>
                  </div>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Utilization % = 100 - ({{ formatNumber(selectedMonth.utilizationLossHours, 1) }} / {{ formatNumber(selectedMonth.presentHours, 1) }} x 100) = {{ formatPercent(selectedMonth.utilizationPercent, 1) }}
                  </p>
                  <p class="helper-text">Utilization is driven by scheduled loss plus presence-adjusted daily other loss after absence has already been removed.</p>
                  <div class="monthly-breakdown-list">
                    <span>Scheduled loss: {{ formatNumber(selectedMonth.scheduledLossHours, 1) }} hrs = {{ formatPercent(selectedMonth.scheduledLossPercent, 1) }}</span>
                    <span>Other loss: {{ formatNumber(selectedMonth.otherLossHours, 1) }} hrs = {{ formatPercent(selectedMonth.otherLossPercent, 1) }}</span>
                    <span>Utilization loss total: {{ formatNumber(selectedMonth.utilizationLossHours, 1) }} hrs = {{ formatPercent(selectedMonth.utilizationLossPercent, 1) }}</span>
                    <span>Utilization factor: {{ formatFactor(selectedMonth.utilizationFactor) }}</span>
                  </div>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Scheduled % = {{ formatPercent(selectedMonth.presencePercent, 1) }} x {{ formatPercent(selectedMonth.utilizationPercent, 1) }} = {{ formatPercent(selectedMonth.scheduledPercent, 1) }}
                  </p>
                  <p class="helper-text">Scheduled % is the share of total paid time still available for handling after both presence and utilization losses.</p>
                </div>
              </div>

              <div v-if="[...selectedMonth.presenceWarnings, ...selectedMonth.utilizationWarnings].length" class="monthly-warning-stack">
                <p
                  v-for="warning in [...selectedMonth.presenceWarnings, ...selectedMonth.utilizationWarnings]"
                  :key="warning"
                  class="status-message error"
                >
                  {{ warning }}
                </p>
              </div>
            </section>

            <div class="monthly-tab-actions">
              <button type="button" class="submit-btn" @click="moveTab(1)">Continue to Random</button>
            </div>
          </section>

          <section v-else-if="activeTab === 'random'" class="results-panel monthly-tab-panel">
            <header class="monthly-tab-header">
              <div>
                <p class="pane-kicker">Step 2</p>
                <h3>Add a monthly random-factor buffer</h3>
              </div>
              <p>
                The random factor captures remaining variability that is not already inside the demand forecast or the
                utilization assumption.
              </p>
            </header>

            <div class="monthly-definition-grid">
              <article class="answer-card">
                <h4>Forecast risk</h4>
                <p>Use this when monthly volume and AHT can miss plan even after normal forecasting effort.</p>
              </article>
              <article class="answer-card">
                <h4>Seasonality risk</h4>
                <p>Use this when certain months carry more volatility or mix change than the rest of the year.</p>
              </article>
              <article class="answer-card">
                <h4>Event risk</h4>
                <p>Use this for launches, storms, billing events, policy changes, or other known spikes that can distort the month.</p>
              </article>
            </div>

            <div class="results-metrics monthly-summary-grid">
              <article class="metric-card">
                <p class="metric-label">Average Random Factor</p>
                <p class="metric-value">{{ formatFactor(randomSummary.averageRandomFactor) }}</p>
                <p class="metric-meta">Applied after presence and utilization</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Average Random Buffer</p>
                <p class="metric-value">{{ formatPercent(randomSummary.averageRandomBuffer, 1) }}</p>
                <p class="metric-meta">Forecast + seasonality + event risk</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Highest Buffer Month</p>
                <p class="metric-value">{{ randomSummary.highestBufferMonth.label }}</p>
                <p class="metric-meta">
                  {{ formatPercent(randomSummary.highestBufferMonth.randomBufferPercent, 1) }}
                  total buffer
                </p>
              </article>
            </div>

            <div class="assumption-table-shell">
              <table class="assumption-table assumption-table-random">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Forecast Risk %</th>
                    <th>Seasonality Risk %</th>
                    <th>Event Risk %</th>
                    <th>Random Buffer %</th>
                    <th>Random Factor</th>
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
                        v-model.number="randomMonths[record.monthIndex].forecastRiskPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        aria-label="Forecast risk percent"
                      />
                    </td>
                    <td>
                      <input
                        v-model.number="randomMonths[record.monthIndex].seasonalityRiskPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        aria-label="Seasonality risk percent"
                      />
                    </td>
                    <td>
                      <input
                        v-model.number="randomMonths[record.monthIndex].eventRiskPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        aria-label="Event risk percent"
                      />
                    </td>
                    <td>{{ formatPercent(record.randomBufferPercent, 1) }}</td>
                    <td>{{ formatFactor(record.randomFactor) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <section class="monthly-focus-card">
              <header class="monthly-focus-header">
                <div>
                  <p class="pane-kicker">Focused month</p>
                  <h4>{{ selectedMonth.fullLabel }} random-factor build</h4>
                </div>
                <p>{{ formatPercent(selectedMonth.randomBufferPercent, 1) }} of added risk becomes a {{ formatFactor(selectedMonth.randomFactor) }} multiplier.</p>
              </header>

              <div class="monthly-formula-grid">
                <div class="formula-card">
                  <p class="formula-expression">
                    Random Buffer % = {{ formatNumber(selectedMonth.forecastRiskPercent, 1) }} + {{ formatNumber(selectedMonth.seasonalityRiskPercent, 1) }} + {{ formatNumber(selectedMonth.eventRiskPercent, 1) }}
                  </p>
                  <p class="helper-text">Keep only the variability that remains after normal demand planning and utilization buffers.</p>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Random Factor = 1 + {{ formatNumber(selectedMonth.randomBufferPercent / 100, 3) }} = {{ formatFactor(selectedMonth.randomFactor) }}
                  </p>
                  <p class="helper-text">A 7% random buffer becomes a 1.07x staffing multiplier.</p>
                </div>
              </div>

              <div v-if="selectedMonth.randomWarnings.length" class="monthly-warning-stack">
                <p v-for="warning in selectedMonth.randomWarnings" :key="warning" class="status-message error">
                  {{ warning }}
                </p>
              </div>
            </section>

            <div class="monthly-tab-actions">
              <button type="button" class="secondary-btn" @click="moveTab(-1)">Back to Presence / Utilization</button>
              <button type="button" class="submit-btn" @click="moveTab(1)">Continue to Monthly Plan</button>
            </div>
          </section>

          <section v-else class="results-panel monthly-tab-panel">
            <header class="monthly-tab-header">
              <div>
                <p class="pane-kicker">Step 3</p>
                <h3>Enter call demand and review the full monthly plan</h3>
              </div>
              <p>
                Only contacts and AHT are entered here. Open days, paid hours, presence, utilization, and random factors
                all flow from the earlier steps.
              </p>
            </header>

            <div class="monthly-definition-grid">
              <article class="answer-card">
                <h4>Workload</h4>
                <p>Contacts and AHT create monthly workload hours, which become the required present staffing need.</p>
              </article>
              <article class="answer-card">
                <h4>Staffing chain</h4>
                <p>Show the headcount leaders care about: present need, roster need before random, and budgeted headcount.</p>
              </article>
              <article class="answer-card">
                <h4>Headcount</h4>
                <p>The planner rounds the budgeted monthly requirement up to a whole headcount so leaders can see the staffing ask immediately.</p>
              </article>
            </div>

            <div class="results-metrics monthly-summary-grid">
              <article class="metric-card">
                <p class="metric-label">Peak Headcount</p>
                <p class="metric-value">{{ formatWhole(planSummary.peakMonth.roundedHeadcount) }}</p>
                <p class="metric-meta">{{ planSummary.peakMonth.fullLabel }}</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Average Present Headcount</p>
                <p class="metric-value">{{ formatNumber(planSummary.averagePresentHeadcount, 1) }}</p>
                <p class="metric-meta">Average people needed present to run the workload</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Average Budgeted Headcount</p>
                <p class="metric-value">{{ formatNumber(planSummary.averageBudgetedHeadcount, 1) }}</p>
                <p class="metric-meta">Average monthly budget after random factor</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Annual Workload Hours</p>
                <p class="metric-value">{{ formatWhole(planSummary.annualWorkloadHours) }}</p>
                <p class="metric-meta">{{ planSummary.busiestMonth.fullLabel }} is the busiest month</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Annual Budgeted HC-Months</p>
                <p class="metric-value">{{ formatNumber(planSummary.annualBudgetedHeadcountMonths, 1) }}</p>
                <p class="metric-meta">Sum of monthly budgeted headcount before rounding</p>
              </article>
            </div>

            <div class="formula-card monthly-plan-formula">
              <p class="formula-expression">
                Workload Hours = Contacts x AHT / 3600 | Required Present HC = Workload Hours / (Paid Hours x Utilization)
              </p>
              <p class="formula-expression">
                Budgeted HC = Required Roster HC before Random x Random Factor
              </p>
            </div>

            <div class="assumption-table-shell">
              <table class="assumption-table assumption-table-plan">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Contacts</th>
                    <th>AHT Sec</th>
                    <th>Open Days</th>
                    <th>Presence %</th>
                    <th>Utilization %</th>
                    <th>Random Factor</th>
                    <th>Workload Hours</th>
                    <th>Required Present HC</th>
                    <th>Roster HC Before Random</th>
                    <th>Budgeted HC</th>
                    <th>Rounded HC</th>
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
                    <td>{{ formatPercent(record.presencePercent, 1) }}</td>
                    <td>{{ formatPercent(record.utilizationPercent, 1) }}</td>
                    <td>{{ formatFactor(record.randomFactor) }}</td>
                    <td>{{ formatNumber(record.workloadHours, 1) }}</td>
                    <td>{{ formatNumber(record.requiredPresentHeadcount, 1) }}</td>
                    <td>{{ formatNumber(record.requiredRosterHeadcount, 1) }}</td>
                    <td>{{ formatNumber(record.finalFte, 1) }}</td>
                    <td>{{ formatWhole(record.roundedHeadcount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <section class="monthly-focus-card">
              <header class="monthly-focus-header">
                <div>
                  <p class="pane-kicker">Focused month</p>
                  <h4>{{ selectedMonth.fullLabel }} staffing walkthrough</h4>
                </div>
                <p>{{ formatNumber(selectedMonth.finalFte, 1) }} budgeted heads rounds to {{ formatWhole(selectedMonth.roundedHeadcount) }} people.</p>
              </header>

              <div class="monthly-formula-grid">
                <div class="formula-card">
                  <p class="formula-expression">
                    Workload Hours = {{ formatWhole(selectedMonth.contacts) }} x {{ formatWhole(selectedMonth.ahtSeconds) }} / 3600 = {{ formatNumber(selectedMonth.workloadHours, 1) }}
                  </p>
                  <p class="helper-text">Demand enters the model only here, after the assumptions are already built.</p>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Required Present HC = {{ formatNumber(selectedMonth.workloadHours, 1) }} / ({{ formatNumber(selectedMonth.paidHoursPerMonth, 1) }} x {{ formatNumber(selectedMonth.utilizationPercent / 100, 3) }}) = {{ formatNumber(selectedMonth.requiredPresentHeadcount, 1) }}
                  </p>
                  <p class="helper-text">This is the number of people that need to be present and usable on average to run the monthly workload.</p>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Required Roster HC Before Random = {{ formatNumber(selectedMonth.requiredPresentHeadcount, 1) }} / {{ formatNumber(selectedMonth.presencePercent / 100, 3) }} = {{ formatNumber(selectedMonth.requiredRosterHeadcount, 1) }}
                  </p>
                  <p class="helper-text">This converts present need into rostered headcount before the random-factor buffer is applied.</p>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Budgeted HC = {{ formatNumber(selectedMonth.requiredRosterHeadcount, 1) }} x {{ formatFactor(selectedMonth.randomFactor) }} = {{ formatNumber(selectedMonth.finalFte, 1) }}
                  </p>
                  <p class="helper-text">The random factor is the final budget buffer for forecast risk, seasonality, and event variation.</p>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Expected Average Present HC = {{ formatNumber(selectedMonth.finalFte, 1) }} x {{ formatNumber(selectedMonth.presencePercent / 100, 3) }} = {{ formatNumber(selectedMonth.expectedAveragePresentHeadcount, 1) }}
                  </p>
                  <p class="helper-text">This helps leaders translate the final budget back into the average people likely to be present.</p>
                </div>
                <div class="formula-card">
                  <p class="formula-expression">
                    Audit Math = {{ formatNumber(selectedMonth.workloadHours, 1) }} / {{ formatNumber(selectedMonth.effectiveHoursPerFte, 1) }} = {{ formatNumber(selectedMonth.auditFte, 1) }}
                  </p>
                  <p class="helper-text">
                    Same budgeted answer from a denominator check:
                    paid hours x presence x utilization / random factor.
                  </p>
                </div>
              </div>

              <div v-if="selectedMonth.planWarnings.length" class="monthly-warning-stack">
                <p v-for="warning in selectedMonth.planWarnings" :key="warning" class="status-message error">
                  {{ warning }}
                </p>
              </div>
            </section>

            <section class="monthly-chart-panel">
              <div class="workspace-output-header">
                <h3>Monthly staffing shape</h3>
                <p>Headcount is rounded up from final FTE so leaders can see the staffing ask by month.</p>
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
                  <small>{{ record.label }}</small>
                  <div class="monthly-bar-stack">
                    <div
                      class="monthly-bar-segment monthly-bar-final"
                      :style="{
                        height: `${Math.max((record.finalFte / monthlyBarMax) * 100, record.finalFte > 0 ? 6 : 0)}%`
                      }"
                    ></div>
                  </div>
                  <strong>{{ formatWhole(record.roundedHeadcount) }}</strong>
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
