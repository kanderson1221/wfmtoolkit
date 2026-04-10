<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppOptionPills from '../ui/AppOptionPills.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'
import { getForecastTypeLabel } from '../../forecasting/shared'
import { DEMAND_SOURCE_MANUAL, DEMAND_SOURCE_OPTIONS } from '../../planner/demandSources'

const props = defineProps({
  monthlyRecords: {
    type: Array,
    required: true
  },
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
  forecastCanApply: {
    type: Boolean,
    default: false
  },
  forecastWorkspaceHref: {
    type: String,
    default: ''
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

const emit = defineEmits(['apply-forecast'])

const planMonths = defineModel('planMonths', {
  type: Array,
  default: null
})

const demandSource = defineModel('demandSource', {
  type: Object,
  required: true
})

const selectedForecastProjectId = defineModel('selectedForecastProjectId', {
  type: String,
  default: ''
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const entryMode = defineModel('entryMode', {
  type: String,
  default: DEMAND_SOURCE_MANUAL
})

const hasForecastChoices = computed(() => props.forecastSelectOptions.length > 1)
const hasSavedForecastProjects = computed(() => props.savedForecastProjectCount > 0)
const hasAppliedForecast = computed(() =>
  Array.isArray(demandSource.value?.forecastMonthSnapshot) && demandSource.value.forecastMonthSnapshot.length > 0
)
const appliedForecastMatchesSelection = computed(() => demandSource.value?.forecastProjectId === selectedForecastProjectId.value)
const selectedForecastHasCoverage = computed(() => (props.selectedForecastPreviewSummary?.matchedMonthCount || 0) > 0)

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
      label: 'Type',
      value: getForecastTypeLabel(props.selectedForecastPreviewSummary.forecastType)
    },
    {
      label: 'Coverage',
      value: props.selectedForecastPreviewSummary.coverageLabel || '0/12 months'
    },
    {
      label: 'Planning Window',
      value: props.selectedForecastPreviewSummary.coverageWindowLabel || '—'
    },
    {
      label: 'Forecast Contacts',
      value: props.formatWhole(props.selectedForecastPreviewSummary.totalContacts)
    },
    {
      label: 'Last Run',
      value: formatDateTime(props.selectedForecastPreviewSummary.runAt)
    }
  ]
})

const selectedForecastSummaryLine = computed(() => {
  if (!props.selectedForecastPreviewSummary) {
    return ''
  }

  return [
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

const appliedForecastStatusLine = computed(() => {
  if (!props.currentDemandSourceSummary || !hasAppliedForecast.value) {
    return ''
  }

  return demandSource.value?.importedAt
    ? `Applied to this plan ${formatDateTime(demandSource.value.importedAt)}`
    : 'Applied to this plan'
})

const manualSummaryItems = computed(() => {
  const contactsByMonth = Array.isArray(planMonths.value) ? planMonths.value : []
  const annualContacts = contactsByMonth.reduce((sum, month) => sum + Number(month?.contacts || 0), 0)
  const peakMonth = contactsByMonth.reduce(
    (currentPeak, month, index) => (
      Number(month?.contacts || 0) > Number(currentPeak?.contacts || -1)
        ? {
            contacts: Number(month?.contacts || 0),
            label: props.monthlyRecords[index]?.fullLabel || props.monthlyRecords[index]?.label || '—'
          }
        : currentPeak
    ),
    null
  )
  const totalBusinessDays = props.monthlyRecords.reduce((sum, month) => sum + Number(month?.openDays || 0), 0)

  return [
    {
      label: 'Annual Contacts',
      value: props.formatWhole(annualContacts)
    },
    {
      label: 'Peak Month',
      value: peakMonth?.label || '—'
    },
    {
      label: 'Peak Month Contacts',
      value: props.formatWhole(peakMonth?.contacts || 0)
    },
    {
      label: 'Business Days',
      value: props.formatWhole(totalBusinessDays)
    }
  ]
})

const manualRows = computed(() =>
  props.monthlyRecords.map((record) => {
    const contacts = Number(planMonths.value?.[record.monthIndex]?.contacts || 0)
    const openDays = Number(record.openDays || 0)

    return {
      ...record,
      contacts,
      averageOpenDayContacts: openDays > 0 ? contacts / openDays : 0
    }
  })
)

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}
</script>

<template>
  <section class="grid gap-3">
    <AppSectionHeader title="Forecast" />

    <AppWorkspaceSection
      title="Demand Source"
      description="Choose how this plan gets monthly contacts. Demand Model will use these contacts as read-only inputs."
    >
      <AppOptionPills
        v-model="entryMode"
        aria-label="Demand source choice"
        :items="DEMAND_SOURCE_OPTIONS"
      />

      <template v-if="entryMode === DEMAND_SOURCE_MANUAL">
        <AppStatusMessage>
          Manual monthly contacts are maintained here. Demand Model will use these contact values as read-only inputs while AHT remains editable there.
        </AppStatusMessage>

        <AppStatStrip :items="manualSummaryItems" columns="md:grid-cols-2 xl:grid-cols-4" />

        <section class="grid gap-3">
          <AppSectionHeader title="Monthly Contact Volume" />

          <div class="assumption-table-shell">
            <table class="assumption-table assumption-table-plan">
              <colgroup>
                <col class="plan-col-month" />
                <col class="plan-col-input plan-col-input-contacts" />
                <col class="plan-col-value" />
                <col class="plan-col-value" />
              </colgroup>
              <thead>
                <tr>
                  <th title="Planning month. Click a month name to highlight that row.">Month</th>
                  <th title="Monthly contact demand that will feed Demand Model.">Contacts</th>
                  <th title="Business days flowing in from the call-center operating days and holiday closures.">
                    <span class="plan-head-label">Business<br />Days</span>
                  </th>
                  <th title="Average contacts per open business day based on the monthly total entered here.">
                    <span class="plan-head-label">Avg / Open<br />Day</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="record in manualRows"
                  :key="record.label"
                  :class="{ selected: selectedMonthIndex === record.monthIndex }"
                >
                  <td class="month-cell">
                    <button
                      type="button"
                      class="assumption-month-btn"
                      :title="record.fullLabel"
                      @click="setSelectedMonth(record.monthIndex)"
                    >
                      {{ record.label }}
                    </button>
                  </td>
                  <td>
                    <AppTableNumberField
                      v-model.number="planMonths[record.monthIndex].contacts"
                      :min="0"
                      :step="100"
                      aria-label="Monthly contacts"
                    />
                  </td>
                  <td>{{ props.formatWhole(record.openDays) }}</td>
                  <td>{{ props.formatWhole(record.averageOpenDayContacts) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div class="flex flex-wrap justify-end gap-2">
          <AppButton
            v-if="props.forecastWorkspaceHref"
            variant="secondary"
            :href="props.forecastWorkspaceHref"
          >
            Open Staffing Group Forecasts
          </AppButton>
        </div>
      </template>

      <template v-else>
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
            ? 'A saved forecast exists, but it needs a completed forecast run before its monthly rollup can be used here.'
            : 'Open the staffing-group forecast workspace to create and save a forecast first, then return here to apply its monthly contacts to the plan.'"
        >
          <AppButton
            v-if="props.forecastWorkspaceHref"
            variant="secondary"
            :href="props.forecastWorkspaceHref"
          >
            Open Staffing Group Forecasts
          </AppButton>
        </AppEmptyState>

        <template v-else>
          <div class="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
            <AppFieldGroup
              label="Saved Forecast"
              input-id="planner-demand-source-forecast"
              help-text="Choose a saved forecast and apply its monthly contacts into this plan year."
            >
              <AppSelect
                id="planner-demand-source-forecast"
                v-model="selectedForecastProjectId"
                :options="props.forecastSelectOptions"
              />
            </AppFieldGroup>

            <div class="grid gap-3">
              <AppStatusMessage v-if="!selectedForecastProjectId">
                Select a saved forecast to preview its coverage for this plan year.
              </AppStatusMessage>

              <AppStatusMessage
                v-else-if="props.selectedForecastPreviewSummary && !selectedForecastHasCoverage"
                tone="error"
              >
                The selected forecast does not include monthly rollup rows for this plan year.
              </AppStatusMessage>

              <div
                v-else-if="props.selectedForecastPreviewSummary"
                class="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50/80 p-4"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-semibold tracking-[-0.03em] text-slate-950">
                    {{ props.selectedForecastPreviewSummary.projectName }}
                  </h3>
                  <span
                    v-if="props.currentDemandSourceSummary && hasAppliedForecast && appliedForecastMatchesSelection"
                    class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-emerald-700"
                  >
                    Applied
                  </span>
                </div>

                <p class="text-sm leading-6 text-slate-600">
                  {{ selectedForecastSummaryLine }}
                </p>

                <p
                  v-if="props.currentDemandSourceSummary && hasAppliedForecast"
                  class="text-sm leading-6 text-slate-600"
                >
                  {{
                    appliedForecastMatchesSelection
                      ? appliedForecastStatusLine
                      : `${props.currentDemandSourceSummary.projectName} is still applied. Reapply to replace it with the selected forecast.`
                  }}
                </p>

                <AppStatStrip
                  v-if="selectedForecastItems.length"
                  :items="selectedForecastItems"
                  columns="md:grid-cols-2 xl:grid-cols-4"
                />
              </div>
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <AppButton
              variant="secondary"
              :disabled="!props.forecastCanApply"
              @click="emit('apply-forecast')"
            >
              {{ hasAppliedForecast ? 'Reapply Forecast to Contacts' : 'Apply Forecast to Contacts' }}
            </AppButton>
            <AppButton
              v-if="props.forecastWorkspaceHref"
              variant="quiet"
              :href="props.forecastWorkspaceHref"
            >
              Open Staffing Group Forecasts
            </AppButton>
          </div>
        </template>
      </template>
    </AppWorkspaceSection>
  </section>
</template>
