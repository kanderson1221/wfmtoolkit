<script setup>
import { computed, reactive } from 'vue'

import PlannerActualsPanel from './planner/PlannerActualsPanel.vue'
import PlannerMonthlyPlanTab from './planner/PlannerMonthlyPlanTab.vue'
import PlannerOverviewPanel from './planner/PlannerOverviewPanel.vue'
import PlannerPresenceTab from './planner/PlannerPresenceTab.vue'
import PlannerRandomTab from './planner/PlannerRandomTab.vue'
import PlannerSectionNav from './planner/PlannerSectionNav.vue'
import PlannerStaffingPlanTab from './planner/PlannerStaffingPlanTab.vue'
import PlannerWorkspaceHeader from './planner/PlannerWorkspaceHeader.vue'
import AppBreadcrumbs from './ui/AppBreadcrumbs.vue'
import AppButton from './ui/AppButton.vue'
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
  groupPlans: {
    type: Array,
    default: () => []
  },
  prefilledYear: {
    type: Number,
    default: null
  },
  draftKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['save', 'cancel'])

const builder = reactive(useMonthlyPlanBuilder(props, emit))

const availabilityReady = computed(() =>
  builder.monthlyRecords.every((record) => record.paidHoursPerMonth > 0 && record.scheduledPercent > 0)
)

const variabilityReady = computed(() => builder.randomSummary.averageRandomLossPercent > 0)

const requirementReady = computed(() =>
  builder.planSummary.annualContacts > 0 && builder.planSummary.averageRequiredHeadcount > 0
)

const staffingStarted = computed(() =>
  builder.startingHeadcount > 0 ||
  builder.trainingClasses.length > 0 ||
  builder.staffingMonths.some((month) => month.frontlineAttritionHeadcount > 0)
)

const staffingReady = computed(() => staffingStarted.value)
const actualsStarted = computed(() => builder.actualsSummary.loadedMonthsCount > 0)

const planComplete = computed(() =>
  availabilityReady.value &&
  variabilityReady.value &&
  requirementReady.value &&
  staffingReady.value
)

const forecastEntryStep = computed(() => {
  if (!availabilityReady.value) {
    return 'availability'
  }

  if (!variabilityReady.value) {
    return 'variability'
  }

  if (!requirementReady.value) {
    return 'requirement'
  }

  return 'requirement'
})

const workflowSections = computed(() => [
  {
    id: 'plan',
    label: 'Plan',
    items: [
      {
        id: 'overview',
        title: 'Overview',
        statusLabel: 'Start here',
        tone: 'default'
      },
      {
        id: 'availability',
        title: 'Agent Availability',
        statusLabel: availabilityReady.value ? 'Ready' : 'Needs input',
        tone: availabilityReady.value ? 'ready' : 'attention'
      },
      {
        id: 'variability',
        title: 'Variability Buffer',
        statusLabel: variabilityReady.value ? 'Ready' : 'Needs input',
        tone: variabilityReady.value ? 'ready' : 'attention'
      },
      {
        id: 'requirement',
        title: 'Required Headcount',
        statusLabel: requirementReady.value ? 'Ready' : 'Needs input',
        tone: requirementReady.value ? 'ready' : 'attention'
      },
      {
        id: 'staffing',
        title: 'Staffing Plan',
        statusLabel: staffingReady.value ? 'Ready' : staffingStarted.value ? 'In progress' : 'Not started',
        tone: staffingReady.value ? 'ready' : staffingStarted.value ? 'attention' : 'default'
      }
    ]
  },
  {
    id: 'actuals',
    label: 'Actuals',
    items: [
      {
        id: 'actuals',
        title: 'Actuals & Variance',
        statusLabel: actualsStarted.value ? `${builder.actualsSummary.loadedMonthsCount} months` : 'Not started',
        tone: actualsStarted.value ? 'ready' : 'default'
      }
    ]
  }
])

const overviewCards = computed(() => [
  {
    id: 'availability',
    title: 'Agent Availability',
    description: 'Set paid time, absence, and off-phone losses so one FTE has realistic scheduled capacity.',
    statusLabel: availabilityReady.value ? 'Ready' : 'Needs input',
    actionLabel: 'Open Agent Availability'
  },
  {
    id: 'variability',
    title: 'Variability Buffer',
    description: 'Apply adherence and occupancy assumptions before the requirement is finalized.',
    statusLabel: variabilityReady.value ? 'Ready' : 'Needs input',
    actionLabel: 'Open Variability Buffer'
  },
  {
    id: 'requirement',
    title: 'Required Headcount',
    description: 'Turn contacts and AHT into the frontline headcount the staffing plan needs to cover.',
    statusLabel: requirementReady.value ? 'Ready' : 'Needs input',
    actionLabel: 'Open Required Headcount'
  },
  {
    id: 'staffing',
    title: 'Staffing Plan',
    description: 'Layer in starting position, hiring, training, and attrition against the requirement.',
    statusLabel: staffingReady.value ? 'Ready' : staffingStarted.value ? 'In progress' : 'Not started',
    actionLabel: 'Open Staffing Plan'
  }
])

