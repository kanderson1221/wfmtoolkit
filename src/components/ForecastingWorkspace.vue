<script setup>
import { computed, nextTick, ref, toRef, watch } from 'vue'

import ForecastHistoryModal from './forecasting/ForecastHistoryModal.vue'
import ForecastProjectDialog from './forecasting/ForecastProjectDialog.vue'
import ForecastingWorkbench from './forecasting/ForecastingWorkbench.vue'
import AppBreadcrumbs from './ui/AppBreadcrumbs.vue'
import AppStatusMessage from './ui/AppStatusMessage.vue'
import { useForecastingWorkspace } from '../composables/useForecastingWorkspace'

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
  description: {
    type: String,
    default: 'Upload daily call volume, run Prophet, and keep the monthly rollup ready for planning.'
  },
  showDescription: {
    type: Boolean,
    default: true
  },
  contextSummaryItems: {
    type: Array,
    default: () => []
  },
  showLibraryActions: {
    type: Boolean,
    default: true
  },
  showDuplicateAction: {
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
const historyModalOpen = ref(false)
const lastAppliedInitialProjectId = ref('')
const lastAutoOpenedHistoryProjectId = ref('')

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
  createNewProject()
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
  () => [isLoadingProjects.value, currentProject.value?.id, currentProject.value?.historyRows?.length || 0],
  ([isLoading, projectId, historyRowCount]) => {
    if (isLoading) {
      return
    }

    const normalizedProjectId = String(projectId || '').trim()
    if (!normalizedProjectId || historyRowCount > 0) {
      return
    }

    if (lastAutoOpenedHistoryProjectId.value === normalizedProjectId) {
      return
    }

    historyModalOpen.value = true
    lastAutoOpenedHistoryProjectId.value = normalizedProjectId
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
        @run-forecast="handleRunForecast"
        @create-new-project="handleCreateNewProject"
        @open-project-dialog="projectDialogOpen = true"
        @duplicate-project="duplicateCurrentProject"
        @save-project="saveCurrentProject()"
        @add-custom-seasonality="addCustomSeasonality"
        @remove-custom-seasonality="removeCustomSeasonality"
        @add-custom-holiday="addCustomHoliday"
        @remove-custom-holiday="removeCustomHoliday"
        @open-history-modal="historyModalOpen = true"
      />
    </div>

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
      @close="historyModalOpen = false"
    />
  </section>
</template>
