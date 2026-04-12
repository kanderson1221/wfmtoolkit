<script setup>
import { computed } from 'vue'

import ForecastingConfigSection from './ForecastingConfigSection.vue'
import ForecastHistoricalDataSection from './ForecastHistoricalDataSection.vue'
import AppButton from '../ui/AppButton.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppInsetPanel from '../ui/AppInsetPanel.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppOptionPills from '../ui/AppOptionPills.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTextField from '../ui/AppTextField.vue'
import AppTextArea from '../ui/AppTextArea.vue'
import AppToggleSwitch from '../ui/AppToggleSwitch.vue'
import {
  FORECAST_TYPE_OPTIONS,
  FORECAST_TYPE_REFORECAST,
  getForecastPlanningYear,
  isPlanAlignedForecast,
  resolveForecastCoverageWindow
} from '../../forecasting/shared'

const props = defineProps({
  workflowStep: {
    type: String,
    default: 'data'
  },
  validationMessages: {
    type: Array,
    default: () => []
  },
  runError: {
    type: String,
    default: ''
  },
  saveError: {
    type: String,
    default: ''
  },
  isRunningForecast: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'file-select',
  'run-forecast',
  'add-custom-seasonality',
  'remove-custom-seasonality',
  'add-custom-holiday',
  'remove-custom-holiday',
  'request-step-change'
])

const project = defineModel('project', {
  type: Object,
  required: true
})

const growthOptions = [
  { label: 'Steady growth', value: 'linear' },
  { label: 'Growth with ceiling', value: 'logistic' },
  { label: 'Flat trend', value: 'flat' }
]

const seasonalityModeOptions = [
  { label: 'Patterns stay the same size', value: 'additive' },
  { label: 'Patterns grow with volume', value: 'multiplicative' }
]

const forecastHorizonPresetOptions = [
  { id: '30', label: '30 Days' },
  { id: '90', label: '90 Days' },
  { id: '180', label: '180 Days' },
  { id: '365', label: '365 Days' },
  { id: 'custom', label: 'Custom' }
]

const holidayCalendarOptions = [
  { label: 'No holiday calendar', value: '' },
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Australia', value: 'AU' }
]

const holidayCountryLabels = Object.fromEntries(
  holidayCalendarOptions.map((option) => [option.value, option.label])
)

const isDataStep = computed(() => props.workflowStep === 'data')
const isSetupStep = computed(() => props.workflowStep === 'setup')
const usesCenterManagedHolidays = computed(() => Boolean(project.value.centerManagedHolidays))
const isPlanAligned = computed(() => isPlanAlignedForecast(project.value))
const planningYear = computed(() => getForecastPlanningYear(project.value))
const planAlignedCoverageWindow = computed(() =>
  resolveForecastCoverageWindow({
    planningYear: planningYear.value,
    forecastType: project.value.forecastType,
    coverageStartMonthIndex: project.value.coverageStartMonthIndex
  })
)
const reforecastStartMonthOptions = computed(() =>
  Array.from({ length: 12 }, (_, monthIndex) => ({
    label: `${planAlignedCoverageWindow.value.planningYear || planningYear.value || 'Plan'} ${new Intl.DateTimeFormat('en-US', {
      month: 'long'
    }).format(new Date(2026, monthIndex, 1))}`,
    value: monthIndex
  }))
)

const columnOptions = computed(() => [
  { label: 'Not mapped', value: '' },
  ...project.value.uploadedHeaders.map((header) => ({
    label: header,
    value: header
  }))
])

const historyRowCount = computed(() =>
  Array.isArray(project.value.historyRows) ? project.value.historyRows.length : 0
)

const hasLoadedFile = computed(() => Boolean(project.value.uploadedFileName))
const holdoutDays = computed(() => Math.max(0, Number(project.value.modelConfig.holdoutDays) || 0))
const trainingRowCount = computed(() => Math.max(historyRowCount.value - holdoutDays.value, 0))

const holdoutIsValid = computed(() =>
  historyRowCount.value === 0 || holdoutDays.value === 0 || trainingRowCount.value >= 14
)

