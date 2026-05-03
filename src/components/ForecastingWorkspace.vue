<script setup>
import { computed, nextTick, ref, toRef, watch } from 'vue'

import ForecastHistoryModal from './forecasting/ForecastHistoryModal.vue'
import ForecastCreateDialog from './forecasting/ForecastCreateDialog.vue'
import ForecastImportDailyModal from './forecasting/ForecastImportDailyModal.vue'
import ForecastMonthlyEntryModal from './forecasting/ForecastMonthlyEntryModal.vue'
import ForecastProjectDialog from './forecasting/ForecastProjectDialog.vue'
import ForecastingWorkbench from './forecasting/ForecastingWorkbench.vue'
import AppBreadcrumbs from './ui/AppBreadcrumbs.vue'
import AppStatusMessage from './ui/AppStatusMessage.vue'
import { useForecastingWorkspace } from '../composables/useForecastingWorkspace'
import {
  createForecastProject,
  FORECAST_SOURCE_IMPORTED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  FORECAST_SOURCE_MODELED_DAILY,
  FORECAST_TYPE_BUDGET,
  getForecastProjectSourceKind
} from '../forecasting/shared'
import {
  createImportedDailyForecastResults,
  createManualMonthlyForecastResults
} from '../forecasting/sourceArtifacts'

const emit = defineEmits(['save-complete', 'cancel-create'])

const props = defineProps({
  storageScope: {
    type: String,
    default: 'default'
  },
  projectSeed: {
    type: Object,
    default: null
  },
  fallbackScopes: {
    type: Array,
    default: () => []
  },
  storageRefreshToken: {
    type: Number,
    default: 0
  },
  breadcrumbs: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: 'Forecasting'
  },
  contextSummaryItems: {
    type: Array,
    default: () => []
  },
  showLibraryActions: {
    type: Boolean,
    default: true
  },
  enableSourceKindCreation: {
    type: Boolean,
    default: false
  },
  showDuplicateAction: {
    type: Boolean,
    default: true
  },
  showSourceActionButton: {
    type: Boolean,
    default: true
  },
  projectDialogDescription: {
    type: String,
    default: ''
  },
  initialProjectId: {
    type: String,
    default: ''
  },
  embedded: {
    type: Boolean,
    default: false
  }
})

const projectDialogOpen = ref(false)
const createDialogOpen = ref(false)
const historyModalOpen = ref(false)
const importedDailyModalOpen = ref(false)
const monthlyForecastModalOpen = ref(false)
const lastAppliedInitialProjectId = ref('')
const lastAutoOpenedSourceProjectId = ref('')

const {
  currentProject,
  isLoadingProjects,
  isRunningForecast,
  loadError,
  runError,
  saveError,
  isDirty,
  activeResultTab,
  projectSummaries,
  validationMessages,
  currentProjectMeta,
  createNewProject,
  openProjectById,
  saveCurrentProject,
  duplicateCurrentProject,
  applyHistoryImport,
  addCustomSeasonality,
  removeCustomSeasonality,
  addCustomHoliday,
  removeCustomHoliday,
  runForecast
} = useForecastingWorkspace(toRef(props, 'storageScope'), {
  projectSeed: toRef(props, 'projectSeed'),
  fallbackScopes: toRef(props, 'fallbackScopes'),
  refreshToken: toRef(props, 'storageRefreshToken')
})

const breadcrumbItems = computed(() => [
  ...(props.breadcrumbs.length ? props.breadcrumbs : [{ label: 'Home', href: '#home' }, { label: props.title }])
])

const projectDialogCurrentId = computed(() => currentProject.value?.id || '')

const projectDialogDescription = computed(() =>
  props.projectDialogDescription || 'Open a saved forecast for this workspace and keep its monthly rollup ready for downstream planning.'
)

const handleCreateNewProject = () => {
  if (props.enableSourceKindCreation) {
    createDialogOpen.value = true
    return
  }

  const seededSourceKind = getForecastProjectSourceKind(props.projectSeed || {})

  if (seededSourceKind === FORECAST_SOURCE_IMPORTED_DAILY) {
    createNewProject(buildProjectSeedForSourceKind(FORECAST_SOURCE_IMPORTED_DAILY))
    importedDailyModalOpen.value = true
    return
  }

  if (seededSourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    createNewProject(buildProjectSeedForSourceKind(FORECAST_SOURCE_MANUAL_MONTHLY))
    monthlyForecastModalOpen.value = true
    return
  }

  const modeledSeed = buildProjectSeedForSourceKind(FORECAST_SOURCE_MODELED_DAILY)
  createNewProject(modeledSeed)

  if (!modeledSeed.historyRows.length) {
    historyModalOpen.value = true
  }
}

