<script setup>
import { computed, ref, watch } from 'vue'
import {
  mdiAccountGroupOutline,
  mdiChartLineVariant,
  mdiDownload,
  mdiDotsVertical,
  mdiGauge,
  mdiOfficeBuildingOutline,
  mdiPlus,
  mdiTarget
} from '@mdi/js'

import CallCenterSettingsModal from './planning/CallCenterSettingsModal.vue'
import PlanningPortfolioHeadcountChart from './planning/PlanningPortfolioHeadcountChart.vue'
import AppButton from './ui/AppButton.vue'
import AppConfirmDialog from './ui/AppConfirmDialog.vue'
import AppEmptyState from './ui/AppEmptyState.vue'
import AppIcon from './ui/AppIcon.vue'
import AppMenu from './ui/AppMenu.vue'
import AppPageHeader from './ui/AppPageHeader.vue'
import AppPanel from './ui/AppPanel.vue'
import AppSelect from './ui/AppSelect.vue'
import { buildPlanningCenterHash, navigateToHash } from '../appRoutes'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import { downloadCsv } from '../csvExport'
import { createPlanningCenterDraft } from '../planningStorage'
import { getCenterGroups, getGroupPlans } from '../planningSummary'
import { buildAnnualPlanningRollup } from '../planner/annualPlanningRollup'
import { resolvePlanningGroupActuals } from '../planner/groupActuals'
import { buildPortfolioMonthlyCsv } from '../planner/portfolioCsv'
import { getCurrentCalendarYear } from '../planner/shared'

const props = defineProps({
  centers: {
    type: Array,
    default: () => []
  },
  weekdayOptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['save-center', 'delete-center'])

const centerSettingsOpen = ref(false)
const centerDraft = ref(createPlanningCenterDraft())
const selectedPlanningYear = ref(getCurrentCalendarYear())
const {
  dialogVisible: deleteCenterDialogOpen,
  dialogTitle: deleteCenterDialogTitle,
  dialogDescription: deleteCenterDialogDescription,
  dialogConfirmLabel: deleteCenterDialogConfirmLabel,
  requestConfirmation: requestDeleteCenterConfirmation,
  confirmPendingAction: confirmDeleteCenter
} = useConfirmDialog()

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(toFiniteNumber(value))

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(toFiniteNumber(value))

const formatAht = (seconds) => {
  const totalSeconds = Number(seconds)
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '-'
  }

  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = Math.round(totalSeconds % 60)
  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
}

const formatOptionalWhole = (value) => {
  if (value == null || value === '') {
    return '-'
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? formatWhole(numericValue) : '-'
}

const formatOptionalSignedNumber = (value, digits = 1) => {
  if (value == null || value === '') {
    return '-'
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  const prefix = numericValue > 0 ? '+' : ''
  return `${prefix}${formatNumber(numericValue, digits)}`
}

const formatOptionalPercent = (value, digits = 1) => {
  if (value == null || value === '') {
    return 'Waiting for actuals'
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 'Waiting for actuals'
  }

  const prefix = numericValue > 0 ? '+' : ''
  return `${prefix}${formatNumber(numericValue, digits)}%`
}

const signedValueClass = (value, positiveGood = true) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || Math.abs(numericValue) <= 0.05) {
    return 'text-slate-700'
  }

  const isPositive = numericValue > 0
  return isPositive === positiveGood ? 'text-emerald-700' : 'text-rose-700'
}

const availablePlanningYears = computed(() => {
  const years = new Set()

  props.centers.forEach((center) => {
    getCenterGroups(center).forEach((group) => {
      getGroupPlans(group).forEach((plan) => {
        const planningYear = Number(plan?.planningYear)
        if (Number.isFinite(planningYear) && planningYear > 0) {
          years.add(planningYear)
        }
      })
    })
  })

  if (!years.size) {
    years.add(getCurrentCalendarYear())
  }

  return [...years].sort((left, right) => right - left)
})

