<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppCheckbox from '../ui/AppCheckbox.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../plannerModel'
import { describeOperatingWindow } from '../../planner/operatingSchedule'
import PlannerCopyMenu from './PlannerCopyMenu.vue'
import { getChannelPlanningTerms } from '../../planner/channels'

const props = defineProps({
  channelType: {
    type: String,
    default: 'voice'
  },
  monthlyRecords: {
    type: Array,
    required: true
  },
  demandSource: {
    type: Object,
    default: null
  },
  currentDemandSourceSummary: {
    type: Object,
    default: null
  },
  requirementMethod: {
    type: String,
    default: ''
  },
  serviceLevelPercent: {
    type: Number,
    default: 0
  },
  serviceLevelThresholdSeconds: {
    type: Number,
    default: 0
  },
  operatingOpenTime: {
    type: String,
    default: ''
  },
  operatingScheduleMode: {
    type: String,
    default: ''
  },
  operatingCloseTime: {
    type: String,
    default: ''
  },
  intraday: {
    type: Object,
    default: () => ({})
  },
  summary: {
    type: Object,
    required: true
  },
  formatWhole: {
    type: Function,
    default: (value) => String(value ?? 0)
  },
  formatNumber: {
    type: Function,
    default: (value, digits = 1) => Number(value ?? 0).toFixed(digits)
  },
  formatPercent: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['copy-action', 'previous', 'continue', 'toggle-override-mode'])

const randomDefaults = defineModel('randomDefaults', {
  type: Object,
  default: null
})

const useMonthlyRandomOverrides = defineModel('useMonthlyRandomOverrides', {
  type: Boolean,
  default: false
})

const randomMonths = defineModel('randomMonths', {
  type: Array,
  default: null
})

const handleCopyAction = (monthIndex, action) => {
  emit('copy-action', {
    monthIndex,
    action
  })
}

const handleOverrideModeChange = (value) => {
  useMonthlyRandomOverrides.value = value
  emit('toggle-override-mode', value)
}

const isIntradayErlang = computed(() => props.requirementMethod === PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG)
const channelTerms = computed(() => getChannelPlanningTerms(props.channelType))
const sectionTitle = computed(() => isIntradayErlang.value ? 'Erlang Inputs' : 'Random/Variability')
const continueLabel = computed(() => 'Continue to Demand Model')
const shellMessage = computed(() =>
  isIntradayErlang.value
    ? 'Demand Model uses the staffing-group service goal, operating window, and 30-minute interval profile. This step confirms the occupancy cap applied inside Erlang plus the adherence overhead applied afterward.'
    : ''
)
const serviceGoalLabel = computed(() => {
  if (!isIntradayErlang.value) {
    return ''
  }

  const percent = Number(props.serviceLevelPercent)
  const seconds = Number(props.serviceLevelThresholdSeconds)

  if (!Number.isFinite(percent) || percent <= 0 || !Number.isFinite(seconds) || seconds <= 0) {
    return 'Needs staffing group setup'
  }

  return `${props.formatPercent(percent, 0)} in ${props.formatWhole(seconds)} sec`
})
const operatingWindowLabel = computed(() => {
  if (!isIntradayErlang.value) {
    return ''
  }

  const label = describeOperatingWindow({
    operatingScheduleMode: props.operatingScheduleMode,
    operatingOpenTime: props.operatingOpenTime,
    operatingCloseTime: props.operatingCloseTime
  })
  return label === 'Hours not set' ? 'Needs call center hours' : label
})
const intervalProfileRows = computed(() =>
  Array.isArray(props.intraday?.intervalRatios) ? props.intraday.intervalRatios : []
)
const minimumHeadcountLabel = computed(() => {
  const minimumHeadcount = Math.max(Math.round(Number(props.intraday?.minimumHeadcount) || 0), 0)
  return minimumHeadcount > 0 ? props.formatWhole(minimumHeadcount) : 'No floor'
})
const intradayForecastSourceLabel = computed(() => {
  if (!isIntradayErlang.value) {
    return ''
  }

  const projectName = String(props.currentDemandSourceSummary?.projectName || '').trim()
  if (projectName) {
    return projectName
  }

  return props.demandSource?.mode === 'forecast' ? 'Applied forecast' : 'Apply a forecast in the next step'
})

const intradaySummaryItems = computed(() => [
  {
    label: 'Service Goal',
    value: serviceGoalLabel.value,
    meta: 'Inherited from staffing group settings'
  },
  {
    label: 'Max Occupancy',
    value: props.formatPercent(props.randomDefaults?.occupancyPercent, 1),
    meta: 'Plan-level Erlang cap'
  },
  {
    label: 'Adherence',
    value: props.formatPercent(props.randomDefaults?.adherencePercent, 1),
    meta: 'Plan-level overhead after Erlang'
  },
  {
    label: 'Operating Window',
    value: operatingWindowLabel.value,
    meta: 'Inherited from call center settings'
  },
  {
    label: 'Interval Profile',
    value: intervalProfileRows.value.length
      ? `${props.formatWhole(intervalProfileRows.value.length)} intervals @ ${props.formatWhole(props.intraday?.intervalLengthMinutes || 30)} min`
      : 'Needs intraday profile',
    meta: 'Inherited from staffing group setup'
  },
  {
    label: 'Minimum HC / Open Interval',
    value: minimumHeadcountLabel.value,
    meta: 'Inherited from staffing group setup'
  },
  {
    label: 'Forecast Input',
    value: intradayForecastSourceLabel.value,
    meta: 'Daily contacts and monthly AHT apply in Demand Model'
  }
])

const workloadRatioSummaryItems = computed(() => [
  {
    label: channelTerms.value.utilizationLabel,
    value: props.formatPercent(
      props.summary.usesMonthlyOverrides
        ? props.summary.averageOccupancyPercent
        : props.summary.globalOccupancyPercent,
      1
    )
  },
  {
    label: 'Adherence',
    value: props.formatPercent(
      props.summary.usesMonthlyOverrides
        ? props.summary.averageAdherencePercent
        : props.summary.globalAdherencePercent,
      1
    )
  },
  {
    label: 'Adherence Loss',
    value: props.formatPercent(props.summary.averageAdherenceLossPercent, 1)
  },
  {
    label: 'Occupancy Loss',
    value: props.formatPercent(props.summary.averageOccupancyLossPercent, 1)
  },
  {
    label: 'Total Random Loss',
    value: props.formatPercent(props.summary.averageRandomLossPercent, 1)
  }
])

const summaryItems = computed(() =>
  isIntradayErlang.value ? intradaySummaryItems.value : workloadRatioSummaryItems.value
)
const summaryColumns = computed(() =>
  isIntradayErlang.value ? 'md:grid-cols-2 xl:grid-cols-7' : 'md:grid-cols-2 xl:grid-cols-5'
)
</script>

<template>
  <section class="monthly-tab-panel">
    <AppSectionHeader :title="sectionTitle" />

    <AppStatStrip :items="summaryItems" :columns="summaryColumns" />

    <AppStatusMessage v-if="shellMessage" tone="info">
      {{ shellMessage }}
    </AppStatusMessage>

    <section v-if="isIntradayErlang" class="grid gap-3">
      <AppSectionHeader title="Inputs Driving Demand Model" />

      <div class="grid gap-3 xl:grid-cols-[minmax(0,15rem)_minmax(0,15rem)_minmax(0,1fr)] xl:items-start">
        <AppFieldGroup
          label="Max Occupancy %"
          input-id="intraday-erlang-max-occupancy"
          help-text="This cap is applied inside Erlang when translating interval demand into staffed hours."
          class="xl:max-w-[15rem]"
        >
          <AppNumberField
            id="intraday-erlang-max-occupancy"
            v-model.number="randomDefaults.occupancyPercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            compact
            aria-label="Intraday Erlang max occupancy percent"
          />
        </AppFieldGroup>

        <AppFieldGroup
          label="Adherence %"
          input-id="intraday-erlang-adherence"
          help-text="This overhead is applied after Erlang when converting net staffed hours into final required staffing."
          class="xl:max-w-[15rem]"
        >
          <AppNumberField
            id="intraday-erlang-adherence"
            v-model.number="randomDefaults.adherencePercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            compact
            aria-label="Intraday Erlang adherence percent"
          />
        </AppFieldGroup>

        <div class="grid gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div class="grid gap-1">
            <strong class="text-sm font-semibold tracking-[-0.02em] text-slate-950">
              Staffing Group Inputs
            </strong>
            <p class="text-sm leading-6 text-slate-600">
              Service goal, operating window, interval mix, and minimum interval headcount are inherited from staffing-group setup and stay read-only here.
            </p>
          </div>

          <dl class="grid gap-3 md:grid-cols-2">
            <div class="grid gap-1 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
              <dt class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Service Goal</dt>
              <dd class="text-sm font-semibold text-slate-900">{{ serviceGoalLabel }}</dd>
            </div>
            <div class="grid gap-1 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
              <dt class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Operating Window</dt>
              <dd class="text-sm font-semibold text-slate-900">{{ operatingWindowLabel }}</dd>
            </div>
            <div class="grid gap-1 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
              <dt class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Interval Profile</dt>
              <dd class="text-sm font-semibold text-slate-900">
                {{ intervalProfileRows.length ? `${intervalProfileRows.length} intervals @ ${props.intraday?.intervalLengthMinutes || 30} min` : 'Needs profile' }}
              </dd>
            </div>
            <div class="grid gap-1 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
              <dt class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Minimum HC / Open Interval</dt>
              <dd class="text-sm font-semibold text-slate-900">{{ minimumHeadcountLabel }}</dd>
            </div>
            <div class="grid gap-1 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
              <dt class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Forecast Input</dt>
              <dd class="text-sm font-semibold text-slate-900">{{ intradayForecastSourceLabel }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <section v-else class="grid gap-3">
      <AppSectionHeader title="Assumptions" />

      <div class="grid gap-3 xl:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_minmax(0,1fr)] xl:items-start">
        <AppFieldGroup
          :label="useMonthlyRandomOverrides ? `Default ${channelTerms.utilizationLabel} %` : `${channelTerms.utilizationLabel} %`"
          input-id="global-occupancy"
          :help-text="useMonthlyRandomOverrides ? 'Seeds the monthly override table.' : 'Applies across the full plan year.'"
          class="xl:max-w-[12rem]"
        >
          <AppNumberField
            id="global-occupancy"
            v-model.number="randomDefaults.occupancyPercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            compact
            aria-label="Global occupancy percent"
          />
        </AppFieldGroup>

        <AppFieldGroup
          :label="useMonthlyRandomOverrides ? 'Default Adherence %' : 'Adherence %'"
          input-id="global-adherence"
          :help-text="useMonthlyRandomOverrides ? 'Seeds the monthly override table.' : 'Applies across the full plan year.'"
          class="xl:max-w-[12rem]"
        >
          <AppNumberField
            id="global-adherence"
            v-model.number="randomDefaults.adherencePercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            compact
            aria-label="Global adherence percent"
          />
        </AppFieldGroup>

        <AppFieldGroup
          label="Monthly overrides"
          input-id="use-random-overrides"
          help-text="Off for one yearly assumption set. On for month-level edits."
          class="xl:self-end"
        >
          <AppCheckbox
            input-id="use-random-overrides"
            :model-value="useMonthlyRandomOverrides"
            @update:model-value="handleOverrideModeChange"
          >
            Use monthly overrides
          </AppCheckbox>
        </AppFieldGroup>
      </div>
    </section>

    <section v-if="!isIntradayErlang" class="grid gap-3">
      <p v-if="!useMonthlyRandomOverrides" class="random-global-note">
        Global occupancy and adherence assumptions apply to every month in this plan year.
      </p>

      <div v-else class="grid gap-3">
        <AppSectionHeader title="Monthly Overrides" />

        <div class="assumption-table-shell">
          <table class="assumption-table assumption-table-random">
            <thead>
              <tr>
                <th title="Planning month for the worksheet row.">Month</th>
                <th title="Scheduled percentage flowing in from Step 1.">Scheduled %</th>
                <th title="Expected monthly productive utilization assumption used in the random loss build.">{{ channelTerms.utilizationLabel }} %</th>
                <th title="Expected monthly adherence assumption used in the random loss build.">Adherence %</th>
                <th title="Adherence loss calculated as (1 - Adherence %) x Scheduled %.">Adherence Loss</th>
                <th title="Occupancy loss calculated as (1 - Occupancy %) x (Scheduled % - Adherence Loss).">Occupancy Loss</th>
                <th title="Total scheduled random loss calculated as Adherence Loss + Occupancy Loss.">Total Random Loss</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in props.monthlyRecords"
                :key="record.label"
              >
                <td class="month-cell">
                  <div class="flex items-center justify-between gap-2">
                    <span class="inline-flex flex-1 items-center px-2 py-1 text-left font-semibold text-slate-800">
                      {{ record.fullLabel }}
                    </span>
                    <div @click.stop @keydown.stop>
                      <PlannerCopyMenu
                        :month-label="record.fullLabel"
                        @select="handleCopyAction(record.monthIndex, $event)"
                      />
                    </div>
                  </div>
                </td>
                <td>{{ props.formatPercent(record.scheduledPercent, 1) }}</td>
                <td>
                  <AppTableNumberField
                    v-model.number="randomMonths[record.monthIndex].occupancyPercent"
                    min="1"
                    max="100"
                    step="0.1"
                    :min-fraction-digits="1"
                    :max-fraction-digits="1"
                    :aria-label="`${channelTerms.utilizationLabel} percent`"
                  />
                </td>
                <td>
                  <AppTableNumberField
                    v-model.number="randomMonths[record.monthIndex].adherencePercent"
                    min="1"
                    max="100"
                    step="0.1"
                    :min-fraction-digits="1"
                    :max-fraction-digits="1"
                    aria-label="Adherence percent"
                  />
                </td>
                <td>{{ props.formatPercent(record.adherenceLossPercent, 1) }}</td>
                <td>{{ props.formatPercent(record.occupancyLossPercent, 1) }}</td>
                <td>{{ props.formatPercent(record.randomLossPercent, 1) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="monthly-tab-actions">
      <AppButton variant="secondary" @click="emit('previous')">Back to Agent Availability</AppButton>
      <AppButton variant="primary" @click="emit('continue')">{{ continueLabel }}</AppButton>
    </div>
  </section>
</template>
