<script setup>
import { computed, ref, toRef, watch } from 'vue'
import {
  mdiChartLineVariant,
  mdiChevronDown,
  mdiChevronRight,
  mdiFolderOutline,
  mdiDotsVertical,
  mdiPlus,
  mdiViewDashboardOutline
} from '@mdi/js'

import PlanningForecastCreateModal from './PlanningForecastCreateModal.vue'
import PlanningGroupActualsView from './PlanningGroupActualsView.vue'
import PlanningGroupIntradayView from './PlanningGroupIntradayView.vue'
import PlanningGroupSettingsModal from './PlanningGroupSettingsModal.vue'
import PlanningPlanComparisonDialog from './PlanningPlanComparisonDialog.vue'
import PlanningPlanUpdateModal from './PlanningPlanUpdateModal.vue'
import PlannerSettingsModal from '../planner/PlannerSettingsModal.vue'
import { buildPlanningCenterHash, buildPlanningNewPlanHash, navigateToHash } from '../../appRoutes'
import { createPlanningGroupDraft } from '../../planningStorage'
import { currentYear } from '../../composables/monthlyPlanBuilder/shared'
import {
  PLAN_REQUIREMENT_METHOD_OPTIONS,
  PLAN_REQUIREMENT_METHOD_WORKLOAD_RATIO
} from '../../plannerModel'
import { usePlanningCenterForecastLibrary } from '../../composables/planning/usePlanningCenterForecastLibrary'
import { usePlanningGroupDataActions } from '../../composables/planning/usePlanningGroupDataActions'
import { usePlanningGroupForecastActions } from '../../composables/planning/usePlanningGroupForecastActions'
import { usePlanningCenterWorkspace } from '../../composables/planning/usePlanningCenterWorkspace'
import AppAttachedTabs from '../ui/AppAttachedTabs.vue'
import AppButton from '../ui/AppButton.vue'
import AppBreadcrumbs from '../ui/AppBreadcrumbs.vue'
import AppConfirmDialog from '../ui/AppConfirmDialog.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppIcon from '../ui/AppIcon.vue'
import AppMenu from '../ui/AppMenu.vue'
import AppPanel from '../ui/AppPanel.vue'
import AppSelect from '../ui/AppSelect.vue'
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
  selectedGroupTab: {
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

const emit = defineEmits(['save-group', 'delete-group', 'delete-plan', 'set-current-plan'])

const groupSettingsOpen = ref(false)
const planSettingsOpen = ref(false)
const planUpdateOpen = ref(false)
const planComparisonOpen = ref(false)
const planComparisonSection = ref(null)
const groupDraft = ref(createPlanningGroupDraft())
const callCenterPlanningYear = ref(Number(props.selectedYear) || currentYear)
const newPlanYear = ref(currentYear)
const newPlanRequirementMethod = ref(PLAN_REQUIREMENT_METHOD_WORKLOAD_RATIO)
const updateSourcePlan = ref(null)
const updateBudgetPlan = ref(null)
const updateActualsThroughOptions = ref([])
const updateActualsThroughBlocker = ref('')
const updateActualsThroughMonth = ref('')
const updatePlanName = ref('')
const updateDecisionReason = ref('')
const {
  dialogVisible: confirmationDialogOpen,
  dialogTitle: confirmationDialogTitle,
  dialogDescription: confirmationDialogDescription,
  dialogConfirmLabel: confirmationDialogConfirmLabel,
  requestConfirmation,
  confirmPendingAction: runPendingConfirmation
} = useConfirmDialog()
const activeGroupWorkspaceTab = ref('data')
const actualsViewRef = ref(null)
const expandedActualMonthIds = ref(new Set())

const planRowGridClass =
  'grid min-w-0 grid-cols-[minmax(12rem,1.25fr)_minmax(7rem,0.72fr)_minmax(7.5rem,0.75fr)_minmax(7.5rem,0.75fr)_minmax(7.5rem,0.75fr)_minmax(7rem,0.72fr)] items-center'
const forecastComparisonGridClass =
  'grid min-w-0 grid-cols-[minmax(9rem,0.95fr)_minmax(9.5rem,1fr)_minmax(7.25rem,0.8fr)_minmax(6rem,0.72fr)_minmax(6rem,0.72fr)_minmax(6.75rem,0.78fr)_minmax(6.75rem,0.8fr)_minmax(8.75rem,1fr)] items-center'

const planListRowGridClass = 'grid grid-cols-[auto_minmax(0,1fr)_8.25rem] items-center gap-2'
const forecastListRowGridClass = 'grid grid-cols-[auto_minmax(0,1fr)_8.25rem] items-center gap-2'
const planHeaderCellClass =
  'px-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap'
const planHeaderCellRightClass = `${planHeaderCellClass} text-right`
const callCenterActualsHeaderCellClass =
  'px-2 py-2 text-left align-bottom text-[0.64rem] font-semibold uppercase leading-tight text-slate-400'
const callCenterActualsHeaderCellRightClass = `${callCenterActualsHeaderCellClass} text-right`
const callCenterActualsCellClass = 'px-2 py-2.5 text-right font-medium tabular-nums text-slate-700'
const callCenterActualsDetailCellClass = 'px-2 py-2 text-right font-medium tabular-nums text-slate-600'
const callCenterActualsFooterCellClass = 'px-2 py-2.5 text-right font-semibold tabular-nums text-slate-900'
const callCenterActualsParentCellClass = (monthStart) => [
  callCenterActualsCellClass,
  isActualMonthExpanded(monthStart) ? 'font-semibold text-slate-900' : ''
]
const formatSignedNumber = (value, digits = 1) => {
  const numericValue = Number(value)
  const prefix = Number.isFinite(numericValue) && numericValue > 0 ? '+' : ''
  return `${prefix}${formatNumber(value, digits)}`
}
const formatOptionalWhole = (value) => {
  if (value == null || value === '') {
    return '—'
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? formatWhole(numericValue) : '—'
}
const formatOptionalNumber = (value, digits = 1) => {
  if (value == null || value === '') {
    return '—'
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? formatNumber(numericValue, digits) : '—'
}
const actualRequirementVarianceClass = (value) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 'text-slate-500'
  }

  return numericValue > 0.05
    ? 'text-rose-700'
    : numericValue < -0.05
      ? 'text-emerald-700'
      : 'text-slate-700'
}
const staffingGapClass = (value) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 'text-slate-500'
  }

  return numericValue > 0.05
    ? 'text-emerald-700'
    : numericValue < -0.05
      ? 'text-rose-700'
      : 'text-slate-700'
}
const workloadDeltaPercent = (actual, planned) => {
  if (actual == null || actual === '' || planned == null || planned === '') {
    return null
  }

  const actualValue = Number(actual)
  const plannedValue = Number(planned)
  if (!Number.isFinite(actualValue) || !Number.isFinite(plannedValue) || plannedValue <= 0) {
    return null
  }

  return ((actualValue - plannedValue) / plannedValue) * 100
}
const workloadDeltaLabel = (actual, planned) => {
  const delta = workloadDeltaPercent(actual, planned)
  if (delta == null) {
    return ''
  }

  const prefix = delta > 0 ? '+' : ''
  return `${prefix}${formatNumber(delta, 1)}%`
}
const workloadDeltaClass = (actual, planned) => actualRequirementVarianceClass(workloadDeltaPercent(actual, planned))
const STAFFING_GROUP_TABS = [
  { id: 'data', label: 'Data' },
  { id: 'forecasts', label: 'Forecasts' },
  { id: 'intraday', label: 'Intraday' },
  { id: 'plans', label: 'Plans' }
]
const resolveGroupWorkspaceTab = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  return STAFFING_GROUP_TABS.some((item) => item.id === normalizedValue) ? normalizedValue : 'data'
}
const {
  breadcrumbItems,
  callCenterAnnualMonthlyRows,
  callCenterAnnualTotalRow,
  callCenterPlanningYearOptions,
  callCenterReportIssues,
  createPlanHref,
  existingPlanForDraftYear,
  existingPlanHref,
  formatNumber,
  formatWhole,
  groupRows,
  planYearSections,
  selectedGroup,
  selectedGroupDefaults,
  selectedYearModel
} = usePlanningCenterWorkspace({
  center: toRef(props, 'center'),
  selectedGroupId: toRef(props, 'selectedGroupId'),
  selectedYear: toRef(props, 'selectedYear'),
  summaryPlanningYear: callCenterPlanningYear,
  weekdayOptions: toRef(props, 'weekdayOptions'),
  newPlanYear,
  newPlanRequirementMethod
})

