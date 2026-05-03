<script setup>
import { computed, ref } from 'vue'
import { mdiChevronDown, mdiChevronRight, mdiDotsVertical } from '@mdi/js'

import { createTrainingClass, createTrainingSettings, deriveTrainingClassMetrics } from '../../plannerModel'
import AppButton from '../ui/AppButton.vue'
import AppIcon from '../ui/AppIcon.vue'
import AppMenu from '../ui/AppMenu.vue'
import AppTableDateField from '../ui/AppTableDateField.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'

const props = defineProps({
  planningYear: {
    type: Number,
    required: true
  },
  inheritedTrainingClasses: {
    type: Array,
    default: () => []
  },
  trainingCalendar: {
    type: Object,
    default: () => ({})
  },
  formatNumber: {
    type: Function,
    required: true
  },
  selectedMonthIndex: {
    type: Number,
    required: true
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['open-settings', 'recommend-classes'])

const trainingSettings = defineModel('trainingSettings', {
  type: Object,
  required: true
})

const trainingClasses = defineModel('trainingClasses', {
  type: Array,
  default: () => []
})

const pipelineOpen = ref(trainingClasses.value.length === 0)

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
})
const planYearMinDate = computed(() => `${props.planningYear}-01-01`)
const planYearMaxDate = computed(() => `${props.planningYear}-12-31`)

const resolveHireDate = (trainingClass) => createTrainingClass(trainingClass).hireDate

