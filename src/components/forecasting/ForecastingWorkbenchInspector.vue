<script setup>
import { computed, reactive } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppCheckbox from '../ui/AppCheckbox.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTextArea from '../ui/AppTextArea.vue'
import AppTextField from '../ui/AppTextField.vue'
import {
  FORECAST_HORIZON_PRESETS,
  FORECAST_TYPE_REFORECAST,
  GROWTH_OPTIONS,
  HOLIDAY_CALENDAR_OPTIONS,
  SEASONALITY_MODE_OPTIONS,
  getForecastPlanningYear,
  isPlanAlignedForecast,
  resolveForecastCoverageWindow
} from '../../forecasting/shared'

const props = defineProps({
  validationMessages: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'add-custom-seasonality',
  'remove-custom-seasonality',
  'add-custom-holiday',
  'remove-custom-holiday'
])

const project = defineModel('project', {
  type: Object,
  required: true
})

const expandedSections = reactive({
  scope: false,
  validation: true,
  seasonality: true,
  holidays: false,
  advanced: false
})

const holidayCountryLabels = Object.fromEntries(
  HOLIDAY_CALENDAR_OPTIONS.map((option) => [option.value, option.label])
)

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
const historyRowCount = computed(() =>
  Array.isArray(project.value.historyRows) ? project.value.historyRows.length : 0
)
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

const reforecastStartMonthOptions = computed(() =>
  Array.from({ length: 12 }, (_, monthIndex) => ({
    label: `${planAlignedCoverageWindow.value.planningYear || planningYear.value || 'Plan'} ${new Intl.DateTimeFormat('en-US', {
      month: 'long'
    }).format(new Date(2026, monthIndex, 1))}`,
    value: monthIndex
  }))
)
const showPlanAlignedScopeControls = computed(() =>
  isPlanAligned.value && project.value.forecastType === FORECAST_TYPE_REFORECAST
)
const inspectorSections = computed(() => {
  const sections = []

  if (!isPlanAligned.value || showPlanAlignedScopeControls.value) {
    sections.push({
      id: 'scope',
      title: showPlanAlignedScopeControls.value ? 'Reforecast Window' : 'Scope',
      description: showPlanAlignedScopeControls.value
        ? 'Adjust the starting month for this reforecast.'
        : 'Forecast horizon and project scope.'
    })
  }

  sections.push(
    {
      id: 'validation',
      title: 'Validation',
      description: 'Holdout scoring and confidence interval.'
    },
    {
      id: 'seasonality',
      title: 'Seasonality',
      description: 'Weekly, yearly, and custom patterns.'
    }
  )

  if (!usesCenterManagedHolidays.value) {
    sections.push({
      id: 'holidays',
      title: 'Holidays',
      description: 'Holiday calendar and custom event effects.'
    })
  }

  sections.push(
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Trend, priors, changepoints, and run notes.'
    }
  )

  return sections
})

const toggleSection = (sectionId) => {
  expandedSections[sectionId] = !expandedSections[sectionId]
}
</script>