const buildProjectSeedForSourceKind = (sourceKind) =>
  createForecastProject({
    ...(props.projectSeed || {}),
    sourceKind,
    forecastType: FORECAST_TYPE_BUDGET,
    coverageStartMonthIndex: 0
  })

const handleCreateProjectFromSourceKind = (sourceKind) => {
  createDialogOpen.value = false

  if (sourceKind === FORECAST_SOURCE_IMPORTED_DAILY) {
    importedDailyModalOpen.value = true
    return
  }

  if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY) {
    monthlyForecastModalOpen.value = true
    return
  }

  createNewProject({
    ...buildProjectSeedForSourceKind(FORECAST_SOURCE_MODELED_DAILY)
  })
  historyModalOpen.value = true
}

const handleOpenProject = (projectId) => {
  openProjectById(projectId)
  projectDialogOpen.value = false
  historyModalOpen.value = false
}

const handleRunForecast = async () => {
  const didSucceed = await runForecast()
  if (didSucceed) {
    await saveCurrentProject()
  }
}

const handleSaveProject = async () => {
  const didSave = await saveCurrentProject()

  if (!didSave) {
    return
  }

  emit('save-complete')
}

const isUnsavedSourceCreation = (sourceKind) =>
  getForecastProjectSourceKind(currentProject.value) === sourceKind &&
  !currentProject.value?.lastRun?.runAt

const handleHistoryModalClose = () => {
  historyModalOpen.value = false

  if (
    isUnsavedSourceCreation(FORECAST_SOURCE_MODELED_DAILY) &&
    !currentProject.value?.historyRows?.length &&
    !currentProject.value?.uploadedFileName
  ) {
    emit('cancel-create')
  }
}

const handleImportedDailyClose = () => {
  importedDailyModalOpen.value = false

  if (isUnsavedSourceCreation(FORECAST_SOURCE_IMPORTED_DAILY)) {
    emit('cancel-create')
  }
}

const handleMonthlyForecastClose = () => {
  monthlyForecastModalOpen.value = false

  if (isUnsavedSourceCreation(FORECAST_SOURCE_MANUAL_MONTHLY)) {
    emit('cancel-create')
  }
}

const saveReadOnlyProject = async (nextProject, successMessage = 'Forecast saved.') => {
  currentProject.value = createForecastProject(nextProject)
  await nextTick()
  return saveCurrentProject(successMessage)
}

const handleApplyImportedDaily = async ({ sourceData, importedDailyRows, ahtMonthOverrides } = {}) => {
  const isReplacingCurrentProject = getForecastProjectSourceKind(currentProject.value) === FORECAST_SOURCE_IMPORTED_DAILY
  const baseProject = isReplacingCurrentProject
    ? createForecastProject(currentProject.value)
    : buildProjectSeedForSourceKind(FORECAST_SOURCE_IMPORTED_DAILY)
  const nextForecastType = FORECAST_TYPE_BUDGET
  const nextCoverageStartMonthIndex = baseProject.coverageStartMonthIndex ?? 0
  const lastRun = createImportedDailyForecastResults({
    rows: importedDailyRows,
    planningYear: baseProject.planningYear,
    forecastType: nextForecastType,
    coverageStartMonthIndex: nextCoverageStartMonthIndex,
    coverageStartDate: baseProject.coverageStartDate,
    coverageEndDate: baseProject.coverageEndDate
  })
  const nextProject = createForecastProject({
    ...baseProject,
    sourceKind: FORECAST_SOURCE_IMPORTED_DAILY,
    forecastType: nextForecastType,
    coverageStartMonthIndex: nextCoverageStartMonthIndex,
    uploadedFileName: '',
    uploadedHeaders: [],
    uploadedRows: [],
    historyRows: [],
    parserIssues: [],
    normalizationIssues: [],
    manualAdjustments: [],
    modelConfig: {
      ...baseProject.modelConfig,
      ahtMonthOverrides: Array.isArray(ahtMonthOverrides)
        ? ahtMonthOverrides.map((row) => ({ ...row }))
        : []
    },
    sourceData,
    lastRun
  })

  importedDailyModalOpen.value = false
  const didSave = await saveReadOnlyProject(nextProject, isReplacingCurrentProject ? 'Forecast updated.' : 'Forecast saved.')
  if (didSave) {
    emit('save-complete')
  }
}

