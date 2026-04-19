<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppInfoTooltip from '../ui/AppInfoTooltip.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTextArea from '../ui/AppTextArea.vue'
import AppTextField from '../ui/AppTextField.vue'
import AppToggleSwitch from '../ui/AppToggleSwitch.vue'
import {
  FORECAST_AHT_ASSUMPTION_METHOD_OPTIONS,
  formatForecastAhtSeconds,
  summarizeForecastAhtTrainingData
} from '../../forecasting/handleTimeAssumptions'
import {
  FORECAST_HORIZON_PRESETS,
  GROWTH_OPTIONS,
  HOLIDAY_CALENDAR_OPTIONS,
  SEASONALITY_MODE_OPTIONS,
  formatDate,
  formatNumber,
  getForecastProjectSourceKind,
  getForecastTrainingHistoryRows,
  getForecastTrainingWindow,
  isPlanAlignedForecast
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

const sourceKind = computed(() => getForecastProjectSourceKind(project.value))
const usesCenterManagedHolidays = computed(() => Boolean(project.value.centerManagedHolidays))
const isPlanAligned = computed(() => isPlanAlignedForecast(project.value))
const availableTrainingWindow = computed(() => getForecastTrainingWindow(project.value))
const historyRowCount = computed(() => availableTrainingWindow.value.availableRowCount)
const trainingHistoryRows = computed(() => getForecastTrainingHistoryRows(project.value))
const trainingRowCount = computed(() => trainingHistoryRows.value.length)
const holdoutDays = computed(() => Math.max(0, Number(project.value.modelConfig.holdoutDays) || 0))
const scoredTrainingRowCount = computed(() => Math.max(trainingRowCount.value - holdoutDays.value, 0))
const holdoutIsValid = computed(() =>
  trainingRowCount.value === 0 || holdoutDays.value === 0 || scoredTrainingRowCount.value >= 14
)
const showTrainingDataSection = computed(() => sourceKind.value === 'modeled_daily')
const ahtTrainingSummary = computed(() => summarizeForecastAhtTrainingData(project.value))
const ahtHistoryRowCount = computed(() => ahtTrainingSummary.value.availableRowCount)
const showHandleTimeSection = computed(() => showTrainingDataSection.value && ahtHistoryRowCount.value > 0)
const usingSharedPlanningHistory = computed(() =>
  showTrainingDataSection.value && Boolean(project.value?.planningContext?.groupId)
)
const trainingDataSourceSummary = computed(() =>
  usingSharedPlanningHistory.value
    ? 'Using shared staffing-group history from Data. Adjust this forecast’s training window without changing the underlying dataset.'
    : 'Using the loaded daily history. Adjust this forecast’s training window without changing the source data.'
)
const availableTrainingSummary = computed(() => {
  if (!historyRowCount.value) {
    return 'Load history first, then choose the date range used to train this forecast.'
  }

  return `Available data: ${formatDate(availableTrainingWindow.value.availableStartDate)} through ${formatDate(availableTrainingWindow.value.availableEndDate)} • ${historyRowCount.value} daily rows`
})
const trainingWindowIsValid = computed(() => availableTrainingWindow.value.windowIsValid)
const trainingWindowSummary = computed(() => {
  if (!historyRowCount.value) {
    return 'Load history first, then choose how much history this forecast should train on.'
  }

  if (!trainingWindowIsValid.value) {
    return 'Choose a training start date that is on or before the training end date.'
  }

  if (holdoutDays.value === 0) {
    return `Training window contains ${trainingRowCount.value} daily rows. No test set will be scored.`
  }

  return `Training window contains ${trainingRowCount.value} daily rows. The last ${holdoutDays.value} rows in this window will be scored against actuals, leaving ${scoredTrainingRowCount.value} rows for training.`
})
const handleTimeSourceSummary = computed(() =>
  usingSharedPlanningHistory.value
    ? 'Build monthly AHT assumptions from the shared staffing-group history in Data. These assumptions travel with the forecast and can be reviewed in Monthly Rollup before planning imports them.'
    : 'Build monthly AHT assumptions from the available daily AHT history for this forecast.'
)
const availableAhtSummary = computed(() => {
  if (!ahtHistoryRowCount.value) {
    return 'No daily AHT history is available for this forecast.'
  }

  return `Available AHT data: ${formatDate(ahtTrainingSummary.value.availableStartDate)} through ${formatDate(ahtTrainingSummary.value.availableEndDate)} • ${ahtHistoryRowCount.value} daily rows • weighted average ${formatForecastAhtSeconds(ahtTrainingSummary.value.availableWeightedAverageAhtSeconds)}`
})
const handleTimeWindowSummary = computed(() => {
  if (!ahtHistoryRowCount.value) {
    return 'Load shared history first, then choose how the forecast should build monthly handle time assumptions.'
  }

  const recentMonthsWindow = Math.max(1, Math.round(Number(project.value.modelConfig.ahtRecentMonthsWindow) || 3))
  const method = String(project.value.modelConfig.ahtAssumptionMethod || '')

  if (method === 'weighted_average') {
    return `This forecast will use the weighted AHT average from ${ahtTrainingSummary.value.monthlyHistoryCount} historical months inside the selected training window. Selected window: ${ahtTrainingSummary.value.trainingRowCount} daily AHT rows with a weighted average of ${formatForecastAhtSeconds(ahtTrainingSummary.value.trainingWeightedAverageAhtSeconds)}.`
  }

  if (method === 'seasonal_by_month') {
    return `This forecast will use same-month historical AHT patterns and fall back to the weighted training average when a month has no prior match. Selected window: ${ahtTrainingSummary.value.trainingRowCount} daily AHT rows across ${ahtTrainingSummary.value.monthlyHistoryCount} months.`
  }

  return `This forecast will blend same-month history with the most recent ${formatNumber(recentMonthsWindow, 0)} historical months inside the selected training window. Selected window: ${ahtTrainingSummary.value.trainingRowCount} daily AHT rows with a weighted average of ${formatForecastAhtSeconds(ahtTrainingSummary.value.trainingWeightedAverageAhtSeconds)}.`
})
const holdoutSummary = computed(() => {
  if (!trainingRowCount.value) {
    return 'Load history first, then choose how many trailing days to compare against actuals.'
  }

  if (holdoutDays.value === 0) {
    return `Train on all ${trainingRowCount.value} daily rows in the selected window. No test set will be scored.`
  }

  if (!holdoutIsValid.value) {
    return 'Use fewer test-set days so at least 14 training days remain.'
  }

  return `Train on the first ${scoredTrainingRowCount.value} daily rows in the selected window and compare the last ${holdoutDays.value} rows to actuals.`
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

const showScopeSection = computed(() => !isPlanAligned.value)

const inspectorHelp = {
  forecastHorizonDays: 'Number of future days to predict after the end of the uploaded daily history. Max 730 days.',
  holdoutDays: 'Holds back the last N historical days as a scored test set. These days are excluded from training and used for the MAPE and MAE accuracy checks.',
  confidence: 'Controls the width of the forecast interval shown around the forecast line. Higher percentages create a wider confidence band.',
  weeklySeasonality: 'Models recurring day-of-week patterns, such as weekdays behaving differently from weekends.',
  monthlySeasonality: 'Models an approximate 30.5-day repeating cycle. Use this only when the series shows a meaningful monthly rhythm beyond weekly and yearly effects.',
  yearlySeasonality: 'Models recurring annual patterns such as seasonal peaks, troughs, and year-over-year recurring demand swings.',
  holidayCalendar: 'Selects the built-in holiday calendar Prophet should include automatically before any custom holidays are added.',
  holidayStrength: 'Controls how strongly holiday effects are allowed to influence the forecast. Higher values let holidays move the model more aggressively.',
  customHolidayName: 'Name used to identify this holiday effect in the forecast inputs and component outputs.',
  customHolidayDate: 'Calendar date for the holiday or event that should influence the forecast.',
  customHolidayLowerWindow: 'Number of days before the holiday that should inherit the same holiday effect.',
  customHolidayUpperWindow: 'Number of days after the holiday that should inherit the same holiday effect.',
  customHolidayStrength: 'Controls how strongly this specific custom holiday can influence the forecast.',
  seasonalityMode: 'Additive patterns move the forecast by a fixed amount. Multiplicative patterns scale up and down with the overall trend level.',
  growth: 'Linear growth leaves the trend unconstrained. Logistic growth uses upper and lower limits so the forecast stays within a bounded range.',
  changepointPriorScale: 'Controls how freely the long-term trend can bend at changepoints. Higher values allow faster shifts but increase overfitting risk.',
  changepointRange: 'Defines how late in the history Prophet may place automatic changepoints. Lower values force trend changes earlier; higher values allow them later.',
  changepointCount: 'Maximum number of automatic trend changes Prophet may place within the allowed changepoint window.',
  mcmcSamples: 'Number of Bayesian sampling draws. Leave this at 0 for the faster default fit. Higher values increase runtime and uncertainty detail.',
  defaultCap: 'Upper forecast limit used when the trend shape is logistic. This limit applies to the fitted history and all forecast days.',
  defaultFloor: 'Lower forecast limit used when the trend shape is logistic. This floor applies to the fitted history and all forecast days.',
  manualChangepoints: 'Optional comma-separated YYYY-MM-DD dates where the trend is allowed to change explicitly.',
  customSeasonalityName: 'Short name used to identify this custom repeating pattern.',
  customSeasonalityPeriod: 'Cycle length in days for this custom repeating pattern.',
  customSeasonalityFourier: 'Pattern detail. Higher values allow a more complex repeating shape.',
  customSeasonalityStrength: 'Pattern strength. Higher values let this custom cycle influence the forecast more strongly.',
  customSeasonalityMode: 'Additive patterns move the forecast by a fixed amount. Multiplicative patterns scale with the trend level.'
}
</script>

<template>
  <div class="grid gap-7">
    <section v-if="showScopeSection" class="grid gap-3">
      <h3 class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Forecast Horizon
      </h3>

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

        <div class="grid gap-1.5 sm:max-w-[10rem]">
          <div class="flex items-center gap-1.5">
            <label for="forecast-horizon-custom" class="text-sm font-medium text-slate-950">
              Days To Forecast
            </label>
            <AppInfoTooltip label="Days To Forecast" :content="inspectorHelp.forecastHorizonDays" />
          </div>
          <AppNumberField
            id="forecast-horizon-custom"
            v-model="project.forecastHorizonDays"
            :min="1"
            :max="730"
            :step="1"
          />
        </div>
      </div>
    </section>

    <section v-if="showTrainingDataSection" class="grid gap-3">
      <h3 class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Training Data
      </h3>

      <div class="grid gap-3">
        <p class="text-sm leading-6 text-slate-600">
          {{ trainingDataSourceSummary }}
        </p>

        <div class="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
          {{ availableTrainingSummary }}
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="grid gap-1.5">
            <label for="forecast-training-start-date" class="text-sm font-medium text-slate-950">
              Start Date
            </label>
            <AppTextField
              id="forecast-training-start-date"
              v-model.trim="project.modelConfig.trainingStartDate"
              type="date"
              :min="availableTrainingWindow.availableStartDate"
              :max="availableTrainingWindow.availableEndDate"
              :disabled="!historyRowCount"
              compact
              class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
            />
          </div>

          <div class="grid gap-1.5">
            <label for="forecast-training-end-date" class="text-sm font-medium text-slate-950">
              End Date
            </label>
            <AppTextField
              id="forecast-training-end-date"
              v-model.trim="project.modelConfig.trainingEndDate"
              type="date"
              :min="availableTrainingWindow.availableStartDate"
              :max="availableTrainingWindow.availableEndDate"
              :disabled="!historyRowCount"
              compact
              class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
            />
          </div>
        </div>

        <AppStatusMessage v-if="historyRowCount > 0 && !trainingWindowIsValid" tone="error">
          {{ trainingWindowSummary }}
        </AppStatusMessage>

        <p v-else class="text-sm leading-6 text-slate-600">
          {{ trainingWindowSummary }}
        </p>
      </div>
    </section>

    <section v-if="showHandleTimeSection" class="grid gap-3">
      <h3 class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Handle Time Assumptions
      </h3>

      <div class="grid gap-3">
        <p class="text-sm leading-6 text-slate-600">
          {{ handleTimeSourceSummary }}
        </p>

        <div class="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
          {{ availableAhtSummary }}
        </div>

        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <div class="grid gap-1.5">
            <label for="forecast-aht-assumption-method" class="text-sm font-medium text-slate-950">
              Method
            </label>
            <AppSelect
              id="forecast-aht-assumption-method"
              v-model="project.modelConfig.ahtAssumptionMethod"
              :options="FORECAST_AHT_ASSUMPTION_METHOD_OPTIONS"
            />
          </div>

          <div
            v-if="project.modelConfig.ahtAssumptionMethod === 'blend_recent_seasonal'"
            class="grid gap-1.5"
          >
            <label for="forecast-aht-recent-months-window" class="text-sm font-medium text-slate-950">
              Recent Months
            </label>
            <AppNumberField
              id="forecast-aht-recent-months-window"
              v-model="project.modelConfig.ahtRecentMonthsWindow"
              :min="1"
              :max="12"
              :step="1"
              compact
              class="border-slate-200 bg-slate-50 text-right tabular-nums shadow-none focus:bg-white focus:ring-2"
            />
          </div>
        </div>

        <p class="text-sm leading-6 text-slate-600">
          {{ handleTimeWindowSummary }}
        </p>
      </div>
    </section>

    <section class="grid gap-3">
      <h3 class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Validation
      </h3>

      <div class="grid gap-2">
        <div class="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-4">
          <div class="flex items-center gap-1.5">
            <label for="forecast-holdout-days" class="text-sm font-medium text-slate-950">
              Test Set Days
            </label>
            <AppInfoTooltip label="Test Set Days" :content="inspectorHelp.holdoutDays" />
          </div>
          <AppNumberField
            id="forecast-holdout-days"
            v-model="project.modelConfig.holdoutDays"
            :min="0"
            :step="1"
            compact
            class="border-slate-200 bg-slate-50 text-right tabular-nums shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-4">
          <div class="flex items-center gap-1.5">
            <label for="forecast-interval-width" class="text-sm font-medium text-slate-950">
              Confidence
            </label>
            <AppInfoTooltip label="Confidence" :content="inspectorHelp.confidence" />
          </div>
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

      <AppStatusMessage v-if="!holdoutIsValid" tone="error">
        {{ holdoutSummary }}
      </AppStatusMessage>

      <div v-if="props.validationMessages.length" class="grid gap-2">
        <AppStatusMessage
          v-for="message in props.validationMessages"
          :key="message"
          tone="error"
        >
          {{ message }}
        </AppStatusMessage>
      </div>
    </section>

    <section class="grid gap-2">
      <h3 class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Seasonality
      </h3>

      <div class="flex items-center justify-between gap-4 py-1.5">
        <div class="flex items-center gap-1.5 text-sm font-medium text-slate-950">
          <span>Weekly</span>
          <AppInfoTooltip label="Weekly" :content="inspectorHelp.weeklySeasonality" />
        </div>
        <AppToggleSwitch
          input-id="forecast-weekly-toggle"
          aria-label="Toggle weekly seasonality"
          v-model="project.modelConfig.weeklySeasonalityEnabled"
        />
      </div>

      <div class="flex items-center justify-between gap-4 py-1.5">
        <div class="flex items-center gap-1.5 text-sm font-medium text-slate-950">
          <span>Monthly</span>
          <AppInfoTooltip label="Monthly" :content="inspectorHelp.monthlySeasonality" />
        </div>
        <AppToggleSwitch
          input-id="forecast-monthly-toggle"
          aria-label="Toggle monthly seasonality"
          v-model="project.modelConfig.monthlySeasonalityEnabled"
        />
      </div>

      <div class="flex items-center justify-between gap-4 py-1.5">
        <div class="flex items-center gap-1.5 text-sm font-medium text-slate-950">
          <span>Yearly</span>
          <AppInfoTooltip label="Yearly" :content="inspectorHelp.yearlySeasonality" />
        </div>
        <AppToggleSwitch
          input-id="forecast-yearly-toggle"
          aria-label="Toggle yearly seasonality"
          v-model="project.modelConfig.yearlySeasonalityEnabled"
        />
      </div>
    </section>

    <section v-if="!usesCenterManagedHolidays" class="grid gap-3">
      <h3 class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Holiday Effects
      </h3>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="grid gap-1.5">
          <div class="flex items-center gap-1.5">
            <label for="forecast-holiday-country" class="text-sm font-medium text-slate-950">
              Holiday Calendar
            </label>
            <AppInfoTooltip label="Holiday Calendar" :content="inspectorHelp.holidayCalendar" />
          </div>
          <AppSelect
            id="forecast-holiday-country"
            v-model="project.modelConfig.builtInHolidayCountry"
            :options="HOLIDAY_CALENDAR_OPTIONS"
          />
        </div>

        <div class="grid gap-1.5">
          <div class="flex items-center gap-1.5">
            <label for="forecast-holiday-prior" class="text-sm font-medium text-slate-950">
              Holiday Strength
            </label>
            <AppInfoTooltip label="Holiday Strength" :content="inspectorHelp.holidayStrength" />
          </div>
          <AppNumberField
            id="forecast-holiday-prior"
            v-model="project.modelConfig.holidaysPriorScale"
            :min="0.1"
            :step="0.5"
          />
        </div>
      </div>

      <div class="grid gap-2.5">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-sm font-semibold text-slate-950">Custom Holidays</h4>
          <AppButton
            size="sm"
            variant="quiet"
            @click="emit('add-custom-holiday')"
          >
            Add Holiday
          </AppButton>
        </div>

        <div
          v-if="!project.modelConfig.customHolidays.length"
          class="text-[0.82rem] text-slate-500"
        >
          No custom holidays.
        </div>

        <div v-else class="overflow-hidden border border-slate-200 bg-white">
          <div
            v-for="holiday in project.modelConfig.customHolidays"
            :key="holiday.id"
            class="grid gap-3 border-t border-slate-200 p-4 first:border-t-0"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-name-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Name
                  </label>
                  <AppInfoTooltip label="Custom Holiday Name" :content="inspectorHelp.customHolidayName" />
                </div>
                <AppTextField
                  :id="`holiday-name-${holiday.id}`"
                  v-model.trim="holiday.name"
                  compact
                />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-date-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Date
                  </label>
                  <AppInfoTooltip label="Custom Holiday Date" :content="inspectorHelp.customHolidayDate" />
                </div>
                <AppTextField
                  :id="`holiday-date-${holiday.id}`"
                  v-model="holiday.date"
                  type="date"
                  compact
                />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-lower-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Days Before
                  </label>
                  <AppInfoTooltip label="Days Before" :content="inspectorHelp.customHolidayLowerWindow" />
                </div>
                <AppNumberField :id="`holiday-lower-${holiday.id}`" v-model="holiday.lowerWindow" :step="1" compact />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-upper-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Days After
                  </label>
                  <AppInfoTooltip label="Days After" :content="inspectorHelp.customHolidayUpperWindow" />
                </div>
                <AppNumberField :id="`holiday-upper-${holiday.id}`" v-model="holiday.upperWindow" :step="1" compact />
              </div>
              <div class="grid gap-1.5 sm:col-span-2">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-prior-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Strength
                  </label>
                  <AppInfoTooltip label="Custom Holiday Strength" :content="inspectorHelp.customHolidayStrength" />
                </div>
                <AppNumberField :id="`holiday-prior-${holiday.id}`" v-model="holiday.priorScale" :min="0.1" :step="0.5" compact />
              </div>
            </div>

            <div class="flex justify-end">
              <AppButton size="sm" variant="quiet" @click="emit('remove-custom-holiday', holiday.id)">
                Remove
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-4">
      <h3 class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Advanced
      </h3>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="grid gap-1.5">
          <div class="flex items-center gap-1.5">
            <label for="forecast-seasonality-mode" class="text-sm font-medium text-slate-950">
              Seasonality Type
            </label>
            <AppInfoTooltip label="Seasonality Type" :content="inspectorHelp.seasonalityMode" />
          </div>
          <AppSelect
            id="forecast-seasonality-mode"
            v-model="project.modelConfig.seasonalityMode"
            :options="SEASONALITY_MODE_OPTIONS"
          />
        </div>

        <div class="grid gap-1.5">
          <div class="flex items-center gap-1.5">
            <label for="forecast-growth-mode" class="text-sm font-medium text-slate-950">
              Trend Type
            </label>
            <AppInfoTooltip label="Trend Type" :content="inspectorHelp.growth" />
          </div>
          <AppSelect
            id="forecast-growth-mode"
            v-model="project.modelConfig.growth"
            :options="GROWTH_OPTIONS"
          />
        </div>

        <div class="grid gap-1.5">
          <div class="flex items-center gap-1.5">
            <label for="forecast-changepoint-prior" class="text-sm font-medium text-slate-950">
              Trend Sensitivity
            </label>
            <AppInfoTooltip label="Trend Sensitivity" :content="inspectorHelp.changepointPriorScale" />
          </div>
          <AppNumberField
            id="forecast-changepoint-prior"
            v-model="project.modelConfig.changepointPriorScale"
            :min="0.001"
            :step="0.01"
            :max-fraction-digits="3"
          />
        </div>

        <div class="grid gap-1.5">
          <div class="flex items-center gap-1.5">
            <label for="forecast-changepoint-range" class="text-sm font-medium text-slate-950">
              Trend Change Window
            </label>
            <AppInfoTooltip label="Trend Change Window" :content="inspectorHelp.changepointRange" />
          </div>
          <AppNumberField
            id="forecast-changepoint-range"
            v-model="project.modelConfig.changepointRange"
            :min="0.1"
            :max="1"
            :step="0.05"
            :max-fraction-digits="2"
          />
        </div>

        <div class="grid gap-1.5">
          <div class="flex items-center gap-1.5">
            <label for="forecast-changepoint-count" class="text-sm font-medium text-slate-950">
              Max Trend Changes
            </label>
            <AppInfoTooltip label="Max Trend Changes" :content="inspectorHelp.changepointCount" />
          </div>
          <AppNumberField
            id="forecast-changepoint-count"
            v-model="project.modelConfig.changepointCount"
            :min="0"
            :step="1"
          />
        </div>

        <div class="grid gap-1.5">
          <div class="flex items-center gap-1.5">
            <label for="forecast-mcmc-samples" class="text-sm font-medium text-slate-950">
              Sampling Runs
            </label>
            <AppInfoTooltip label="Sampling Runs" :content="inspectorHelp.mcmcSamples" />
          </div>
          <AppNumberField
            id="forecast-mcmc-samples"
            v-model="project.modelConfig.mcmcSamples"
            :min="0"
            :step="50"
          />
        </div>

        <template v-if="project.modelConfig.growth === 'logistic'">
          <div class="grid gap-1.5">
            <div class="flex items-center gap-1.5">
              <label for="forecast-default-floor" class="text-sm font-medium text-slate-950">
                Lower Forecast Limit
              </label>
              <AppInfoTooltip label="Lower Forecast Limit" :content="inspectorHelp.defaultFloor" />
            </div>
            <AppNumberField
              id="forecast-default-floor"
              v-model="project.modelConfig.defaultFloor"
              :min="0"
              :step="1"
            />
          </div>

          <div class="grid gap-1.5">
            <div class="flex items-center gap-1.5">
              <label for="forecast-default-cap" class="text-sm font-medium text-slate-950">
                Upper Forecast Limit
              </label>
              <AppInfoTooltip label="Upper Forecast Limit" :content="inspectorHelp.defaultCap" />
            </div>
            <AppNumberField
              id="forecast-default-cap"
              v-model="project.modelConfig.defaultCap"
              :min="0"
              :step="1"
            />
          </div>
        </template>

        <div class="grid gap-1.5 sm:col-span-2">
          <div class="flex items-center gap-1.5">
            <label for="forecast-manual-changepoints" class="text-sm font-medium text-slate-950">
              Manual Trend Change Dates
            </label>
            <AppInfoTooltip label="Manual Trend Change Dates" :content="inspectorHelp.manualChangepoints" />
          </div>
          <AppTextArea
            id="forecast-manual-changepoints"
            v-model="project.modelConfig.manualChangepoints"
            rows="3"
            compact
          />
        </div>
      </div>

      <div class="grid gap-2.5">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-sm font-semibold text-slate-950">Custom Patterns</h4>
          <AppButton size="sm" variant="quiet" @click="emit('add-custom-seasonality')">
            Add Pattern
          </AppButton>
        </div>

        <div
          v-if="!project.modelConfig.customSeasonalities.length"
          class="text-[0.82rem] text-slate-500"
        >
          No custom patterns.
        </div>

        <div v-else class="overflow-hidden border border-slate-200 bg-white">
          <div
            v-for="seasonality in project.modelConfig.customSeasonalities"
            :key="seasonality.id"
            class="grid gap-3 border-t border-slate-200 p-4 first:border-t-0"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-name-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Name
                  </label>
                  <AppInfoTooltip label="Custom Pattern Name" :content="inspectorHelp.customSeasonalityName" />
                </div>
                <AppTextField
                  :id="`seasonality-name-${seasonality.id}`"
                  v-model.trim="seasonality.name"
                  compact
                />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-period-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Cycle Length
                  </label>
                  <AppInfoTooltip label="Cycle Length" :content="inspectorHelp.customSeasonalityPeriod" />
                </div>
                <AppNumberField :id="`seasonality-period-${seasonality.id}`" v-model="seasonality.periodDays" :min="1" :step="0.5" compact />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-fourier-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Detail
                  </label>
                  <AppInfoTooltip label="Pattern Detail" :content="inspectorHelp.customSeasonalityFourier" />
                </div>
                <AppNumberField :id="`seasonality-fourier-${seasonality.id}`" v-model="seasonality.fourierOrder" :min="1" :step="1" compact />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-prior-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Strength
                  </label>
                  <AppInfoTooltip label="Pattern Strength" :content="inspectorHelp.customSeasonalityStrength" />
                </div>
                <AppNumberField :id="`seasonality-prior-${seasonality.id}`" v-model="seasonality.priorScale" :min="0.1" :step="0.5" compact />
              </div>
              <div class="grid gap-1.5 sm:col-span-2">
                <div class="flex items-center gap-1.5">
                  <label :for="`seasonality-mode-${seasonality.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Seasonality Type
                  </label>
                  <AppInfoTooltip label="Custom Seasonality Type" :content="inspectorHelp.customSeasonalityMode" />
                </div>
                <AppSelect
                  :id="`seasonality-mode-${seasonality.id}`"
                  v-model="seasonality.mode"
                  :options="SEASONALITY_MODE_OPTIONS"
                  compact
                />
              </div>
            </div>

            <div class="flex justify-end">
              <AppButton size="sm" variant="quiet" @click="emit('remove-custom-seasonality', seasonality.id)">
                Remove
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
