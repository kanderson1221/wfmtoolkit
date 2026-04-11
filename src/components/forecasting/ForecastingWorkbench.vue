<script setup>
import { computed, ref } from 'vue'

import ForecastingManualAdjustmentsDock from './ForecastingManualAdjustmentsDock.vue'
import ForecastingResultsPanel from './ForecastingResultsPanel.vue'
import ForecastingWorkbenchInspector from './ForecastingWorkbenchInspector.vue'
import AppButton from '../ui/AppButton.vue'
import {
  FORECAST_RESULT_TABS
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
  projectMeta: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'run-forecast',
  'add-custom-seasonality',
  'remove-custom-seasonality',
  'add-custom-holiday',
  'remove-custom-holiday',
  'open-data-step'
])

const project = defineModel('project', {
  type: Object,
  required: true
})

const activeResultTab = defineModel('activeResultTab', {
  type: String,
  required: true
})

const inspectorCollapsed = ref(false)
const dockVisible = ref(true)

const resultTabs = computed(() => FORECAST_RESULT_TABS)
const hasResults = computed(() => Boolean(project.value?.lastRun?.runAt))
const currentInputSignature = computed(() => buildForecastRunInputSignature(project.value))
const resultsStale = computed(() =>
  Boolean(
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
      message: 'Resolve the validation issues in the inspector before running the forecast again.',
      tone: 'warning'
    }
  }

  return null
})
const desktopWorkbenchStyle = computed(() => ({
  '--forecast-inspector-width': inspectorCollapsed.value ? '2.75rem' : '23rem'
}))
const collapsedRailStatusClass = computed(() => {
  if (props.validationMessages.length) {
    return 'bg-rose-500'
  }

  if (resultsStale.value) {
    return 'bg-amber-500'
  }

  return 'bg-[#15395f]'
})
</script>

<template>
  <div class="grid gap-4">
    <div class="border-b border-slate-200 bg-white px-5 py-5">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="grid gap-3">
          <div class="grid gap-1">
            <p class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Forecast Workbench
            </p>
            <h2 class="text-[1.85rem] font-semibold tracking-[-0.04em] text-slate-950">
              {{ project.name || 'Untitled Forecast' }}
            </h2>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 xl:justify-end">
          <AppButton size="sm" variant="secondary" @click="emit('open-data-step')">
            Historical Data
          </AppButton>
          <AppButton size="sm" variant="secondary" @click="dockVisible = !dockVisible">
            {{ dockVisible ? 'Hide Adjustments' : 'Show Adjustments' }}
          </AppButton>
          <span
            v-if="resultsStale"
            class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-amber-700"
          >
            Outputs Stale
          </span>
          <AppButton
            size="sm"
            variant="primary"
            :disabled="props.isRunningForecast || props.validationMessages.length > 0"
            @click="emit('run-forecast')"
          >
            {{ props.isRunningForecast ? 'Running Forecast...' : 'Run Forecast' }}
          </AppButton>
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
      <div
        class="grid gap-4 xl:gap-0 xl:[grid-template-columns:minmax(0,1fr)_var(--forecast-inspector-width)] xl:transition-[grid-template-columns] xl:duration-300 xl:ease-[cubic-bezier(0.22,1,0.36,1)]"
        :style="desktopWorkbenchStyle"
      >
        <div class="min-w-0 grid gap-4">
          <section class="overflow-hidden bg-white">
            <div class="border-b border-slate-200 px-4 py-4">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="tab in resultTabs"
                  :key="tab.id"
                  type="button"
                  class="rounded-[16px] border px-4 py-2 text-sm font-semibold transition"
                  :class="activeResultTab === tab.id ? 'border-[#102f4f] bg-[#15395f] text-white shadow-[0_10px_20px_rgba(16,47,79,0.18)]' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#a7bbce] hover:bg-white hover:text-[#15395f]'"
                  @click="activeResultTab = tab.id"
                >
                  {{ tab.label }}
                </button>
              </div>
            </div>

            <div class="pt-4">
              <ForecastingResultsPanel
                v-model:active-result-tab="activeResultTab"
                :project="project"
                :run-error="props.runError"
                embedded
                :show-header="false"
                :show-forecast-table="false"
              />
            </div>
          </section>
        </div>

        <aside
          class="min-w-0 xl:sticky xl:top-4 xl:mt-[5.25rem]"
          :class="inspectorCollapsed ? 'xl:self-stretch' : 'xl:self-start'"
        >
          <div class="relative h-full">
            <section
              class="overflow-hidden border border-slate-200 bg-[#edf3f8] shadow-sm transition-opacity duration-200 xl:flex xl:max-h-[calc(100vh-7.25rem)] xl:flex-col xl:rounded-none xl:border-y-0 xl:border-r-0 xl:shadow-none"
              :class="inspectorCollapsed ? 'pointer-events-none xl:absolute xl:inset-0 xl:opacity-0' : 'opacity-100'"
            >
              <div class="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                <div class="grid gap-1">
                  <p class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#15395f]">
                    Prophet Configuration
                  </p>
                  <h3 class="text-base font-semibold tracking-[-0.02em] text-slate-950">
                    Model Inspector
                  </h3>
                </div>
                <button
                  type="button"
                  class="hidden text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:text-[#15395f] xl:inline-flex"
                  @click="inspectorCollapsed = true"
                >
                  Collapse
                </button>
              </div>

              <div class="p-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-3">
                <ForecastingWorkbenchInspector
                  v-model:project="project"
                  :validation-messages="props.validationMessages"
                  @add-custom-seasonality="emit('add-custom-seasonality')"
                  @remove-custom-seasonality="emit('remove-custom-seasonality', $event)"
                  @add-custom-holiday="emit('add-custom-holiday')"
                  @remove-custom-holiday="emit('remove-custom-holiday', $event)"
                />
              </div>
            </section>

            <section
              class="hidden border-l border-[#102f4f] bg-[#15395f] shadow-sm transition-opacity duration-200 xl:flex xl:rounded-none xl:border-y-0 xl:border-r-0 xl:shadow-none"
              :class="inspectorCollapsed ? 'relative h-full opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'"
            >
              <button
                type="button"
                class="relative flex h-full w-full flex-col items-center px-1 py-3 text-slate-100 transition hover:bg-[#123153]"
                aria-label="Expand model inspector"
                @click="inspectorCollapsed = false"
              >
                <div class="grid justify-items-center gap-3">
                  <span class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/60 bg-white text-sm font-semibold text-[#15395f] shadow-[0_4px_12px_rgba(15,23,42,0.2)]">
                    +
                  </span>

                  <span
                    class="h-1.5 w-4 rounded-full"
                    :class="collapsedRailStatusClass"
                  />
                </div>

                <span class="pointer-events-none absolute inset-x-0 top-16 bottom-3 flex items-center justify-center [writing-mode:vertical-rl] rotate-180 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-slate-200/85">
                  Inspector
                </span>
              </button>
            </section>
          </div>
        </aside>
      </div>

      <section v-if="dockVisible" class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div class="grid gap-1">
              <p class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Reserved Lower Dock
              </p>
              <h3 class="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                Manual Adjustments
              </h3>
            </div>
            <p class="max-w-[44rem] text-sm text-slate-600">
              Apply future-row daily deltas here, then carry the adjusted monthly rollup downstream into planning.
            </p>
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
  </div>
</template>
