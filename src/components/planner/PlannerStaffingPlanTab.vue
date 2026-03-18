<script setup>
import { ref } from 'vue'

import PlannerStaffingSupplyTable from './PlannerStaffingSupplyTable.vue'
import PlannerTrainingPipelineTable from './PlannerTrainingPipelineTable.vue'
import PlannerTrainingSettingsModal from './PlannerTrainingSettingsModal.vue'
import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'

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

const trainingSettingsOpen = ref(false)
</script>

<template>
  <section class="results-panel monthly-tab-panel staffing-plan-panel">
    <AppSectionHeader
      title="Build the staffing plan against the demand model"
      description="Use training classes and monthly attrition to translate the demand model into an opening and ending frontline supply plan."
    />

    <PlannerTrainingPipelineTable
      v-model:training-settings="trainingSettings"
      v-model:training-classes="trainingClasses"
      :planning-year="props.planningYear"
      :format-number="props.formatNumber"
      :selected-month-index="selectedMonthIndex"
      @open-settings="trainingSettingsOpen = true"
      @recommend-classes="emit('recommend-classes')"
    />

    <PlannerStaffingSupplyTable
      v-model:starting-headcount="startingHeadcount"
      v-model:starting-frontline-headcount="startingFrontlineHeadcount"
      v-model:staffing-months="staffingMonths"
      v-model:selected-month-index="selectedMonthIndex"
      :staffing-records="props.staffingRecords"
      :format-number="props.formatNumber"
    />

    <div class="monthly-tab-actions">
      <AppButton variant="primary" @click="emit('save')">Save Staffing Group</AppButton>
    </div>

    <PlannerTrainingSettingsModal
      v-if="trainingSettingsOpen"
      v-model:training-settings="trainingSettings"
      :format-number="props.formatNumber"
      @close="trainingSettingsOpen = false"
    />
  </section>
</template>