watch(
  availablePlanningYears,
  (years) => {
    const currentCalendarYear = getCurrentCalendarYear()
    const preferredYear = years.includes(currentCalendarYear) ? currentCalendarYear : years[0]

    if (!years.includes(Number(selectedPlanningYear.value))) {
      selectedPlanningYear.value = preferredYear
      return
    }

    if (selectedPlanningYear.value == null) {
      selectedPlanningYear.value = preferredYear
    }
  },
  { immediate: true }
)

const planningYearOptions = computed(() =>
  availablePlanningYears.value.map((year) => ({
    label: String(year),
    value: year
  }))
)

const portfolioAnnualPlan = computed(() =>
  buildAnnualPlanningRollup({
    centers: props.centers,
    planningYear: selectedPlanningYear.value
  })
)

const portfolioMonthlyRows = computed(() => portfolioAnnualPlan.value.monthlyRows)
const dashboardSummary = computed(() => portfolioAnnualPlan.value.summary)
const hasApplicablePlan = computed(() => dashboardSummary.value.plannedGroupCount > 0)
const canDownloadPortfolioCsv = computed(() => hasApplicablePlan.value)

const modeledCenterCount = computed(() =>
  centerCommandRows.value.filter((center) => center.plannedGroupCount > 0).length
)

const centerStatusConfig = (centerRow) => {
  if (centerRow.groupCount === 0) {
    return {
      label: 'Setup Needed',
      tone: 'info'
    }
  }

  if (centerRow.missingPlanCount > 0) {
    return {
      label: 'Plan Gap',
      tone: 'warning'
    }
  }

  if (centerRow.hasStaffingRisk) {
    return {
      label: 'Staffing Risk',
      tone: 'danger'
    }
  }

  if (centerRow.hasActualsGap) {
    return {
      label: 'Actuals Gap',
      tone: 'warning'
    }
  }

  return {
    label: 'Ready',
    tone: 'success'
  }
}

const centerCommandRows = computed(() =>
  props.centers
    .map((center) => {
      const rollup = buildAnnualPlanningRollup({
        centers: [center],
        planningYear: selectedPlanningYear.value
      })
      const summary = rollup.summary
      const groupCount = toFiniteNumber(summary.groupCount)
      const plannedGroupCount = toFiniteNumber(summary.plannedGroupCount)
      const groupsWithActualsCount = toFiniteNumber(summary.groupsWithActualsCount)
      const missingPlanCount = Math.max(groupCount - plannedGroupCount, 0)
      const missingActualsCount = Math.max(groupCount - groupsWithActualsCount, 0)
      const monthsBelowRequirement = toFiniteNumber(summary.monthsBelowRequirement)
      const averageGapToRequirement = toFiniteNumber(summary.averageGapToRequirement)
      const peakRequiredHeadcount = toFiniteNumber(summary.peakRequiredHeadcount)
      const expectedContacts = toFiniteNumber(summary.expectedContacts)
      const hasStaffingRisk = monthsBelowRequirement > 0 || averageGapToRequirement < -0.05
      const hasActualsGap = groupCount > 0 && (
        groupsWithActualsCount < groupCount ||
        toFiniteNumber(summary.monthsWithActualsCount) < 12
      )
      const baseRow = {
        ...center,
        rollup,
        summary,
        groupCount,
        plannedGroupCount,
        groupsWithActualsCount,
        missingPlanCount,
        missingActualsCount,
        monthsBelowRequirement,
        averageGapToRequirement,
        peakRequiredHeadcount,
        expectedContacts,
        hasStaffingRisk,
        hasActualsGap,
        planCoverageLabel: `${formatWhole(plannedGroupCount)}/${formatWhole(groupCount)}`,
        actualsCoverageLabel: `${formatWhole(groupsWithActualsCount)}/${formatWhole(groupCount)}`,
        actualsCoverageMeta: `${formatWhole(summary.monthsWithActualsCount)} of 12 months`,
        riskRank: hasStaffingRisk ? 0 : 1
      }
      const status = centerStatusConfig(baseRow)

      return {
        ...baseRow,
        statusLabel: status.label,
        statusTone: status.tone
      }
    })
    .sort((left, right) => {
      if (left.riskRank !== right.riskRank) {
        return left.riskRank - right.riskRank
      }

      const peakDifference = right.peakRequiredHeadcount - left.peakRequiredHeadcount
      if (peakDifference !== 0) {
        return peakDifference
      }

      const contactDifference = right.expectedContacts - left.expectedContacts
      if (contactDifference !== 0) {
        return contactDifference
      }

      return left.name.localeCompare(right.name)
    })
)

