<script setup>
import { computed, ref, watch } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableShell from '../ui/AppTableShell.vue'
import {
  buildForecastCandidateComparison,
  getComparableForecastCandidates
} from '../../forecasting/forecastCandidateComparison'
import { formatNumber } from '../../forecasting/shared'

const props = defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  currentProjectId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

const referenceId = ref('')
const candidateId = ref('')
const eligibleProjects = computed(() => getComparableForecastCandidates(props.projects))
const projectOptions = computed(() => eligibleProjects.value.map((project) => ({
  label: `${project.name} · ${project.lastRun?.diagnostics?.holdout?.testDateRange || 'Holdout date unavailable'}`,
  value: project.id
})))
const referenceProject = computed(() =>
  eligibleProjects.value.find((project) => project.id === referenceId.value) || null
)
const candidateProject = computed(() =>
  eligibleProjects.value.find((project) => project.id === candidateId.value) || null
)
const comparison = computed(() =>
  buildForecastCandidateComparison(referenceProject.value, candidateProject.value)
)

const initializeSelection = () => {
  const projects = eligibleProjects.value
  if (projects.length < 2) {
    referenceId.value = projects[0]?.id || ''
    candidateId.value = ''
    return
  }

  const currentProject = projects.find((project) => project.id === props.currentProjectId)
  const reference = currentProject || projects[0]
  const comparableCandidate = projects.find(
    (project) => project.id !== reference.id &&
      buildForecastCandidateComparison(reference, project).status === 'comparable'
  )

  referenceId.value = reference.id
  candidateId.value = (comparableCandidate || projects.find((project) => project.id !== reference.id)).id
}

watch(
  () => [visible.value, props.currentProjectId, eligibleProjects.value.length],
  ([isVisible]) => {
    if (isVisible) {
      initializeSelection()
    }
  },
  { immediate: true }
)

const formatMetric = (row, value) => {
  if (value == null) {
    return 'Not available'
  }

  if (row.unit === 'percent') {
    return `${formatNumber(value, 1)}%`
  }

  const prefix = row.unit === 'signed-contacts' && value > 0 ? '+' : ''
  return `${prefix}${formatNumber(value, 1)} contacts/day`
}

const formatDelta = (row) => {
  if (row.delta == null) {
    return 'Not available'
  }

  const prefix = row.delta > 0 ? '+' : ''
  const suffix = row.unit === 'percent' ? ' pts' : ' contacts/day'
  return `${prefix}${formatNumber(row.delta, 1)}${suffix}`
}

const handleClose = () => {
  visible.value = false
  emit('close')
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    title="Compare Saved Forecasts"
    kicker="Holdout evidence"
    description="Compare two saved model configurations only when both were scored against the same dated actual contacts."
    max-width="max-w-6xl"
    allow-backdrop-close
    @close="emit('close')"
  >
    <AppEmptyState
      v-if="eligibleProjects.length < 2"
      title="Two scored forecasts required"
      description="Save and run at least two modeled daily forecasts with a holdout period to compare candidates."
    />

    <div v-else class="grid gap-5">
      <div class="grid gap-4 lg:grid-cols-2">
        <AppFieldGroup
          label="Reference forecast"
          input-id="forecast-comparison-reference"
          help-text="Metric deltas use this saved run as the baseline."
        >
          <AppSelect
            id="forecast-comparison-reference"
            v-model="referenceId"
            :options="projectOptions"
            autofocus
          />
        </AppFieldGroup>

        <AppFieldGroup
          label="Candidate forecast"
          input-id="forecast-comparison-candidate"
          help-text="Choose a different saved model configuration for the same holdout."
        >
          <AppSelect
            id="forecast-comparison-candidate"
            v-model="candidateId"
            :options="projectOptions"
          />
        </AppFieldGroup>
      </div>

      <AppStatusMessage v-if="comparison.status !== 'comparable'">
        {{ comparison.message }}
      </AppStatusMessage>

      <template v-else>
        <AppStatusMessage>
          {{ comparison.summary }} {{ comparison.decisionNote }}
        </AppStatusMessage>

        <div class="flex flex-wrap gap-x-6 gap-y-2 border-y border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span><strong class="font-semibold text-slate-950">Scored days:</strong> {{ comparison.testRows }}</span>
          <span><strong class="font-semibold text-slate-950">Test period:</strong> {{ comparison.testDateRange }}</span>
          <span>Identical dated actual contacts verified.</span>
        </div>

        <section class="grid gap-3" aria-labelledby="forecast-candidate-metrics-heading">
          <div class="grid gap-1">
            <h3 id="forecast-candidate-metrics-heading" class="text-base font-semibold text-slate-950">
              Accuracy evidence
            </h3>
            <p class="text-sm text-slate-600">
              Delta is candidate minus reference. Bias should be judged by distance from zero, not by the delta sign alone.
            </p>
          </div>

          <AppTableShell>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[900px] border-collapse text-sm">
                <thead class="bg-slate-50 text-left text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th scope="col" class="px-4 py-2.5">Measure</th>
                    <th scope="col" class="px-4 py-2.5 text-right">{{ comparison.referenceName }}</th>
                    <th scope="col" class="px-4 py-2.5 text-right">{{ comparison.candidateName }}</th>
                    <th scope="col" class="px-4 py-2.5 text-right">Delta</th>
                    <th scope="col" class="px-4 py-2.5">How to read it</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  <tr v-for="row in comparison.metricRows" :key="row.id">
                    <th scope="row" class="px-4 py-2.5 text-left font-medium text-slate-800">{{ row.label }}</th>
                    <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ formatMetric(row, row.referenceValue) }}</td>
                    <td class="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-950">{{ formatMetric(row, row.candidateValue) }}</td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ formatDelta(row) }}</td>
                    <td class="max-w-[25rem] px-4 py-2.5 leading-5 text-slate-600">{{ row.interpretation }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AppTableShell>
        </section>

        <section class="grid gap-3" aria-labelledby="forecast-candidate-settings-heading">
          <div class="grid gap-1">
            <h3 id="forecast-candidate-settings-heading" class="text-base font-semibold text-slate-950">
              Configuration evidence
            </h3>
            <p class="text-sm text-slate-600">
              Changed settings are named explicitly; unchanged rows remain visible for review context.
            </p>
          </div>

          <AppTableShell>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[720px] border-collapse text-sm">
                <thead class="bg-slate-50 text-left text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th scope="col" class="px-4 py-2.5">Setting</th>
                    <th scope="col" class="px-4 py-2.5">{{ comparison.referenceName }}</th>
                    <th scope="col" class="px-4 py-2.5">{{ comparison.candidateName }}</th>
                    <th scope="col" class="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  <tr v-for="row in comparison.settingRows" :key="row.id">
                    <th scope="row" class="px-4 py-2.5 text-left font-medium text-slate-800">{{ row.label }}</th>
                    <td class="px-4 py-2.5 text-slate-700">{{ row.referenceValue }}</td>
                    <td class="px-4 py-2.5 font-medium text-slate-950">{{ row.candidateValue }}</td>
                    <td class="px-4 py-2.5 text-slate-600">{{ row.changed ? 'Changed' : 'Same' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AppTableShell>
        </section>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-end border-t border-slate-200 pt-5">
        <AppButton variant="secondary" @click="handleClose">Close</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