const centerSummaryHref = computed(() => buildPlanningCenterHash(props.center.id))

const callCenterActualMonthIds = computed(() =>
  callCenterAnnualMonthlyRows.value.map((row) => row.monthStart)
)

const allActualMonthsExpanded = computed(() =>
  callCenterActualMonthIds.value.length > 0 &&
  callCenterActualMonthIds.value.every((monthStart) => expandedActualMonthIds.value.has(monthStart))
)

const isActualMonthExpanded = (monthStart) => expandedActualMonthIds.value.has(monthStart)

const setExpandedActualMonths = (monthStarts) => {
  expandedActualMonthIds.value = new Set(monthStarts)
}

const toggleActualMonth = (monthStart) => {
  const nextExpanded = new Set(expandedActualMonthIds.value)
  if (nextExpanded.has(monthStart)) {
    nextExpanded.delete(monthStart)
  } else {
    nextExpanded.add(monthStart)
  }
  expandedActualMonthIds.value = nextExpanded
}

const expandAllActualMonths = () => {
  setExpandedActualMonths(callCenterActualMonthIds.value)
}

const collapseAllActualMonths = () => {
  setExpandedActualMonths([])
}

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

const readyForecastPlanYears = computed(() => (
  [...new Set(
    forecastRows.value
      .filter((forecast) => forecast.readyForPlanning)
      .map((forecast) => Number(forecast.planningYear))
      .filter((planningYear) => Number.isFinite(planningYear) && planningYear > 0)
  )]
).sort((left, right) => right - left))

const availablePlanYearOptions = computed(() => {
  const usedYears = new Set(
    (selectedGroup.value?.plans || [])
      .filter((plan) => plan.planType !== 'update')
      .map((plan) => Number(plan.planningYear))
      .filter((planningYear) => Number.isFinite(planningYear) && planningYear > 0)
  )

  return readyForecastPlanYears.value
    .filter((planningYear) => !usedYears.has(planningYear))
    .map((planningYear) => ({
      label: String(planningYear),
      value: planningYear
    }))
})

const canCreatePlanDraft = computed(() =>
  !forecastsLoading.value &&
  availablePlanYearOptions.value.length > 0 &&
  !existingPlanForDraftYear.value
)

const planSettingsStatusMessage = computed(() => {
  if (!selectedGroup.value) {
    return ''
  }

  if (forecastsLoading.value) {
    return `Loading saved forecasts for ${selectedGroup.value.name}.`
  }

  if (!readyForecastPlanYears.value.length) {
    return `Create and save a staffing-group forecast for ${selectedGroup.value.name} before creating a plan.`
  }

  if (!availablePlanYearOptions.value.length) {
    return `Every forecast-backed year for ${selectedGroup.value.name} already has a saved plan.`
  }

  if (existingPlanForDraftYear.value) {
    return `This staffing group already has a Budget plan for ${newPlanYear.value}.`
  }

  return ''
})

const planSettingsStatusTone = computed(() =>
  forecastsLoading.value ? 'info' : 'warning'
)

const openCreateGroup = () => {
  groupDraft.value = createPlanningGroupDraft({
    operatingWeekdays: props.center.operatingWeekdays,
    operatingOpenTime: props.center.operatingOpenTime,
    operatingCloseTime: props.center.operatingCloseTime
  })
  groupSettingsOpen.value = true
}

const openPlanSettings = () => {
  if (!selectedGroup.value) {
    return
  }

  newPlanYear.value = Number(availablePlanYearOptions.value[0]?.value) || currentYear
  newPlanRequirementMethod.value = PLAN_REQUIREMENT_METHOD_WORKLOAD_RATIO
  planSettingsOpen.value = true
}

const closePlanSettings = () => {
  planSettingsOpen.value = false
}

