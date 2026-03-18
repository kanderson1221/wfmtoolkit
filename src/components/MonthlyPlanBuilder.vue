<script setup>
import { reactive } from 'vue'

import PlannerMonthlyPlanTab from './planner/PlannerMonthlyPlanTab.vue'
import PlannerPresenceTab from './planner/PlannerPresenceTab.vue'
import PlannerRandomTab from './planner/PlannerRandomTab.vue'
import PlannerSettingsModal from './planner/PlannerSettingsModal.vue'
import PlannerStaffingPlanTab from './planner/PlannerStaffingPlanTab.vue'
import PlannerTabStrip from './planner/PlannerTabStrip.vue'
import PlannerWorkspaceHeader from './planner/PlannerWorkspaceHeader.vue'
import AppPanel from './ui/AppPanel.vue'
import { useMonthlyPlanBuilder } from '../composables/useMonthlyPlanBuilder'

const props = defineProps({
  initialPlan: {
    type: Object,
    default: null
  },
  centerDefaults: {
    type: Object,
    default: null
  },
  draftKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['save', 'cancel'])

const TABS = [
  {
    id: 'presence',
    title: 'Presence / Utilization'
  },
  {
    id: 'random',
    title: 'Random'
  },
  {
    id: 'plan',
    title: 'Headcount Requirement'
  }
]

const MODES = [
  { id: 'plan', title: 'Demand Model' },
  { id: 'staffing', title: 'Staffing Plan' }
]

const builder = reactive(useMonthlyPlanBuilder(props, emit))

const movePlannerTab = (direction) => builder.moveTab(direction, TABS)
</script>

<template>
  <section id="monthly-plan" class="calculator-section">
    <div class="app-frame">
      <AppPanel :padded="false" class="monthly-flow-card">
        <div class="monthly-flow-shell">
          <PlannerWorkspaceHeader
            :title="builder.displayPlanName"
            :planning-year="builder.planningYear"
            :operating-weekday-label="builder.operatingWeekdayLabel"
            :autosave-status-message="builder.autosaveStatusMessage"
            :autosave-state="builder.autosaveState"
            :warning-count="builder.plannerWarnings.length"
            @open-settings="builder.openSettings"
            @save="builder.savePlan"
            @back="builder.cancelEditor"
          />

          <PlannerSettingsModal
            v-if="builder.settingsOpen"
            v-model:plan-name="builder.planName"
            v-model:planning-year="builder.planningYear"
            :can-close="builder.canCloseSettings"
            :allow-backdrop-close="builder.allowSettingsBackdropClose"
            :status-message="builder.settingsStatusMessage"
            :status-tone="builder.settingsStatusTone"
            :year-options="builder.yearOptions"
            @cancel="builder.cancelSettings"
            @close="builder.closeSettings"
            @load-example="builder.loadExamplePlan"
            @reset="builder.resetPlanner"
          />

          <PlannerTabStrip
            v-model:active-id="builder.activeMode"
            :items="MODES"
            aria-label="Planner mode"
          />

          <PlannerTabStrip
            v-if="builder.activeMode !== 'staffing'"
            v-model:active-id="builder.activeTab"
            :items="TABS"
            aria-label="Monthly planner sections"
          />

          <PlannerStaffingPlanTab
            v-if="builder.activeMode === 'staffing'"
            :planning-year="builder.planningYear"
            v-model:starting-headcount="builder.startingHeadcount"
            v-model:starting-frontline-headcount="builder.startingFrontlineHeadcount"
            v-model:training-settings="builder.trainingSettings"
            v-model:staffing-months="builder.staffingMonths"
            v-model:training-classes="builder.trainingClasses"
            v-model:selected-month-index="builder.selectedMonthIndex"
            :staffing-records="builder.staffingRecords"
            :format-number="builder.formatNumber"
            @recommend-classes="builder.generateRecommendedTrainingClasses"
            @save="builder.savePlan"
          />

          <PlannerPresenceTab
            v-else-if="builder.activeTab === 'presence'"
            v-model:presence-months="builder.presenceMonths"
            v-model:selected-month-index="builder.selectedMonthIndex"
            :monthly-records="builder.monthlyRecords"
            :summary="builder.presenceSummary"
            :format-whole="builder.formatWhole"
            :format-number="builder.formatNumber"
            :format-percent="builder.formatPercent"
            @copy-action="builder.handlePresenceCopyAction"
            @continue="movePlannerTab(1)"
          />

          <PlannerRandomTab
            v-else-if="builder.activeTab === 'random'"
            v-model:random-defaults="builder.randomDefaults"
            v-model:use-monthly-random-overrides="builder.useMonthlyRandomOverrides"
            v-model:random-months="builder.randomMonths"
            v-model:selected-month-index="builder.selectedMonthIndex"
            :monthly-records="builder.monthlyRecords"
            :summary="builder.randomSummary"
            :format-percent="builder.formatPercent"
            @copy-action="builder.handleRandomCopyAction"
            @previous="movePlannerTab(-1)"
            @continue="movePlannerTab(1)"
            @toggle-override-mode="builder.setRandomOverrideMode"
          />

          <PlannerMonthlyPlanTab
            v-else
            v-model:plan-months="builder.planMonths"
            v-model:selected-month-index="builder.selectedMonthIndex"
            :monthly-records="builder.monthlyRecords"
            :plan-summary="builder.planSummary"
            :monthly-chart-max="builder.monthlyChartMax"
            :format-whole="builder.formatWhole"
            :format-number="builder.formatNumber"
            :format-percent="builder.formatPercent"
            :format-factor="builder.formatFactor"
            @previous="movePlannerTab(-1)"
            @save="builder.savePlan"
          />
        </div>
      </AppPanel>
    </div>
  </section>
</template>
