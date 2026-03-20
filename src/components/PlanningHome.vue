<script setup>
import { computed, ref } from 'vue'
import {
  mdiOfficeBuildingOutline,
  mdiSitemapOutline,
  mdiTarget,
  mdiTrendingUp,
  mdiPlus
} from '@mdi/js'

import CallCenterSettingsModal from './planning/CallCenterSettingsModal.vue'
import AppButton from './ui/AppButton.vue'
import AppEmptyState from './ui/AppEmptyState.vue'
import AppIcon from './ui/AppIcon.vue'
import AppPageHeader from './ui/AppPageHeader.vue'
import AppPanel from './ui/AppPanel.vue'
import AppStatStrip from './ui/AppStatStrip.vue'
import AppTableShell from './ui/AppTableShell.vue'
import { createPlanningCenterDraft } from '../planningStorage'
import { summarizeCenter, summarizeCenterPortfolio } from '../planningSummary'

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

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

const dashboardSummary = computed(() => summarizeCenterPortfolio(props.centers))
const centerRows = computed(() =>
  props.centers.map((center) => ({
    ...center,
    summary: summarizeCenter(center)
  }))
)

const featuredSummaryItems = computed(() => [
  {
    label: 'Call Centers',
    value: formatWhole(dashboardSummary.value.callCenterCount),
    meta: 'Configured operations'
  },
  {
    label: 'Staffing Groups',
    value: formatWhole(dashboardSummary.value.totalGroupCount),
    meta: 'Saved planning groups'
  }
])

const detailSummaryItems = computed(() => [
  {
    label: 'Annual Contacts',
    value: formatWhole(dashboardSummary.value.annualContacts),
    meta: 'Combined demand'
  },
  {
    label: 'Annual Workload Hours',
    value: formatWhole(dashboardSummary.value.annualWorkloadHours),
    meta: 'Total modeled workload'
  },
  {
    label: 'Needed Staff Hours',
    value: formatWhole(dashboardSummary.value.totalNeededStaffHours),
    meta: 'Combined staffing hours'
  },
  {
    label: 'Peak Required Headcount',
    value: formatNumber(dashboardSummary.value.totalPeakHeadcount, 1),
    meta: 'Combined peak headcount'
  }
])

const summaryStripItems = computed(() => [
  ...featuredSummaryItems.value,
  ...detailSummaryItems.value
])

const topCenterByMetric = (metric) =>
  centerRows.value.reduce((best, center) => {
    if (!best || center.summary[metric] > best.summary[metric]) {
      return center
    }

    return best
  }, null)

const portfolioHighlights = computed(() => {
  const highestPeakCenter = topCenterByMetric('totalPeakHeadcount')
  const highestVolumeCenter = topCenterByMetric('annualContacts')
  const mostGroupsCenter = topCenterByMetric('groupCount')

  return [
    {
      label: 'Highest peak requirement',
      value: highestPeakCenter
        ? `${highestPeakCenter.name} · ${formatNumber(highestPeakCenter.summary.totalPeakHeadcount, 1)}`
        : 'No modeled headcount yet',
      icon: mdiTarget
    },
    {
      label: 'Largest annual contact load',
      value: highestVolumeCenter
        ? `${highestVolumeCenter.name} · ${formatWhole(highestVolumeCenter.summary.annualContacts)}`
        : 'No modeled demand yet',
      icon: mdiTrendingUp
    },
    {
      label: 'Most staffing groups',
      value: mostGroupsCenter
        ? `${mostGroupsCenter.name} · ${formatWhole(mostGroupsCenter.summary.groupCount)}`
        : 'No staffing groups saved',
      icon: mdiSitemapOutline
    }
  ]
})

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
</script>

