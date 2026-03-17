<script setup>
import { computed, ref } from 'vue'
import {
  mdiOfficeBuildingOutline,
  mdiPlus
} from '@mdi/js'

import CallCenterSettingsModal from './planning/CallCenterSettingsModal.vue'
import AppButton from './ui/AppButton.vue'
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

const getCenterInitials = (name) =>
  String(name || 'Call Center')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'CC'

const featuredSummaryItems = computed(() => [
  {
    label: 'Call Centers',
    value: formatWhole(dashboardSummary.value.callCenterCount),
    meta: 'Configured operations'
  },
  {
    label: 'Staffing Groups',
    value: formatWhole(dashboardSummary.value.totalPlanCount),
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
    `Delete "${center.name}"? This removes the call center and all ${center.summary.planCount} staffing group${center.summary.planCount === 1 ? '' : 's'} inside it.`
  )

  if (!confirmed) {
    return
  }

  emit('delete-center', center.id)
}
</script>

<template>
  <section class="bg-slate-50/80 py-3">
    <div class="app-frame grid gap-3">
      <AppPageHeader
        title="Call Centers"
        description="Review portfolio demand, staffing hours, and peak headcount before opening a call center to manage staffing groups and shared defaults."
      >
        <template #actions>
          <AppButton :icon="mdiPlus" variant="primary" @click="openCreateCenter">Create Call Center</AppButton>
        </template>
      </AppPageHeader>

      <AppPanel :padded="false">
        <div class="grid xl:grid-cols-[1.05fr_1.2fr]">
          <div class="grid gap-3 border-b border-slate-200 px-5 py-4 xl:border-b-0 xl:border-r">
            <div class="grid gap-1.5">
              <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-sky-700">
                Portfolio Overview
              </span>
              <h2 class="max-w-2xl text-[clamp(1.1rem,1.6vw,1.45rem)] font-semibold tracking-[-0.04em] text-slate-950">
                Track the size of the portfolio before you manage an individual operation.
              </h2>
              <p class="max-w-2xl text-sm leading-5 text-slate-600">
                Use this page to understand the overall workload and staffing requirement across every call center in the portfolio.
              </p>
            </div>

            <AppStatStrip :items="featuredSummaryItems" columns="sm:grid-cols-2" />
          </div>

          <AppStatStrip :items="detailSummaryItems" columns="md:grid-cols-2" />
        </div>
      </AppPanel>

      <AppTableShell>
        <div class="flex flex-col gap-1.5 border-b border-slate-200 px-5 py-3.5 lg:flex-row lg:items-end lg:justify-between">
          <div class="grid gap-1">
            <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Portfolio Detail
            </span>
            <h2 class="text-lg font-semibold text-slate-950">All Call Centers</h2>
            <p class="text-sm text-slate-600">
              Open a call center to manage operating defaults and the staffing groups planned underneath it.
            </p>
          </div>
          <div class="grid gap-0.5 text-left lg:text-right">
            <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Active Operations
            </span>
            <strong class="text-lg font-semibold text-slate-950">
              {{ formatWhole(dashboardSummary.callCenterCount) }}
            </strong>
          </div>
        </div>

        <div v-if="!props.centers.length" class="grid justify-items-start gap-3 px-5 py-7">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sky-700">
            <AppIcon :path="mdiOfficeBuildingOutline" class="h-6 w-6" />
          </div>
          <div class="grid gap-2">
            <h3 class="text-xl font-semibold text-slate-950">Create the first operation</h3>
            <p class="max-w-2xl text-sm leading-5 text-slate-600">
              Start by defining the shared operating assumptions that every staffing group in that call center should inherit.
            </p>
          </div>
          <AppButton :icon="mdiPlus" variant="primary" @click="openCreateCenter">Create Call Center</AppButton>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-[980px] w-full border-collapse text-sm text-slate-700">
            <thead class="border-b border-slate-200 bg-slate-50/90">
              <tr>
                <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Call Center
                </th>
                <th class="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Time Zone
                </th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Staffing Groups
                </th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Annual Contacts
                </th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Needed Staff Hours
                </th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Peak Required Headcount
                </th>
                <th class="px-5 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr
                v-for="center in centerRows"
                :key="center.id"
                class="transition odd:bg-white even:bg-slate-50/30 hover:bg-sky-50/60"
              >
                <td class="px-5 py-3.5 align-middle">
                  <div class="grid grid-cols-[auto_1fr] items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-[18px] border border-sky-100 bg-sky-50 text-sm font-semibold text-sky-700">
                      {{ getCenterInitials(center.name) }}
                    </div>
                    <div class="grid gap-0.5">
                      <strong class="text-sm font-semibold text-slate-950">{{ center.name }}</strong>
                      <span class="text-xs text-slate-500">
                        {{ center.summary.planCount === 1 ? '1 staffing group' : `${formatWhole(center.summary.planCount)} staffing groups` }}
                      </span>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3.5 align-middle">
                  <span class="text-sm text-slate-600">{{ center.timezone }}</span>
                </td>
                <td class="px-4 py-3.5 text-right align-middle tabular-nums">
                  {{ formatWhole(center.summary.planCount) }}
                </td>
                <td class="px-4 py-3.5 text-right align-middle tabular-nums">
                  {{ formatWhole(center.summary.annualContacts) }}
                </td>
                <td class="px-4 py-3.5 text-right align-middle tabular-nums">
                  {{ formatWhole(center.summary.totalNeededStaffHours) }}
                </td>
                <td class="px-4 py-3.5 text-right align-middle tabular-nums">
                  {{ formatNumber(center.summary.totalPeakHeadcount, 1) }}
                </td>
                <td class="px-5 py-3.5 align-middle">
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
      v-model:operating-weekdays="centerDraft.operatingWeekdays"
      v-model:default-paid-hours-per-day="centerDraft.defaultPaidHoursPerDay"
      v-model:default-occupancy-percent="centerDraft.defaultOccupancyPercent"
      v-model:default-adherence-percent="centerDraft.defaultAdherencePercent"
      :allow-backdrop-close="false"
      :weekday-options="props.weekdayOptions"
      title="Create Call Center"
      submit-label="Create Call Center"
      @close="closeCreateCenter"
      @save="saveCenter"
    />
  </section>
</template>
