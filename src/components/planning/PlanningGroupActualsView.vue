<script setup>
import { computed, ref, watch } from 'vue'

import PlanningGroupActualsImportModal from './PlanningGroupActualsImportModal.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import {
  clearPlanningGroupActualsData,
  deletePlanningGroupActualsByMonth,
  deletePlanningGroupActualsByYear,
  mergePlanningGroupActuals,
  resolvePlanningGroupActuals
} from '../../planner/groupActuals'
import { summarizePlanningGroupActualsDataset } from '../../planner/groupActualsDataSummary'

const props = defineProps({
  center: {
    type: Object,
    required: true
  },
  group: {
    type: Object,
    required: true
  },
  formatWhole: {
    type: Function,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['save-actuals', 'selection-change'])

const importModalVisible = ref(false)
const actualsDraft = ref(resolvePlanningGroupActuals(props.group))
const selectedScope = ref(null)

const clonePlain = (value) => JSON.parse(JSON.stringify(value))

const scopesMatch = (left, right) => {
  if (!left && !right) {
    return true
  }

  if (!left || !right || left.type !== right.type) {
    return false
  }

  return left.type === 'year'
    ? left.year === right.year
    : left.monthStart === right.monthStart
}

const setSelectedScope = (nextScope) => {
  if (scopesMatch(selectedScope.value, nextScope)) {
    return
  }

  selectedScope.value = nextScope ? { ...nextScope } : null
  emit('selection-change', selectedScope.value ? { ...selectedScope.value } : null)
}

const resetDraft = () => {
  actualsDraft.value = clonePlain(resolvePlanningGroupActuals(props.group))
  setSelectedScope(null)
}

watch(
  () => [props.group?.id, props.group?.updatedAt],
  () => {
    resetDraft()
  },
  { immediate: true }
)

const completenessSummary = computed(() =>
  summarizePlanningGroupActualsDataset({
    actuals: actualsDraft.value,
    group: props.group,
    center: props.center
  })
)

const annualScorecardRows = computed(() => completenessSummary.value.annualRows || [])
const expandedYears = ref([])

const formatContacts = (value) => (value == null ? '—' : props.formatWhole(value))
const formatAht = (value) => (value == null ? '—' : `${props.formatNumber(value, 1)} sec`)
const formatCoveragePercent = (value) =>
  value == null ? '—' : `${props.formatNumber(value, 1)}%`
const formatLoadedExpectedDays = (loaded, expected) =>
  `${props.formatWhole(loaded)} / ${props.formatWhole(expected)}`
const formatDate = (value) => {
  if (!value) {
    return '—'
  }

  const [year, month, day] = value.split('-').map(Number)
  const candidate = new Date(year, month - 1, day, 12)

  return Number.isNaN(candidate.getTime())
    ? value
    : candidate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
}

const isSelectedScope = (candidate) => {
  if (!selectedScope.value || !candidate) {
    return false
  }

  if (selectedScope.value.type !== candidate.type) {
    return false
  }

  if (candidate.type === 'year') {
    return selectedScope.value.year === candidate.year
  }

  if (candidate.type === 'month') {
    return selectedScope.value.monthStart === candidate.monthStart
  }

  return false
}

const selectYearScope = (row) => {
  if (isSelectedScope({ type: 'year', year: row.year })) {
    clearSelection()
    return
  }

  setSelectedScope({
    type: 'year',
    year: row.year,
    label: row.yearLabel
  })
}

const selectMonthScope = (row) => {
  if (isSelectedScope({ type: 'month', monthStart: row.monthStart })) {
    clearSelection()
    return
  }

  setSelectedScope({
    type: 'month',
    year: row.monthStart.slice(0, 4),
    monthStart: row.monthStart,
    label: row.monthLabel
  })
}

const clearSelection = () => {
  setSelectedScope(null)
}

const applyActualsUpdate = (nextActuals) => {
  actualsDraft.value = nextActuals
  clearSelection()
  emit('save-actuals', nextActuals)
}

watch(
  () => annualScorecardRows.value.map((row) => row.year),
  () => {
    expandedYears.value = []
  },
  { immediate: true }
)

const isYearExpanded = (year) => expandedYears.value.includes(year)

const toggleYear = (year) => {
  expandedYears.value = isYearExpanded(year)
    ? expandedYears.value.filter((candidate) => candidate !== year)
    : [...expandedYears.value, year]
}

const openImportModal = () => {
  importModalVisible.value = true
}

const handleImportApply = (nextImportState) => {
  const nextActuals = mergePlanningGroupActuals(actualsDraft.value, {
    ...nextImportState,
    updatedAt: new Date().toISOString()
  })

  applyActualsUpdate(nextActuals)
}

const deleteSelectedScope = () => {
  if (!selectedScope.value) {
    return
  }

  const nextActuals =
    selectedScope.value.type === 'year'
      ? deletePlanningGroupActualsByYear(actualsDraft.value, selectedScope.value.year)
      : deletePlanningGroupActualsByMonth(actualsDraft.value, selectedScope.value.monthStart)

  applyActualsUpdate({
    ...nextActuals,
    updatedAt: new Date().toISOString()
  })
}

const clearAllData = () => {
  const nextActuals = clearPlanningGroupActualsData(actualsDraft.value)

  applyActualsUpdate({
    ...nextActuals,
    updatedAt: new Date().toISOString()
  })
}

defineExpose({
  openImportModal,
  clearAllData,
  clearSelection,
  deleteSelectedScope
})
</script>

<template>
  <div class="h-full" @click="clearSelection">
    <template v-if="actualsDraft.dailyRows.length">
      <div class="overflow-x-auto">
        <table class="min-w-[1120px] w-full border-collapse text-sm text-slate-700" @click.stop>
          <thead class="border-b border-slate-200 bg-white/80">
            <tr>
              <th class="px-5 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                Period
              </th>
              <th class="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                Min Date
              </th>
              <th class="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                Max Date
              </th>
              <th class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                Contacts
              </th>
              <th class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                Weighted Avg AHT
              </th>
              <th class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                Coverage
              </th>
              <th class="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                Loaded / Expected Days
              </th>
            </tr>
          </thead>
          <tbody v-if="annualScorecardRows.length" class="divide-y divide-slate-200">
            <template v-for="row in annualScorecardRows" :key="row.year">
              <tr
                class="align-top transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d2df]"
                :class="isSelectedScope({ type: 'year', year: row.year }) ? 'bg-[#e7eef4]' : 'bg-white hover:bg-slate-50/70'"
                tabindex="0"
                role="button"
                :aria-label="`Select ${row.yearLabel} data`"
                @click="selectYearScope(row)"
                @keydown.enter.prevent="selectYearScope(row)"
                @keydown.space.prevent="selectYearScope(row)"
              >
                <td class="px-5 py-3">
                  <button
                    type="button"
                    class="inline-flex items-center gap-3 rounded-[16px] text-left font-semibold text-slate-950 transition hover:text-[#15395f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d2df]"
                    :aria-expanded="isYearExpanded(row.year)"
                    :aria-label="`${isYearExpanded(row.year) ? 'Collapse' : 'Expand'} ${row.yearLabel} monthly data`"
                    @click.stop="toggleYear(row.year)"
                  >
                    <span class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                      {{ isYearExpanded(row.year) ? '-' : '+' }}
                    </span>
                    <span>{{ row.yearLabel }}</span>
                  </button>
                </td>
                <td class="px-4 py-3 font-medium whitespace-nowrap text-slate-700">
                  {{ formatDate(row.minServiceDate) }}
                </td>
                <td class="px-4 py-3 font-medium whitespace-nowrap text-slate-700">
                  {{ formatDate(row.maxServiceDate) }}
                </td>
                <td class="px-4 py-3 text-right font-semibold text-slate-950">
                  {{ formatContacts(row.contacts) }}
                </td>
                <td class="px-4 py-3 text-right font-semibold whitespace-nowrap text-slate-950">
                  {{ formatAht(row.weightedAhtSeconds) }}
                </td>
                <td class="px-4 py-3 text-right font-semibold whitespace-nowrap text-slate-950">
                  {{ formatCoveragePercent(row.coveragePercent) }}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums text-slate-500">
                  {{ formatLoadedExpectedDays(row.loadedOpenDays, row.expectedOpenDays) }}
                </td>
              </tr>
              <tr
                v-for="month in isYearExpanded(row.year) ? row.months : []"
                :key="month.monthStart"
                class="align-top transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d2df]"
                :class="isSelectedScope({ type: 'month', monthStart: month.monthStart }) ? 'bg-[#e7eef4]' : 'bg-slate-50/60 hover:bg-slate-100/80'"
                tabindex="0"
                role="button"
                :aria-label="`Select ${month.monthLabel} data`"
                @click="selectMonthScope(month)"
                @keydown.enter.prevent="selectMonthScope(month)"
                @keydown.space.prevent="selectMonthScope(month)"
              >
                <td class="px-5 py-3">
                  <span class="pl-8 font-medium text-slate-700">{{ month.monthLabel }}</span>
                </td>
                <td class="px-4 py-3 font-medium whitespace-nowrap text-slate-700">
                  {{ formatDate(month.minServiceDate) }}
                </td>
                <td class="px-4 py-3 font-medium whitespace-nowrap text-slate-700">
                  {{ formatDate(month.maxServiceDate) }}
                </td>
                <td class="px-4 py-3 text-right font-medium text-slate-700">
                  {{ formatContacts(month.contacts) }}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap text-slate-700">
                  {{ formatAht(month.weightedAhtSeconds) }}
                </td>
                <td class="px-4 py-3 text-right font-medium whitespace-nowrap text-slate-700">
                  {{ formatCoveragePercent(month.coveragePercent) }}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums text-slate-500">
                  {{ formatLoadedExpectedDays(month.loadedOpenDays, month.expectedOpenDays) }}
                </td>
              </tr>
            </template>
          </tbody>
          <tbody v-else class="divide-y divide-slate-200">
            <tr class="bg-white">
              <td colspan="7" class="px-5 py-6 text-sm text-slate-500">
                No scheduled open days are available in the loaded range to score yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <AppEmptyState
      v-else
      class="p-5"
      title="No data loaded"
      description="Use Add Data to upload a daily CSV and build the shared history this staffing group uses for forecasting and staffing."
    />

    <PlanningGroupActualsImportModal
      v-model:visible="importModalVisible"
      :actuals="actualsDraft"
      :format-whole="props.formatWhole"
      :format-number="props.formatNumber"
      @apply="handleImportApply"
    />
  </div>
</template>
