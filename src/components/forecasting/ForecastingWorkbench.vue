<script setup>
import { computed, ref, watch } from 'vue'

import ForecastingManualAdjustmentsDock from './ForecastingManualAdjustmentsDock.vue'
import ForecastingResultsPanel from './ForecastingResultsPanel.vue'
import ForecastingWorkbenchInspector from './ForecastingWorkbenchInspector.vue'
import AppButton from '../ui/AppButton.vue'
import AppDrawer from '../ui/AppDrawer.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppOptionPills from '../ui/AppOptionPills.vue'
import {
  canForecastProjectAdjust,
  canForecastProjectRun,
  canForecastProjectShowInspector,
  formatDateTime,
  formatWhole,
  getForecastProjectDailyRows,
  getForecastProjectManualAdjustments,
  getForecastProjectResultTabs,
  getForecastProjectSourceKind,
  getForecastSourceActionLabel,
  isPlanAlignedForecast,
  isForecastProjectReadOnly
} from '../../forecasting/shared'
import { buildForecastRunInputSignature } from '../../composables/forecasting/forecastWorkspaceHelpers'

const props = defineProps({
  validationMessages: {
    type: Array,
    default: () => []
  },
  runError: {
    type: String,
    default: ''
  },
  isRunningForecast: {
    type: Boolean,
    default: false
  },
  isDirty: {
    type: Boolean,
    default: false
  },
  showLibraryActions: {
    type: Boolean,
    default: true
  },
  showDuplicateAction: {
    type: Boolean,
    default: true
  },
  showSourceActionButton: {
    type: Boolean,
    default: true
  },
  projectMeta: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'run-forecast',
  'create-new-project',
  'open-project-dialog',
  'duplicate-project',
  'save-project',
  'add-custom-seasonality',
  'remove-custom-seasonality',
  'add-custom-holiday',
  'remove-custom-holiday',
  'open-source-modal'
])

const project = defineModel('project', {
  type: Object,
  required: true
})

const activeResultTab = defineModel('activeResultTab', {
  type: String,
  required: true
})

const activeContactsSubview = ref('forecast')
const inspectorOpen = ref(false)
const autoOpenedInspectorProjectIds = new Set()

const sourceKind = computed(() => getForecastProjectSourceKind(project.value))
const resultTabs = computed(() => getForecastProjectResultTabs(project.value))
const isForecastTab = computed(() =>
  activeResultTab.value === 'daily' && activeContactsSubview.value === 'forecast'
)
const canRunFromInspector = computed(() => canRunForecast.value)
const canRunForecast = computed(() => canForecastProjectRun(project.value))
const showInspector = computed(() => canForecastProjectShowInspector(project.value))
const canAdjustForecast = computed(() => canForecastProjectAdjust(project.value))
const isReadOnlyProject = computed(() => isForecastProjectReadOnly(project.value))
const isUnsavedProject = computed(() =>
  !String(project.value?.updatedAt || '').trim() && !String(project.value?.createdAt || '').trim()
)
const canOpenSourceModal = computed(() =>
  props.showSourceActionButton && (isForecastTab.value || isReadOnlyProject.value)
)
const showDuplicateProjectAction = computed(() =>
  props.showDuplicateAction
)
const hasHistory = computed(() => {
  if (sourceKind.value === 'manual_monthly') {
    return Boolean(project.value?.lastRun?.monthlyRollup?.length)
  }

  if (sourceKind.value === 'imported_daily') {
    return Boolean(project.value?.lastRun?.dailyForecast?.length)
  }

  return Array.isArray(project.value?.historyRows) && project.value.historyRows.length > 0
})
const hasResults = computed(() => Boolean(project.value?.lastRun?.runAt))
const forecastRows = computed(() =>
  getForecastProjectDailyRows(project.value).filter((row) => !row?.isHistory)
)
const manualAdjustments = computed(() => getForecastProjectManualAdjustments(project.value))
const currentInputSignature = computed(() => buildForecastRunInputSignature(project.value))
const resultsStale = computed(() =>
  Boolean(
    canRunForecast.value &&
    hasResults.value &&
    project.value?.lastRun?.inputSignature &&
    project.value.lastRun.inputSignature !== currentInputSignature.value
  )
)
const headerStatus = computed(() => {
  if (props.runError) {
    return {
      message: props.runError,
      tone: 'error'
    }
  }

  if (props.validationMessages.length) {
    return {
      message: 'Resolve the validation issues in model parameters before running the forecast again.',
      tone: 'warning'
    }
  }

  return null
})
const inspectorFooterMessage = computed(() => {
  if (!canRunFromInspector.value) {
    return ''
  }

  if (props.validationMessages.length) {
    return 'Resolve the validation issues before rerunning the forecast.'
  }

  if (resultsStale.value) {
    return 'Outputs are stale. Run the forecast to refresh the chart and rollups.'
  }

  return ''
})
const collapsedRailStatusClass = computed(() => {
  if (props.validationMessages.length) {
    return 'bg-rose-500'
  }

  if (resultsStale.value) {
    return 'bg-amber-500'
  }

  return 'bg-slate-400'
})
const historyActionLabel = computed(() => getForecastSourceActionLabel(project.value))
const shouldAutoOpenInspector = computed(() =>
  showInspector.value &&
  sourceKind.value === 'modeled_daily' &&
  hasHistory.value &&
  !hasResults.value &&
  isUnsavedProject.value &&
  !String(project.value?.uploadedFileName || '').trim() &&
  Boolean(project.value?.planningContext?.groupId)
)
const currentRunLabel = computed(() =>
  hasResults.value && project.value?.lastRun?.runAt
    ? `Current run: ${formatDateTime(project.value.lastRun.runAt)}`
    : ''
)
const coverageLabel = computed(() => {
  if (!isPlanAlignedForecast(project.value) || !project.value?.coverageStartDate || !project.value?.coverageEndDate) {
    return ''
  }

  return `Coverage: ${project.value.coverageStartDate} to ${project.value.coverageEndDate}`
})
const adjustedDayCount = computed(() =>
  forecastRows.value.filter((row) => row.isAdjusted).length
)
const totalAdjustmentDelta = computed(() =>
  forecastRows.value.reduce((sum, row) => sum + Number(row.manualAdjustmentDelta || 0), 0)
)
const adjustedForecastTotal = computed(() =>
  forecastRows.value.reduce((sum, row) => sum + Number(row.yhat || 0), 0)
)
const manualAdjustmentSummary = computed(() => {
  if (!manualAdjustments.value.length) {
    return ''
  }

  const ruleLabel = manualAdjustments.value.length === 1 ? 'rule' : 'rules'
  const netImpactLabel = `${totalAdjustmentDelta.value >= 0 ? '+' : ''}${formatWhole(totalAdjustmentDelta.value)}`

  return `${formatWhole(manualAdjustments.value.length)} ${ruleLabel} • ${formatWhole(adjustedDayCount.value)} adjusted days • ${netImpactLabel} net impact • ${formatWhole(adjustedForecastTotal.value)} adjusted total`
})