const holdoutSummary = computed(() => {
  if (!historyRowCount.value) {
    return 'Load history first, then choose how many trailing days to compare against actuals.'
  }

  if (holdoutDays.value === 0) {
    return `Train on all ${historyRowCount.value} daily rows. No test set will be scored.`
  }

  if (!holdoutIsValid.value) {
    return 'Use fewer test-set days so at least 14 training days remain.'
  }

  return `Train on the first ${trainingRowCount.value} daily rows and compare the last ${holdoutDays.value} rows to actuals.`
})
const intervalWidthPercent = computed({
  get: () => {
    const intervalWidth = Number(project.value.modelConfig.intervalWidth)
    return Number.isFinite(intervalWidth) ? Math.round(intervalWidth * 100) : 80
  },
  set: (value) => {
    const percent = Number(value)
    project.value.modelConfig.intervalWidth = Number.isFinite(percent)
      ? Math.max(10, Math.min(99, percent)) / 100
      : 0.8
  }
})

const shouldShowValidationErrors = computed(() =>
  props.validationMessages.length > 0 && hasLoadedFile.value
)

const runStatusMessage = computed(() => {
  if (!hasLoadedFile.value) {
    return 'Load a CSV to begin.'
  }

  if (shouldShowValidationErrors.value) {
    return ''
  }

  return isDataStep.value
    ? ''
    : 'Ready to run.'
})

const inheritedHolidaySummary = computed(() => {
  if (!usesCenterManagedHolidays.value) {
    return ''
  }

  const parts = []
  const builtInHolidayLabel = holidayCountryLabels[project.value.modelConfig.builtInHolidayCountry] || ''
  const customHolidayCount = Array.isArray(project.value.modelConfig.customHolidays)
    ? project.value.modelConfig.customHolidays.length
    : 0

  if (builtInHolidayLabel) {
    parts.push(`${builtInHolidayLabel} holiday calendar`)
  }

  if (customHolidayCount > 0) {
    parts.push(`${customHolidayCount} custom call center holiday${customHolidayCount === 1 ? '' : 's'}`)
  }

  return parts.length
    ? parts.join(' and ')
    : 'No holiday effects are configured at the call center.'
})

const inheritedHolidayList = computed(() =>
  Array.isArray(project.value.modelConfig.customHolidays)
    ? project.value.modelConfig.customHolidays
      .filter((holiday) => holiday?.name && holiday?.date)
      .map((holiday) => ({
        id: holiday.id,
        label: `${holiday.name} · ${holiday.date}`
      }))
    : []
)
</script>