<template>
  <div class="divide-y divide-[#d7e3ec]">
    <section
      v-for="section in inspectorSections"
      :key="section.id"
      class="grid gap-4 py-4 first:pt-0 last:pb-0"
    >
      <button
        type="button"
        class="flex w-full items-start justify-between gap-3 text-left transition hover:text-[#15395f]"
        @click="toggleSection(section.id)"
      >
        <div class="grid gap-1">
          <span class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {{ section.title }}
          </span>
          <strong class="text-[0.95rem] font-semibold text-slate-950">{{ section.description }}</strong>
        </div>
        <span class="pt-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {{ expandedSections[section.id] ? 'Hide' : 'Show' }}
        </span>
      </button>

      <div v-if="expandedSections[section.id]" class="grid gap-4">
        <div v-if="section.id === 'scope'" class="grid gap-4">
          <template v-if="showPlanAlignedScopeControls">
            <AppFieldGroup
              label="Reforecast Start Month"
              input-id="forecast-reforecast-start-month"
            >
              <AppSelect
                id="forecast-reforecast-start-month"
                v-model="project.coverageStartMonthIndex"
                :options="reforecastStartMonthOptions"
              />
            </AppFieldGroup>

            <div class="grid gap-1 border-l-2 border-[#d7e3ec] pl-3">
              <p class="text-sm font-semibold text-slate-950">Selected Coverage</p>
              <p class="text-sm leading-6 text-slate-600">
                {{ planAlignedCoverageWindow.coverageMonthLabel || 'Coverage window will appear here.' }}
              </p>
            </div>
          </template>

          <template v-else>
            <AppFieldGroup
              label="Days To Forecast"
              input-id="forecast-horizon-custom"
            >
              <div class="grid gap-3">
                <div class="flex flex-wrap gap-2">
                  <AppButton
                    v-for="preset in FORECAST_HORIZON_PRESETS"
                    :key="preset.id"
                    size="sm"
                    variant="tab"
                    :active="project.forecastHorizonPreset === preset.id"
                    @click="project.forecastHorizonPreset = preset.id"
                  >
                    {{ preset.label }}
                  </AppButton>
                </div>

                <AppNumberField
                  id="forecast-horizon-custom"
                  v-model="project.forecastHorizonDays"
                  :min="1"
                  :step="1"
                />
              </div>
            </AppFieldGroup>
          </template>
        </div>

        <div v-else-if="section.id === 'validation'" class="grid gap-4">
          <div class="grid gap-4 md:grid-cols-2">
            <AppFieldGroup
              label="Test Set Days"
              input-id="forecast-holdout-days"
            >
              <AppNumberField
                id="forecast-holdout-days"
                v-model="project.modelConfig.holdoutDays"
                :min="0"
                :step="1"
              />
            </AppFieldGroup>

            <AppFieldGroup label="Confidence Band" input-id="forecast-interval-width">
              <AppNumberField
                id="forecast-interval-width"
                v-model="project.modelConfig.intervalWidth"
                :min="0.1"
                :max="0.99"
                :step="0.05"
                :max-fraction-digits="2"
              />
            </AppFieldGroup>
          </div>

          <AppStatusMessage v-if="!holdoutIsValid" tone="error">
            {{ holdoutSummary }}
          </AppStatusMessage>

          <p v-else class="text-sm text-slate-600">
            {{ holdoutSummary }}
          </p>

          <div v-if="props.validationMessages.length" class="grid gap-2">
            <AppStatusMessage
              v-for="message in props.validationMessages"
              :key="message"
              tone="error"
            >
              {{ message }}
            </AppStatusMessage>
          </div>
        </div>

        <div v-else-if="section.id === 'seasonality'" class="grid gap-4">
          <AppFieldGroup
            label="Pattern Style"
            input-id="forecast-seasonality-mode"
            help-text="Use additive unless patterns clearly grow as volume grows."
          >
            <AppSelect
              id="forecast-seasonality-mode"
              v-model="project.modelConfig.seasonalityMode"
              :options="SEASONALITY_MODE_OPTIONS"
            />
          </AppFieldGroup>

          <div class="grid gap-4 divide-y divide-slate-200">
            <div class="grid gap-3">
              <AppCheckbox v-model="project.modelConfig.weeklySeasonalityEnabled">
                Use a weekly pattern
              </AppCheckbox>
              <p class="text-sm text-slate-600">
                Turn this on when weekdays behave differently from weekends.
              </p>
              <div
                v-if="project.modelConfig.weeklySeasonalityEnabled"
                class="grid gap-3 md:grid-cols-2"
              >
                <AppFieldGroup label="Weekly Detail" input-id="forecast-weekly-fourier" compact>
                  <AppNumberField
                    id="forecast-weekly-fourier"
                    v-model="project.modelConfig.weeklyFourierOrder"
                    :min="1"
                    :step="1"
                    compact
                  />
                </AppFieldGroup>
                <AppFieldGroup label="Weekly Strength" input-id="forecast-weekly-prior" compact>
                  <AppNumberField
                    id="forecast-weekly-prior"
                    v-model="project.modelConfig.weeklyPriorScale"
                    :min="0.1"
                    :step="0.5"
                    compact
                  />
                </AppFieldGroup>
              </div>
            </div>

            <div class="grid gap-3 pt-4">
              <AppCheckbox v-model="project.modelConfig.yearlySeasonalityEnabled">
                Use a yearly pattern
              </AppCheckbox>
              <p class="text-sm text-slate-600">
                Turn this on when months, seasons, or annual events repeat.
              </p>
              <div
                v-if="project.modelConfig.yearlySeasonalityEnabled"
                class="grid gap-3 md:grid-cols-2"
              >
                <AppFieldGroup label="Yearly Detail" input-id="forecast-yearly-fourier" compact>
                  <AppNumberField
                    id="forecast-yearly-fourier"
                    v-model="project.modelConfig.yearlyFourierOrder"
                    :min="1"
                    :step="1"
                    compact
                  />
                </AppFieldGroup>
                <AppFieldGroup label="Yearly Strength" input-id="forecast-yearly-prior" compact>
                  <AppNumberField
                    id="forecast-yearly-prior"
                    v-model="project.modelConfig.yearlyPriorScale"
                    :min="0.1"
                    :step="0.5"
                    compact
                  />
                </AppFieldGroup>
              </div>
            </div>
          </div>

          <div class="grid gap-3">
            <div class="flex items-center justify-between gap-3">
              <h4 class="text-sm font-semibold text-slate-950">Custom Patterns</h4>
              <AppButton size="sm" variant="secondary" @click="emit('add-custom-seasonality')">
                Add Pattern
              </AppButton>
            </div>

            <div
              v-if="!project.modelConfig.customSeasonalities.length"
              class="border-l-2 border-dashed border-slate-300 pl-3 text-sm text-slate-500"
            >
              No custom patterns configured.
            </div>

            <div v-else class="grid divide-y divide-slate-200">
              <article
                v-for="seasonality in project.modelConfig.customSeasonalities"
                :key="seasonality.id"
                class="grid gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div class="grid gap-3 md:grid-cols-2">
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
                  <AppFieldGroup label="Pattern Style" :input-id="`seasonality-mode-${seasonality.id}`" compact class="md:col-span-2">
                    <AppSelect
                      :id="`seasonality-mode-${seasonality.id}`"
                      v-model="seasonality.mode"
                      :options="SEASONALITY_MODE_OPTIONS"
                      compact
                    />
                  </AppFieldGroup>
                </div>

                <div class="flex justify-end">
                  <AppButton size="sm" variant="quiet" @click="emit('remove-custom-seasonality', seasonality.id)">
                    Remove
                  </AppButton>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div v-else-if="section.id === 'holidays'" class="grid gap-4">
          <div class="grid gap-4 md:grid-cols-2">
            <AppFieldGroup
              label="Holiday Calendar"
              input-id="forecast-holiday-country"
            >
              <AppSelect
                id="forecast-holiday-country"
                v-model="project.modelConfig.builtInHolidayCountry"
                :options="HOLIDAY_CALENDAR_OPTIONS"
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
          </div>

          <div class="grid gap-3">
            <div class="flex items-center justify-between gap-3">
              <h4 class="text-sm font-semibold text-slate-950">Custom Holidays</h4>
              <AppButton
                size="sm"
                variant="secondary"
                @click="emit('add-custom-holiday')"
              >
                Add Holiday
              </AppButton>
            </div>

            <div
              v-if="!project.modelConfig.customHolidays.length"
              class="border-l-2 border-dashed border-slate-300 pl-3 text-sm text-slate-500"
            >
              No custom holidays configured.
            </div>

            <div v-else class="grid divide-y divide-slate-200">
              <article
                v-for="holiday in project.modelConfig.customHolidays"
                :key="holiday.id"
                class="grid gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div class="grid gap-3 md:grid-cols-2">
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
                  <AppFieldGroup label="Strength" :input-id="`holiday-prior-${holiday.id}`" compact class="md:col-span-2">
                    <AppNumberField :id="`holiday-prior-${holiday.id}`" v-model="holiday.priorScale" :min="0.1" :step="0.5" compact />
                  </AppFieldGroup>
                </div>

                <div class="flex justify-end">
                  <AppButton size="sm" variant="quiet" @click="emit('remove-custom-holiday', holiday.id)">
                    Remove
                  </AppButton>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div v-else class="grid gap-4">
          <div class="grid gap-4 md:grid-cols-2">
            <AppFieldGroup
              label="Trend Shape"
              input-id="forecast-growth-mode"
              help-text="Most forecasts can stay on steady growth."
            >
              <AppSelect
                id="forecast-growth-mode"
                v-model="project.modelConfig.growth"
                :options="GROWTH_OPTIONS"
              />
            </AppFieldGroup>

            <AppFieldGroup label="Trend Flexibility" input-id="forecast-changepoint-prior">
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
                label="Upper Limit"
                input-id="forecast-default-cap"
                help-text="Used when growth with ceiling is selected and no upper-limit column is mapped."
              >
                <AppNumberField
                  id="forecast-default-cap"
                  v-model="project.modelConfig.defaultCap"
                  :min="0"
                  :step="1"
                />
              </AppFieldGroup>

              <AppFieldGroup label="Lower Limit" input-id="forecast-default-floor">
                <AppNumberField
                  id="forecast-default-floor"
                  v-model="project.modelConfig.defaultFloor"
                  :min="0"
                  :step="1"
                />
              </AppFieldGroup>
            </template>

            <AppFieldGroup
              label="Sampling Runs"
              input-id="forecast-mcmc-samples"
              help-text="Leave this at zero unless you specifically need slower, sampling-based intervals."
              class="md:col-span-2"
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
              class="md:col-span-2"
            >
              <AppTextArea
                id="forecast-manual-changepoints"
                v-model="project.modelConfig.manualChangepoints"
                rows="4"
              />
            </AppFieldGroup>
          </div>

          <AppStatusMessage v-if="Number(project.modelConfig.mcmcSamples) > 0">
            Sampling runs can materially increase runtime. Leave this at zero unless you specifically need sampling-based intervals.
          </AppStatusMessage>
        </div>
      </div>
    </section>
  </div>
</template>