const nextRecommendation = computed(() => {
  if (planComplete.value) {
    return null
  }

  if (!availabilityReady.value) {
    return {
      title: 'Forecast Need: Agent Availability',
      description: 'Start by setting paid time, absence, and off-phone losses so the model knows how much scheduled time one FTE can actually deliver.',
      sectionId: 'availability',
      actionLabel: 'Open Agent Availability'
    }
  }

  if (!requirementReady.value) {
    return {
      title: 'Forecast Need: Required Frontline Headcount',
      description: 'Enter contacts and AHT so the planner can translate workload into the frontline headcount you need each month.',
      sectionId: 'requirement',
      actionLabel: 'Open Required Headcount'
    }
  }

  if (!staffingStarted.value) {
    return {
      title: 'Plan Staffing',
      description: 'Now turn that requirement into a hiring, training, attrition, and frontline supply plan.',
      sectionId: 'staffing',
      actionLabel: 'Open Staffing Plan'
    }
  }

  return null
})

const openWorkflowDestination = ({ sectionId, stepId } = {}) => {
  if (stepId) {
    builder.setActiveSection(stepId)
    return
  }

  if (sectionId) {
    builder.setActiveSection(sectionId === 'forecast' ? forecastEntryStep.value : sectionId)
  }
}

const breadcrumbItems = computed(() => {
  const centerId = props.centerDefaults?.centerId
  const groupId = props.centerDefaults?.groupId
  const centerName = props.centerDefaults?.centerName || 'Call Center'
  const groupName = props.centerDefaults?.groupName || 'Staffing Group'

  return [
    { label: 'Home', href: '#home' },
    { label: 'Call Centers', href: '#planning' },
    ...(centerId ? [{ label: centerName, href: `#planning/center/${centerId}` }] : []),
    ...(centerId && groupId
      ? [{ label: groupName, href: `#planning/center/${centerId}/group/${groupId}` }]
      : []),
    { label: builder.displayPlanLabel }
  ]
})
</script>

<template>
  <section id="monthly-plan" class="calculator-section">
    <div class="app-frame">
      <div class="mb-1 flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-0.5">
          <AppBreadcrumbs :items="breadcrumbItems" />
          <h1 class="text-[clamp(1.35rem,1.8vw,1.75rem)] font-semibold tracking-[-0.04em] text-slate-950">
            {{ builder.displayPlanLabel }}
          </h1>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <PlannerWorkspaceHeader
            :autosave-status-message="builder.autosaveStatusMessage"
            :autosave-state="builder.autosaveState"
          />
          <AppButton size="md" variant="primary" @click="builder.savePlan">Save Plan</AppButton>
        </div>
      </div>

      <AppPanel :padded="false" class="monthly-flow-card">
        <div class="grid xl:grid-cols-[188px_minmax(0,1fr)] xl:items-start">
          <section class="border-b border-slate-200 p-3 xl:sticky xl:top-4 xl:border-b-0 xl:border-r">
            <div class="grid gap-2">
              <PlannerSectionNav
                v-model:active-id="builder.activeSection"
                :groups="workflowSections"
              />
            </div>
          </section>

          <section class="min-w-0 p-3">
            <div class="grid gap-3">
              <PlannerOverviewPanel
                v-if="builder.activeSection === 'overview'"
                :plan-summary="builder.planSummary"
                :staffing-summary="builder.staffingSummary"
                :section-cards="overviewCards"
                :next-recommendation="nextRecommendation"
                :plan-complete="planComplete"
                :format-whole="builder.formatWhole"
                :format-number="builder.formatNumber"
                @open-section="openWorkflowDestination"
              />

              <PlannerPresenceTab
                v-else-if="builder.activeSection === 'availability'"
                v-model:presence-months="builder.presenceMonths"
                :monthly-records="builder.monthlyRecords"
                :summary="builder.presenceSummary"
                :format-whole="builder.formatWhole"
                :format-number="builder.formatNumber"
                :format-percent="builder.formatPercent"
                @copy-action="builder.handlePresenceCopyAction"
                @continue="builder.setActiveForecastStep('variability')"
              />

              <PlannerRandomTab
                v-else-if="builder.activeSection === 'variability'"
                v-model:random-defaults="builder.randomDefaults"
                v-model:use-monthly-random-overrides="builder.useMonthlyRandomOverrides"
                v-model:random-months="builder.randomMonths"
                :monthly-records="builder.monthlyRecords"
                :summary="builder.randomSummary"
                :format-percent="builder.formatPercent"
                @copy-action="builder.handleRandomCopyAction"
                @previous="builder.moveForecastStep(-1)"
                @continue="builder.setActiveForecastStep('requirement')"
                @toggle-override-mode="builder.setRandomOverrideMode"
              />

              <PlannerMonthlyPlanTab
                v-else-if="builder.activeSection === 'requirement'"
                v-model:plan-months="builder.planMonths"
                v-model:selected-month-index="builder.selectedMonthIndex"
                :monthly-records="builder.monthlyRecords"
                :plan-summary="builder.planSummary"
                :format-whole="builder.formatWhole"
                :format-number="builder.formatNumber"
                :format-percent="builder.formatPercent"
                :format-factor="builder.formatFactor"
                @previous="builder.moveForecastStep(-1)"
                @continue="builder.setActiveSection('staffing')"
              />

              <PlannerStaffingPlanTab
                v-else-if="builder.activeSection === 'staffing'"
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

              <PlannerActualsPanel
                v-else-if="builder.activeSection === 'actuals'"
                v-model:actuals-months="builder.actualsMonths"
                :actuals-records="builder.actualsRecords"
                :actuals-summary="builder.actualsSummary"
                :format-whole="builder.formatWhole"
                :format-number="builder.formatNumber"
              />
            </div>
          </section>
        </div>
      </AppPanel>
    </div>
  </section>
</template>