const handleApplyManualMonthly = async ({ monthlyRows } = {}) => {
  const isReplacingCurrentProject = getForecastProjectSourceKind(currentProject.value) === FORECAST_SOURCE_MANUAL_MONTHLY
  const baseProject = isReplacingCurrentProject
    ? createForecastProject(currentProject.value)
    : buildProjectSeedForSourceKind(FORECAST_SOURCE_MANUAL_MONTHLY)
  const nextForecastType = FORECAST_TYPE_BUDGET
  const nextCoverageStartMonthIndex = baseProject.coverageStartMonthIndex ?? 0
  const lastRun = createManualMonthlyForecastResults({
    rows: monthlyRows,
    planningYear: baseProject.planningYear,
    forecastType: nextForecastType,
    coverageStartMonthIndex: nextCoverageStartMonthIndex,
    coverageStartDate: baseProject.coverageStartDate,
    coverageEndDate: baseProject.coverageEndDate
  })
  const nextProject = createForecastProject({
    ...baseProject,
    sourceKind: FORECAST_SOURCE_MANUAL_MONTHLY,
    forecastType: nextForecastType,
    coverageStartMonthIndex: nextCoverageStartMonthIndex,
    uploadedFileName: '',
    uploadedHeaders: [],
    uploadedRows: [],
    historyRows: [],
    parserIssues: [],
    normalizationIssues: [],
    manualAdjustments: [],
    sourceData: {
      fileName: '',
      headers: [],
      rows: monthlyRows,
      mapping: {},
      issues: []
    },
    lastRun
  })

  monthlyForecastModalOpen.value = false
  const didSave = await saveReadOnlyProject(nextProject, isReplacingCurrentProject ? 'Forecast updated.' : 'Forecast saved.')
  if (didSave) {
    emit('save-complete')
  }
}

const handleApplyHistoryImport = async (historyState) => {
  const shouldAutoRun = !currentProject.value?.lastRun?.runAt

  applyHistoryImport(historyState)
  historyModalOpen.value = false

  if (shouldAutoRun) {
    await nextTick()
    await handleRunForecast()
  }
}

watch(
  () => [props.initialProjectId, isLoadingProjects.value, projectSummaries.value.length],
  () => {
    const normalizedProjectId = String(props.initialProjectId || '').trim()

    if (isLoadingProjects.value) {
      return
    }

    if (!normalizedProjectId) {
      lastAppliedInitialProjectId.value = ''
      return
    }

    if (
      lastAppliedInitialProjectId.value === normalizedProjectId &&
      String(currentProject.value?.id || '').trim() === normalizedProjectId
    ) {
      return
    }

    if (!projectSummaries.value.some((project) => project.id === normalizedProjectId)) {
      return
    }

    openProjectById(normalizedProjectId)
    lastAppliedInitialProjectId.value = normalizedProjectId
  },
  { immediate: true }
)

watch(
  () => [
    isLoadingProjects.value,
    currentProject.value?.id,
    getForecastProjectSourceKind(currentProject.value),
    currentProject.value?.historyRows?.length || 0,
    currentProject.value?.lastRun?.dailyForecast?.length || 0,
    currentProject.value?.lastRun?.monthlyRollup?.length || 0
  ],
  ([isLoading, projectId, sourceKind, historyRowCount, dailyForecastCount, monthlyRollupCount]) => {
    if (isLoading) {
      return
    }

    const normalizedProjectId = String(projectId || '').trim()
    if (!normalizedProjectId) {
      return
    }

    if (lastAutoOpenedSourceProjectId.value === normalizedProjectId) {
      return
    }

    if (sourceKind === FORECAST_SOURCE_MODELED_DAILY && historyRowCount === 0) {
      historyModalOpen.value = true
      lastAutoOpenedSourceProjectId.value = normalizedProjectId
      return
    }

    if (sourceKind === FORECAST_SOURCE_IMPORTED_DAILY && dailyForecastCount === 0) {
      importedDailyModalOpen.value = true
      lastAutoOpenedSourceProjectId.value = normalizedProjectId
      return
    }

    if (sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY && monthlyRollupCount === 0) {
      monthlyForecastModalOpen.value = true
      lastAutoOpenedSourceProjectId.value = normalizedProjectId
    }
  },
  { immediate: true }
)
</script>

