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
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppTableShell from '../ui/AppTableShell.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

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

const portfolioItems = computed(() => [
  {
    label: 'Staffing Groups',
    value: formatWhole(centerSummary.value.planCount),
    meta: 'Saved groups inside this operation'
  },
  {
    label: 'Annual Contacts',
    value: formatWhole(centerSummary.value.annualContacts),
    meta: 'Combined annual demand'
  },
  {
    label: 'Needed Staff Hours',
    value: formatWhole(centerSummary.value.totalNeededStaffHours),
    meta: 'Combined required staffing hours'
  },
  {
    label: 'Total Required Headcount',
    value: formatNumber(centerSummary.value.totalAvgRequiredHeadcount, 1),
    meta: 'Combined modeled headcount'
  },
  {
    label: 'Peak Required Headcount',
    value: formatNumber(centerSummary.value.totalPeakHeadcount, 1),
    meta: 'Combined peak monthly requirement'
  }
])

const defaultItems = computed(() => [
  { label: 'Time Zone', value: props.center.timezone },
  { label: 'Operating Days', value: operatingDayLabel.value },
  { label: 'Default Paid Hours', value: formatNumber(props.center.defaultPaidHoursPerDay, 1) },
  { label: 'Default Occupancy', value: `${formatNumber(props.center.defaultOccupancyPercent, 1)}%` },
  { label: 'Default Adherence', value: `${formatNumber(props.center.defaultAdherencePercent, 1)}%` }
])

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

      <div class="grid gap-3 xl:grid-cols-[1.1fr_0.95fr]">
        <AppWorkspaceSection
          kicker="Center Portfolio"
          title="Combined demand and headcount requirement"
          description="Understand the combined demand and staffing requirement across every staffing group in this call center."
        >
          <AppStatStrip :items="portfolioItems" columns="sm:grid-cols-2 xl:grid-cols-3" />
        </AppWorkspaceSection>

        <AppWorkspaceSection
          kicker="Center Defaults"
          title="Inherited operating defaults"
          description="New staffing groups inherit these defaults unless planners adjust the inputs later."
        >
          <div class="grid divide-y divide-slate-200 rounded-[20px] border border-slate-200 bg-white">
            <div
              v-for="item in defaultItems"
              :key="item.label"
              class="flex items-center justify-between gap-4 px-4 py-3.5 text-sm"
            >
              <strong class="font-semibold text-slate-800">{{ item.label }}</strong>
              <span class="text-right text-slate-600">{{ item.value }}</span>
            </div>
          </div>
        </AppWorkspaceSection>
      </div>

      <AppTableShell>
        <div class="flex flex-col gap-3 border-b border-slate-200 px-5 py-3.5 lg:flex-row lg:items-end lg:justify-between">
          <AppSectionHeader
            kicker="Staffing Groups"
            title="Staffing Groups In This Call Center"
            description="Each staffing group models one team or queue separately, such as voice, chat, back office, or vendor support."
          />

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
