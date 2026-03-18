<script setup>
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

const props = defineProps({
  staffingRecords: {
    type: Array,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
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
</script>

<template>
  <AppWorkspaceSection
    class="staffing-plan-table-panel"
    title="Monthly Staffing Supply"
    description="Review opening supply, monthly movement, and the resulting frontline gap against the demand model."
  >
    <div class="assumption-table-shell">
      <table class="assumption-table assumption-table-staffing">
        <thead>
          <tr>
            <th title="Planning month. Click a month name to highlight that row.">Month</th>
            <th title="Frontline headcount required by the demand model for this month.">
              <span class="plan-head-label">Required<br />Headcount</span>
            </th>
            <th title="Total headcount on the roster at the start of the month, before any monthly movement is applied.">
              <span class="plan-head-label">Starting Total<br />Headcount</span>
            </th>
            <th title="Productive frontline headcount available at the start of the month before graduates and attrition are applied.">
              <span class="plan-head-label">Starting Frontline<br />Headcount</span>
            </th>
            <th title="Total people hired into training during the month.">
              <span class="plan-head-label">Hired into<br />Training</span>
            </th>
            <th title="Full class headcount scheduled to finish training during the month. Graduation yield still affects how many become frontline-ready after nesting.">
              <span class="plan-head-label">Graduating<br />Headcount</span>
            </th>
            <th title="People still in training at the end of the month and therefore not yet available as frontline supply.">
              <span class="plan-head-label">Still in Training<br />Month End</span>
            </th>
            <th title="Planned frontline exits for the month. This reduces both total headcount and frontline headcount.">
              <span class="plan-head-label">Frontline Attrition<br />Headcount</span>
            </th>
            <th title="Total headcount remaining on the roster at the end of the month after hires, fallout, and attrition.">
              <span class="plan-head-label">Ending Total<br />Headcount</span>
            </th>
            <th title="Productive frontline headcount available at the end of the month after graduates and attrition are applied.">
              <span class="plan-head-label">Ending Frontline<br />Headcount</span>
            </th>
            <th title="Starting frontline headcount minus required headcount from the demand model. Negative values indicate the month opens short.">
              <span class="plan-head-label">Opening Frontline<br />Gap</span>
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
                @click="setSelectedMonth(record.monthIndex)"
              >
                {{ record.fullLabel }}
              </button>
            </td>
              <td>{{ props.formatNumber(record.requiredHeadcount, 1) }}</td>
              <td>
                <AppTableNumberField
                  v-if="record.monthIndex === 0"
                  v-model.number="startingHeadcount"
                  min="0"
                  step="0.1"
                  :max-fraction-digits="1"
                  aria-label="Starting roster headcount for the first month"
                />
                <template v-else>{{ props.formatNumber(record.startingRosterHeadcount, 1) }}</template>
              </td>
              <td>
                <AppTableNumberField
                  v-if="record.monthIndex === 0"
                  v-model.number="startingFrontlineHeadcount"
                  min="0"
                  :max="startingHeadcount"
                  step="0.1"
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
                  min="0"
                  step="0.1"
                  :max-fraction-digits="1"
                  :title="`Derived attrition: ${props.formatNumber(record.frontlineAttritionPercent, 1)}% of starting frontline HC`"
                  aria-label="Frontline attrition headcount"
                />
            </td>
            <td>{{ props.formatNumber(record.endingRosterHeadcount, 1) }}</td>
            <td>{{ props.formatNumber(record.endingFrontlineHeadcount, 1) }}</td>
            <td :class="gapClass(record.gapToRequirement)">{{ formatSignedNumber(record.gapToRequirement, 1) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppWorkspaceSection>
</template>