<template>
  <section id="forecasting-workspace" :class="props.embedded ? 'grid gap-4' : 'calculator-section'">
    <div :class="props.embedded ? 'grid gap-4' : 'app-frame grid gap-4'">
      <AppBreadcrumbs
        v-if="!props.embedded && breadcrumbItems.length"
        :items="breadcrumbItems"
      />

      <AppStatusMessage v-if="loadError" tone="error">
        {{ loadError }}
      </AppStatusMessage>

      <AppStatusMessage v-else-if="isLoadingProjects">
        Loading saved forecasts from this device.
      </AppStatusMessage>

      <div v-if="props.contextSummaryItems.length" class="flex flex-wrap gap-2">
        <div
          v-for="item in props.contextSummaryItems"
          :key="item.label"
          class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
        >
          <span class="mr-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {{ item.label }}
          </span>
          <strong class="font-semibold text-slate-950">{{ item.value }}</strong>
        </div>
      </div>

      <AppStatusMessage v-if="saveError" tone="error">
        {{ saveError }}
      </AppStatusMessage>

      <ForecastingWorkbench
        v-model:project="currentProject"
        v-model:active-result-tab="activeResultTab"
        :validation-messages="validationMessages"
        :run-error="runError"
        :is-running-forecast="isRunningForecast"
        :is-dirty="isDirty"
        :project-meta="currentProjectMeta"
        :show-library-actions="props.showLibraryActions"
        :show-duplicate-action="props.showDuplicateAction"
        :show-source-action-button="props.showSourceActionButton"
        @run-forecast="handleRunForecast"
        @create-new-project="handleCreateNewProject"
        @open-project-dialog="projectDialogOpen = true"
        @duplicate-project="duplicateCurrentProject"
        @save-project="handleSaveProject"
        @add-custom-seasonality="addCustomSeasonality"
        @remove-custom-seasonality="removeCustomSeasonality"
        @add-custom-holiday="addCustomHoliday"
        @remove-custom-holiday="removeCustomHoliday"
        @open-source-modal="
          getForecastProjectSourceKind(currentProject) === FORECAST_SOURCE_IMPORTED_DAILY
            ? (importedDailyModalOpen = true)
            : getForecastProjectSourceKind(currentProject) === FORECAST_SOURCE_MANUAL_MONTHLY
              ? (monthlyForecastModalOpen = true)
              : (historyModalOpen = true)
        "
      />
    </div>

    <ForecastCreateDialog
      v-if="props.enableSourceKindCreation"
      v-model:visible="createDialogOpen"
      @close="createDialogOpen = false"
      @select="handleCreateProjectFromSourceKind"
    />

    <ForecastProjectDialog
      v-model:visible="projectDialogOpen"
      :projects="projectSummaries"
      :current-project-id="projectDialogCurrentId"
      :description="projectDialogDescription"
      @close="projectDialogOpen = false"
      @open="handleOpenProject"
    />

    <ForecastHistoryModal
      v-model:visible="historyModalOpen"
      :project="currentProject"
      @apply="handleApplyHistoryImport"
      @close="handleHistoryModalClose"
    />

    <ForecastImportDailyModal
      v-model:visible="importedDailyModalOpen"
      :project="getForecastProjectSourceKind(currentProject) === FORECAST_SOURCE_IMPORTED_DAILY ? currentProject : buildProjectSeedForSourceKind(FORECAST_SOURCE_IMPORTED_DAILY)"
      @apply="handleApplyImportedDaily"
      @close="handleImportedDailyClose"
    />

    <ForecastMonthlyEntryModal
      v-model:visible="monthlyForecastModalOpen"
      :project="getForecastProjectSourceKind(currentProject) === FORECAST_SOURCE_MANUAL_MONTHLY ? currentProject : buildProjectSeedForSourceKind(FORECAST_SOURCE_MANUAL_MONTHLY)"
      @apply="handleApplyManualMonthly"
      @close="handleMonthlyForecastClose"
    />
  </section>
</template>