const createPlan = () => {
  if (!selectedGroup.value || !canCreatePlanDraft.value) {
    return
  }

  planSettingsOpen.value = false
  navigateToHash(createPlanHref.value)
}

const openPlanUpdate = (plan, section = null) => {
  if (!selectedGroup.value || !plan) {
    return
  }

  const matchedSection = section || planYearSections.value.find((item) =>
    item.rows.some((row) => row.id === plan.id)
  )

  updateSourcePlan.value = plan
  updateBudgetPlan.value = matchedSection?.budgetPlan || null
  updateActualsThroughOptions.value = matchedSection?.actualsThroughOptions || []
  updateActualsThroughBlocker.value = matchedSection?.actualsThroughBlocker || ''
  updateActualsThroughMonth.value = matchedSection?.defaultActualsThroughMonth || ''
  updatePlanName.value = matchedSection?.defaultUpdateName || `${plan.planningYear} Update`
  updateDecisionReason.value = ''
  planUpdateOpen.value = true
}

const closePlanUpdate = () => {
  planUpdateOpen.value = false
}

const openPlanComparison = (section) => {
  if (!section || section.rows.length < 2) {
    return
  }

  planComparisonSection.value = section
  planComparisonOpen.value = true
}

const createPlanUpdate = () => {
  if (
    !selectedGroup.value ||
    !updateSourcePlan.value ||
    !updateActualsThroughMonth.value ||
    !updatePlanName.value.trim() ||
    !updateDecisionReason.value.trim()
  ) {
    return
  }

  const sourcePlan = updateSourcePlan.value
  planUpdateOpen.value = false
  navigateToHash(
    buildPlanningNewPlanHash(props.center.id, selectedGroup.value.id, sourcePlan.planningYear, {
      requirementMethod: sourcePlan.requirementMethod,
      updateSourcePlanId: sourcePlan.id,
      actualsThroughMonth: updateActualsThroughMonth.value,
      updatePlanName: updatePlanName.value.trim(),
      updateDecisionReason: updateDecisionReason.value.trim()
    })
  )
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
    ...groupDraft.value,
    operatingWeekdays: props.center.operatingWeekdays
  })
  groupSettingsOpen.value = false
}

const saveGroupIntraday = (intraday) => {
  if (!selectedGroup.value) {
    return
  }

  emit('save-group', {
    ...selectedGroup.value,
    intraday
  })
}
const {
  actualsMenuItems,
  canLaunchModeledForecast,
  clearActualsSelection,
  forecastHistoryRequirementMessage,
  handleActualsMenuSelect,
  handleActualsSelectionChange,
  minimumForecastHistoryDays,
  openActualsImport,
  saveGroupActuals,
  showForecastHistoryRequirement
} = usePlanningGroupDataActions({
  center: toRef(props, 'center'),
  selectedGroup,
  actualsViewRef,
  requestConfirmation,
  onSaveGroup: (group) => emit('save-group', group)
})

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
  const hasUpdates = (selectedGroup.value.plans || []).some(
    (candidate) =>
      candidate.id !== plan.id &&
      Number(candidate.planningYear) === Number(plan.planningYear) &&
      candidate.planType === 'update'
  )

  if (plan.planType === 'budget' && hasUpdates) {
    requestConfirmation({
      title: 'Budget Has Updates',
      description: `Delete the updated ${plan.planningYear} plans before deleting the Budget baseline for "${groupName}".`,
      confirmLabel: 'OK',
      onConfirm: () => {}
    })
    return
  }

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

