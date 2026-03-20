<script setup>
import { computed, ref, watch } from 'vue'
import {
  mdiDotsVertical,
  mdiOfficeBuildingOutline,
  mdiPlus,
} from '@mdi/js'

import CallCenterSettingsModal from './planning/CallCenterSettingsModal.vue'
import PlanningPortfolioHeadcountChart from './planning/PlanningPortfolioHeadcountChart.vue'
import AppButton from './ui/AppButton.vue'
import AppEmptyState from './ui/AppEmptyState.vue'
import AppIcon from './ui/AppIcon.vue'
import AppMenu from './ui/AppMenu.vue'
import AppPageHeader from './ui/AppPageHeader.vue'
import AppPanel from './ui/AppPanel.vue'
import AppSelect from './ui/AppSelect.vue'
import AppStatStrip from './ui/AppStatStrip.vue'
import AppTableShell from './ui/AppTableShell.vue'
import { createPlanningCenterDraft } from '../planningStorage'
import { getCenterGroups, getGroupPlans, summarizeCenterForYear, summarizeCenterPortfolioForYear } from '../planningSummary'
import { computeMonthlyRecords } from '../planner/demandModel'

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
const selectedPlanningYear = ref(new Date().getFullYear())

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

const formatAht = (seconds) => {
  const totalSeconds = Number(seconds) || 0
  if (totalSeconds <= 0) {
    return '0m 00s'
  }

  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = Math.round(totalSeconds % 60)
  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
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
    years.add(new Date().getFullYear())
  }

  return [...years].sort((left, right) => right - left)
})

