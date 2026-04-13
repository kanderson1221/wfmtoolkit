<script setup>
import { computed, ref, toRef, watch } from 'vue'
import {
  mdiChartLineVariant,
  mdiFolderOutline,
  mdiDotsVertical,
  mdiPlus
} from '@mdi/js'

import PlanningForecastCreateModal from './PlanningForecastCreateModal.vue'
import PlanningGroupSettingsModal from './PlanningGroupSettingsModal.vue'
import PlannerSettingsModal from '../planner/PlannerSettingsModal.vue'
import {
  buildPlanningGroupNewForecastHash,
  buildPlanningGroupForecastsHash,
  navigateToHash
} from '../../appRoutes'
import { createPlanningGroupDraft } from '../../planningStorage'
import { currentYear, yearOptions } from '../../composables/monthlyPlanBuilder/shared'
import { usePlanningCenterForecastLibrary } from '../../composables/planning/usePlanningCenterForecastLibrary'
import { usePlanningCenterWorkspace } from '../../composables/planning/usePlanningCenterWorkspace'
import {
  FORECAST_TYPE_BUDGET
} from '../../forecasting/shared'
import AppAttachedTabs from '../ui/AppAttachedTabs.vue'
import AppButton from '../ui/AppButton.vue'
import AppBreadcrumbs from '../ui/AppBreadcrumbs.vue'
import AppConfirmDialog from '../ui/AppConfirmDialog.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppIcon from '../ui/AppIcon.vue'
import AppMenu from '../ui/AppMenu.vue'
import AppPanel from '../ui/AppPanel.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import { useConfirmDialog } from '../../composables/useConfirmDialog'

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
  storageScope: {
    type: String,
    default: 'default'
  },
  storageRefreshToken: {
    type: Number,
    default: 0
  },
  weekdayOptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['save-group', 'delete-group', 'delete-plan'])

const groupSettingsOpen = ref(false)
const planSettingsOpen = ref(false)
const forecastCreateOpen = ref(false)
const groupDraft = ref(createPlanningGroupDraft())
const newPlanYear = ref(currentYear)
const newForecastSourceKind = ref('')
const newForecastYear = ref('')
const {
  dialogVisible: confirmationDialogOpen,
  dialogTitle: confirmationDialogTitle,
  dialogDescription: confirmationDialogDescription,
  dialogConfirmLabel: confirmationDialogConfirmLabel,
  requestConfirmation,
  confirmPendingAction: runPendingConfirmation
} = useConfirmDialog()
const activeGroupWorkspaceTab = ref('forecasts')
const selectedForecastId = ref('')

const planComparisonGridClass =
  'grid min-w-0 grid-cols-[minmax(6rem,0.82fr)_minmax(5.5rem,0.68fr)_minmax(6rem,0.76fr)_minmax(5.5rem,0.68fr)_minmax(6rem,0.72fr)_minmax(8.25rem,1fr)_minmax(8.25rem,1fr)] items-center'
const forecastComparisonGridClass =
  'grid min-w-0 grid-cols-[minmax(6rem,0.82fr)_minmax(9.5rem,1fr)_minmax(7.25rem,0.8fr)_minmax(6rem,0.72fr)_minmax(6rem,0.72fr)_minmax(6.75rem,0.78fr)_minmax(6.75rem,0.8fr)_minmax(8.75rem,1fr)] items-center'

const planListRowGridClass = 'grid grid-cols-[auto_minmax(0,1fr)_8.25rem] items-center gap-2'
const forecastListRowGridClass = 'grid grid-cols-[auto_minmax(0,1fr)_8.25rem] items-center gap-2'
const planHeaderCellClass =
  'px-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap'
const planHeaderCellRightClass = `${planHeaderCellClass} text-right`
const STAFFING_GROUP_TABS = [
  { id: 'forecasts', label: 'Forecasts' },
  { id: 'plans', label: 'Plans' }
]
const {
  availableYearOptions,
  breadcrumbItems,
  createPlanHref,
  existingPlanForDraftYear,
  existingPlanHref,
  formatNumber,
  formatPercent,
  formatWhole,
  groupRows,
  planRows,
  resolveNextPlanYear,
  selectedGroup,
  selectedGroupDefaults,
  selectedGroupForecastWorkspaceHref,
  selectedYearModel
} = usePlanningCenterWorkspace({
  center: toRef(props, 'center'),
  selectedGroupId: toRef(props, 'selectedGroupId'),
  selectedYear: toRef(props, 'selectedYear'),
  weekdayOptions: toRef(props, 'weekdayOptions'),
  newPlanYear
})