const clearManualAdjustments = () => {
  project.value.manualAdjustments = []
}

const handleInspectorRun = () => {
  inspectorOpen.value = false
  emit('run-forecast')
}

watch(
  () => [project.value?.id, shouldAutoOpenInspector.value, showInspector.value],
  ([projectId, nextShouldAutoOpen, nextShowInspector], previousValue = []) => {
    const previousProjectId = previousValue[0]
    const normalizedProjectId = String(projectId || '').trim()
    const projectChanged = normalizedProjectId !== String(previousProjectId || '').trim()

    if (!nextShowInspector) {
      inspectorOpen.value = false
      return
    }

    if (!projectChanged) {
      return
    }

    if (!normalizedProjectId) {
      inspectorOpen.value = false
      return
    }

    if (nextShouldAutoOpen && !autoOpenedInspectorProjectIds.has(normalizedProjectId)) {
      inspectorOpen.value = true
      autoOpenedInspectorProjectIds.add(normalizedProjectId)
      return
    }

    inspectorOpen.value = false
  },
  { immediate: true }
)
</script>

<template>
  <div class="grid gap-4">
    <div class="border-b border-slate-200 bg-white px-5 py-5">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="grid gap-3">
          <h2 class="text-[1.85rem] font-semibold tracking-[-0.04em] text-slate-950">
            {{ project.name || 'Untitled Forecast' }}
          </h2>
          <p v-if="coverageLabel" class="text-sm font-medium text-slate-600">
            {{ coverageLabel }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 xl:justify-end">
          <AppButton
            v-if="props.showLibraryActions"
            size="sm"
            variant="secondary"
            @click="emit('create-new-project')"
          >
            New Forecast
          </AppButton>
          <AppButton
            v-if="props.showLibraryActions"
            size="sm"
            variant="secondary"
            @click="emit('open-project-dialog')"
          >
            Open Forecast
          </AppButton>
          <AppButton
            v-if="showDuplicateProjectAction"
            size="sm"
            variant="secondary"
            @click="emit('duplicate-project')"
          >
            Duplicate Forecast
          </AppButton>
          <span
            v-if="currentRunLabel"
            class="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
          >
            {{ currentRunLabel }}
          </span>
          <AppButton
            v-if="!isReadOnlyProject"
            size="sm"
            variant="secondary"
            @click="emit('save-project')"
          >
            Save Forecast
          </AppButton>
          <AppButton
            v-if="canOpenSourceModal"
            size="sm"
            variant="secondary"
            @click="emit('open-source-modal')"
          >
            {{ historyActionLabel }}
          </AppButton>
          <AppButton
            v-if="showInspector"
            size="sm"
            variant="secondary"
            class="xl:hidden"
            @click="inspectorOpen = true"
          >
            Model Parameters
          </AppButton>
          <span
            v-if="canRunForecast && isForecastTab && resultsStale"
            class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-amber-700"
          >
            Outputs Stale
          </span>
        </div>
      </div>

      <div v-if="headerStatus" class="mt-4">
        <div
          class="rounded-[20px] border px-4 py-3 text-sm"
          :class="headerStatus.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'"
        >
          {{ headerStatus.message }}
        </div>
      </div>
    </div>

    <div class="grid gap-4">
      <div class="relative grid gap-4 xl:pr-11">
        <div class="min-w-0 grid gap-4">
          <section class="overflow-hidden bg-white">
            <div v-if="hasHistory" class="border-b border-slate-200 px-4 py-4">
              <AppOptionPills
                v-model="activeResultTab"
                aria-label="Forecast result tabs"
                :items="resultTabs"
              />
            </div>

            <div v-if="hasHistory" class="pt-4">
              <ForecastingResultsPanel
                v-model:project="project"
                v-model:active-result-tab="activeResultTab"
                v-model:active-contacts-subview="activeContactsSubview"
                :run-error="props.runError"
              />
            </div>

            <div v-else class="p-5">
              <AppEmptyState
                title="No daily history loaded"
                description="Upload a CSV to start configuring and running the forecast."
              >
                <div class="pt-3">
                  <AppButton size="sm" variant="primary" @click="emit('open-source-modal')">
                    Upload History
                  </AppButton>
                </div>
              </AppEmptyState>
            </div>
          </section>
        </div>

        <button
          v-if="showInspector && !inspectorOpen"
          type="button"
          class="hidden xl:flex xl:absolute xl:right-0 xl:top-0 xl:bottom-0 xl:z-10 xl:w-11 xl:flex-col xl:items-center xl:border-l xl:border-slate-200 xl:bg-slate-50 xl:px-1 xl:py-3 xl:text-slate-700 xl:shadow-[0_18px_36px_rgba(15,23,42,0.1)] xl:transition xl:hover:bg-white"
          aria-label="Expand model parameters"
          @click="inspectorOpen = true"
        >
          <div class="grid justify-items-center gap-3">
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#15395f] bg-[#15395f] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(15,23,42,0.16)]">
              +
            </span>

            <span
              class="h-1.5 w-4 rounded-full"
              :class="collapsedRailStatusClass"
            />
          </div>

          <span class="pointer-events-none absolute inset-x-0 top-16 bottom-3 flex items-center justify-center [writing-mode:vertical-rl] rotate-180 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Model Parameters
          </span>
        </button>
      </div>

      <section
        v-if="canAdjustForecast && hasHistory && activeResultTab === 'daily' && activeContactsSubview === 'forecast'"
        class="overflow-visible border border-slate-200 bg-white shadow-sm"
      >
        <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3 xl:flex-row xl:items-start xl:justify-between">
          <div class="grid gap-1">
            <h3 class="text-base font-semibold tracking-[-0.02em] text-slate-950">
              Range adjustment rules
            </h3>
            <p class="text-sm text-slate-600">
              All rules apply to the baseline forecast.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2 xl:justify-end">
            <p v-if="manualAdjustmentSummary" class="text-[0.82rem] text-slate-500">
              {{ manualAdjustmentSummary }}
            </p>
            <AppButton
              v-if="manualAdjustments.length"
              size="sm"
              variant="secondary"
              @click="clearManualAdjustments"
            >
              Clear Rules
            </AppButton>
          </div>
        </div>

        <div class="p-5">
          <ForecastingManualAdjustmentsDock
            v-model:project="project"
            :results-stale="resultsStale"
          />
        </div>
      </section>
    </div>

    <AppDrawer
      v-if="showInspector"
      v-model:visible="inspectorOpen"
      title="Model Parameters"
      kicker="Prophet Configuration"
      side="right"
      width-class="max-w-[38rem]"
      :show-header-close="false"
      allow-backdrop-close
      @close="inspectorOpen = false"
    >
      <div class="p-6">
        <ForecastingWorkbenchInspector
          v-model:project="project"
          :validation-messages="props.validationMessages"
          @add-custom-seasonality="emit('add-custom-seasonality')"
          @remove-custom-seasonality="emit('remove-custom-seasonality', $event)"
          @add-custom-holiday="emit('add-custom-holiday')"
          @remove-custom-holiday="emit('remove-custom-holiday', $event)"
        />
      </div>

      <template #footer>
        <div
          class="flex w-full flex-col gap-3 border-t border-slate-200 px-6 py-4"
          :class="canRunFromInspector && inspectorFooterMessage ? 'xl:flex-row xl:items-center xl:justify-between' : 'items-end'"
        >
          <p v-if="canRunFromInspector && inspectorFooterMessage" class="text-sm text-slate-600">
            {{ inspectorFooterMessage }}
          </p>

          <div class="flex items-center justify-end gap-2">
            <AppButton size="sm" variant="secondary" @click="inspectorOpen = false">
              Close
            </AppButton>
            <AppButton
              v-if="canRunFromInspector"
              size="sm"
              variant="primary"
              :disabled="props.isRunningForecast || props.validationMessages.length > 0"
              @click="handleInspectorRun"
            >
              {{ props.isRunningForecast ? 'Running...' : 'Run' }}
            </AppButton>
          </div>
        </div>
      </template>
    </AppDrawer>
  </div>
</template>