const buildPlanMenuItems = (plan) => [
  ...(!plan.isDraftBudget
    ? [{
        id: 'create-update',
        label: 'Create Updated Plan'
      }]
    : []),
  ...(plan.planType === 'update' && !plan.isCurrent
    ? [{
        id: 'set-current',
        label: 'Set Current'
      }]
    : []),
  {
    id: 'delete-plan',
    label: 'Delete',
    tone: 'danger'
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
  if (item.id === 'create-update') {
    if (plan.isDraftBudget) {
      return
    }

    openPlanUpdate(plan)
    return
  }

  if (item.id === 'set-current') {
    emit('set-current-plan', {
      centerId: props.center.id,
      groupId: selectedGroup.value.id,
      planId: plan.id,
      planningYear: Number(plan.planningYear)
    })
    return
  }

  if (item.id === 'delete-plan') {
    confirmDeletePlan(plan)
  }
}
const {
  buildForecastMenuItems,
  buildForecastOpenHref,
  canCreateForecast,
  closeForecastCreate,
  createForecast,
  forecastCreateOpen,
  forecastCoverageMessage,
  forecastMonthOptions,
  forecastYearOptions,
  handleForecastMenuSelect,
  newForecastCoverageEndMonth,
  newForecastCoverageStartMonth,
  newForecastPeriodMode,
  newForecastSourceKind,
  newForecastYear,
  openForecast,
  openForecastCreate,
  selectForecast,
  selectedForecastId
} = usePlanningGroupForecastActions({
  center: toRef(props, 'center'),
  selectedGroup,
  selectedYearModel,
  forecastRows,
  canLaunchModeledForecast,
  requestConfirmation,
  deleteForecast,
  onMissingHistory: () => {
    activeGroupWorkspaceTab.value = 'data'
    showForecastHistoryRequirement()
  }
})

watch(
  callCenterPlanningYearOptions,
  (yearOptions) => {
    const validYears = yearOptions.map((option) => Number(option.value))
    const routeYear = Number(props.selectedYear)
    const preferredYear = validYears.includes(routeYear)
      ? routeYear
      : validYears.includes(currentYear)
        ? currentYear
        : validYears[0]

    if (preferredYear && !validYears.includes(Number(callCenterPlanningYear.value))) {
      callCenterPlanningYear.value = preferredYear
    }
  },
  { immediate: true }
)

watch(
  callCenterAnnualMonthlyRows,
  (rows) => {
    const validMonthIds = new Set(rows.map((row) => row.monthStart))
    const stillValidExpandedIds = [...expandedActualMonthIds.value].filter((monthStart) =>
      validMonthIds.has(monthStart)
    )

    setExpandedActualMonths(stillValidExpandedIds)
  },
  { immediate: true }
)

watch(
  [selectedGroup, () => props.selectedGroupTab],
  ([group, routeTab], previousValue = []) => {
    const previousGroup = previousValue[0]
    const previousRouteTab = previousValue[1]
    const normalizedRouteTab = resolveGroupWorkspaceTab(routeTab)

    if (!group) {
      activeGroupWorkspaceTab.value = 'data'
      return
    }

    if (
      group.id !== previousGroup?.id ||
      String(routeTab || '').trim().toLowerCase() !== String(previousRouteTab || '').trim().toLowerCase()
    ) {
      activeGroupWorkspaceTab.value = normalizedRouteTab
    }
  },
  { immediate: true }
)

watch(
  [planSettingsOpen, availablePlanYearOptions],
  ([isOpen, yearOptions]) => {
    if (!isOpen) {
      return
    }

    const resolvedYearOptions = Array.isArray(yearOptions) ? yearOptions : []
    const validYears = resolvedYearOptions
      .map((option) => Number(option?.value))
      .filter((planningYear) => Number.isFinite(planningYear) && planningYear > 0)

    if (validYears.length && !validYears.includes(Number(newPlanYear.value))) {
      newPlanYear.value = validYears[0]
    }
  }
)

watch(
  [selectedGroup, activeGroupWorkspaceTab],
  () => {
    clearActualsSelection()
  },
  { immediate: true }
)

</script>

<template>
  <section class="bg-slate-50/80 py-1.5">
    <div class="app-frame grid gap-2">
      <div class="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
        <div class="grid gap-0.5">
          <AppBreadcrumbs :items="breadcrumbItems" />
          <h1 class="text-[clamp(1.25rem,1.55vw,1.6rem)] font-semibold tracking-[-0.04em] text-slate-950">
            {{ props.center.name }}
          </h1>
        </div>
      </div>

      <AppPanel :padded="false">
        <div class="grid h-[calc(100vh-12.5rem)] min-h-[36rem] xl:grid-cols-[256px_minmax(0,1fr)] 2xl:grid-cols-[272px_minmax(0,1fr)] xl:items-stretch">
          <div class="flex min-h-0 flex-col border-b border-slate-200 xl:border-b-0 xl:border-r">
            <div class="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-3 xl:h-[6rem]">
              <div class="flex h-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:items-start">
                <h2 class="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                  Staffing Groups
                </h2>
              </div>
            </div>

            <div class="border-b border-slate-200 bg-slate-50/80 p-2">
              <div
                class="grid h-14 cursor-pointer grid-cols-[auto_1fr] items-center gap-3 rounded-[18px] px-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d2df]"
                :class="!selectedGroup ? 'bg-[#e7eef4]' : 'bg-white hover:bg-slate-50/70'"
                tabindex="0"
                role="link"
                aria-label="Open call center summary"
                @click="navigateToHash(centerSummaryHref)"
                @keydown.enter.prevent="navigateToHash(centerSummaryHref)"
                @keydown.space.prevent="navigateToHash(centerSummaryHref)"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#15395f] shadow-sm">
                  <AppIcon :path="mdiViewDashboardOutline" class="h-4 w-4" />
                </span>

                <span class="grid min-w-0">
                  <strong
                    class="truncate text-sm font-semibold"
                    :class="!selectedGroup ? 'text-[#15395f]' : 'text-slate-950'"
                  >
                    Call Center Plan
                  </strong>
                  <span class="truncate text-[0.78rem] text-slate-500">
                    All staffing groups
                  </span>
                </span>
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
            <div v-if="!selectedGroup" class="flex min-h-0 flex-col">
              <div class="border-b border-slate-200 px-4 py-3 xl:h-[6rem]">
                <div class="flex h-full flex-col justify-between gap-1.5">
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div class="grid gap-0.5">
                      <h2 class="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        Call Center Plan
                      </h2>
                      <p class="text-sm text-slate-500">
                        Expected vs actuals across staffing groups. Expand a month to see each group using the same columns.
                      </p>
                    </div>

                    <div class="flex flex-wrap items-end gap-2">
                      <div class="grid min-w-[6.75rem] gap-1">
                        <label
                          for="call-center-plan-year"
                          class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                        >
                          Year
                        </label>
                        <AppSelect
                          id="call-center-plan-year"
                          v-model="callCenterPlanningYear"
                          :options="callCenterPlanningYearOptions"
                          class="w-[6.75rem]"
                          aria-label="Call center planning year"
                        />
                      </div>

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
                </div>
              </div>

              <div class="flex-1 min-h-0 overflow-y-auto p-4">
                <div v-if="groupRows.length" class="grid gap-4">
                  <AppStatusMessage v-if="callCenterReportIssues.length">
                    <div class="grid gap-2">
                      <p>
                        <strong>Intraday Erlang report scope:</strong>
                        planned requirement is shown only from current saved calculations; actual requirement is unavailable until actual Erlang results can be retained.
                      </p>
                      <ul class="grid gap-2" aria-label="Intraday Erlang report issues">
                        <li
                          v-for="issue in callCenterReportIssues"
                          :key="`${issue.groupId}-${issue.planId}`"
                          class="flex flex-wrap items-center justify-between gap-2 border-t border-[#d5e0ea] pt-2"
                        >
                          <span class="min-w-0 leading-5">
                            <strong>{{ issue.groupName }} · {{ issue.planName }}:</strong>
                            {{ issue.message }}
                          </span>
                          <AppButton
                            :href="issue.openHref"
                            size="xs"
                            variant="secondary"
                            :aria-label="`${issue.actionLabel} for ${issue.groupName}`"
                          >
                            {{ issue.actionLabel }}
                          </AppButton>
                        </li>
                      </ul>
                    </div>
                  </AppStatusMessage>

                  <section class="grid gap-3">
                    <div class="flex justify-end px-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <AppButton
                          size="xs"
                          variant="quiet"
                          :disabled="allActualMonthsExpanded"
                          @click="expandAllActualMonths"
                        >
                          Expand All
                        </AppButton>
                        <AppButton
                          size="xs"
                          variant="quiet"
                          :disabled="!expandedActualMonthIds.size"
                          @click="collapseAllActualMonths"
                        >
                          Collapse All
                        </AppButton>
                      </div>
                    </div>

                    <div class="overflow-x-auto rounded-[14px] border border-slate-200 bg-white shadow-sm">
                        <table class="w-full min-w-[64rem] table-fixed border-collapse text-[0.82rem] xl:min-w-0">
                          <colgroup>
                            <col class="w-[6.75%]" />
                            <col class="w-[8.5%]" />
                            <col class="w-[8.5%]" />
                            <col class="w-[7%]" />
                            <col class="w-[7%]" />
                            <col class="w-[8.3%]" />
                            <col class="w-[8.3%]" />
                            <col class="w-[8.3%]" />
                            <col class="w-[8.3%]" />
                            <col class="w-[7.9%]" />
                            <col class="w-[9.8%]" />
                            <col class="w-[11.35%]" />
                          </colgroup>
                          <thead class="border-b border-slate-200 bg-slate-50/80">
                          <tr class="bg-[#eef4f8]">
                            <th rowspan="2" scope="col" :class="callCenterActualsHeaderCellClass">
                              Month
                            </th>
                            <th colspan="9" scope="colgroup" class="px-2 py-2 text-center text-[0.64rem] font-semibold uppercase text-[#15395f]">
                              Workload
                            </th>
                            <th colspan="2" scope="colgroup" class="border-l border-slate-200 px-2 py-2 text-center text-[0.64rem] font-semibold uppercase text-[#15395f]">
                              Staffing
                            </th>
                          </tr>
                          <tr>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Plan Contacts</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Actual Contacts</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Plan AHT</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Actual AHT</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Plan Wkld</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Actual Wkld</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Plan Req HC</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Actual Req HC</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Req HC Var</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Start FL HC</th>
                            <th scope="col" :class="callCenterActualsHeaderCellRightClass">Gap vs Actual Req HC</th>
                          </tr>
                          </thead>

                          <tbody class="divide-y divide-slate-200 bg-white">
                          <template
                            v-for="row in callCenterAnnualMonthlyRows"
                            :key="row.monthStart"
                          >
                            <tr
                              class="transition"
                              :class="isActualMonthExpanded(row.monthStart) ? 'bg-[#eef4f8]' : 'bg-white hover:bg-slate-50/70'"
                            >
                              <th
                                scope="row"
                                class="border-l-4 px-2 py-2.5 text-left"
                                :class="isActualMonthExpanded(row.monthStart) ? 'border-[#15395f]' : 'border-transparent'"
                              >
                                <button
                                  type="button"
                                  class="inline-flex max-w-full items-center gap-1 rounded-xl px-1 py-1 text-left font-semibold text-slate-950 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d2df]"
                                  :aria-expanded="isActualMonthExpanded(row.monthStart)"
                                  :aria-label="`${isActualMonthExpanded(row.monthStart) ? 'Collapse' : 'Expand'} ${row.monthLabel} staffing groups`"
                                  @click="toggleActualMonth(row.monthStart)"
                                >
                                  <AppIcon
                                    :path="isActualMonthExpanded(row.monthStart) ? mdiChevronDown : mdiChevronRight"
                                    class="h-3.5 w-3.5 text-slate-500"
                                  />
                                  <span>{{ row.label }}</span>
                                </button>
                              </th>
                              <td :class="callCenterActualsParentCellClass(row.monthStart)">{{ formatWhole(row.plannedContacts) }}</td>
                              <td :class="callCenterActualsParentCellClass(row.monthStart)">{{ formatOptionalWhole(row.actualContacts) }}</td>
                              <td :class="callCenterActualsParentCellClass(row.monthStart)">{{ formatOptionalNumber(row.plannedAhtSeconds, 0) }}</td>
                              <td :class="callCenterActualsParentCellClass(row.monthStart)">{{ formatOptionalNumber(row.actualAhtSeconds, 0) }}</td>
                              <td :class="callCenterActualsParentCellClass(row.monthStart)">{{ formatOptionalNumber(row.plannedWorkloadHours, 1) }}</td>
                              <td :class="callCenterActualsParentCellClass(row.monthStart)">
                                <span class="inline-flex items-baseline gap-1">
                                  <span>{{ formatOptionalNumber(row.actualWorkloadHours, 1) }}</span>
                                  <sup
                                    v-if="workloadDeltaLabel(row.actualWorkloadHours, row.plannedWorkloadHours)"
                                    class="text-[0.64rem] font-semibold"
                                    :class="workloadDeltaClass(row.actualWorkloadHours, row.plannedWorkloadHours)"
                                  >
                                    {{ workloadDeltaLabel(row.actualWorkloadHours, row.plannedWorkloadHours) }}
                                  </sup>
                                </span>
                              </td>
                              <td :class="callCenterActualsParentCellClass(row.monthStart)">{{ formatOptionalNumber(row.plannedRequiredHeadcount, 1) }}</td>
                              <td :class="callCenterActualsParentCellClass(row.monthStart)">{{ formatOptionalNumber(row.actualRequiredHeadcount, 1) }}</td>
                              <td class="px-2 py-2.5 text-right font-semibold tabular-nums" :class="actualRequirementVarianceClass(row.requiredHeadcountVariance)">
                                {{ formatOptionalNumber(row.requiredHeadcountVariance, 1) }}
                              </td>
                              <td
                                class="border-l border-slate-200"
                                :class="callCenterActualsParentCellClass(row.monthStart)"
                              >
                                {{ formatOptionalNumber(row.plannedStartingFrontlineHeadcount, 1) }}
                              </td>
                              <td class="px-2 py-2.5 text-right font-semibold tabular-nums" :class="staffingGapClass(row.gapVsActualRequiredHeadcount)">
                                {{ formatOptionalNumber(row.gapVsActualRequiredHeadcount, 1) }}
                              </td>
                            </tr>

                            <tr
                              v-for="detailRow in isActualMonthExpanded(row.monthStart) ? row.staffingGroupRows : []"
                              :key="`${row.monthStart}-${detailRow.groupId}`"
                              class="bg-[#f8fbfd] text-[0.78rem] transition hover:bg-[#f3f8fb]"
                            >
                              <th scope="row" class="px-2 py-2 text-left">
                                <div class="ml-7 grid gap-0.5 border-l-2 border-[#c3d2df] pl-3">
                                  <span class="truncate font-semibold text-[#15395f]" :title="detailRow.groupName">{{ detailRow.groupName }}</span>
                                  <span v-if="!detailRow.hasPlan" class="text-[0.72rem] text-amber-700">No plan for {{ callCenterPlanningYear }}</span>
                                </div>
                              </th>
                              <td :class="callCenterActualsDetailCellClass">{{ formatOptionalWhole(detailRow.plannedContacts) }}</td>
                              <td :class="callCenterActualsDetailCellClass">{{ formatOptionalWhole(detailRow.actualContacts) }}</td>
                              <td :class="callCenterActualsDetailCellClass">{{ formatOptionalNumber(detailRow.plannedAhtSeconds, 0) }}</td>
                              <td :class="callCenterActualsDetailCellClass">{{ formatOptionalNumber(detailRow.actualAhtSeconds, 0) }}</td>
                              <td :class="callCenterActualsDetailCellClass">{{ formatOptionalNumber(detailRow.plannedWorkloadHours, 1) }}</td>
                              <td :class="callCenterActualsDetailCellClass">
                                <span class="inline-flex items-baseline gap-1">
                                  <span>{{ formatOptionalNumber(detailRow.actualWorkloadHours, 1) }}</span>
                                  <sup
                                    v-if="workloadDeltaLabel(detailRow.actualWorkloadHours, detailRow.plannedWorkloadHours)"
                                    class="text-[0.64rem] font-semibold"
                                    :class="workloadDeltaClass(detailRow.actualWorkloadHours, detailRow.plannedWorkloadHours)"
                                  >
                                    {{ workloadDeltaLabel(detailRow.actualWorkloadHours, detailRow.plannedWorkloadHours) }}
                                  </sup>
                                </span>
                              </td>
                              <td :class="callCenterActualsDetailCellClass">{{ formatOptionalNumber(detailRow.plannedRequiredHeadcount, 1) }}</td>
                              <td :class="callCenterActualsDetailCellClass">{{ formatOptionalNumber(detailRow.actualRequiredHeadcount, 1) }}</td>
                              <td class="px-2 py-2 text-right font-semibold tabular-nums" :class="actualRequirementVarianceClass(detailRow.requiredHeadcountVariance)">
                                {{ formatOptionalNumber(detailRow.requiredHeadcountVariance, 1) }}
                              </td>
                              <td class="border-l border-slate-200 px-2 py-2 text-right font-medium tabular-nums text-slate-600">{{ formatOptionalNumber(detailRow.plannedStartingFrontlineHeadcount, 1) }}</td>
                              <td class="px-2 py-2 text-right font-semibold tabular-nums" :class="staffingGapClass(detailRow.gapVsActualRequiredHeadcount)">
                                {{ formatOptionalNumber(detailRow.gapVsActualRequiredHeadcount, 1) }}
                              </td>
                            </tr>
                          </template>
                          </tbody>

                          <tfoot class="border-t-2 border-slate-300 bg-slate-50">
                          <tr>
                            <th scope="row" class="px-2 py-2.5 text-left font-semibold text-slate-950">
                              {{ callCenterAnnualTotalRow.monthLabel }}
                            </th>
                            <td :class="callCenterActualsFooterCellClass">{{ formatWhole(callCenterAnnualTotalRow.plannedContacts) }}</td>
                            <td :class="callCenterActualsFooterCellClass">{{ formatOptionalWhole(callCenterAnnualTotalRow.actualContacts) }}</td>
                            <td :class="callCenterActualsFooterCellClass">{{ formatOptionalNumber(callCenterAnnualTotalRow.plannedAhtSeconds, 0) }}</td>
                            <td :class="callCenterActualsFooterCellClass">{{ formatOptionalNumber(callCenterAnnualTotalRow.actualAhtSeconds, 0) }}</td>
                            <td :class="callCenterActualsFooterCellClass">{{ formatOptionalNumber(callCenterAnnualTotalRow.plannedWorkloadHours, 1) }}</td>
                            <td :class="callCenterActualsFooterCellClass">{{ formatOptionalNumber(callCenterAnnualTotalRow.actualWorkloadHours, 1) }}</td>
                            <td :class="callCenterActualsFooterCellClass">{{ formatOptionalNumber(callCenterAnnualTotalRow.plannedRequiredHeadcount, 1) }}</td>
                            <td :class="callCenterActualsFooterCellClass">{{ formatOptionalNumber(callCenterAnnualTotalRow.actualRequiredHeadcount, 1) }}</td>
                            <td class="px-2 py-2.5 text-right font-semibold tabular-nums" :class="actualRequirementVarianceClass(callCenterAnnualTotalRow.requiredHeadcountVariance)">
                              {{ formatOptionalNumber(callCenterAnnualTotalRow.requiredHeadcountVariance, 1) }}
                            </td>
                            <td class="border-l border-slate-200 px-2 py-2.5 text-right font-semibold tabular-nums text-slate-900">{{ formatOptionalNumber(callCenterAnnualTotalRow.plannedStartingFrontlineHeadcount, 1) }}</td>
                            <td class="px-2 py-2.5 text-right font-semibold tabular-nums" :class="staffingGapClass(callCenterAnnualTotalRow.gapVsActualRequiredHeadcount)">
                              {{ formatOptionalNumber(callCenterAnnualTotalRow.gapVsActualRequiredHeadcount, 1) }}
                            </td>
                          </tr>
                          </tfoot>
                        </table>
                    </div>
                  </section>
                </div>

                <AppEmptyState
                  v-else
                  title="Create the first staffing group"
                  description="Start a staffing group for each team or queue you plan separately inside this call center."
                />
              </div>
            </div>

            <div v-else class="flex min-h-0 flex-col">
              <div class="border-b border-slate-200 px-4 py-3 xl:h-[6rem]">
                <div class="flex h-full flex-col justify-between gap-1.5">
                  <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                    <div class="grid gap-0.5">
                      <h2 class="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        {{ selectedGroup.name }}
                      </h2>
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5">
                      <template v-if="activeGroupWorkspaceTab === 'data'">
                        <AppButton
                          size="sm"
                          variant="primary"
                          :icon="mdiPlus"
                          :aria-label="`Add actuals data for ${selectedGroup.name}`"
                          @click="openActualsImport"
                        >
                          Add Data
                        </AppButton>
                        <AppMenu
                          v-if="actualsMenuItems.length"
                          :items="actualsMenuItems"
                          :trigger-icon="mdiDotsVertical"
                          :trigger-label="`Manage data for ${selectedGroup.name}`"
                          compact
                          trigger-variant="icon-quiet"
                          @select="handleActualsMenuSelect"
                        />
                      </template>

                      <template v-else-if="activeGroupWorkspaceTab === 'forecasts'">
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
                        v-else-if="activeGroupWorkspaceTab === 'plans'"
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

                  <div class="flex flex-wrap gap-1.5">
                    <div
                      v-for="item in selectedGroupDefaults"
                      :key="item.label"
                      class="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.82rem] text-slate-700"
                    >
                      <span class="mr-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
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
                  height-class="h-12"
                  button-padding-class="px-4"
                  tab-width-class="w-[8.75rem]"
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

                  <AppStatusMessage v-if="!forecastsLoading && !forecastsError && !canLaunchModeledForecast" tone="warning">
                    Add at least {{ formatWhole(minimumForecastHistoryDays) }} daily history rows in Data before building a modeled forecast for {{ selectedGroup.name }}. Imported daily and monthly forecasts can still be created here.
                  </AppStatusMessage>

                  <AppEmptyState
                    v-if="!forecastRows.length"
                    title="No forecasts yet"
                    :description="`Create the first saved forecast for ${selectedGroup.name}. Build from Data history, import daily contacts and AHT, or enter monthly contacts.`"
                  />
                </div>

                <div v-else class="grid gap-0">
                    <div v-if="!canLaunchModeledForecast" class="px-5 pt-5">
                      <AppStatusMessage tone="warning">
                        Add at least {{ formatWhole(minimumForecastHistoryDays) }} daily history rows in Data before building a modeled forecast for {{ selectedGroup.name }}. Imported daily and monthly forecasts can still be created here.
                      </AppStatusMessage>
                    </div>

                    <div class="border-b border-slate-200 bg-white/80 px-3 py-3">
                      <div :class="forecastListRowGridClass">
                        <span class="h-9 w-1" aria-hidden="true" />

                        <div :class="[forecastComparisonGridClass, 'px-2']">
                          <span :class="planHeaderCellClass">
                            Period
                          </span>
                          <span :class="planHeaderCellClass">
                            Forecast
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
                              {{ forecast.coverageWindowLabel || forecast.planningYearLabel || '—' }}
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

              <div
                v-else-if="activeGroupWorkspaceTab === 'data'"
                class="flex-1 min-h-0 overflow-y-auto"
                @click="clearActualsSelection"
              >
                <div class="grid gap-4">
                  <div v-if="forecastHistoryRequirementMessage" class="px-5 pt-5">
                    <AppStatusMessage tone="warning">
                      {{ forecastHistoryRequirementMessage }}
                    </AppStatusMessage>
                  </div>

                  <PlanningGroupActualsView
                    ref="actualsViewRef"
                    :center="props.center"
                    :group="selectedGroup"
                    :format-whole="formatWhole"
                    :format-number="formatNumber"
                    @save-actuals="saveGroupActuals"
                    @selection-change="handleActualsSelectionChange"
                  />
                </div>
              </div>

              <div v-else-if="activeGroupWorkspaceTab === 'intraday'" class="flex-1 min-h-0 overflow-y-auto">
                <PlanningGroupIntradayView
                  :center="props.center"
                  :group="selectedGroup"
                  :format-number="formatNumber"
                  @save-intraday="saveGroupIntraday"
                />
              </div>

              <div v-else-if="planYearSections.length" class="flex-1 min-h-0 overflow-y-auto">
                <div class="grid gap-4 p-4">
                  <section
                    v-for="section in planYearSections"
                    :key="section.planningYear"
                    class="grid gap-0 border border-slate-200 bg-white"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-base font-semibold text-slate-950">
                          {{ section.planningYear }}
                        </h3>
                        <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                          Current: {{ section.currentPlan.name || section.currentPlan.planTypeLabel }}
                        </span>
                      </div>

                      <div class="grid max-w-md justify-items-end gap-1.5">
                        <div class="flex items-center justify-end gap-2">
                          <AppButton
                            v-if="section.rows.length > 1"
                            size="sm"
                            variant="secondary"
                            @click="openPlanComparison(section)"
                          >
                            Compare Plans
                          </AppButton>
                          <AppButton
                            v-if="!section.currentPlan.isDraftBudget"
                            size="sm"
                            variant="secondary"
                            :disabled="!section.actualsThroughOptions.length"
                            :title="section.actualsThroughBlocker || undefined"
                            @click="openPlanUpdate(section.currentPlan, section)"
                          >
                            Create Updated Plan
                          </AppButton>
                        </div>
                        <p
                          v-if="!section.currentPlan.isDraftBudget && section.actualsThroughBlocker"
                          class="text-right text-xs font-medium leading-5 text-rose-700"
                          role="status"
                        >
                          {{ section.actualsThroughBlocker }}
                        </p>
                      </div>
                    </div>

                    <div class="border-b border-slate-200 px-3 py-2">
                      <div :class="planListRowGridClass">
                        <span class="h-8 w-1" aria-hidden="true" />
                        <div :class="[planRowGridClass, 'px-2']">
                          <span :class="planHeaderCellClass">Plan</span>
                          <span :class="planHeaderCellRightClass">Contacts</span>
                          <span :class="planHeaderCellRightClass">Total Req Hrs</span>
                          <span :class="planHeaderCellRightClass">Avg Req HC</span>
                          <span :class="planHeaderCellRightClass">Avg Gap</span>
                          <span :class="planHeaderCellRightClass">Saved</span>
                        </div>
                        <div class="pr-2 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Actions
                        </div>
                      </div>
                    </div>

                    <div class="divide-y divide-slate-200">
                      <div
                        v-for="plan in section.rows"
                        :key="plan.id"
                        :class="[planListRowGridClass, 'min-h-20 cursor-pointer px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d2df]', plan.isSelectedYear ? 'bg-[#e7eef4]' : 'bg-white hover:bg-slate-50/70']"
                        tabindex="0"
                        role="button"
                        :aria-label="`Select ${plan.name || plan.planningYear} plan for ${selectedGroup.name}`"
                        @click="selectPlanYear(plan.planningYear)"
                        @dblclick="navigateToHash(plan.openHref)"
                        @keydown.enter.prevent="navigateToHash(plan.openHref)"
                        @keydown.space.prevent="selectPlanYear(plan.planningYear)"
                      >
                        <span
                          class="h-10 w-1 rounded-full transition"
                          :class="plan.isCurrent ? 'bg-[#15395f]' : 'bg-transparent'"
                          aria-hidden="true"
                        />

                        <div :class="[planRowGridClass, 'rounded-[16px] px-2 py-1.5 text-sm']">
                          <div class="grid min-w-0 gap-1 px-3">
                            <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                              <strong class="truncate text-slate-950">{{ plan.name || `${plan.planningYear} Plan` }}</strong>
                              <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-600">
                                {{ plan.planTypeLabel }}
                              </span>
                              <span
                                v-if="plan.isCurrent"
                                class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-emerald-700"
                              >
                                Current
                              </span>
                            </div>
                            <span
                              class="truncate text-[0.78rem] text-slate-500"
                              :title="plan.isUpdate ? (plan.decisionReason || 'Decision reason not recorded for this legacy update.') : undefined"
                            >
                              {{ plan.isUpdate
                                ? `${plan.actualsThroughBadge || 'Update'} · ${plan.decisionReason || 'Decision reason not recorded (legacy plan)'}`
                                : plan.requirementMethodLabel }}
                            </span>
                          </div>
                          <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                            {{ formatWhole(plan.annualContacts) }}
                          </span>
                          <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                            {{ formatWhole(plan.totalRequiredStaffHours) }}
                          </span>
                          <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                            {{ formatNumber(plan.averageTotalRequiredHeadcount, 1) }}
                          </span>
                          <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                            {{ formatSignedNumber(plan.averageGapToRequirement, 1) }}
                          </span>
                          <span class="truncate px-3 text-right font-medium tabular-nums text-slate-700">
                            {{ plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString() : '—' }}
                          </span>
                        </div>

                        <div class="flex items-center justify-end gap-1.5 whitespace-nowrap" @click.stop @keydown.stop>
                          <AppButton
                            size="sm"
                            variant="quiet"
                            :href="plan.openHref"
                            :aria-label="`Open ${plan.name || plan.planningYear} plan for ${selectedGroup.name}`"
                          >
                            Open
                          </AppButton>
                          <AppMenu
                            :items="buildPlanMenuItems(plan)"
                            :trigger-icon="mdiDotsVertical"
                            :trigger-label="`Open actions for ${plan.name || plan.planningYear} plan`"
                            compact
                            trigger-variant="icon-quiet"
                            @select="handlePlanMenuSelect(plan, $event)"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div v-else class="flex-1 min-h-0 overflow-y-auto p-5">
                <AppEmptyState
                  title="No plans yet"
                  :description="`Use New Plan to create the first saved plan for ${selectedGroup.name}.`"
                />
              </div>
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
      v-model:service-level-percent="groupDraft.serviceLevelPercent"
      v-model:service-level-threshold-seconds="groupDraft.serviceLevelThresholdSeconds"
      :title="groupDraft.id ? 'Edit Staffing Group' : 'Create Staffing Group'"
      :submit-label="groupDraft.id ? 'Save Staffing Group' : 'Create Staffing Group'"
      @close="closeGroupSettings"
      @save="saveGroup"
    />

    <PlannerSettingsModal
      v-if="planSettingsOpen && selectedGroup"
      v-model:planning-year="newPlanYear"
      v-model:requirement-method="newPlanRequirementMethod"
      :year-options="availablePlanYearOptions"
      :requirement-method-options="PLAN_REQUIREMENT_METHOD_OPTIONS"
      :can-close="canCreatePlanDraft"
      :existing-plan-href="existingPlanHref"
      :status-message="planSettingsStatusMessage"
      :status-tone="planSettingsStatusTone"
      title="New Plan"
      description="Choose a planning year that already has a completed staffing-group forecast. Each staffing group can have one Budget plan per year."
      submit-label="Create Plan"
      @cancel="closePlanSettings"
      @close="createPlan"
    />

    <PlanningForecastCreateModal
      v-if="forecastCreateOpen && selectedGroup"
      v-model:planning-year="newForecastYear"
      v-model:source-kind="newForecastSourceKind"
      v-model:period-mode="newForecastPeriodMode"
      v-model:coverage-start-month="newForecastCoverageStartMonth"
      v-model:coverage-end-month="newForecastCoverageEndMonth"
      :year-options="forecastYearOptions"
      :month-options="forecastMonthOptions"
      :can-create="canCreateForecast"
      :coverage-message="forecastCoverageMessage"
      :modeled-forecast-unavailable-message="`Add at least ${formatWhole(minimumForecastHistoryDays)} daily history rows in Data before building a modeled forecast for ${selectedGroup.name}.`"
      @cancel="closeForecastCreate"
      @create="createForecast"
    />

    <PlanningPlanUpdateModal
      v-if="updateSourcePlan"
      v-model:visible="planUpdateOpen"
      v-model:actuals-through-month="updateActualsThroughMonth"
      v-model:update-name="updatePlanName"
      v-model:decision-reason="updateDecisionReason"
      :source-plan="updateSourcePlan"
      :budget-plan="updateBudgetPlan"
      :actuals-through-options="updateActualsThroughOptions"
      :actuals-through-blocker="updateActualsThroughBlocker"
      @cancel="closePlanUpdate"
      @create="createPlanUpdate"
    />

    <PlanningPlanComparisonDialog
      v-if="planComparisonSection"
      v-model:visible="planComparisonOpen"
      :center="props.center"
      :group-name="selectedGroup?.name || 'Staffing Group'"
      :section="planComparisonSection"
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
