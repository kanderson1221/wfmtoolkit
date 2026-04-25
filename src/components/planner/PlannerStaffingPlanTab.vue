<script setup>
import { computed, ref } from 'vue'

import PlannerStaffingSupplyTable from './PlannerStaffingSupplyTable.vue'
import PlannerTrainingPipelineTable from './PlannerTrainingPipelineTable.vue'
import PlannerTrainingSettingsModal from './PlannerTrainingSettingsModal.vue'
import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'

const props = defineProps({
  requirementMethod: {
    type: String,
    default: ''
  },
  planningYear: {
    type: Number,
    required: true
  },
  yearEndTargetDefaults: {
    type: Object,
    required: true
  },
  staffingRecords: {
    type: Array,
    required: true
  },
  startingPositionInherited: {
    type: Boolean,
    default: false
  },
  startingPositionInheritedFromYear: {
    type: Number,
    default: null
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
  }
})

const emit = defineEmits(['recommend-classes', 'save'])

const trainingSettings = defineModel('trainingSettings', {
  type: Object,
  required: true
})

const nextYearOpening = defineModel('nextYearOpening', {
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

const trainingSettingsOpen = ref(false)
const yearEndTargetEnabled = computed({
  get: () => nextYearOpening.value?.frontlineHeadcount != null,
  set: (enabled) => {
    nextYearOpening.value = {
      rosterHeadcount: null,
      frontlineHeadcount: enabled ? props.yearEndTargetDefaults.frontlineHeadcount : null
    }
  }
})

const yearEndHeadcountTarget = computed({
  get: () => nextYearOpening.value?.frontlineHeadcount ?? null,
  set: (value) => {
    nextYearOpening.value = {
      rosterHeadcount: null,
      frontlineHeadcount: value == null ? null : value
    }
  }
})
</script>

<template>
  <section class="monthly-tab-panel staffing-plan-panel">
    <AppSectionHeader title="Staffing Plan" />

    <PlannerTrainingPipelineTable
      v-model:training-settings="trainingSettings"
      v-model:training-classes="trainingClasses"
      :inherited-training-classes="props.inheritedTrainingClasses"
      :planning-year="props.planningYear"
      :training-calendar="props.trainingCalendar"
      :format-number="props.formatNumber"
      :selected-month-index="selectedMonthIndex"
      @open-settings="trainingSettingsOpen = true"
      @recommend-classes="emit('recommend-classes')"
    />

    <PlannerStaffingSupplyTable
      v-model:starting-headcount="startingHeadcount"
      v-model:starting-frontline-headcount="startingFrontlineHeadcount"
      v-model:year-end-target-enabled="yearEndTargetEnabled"
      v-model:year-end-headcount-target="yearEndHeadcountTarget"
      v-model:staffing-months="staffingMonths"
      v-model:selected-month-index="selectedMonthIndex"
      :requirement-method="props.requirementMethod"
      :starting-position-inherited="props.startingPositionInherited"
      :starting-position-inherited-from-year="props.startingPositionInheritedFromYear"
      :staffing-records="props.staffingRecords"
      :format-number="props.formatNumber"
    />

    <div class="monthly-tab-actions">
      <AppButton variant="primary" @click="emit('save')">Save Plan</AppButton>
    </div>

    <PlannerTrainingSettingsModal
      v-if="trainingSettingsOpen"
      v-model:training-settings="trainingSettings"
      :format-number="props.formatNumber"
      @close="trainingSettingsOpen = false"
    />
  </section>
</template>