const nextPlanSetupCenter = computed(() =>
  centerCommandRows.value.find((center) => center.missingPlanCount > 0 || center.groupCount === 0) ||
  centerCommandRows.value[0] ||
  null
)

const unmodeledPortfolioDescription = computed(() => {
  const summary = dashboardSummary.value
  const groupCount = toFiniteNumber(summary.groupCount)
  const groupsWithActualsCount = toFiniteNumber(summary.groupsWithActualsCount)
  const nextCenterName = nextPlanSetupCenter.value?.name || 'a call center'

  if (groupCount === 0) {
    return `None of the ${formatWhole(summary.centerCount)} call centers has a staffing group. Open ${nextCenterName} to add a group, import a forecast, and create a ${selectedPlanningYear.value} plan.`
  }

  const actualsContext = groupsWithActualsCount > 0
    ? ` Actuals exist for ${formatWhole(groupsWithActualsCount)} group${groupsWithActualsCount === 1 ? '' : 's'}, but staffing requirements remain unavailable without a plan.`
    : ''

  return `Plan coverage is 0 of ${formatWhole(groupCount)} staffing groups.${actualsContext} Open ${nextCenterName} to import a forecast and create a ${selectedPlanningYear.value} plan.`
})

const portfolioHeadcountChart = computed(() => ({
  neededTotals: portfolioMonthlyRows.value.map((row) => row.requiredHeadcount),
  startingFrontlineTotals: portfolioMonthlyRows.value.map((row) => row.startingFrontlineHeadcount),
  frontlineAdditionTotals: portfolioMonthlyRows.value.map((row) => row.frontlineReadyHeadcount),
  frontlineTotals: portfolioMonthlyRows.value.map((row) => row.endingFrontlineHeadcount),
  totalHeadcountTotals: portfolioMonthlyRows.value.map((row) => row.endingRosterHeadcount),
  hireTotals: portfolioMonthlyRows.value.map((row) => row.hireHeadcount),
  attritionTotals: portfolioMonthlyRows.value.map((row) => row.frontlineAttritionHeadcount)
}))

const portfolioCommandStats = computed(() => {
  const summary = dashboardSummary.value
  const hasActuals = toFiniteNumber(summary.monthsWithActualsCount) > 0

  return [
    {
      label: 'Call Centers',
      value: formatWhole(summary.centerCount),
      meta: `${formatWhole(modeledCenterCount.value)} with ${selectedPlanningYear.value} plans`,
      icon: mdiOfficeBuildingOutline
    },
    {
      label: 'Staffing Groups',
      value: formatWhole(summary.groupCount),
      meta: `${formatWhole(summary.plannedGroupCount)} planned`,
      icon: mdiAccountGroupOutline
    },
    {
      label: 'Plan Coverage',
      value: `${formatWhole(summary.plannedGroupCount)}/${formatWhole(summary.groupCount)}`,
      meta: `${formatNumber(summary.planCoveragePercent, 0)}% of groups`,
      icon: mdiTarget
    },
    {
      label: 'Actuals Coverage',
      value: `${formatWhole(summary.groupsWithActualsCount)}/${formatWhole(summary.groupCount)}`,
      meta: `${formatWhole(summary.monthsWithActualsCount)} of 12 months`,
      icon: mdiChartLineVariant
    },
    {
      label: 'Expected Contacts',
      value: formatWhole(summary.expectedContacts),
      meta: `${selectedPlanningYear.value} plan`,
      icon: mdiGauge
    },
    {
      label: 'Actual Contacts',
      value: hasActuals ? formatWhole(summary.actualContacts) : '-',
      meta: hasActuals ? 'Loaded actuals' : 'Waiting for actuals',
      icon: mdiChartLineVariant
    },
    {
      label: 'Staffing Gap',
      value: formatOptionalSignedNumber(summary.averageGapToRequirement, 1),
      meta: `${formatWhole(summary.monthsBelowRequirement)} months below requirement`,
      icon: mdiTarget,
      valueClass: signedValueClass(summary.averageGapToRequirement)
    },
    {
      label: 'Peak Required HC',
      value: formatNumber(summary.peakRequiredHeadcount, 1),
      meta: `Avg ${formatNumber(summary.averageRequiredHeadcount, 1)}`,
      icon: mdiAccountGroupOutline
    }
  ]
})