const {
  deleteForecast,
  forecastRows,
  forecastStatusTone,
  forecastsError,
  forecastsLoading
} = usePlanningCenterForecastLibrary({
  center: toRef(props, 'center'),
  selectedGroup,
  storageScope: toRef(props, 'storageScope'),
  storageRefreshToken: toRef(props, 'storageRefreshToken')
})

const openCreateGroup = () => {
  groupDraft.value = createPlanningGroupDraft({
    operatingWeekdays: props.center.operatingWeekdays
  })
  groupSettingsOpen.value = true
}

const openPlanSettings = () => {
  if (!selectedGroup.value) {
    return
  }

  newPlanYear.value = resolveNextPlanYear(selectedGroup.value)
  planSettingsOpen.value = true
}

const openForecastCreate = () => {
  if (!selectedGroup.value) {
    return
  }

  newForecastSourceKind.value = ''
  newForecastYear.value = ''
  selectedForecastId.value = ''
  forecastCreateOpen.value = true
}

const closePlanSettings = () => {
  planSettingsOpen.value = false
}

const closeForecastCreate = () => {
  forecastCreateOpen.value = false
}

const createPlan = () => {
  if (!selectedGroup.value || existingPlanForDraftYear.value) {
    return
  }

  planSettingsOpen.value = false
  navigateToHash(createPlanHref.value)
}

const forecastYearOptions = computed(() => {
  const yearSet = new Set(yearOptions.map((year) => Number(year)))

  if (Number(selectedYearModel.value) > 0) {
    yearSet.add(Number(selectedYearModel.value))
  }

  ;(selectedGroup.value?.plans || []).forEach((plan) => {
    const planningYear = Number(plan?.planningYear)
    if (planningYear > 0) {
      yearSet.add(planningYear)
    }
  })

  return [...yearSet]
    .filter((year) => Number.isInteger(year) && year > 0)
    .sort((left, right) => right - left)
    .map((year) => ({
      label: String(year),
      value: year
    }))
})

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
    ...groupDraft.value,
    operatingWeekdays: props.center.operatingWeekdays
  })
  groupSettingsOpen.value = false
}

const confirmDeleteGroup = (group) => {
  requestConfirmation({
    title: 'Delete Staffing Group?',
    description: `Delete staffing group "${group.name}"? This removes the group and all ${group.summary.planCount} plan${group.summary.planCount === 1 ? '' : 's'} inside it.`,
    confirmLabel: 'Delete Staffing Group',
    onConfirm: () => {
      emit('delete-group', {
        centerId: props.center.id,
        groupId: group.id
      })
    }
  })
}