<template>
  <section class="bg-slate-50/80 py-4 md:py-5">
    <div class="app-frame grid gap-4">
      <AppPageHeader
        kicker="Planning Portfolio"
        title="Call Centers"
        description="Review portfolio demand, staffing hours, and peak headcount before opening a call center to organize staffing groups and review modeled workload."
      />

      <AppPanel :padded="false">
        <div class="grid">
          <div class="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(145deg,rgba(14,165,233,0.08),rgba(255,255,255,0)_42%),linear-gradient(180deg,#ffffff,#f8fafc)] px-6 py-6">
            <div class="absolute -right-10 top-0 h-40 w-40 rounded-full bg-sky-100/60 blur-3xl" />
            <div class="relative grid gap-6 xl:grid-cols-[1.2fr_0.9fr] xl:gap-8">
              <div class="grid content-start gap-3">
                <div class="grid gap-2">
                  <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-sky-700">
                    Portfolio Overview
                  </span>
                  <h2 class="max-w-2xl text-[clamp(1.25rem,1.9vw,1.7rem)] font-semibold tracking-[-0.04em] text-slate-950">
                    See where the portfolio is carrying demand before you drill into a single operation.
                  </h2>
                  <p class="max-w-2xl text-sm leading-6 text-slate-600">
                    Each call center organizes the staffing groups planned beneath it. Use this page to compare modeled demand, staff hours, and peak requirement across the portfolio.
                  </p>
                </div>

                <div class="grid gap-2.5 text-sm text-slate-600">
                  <p>
                    Open a call center to create staffing groups for each queue, line of business, or support team you plan separately.
                  </p>
                  <p>
                    The summary below shows the total modeled workload, staffing hours, and peak requirement across the full portfolio in one place.
                  </p>
                </div>
              </div>

              <div class="grid content-start gap-2.5">
                <div class="grid gap-1">
                  <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Portfolio Highlights
                  </span>
                  <p class="text-sm leading-6 text-slate-600">
                    Quick signals to show where the current model is most concentrated.
                  </p>
                </div>

                <div
                  v-for="item in portfolioHighlights"
                  :key="item.label"
                  class="flex items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.45)]"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                    <AppIcon :path="item.icon" class="h-4.5 w-4.5" />
                  </span>
                  <div class="grid gap-0.5">
                    <span class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {{ item.label }}
                    </span>
                    <span class="text-sm font-medium text-slate-900">
                      {{ item.value }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="px-5 py-4">
            <AppStatStrip :items="summaryStripItems" columns="md:grid-cols-3 xl:grid-cols-6" />
          </div>
        </div>
      </AppPanel>

      <AppTableShell>
        <div class="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-6 py-4">
          <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div class="grid gap-1">
              <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-sky-700">
                Portfolio Detail
              </span>
              <h2 class="text-xl font-semibold tracking-[-0.04em] text-slate-950">All Call Centers</h2>
              <p class="max-w-3xl text-sm leading-5 text-slate-600">
                Open a call center to manage staffing groups and review the annual demand and staffing requirement modeled inside that operation.
              </p>
            </div>

            <AppButton class="self-start" size="sm" :icon="mdiPlus" variant="primary" @click="openCreateCenter">
              New Center
            </AppButton>
          </div>
        </div>

        <div v-if="!props.centers.length" class="px-6 py-8">
          <AppEmptyState
            title="Create the first operation"
            description="Start by creating a call center, then add staffing groups beneath it for each team or queue you plan separately."
          >
            <div class="mb-1 flex h-12 w-12 items-center justify-center rounded-[20px] border border-sky-200 bg-sky-50 text-sky-700">
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
                <th class="px-4 py-3.5 text-left text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Time Zone
                </th>
                <th class="px-4 py-3.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Staffing Groups
                </th>
                <th class="px-4 py-3.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Annual Contacts
                </th>
                <th class="px-4 py-3.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Needed Staff Hours
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
                class="transition odd:bg-white even:bg-slate-50/40 hover:bg-sky-50/80"
              >
                <td class="px-6 py-4 align-middle">
                  <div class="grid grid-cols-[auto_1fr] items-center gap-3">
                    <div class="flex h-11 w-11 items-center justify-center rounded-[20px] border border-sky-200 bg-sky-50 text-sm font-semibold text-sky-700 shadow-sm">
                      <AppIcon :path="mdiOfficeBuildingOutline" class="h-5 w-5" />
                    </div>
                    <div class="grid gap-1">
                      <strong class="text-sm font-semibold text-slate-950">{{ center.name }}</strong>
                      <div class="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>
                          {{ center.summary.groupCount === 1 ? '1 staffing group' : `${formatWhole(center.summary.groupCount)} staffing groups` }}
                        </span>
                        <span class="text-slate-300">•</span>
                        <span>{{ formatNumber(center.summary.totalPeakHeadcount, 1) }} peak required HC</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 align-middle">
                  <span class="text-sm font-medium text-slate-700">{{ center.timezone }}</span>
                </td>
                <td class="px-4 py-4 text-right align-middle tabular-nums">
                  {{ formatWhole(center.summary.groupCount) }}
                </td>
                <td class="px-4 py-4 text-right align-middle tabular-nums">
                  {{ formatWhole(center.summary.annualContacts) }}
                </td>
                <td class="px-4 py-4 text-right align-middle tabular-nums">
                  {{ formatWhole(center.summary.totalNeededStaffHours) }}
                </td>
                <td class="px-4 py-4 text-right align-middle tabular-nums font-medium text-slate-900">
                  {{ formatNumber(center.summary.totalPeakHeadcount, 1) }}
                </td>
                <td class="px-6 py-4 align-middle">
                  <div class="flex justify-end gap-2 whitespace-nowrap">
                    <AppButton size="sm" variant="quiet" @click="openCenter(center.id)">Open</AppButton>
                    <AppButton size="sm" variant="danger" @click="confirmDeleteCenter(center)">Delete</AppButton>
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
