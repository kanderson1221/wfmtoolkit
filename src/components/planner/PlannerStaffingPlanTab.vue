<script setup>
import { computed, ref } from 'vue'

import PlannerTrainingSettingsModal from './PlannerTrainingSettingsModal.vue'
import { createTrainingClass, createTrainingSettings, deriveTrainingClassMetrics } from '../../plannerModel'

const props = defineProps({
  planningYear: {
    type: Number,
    required: true
  },
  staffingRecords: {
    type: Array,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['recommend-classes', 'save'])

const trainingSettings = defineModel('trainingSettings', {
  type: Object,
  required: true
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

const trainingClasses = defineModel('trainingClasses', {
  type: Array,
  default: () => []
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
})

const resolveHireDate = (trainingClass) => createTrainingClass(trainingClass).hireDate

const parseSortableDate = (value) => {
  if (!value) return null

  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const selectedMonthLabel = computed(
  () => props.staffingRecords[selectedMonthIndex.value]?.fullLabel || 'selected month'
)
const selectedMonthStart = computed(() => new Date(props.planningYear, selectedMonthIndex.value, 1))
const selectedMonthEnd = computed(() => new Date(props.planningYear, selectedMonthIndex.value + 1, 0, 23, 59, 59, 999))
const normalizedTrainingSettings = computed(() => createTrainingSettings(trainingSettings.value))
const canRecommendClasses = computed(
  () =>
    normalizedTrainingSettings.value.availableTrainers > 0 &&
    normalizedTrainingSettings.value.maxClassSize > 0 &&
    normalizedTrainingSettings.value.trainingDurationWorkdays > 0 &&
    normalizedTrainingSettings.value.graduationYieldPercent > 0
)
const trainingSettingsOpen = ref(false)
const sortedTrainingClasses = computed(() =>
  [...trainingClasses.value].sort((left, right) => {
    const leftDate = parseSortableDate(resolveHireDate(left))
    const rightDate = parseSortableDate(resolveHireDate(right))

    if (leftDate && rightDate) {
      return leftDate - rightDate || left.id.localeCompare(right.id)
    }

    if (leftDate) return -1
    if (rightDate) return 1

    return left.id.localeCompare(right.id)
  })
)

const getTrainingMetrics = (trainingClass) =>
  deriveTrainingClassMetrics(trainingClass, normalizedTrainingSettings.value)

const formatDerivedDate = (date) => (date ? shortDateFormatter.format(date) : '—')

const getTrainingStatus = (trainingClass) => {
  const metrics = getTrainingMetrics(trainingClass)

  if (!metrics.isValid) {
    return { label: 'Invalid Dates', tone: 'invalid' }
  }

  if (metrics.frontlineReadyDate >= selectedMonthStart.value && metrics.frontlineReadyDate <= selectedMonthEnd.value) {
    return { label: 'Frontline This Month', tone: 'frontline' }
  }

  if (metrics.graduationDate >= selectedMonthStart.value && metrics.graduationDate <= selectedMonthEnd.value) {
    return { label: 'Graduating This Month', tone: 'graduating' }
  }

  if (metrics.hireDate > selectedMonthEnd.value) {
    return { label: 'Future', tone: 'future' }
  }

  if (metrics.frontlineReadyDate < selectedMonthStart.value) {
    return { label: 'Frontline', tone: 'frontline' }
  }

  if (metrics.graduationDate < selectedMonthStart.value) {
    return { label: 'Nesting', tone: 'nesting' }
  }

  return { label: 'In Training', tone: 'training' }
}

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}

const addTrainingClass = () => {
  trainingClasses.value = [
    ...trainingClasses.value,
    createTrainingClass({
      id: `training-class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      hireDate: '',
      hireCount: normalizedTrainingSettings.value.maxClassSize,
      source: 'manual'
    })
  ]
}

const removeTrainingClass = (classId) => {
  trainingClasses.value = trainingClasses.value.filter((trainingClass) => trainingClass.id !== classId)
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
  <section class="results-panel monthly-tab-panel staffing-plan-panel">
    <header class="monthly-tab-header">
      <div>
        <h3>Build the staffing plan against the demand model</h3>
      </div>
    </header>

    <section class="input-group-card staffing-training-panel">
      <div class="workspace-output-header">
        <h3>Hiring / Training Pipeline</h3>
      </div>

      <div class="training-class-toolbar">
        <button type="button" class="secondary-btn" @click="trainingSettingsOpen = true">Training Settings</button>
        <button type="button" class="secondary-btn" @click="addTrainingClass">Add Training Class</button>
        <button
          type="button"
          class="secondary-btn"
          :disabled="!canRecommendClasses"
          title="Recommend class start dates and sizes from the current training settings."
          @click="emit('recommend-classes')"
        >
          Recommend Classes
        </button>
      </div>

      <div class="assumption-table-shell">
        <table class="assumption-table assumption-table-training">
          <thead>
            <tr>
              <th title="Date the class is hired into the roster and enters training.">Hire Date</th>
              <th title="Heads entering the class on the hire date.">Hire Count</th>
              <th title="Derived class end date based on the global training duration in workdays.">Graduation Date</th>
              <th title="Derived graduating headcount after applying the global graduation yield.">
                <span class="plan-head-label">Projected Grad<br />HC</span>
              </th>
              <th title="Derived frontline-ready date after applying post-training nesting days.">Frontline Ready</th>
              <th :title="`Status relative to ${selectedMonthLabel}.`">Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!trainingClasses.length">
              <td colspan="7" class="training-empty-state">
                Add a training class or use recommendations to start feeding hire and graduation headcount into the staffing plan.
              </td>
            </tr>
            <tr
              v-for="trainingClass in sortedTrainingClasses"
              :key="trainingClass.id"
              :class="{ 'training-class-recommended': createTrainingClass(trainingClass).source === 'recommended' }"
            >
              <td>
                <input
                  v-model="trainingClass.hireDate"
                  type="date"
                  aria-label="Training class hire date"
                />
              </td>
              <td>
                <input
                  v-model.number="trainingClass.hireCount"
                  type="number"
                  min="0"
                  step="1"
                  aria-label="Training class hire count"
                />
              </td>
              <td>{{ formatDerivedDate(getTrainingMetrics(trainingClass).graduationDate) }}</td>
              <td>{{ props.formatNumber(getTrainingMetrics(trainingClass).projectedGraduatingHeadcount, 1) }}</td>
              <td>{{ formatDerivedDate(getTrainingMetrics(trainingClass).frontlineReadyDate) }}</td>
              <td>
                <span
                  class="training-status-pill"
                  :class="`training-status-${getTrainingStatus(trainingClass).tone}`"
                >
                  {{ getTrainingStatus(trainingClass).label }}
                </span>
              </td>
              <td class="training-action-cell">
                <button type="button" class="danger-btn compact-btn" @click="removeTrainingClass(trainingClass.id)">
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="input-group-card staffing-plan-table-panel">
      <div class="workspace-output-header">
        <h3>Monthly Staffing Supply</h3>
      </div>

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
              <th title="People who finish training and become frontline-ready during the month.">
                <span class="plan-head-label">Graduates to<br />Frontline</span>
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
                <input
                  v-if="record.monthIndex === 0"
                  v-model.number="startingHeadcount"
                  type="number"
                  min="0"
                  step="0.1"
                  aria-label="Starting roster headcount for the first month"
                />
                <template v-else>{{ props.formatNumber(record.startingRosterHeadcount, 1) }}</template>
              </td>
              <td>
                <input
                  v-if="record.monthIndex === 0"
                  v-model.number="startingFrontlineHeadcount"
                  type="number"
                  min="0"
                  :max="startingHeadcount"
                  step="0.1"
                  aria-label="Starting frontline headcount for the first month"
                />
                <template v-else>{{ props.formatNumber(record.startingFrontlineHeadcount, 1) }}</template>
              </td>
              <td>{{ props.formatNumber(record.hireHeadcount, 1) }}</td>
              <td>{{ props.formatNumber(record.graduatingHeadcount, 1) }}</td>
              <td>{{ props.formatNumber(record.inTrainingHeadcount, 1) }}</td>
              <td>
                <input
                  v-model.number="staffingMonths[record.monthIndex].frontlineAttritionHeadcount"
                  type="number"
                  min="0"
                  step="0.1"
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
    </section>

    <div class="monthly-tab-actions">
      <button type="button" class="submit-btn" @click="emit('save')">Save Plan</button>
    </div>

    <PlannerTrainingSettingsModal
      v-if="trainingSettingsOpen"
      v-model:training-settings="trainingSettings"
      :format-number="props.formatNumber"
      @close="trainingSettingsOpen = false"
    />
  </section>
</template>
