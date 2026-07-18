<script setup>
import { computed, ref } from 'vue'
import { mdiDotsVertical, mdiOfficeBuildingOutline, mdiPlus } from '@mdi/js'

import CallCenterSettingsModal from './planning/CallCenterSettingsModal.vue'
import AppButton from './ui/AppButton.vue'
import AppConfirmDialog from './ui/AppConfirmDialog.vue'
import AppEmptyState from './ui/AppEmptyState.vue'
import AppIcon from './ui/AppIcon.vue'
import AppMenu from './ui/AppMenu.vue'
import AppPageHeader from './ui/AppPageHeader.vue'
import AppPanel from './ui/AppPanel.vue'
import AppTableShell from './ui/AppTableShell.vue'
import { buildPlanningCenterHash, navigateToHash } from '../appRoutes'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import { createPlanningCenterDraft } from '../planningStorage'
import { getCenterGroups } from '../planningSummary'
import { resolvePlanningGroupActuals } from '../planner/groupActuals'
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
const displayYear = getCurrentCalendarYear()
const {
  dialogVisible: deleteCenterDialogOpen,
  dialogTitle: deleteCenterDialogTitle,
  dialogDescription: deleteCenterDialogDescription,
  dialogConfirmLabel: deleteCenterDialogConfirmLabel,
  requestConfirmation: requestDeleteCenterConfirmation,
  confirmPendingAction: confirmDeleteCenter
} = useConfirmDialog()

const centerRows = computed(() =>
  props.centers
    .map((center) => ({
      ...center,
      groupCount: getCenterGroups(center).length
    }))
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')))
)

const centerMenuItems = [
  { id: 'edit-center', label: 'Edit' },
  { id: 'delete-center', label: 'Delete' }
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

const operatingDaysLabel = (center) => {
  const selectedDays = new Set(Array.isArray(center.operatingWeekdays) ? center.operatingWeekdays : [])
  return props.weekdayOptions
    .filter((option) => selectedDays.has(option.value))
    .map((option) => option.label)
    .join(', ') || 'No operating days set'
}

const operatingHoursLabel = (center) =>
  center.operatingOpenTime && center.operatingCloseTime
    ? `${center.operatingOpenTime}–${center.operatingCloseTime}`
    : 'Hours not set'

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

const closeCenterSettings = () => {
  centerSettingsOpen.value = false
}

const saveCenter = () => {
  emit('save-center', centerDraft.value)
  centerSettingsOpen.value = false
}

const openCenter = (centerId) => {
  navigateToHash(buildPlanningCenterHash(centerId))
}

const requestDeleteCenter = (center) => {
  requestDeleteCenterConfirmation({
    title: 'Delete Call Center?',
    description: `Delete "${center.name}"? This removes the call center and all ${center.groupCount} staffing group${center.groupCount === 1 ? '' : 's'} inside it.`,
    confirmLabel: 'Delete Call Center',
    onConfirm: () => emit('delete-center', center.id)
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
        title="Call Centers"
        description="Open a call center to manage its staffing groups, forecasts, actuals, and annual plans."
      >
        <template #actions>
          <AppButton size="sm" :icon="mdiPlus" variant="primary" @click="openCreateCenter">
            New Center
          </AppButton>
        </template>
      </AppPageHeader>

      <AppPanel v-if="!centerRows.length">
        <AppEmptyState
          title="Create the first call center"
          description="Call centers organize staffing groups and their planning data."
        >
          <div class="mt-2">
            <AppButton size="sm" :icon="mdiPlus" variant="primary" @click="openCreateCenter">
              New Center
            </AppButton>
          </div>
        </AppEmptyState>
      </AppPanel>

      <AppTableShell v-else>
        <div class="border-b border-slate-200 px-5 py-4">
          <h2 class="text-lg font-semibold tracking-[-0.04em] text-slate-950">Call Center Directory</h2>
          <p class="mt-1 text-sm text-slate-500">
            {{ centerRows.length }} call center{{ centerRows.length === 1 ? '' : 's' }} · sorted by name
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[52rem] border-collapse text-sm text-slate-700">
            <thead class="border-b border-slate-200 bg-slate-50/85">
              <tr>
                <th scope="col" class="px-5 py-3.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Call Center</th>
                <th scope="col" class="px-4 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Staffing Groups</th>
                <th scope="col" class="px-4 py-3.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Operating Days</th>
                <th scope="col" class="px-4 py-3.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Operating Hours</th>
                <th scope="col" class="px-5 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <tr v-for="center in centerRows" :key="center.id" class="transition hover:bg-slate-50">
                <td class="px-5 py-4 align-middle">
                  <div class="grid grid-cols-[auto_1fr] items-center gap-3">
                    <span class="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]">
                      <AppIcon :path="mdiOfficeBuildingOutline" class="h-5 w-5" />
                    </span>
                    <strong class="font-semibold text-slate-950">{{ center.name }}</strong>
                  </div>
                </td>
                <td class="px-4 py-4 text-right align-middle font-semibold tabular-nums text-slate-900">
                  {{ center.groupCount }}
                </td>
                <td class="px-4 py-4 align-middle">{{ operatingDaysLabel(center) }}</td>
                <td class="px-4 py-4 align-middle tabular-nums">{{ operatingHoursLabel(center) }}</td>
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
      </AppTableShell>
    </div>

    <CallCenterSettingsModal
      v-if="centerSettingsOpen"
      v-model:center-name="centerDraft.name"
      v-model:holiday-profiles="centerDraft.holidayProfiles"
      v-model:operating-weekdays="centerDraft.operatingWeekdays"
      v-model:operating-open-time="centerDraft.operatingOpenTime"
      v-model:operating-close-time="centerDraft.operatingCloseTime"
      :display-year="displayYear"
      :minimum-holiday-year="centerSettingsMinimumHolidayYear"
      :weekday-options="props.weekdayOptions"
      :allow-backdrop-close="false"
      :title="centerSettingsTitle"
      :submit-label="centerSettingsSubmitLabel"
      @close="closeCenterSettings"
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
