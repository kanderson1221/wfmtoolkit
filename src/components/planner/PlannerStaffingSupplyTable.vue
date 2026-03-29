<script setup>
import { computed } from 'vue'

import AppCheckbox from '../ui/AppCheckbox.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'

const props = defineProps({
  staffingRecords: {
    type: Array,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  },
  startingPositionInherited: {
    type: Boolean,
    default: false
  },
  startingPositionInheritedFromYear: {
    type: Number,
    default: null
  }
})

const startingHeadcount = defineModel('startingHeadcount', {
  type: Number,
  required: true
})

const startingFrontlineHeadcount = defineModel('startingFrontlineHeadcount', {
  type: Number,
  required: true
})

const staffingMonths = defineModel('staffingMonths', {
  type: Array,
  required: true
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const yearEndTargetEnabled = defineModel('yearEndTargetEnabled', {
  type: Boolean,
  default: false
})

const yearEndHeadcountTarget = defineModel('yearEndHeadcountTarget', {
  type: Number,
  default: null
})

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}

const formatSignedNumber = (value, digits = 1) => {
  const numericValue = Number(value) || 0
  const prefix = numericValue > 0 ? '+' : ''
  return `${prefix}${props.formatNumber(numericValue, digits)}`
}

const gapClass = (value) => ({
  'variance-positive': value > 0.05,
  'variance-negative': value < -0.05
})

const decemberRecord = computed(() => props.staffingRecords.find((record) => record.monthIndex === 11) || null)
const startingPositionMessage = computed(() => {
  if (!props.startingPositionInherited) {
    return ''
  }

  if (Number.isFinite(props.startingPositionInheritedFromYear)) {
    return `January opening headcount is inherited from the ${props.startingPositionInheritedFromYear} plan. Update the prior year if the starting position needs to change.`
  }

  return 'January opening headcount is inherited from the prior-year plan. Update the prior year if the starting position needs to change.'
})
const yearEndProjectionMessage = computed(() => {
  if (!yearEndTargetEnabled.value || !decemberRecord.value) {
    return ''
  }

  const targetLabel =
    yearEndHeadcountTarget.value == null
      ? ''
      : ` against a target of ${props.formatNumber(yearEndHeadcountTarget.value, 1)}`

  return `Current plan projects next January to open at ${props.formatNumber(decemberRecord.value.endingFrontlineHeadcount, 1)} frontline headcount${targetLabel}.`
})
</script>

<template>
  <section class="grid gap-3">
    <AppSectionHeader title="Monthly Staffing Supply" />

    <div class="grid gap-1">
      <AppStatusMessage v-if="startingPositionMessage" tone="info">
        {{ startingPositionMessage }}
      </AppStatusMessage>
      <AppCheckbox v-model="yearEndTargetEnabled" input-id="year-end-headcount-target">
        Set a target next January starting frontline headcount.
      </AppCheckbox>
      <p class="pl-7 text-sm leading-6 text-slate-600">
        When enabled, the December <span class="font-medium text-slate-700">Ending Frontline Headcount</span> cell becomes an editable target and recommendations will try to land there while still covering in-year monthly staffing needs.
      </p>
      <p v-if="yearEndProjectionMessage" class="pl-7 text-sm leading-6 text-slate-600">
        {{ yearEndProjectionMessage }}
      </p>
    </div>

    <div class="assumption-table-shell">
      <table class="assumption-table assumption-table-staffing">
        <colgroup>
          <col class="staffing-col-month" />
          <col class="staffing-col-requirement" />
          <col class="staffing-col-requirement" />
          <col class="staffing-col-value" />
          <col class="staffing-col-value" />
          <col class="staffing-col-value" />
          <col class="staffing-col-value" />
          <col class="staffing-col-value" />
          <col class="staffing-col-value" />
          <col class="staffing-col-value" />
          <col class="staffing-col-value" />
          <col class="staffing-col-gap" />
        </colgroup>
        <thead>
          <tr>
            <th title="Planning month. Click a month name to highlight that row.">Month</th>
            <th title="Frontline headcount required by the demand model for this month.">
              <span class="plan-head-label">Avg Req<br />HC</span>
            </th>
            <th title="Peak-day headcount requirement from the demand model for this month.">
              <span class="plan-head-label">Peak Req<br />HC</span>
            </th>
            <th title="Total headcount on the roster at the start of the month, before any monthly movement is applied.">
              <span class="plan-head-label">Start Roster<br />HC</span>
            </th>
            <th title="Productive frontline headcount available at the start of the month before graduates and attrition are applied.">
              <span class="plan-head-label">Start Frontline<br />HC</span>
            </th>
            <th title="Total people hired into training during the month.">
              <span class="plan-head-label">Hire<br />HC</span>
            </th>
            <th title="Full class headcount scheduled to finish training during the month. Graduation yield still affects how many become frontline-ready after nesting.">
              <span class="plan-head-label">Graduating<br />HC</span>
            </th>
            <th title="People still in training at the end of the month and therefore not yet available as frontline supply.">
              <span class="plan-head-label">In-Training<br />HC</span>
            </th>
            <th title="Planned frontline exits for the month. This reduces both total headcount and frontline headcount.">
              <span class="plan-head-label">Attrition<br />HC</span>
            </th>
            <th title="Total headcount remaining on the roster at the end of the month after hires, fallout, and attrition.">
              <span class="plan-head-label">End Roster<br />HC</span>
            </th>
            <th title="Productive frontline headcount available at the end of the month after graduates and attrition are applied.">
              <span class="plan-head-label">End Frontline<br />HC</span>
            </th>
            <th title="Starting frontline headcount minus required headcount from the demand model. Negative values indicate the month opens short.">
              <span class="plan-head-label">Gap to<br />Req</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="record in props.staffingRecords"
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
              <td>{{ props.formatNumber(record.requiredHeadcount, 1) }}</td>
              <td>{{ props.formatNumber(record.peakDayRequiredHeadcount, 1) }}</td>
              <td>
                <AppTableNumberField
                  v-if="record.monthIndex === 0 && !props.startingPositionInherited"
                  v-model.number="startingHeadcount"
                  :min="0"
                  :step="0.1"
                  :max-fraction-digits="1"
                  aria-label="Starting roster headcount for the first month"
                />
                <template v-else>{{ props.formatNumber(record.startingRosterHeadcount, 1) }}</template>
              </td>
              <td>
                <AppTableNumberField
                  v-if="record.monthIndex === 0 && !props.startingPositionInherited"
                  v-model.number="startingFrontlineHeadcount"
                  :min="0"
                  :max="startingHeadcount"
                  :step="0.1"
                  :max-fraction-digits="1"
                  aria-label="Starting frontline headcount for the first month"
                />
                <template v-else>{{ props.formatNumber(record.startingFrontlineHeadcount, 1) }}</template>
            </td>
            <td>{{ props.formatNumber(record.hireHeadcount, 1) }}</td>
              <td>{{ props.formatNumber(record.graduatingHeadcount, 1) }}</td>
              <td>{{ props.formatNumber(record.inTrainingHeadcount, 1) }}</td>
              <td>
                <AppTableNumberField
                  v-model.number="staffingMonths[record.monthIndex].frontlineAttritionHeadcount"
                  :min="0"
                  :step="0.1"
                  :max-fraction-digits="1"
                  :title="`Derived attrition: ${props.formatNumber(record.frontlineAttritionPercent, 1)}% of starting frontline headcount`"
                  aria-label="Frontline attrition headcount"
                />
            </td>
            <td>{{ props.formatNumber(record.endingRosterHeadcount, 1) }}</td>
            <td>
              <div v-if="record.monthIndex === 11 && yearEndTargetEnabled" class="grid gap-1">
                <AppTableNumberField
                  v-model.number="yearEndHeadcountTarget"
                  :min="0"
                  :step="0.1"
                  :max-fraction-digits="1"
                  :placeholder="props.formatNumber(record.endingFrontlineHeadcount, 1)"
                  aria-label="December ending frontline headcount target"
                />
                <p class="text-[0.68rem] font-medium leading-4 text-slate-500">
                  Projected: {{ props.formatNumber(record.endingFrontlineHeadcount, 1) }}
                </p>
              </div>
              <template v-else>{{ props.formatNumber(record.endingFrontlineHeadcount, 1) }}</template>
            </td>
            <td :class="gapClass(record.gapToRequirement)">{{ formatSignedNumber(record.gapToRequirement, 1) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