const centerMenuItems = [
  {
    id: 'edit-center',
    label: 'Edit'
  },
  {
    id: 'delete-center',
    label: 'Delete'
  }
]

const isEditingCenter = computed(() => Boolean(centerDraft.value?.id))

const centerSettingsTitle = computed(() =>
  isEditingCenter.value ? 'Edit Call Center' : 'Create Call Center'
)

const centerSettingsSubmitLabel = computed(() =>
  isEditingCenter.value ? 'Save Call Center' : 'Create Call Center'
)

const centerSettingsMinimumHolidayYear = computed(() => {
  const earliestYears = getCenterGroups(centerDraft.value)
    .map((group) => {
      const earliestServiceDate = resolvePlanningGroupActuals(group).dailyRows[0]?.serviceDate || ''
      const earliestYear = Number(earliestServiceDate.slice(0, 4))
      return Number.isInteger(earliestYear) && earliestYear > 0 ? earliestYear : null
    })
    .filter(Boolean)

  return earliestYears.length ? Math.min(...earliestYears) : null
})

const statusPillClass = (tone) => ({
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700'
}[tone] || 'border-slate-200 bg-slate-50 text-slate-600')

const openCreateCenter = () => {
  centerDraft.value = createPlanningCenterDraft()
  centerSettingsOpen.value = true
}

const openEditCenter = (center) => {
  centerDraft.value = createPlanningCenterDraft({
    id: center.id,
    name: center.name,
    holidayProfiles: center.holidayProfiles,
    operatingWeekdays: center.operatingWeekdays,
    operatingOpenTime: center.operatingOpenTime,
    operatingCloseTime: center.operatingCloseTime,
    defaultPaidHoursPerDay: center.defaultPaidHoursPerDay,
    defaultOccupancyPercent: center.defaultOccupancyPercent,
    defaultAdherencePercent: center.defaultAdherencePercent,
    createdAt: center.createdAt,
    updatedAt: center.updatedAt,
    groups: center.groups
  })
  centerSettingsOpen.value = true
}

const closeCreateCenter = () => {
  centerSettingsOpen.value = false
}

const saveCenter = () => {
  emit('save-center', centerDraft.value)
  centerSettingsOpen.value = false
}

const openCenter = (centerId) => {
  navigateToHash(buildPlanningCenterHash(centerId))
}

const downloadPortfolioCsv = () => {
  if (!canDownloadPortfolioCsv.value) {
    return
  }

  downloadCsv(
    `wfm-portfolio-current-plan-${selectedPlanningYear.value}.csv`,
    buildPortfolioMonthlyCsv({
      planningYear: selectedPlanningYear.value,
      planRole: 'current',
      groupCount: dashboardSummary.value.groupCount,
      monthlyRows: portfolioMonthlyRows.value
    })
  )
}

const requestDeleteCenter = (center) => {
  requestDeleteCenterConfirmation({
    title: 'Delete Call Center?',
    description: `Delete "${center.name}"? This removes the call center and all ${center.groupCount} staffing group${center.groupCount === 1 ? '' : 's'} inside it.`,
    confirmLabel: 'Delete Call Center',
    onConfirm: () => {
      emit('delete-center', center.id)
    }
  })
}

const handleCenterMenuSelect = (center, item) => {
  if (item.id === 'edit-center') {
    openEditCenter(center)
    return
  }

  if (item.id === 'delete-center') {
    requestDeleteCenter(center)
  }
}
</script>

