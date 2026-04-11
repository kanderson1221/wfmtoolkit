<script setup>
import { computed, ref, toRef, watch } from 'vue'

import ForecastProjectDialog from './forecasting/ForecastProjectDialog.vue'
import ForecastingControlPanel from './forecasting/ForecastingControlPanel.vue'
import ForecastingWorkbench from './forecasting/ForecastingWorkbench.vue'
import AppButton from './ui/AppButton.vue'
import AppPanel from './ui/AppPanel.vue'
import AppPageHeader from './ui/AppPageHeader.vue'
import AppSectionHeader from './ui/AppSectionHeader.vue'
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
const activeWorkflowStep = ref(props.projectSeed?.lastRun?.runAt ? 'workbench' : 'data')
const lastAppliedInitialProjectId = ref('')

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
  handleHistoryFileSelect,
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

const pageTitle = computed(() => props.title || 'Forecasting')
const pageDescription = computed(() => props.description || 'Upload daily call volume, run Prophet, and keep the monthly rollup ready for planning.')
const projectDialogDescription = computed(() =>
  props.projectDialogDescription || 'Open a saved forecast for this workspace and keep its monthly rollup ready for downstream planning.'
)

const getDefaultWorkflowStep = (project = currentProject.value) =>
  project?.lastRun?.runAt ? 'workbench' : 'data'

const workflowSteps = computed(() => {
  return [
    {
      id: 'data',
      step: '1',
      title: 'Historical Data',
      description: 'Upload and map daily history.'
    },
    {
      id: 'workbench',
      step: '2',
      title: 'Forecast Workbench',
      description: 'Tune the model, review results, and apply daily adjustments.'
    }
  ]
})

const handleCreateNewProject = () => {
  createNewProject()
  activeWorkflowStep.value = 'data'
}

const handleOpenProject = (projectId) => {
  openProjectById(projectId)
  projectDialogOpen.value = false
  activeWorkflowStep.value = getDefaultWorkflowStep()
}

const handleRunForecast = async () => {
  const didSucceed = await runForecast()
  if (didSucceed) {
    const didSave = await saveCurrentProject()
    if (didSave) {
      activeWorkflowStep.value = 'workbench'
    }
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
    activeWorkflowStep.value = getDefaultWorkflowStep()
    lastAppliedInitialProjectId.value = normalizedProjectId
  },
  { immediate: true }
)
</script>

<template>
  <section id="forecasting-workspace" :class="props.embedded ? 'grid gap-4' : 'calculator-section'">
    <div :class="props.embedded ? 'grid gap-4' : 'app-frame grid gap-4'">
      <div
        v-if="props.embedded"
        class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"
      >
        <AppSectionHeader
          :title="pageTitle"
          :description="props.showDescription ? pageDescription : ''"
        />

        <div class="flex flex-wrap items-center gap-2">
          <AppButton v-if="props.showLibraryActions" size="sm" variant="secondary" @click="handleCreateNewProject">New Forecast</AppButton>
          <AppButton v-if="props.showLibraryActions" size="sm" variant="secondary" @click="projectDialogOpen = true">Open Forecast</AppButton>
          <AppButton v-if="props.showDuplicateAction" size="sm" variant="secondary" @click="duplicateCurrentProject">Duplicate Forecast</AppButton>
          <AppButton size="sm" variant="primary" @click="saveCurrentProject()">Save Forecast</AppButton>
        </div>
      </div>

      <AppPageHeader
        v-else
        :breadcrumbs="breadcrumbItems"
        :title="pageTitle"
        :description="props.showDescription ? pageDescription : ''"
      >
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <AppButton v-if="props.showLibraryActions" size="sm" variant="secondary" @click="handleCreateNewProject">New Forecast</AppButton>
            <AppButton v-if="props.showLibraryActions" size="sm" variant="secondary" @click="projectDialogOpen = true">Open Forecast</AppButton>
            <AppButton v-if="props.showDuplicateAction" size="sm" variant="secondary" @click="duplicateCurrentProject">Duplicate Forecast</AppButton>
            <AppButton size="sm" variant="primary" @click="saveCurrentProject()">Save Forecast</AppButton>
          </div>
        </template>
      </AppPageHeader>

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

      <AppPanel :padded="false">
        <div class="grid gap-4 p-4">
          <nav class="flex flex-wrap gap-3" aria-label="Forecast workflow">
            <button
              v-for="step in workflowSteps"
              :key="step.id"
              type="button"
              class="min-w-[13rem] rounded-[20px] border px-4 py-3 text-left transition"
              :class="activeWorkflowStep === step.id ? 'border-[#15395f] bg-[#15395f] text-white shadow-[0_12px_28px_rgba(21,57,95,0.18)]' : 'border-[#d3dee9] bg-[#e7eef4] text-[#15395f] hover:border-[#bcd0df] hover:bg-white'"
              @click="activeWorkflowStep = step.id"
            >
              <div class="flex items-start gap-3">
                <span
                  class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="activeWorkflowStep === step.id ? 'bg-white/12 text-white' : 'bg-white text-[#15395f]'"
                >
                  {{ step.step }}
                </span>
                <span class="min-w-0">
                  <strong class="block text-sm font-semibold leading-5 tracking-[-0.02em]">
                    {{ step.title }}
                  </strong>
                  <span
                    class="mt-0.5 block text-[0.8rem] leading-5"
                    :class="activeWorkflowStep === step.id ? 'text-[#d5e3ef]' : 'text-slate-600'"
                  >
                    {{ step.description }}
                  </span>
                </span>
              </div>
            </button>
          </nav>

          <section class="min-w-0">
            <div class="grid gap-3">
              <ForecastingControlPanel
                v-if="activeWorkflowStep === 'data'"
                v-model:project="currentProject"
                :workflow-step="activeWorkflowStep"
                :validation-messages="validationMessages"
                :run-error="runError"
                :save-error="saveError"
                :is-running-forecast="isRunningForecast"
                @file-select="handleHistoryFileSelect"
                @run-forecast="handleRunForecast"
                @add-custom-seasonality="addCustomSeasonality"
                @remove-custom-seasonality="removeCustomSeasonality"
                @add-custom-holiday="addCustomHoliday"
                @remove-custom-holiday="removeCustomHoliday"
                @request-step-change="activeWorkflowStep = $event"
              />

              <ForecastingWorkbench
                v-else
                v-model:project="currentProject"
                v-model:active-result-tab="activeResultTab"
                :validation-messages="validationMessages"
                :run-error="runError"
                :is-running-forecast="isRunningForecast"
                :is-dirty="isDirty"
                :project-meta="currentProjectMeta"
                @run-forecast="handleRunForecast"
                @add-custom-seasonality="addCustomSeasonality"
                @remove-custom-seasonality="removeCustomSeasonality"
                @add-custom-holiday="addCustomHoliday"
                @remove-custom-holiday="removeCustomHoliday"
                @open-data-step="activeWorkflowStep = 'data'"
              />
            </div>
          </section>
        </div>
      </AppPanel>
    </div>

    <ForecastProjectDialog
      v-model:visible="projectDialogOpen"
      :projects="projectSummaries"
      :current-project-id="projectDialogCurrentId"
      :description="projectDialogDescription"
      @close="projectDialogOpen = false"
      @open="handleOpenProject"
    />
  </section>
</template>
