<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'
import { formatNumber, getForecastTypeLabel } from '../../forecasting/shared'

const props = defineProps({
  forecastSelectOptions: {
    type: Array,
    default: () => []
  },
  savedForecastProjectCount: {
    type: Number,
    default: 0
  },
  forecastsLoading: {
    type: Boolean,
    default: false
  },
  forecastsError: {
    type: String,
    default: ''
  },
  selectedForecastPreviewSummary: {
    type: Object,
    default: null
  },
  currentDemandSourceSummary: {
    type: Object,
    default: null
  },
  hasLegacyManualDemandSource: {
    type: Boolean,
    default: false
  },
  legacyManualSummary: {
    type: Object,
    default: null
  },
  forecastCanApply: {
    type: Boolean,
    default: false
  },
  forecastApplyMessage: {
    type: String,
    default: ''
  },
  forecastApplyTone: {
    type: String,
    default: 'success'
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

const emit = defineEmits(['apply-forecast', 'convert-legacy-manual-demand-source'])

const demandSource = defineModel('demandSource', {
  type: Object,
  required: true
})

const selectedForecastProjectId = defineModel('selectedForecastProjectId', {
  type: String,
  default: ''
})

const hasForecastChoices = computed(() => props.forecastSelectOptions.length > 1)
const hasSavedForecastProjects = computed(() => props.savedForecastProjectCount > 0)
const hasAppliedForecast = computed(() =>
  Array.isArray(demandSource.value?.forecastMonthSnapshot) && demandSource.value.forecastMonthSnapshot.length > 0
)
const appliedForecastMatchesSelection = computed(() => demandSource.value?.forecastProjectId === selectedForecastProjectId.value)
const selectedForecastHasCoverage = computed(() => (props.selectedForecastPreviewSummary?.matchedMonthCount || 0) > 0)
const shouldShowSelectedForecastPreview = computed(() =>
  Boolean(props.selectedForecastPreviewSummary) &&
  (!hasAppliedForecast.value || !appliedForecastMatchesSelection.value)
)

const formatDateTime = (value) => {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed)
}

const selectedForecastItems = computed(() => {
  if (!props.selectedForecastPreviewSummary) {
    return []
  }

  return [
    {
      label: 'Source',
      value: props.selectedForecastPreviewSummary.sourceKindLabel || 'Modeled'
    },
    {
      label: 'Type',
      value: getForecastTypeLabel(props.selectedForecastPreviewSummary.forecastType)
    },
    {
      label: 'Coverage',
      value: props.selectedForecastPreviewSummary.coverageLabel || '0/12 months'
    },
    {
      label: 'Forecast Contacts',
      value: props.formatWhole(props.selectedForecastPreviewSummary.totalContacts)
    },
    {
      label: 'Assumed Avg AHT',
      value: props.selectedForecastPreviewSummary.averageAhtSeconds != null
        ? `${formatNumber(props.selectedForecastPreviewSummary.averageAhtSeconds, 1)} sec`
        : '—'
    }
  ]
})

const selectedForecastSummaryLine = computed(() => {
  if (!props.selectedForecastPreviewSummary) {
    return ''
  }

  return [
    props.selectedForecastPreviewSummary.sourceKindLabel || '',
    getForecastTypeLabel(props.selectedForecastPreviewSummary.forecastType),
    props.selectedForecastPreviewSummary.coverageLabel || '0/12 months',
    props.selectedForecastPreviewSummary.coverageWindowLabel || '',
    `${props.formatWhole(props.selectedForecastPreviewSummary.totalContacts)} contacts`,
    props.selectedForecastPreviewSummary.peakMonthLabel
      ? `Peak ${props.selectedForecastPreviewSummary.peakMonthLabel}`
      : '',
    props.selectedForecastPreviewSummary.runAt
      ? `Ran ${formatDateTime(props.selectedForecastPreviewSummary.runAt)}`
      : ''
  ].filter(Boolean).join(' • ')
})

const appliedForecastItems = computed(() => {
  if (!props.currentDemandSourceSummary || !hasAppliedForecast.value) {
    return []
  }

  return [
    {
      label: 'Source',
      value: props.currentDemandSourceSummary.sourceKindLabel || 'Saved Forecast'
    },
    {
      label: 'Type',
      value: getForecastTypeLabel(props.currentDemandSourceSummary.forecastType)
    },
    {
      label: 'Coverage',
      value: props.currentDemandSourceSummary.coverageLabel || '0/12 months'
    },
    {
      label: 'Forecast Contacts',
      value: props.formatWhole(props.currentDemandSourceSummary.totalContacts)
    },
    {
      label: 'Assumed Avg AHT',
      value: props.currentDemandSourceSummary.averageAhtSeconds != null
        ? `${formatNumber(props.currentDemandSourceSummary.averageAhtSeconds, 1)} sec`
        : '—'
    }
  ]
})

const appliedForecastSummaryLine = computed(() => {
  if (!props.currentDemandSourceSummary || !hasAppliedForecast.value) {
    return ''
  }

  return [
    props.currentDemandSourceSummary.sourceKindLabel || '',
    getForecastTypeLabel(props.currentDemandSourceSummary.forecastType),
    props.currentDemandSourceSummary.coverageLabel || '0/12 months',
    props.currentDemandSourceSummary.coverageWindowLabel || '',
    `${props.formatWhole(props.currentDemandSourceSummary.totalContacts)} contacts`,
    props.currentDemandSourceSummary.peakMonthLabel
      ? `Peak ${props.currentDemandSourceSummary.peakMonthLabel}`
      : '',
    props.currentDemandSourceSummary.runAt
      ? `Ran ${formatDateTime(props.currentDemandSourceSummary.runAt)}`
      : ''
  ].filter(Boolean).join(' • ')
})

const appliedForecastStatusLine = computed(() => {
  if (!props.currentDemandSourceSummary || !hasAppliedForecast.value) {
    return ''
  }

  return demandSource.value?.importedAt
    ? `Applied to this plan ${formatDateTime(demandSource.value.importedAt)}`
    : 'Applied to this plan'
})

const deletedForecastNote = computed(() => {
  if (!props.currentDemandSourceSummary?.sourceMissing || !hasAppliedForecast.value) {
    return ''
  }

  return `${props.currentDemandSourceSummary.projectName || 'The applied forecast'} was deleted. Current monthly contacts and any imported AHT assumptions remain in this plan until you apply a different forecast.`
})

const selectForecastPrompt = computed(() =>
  hasAppliedForecast.value
    ? 'Select another saved forecast to preview and replace the currently applied source.'
    : 'Select a saved forecast to preview its coverage for this plan year.'
)
</script>

<template>
  <section class="grid gap-3">
    <AppSectionHeader title="Forecast" />

    <AppWorkspaceSection
      title="Demand Source"
      description="Review the forecast currently applied to this plan, or choose another saved staffing-group forecast to replace monthly contacts and starting AHT assumptions."
    >
      <template v-if="props.hasLegacyManualDemandSource">
        <div class="grid gap-4">
          <AppStatusMessage tone="warning">
            This plan still uses legacy manual monthly contacts. Convert them into a saved staffing-group monthly forecast to keep demand sourcing in one place.
          </AppStatusMessage>

          <div class="grid gap-2 border-t border-slate-200 pt-4">
            <p class="text-sm text-slate-600">
              {{ props.formatWhole(props.legacyManualSummary?.totalContacts || 0) }} contacts across
              {{ props.formatWhole(props.legacyManualSummary?.monthCount || 0) }} months will be saved as a monthly forecast artifact.
            </p>

            <div class="flex justify-end">
              <AppButton variant="secondary" @click="emit('convert-legacy-manual-demand-source')">
                Convert to Saved Forecast
              </AppButton>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div
          v-if="props.currentDemandSourceSummary && hasAppliedForecast"
          class="mb-4 grid gap-3 border border-[#c3d2df] bg-[#f8fbfd] px-4 py-3"
        >
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="grid gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#15395f]">
                  Currently Applied
                </p>
                <span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  Applied
                </span>
                <span
                  v-if="props.currentDemandSourceSummary.sourceMissing"
                  class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-amber-700"
                >
                  Source Deleted
                </span>
              </div>

              <h3 class="text-base font-semibold text-slate-950">
                {{ props.currentDemandSourceSummary.projectName || 'Saved Forecast' }}
              </h3>

              <p
                v-if="appliedForecastSummaryLine"
                class="text-sm leading-6 text-slate-600"
              >
                {{ appliedForecastSummaryLine }}
              </p>

              <p class="text-sm leading-6 text-slate-600">
                {{ appliedForecastStatusLine }}
              </p>
            </div>
          </div>

          <p
            v-if="deletedForecastNote"
            class="text-sm leading-6 text-amber-700"
          >
            {{ deletedForecastNote }}
          </p>

          <div
            v-if="appliedForecastItems.length"
            class="grid gap-0 overflow-hidden border-t border-slate-200 md:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-slate-200"
          >
            <div
              v-for="item in appliedForecastItems"
              :key="item.label"
              class="grid gap-1 py-3 md:px-4 md:first:pl-0"
            >
              <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {{ item.label }}
              </p>
              <p class="text-base font-semibold text-slate-950">
                {{ item.value }}
              </p>
            </div>
          </div>
        </div>

        <AppStatusMessage v-if="props.forecastsLoading">
          Loading saved forecasts for this staffing group.
        </AppStatusMessage>

        <AppStatusMessage v-else-if="props.forecastsError" tone="error">
          {{ props.forecastsError }}
        </AppStatusMessage>

        <AppEmptyState
          v-else-if="!hasForecastChoices"
          :title="hasSavedForecastProjects ? 'No completed forecasts available' : 'No saved forecasts available'"
          :description="hasSavedForecastProjects
            ? 'A saved forecast exists, but it needs a completed monthly rollup before it can be applied here.'
            : 'Create and save a staffing-group forecast first, then return here to apply it to the plan.'"
        />

        <template v-else>
          <div class="grid gap-4">
            <div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div class="w-full xl:max-w-[19rem]">
                <AppFieldGroup
                  label="Replace Forecast"
                  input-id="planner-demand-source-forecast"
                >
                  <AppSelect
                    id="planner-demand-source-forecast"
                    v-model="selectedForecastProjectId"
                    :options="props.forecastSelectOptions"
                  />
                </AppFieldGroup>
              </div>

              <div class="flex justify-end">
                <AppButton
                  variant="primary"
                  :disabled="!props.forecastCanApply"
                  @click="emit('apply-forecast')"
                >
                  {{ hasAppliedForecast ? 'Reapply Forecast to Contacts & AHT' : 'Apply Forecast to Contacts & AHT' }}
                </AppButton>
              </div>
            </div>

            <AppStatusMessage v-if="!selectedForecastProjectId">
              {{ selectForecastPrompt }}
            </AppStatusMessage>

            <AppStatusMessage
              v-else-if="props.forecastApplyMessage"
              :tone="props.forecastApplyTone"
            >
              {{ props.forecastApplyMessage }}
            </AppStatusMessage>

            <AppStatusMessage
              v-else-if="shouldShowSelectedForecastPreview && !selectedForecastHasCoverage"
              tone="error"
            >
              The selected forecast does not include monthly rollup rows for this plan year.
            </AppStatusMessage>

            <div
              v-else-if="shouldShowSelectedForecastPreview"
              class="grid gap-3 border-t border-slate-200 pt-4"
            >
              <div class="grid gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-semibold tracking-[-0.03em] text-slate-950">
                    {{ props.selectedForecastPreviewSummary.projectName }}
                  </h3>
                </div>

                <p class="text-sm leading-6 text-slate-600">
                  {{ selectedForecastSummaryLine }}
                </p>

                <p
                  v-if="props.currentDemandSourceSummary && hasAppliedForecast && !appliedForecastMatchesSelection"
                  class="text-sm leading-6 text-slate-600"
                >
                  {{ props.currentDemandSourceSummary.projectName }} is still applied. Reapply to replace it with the selected forecast.
                </p>
              </div>

              <div
                v-if="selectedForecastItems.length"
                class="grid gap-0 overflow-hidden border-t border-slate-200 lg:grid-cols-5 lg:divide-x lg:divide-slate-200"
              >
                <div
                  v-for="item in selectedForecastItems"
                  :key="item.label"
                  class="grid gap-1 py-3 lg:px-5 lg:first:pl-0"
                >
                  <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {{ item.label }}
                  </p>
                  <p class="text-base font-semibold tracking-[-0.02em] text-slate-950">
                    {{ item.value }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </AppWorkspaceSection>
  </section>
</template>