const confirmDeletePlan = (plan) => {
  if (!selectedGroup.value) {
    return
  }

  const groupId = selectedGroup.value.id
  const groupName = selectedGroup.value.name

  requestConfirmation({
    title: 'Delete Plan?',
    description: `Delete the ${plan.planningYear} plan from staffing group "${groupName}"?`,
    confirmLabel: 'Delete Plan',
    onConfirm: () => {
      emit('delete-plan', {
        centerId: props.center.id,
        groupId,
        planId: plan.id,
        planningYear: Number(plan.planningYear)
      })
    }
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

const buildForecastMenuItems = (forecast) => {
  return [
    {
      id: 'delete-forecast',
      label: 'Delete'
    }
  ]
}

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

const selectForecast = (forecastId) => {
  selectedForecastId.value = String(forecastId || '').trim()
}

const buildForecastOpenHref = (forecast) => {
  if (!selectedGroup.value) {
    return selectedGroupForecastWorkspaceHref.value
  }

  const planningYear = Number(forecast?.planningYear) || Number(selectedYearModel.value) || currentYear

  return buildPlanningGroupForecastsHash(
    props.center.id,
    selectedGroup.value.id,
    planningYear,
    forecast?.id
  )
}

const openForecast = (forecast) => {
  selectForecast(forecast?.id)
  navigateToHash(buildForecastOpenHref(forecast))
}

const canCreateForecast = computed(() => {
  const planningYear = Number(newForecastYear.value)

  if (
    !selectedGroup.value ||
    !newForecastSourceKind.value ||
    !Number.isInteger(planningYear) ||
    planningYear <= 0
  ) {
    return false
  }
  return true
})

const createForecast = () => {
  if (!selectedGroup.value || !canCreateForecast.value) {
    return
  }

  const planningYear = Number(newForecastYear.value)

  forecastCreateOpen.value = false
  selectedForecastId.value = ''
  navigateToHash(
    buildPlanningGroupNewForecastHash(props.center.id, selectedGroup.value.id, planningYear, {
      sourceKind: newForecastSourceKind.value,
      forecastType: FORECAST_TYPE_BUDGET
    })
  )
}

const confirmDeleteForecast = (forecast) => {
  requestConfirmation({
    title: 'Delete Forecast?',
    description: `Delete the saved forecast "${forecast.name}" from ${selectedGroup.value?.name || 'this staffing group'}?`,
    confirmLabel: 'Delete Forecast',
    onConfirm: () => {
      void deleteForecast(forecast)
    }
  })
}

const handleForecastMenuSelect = (forecast, item) => {
  if (item.id === 'delete-forecast') {
    confirmDeleteForecast(forecast)
  }
}

watch(
  [selectedGroup, forecastRows],
  ([group, rows]) => {
    if (!group) {
      selectedForecastId.value = ''
      return
    }

    if (rows.some((forecast) => forecast.id === selectedForecastId.value)) {
      return
    }

    selectedForecastId.value = rows[0]?.id || ''
  },
  { immediate: true }
)

</script>

<template>
  <section class="bg-slate-50/80 py-2">
    <div class="app-frame grid gap-2.5">
      <div class="flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-0.5">
          <AppBreadcrumbs :items="breadcrumbItems" />
          <h1 class="text-[clamp(1.35rem,1.8vw,1.75rem)] font-semibold tracking-[-0.04em] text-slate-950">
            {{ props.center.name }}
          </h1>
        </div>
      </div>

      <AppPanel :padded="false">
        <div class="grid h-[calc(100vh-12.5rem)] min-h-[36rem] xl:grid-cols-[320px_minmax(0,1fr)] xl:items-stretch">
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
                  class="grid h-16 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 px-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d2df]"
                  :class="selectedGroup?.id === group.id ? 'bg-[#e7eef4]' : 'bg-white hover:bg-slate-50/70'"
                  tabindex="0"
                  role="link"
                  @click="navigateToHash(group.selectionHref)"
                  @keydown.enter.prevent="navigateToHash(group.selectionHref)"
                  @keydown.space.prevent="navigateToHash(group.selectionHref)"
                >
                  <span
                    class="h-9 w-1 rounded-full transition"
                    :class="selectedGroup?.id === group.id ? 'bg-[#15395f]' : 'bg-transparent'"
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
                      <strong
                        class="truncate text-sm font-semibold"
                        :class="selectedGroup?.id === group.id ? 'text-[#15395f]' : 'text-slate-950'"
                      >
                        {{ group.name }}
                      </strong>
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
                    <div class="grid gap-1">
                      <h2 class="text-xl font-semibold tracking-[-0.04em] text-slate-950">
                        {{ selectedGroup.name }}
                      </h2>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      <template v-if="activeGroupWorkspaceTab === 'forecasts'">
                        <AppButton
                          size="sm"
                          variant="primary"
                          :icon="mdiChartLineVariant"
                          :aria-label="`Create a new forecast for ${selectedGroup.name}`"
                          @click="openForecastCreate"
                        >
                          New Forecast
                        </AppButton>
                      </template>

                      <AppButton
                        v-else
                        size="sm"
                        variant="primary"
                        :icon="mdiPlus"
                        :aria-label="`Create a new plan for ${selectedGroup.name}`"
                        @click="openPlanSettings"
                      >
                        New Plan
                      </AppButton>
                    </div>
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
                </div>
              </div>

              <div class="bg-white pr-5 pt-0">
                <AppAttachedTabs
                  v-model:active-id="activeGroupWorkspaceTab"
                  :items="STAFFING_GROUP_TABS"
                  aria-label="Staffing group workspace sections"
                  tab-width-class="w-[9.5rem]"
                />
              </div>

              <div v-if="activeGroupWorkspaceTab === 'forecasts'" class="flex-1 min-h-0 overflow-y-auto">
                <div v-if="forecastsLoading || forecastsError || !forecastRows.length" class="grid gap-4 p-5">
                  <AppStatusMessage v-if="forecastsLoading">
                    Loading saved forecasts for {{ selectedGroup.name }}.
                  </AppStatusMessage>

                  <AppStatusMessage v-else-if="forecastsError" :tone="forecastStatusTone">
                    {{ forecastsError }}
                  </AppStatusMessage>

                  <AppEmptyState
                    v-if="!forecastRows.length"
                    title="No forecasts yet"
                    :description="`Create the first saved forecast for ${selectedGroup.name}. Forecasts stay owned by this staffing group and plans can import the monthly rollup later.`"
                  />
                </div>

                <div v-else class="grid gap-0">
                    <div class="border-b border-slate-200 bg-white/80 px-3 py-3">
                      <div :class="forecastListRowGridClass">
                        <span class="h-9 w-1" aria-hidden="true" />

                        <div :class="[forecastComparisonGridClass, 'px-2']">
                          <span :class="planHeaderCellClass">
                            Plan Year
                          </span>
                          <span :class="planHeaderCellClass">
                            Type
                          </span>
                          <span :class="planHeaderCellClass">
                            Source
                          </span>
                          <span :class="planHeaderCellRightClass">
                            Coverage
                          </span>
                          <span :class="planHeaderCellRightClass">
                            Contacts
                          </span>
                          <span :class="planHeaderCellRightClass">
                            Peak Month
                          </span>
                          <span :class="planHeaderCellRightClass">
                            Used By
                          </span>
                          <span :class="planHeaderCellRightClass">
                            Last Run
                          </span>
                        </div>

                        <div class="pr-2 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Actions
                        </div>
                      </div>
                    </div>

                    <div class="divide-y divide-slate-200">
                      <div
                        v-for="forecast in forecastRows"
                        :key="forecast.id"
                        :class="[
                          forecastListRowGridClass,
                          'h-16 cursor-pointer px-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d2df]',
                          selectedForecastId === forecast.id ? 'bg-[#e7eef4]' : 'bg-white hover:bg-slate-50/70'
                        ]"
                        tabindex="0"
                        role="button"
                        :aria-label="`Select ${forecast.displayName} for ${selectedGroup.name}`"
                        @click="selectForecast(forecast.id)"
                        @dblclick="openForecast(forecast)"
                        @keydown.enter.prevent="openForecast(forecast)"
                        @keydown.space.prevent="selectForecast(forecast.id)"
                      >
                        <span
                          class="h-9 w-1 rounded-full"
                          :class="selectedForecastId === forecast.id ? 'bg-[#15395f]' : 'bg-transparent'"
                          aria-hidden="true"
                        />

                        <div :class="[forecastComparisonGridClass, 'rounded-[16px] px-2 py-1.5 text-sm']">
                          <span class="px-3">
                            <span class="inline-flex min-w-[4.25rem] items-center justify-center rounded-[16px] bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                              {{ forecast.planningYearLabel || '—' }}
                            </span>
                          </span>
                          <div class="grid gap-0.5 px-3">
                            <span class="truncate text-slate-950">
                              {{ forecast.displayName }}
                            </span>
                            <span
                              v-if="!forecast.readyForPlanning"
                              class="text-[0.78rem] text-slate-500"
                            >
                              {{ forecast.historyRangeLabel }}
                            </span>
                          </div>
                          <span class="px-3">
                            <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-600">
                              {{ forecast.sourceKindLabel }}
                            </span>
                          </span>
                          <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                            {{ forecast.monthlyCoverageLabel }}
                          </span>
                          <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                            {{ forecast.projectedContactsLabel }}
                          </span>
                          <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                            {{ forecast.peakMonthLabel }}
                          </span>
                          <span
                            class="truncate px-3 text-right font-medium text-slate-700"
                            :title="forecast.usedByTitle"
                            :class="forecast.usedByLabel === 'Not used' ? 'text-slate-500' : 'text-slate-700'"
                          >
                            {{ forecast.usedByLabel }}
                          </span>
                          <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                            {{ forecast.runAtLabel }}
                          </span>
                        </div>

                        <div class="flex items-center justify-end gap-1.5 whitespace-nowrap" @click.stop @keydown.stop>
                          <AppButton
                            size="sm"
                            variant="quiet"
                            :href="buildForecastOpenHref(forecast)"
                            :aria-label="`Open ${forecast.displayName} for ${selectedGroup.name}`"
                          >
                            Open
                          </AppButton>
                          <AppMenu
                            :items="buildForecastMenuItems(forecast)"
                            :trigger-icon="mdiDotsVertical"
                            :trigger-label="`Open actions for forecast ${forecast.name}`"
                            compact
                            trigger-variant="icon-quiet"
                            @select="handleForecastMenuSelect(forecast, $event)"
                          />
                        </div>
                      </div>
                    </div>
                </div>
              </div>

              <div v-else-if="planRows.length" class="flex-1 min-h-0 overflow-y-auto">
                <div class="border-b border-slate-200 bg-white/80 px-3 py-3">
                  <div :class="planListRowGridClass">
                    <span class="h-9 w-1" aria-hidden="true" />

                    <div :class="[planComparisonGridClass, 'px-2']">
                      <span :class="planHeaderCellClass">
                        Plan Year
                      </span>
                      <span :class="planHeaderCellRightClass">
                        Contacts
                      </span>
                      <span :class="planHeaderCellRightClass">
                        Staff Hours
                      </span>
                      <span :class="planHeaderCellRightClass">
                        Presence %
                      </span>
                      <span :class="planHeaderCellRightClass">
                        Utilization %
                      </span>
                      <span :class="planHeaderCellRightClass" title="Peak Required Headcount">
                        Peak Req HC
                      </span>
                      <span :class="planHeaderCellRightClass" title="Average Required Headcount">
                        Avg Req HC
                      </span>
                    </div>

                    <div class="pr-2 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Actions
                    </div>
                  </div>
                </div>

                <div class="divide-y divide-slate-200">
                  <div
                    v-for="plan in planRows"
                    :key="plan.id"
                    :class="[planListRowGridClass, 'h-16 cursor-pointer px-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d2df]', plan.isSelectedYear ? 'bg-[#e7eef4]' : 'bg-white hover:bg-slate-50/70']"
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
                      :class="plan.isSelectedYear ? 'bg-[#15395f]' : 'bg-transparent'"
                      aria-hidden="true"
                    />

                    <div :class="[planComparisonGridClass, 'rounded-[16px] px-2 py-1.5 text-sm']">
                      <span class="px-3">
                        <span
                          class="inline-flex min-w-[4.25rem] items-center justify-center rounded-[16px] px-2.5 py-1 font-semibold"
                          :class="plan.isSelectedYear ? 'bg-white text-[#15395f]' : 'bg-slate-100 text-slate-700'"
                        >
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

              <div v-else class="flex-1 min-h-0 overflow-y-auto p-5">
                <AppEmptyState
                  title="No plans yet"
                  :description="`Use New Plan to create the first saved plan for ${selectedGroup.name}.`"
                />
              </div>
            </div>

            <div v-else class="flex-1 min-h-0 overflow-y-auto p-5">
              <AppEmptyState
                title="Select a staffing group"
                description="Choose a staffing group from the left to review its defaults, forecasts, and yearly plans."
              />
            </div>
          </div>
        </div>
      </AppPanel>
    </div>

    <PlanningGroupSettingsModal
      v-if="groupSettingsOpen"
      v-model:group-name="groupDraft.name"
      v-model:default-paid-hours-per-day="groupDraft.defaultPaidHoursPerDay"
      v-model:default-occupancy-percent="groupDraft.defaultOccupancyPercent"
      v-model:default-adherence-percent="groupDraft.defaultAdherencePercent"
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

    <PlanningForecastCreateModal
      v-if="forecastCreateOpen && selectedGroup"
      v-model:source-kind="newForecastSourceKind"
      v-model:planning-year="newForecastYear"
      :year-options="forecastYearOptions"
      :can-create="canCreateForecast"
      @cancel="closeForecastCreate"
      @create="createForecast"
    />

    <AppConfirmDialog
      v-model:visible="confirmationDialogOpen"
      :title="confirmationDialogTitle"
      :description="confirmationDialogDescription"
      :confirm-label="confirmationDialogConfirmLabel"
      @confirm="runPendingConfirmation"
    />
  </section>
</template>