<template>
  <section class="bg-slate-50/80 py-4 md:py-5">
    <div class="app-frame grid gap-4">
      <AppPageHeader
        :breadcrumbs="[
          { label: 'Home', href: '#home' },
          { label: 'Call Centers' }
        ]"
        title="Planning Portfolio"
        description="Demand, actuals, staffing coverage, and call-center performance for the selected year."
      >
        <template #actions>
          <div class="flex flex-wrap items-end gap-2">
            <div class="grid min-w-[6.75rem] gap-1">
              <label
                for="portfolio-year"
                class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                Planning Year
              </label>
              <AppSelect
                id="portfolio-year"
                v-model="selectedPlanningYear"
                :options="planningYearOptions"
                class="w-[6.75rem]"
                aria-label="Planning Year"
              />
            </div>

            <AppButton size="sm" :icon="mdiPlus" variant="primary" @click="openCreateCenter">
              New Center
            </AppButton>
          </div>
        </template>
      </AppPageHeader>

      <AppPanel v-if="!props.centers.length">
        <AppEmptyState
          title="Create the first call center"
          description="Create a call center, add staffing groups, then build annual plans so the portfolio view has data to compare."
        />
      </AppPanel>

      <template v-else>
        <section v-if="hasApplicablePlan" class="grid overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="item in portfolioCommandStats"
            :key="item.label"
            class="grid gap-2 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0"
          >
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]">
                <AppIcon :path="item.icon" class="h-4 w-4" />
              </span>
              <span class="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                {{ item.label }}
              </span>
            </div>
            <strong
              class="text-xl font-semibold tracking-[-0.04em]"
              :class="item.valueClass || 'text-slate-950'"
            >
              {{ item.value }}
            </strong>
            <small class="text-[0.78rem] leading-4 text-slate-500">
              {{ item.meta }}
            </small>
          </article>
        </section>

        <div v-if="hasApplicablePlan" class="grid gap-4">
          <AppPanel :padded="false">
            <div class="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="grid gap-1">
                <h2 class="text-lg font-semibold tracking-[-0.04em] text-slate-950">Portfolio Monthly Operating Plan</h2>
                <p class="text-sm text-slate-500">
                  Current-plan rollup for all call centers in {{ selectedPlanningYear }}. Missing actuals remain unavailable.
                </p>
              </div>

              <AppButton
                variant="secondary"
                size="sm"
                :icon="mdiDownload"
                :disabled="!canDownloadPortfolioCsv"
                @click="downloadPortfolioCsv"
              >
                Download Portfolio CSV
              </AppButton>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full min-w-[76rem] border-collapse text-sm">
                <thead class="border-b border-slate-200 bg-slate-50/85">
                  <tr>
                    <th scope="col" class="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Month</th>
                    <th scope="col" class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Plan Contacts</th>
                    <th scope="col" class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Actual Contacts</th>
                    <th scope="col" class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Variance</th>
                    <th scope="col" class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Plan AHT</th>
                    <th scope="col" class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Actual AHT</th>
                    <th scope="col" class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Req HC</th>
                    <th scope="col" class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Frontline HC</th>
                    <th scope="col" class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Gap</th>
                    <th scope="col" class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">Actual Days</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-200 bg-white">
                  <tr
                    v-for="row in portfolioMonthlyRows"
                    :key="row.monthStart"
                    class="transition hover:bg-slate-50/70"
                    :class="row.isBelowRequirement ? 'bg-rose-50/35' : 'bg-white'"
                  >
                    <td class="px-4 py-3 font-semibold text-slate-950">{{ row.monthLabel }}</td>
                    <td class="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{{ formatWhole(row.expectedContacts) }}</td>
                    <td class="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{{ formatOptionalWhole(row.actualContacts) }}</td>
                    <td
                      class="px-4 py-3 text-right font-semibold tabular-nums"
                      :class="signedValueClass(row.contactVariance, false)"
                    >
                      {{ formatOptionalSignedNumber(row.contactVariance, 0) }}
                    </td>
                    <td class="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{{ formatAht(row.expectedAhtSeconds) }}</td>
                    <td class="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{{ formatAht(row.actualAhtSeconds) }}</td>
                    <td class="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{{ formatNumber(row.requiredHeadcount, 1) }}</td>
                    <td class="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{{ formatNumber(row.endingFrontlineHeadcount, 1) }}</td>
                    <td
                      class="px-4 py-3 text-right font-semibold tabular-nums"
                      :class="signedValueClass(row.gapToRequirement)"
                    >
                      {{ formatOptionalSignedNumber(row.gapToRequirement, 1) }}
                    </td>
                    <td class="px-4 py-3 text-right font-medium tabular-nums text-slate-700">
                      {{ row.daysLoaded ? formatWhole(row.daysLoaded) : '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AppPanel>
        </div>

        <PlanningPortfolioHeadcountChart
          v-if="hasApplicablePlan"
          :planning-year="selectedPlanningYear"
          :needed-totals="portfolioHeadcountChart.neededTotals"
          :starting-frontline-totals="portfolioHeadcountChart.startingFrontlineTotals"
          :frontline-addition-totals="portfolioHeadcountChart.frontlineAdditionTotals"
          :frontline-totals="portfolioHeadcountChart.frontlineTotals"
          :total-headcount-totals="portfolioHeadcountChart.totalHeadcountTotals"
          :hire-totals="portfolioHeadcountChart.hireTotals"
          :attrition-totals="portfolioHeadcountChart.attritionTotals"
          :format-number="formatNumber"
        />

        <AppPanel v-if="!hasApplicablePlan">
          <AppEmptyState
            :title="`${selectedPlanningYear} operating report needs plans`"
            :description="unmodeledPortfolioDescription"
          >
            <div v-if="nextPlanSetupCenter" class="mt-2 flex items-center gap-3">
              <AppButton
                size="sm"
                variant="primary"
                @click="openCenter(nextPlanSetupCenter.id)"
              >
                Open {{ nextPlanSetupCenter.name }}
              </AppButton>
              <span class="text-xs text-slate-500">
                Current-plan scope · {{ selectedPlanningYear }}
              </span>
            </div>
          </AppEmptyState>
        </AppPanel>

        <AppPanel :padded="false">
          <div class="border-b border-slate-200 px-5 py-4">
            <div class="grid gap-1">
              <h2 class="text-lg font-semibold tracking-[-0.04em] text-slate-950">Call Center Command List</h2>
              <p class="text-sm text-slate-500">
                Ranked by staffing risk, then peak requirement, then annual contact volume.
              </p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[78rem] border-collapse text-sm text-slate-700">
              <thead class="border-b border-slate-200 bg-slate-50/85">
                <tr>
                  <th class="px-5 py-3.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Call Center</th>
                  <th class="px-4 py-3.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Status</th>
                  <th class="px-4 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Plan Coverage</th>
                  <th class="px-4 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Actuals</th>
                  <th class="px-4 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Plan Contacts</th>
                  <th class="px-4 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Actual Vs Plan</th>
                  <th class="px-4 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Avg Req HC</th>
                  <th class="px-4 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Peak Req HC</th>
                  <th class="px-4 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Staffing Gap</th>
                  <th class="px-5 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 bg-white">
                <tr
                  v-for="center in centerCommandRows"
                  :key="center.id"
                  class="transition hover:bg-slate-50"
                >
                  <td class="px-5 py-4 align-middle">
                    <div class="grid grid-cols-[auto_1fr] items-center gap-3">
                      <div class="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]">
                        <AppIcon :path="mdiOfficeBuildingOutline" class="h-5 w-5" />
                      </div>
                      <div class="grid gap-1">
                        <strong class="text-sm font-semibold text-slate-950">{{ center.name }}</strong>
                        <span class="text-xs text-slate-500">
                          {{ formatWhole(center.groupCount) }} staffing group{{ center.groupCount === 1 ? '' : 's' }}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-4 align-middle">
                    <span
                      class="inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em]"
                      :class="statusPillClass(center.statusTone)"
                    >
                      {{ center.statusLabel }}
                    </span>
                  </td>
                  <td class="px-4 py-4 text-right align-middle tabular-nums">
                    <div class="grid gap-0.5">
                      <strong class="font-semibold text-slate-900">{{ center.planCoverageLabel }}</strong>
                      <span class="text-xs text-slate-500">groups planned</span>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-right align-middle tabular-nums">
                    <div class="grid gap-0.5">
                      <strong class="font-semibold text-slate-900">{{ center.actualsCoverageLabel }}</strong>
                      <span class="text-xs text-slate-500">{{ center.actualsCoverageMeta }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-right align-middle tabular-nums">
                    {{ center.plannedGroupCount > 0 ? formatWhole(center.summary.expectedContacts) : '-' }}
                  </td>
                  <td
                    class="px-4 py-4 text-right align-middle font-semibold tabular-nums"
                    :class="signedValueClass(center.summary.contactVariance, false)"
                  >
                    <div class="grid gap-0.5">
                      <span>{{ center.plannedGroupCount > 0 ? formatOptionalSignedNumber(center.summary.contactVariance, 0) : '-' }}</span>
                      <span class="text-xs font-medium text-slate-500">
                        {{ center.plannedGroupCount > 0 ? formatOptionalPercent(center.summary.contactVariancePercent, 1) : 'Plan required' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-right align-middle tabular-nums">
                    {{ center.plannedGroupCount > 0 ? formatNumber(center.summary.averageRequiredHeadcount, 1) : '-' }}
                  </td>
                  <td class="px-4 py-4 text-right align-middle font-semibold tabular-nums text-slate-900">
                    {{ center.plannedGroupCount > 0 ? formatNumber(center.summary.peakRequiredHeadcount, 1) : '-' }}
                  </td>
                  <td
                    class="px-4 py-4 text-right align-middle font-semibold tabular-nums"
                    :class="signedValueClass(center.summary.averageGapToRequirement)"
                  >
                    <div class="grid gap-0.5">
                      <span>{{ center.plannedGroupCount > 0 ? formatOptionalSignedNumber(center.summary.averageGapToRequirement, 1) : '-' }}</span>
                      <span class="text-xs font-medium text-slate-500">
                        {{ center.plannedGroupCount > 0 ? `${formatWhole(center.summary.monthsBelowRequirement)} months below` : 'Plan required' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-5 py-4 align-middle">
                    <div class="flex justify-end gap-2 whitespace-nowrap">
                      <AppButton size="sm" variant="quiet" @click="openCenter(center.id)">Open</AppButton>
                      <div @click.stop @keydown.stop>
                        <AppMenu
                          :items="centerMenuItems"
                          :trigger-icon="mdiDotsVertical"
                          :trigger-label="`Open actions for ${center.name}`"
                          compact
                          trigger-variant="icon-quiet"
                          @select="handleCenterMenuSelect(center, $event)"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppPanel>
      </template>
    </div>

    <CallCenterSettingsModal
      v-if="centerSettingsOpen"
      v-model:center-name="centerDraft.name"
      v-model:holiday-profiles="centerDraft.holidayProfiles"
      v-model:operating-weekdays="centerDraft.operatingWeekdays"
      v-model:operating-open-time="centerDraft.operatingOpenTime"
      v-model:operating-close-time="centerDraft.operatingCloseTime"
      :display-year="selectedPlanningYear"
      :minimum-holiday-year="centerSettingsMinimumHolidayYear"
      :weekday-options="props.weekdayOptions"
      :allow-backdrop-close="false"
      :title="centerSettingsTitle"
      :submit-label="centerSettingsSubmitLabel"
      @close="closeCreateCenter"
      @save="saveCenter"
    />

    <AppConfirmDialog
      v-model:visible="deleteCenterDialogOpen"
      :title="deleteCenterDialogTitle"
      :description="deleteCenterDialogDescription"
      :confirm-label="deleteCenterDialogConfirmLabel"
      @confirm="confirmDeleteCenter"
    />
  </section>
</template>