<template>
  <div class="grid gap-4">
    <template v-if="isDataStep">
      <ForecastingConfigSection
        title="Historical Data"
        :framed="false"
      >
        <ForecastHistoricalDataSection
          v-model:project="project"
          :column-options="columnOptions"
          @file-select="emit('file-select', $event)"
        />
      </ForecastingConfigSection>
    </template>

    <template v-else-if="isSetupStep">
      <ForecastingConfigSection title="Forecast Setup">
        <div class="grid gap-5">
          <template v-if="isPlanAligned">
            <div class="grid gap-4 md:grid-cols-2">
              <AppFieldGroup
                label="Plan Year"
                input-id="forecast-planning-year"
              >
                <AppTextField
                  id="forecast-planning-year"
                  :model-value="planningYear ? String(planningYear) : ''"
                  readonly
                />
              </AppFieldGroup>

              <AppFieldGroup
                label="Forecast Type"
                input-id="forecast-type"
              >
                <AppSelect
                  id="forecast-type"
                  v-model="project.forecastType"
                  :options="FORECAST_TYPE_OPTIONS"
                />
              </AppFieldGroup>

              <AppFieldGroup
                v-if="project.forecastType === FORECAST_TYPE_REFORECAST"
                label="Reforecast Start Month"
                input-id="forecast-reforecast-start-month"
                class="md:col-span-2"
              >
                <AppSelect
                  id="forecast-reforecast-start-month"
                  v-model="project.coverageStartMonthIndex"
                  :options="reforecastStartMonthOptions"
                />
              </AppFieldGroup>
            </div>

            <AppInsetPanel tone="subtle" class="grid gap-2">
              <p class="text-sm font-semibold text-slate-950">Coverage Window</p>
              <p class="text-sm text-slate-600">
                {{ planAlignedCoverageWindow.coverageLabel || 'Plan year coverage will appear here.' }}
              </p>
              <p class="text-sm text-slate-500">
                Monthly rollup rows will be saved only for {{ planAlignedCoverageWindow.coverageMonthLabel || 'the selected planning window' }}.
              </p>
            </AppInsetPanel>
          </template>

          <AppFieldGroup
            v-else
            label="Days To Forecast"
            input-id="forecast-horizon-custom"
          >
            <div class="grid gap-3">
              <AppOptionPills
                v-model="project.forecastHorizonPreset"
                aria-label="Forecast horizon presets"
                :items="forecastHorizonPresetOptions"
              />
              <AppNumberField
                id="forecast-horizon-custom"
                v-model="project.forecastHorizonDays"
                :min="1"
                :max="730"
                :step="1"
              />
            </div>
          </AppFieldGroup>

          <AppInsetPanel
            v-if="usesCenterManagedHolidays"
            tone="subtle"
            class="grid gap-3"
          >
            <div class="grid gap-1">
              <p class="text-sm font-semibold text-slate-950">Holiday Effects</p>
              <p class="text-sm text-slate-600">
                Uses {{ inheritedHolidaySummary }}.
              </p>
            </div>

            <div
              v-if="inheritedHolidayList.length"
              class="grid gap-1 text-sm text-slate-600"
            >
              <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Custom Holidays
              </p>
              <p
                v-for="holiday in inheritedHolidayList"
                :key="holiday.id"
                class="leading-6"
              >
                {{ holiday.label }}
              </p>
            </div>
          </AppInsetPanel>

          <AppFieldGroup
            v-else
            label="Holiday Effects"
            input-id="forecast-holiday-country"
          >
            <AppSelect
              id="forecast-holiday-country"
              v-model="project.modelConfig.builtInHolidayCountry"
              :options="holidayCalendarOptions"
            />
          </AppFieldGroup>

          <div class="divide-y divide-slate-200">
            <label for="forecast-config-weekly-toggle" class="flex items-center justify-between gap-4 py-3">
              <span class="text-sm font-medium text-slate-950">Weekly</span>
              <AppToggleSwitch
                input-id="forecast-config-weekly-toggle"
                aria-label="Toggle weekly seasonality"
                v-model="project.modelConfig.weeklySeasonalityEnabled"
              />
            </label>

            <label for="forecast-config-monthly-toggle" class="flex items-center justify-between gap-4 py-3">
              <span class="text-sm font-medium text-slate-950">Monthly</span>
              <AppToggleSwitch
                input-id="forecast-config-monthly-toggle"
                aria-label="Toggle monthly seasonality"
                v-model="project.modelConfig.monthlySeasonalityEnabled"
              />
            </label>

            <label for="forecast-config-yearly-toggle" class="flex items-center justify-between gap-4 py-3">
              <span class="text-sm font-medium text-slate-950">Yearly</span>
              <AppToggleSwitch
                input-id="forecast-config-yearly-toggle"
                aria-label="Toggle yearly seasonality"
                v-model="project.modelConfig.yearlySeasonalityEnabled"
              />
            </label>
          </div>
        </div>
      </ForecastingConfigSection>

      <ForecastingConfigSection title="Accuracy">
        <div class="grid gap-3">
          <div class="divide-y divide-slate-200">
            <div class="grid grid-cols-[minmax(0,1fr)_5.4rem] items-center gap-3 py-1.5">
              <label for="forecast-holdout-days" class="text-sm font-medium text-slate-950">
                Test Set Days
              </label>
              <div class="w-full">
                <AppNumberField
                  id="forecast-holdout-days"
                  v-model="project.modelConfig.holdoutDays"
                  :min="0"
                  :step="1"
                  compact
                  class="border-slate-200 bg-slate-50 text-right tabular-nums shadow-none focus:bg-white focus:ring-2"
                />
              </div>
            </div>

            <div class="grid grid-cols-[minmax(0,1fr)_5.4rem] items-center gap-3 py-1.5">
              <label for="forecast-interval-width" class="text-sm font-medium text-slate-950">
                Confidence
              </label>
              <div class="w-full">
                <AppNumberField
                  id="forecast-interval-width"
                  v-model="intervalWidthPercent"
                  :min="10"
                  :max="99"
                  :step="5"
                  suffix="%"
                  compact
                  class="border-slate-200 bg-slate-50 text-right tabular-nums shadow-none focus:bg-white focus:ring-2"
                />
              </div>
            </div>
          </div>

          <AppStatusMessage v-if="!holdoutIsValid" tone="error">
            {{ holdoutSummary }}
          </AppStatusMessage>
        </div>
      </ForecastingConfigSection>

      <ForecastingConfigSection title="Advanced">
        <div class="grid gap-6">
          <div class="grid gap-4">
            <h4 class="text-sm font-semibold text-slate-950">Model Tuning</h4>
            <div class="grid gap-4 md:grid-cols-2">
              <AppFieldGroup
                label="Trend Type"
                input-id="forecast-growth-mode"
                help-text="Most forecasts can stay on steady growth."
              >
                <AppSelect
                  id="forecast-growth-mode"
                  v-model="project.modelConfig.growth"
                  :options="growthOptions"
                />
              </AppFieldGroup>

              <AppFieldGroup
                label="Seasonality Type"
                input-id="forecast-seasonality-mode"
                help-text="Use additive unless patterns clearly grow as volume grows."
              >
                <AppSelect
                  id="forecast-seasonality-mode"
                  v-model="project.modelConfig.seasonalityMode"
                  :options="seasonalityModeOptions"
                />
              </AppFieldGroup>

              <AppFieldGroup label="Holiday Strength" input-id="forecast-holiday-prior">
                <AppNumberField
                  id="forecast-holiday-prior"
                  v-model="project.modelConfig.holidaysPriorScale"
                  :min="0.1"
                  :step="0.5"
                />
              </AppFieldGroup>

              <AppFieldGroup label="Trend Sensitivity" input-id="forecast-changepoint-prior">
                <AppNumberField
                  id="forecast-changepoint-prior"
                  v-model="project.modelConfig.changepointPriorScale"
                  :min="0.001"
                  :step="0.01"
                  :max-fraction-digits="3"
                />
              </AppFieldGroup>

              <AppFieldGroup label="Trend Change Window" input-id="forecast-changepoint-range">
                <AppNumberField
                  id="forecast-changepoint-range"
                  v-model="project.modelConfig.changepointRange"
                  :min="0.1"
                  :max="1"
                  :step="0.05"
                  :max-fraction-digits="2"
                />
              </AppFieldGroup>

              <AppFieldGroup label="Max Trend Changes" input-id="forecast-changepoint-count">
                <AppNumberField
                  id="forecast-changepoint-count"
                  v-model="project.modelConfig.changepointCount"
                  :min="0"
                  :step="1"
                />
              </AppFieldGroup>

              <template v-if="project.modelConfig.growth === 'logistic'">
                <AppFieldGroup
                  label="Lower Forecast Limit"
                  input-id="forecast-default-floor"
                  help-text="Default floor used for logistic growth unless a daily floor column is mapped from the file."
                >
                  <AppNumberField
                    id="forecast-default-floor"
                    v-model="project.modelConfig.defaultFloor"
                    :min="0"
                    :step="1"
                  />
                </AppFieldGroup>

                <AppFieldGroup
                  label="Upper Forecast Limit"
                  input-id="forecast-default-cap"
                  help-text="Default ceiling used for logistic growth unless a daily ceiling column is mapped from the file."
                >
                  <AppNumberField
                    id="forecast-default-cap"
                    v-model="project.modelConfig.defaultCap"
                    :min="0"
                    :step="1"
                  />
                </AppFieldGroup>
              </template>
            </div>

            <div class="divide-y divide-slate-200">
              <label for="forecast-workbench-weekly-toggle" class="flex items-center justify-between gap-4 py-3">
                <span class="text-sm font-medium text-slate-950">Weekly</span>
                <AppToggleSwitch
                  input-id="forecast-workbench-weekly-toggle"
                  aria-label="Toggle weekly seasonality"
                  v-model="project.modelConfig.weeklySeasonalityEnabled"
                />
              </label>

              <label for="forecast-workbench-monthly-toggle" class="flex items-center justify-between gap-4 py-3">
                <span class="text-sm font-medium text-slate-950">Monthly</span>
                <AppToggleSwitch
                  input-id="forecast-workbench-monthly-toggle"
                  aria-label="Toggle monthly seasonality"
                  v-model="project.modelConfig.monthlySeasonalityEnabled"
                />
              </label>

              <label for="forecast-workbench-yearly-toggle" class="flex items-center justify-between gap-4 py-3">
                <span class="text-sm font-medium text-slate-950">Yearly</span>
                <AppToggleSwitch
                  input-id="forecast-workbench-yearly-toggle"
                  aria-label="Toggle yearly seasonality"
                  v-model="project.modelConfig.yearlySeasonalityEnabled"
                />
              </label>
            </div>
          </div>

          <div class="grid gap-4">
            <h4 class="text-sm font-semibold text-slate-950">Expert Controls</h4>
            <div class="grid gap-4 md:grid-cols-2">
              <AppFieldGroup
                label="Sampling Runs"
                input-id="forecast-mcmc-samples"
                help-text="Leave this at zero unless you specifically need slower, sampling-based intervals."
              >
                <AppNumberField
                  id="forecast-mcmc-samples"
                  v-model="project.modelConfig.mcmcSamples"
                  :min="0"
                  :step="50"
                />
              </AppFieldGroup>

              <AppFieldGroup
                label="Manual Trend Change Dates"
                input-id="forecast-manual-changepoints"
                help-text="Use ISO dates separated by commas or new lines."
              >
                <AppTextArea
                  id="forecast-manual-changepoints"
                  v-model="project.modelConfig.manualChangepoints"
                  rows="3"
                />
              </AppFieldGroup>
            </div>

            <div class="grid gap-3">
              <div class="flex items-center justify-between gap-3">
                <h4 class="text-sm font-semibold text-slate-950">Custom Patterns</h4>
                <AppButton size="sm" variant="secondary" @click="emit('add-custom-seasonality')">Add Pattern</AppButton>
              </div>

              <AppInsetPanel
                v-if="!project.modelConfig.customSeasonalities.length"
                tone="dashed"
                class="text-sm text-slate-500"
              >
                No custom patterns configured.
              </AppInsetPanel>

              <div v-else class="grid gap-3">
                <AppInsetPanel
                  v-for="seasonality in project.modelConfig.customSeasonalities"
                  :key="seasonality.id"
                  class="grid gap-3"
                >
                  <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <AppFieldGroup label="Name" :input-id="`seasonality-name-${seasonality.id}`" compact>
                      <AppTextField :id="`seasonality-name-${seasonality.id}`" v-model.trim="seasonality.name" />
                    </AppFieldGroup>
                    <AppFieldGroup label="Cycle Length" :input-id="`seasonality-period-${seasonality.id}`" compact>
                      <AppNumberField :id="`seasonality-period-${seasonality.id}`" v-model="seasonality.periodDays" :min="1" :step="0.5" compact />
                    </AppFieldGroup>
                    <AppFieldGroup label="Detail" :input-id="`seasonality-fourier-${seasonality.id}`" compact>
                      <AppNumberField :id="`seasonality-fourier-${seasonality.id}`" v-model="seasonality.fourierOrder" :min="1" :step="1" compact />
                    </AppFieldGroup>
                    <AppFieldGroup label="Strength" :input-id="`seasonality-prior-${seasonality.id}`" compact>
                      <AppNumberField :id="`seasonality-prior-${seasonality.id}`" v-model="seasonality.priorScale" :min="0.1" :step="0.5" compact />
                    </AppFieldGroup>
                    <AppFieldGroup label="Seasonality Type" :input-id="`seasonality-mode-${seasonality.id}`" compact>
                      <AppSelect
                        :id="`seasonality-mode-${seasonality.id}`"
                        v-model="seasonality.mode"
                        :options="seasonalityModeOptions"
                        compact
                      />
                    </AppFieldGroup>
                  </div>

                  <div class="flex justify-end">
                    <AppButton size="sm" variant="quiet" @click="emit('remove-custom-seasonality', seasonality.id)">Remove</AppButton>
                  </div>
                </AppInsetPanel>
              </div>
            </div>

            <div class="grid gap-3">
              <div class="flex items-center justify-between gap-3">
                <h4 class="text-sm font-semibold text-slate-950">Custom Holidays</h4>
                <AppButton
                  v-if="!usesCenterManagedHolidays"
                  size="sm"
                  variant="secondary"
                  @click="emit('add-custom-holiday')"
                >
                  Add Holiday
                </AppButton>
              </div>

              <AppInsetPanel
                v-if="usesCenterManagedHolidays"
                tone="subtle"
                class="text-sm text-slate-600"
              >
                Custom holidays are managed at the call center level. Update the call center holiday profile if these dates need to change.
              </AppInsetPanel>

              <AppInsetPanel
                v-else-if="!project.modelConfig.customHolidays.length"
                tone="dashed"
                class="text-sm text-slate-500"
              >
                No custom holidays configured.
              </AppInsetPanel>

              <div v-else class="grid gap-3">
                <AppInsetPanel
                  v-for="holiday in project.modelConfig.customHolidays"
                  :key="holiday.id"
                  class="grid gap-3"
                >
                  <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <AppFieldGroup label="Name" :input-id="`holiday-name-${holiday.id}`" compact>
                      <AppTextField :id="`holiday-name-${holiday.id}`" v-model.trim="holiday.name" />
                    </AppFieldGroup>
                    <AppFieldGroup label="Date" :input-id="`holiday-date-${holiday.id}`" compact>
                      <AppTextField
                        :id="`holiday-date-${holiday.id}`"
                        v-model="holiday.date"
                        type="date"
                      />
                    </AppFieldGroup>
                    <AppFieldGroup label="Days Before" :input-id="`holiday-lower-${holiday.id}`" compact>
                      <AppNumberField :id="`holiday-lower-${holiday.id}`" v-model="holiday.lowerWindow" :step="1" compact />
                    </AppFieldGroup>
                    <AppFieldGroup label="Days After" :input-id="`holiday-upper-${holiday.id}`" compact>
                      <AppNumberField :id="`holiday-upper-${holiday.id}`" v-model="holiday.upperWindow" :step="1" compact />
                    </AppFieldGroup>
                    <AppFieldGroup label="Strength" :input-id="`holiday-prior-${holiday.id}`" compact>
                      <AppNumberField :id="`holiday-prior-${holiday.id}`" v-model="holiday.priorScale" :min="0.1" :step="0.5" compact />
                    </AppFieldGroup>
                  </div>

                  <div class="flex justify-end">
                    <AppButton size="sm" variant="quiet" @click="emit('remove-custom-holiday', holiday.id)">Remove</AppButton>
                  </div>
                </AppInsetPanel>
              </div>
            </div>

            <AppStatusMessage v-if="Number(project.modelConfig.mcmcSamples) > 0">
              Sampling runs can materially increase runtime. Leave this at zero unless you specifically need sampling-based intervals.
            </AppStatusMessage>
          </div>
        </div>
      </ForecastingConfigSection>
    </template>

    <div class="grid gap-3 border-t border-slate-200 pt-4">
      <AppStatusMessage v-if="props.runError" tone="error">
        {{ props.runError }}
      </AppStatusMessage>

      <div v-if="shouldShowValidationErrors" class="grid gap-2">
        <AppStatusMessage
          v-for="message in props.validationMessages"
          :key="message"
          tone="error"
        >
          {{ message }}
        </AppStatusMessage>
      </div>

      <p v-else-if="runStatusMessage" class="text-sm text-slate-500">
        {{ runStatusMessage }}
      </p>

      <div class="flex justify-end">
        <AppButton
          v-if="isDataStep"
          variant="primary"
          :disabled="!hasLoadedFile"
          @click="emit('request-step-change', 'workbench')"
        >
          Continue to Forecast Workbench
        </AppButton>
        <AppButton
          v-else-if="isSetupStep"
          variant="primary"
          :disabled="props.isRunningForecast"
          @click="emit('run-forecast')"
        >
          {{ props.isRunningForecast ? 'Running Forecast...' : 'Run Forecast' }}
        </AppButton>
      </div>
    </div>
  </div>
</template>