const parseSortableDate = (value) => {
  if (!value) return null

  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const selectedMonthLabel = computed(
  () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(props.planningYear, props.selectedMonthIndex, 1))
)
const selectedMonthStart = computed(() => new Date(props.planningYear, props.selectedMonthIndex, 1))
const selectedMonthEnd = computed(() => new Date(props.planningYear, props.selectedMonthIndex + 1, 0, 23, 59, 59, 999))
const normalizedTrainingSettings = computed(() => createTrainingSettings(trainingSettings.value))
const canRecommendClasses = computed(
  () =>
    normalizedTrainingSettings.value.availableTrainers > 0 &&
    normalizedTrainingSettings.value.maxClassSize > 0 &&
    normalizedTrainingSettings.value.trainingDurationWorkdays > 0 &&
    normalizedTrainingSettings.value.graduationYieldPercent > 0
)
const isInheritedTrainingClass = (trainingClass) => createTrainingClass(trainingClass).source === 'inherited'
const combinedTrainingClasses = computed(() => [
  ...props.inheritedTrainingClasses,
  ...trainingClasses.value
])
const sortedTrainingClasses = computed(() =>
  [...combinedTrainingClasses.value].sort((left, right) => {
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
  deriveTrainingClassMetrics(trainingClass, normalizedTrainingSettings.value, props.trainingCalendar)

const formatDerivedDate = (date) => (date ? shortDateFormatter.format(date) : '—')
const formatHireDate = (value) => {
  const parsed = parseSortableDate(value)
  return parsed ? shortDateFormatter.format(parsed) : '—'
}

const getTrainingStatus = (trainingClass) => {
  const metrics = getTrainingMetrics(trainingClass)

  if (!metrics.isValid) {
    return { label: 'Invalid Dates', tone: 'invalid' }
  }

  if (!isInheritedTrainingClass(trainingClass) && metrics.hireDate.getFullYear() !== props.planningYear) {
    return { label: 'Outside Plan Year', tone: 'invalid' }
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

const addTrainingClass = () => {
  if (props.readOnly) {
    return
  }

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
  if (props.readOnly) {
    return
  }

  trainingClasses.value = trainingClasses.value.filter((trainingClass) => trainingClass.id !== classId)
}

const trainingClassSummary = computed(() => {
  const localCount = trainingClasses.value.length
  const inheritedCount = props.inheritedTrainingClasses.length
  const count = localCount + inheritedCount

  if (count === 0) {
    return 'No classes yet'
  }

  if (inheritedCount === 0) {
    return `${count} class${count === 1 ? '' : 'es'}`
  }

  if (localCount === 0) {
    return `${inheritedCount} carry-in class${inheritedCount === 1 ? '' : 'es'}`
  }

  return `${localCount} class${localCount === 1 ? '' : 'es'} + ${inheritedCount} carry-in`
})

const getInheritedOriginLabel = (trainingClass) => {
  const inheritedYear = Number(trainingClass?.inheritedFromPlanningYear)

  if (Number.isFinite(inheritedYear)) {
    return `Inherited from ${inheritedYear} plan`
  }

  return 'Inherited from prior plan'
}

const trainingClassMenuItems = [
  {
    id: 'delete-training-class',
    label: 'Delete'
  }
]

const handleTrainingClassMenuSelect = (trainingClass, item) => {
  if (props.readOnly) {
    return
  }

  if (item.id === 'delete-training-class') {
    removeTrainingClass(trainingClass.id)
  }
}
</script>

<template>
  <section class="grid gap-0">
    <div :class="['training-pipeline-header', { 'training-pipeline-header-open': pipelineOpen }]">
      <button
        type="button"
        class="training-pipeline-toggle"
        :aria-expanded="pipelineOpen ? 'true' : 'false'"
        aria-controls="training-pipeline-content"
        @click="pipelineOpen = !pipelineOpen"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span class="training-pipeline-toggle-icon" aria-hidden="true">
            <AppIcon :path="pipelineOpen ? mdiChevronDown : mdiChevronRight" class="h-4 w-4" />
          </span>
          <div class="grid min-w-0 gap-0.5 text-left">
            <h3 class="text-base font-semibold tracking-[-0.03em] text-slate-950">Hiring / Training Pipeline</h3>
            <p class="text-sm text-slate-600">{{ trainingClassSummary }}</p>
          </div>
        </div>
      </button>

      <div v-if="pipelineOpen && !props.readOnly" class="training-class-toolbar">
        <AppButton variant="secondary" @click="emit('open-settings')">Training Settings</AppButton>
        <AppButton variant="primary" @click="addTrainingClass">Add Training Class</AppButton>
        <AppButton
          variant="secondary"
          :disabled="!canRecommendClasses"
          title="Recommend class start dates and sizes from the current training settings."
          @click="emit('recommend-classes')"
        >
          Recommend Classes
        </AppButton>
      </div>
    </div>

    <div v-if="pipelineOpen" id="training-pipeline-content" class="training-pipeline-content">
      <div class="assumption-table-shell training-pipeline-shell">
        <table class="assumption-table assumption-table-training">
          <thead>
            <tr>
              <th title="Date the class is hired into the roster and enters training.">Hire Date</th>
              <th title="Heads entering the class on the hire date.">Hire Count</th>
              <th title="Derived class end date based on the global training duration in workdays.">Graduation Date</th>
              <th title="Full class headcount scheduled to finish training on the graduation date.">
                <span class="plan-head-label">Graduating<br />Headcount</span>
              </th>
              <th title="Derived frontline-ready date after applying post-training nesting days.">Frontline Ready</th>
              <th :title="`Status relative to ${selectedMonthLabel}.`">Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!sortedTrainingClasses.length">
              <td colspan="7" class="training-empty-state">
                {{ props.readOnly
                  ? 'No training classes are planned for this budget.'
                  : 'Add a training class or use recommendations to start feeding hire and graduation headcount into the staffing plan.' }}
              </td>
            </tr>
            <tr
              v-for="trainingClass in sortedTrainingClasses"
              :key="trainingClass.id"
              :class="{
                'training-class-recommended': ['recommended', 'recommended-cross-year'].includes(createTrainingClass(trainingClass).source),
                'training-class-inherited': isInheritedTrainingClass(trainingClass),
              }"
            >
              <td>
                <div v-if="isInheritedTrainingClass(trainingClass)" class="grid gap-1">
                  <span class="font-medium text-slate-800">{{ formatHireDate(resolveHireDate(trainingClass)) }}</span>
                  <span class="training-origin-pill">{{ getInheritedOriginLabel(trainingClass) }}</span>
                </div>
                <template v-else-if="props.readOnly">
                  {{ formatHireDate(resolveHireDate(trainingClass)) }}
                </template>
                <AppTableDateField
                  v-else
                  v-model="trainingClass.hireDate"
                  :min="planYearMinDate"
                  :max="planYearMaxDate"
                  aria-label="Training class hire date"
                />
              </td>
              <td>
                <template v-if="isInheritedTrainingClass(trainingClass) || props.readOnly">
                  {{ props.formatNumber(trainingClass.hireCount, 1) }}
                </template>
                <AppTableNumberField
                  v-else
                  v-model.number="trainingClass.hireCount"
                  min="0"
                  step="1"
                  aria-label="Training class hire count"
                />
              </td>
              <td>{{ formatDerivedDate(getTrainingMetrics(trainingClass).graduationDate) }}</td>
              <td>{{ props.formatNumber(getTrainingMetrics(trainingClass).graduatingHeadcount, 1) }}</td>
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
                <span v-if="isInheritedTrainingClass(trainingClass) || props.readOnly" class="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
                  Read only
                </span>
                <AppMenu
                  v-else
                  :items="trainingClassMenuItems"
                  :trigger-icon="mdiDotsVertical"
                  :trigger-label="`Open actions for training class starting ${resolveHireDate(trainingClass) || 'unscheduled'}`"
                  compact
                  trigger-variant="icon-quiet"
                  @select="handleTrainingClassMenuSelect(trainingClass, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
