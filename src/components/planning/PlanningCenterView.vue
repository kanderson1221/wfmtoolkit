<script setup>
import { computed, ref } from 'vue'

import CallCenterSettingsModal from './CallCenterSettingsModal.vue'
import { createPlanningCenterDraft } from '../../planningStorage'
import {
  getAnnualContacts,
  getAnnualRequiredStaffHours,
  getAnnualWorkloadHours,
  getAverageAhtSeconds,
  getAverageRequiredHeadcount,
  getMinRequiredHeadcount,
  getPeakRequiredHeadcount,
  summarizeCenter
} from '../../planningSummary'
import AppButton from '../ui/AppButton.vue'
import AppPageHeader from '../ui/AppPageHeader.vue'
import AppPanel from '../ui/AppPanel.vue'
import AppTableShell from '../ui/AppTableShell.vue'

const props = defineProps({
  center: {
    type: Object,
    required: true
  },
  weekdayOptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['save-center', 'delete-plan'])

const centerSettingsOpen = ref(false)
const centerDraft = ref(createPlanningCenterDraft(props.center))

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

const centerSummary = computed(() => summarizeCenter(props.center))
const operatingDayLabel = computed(() =>
  props.center.operatingWeekdays
    .map((value) => props.weekdayOptions.find((option) => option.value === value)?.label)
    .filter(Boolean)
    .join(', ')
)

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

const confirmDeletePlan = (plan) => {
  const confirmed = window.confirm(
    `Delete staffing group "${plan.name}"? This removes its demand model and staffing plan from this call center.`
  )

  if (!confirmed) {
    return
  }

  emit('delete-plan', {
    centerId: props.center.id,
    planId: plan.id
  })
}

</script>

<template>
  <section class="bg-slate-50/80 py-3">
    <div class="app-frame grid gap-3">
      <a href="#planning" class="planning-breadcrumb-link">Call Centers</a>

      <AppPageHeader
        kicker="Call Center"
        :title="props.center.name"
        description="Review the staffing portfolio for this operation, then open individual staffing groups to manage demand models and staffing plans."
      >
        <template #actions>
          <AppButton variant="secondary" @click="openCenterSettings">Edit Center</AppButton>
        </template>
      </AppPageHeader>

      <AppPanel :padded="false">
        <div class="grid xl:grid-cols-[1.1fr_0.95fr]">
          <div class="grid gap-3 border-b border-slate-200 px-5 py-4 xl:border-b-0 xl:border-r">
            <div class="grid gap-1.5">
              <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-sky-700">
                Center Portfolio
              </span>
              <h2 class="text-[clamp(1.05rem,1.55vw,1.35rem)] font-semibold tracking-[-0.04em] text-slate-950">
                Understand the combined demand and headcount requirement across every staffing group in this call center.
              </h2>
            </div>

            <div class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              <article class="metric-card">
                <p class="metric-label">Staffing Groups</p>
                <p class="metric-value">{{ formatWhole(centerSummary.planCount) }}</p>
                <p class="metric-meta">Saved groups inside this operation</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Annual Contacts</p>
                <p class="metric-value">{{ formatWhole(centerSummary.annualContacts) }}</p>
                <p class="metric-meta">Combined annual demand</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Needed Staff Hours</p>
                <p class="metric-value">{{ formatWhole(centerSummary.totalNeededStaffHours) }}</p>
                <p class="metric-meta">Combined required staffing hours</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Total Required Headcount</p>
                <p class="metric-value">{{ formatNumber(centerSummary.totalAvgRequiredHeadcount, 1) }}</p>
                <p class="metric-meta">Combined modeled headcount</p>
              </article>
              <article class="metric-card sm:col-span-2 xl:col-span-1">
                <p class="metric-label">Peak Required Headcount</p>
                <p class="metric-value">{{ formatNumber(centerSummary.totalPeakHeadcount, 1) }}</p>
                <p class="metric-meta">Combined peak monthly requirement</p>
              </article>
            </div>
          </div>

          <div class="grid divide-y divide-slate-200">
            <div class="grid gap-1 px-5 py-4">
              <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Center Defaults
              </span>
              <p class="text-sm leading-6 text-slate-600">
                New staffing groups inherit these defaults unless planners adjust the inputs later.
              </p>
            </div>

            <div class="grid divide-y divide-slate-200">
              <div class="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <strong class="font-semibold text-slate-800">Time Zone</strong>
                <span class="text-right text-slate-600">{{ props.center.timezone }}</span>
              </div>
              <div class="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <strong class="font-semibold text-slate-800">Operating Days</strong>
                <span class="text-right text-slate-600">{{ operatingDayLabel }}</span>
              </div>
              <div class="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <strong class="font-semibold text-slate-800">Default Paid Hours</strong>
                <span class="text-right text-slate-600">{{ formatNumber(props.center.defaultPaidHoursPerDay, 1) }}</span>
              </div>
              <div class="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <strong class="font-semibold text-slate-800">Default Occupancy</strong>
                <span class="text-right text-slate-600">{{ formatNumber(props.center.defaultOccupancyPercent, 1) }}%</span>
              </div>
              <div class="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <strong class="font-semibold text-slate-800">Default Adherence</strong>
                <span class="text-right text-slate-600">{{ formatNumber(props.center.defaultAdherencePercent, 1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </AppPanel>

      <AppTableShell>
        <div class="flex flex-col gap-3 border-b border-slate-200 px-5 py-3.5 lg:flex-row lg:items-end lg:justify-between">
          <div class="grid gap-1">
            <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Staffing Groups
            </span>
            <h2 class="text-lg font-semibold text-slate-950">Staffing Groups In This Call Center</h2>
            <p class="text-sm text-slate-600">
              Each staffing group models one team or queue separately, such as voice, chat, back office, or vendor support.
            </p>
          </div>

          <AppButton :href="`#planning/center/${props.center.id}/new`" variant="primary">+ New Group</AppButton>
        </div>

        <div v-if="!props.center.plans.length" class="grid justify-items-start gap-3 px-5 py-7">
          <div class="grid gap-2">
            <h3 class="text-xl font-semibold text-slate-950">Create the first staffing group</h3>
            <p class="max-w-2xl text-sm leading-6 text-slate-600">
              Start a staffing group for each team you plan separately, then build the demand model and staffing plan for that group.
            </p>
          </div>
          <AppButton :href="`#planning/center/${props.center.id}/new`" variant="primary">+ New Group</AppButton>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-[1260px] w-full border-collapse text-sm text-slate-700">
            <thead class="border-b border-slate-200 bg-slate-50/90">
              <tr>
                <th class="px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Staffing Group</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Year</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Annual Contacts</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">AHT</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Annual Workload</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Needed Staff Hours</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Min Required Headcount</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Avg Required Headcount</th>
                <th class="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Peak Required Headcount</th>
                <th class="px-5 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="plan in props.center.plans"
                :key="plan.id"
                class="border-b border-slate-200 last:border-b-0 odd:bg-white even:bg-slate-50/40"
              >
                <td class="px-5 py-3.5">
                  <div class="grid gap-1">
                    <strong class="text-sm font-semibold text-slate-950">{{ plan.name }}</strong>
                    <span class="text-xs text-slate-500">Demand model and staffing plan</span>
                  </div>
                </td>
                <td class="px-4 py-3.5 text-right">{{ plan.planningYear }}</td>
                <td class="px-4 py-3.5 text-right">{{ formatWhole(getAnnualContacts(plan)) }}</td>
                <td class="px-4 py-3.5 text-right">{{ formatWhole(getAverageAhtSeconds(plan)) }}</td>
                <td class="px-4 py-3.5 text-right">{{ formatWhole(getAnnualWorkloadHours(plan)) }}</td>
                <td class="px-4 py-3.5 text-right">{{ formatWhole(getAnnualRequiredStaffHours(plan)) }}</td>
                <td class="px-4 py-3.5 text-right">{{ formatNumber(getMinRequiredHeadcount(plan), 1) }}</td>
                <td class="px-4 py-3.5 text-right">{{ formatNumber(getAverageRequiredHeadcount(plan), 1) }}</td>
                <td class="px-4 py-3.5 text-right">{{ formatNumber(getPeakRequiredHeadcount(plan), 1) }}</td>
                <td class="px-5 py-3.5">
                  <div class="flex justify-end gap-2">
                    <AppButton :href="`#planning/center/${props.center.id}/plan/${plan.id}`" variant="secondary">Open Group</AppButton>
                    <AppButton variant="danger" @click="confirmDeletePlan(plan)">Delete</AppButton>
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
      :weekday-options="props.weekdayOptions"
      title="Edit Call Center"
      submit-label="Save Call Center"
      @close="closeCenterSettings"
      @save="saveCenter"
    />
  </section>
</template>