watch(
  availablePlanningYears,
  (years) => {
    const currentCalendarYear = new Date().getFullYear()
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

const dashboardSummary = computed(() => summarizeCenterPortfolioForYear(props.centers, selectedPlanningYear.value))
const centerRows = computed(() =>
  props.centers
    .map((center) => ({
      ...center,
      summary: summarizeCenterForYear(center, selectedPlanningYear.value)
    }))
    .sort((left, right) => {
      const peakDifference = (Number(right.summary.totalPeakHeadcount) || 0) - (Number(left.summary.totalPeakHeadcount) || 0)
      if (peakDifference !== 0) {
        return peakDifference
      }

      const contactDifference = (Number(right.summary.annualContacts) || 0) - (Number(left.summary.annualContacts) || 0)
      if (contactDifference !== 0) {
        return contactDifference
      }

      return left.name.localeCompare(right.name)
    })
)

const modeledCenterCount = computed(() =>
  centerRows.value.filter((center) => Number(center.summary.totalPlanCount) > 0).length
)

const centersWithoutPlansCount = computed(() =>
  Math.max((Number(dashboardSummary.value.callCenterCount) || 0) - Number(modeledCenterCount.value || 0), 0)
)

const groupsWithoutPlansCount = computed(() =>
  Math.max((Number(dashboardSummary.value.totalGroupCount) || 0) - (Number(dashboardSummary.value.totalPlanCount) || 0), 0)
)

const groupPlanCoveragePercent = computed(() => {
  const totalGroups = Number(dashboardSummary.value.totalGroupCount) || 0
  if (totalGroups <= 0) {
    return 0
  }

  return ((Number(dashboardSummary.value.totalPlanCount) || 0) / totalGroups) * 100
})

const summaryStripItems = computed(() => [
  {
    label: 'Call Centers',
    value: formatWhole(dashboardSummary.value.callCenterCount),
    meta: 'Configured operations'
  },
  {
    label: 'Modeled Centers',
    value: formatWhole(modeledCenterCount.value),
    meta: 'With saved plans'
  },
  {
    label: 'Without Plans',
    value: formatWhole(centersWithoutPlansCount.value),
    meta: 'Without saved plans'
  },
  {
    label: 'Staffing Groups',
    value: formatWhole(dashboardSummary.value.totalGroupCount),
    meta: 'Planned teams'
  },
  {
    label: 'Annual Plans',
    value: formatWhole(dashboardSummary.value.totalPlanCount),
    meta: 'Saved plan years'
  },
  {
    label: 'Plan Coverage',
    value: `${formatNumber(groupPlanCoveragePercent.value, 1)}%`,
    meta: `${formatWhole(groupsWithoutPlansCount.value)} groups without saved plans`
  },
  {
    label: 'Annual Contacts',
    value: formatWhole(dashboardSummary.value.annualContacts),
    meta: 'Modeled demand'
  },
  {
    label: 'Workload Hours',
    value: formatWhole(dashboardSummary.value.annualWorkloadHours),
    meta: 'Annual workload'
  },
  {
    label: 'Average AHT',
    value: formatAht(dashboardSummary.value.averageAhtSeconds),
    meta: 'Blended handle time'
  },
  {
    label: 'Needed Staff Hours',
    value: formatWhole(dashboardSummary.value.totalNeededStaffHours),
    meta: 'Staffing requirement'
  },
  {
    label: 'Average Required HC',
    value: formatNumber(dashboardSummary.value.totalAvgRequiredHeadcount, 1),
    meta: 'Average requirement'
  },
  {
    label: 'Peak Required Headcount',
    value: formatNumber(dashboardSummary.value.totalPeakHeadcount, 1),
    meta: 'Peak headcount'
  }
])

const chartPalette = [
  '#15395f',
  '#24527d',
  '#35689a',
  '#4a7eaf',
  '#5f93c1',
  '#759fd0',
  '#8aaed8',
  '#5f7d5a',
  '#7f8f5d',
  '#8c6f51',
  '#7b5f8c',
  '#4d657e'
]

const portfolioHeadcountSeries = computed(() => {
  const series = []

  props.centers.forEach((center) => {
    getCenterGroups(center).forEach((group) => {
      const plan = getGroupPlans(group).find((item) => Number(item?.planningYear) === Number(selectedPlanningYear.value))

      if (!plan) {
        return
      }

      const monthlyRecords = computeMonthlyRecords({
        planningYear: Number(selectedPlanningYear.value),
        operatingWeekdays:
          Array.isArray(plan.operatingWeekdays) && plan.operatingWeekdays.length
            ? plan.operatingWeekdays
            : Array.isArray(group.operatingWeekdays) && group.operatingWeekdays.length
              ? group.operatingWeekdays
              : [1, 2, 3, 4, 5],
        presenceMonths: Array.isArray(plan.presenceMonths) ? plan.presenceMonths : [],
        randomDefaults: plan.randomDefaults || {},
        useMonthlyRandomOverrides: Boolean(plan.useMonthlyRandomOverrides),
        randomMonths: Array.isArray(plan.randomMonths) ? plan.randomMonths : [],
        planMonths: Array.isArray(plan.planMonths) ? plan.planMonths : []
      })

      const values = monthlyRecords.map((record) => Number(record.requiredHeadcount) || 0)
      const annualTotal = values.reduce((sum, value) => sum + value, 0)

      if (annualTotal <= 0) {
        return
      }

      series.push({
        id: `${center.id}-${group.id}`,
        label: `${center.name} · ${group.name}`,
        values,
        annualTotal
      })
    })
  })

  return series
    .sort((left, right) => right.annualTotal - left.annualTotal)
    .map((item, index) => ({
      ...item,
      color: chartPalette[index % chartPalette.length]
    }))
})

const centerMenuItems = [
  {
    id: 'delete-center',
    label: 'Delete'
  }
]

const openCreateCenter = () => {
  centerDraft.value = createPlanningCenterDraft()
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
  window.location.hash = `#planning/center/${centerId}`
}

const confirmDeleteCenter = (center) => {
  const confirmed = window.confirm(
    `Delete "${center.name}"? This removes the call center and all ${center.summary.groupCount} staffing group${center.summary.groupCount === 1 ? '' : 's'} inside it.`
  )

  if (!confirmed) {
    return
  }

  emit('delete-center', center.id)
}

const handleCenterMenuSelect = (center, item) => {
  if (item.id === 'delete-center') {
    confirmDeleteCenter(center)
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
        kicker="Planning Portfolio"
        title="Call Centers"
      />

      <AppPanel :padded="false">
        <div class="grid gap-0">
          <div class="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-5 py-4">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div class="grid gap-1">
                <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#15395f]">
                  Executive Summary
                </span>
                <h2 class="text-xl font-semibold tracking-[-0.04em] text-slate-950">Portfolio Dashboard</h2>
                <p class="text-sm text-slate-500">
                  Combined demand, staffing requirement, and call-center concentration for {{ selectedPlanningYear }}.
                </p>
              </div>

              <div class="grid gap-1.5 lg:justify-items-end">
                <div class="flex flex-wrap items-center gap-2.5">
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

                <p class="text-[0.82rem] font-medium leading-5 text-slate-500">
                  {{ formatWhole(modeledCenterCount) }} of {{ formatWhole(dashboardSummary.callCenterCount) }} call centers have {{ selectedPlanningYear }} plans
                </p>
              </div>
            </div>
          </div>

          <div class="px-5 py-4">
            <AppStatStrip :items="summaryStripItems" columns="md:grid-cols-3 xl:grid-cols-6" />
          </div>

          <div class="border-t border-slate-200 px-5 py-4">
            <PlanningPortfolioHeadcountChart
              :planning-year="selectedPlanningYear"
              :series="portfolioHeadcountSeries"
              :format-number="formatNumber"
            />
          </div>
        </div>
      </AppPanel>

      <AppTableShell>
        <div class="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-6 py-4">
          <div class="flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
            <div class="grid gap-1">
              <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#15395f]">
                Call Center Portfolio
              </span>
              <h2 class="text-xl font-semibold tracking-[-0.04em] text-slate-950">All Call Centers</h2>
              <p class="text-sm text-slate-500">
                {{ selectedPlanningYear }} plans ranked by peak requirement, then annual contact volume.
              </p>
            </div>

            <AppButton class="self-start" size="sm" :icon="mdiPlus" variant="primary" @click="openCreateCenter">
              New Center
            </AppButton>
          </div>
        </div>

        <div v-if="!props.centers.length" class="px-6 py-8">
          <AppEmptyState
            title="Create the first call center"
            description="Start by creating a call center, then add staffing groups and annual plans beneath it."
          >
            <div class="mb-1 flex h-12 w-12 items-center justify-center rounded-[20px] border border-slate-200 bg-slate-50 text-[#15395f]">
              <AppIcon :path="mdiOfficeBuildingOutline" class="h-6 w-6" />
            </div>
            <AppButton :icon="mdiPlus" variant="primary" @click="openCreateCenter">Create Call Center</AppButton>
          </AppEmptyState>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-[980px] w-full border-collapse text-sm text-slate-700">
            <thead class="border-b border-slate-200 bg-slate-50/85">
              <tr>
                <th class="px-6 py-3.5 text-left text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Call Center
                </th>
                <th class="px-4 py-3.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Annual Plans
                </th>
                <th class="px-4 py-3.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Annual Contacts
                </th>
                <th class="px-4 py-3.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Needed Staff Hours
                </th>
                <th class="px-4 py-3.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Avg HC
                </th>
                <th class="px-4 py-3.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Peak Required Headcount
                </th>
                <th class="px-6 py-3.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr
                v-for="center in centerRows"
                :key="center.id"
                class="bg-white transition hover:bg-[#eef4f8]"
              >
                <td class="px-6 py-4 align-middle">
                  <div class="grid grid-cols-[auto_1fr] items-center gap-3">
                    <div class="flex h-11 w-11 items-center justify-center rounded-[20px] border border-slate-200 bg-slate-50 text-sm font-semibold text-[#15395f] shadow-sm">
                      <AppIcon :path="mdiOfficeBuildingOutline" class="h-5 w-5" />
                    </div>
                    <div class="grid gap-1">
                      <strong class="text-sm font-semibold text-slate-950">{{ center.name }}</strong>
                      <div class="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{{ center.timezone }}</span>
                        <span class="text-slate-300">•</span>
                        <span v-if="center.summary.totalPlanCount > 0">
                          {{ center.summary.totalPlanCount === 1 ? `1 plan in ${selectedPlanningYear}` : `${formatWhole(center.summary.totalPlanCount)} plans in ${selectedPlanningYear}` }}
                        </span>
                        <span v-else>No {{ selectedPlanningYear }} plan</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 text-right align-middle tabular-nums">
                  {{ formatWhole(center.summary.totalPlanCount) }}
                </td>
                <td class="px-4 py-4 text-right align-middle tabular-nums">
                  {{ center.summary.totalPlanCount > 0 ? formatWhole(center.summary.annualContacts) : '—' }}
                </td>
                <td class="px-4 py-4 text-right align-middle tabular-nums">
                  {{ center.summary.totalPlanCount > 0 ? formatWhole(center.summary.totalNeededStaffHours) : '—' }}
                </td>
                <td class="px-4 py-4 text-right align-middle tabular-nums">
                  {{ center.summary.totalPlanCount > 0 ? formatNumber(center.summary.totalAvgRequiredHeadcount, 1) : '—' }}
                </td>
                <td class="px-4 py-4 text-right align-middle tabular-nums font-medium text-slate-900">
                  {{ center.summary.totalPlanCount > 0 ? formatNumber(center.summary.totalPeakHeadcount, 1) : '—' }}
                </td>
                <td class="px-6 py-4 align-middle">
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
      </AppTableShell>
    </div>

    <CallCenterSettingsModal
      v-if="centerSettingsOpen"
      v-model:center-name="centerDraft.name"
      v-model:timezone="centerDraft.timezone"
      :allow-backdrop-close="false"
      title="Create Call Center"
      submit-label="Create Call Center"
      @close="closeCreateCenter"
      @save="saveCenter"
    />
  </section>
</template>
