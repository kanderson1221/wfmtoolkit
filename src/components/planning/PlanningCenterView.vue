<script setup>
import { computed, ref } from 'vue'
import {
  mdiFolderOutline,
  mdiDotsVertical,
  mdiPlus
} from '@mdi/js'

import CallCenterSettingsModal from './CallCenterSettingsModal.vue'
import PlanningGroupSettingsModal from './PlanningGroupSettingsModal.vue'
import PlannerSettingsModal from '../planner/PlannerSettingsModal.vue'
import { createPlanningCenterDraft, createPlanningGroupDraft } from '../../planningStorage'
import {
  getCenterGroups,
  getGroupPlans,
  getAnnualContacts,
  getAnnualRequiredStaffHours,
  getAverageRequiredHeadcount,
  getPeakRequiredHeadcount,
  summarizeGroup
} from '../../planningSummary'
import { currentYear, yearOptions } from '../../composables/monthlyPlanBuilder/shared'
import { computeMonthlyRecords } from '../../planner/demandModel'
import AppButton from '../ui/AppButton.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppIcon from '../ui/AppIcon.vue'
import AppMenu from '../ui/AppMenu.vue'
import AppPanel from '../ui/AppPanel.vue'

const props = defineProps({
  center: {
    type: Object,
    required: true
  },
  selectedGroupId: {
    type: String,
    default: ''
  },
  selectedYear: {
    type: Number,
    default: null
  },
  weekdayOptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['save-center', 'save-group', 'delete-group', 'delete-plan'])

const centerSettingsOpen = ref(false)
const groupSettingsOpen = ref(false)
const planSettingsOpen = ref(false)
const centerDraft = ref(createPlanningCenterDraft(props.center))
const groupDraft = ref(createPlanningGroupDraft())
const newPlanYear = ref(currentYear)

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

const formatPercent = (value, digits = 1) => `${formatNumber(value, digits)}%`

const planComparisonGridClass =
  'grid min-w-0 grid-cols-[minmax(6.5rem,0.95fr)_repeat(6,minmax(5.75rem,0.72fr))] items-center'

const planListRowGridClass = 'grid grid-cols-[auto_minmax(0,1fr)_8.25rem] items-center gap-2'

const buildGroupHref = (group, planningYear = null) => {
  const resolvedYear = Number(planningYear) || Number(group?.latestPlanYear) || currentYear
  return `#planning/center/${props.center.id}/group/${group.id}/year/${resolvedYear}`
}

const sortedPlansForGroup = (group) =>
  [...getGroupPlans(group)].sort((left, right) => Number(right.planningYear || 0) - Number(left.planningYear || 0))

const groupRows = computed(() =>
  getCenterGroups(props.center).map((group) => {
    const summary = summarizeGroup(group)
    const plans = sortedPlansForGroup(group)
    const latestPlan = plans[0] || null
    const latestPlanYear = latestPlan?.planningYear || null

    return {
      ...group,
      summary,
      plans,
      latestPlanYear,
      selectionHref: buildGroupHref(
        { ...group, latestPlanYear },
        props.selectedGroupId === group.id ? props.selectedYear : latestPlanYear
      )
    }
  })
)

const selectedGroup = computed(() => {
  if (!groupRows.value.length) {
    return null
  }

  return groupRows.value.find((group) => group.id === props.selectedGroupId) || groupRows.value[0]
})

const resolveNextPlanYear = (group = selectedGroup.value) => {
  const usedYears = new Set((group?.plans || []).map((plan) => Number(plan.planningYear)))
  let candidateYear = currentYear

  while (usedYears.has(candidateYear)) {
    candidateYear += 1
  }

  return candidateYear
}

const availableYearOptions = computed(() => {
  const yearSet = new Set(yearOptions)

  selectedGroup.value?.plans.forEach((plan) => {
    if (plan?.planningYear) {
      yearSet.add(Number(plan.planningYear))
    }
  })

  if (props.selectedYear) {
    yearSet.add(Number(props.selectedYear))
  }

  if (newPlanYear.value) {
    yearSet.add(Number(newPlanYear.value))
  }

  return [...yearSet]
    .sort((left, right) => right - left)
    .map((year) => ({
      label: String(year),
      value: year
    }))
})

const selectedYearModel = computed({
  get: () => {
    if (!selectedGroup.value) {
      return currentYear
    }

    const routeYear = Number(props.selectedYear)
    if (selectedGroup.value.id === props.selectedGroupId && Number.isFinite(routeYear) && routeYear > 0) {
      return routeYear
    }

    return Number(selectedGroup.value.latestPlanYear) || currentYear
  },
  set: (value) => {
    if (!selectedGroup.value) {
      return
    }

    window.location.hash = buildGroupHref(selectedGroup.value, Number(value) || currentYear)
  }
})

const summarizeAvailability = (plan) => {
  const summary = plan?.summary || {}

  if (
    typeof summary.averagePresencePercent === 'number' &&
    typeof summary.averageUtilizationPercent === 'number'
  ) {
    return {
      averagePresencePercent: summary.averagePresencePercent,
      averageUtilizationPercent: summary.averageUtilizationPercent
    }
  }

  const monthlyRecords = computeMonthlyRecords({
    planningYear: Number(plan?.planningYear) || currentYear,
    operatingWeekdays: Array.isArray(plan?.operatingWeekdays) ? plan.operatingWeekdays : [1, 2, 3, 4, 5],
    presenceMonths: Array.isArray(plan?.presenceMonths) ? plan.presenceMonths : [],
    randomDefaults: plan?.randomDefaults || {},
    useMonthlyRandomOverrides: Boolean(plan?.useMonthlyRandomOverrides),
    randomMonths: Array.isArray(plan?.randomMonths) ? plan.randomMonths : [],
    planMonths: Array.isArray(plan?.planMonths) ? plan.planMonths : []
  })

  if (!monthlyRecords.length) {
    return {
      averagePresencePercent: 0,
      averageUtilizationPercent: 0
    }
  }

  return {
    averagePresencePercent:
      monthlyRecords.reduce((sum, record) => sum + (Number(record.presencePercent) || 0), 0) / monthlyRecords.length,
    averageUtilizationPercent:
      monthlyRecords.reduce((sum, record) => sum + (Number(record.utilizationPercent) || 0), 0) / monthlyRecords.length
  }
}

const planRows = computed(() =>
  (selectedGroup.value?.plans || []).map((plan) => {
    const availability = summarizeAvailability(plan)

    return {
      ...plan,
      annualContacts: getAnnualContacts(plan),
      neededStaffHours: getAnnualRequiredStaffHours(plan),
      averageRequiredHeadcount: getAverageRequiredHeadcount(plan),
      averagePresencePercent: availability.averagePresencePercent,
      averageUtilizationPercent: availability.averageUtilizationPercent,
      peakRequiredHeadcount: getPeakRequiredHeadcount(plan),
      openHref: `#planning/center/${props.center.id}/group/${selectedGroup.value.id}/plan/${plan.id}`,
      isSelectedYear: Number(plan.planningYear) === Number(selectedYearModel.value)
    }
  })
)

const operatingDayLabel = computed(() =>
  props.weekdayOptions
    .filter((weekday) => selectedGroup.value?.operatingWeekdays?.includes(weekday.value))
    .map((weekday) => weekday.label)
    .join(', ') || 'No operating days selected'
)

const selectedGroupDefaults = computed(() => {
  if (!selectedGroup.value) {
    return []
  }

  return [
    { label: 'Operating Days', value: operatingDayLabel.value },
    { label: 'Paid Hours / Day', value: formatNumber(selectedGroup.value.defaultPaidHoursPerDay, 1) },
    { label: 'Default Occupancy', value: `${formatNumber(selectedGroup.value.defaultOccupancyPercent, 1)}%` },
    { label: 'Default Adherence', value: `${formatNumber(selectedGroup.value.defaultAdherencePercent, 1)}%` }
  ]
})

const createPlanHref = computed(() => {
  if (!selectedGroup.value) {
    return ''
  }

  return `#planning/center/${props.center.id}/group/${selectedGroup.value.id}/plan/new/year/${newPlanYear.value}`
})

const existingPlanForDraftYear = computed(() => {
  if (!selectedGroup.value) {
    return null
  }

  return selectedGroup.value.plans.find((plan) => Number(plan.planningYear) === Number(newPlanYear.value)) || null
})

const existingPlanHref = computed(() => {
  if (!selectedGroup.value || !existingPlanForDraftYear.value) {
    return ''
  }

  return `#planning/center/${props.center.id}/group/${selectedGroup.value.id}/plan/${existingPlanForDraftYear.value.id}`
})

const openCenterSettings = () => {
  centerDraft.value = createPlanningCenterDraft(props.center)
  centerSettingsOpen.value = true
}

const closeCenterSettings = () => {
  centerSettingsOpen.value = false
}

const saveCenter = () => {
  emit('save-center', {
    ...props.center,
    ...centerDraft.value
  })
  centerSettingsOpen.value = false
}

const openCreateGroup = () => {
  groupDraft.value = createPlanningGroupDraft()
  groupSettingsOpen.value = true
}

const openPlanSettings = () => {
  if (!selectedGroup.value) {
    return
  }

  newPlanYear.value = resolveNextPlanYear(selectedGroup.value)
  planSettingsOpen.value = true
}

const closePlanSettings = () => {
  planSettingsOpen.value = false
}

const createPlan = () => {
  if (!selectedGroup.value || existingPlanForDraftYear.value) {
    return
  }

  planSettingsOpen.value = false
  window.location.hash = createPlanHref.value
}

const navigateToHash = (href) => {
  if (!href) {
    return
  }

  window.location.hash = href
}

const selectPlanYear = (planningYear) => {
  selectedYearModel.value = Number(planningYear) || currentYear
}

const openEditGroup = (group = selectedGroup.value) => {
  if (!group) {
    return
  }

  groupDraft.value = createPlanningGroupDraft(group)
  groupSettingsOpen.value = true
}

const closeGroupSettings = () => {
  groupSettingsOpen.value = false
}

const saveGroup = () => {
  emit('save-group', {
    ...groupDraft.value
  })
  groupSettingsOpen.value = false
}

const confirmDeleteGroup = (group) => {
  const confirmed = window.confirm(
    `Delete staffing group "${group.name}"? This removes the group and all ${group.summary.planCount} plan${group.summary.planCount === 1 ? '' : 's'} inside it.`
  )

  if (!confirmed) {
    return
  }

  emit('delete-group', {
    centerId: props.center.id,
    groupId: group.id
  })
}

const confirmDeletePlan = (plan) => {
  const confirmed = window.confirm(
    `Delete the ${plan.planningYear} plan from staffing group "${selectedGroup.value?.name}"?`
  )

  if (!confirmed || !selectedGroup.value) {
    return
  }

  emit('delete-plan', {
    centerId: props.center.id,
    groupId: selectedGroup.value.id,
    planId: plan.id,
    planningYear: Number(plan.planningYear)
  })
}

const groupMenuItems = [
  {
    id: 'edit-group',
    label: 'Edit'
  },
  {
    id: 'delete-group',
    label: 'Delete'
  }
]

const planMenuItems = [
  {
    id: 'delete-plan',
    label: 'Delete'
  }
]

const handleGroupMenuSelect = (group, item) => {
  if (item.id === 'edit-group') {
    openEditGroup(group)
    return
  }

  if (item.id === 'delete-group') {
    confirmDeleteGroup(group)
  }
}

const handlePlanMenuSelect = (plan, item) => {
  if (item.id === 'delete-plan') {
    confirmDeletePlan(plan)
  }
}
</script>

<template>
  <section class="bg-slate-50/80 py-3 md:py-4">
    <div class="app-frame grid gap-3">
      <div class="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-0.5">
          <a href="#planning" class="planning-breadcrumb-link">
            Call Centers
          </a>
          <h1 class="text-[clamp(1.35rem,1.8vw,1.75rem)] font-semibold tracking-[-0.04em] text-slate-950">
            {{ props.center.name }}
          </h1>
        </div>

        <AppButton size="sm" variant="secondary" @click="openCenterSettings">Edit Center</AppButton>
      </div>

      <AppPanel :padded="false">
        <div class="grid h-[calc(100vh-11rem)] min-h-[38rem] xl:grid-cols-[320px_minmax(0,1fr)] xl:items-stretch">
          <div class="flex min-h-0 flex-col border-b border-slate-200 xl:border-b-0 xl:border-r">
            <div class="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-5 py-3.5 xl:h-[8.75rem]">
              <div class="flex h-full flex-col justify-between gap-2.5">
                <h2 class="text-xl font-semibold tracking-[-0.04em] text-slate-950">
                  Staffing Groups
                </h2>

                <AppButton
                  size="sm"
                  :icon="mdiPlus"
                  variant="primary"
                  @click="openCreateGroup"
                >
                  New Group
                </AppButton>
              </div>
            </div>

            <div v-if="!groupRows.length" class="min-h-0 overflow-y-auto p-5">
              <AppEmptyState
                title="Create the first staffing group"
                description="Start a staffing group for each team or queue you plan separately inside this call center."
              />
            </div>

            <div v-else class="min-h-0 overflow-y-auto">
              <div class="divide-y divide-slate-200">
                <div
                  v-for="group in groupRows"
                  :key="group.id"
                  class="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                  :class="selectedGroup?.id === group.id ? 'bg-sky-50/70' : 'bg-white hover:bg-slate-50/70'"
                  tabindex="0"
                  role="link"
                  @click="navigateToHash(group.selectionHref)"
                  @keydown.enter.prevent="navigateToHash(group.selectionHref)"
                  @keydown.space.prevent="navigateToHash(group.selectionHref)"
                >
                  <span
                    class="h-9 w-1 rounded-full transition"
                    :class="selectedGroup?.id === group.id ? 'bg-sky-600' : 'bg-transparent'"
                    aria-hidden="true"
                  />

                  <div
                    class="flex min-w-0 items-center gap-3 rounded-[16px] px-2 py-1.5"
                    :aria-label="`Select staffing group ${group.name}`"
                  >
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] bg-slate-100 text-slate-600">
                      <AppIcon :path="mdiFolderOutline" class="h-4 w-4" />
                    </span>

                    <span class="grid min-w-0">
                      <strong class="truncate text-sm font-semibold text-slate-950">{{ group.name }}</strong>
                    </span>
                  </div>

                  <div @click.stop @keydown.stop>
                    <AppMenu
                      :items="groupMenuItems"
                      :trigger-icon="mdiDotsVertical"
                      :trigger-label="`Open actions for staffing group ${group.name}`"
                      compact
                      trigger-variant="icon-quiet"
                      @select="handleGroupMenuSelect(group, $event)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex min-h-0 flex-col bg-slate-50/30">
            <div v-if="selectedGroup" class="flex min-h-0 flex-col">
              <div class="border-b border-slate-200 px-5 py-3.5 xl:h-[8.75rem]">
                <div class="flex h-full flex-col justify-between gap-2">
                  <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <h2 class="text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      Annual Plans
                    </h2>

                    <AppButton
                      size="sm"
                      variant="primary"
                      :icon="mdiPlus"
                      :aria-label="`Create a new plan for ${selectedGroup.name}`"
                      @click="openPlanSettings"
                    >
                      New Plan
                    </AppButton>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <div
                      v-for="item in selectedGroupDefaults"
                      :key="item.label"
                      class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                    >
                      <span class="mr-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {{ item.label }}
                      </span>
                      <strong class="font-semibold text-slate-950">{{ item.value }}</strong>
                    </div>
                  </div>

                  <div v-if="planRows.length" :class="[planListRowGridClass, 'pt-0.5']">
                    <span class="h-9 w-1" aria-hidden="true" />

                    <div :class="[planComparisonGridClass, 'px-2']">
                      <span class="truncate px-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Plan Year
                      </span>
                      <span class="truncate px-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Contacts
                      </span>
                      <span class="truncate px-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Staff Hours
                      </span>
                      <span class="truncate px-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Presence %
                      </span>
                      <span class="truncate px-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Utilization %
                      </span>
                      <span class="truncate px-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Peak HC
                      </span>
                      <span class="truncate px-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Avg HC
                      </span>
                    </div>

                    <div class="pr-2 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Actions
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="planRows.length" class="min-h-0 overflow-y-auto">
                <div class="divide-y divide-slate-200">
                  <div
                    v-for="plan in planRows"
                    :key="plan.id"
                    :class="[planListRowGridClass, 'cursor-pointer px-3 py-2.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200', plan.isSelectedYear ? 'bg-sky-50/70' : 'bg-white hover:bg-slate-50/70']"
                    tabindex="0"
                    role="button"
                    :aria-label="`Select ${plan.planningYear} plan for ${selectedGroup.name}`"
                    @click="selectPlanYear(plan.planningYear)"
                    @dblclick="navigateToHash(plan.openHref)"
                    @keydown.enter.prevent="navigateToHash(plan.openHref)"
                    @keydown.space.prevent="selectPlanYear(plan.planningYear)"
                  >
                    <span
                      class="h-9 w-1 rounded-full transition"
                      :class="plan.isSelectedYear ? 'bg-sky-600' : 'bg-transparent'"
                      aria-hidden="true"
                    />

                    <div :class="[planComparisonGridClass, 'rounded-[16px] px-2 py-1.5 text-sm']">
                      <span class="px-3">
                        <span class="inline-flex min-w-[4.25rem] items-center justify-center rounded-[16px] bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                          {{ plan.planningYear }}
                        </span>
                      </span>
                      <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                        {{ formatWhole(plan.annualContacts) }}
                      </span>
                      <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                        {{ formatWhole(plan.neededStaffHours) }}
                      </span>
                      <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                        {{ formatPercent(plan.averagePresencePercent, 1) }}
                      </span>
                      <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                        {{ formatPercent(plan.averageUtilizationPercent, 1) }}
                      </span>
                      <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                        {{ formatNumber(plan.peakRequiredHeadcount, 1) }}
                      </span>
                      <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                        {{ formatNumber(plan.averageRequiredHeadcount, 1) }}
                      </span>
                    </div>

                    <div class="flex items-center justify-end gap-1.5 whitespace-nowrap" @click.stop @keydown.stop>
                      <AppButton
                        size="sm"
                        variant="quiet"
                        :href="plan.openHref"
                        :aria-label="`Open ${plan.planningYear} plan for ${selectedGroup.name}`"
                      >
                        Open
                      </AppButton>
                      <AppMenu
                        :items="planMenuItems"
                        :trigger-icon="mdiDotsVertical"
                        :trigger-label="`Open actions for ${plan.planningYear} plan`"
                        compact
                        trigger-variant="icon-quiet"
                        @select="handlePlanMenuSelect(plan, $event)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="min-h-0 overflow-y-auto p-5">
                <AppEmptyState
                  title="No plans yet"
                  :description="`Use New Plan to create the first saved plan for ${selectedGroup.name}.`"
                />
              </div>
            </div>

            <div v-else class="min-h-0 overflow-y-auto p-5">
              <AppEmptyState
                title="Select a staffing group"
                description="Choose a staffing group from the left to review its defaults and manage yearly plans."
              />
            </div>
          </div>
        </div>
      </AppPanel>
    </div>

    <CallCenterSettingsModal
      v-if="centerSettingsOpen"
      v-model:center-name="centerDraft.name"
      v-model:timezone="centerDraft.timezone"
      title="Edit Call Center"
      submit-label="Save Call Center"
      @close="closeCenterSettings"
      @save="saveCenter"
    />

    <PlanningGroupSettingsModal
      v-if="groupSettingsOpen"
      v-model:group-name="groupDraft.name"
      v-model:operating-weekdays="groupDraft.operatingWeekdays"
      v-model:default-paid-hours-per-day="groupDraft.defaultPaidHoursPerDay"
      v-model:default-occupancy-percent="groupDraft.defaultOccupancyPercent"
      v-model:default-adherence-percent="groupDraft.defaultAdherencePercent"
      :weekday-options="props.weekdayOptions"
      :title="groupDraft.id ? 'Edit Staffing Group' : 'Create Staffing Group'"
      :submit-label="groupDraft.id ? 'Save Staffing Group' : 'Create Staffing Group'"
      @close="closeGroupSettings"
      @save="saveGroup"
    />

    <PlannerSettingsModal
      v-if="planSettingsOpen && selectedGroup"
      v-model:planning-year="newPlanYear"
      :year-options="availableYearOptions"
      :can-close="!existingPlanForDraftYear"
      :existing-plan-href="existingPlanHref"
      :status-message="existingPlanForDraftYear ? `This staffing group already has a saved plan for ${newPlanYear}.` : ''"
      status-tone="warning"
      title="New Plan"
      description="Choose the planning year for the new plan. Each staffing group can have only one saved plan per year."
      submit-label="Create Plan"
      @cancel="closePlanSettings"
      @close="createPlan"
    />
  </section>
</template>
