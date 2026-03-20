<script setup>
import { computed, reactive } from 'vue'

import PlannerBudgetPanel from './planner/PlannerBudgetPanel.vue'
import PlannerForecastStepNav from './planner/PlannerForecastStepNav.vue'
import PlannerMonthlyPlanTab from './planner/PlannerMonthlyPlanTab.vue'
import PlannerOverviewPanel from './planner/PlannerOverviewPanel.vue'
import PlannerPresenceTab from './planner/PlannerPresenceTab.vue'
import PlannerRandomTab from './planner/PlannerRandomTab.vue'
import PlannerReviewPanel from './planner/PlannerReviewPanel.vue'
import PlannerSectionNav from './planner/PlannerSectionNav.vue'
import PlannerStaffingPlanTab from './planner/PlannerStaffingPlanTab.vue'
import PlannerWorkspaceHeader from './planner/PlannerWorkspaceHeader.vue'
import AppButton from './ui/AppButton.vue'
import AppPanel from './ui/AppPanel.vue'
import AppSectionHeader from './ui/AppSectionHeader.vue'
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

const inheritedAssumptionChips = computed(() => {
  if (!props.centerDefaults) {
    return []
  }

  return [
    {
      label: 'Time Zone',
      value: props.centerDefaults.timezone || 'Not set'
    },
    {
      label: 'Operating Days',
      value: builder.operatingWeekdayLabel
    },
    {
      label: 'Default Paid Hours / Day',
      value: builder.formatNumber(props.centerDefaults.defaultPaidHoursPerDay, 1)
    },
    {
      label: 'Default Occupancy',
      value: `${builder.formatNumber(props.centerDefaults.defaultOccupancyPercent, 1)}%`
    },
    {
      label: 'Default Adherence',
      value: `${builder.formatNumber(props.centerDefaults.defaultAdherencePercent, 1)}%`
    }
  ]
})

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

const staffingReady = computed(() =>
  staffingStarted.value && builder.staffingSummary.averageGapToRequirement >= 0
)

const reviewAvailable = computed(() => requirementReady.value || staffingStarted.value)

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
    id: 'overview',
    title: 'Overview',
    description: 'Start here to understand status, outputs, and the next recommended step for this plan.',
    statusLabel: 'Start here',
    tone: 'default'
  },
  {
    id: 'forecast',
    title: 'Forecast Need',
    description: 'Translate demand, agent availability, and variability into required frontline headcount.',
    statusLabel: requirementReady.value ? 'Ready' : 'Needs input',
    tone: requirementReady.value ? 'ready' : 'attention'
  },
  {
    id: 'staffing',
    title: 'Plan Staffing',
    description: 'Turn required headcount into hiring, training, attrition, and frontline supply.',
    statusLabel: staffingReady.value ? 'Ready' : staffingStarted.value ? 'In progress' : 'Not started',
    tone: staffingReady.value ? 'ready' : staffingStarted.value ? 'attention' : 'default'
  },
  {
    id: 'budget',
    title: 'Budget',
    description: 'Translate this plan into labor cost assumptions as budget features are added.',
    statusLabel: 'Coming soon',
    tone: 'upcoming'
  },
  {
    id: 'review',
    title: 'Review',
    description: 'See the full yearly picture before you finalize, export, or hand off the plan.',
    statusLabel: reviewAvailable.value ? 'Available' : 'Waiting',
    tone: reviewAvailable.value ? 'default' : 'upcoming'
  }
])

const forecastSteps = computed(() => [
  {
    id: 'availability',
    title: 'Agent Availability',
    description: 'Set paid time, absence, and off-phone losses so one FTE has realistic scheduled capacity.',
    tone: availabilityReady.value ? 'ready' : 'attention'
  },
  {
    id: 'variability',
    title: 'Variability Buffer',
    description: 'Apply adherence and occupancy assumptions that absorb real-world variability in scheduled time.',
    tone: variabilityReady.value ? 'ready' : 'attention'
  },
  {
    id: 'requirement',
    title: 'Required Frontline Headcount',
    description: 'Turn contacts and AHT into the frontline headcount the staffing plan needs to cover.',
    tone: requirementReady.value ? 'ready' : 'attention'
  }
])

const overviewCards = computed(() => [
  {
    id: 'forecast',
    title: 'Forecast Need',
    description: 'Build the requirement side first so the staffing plan knows what it has to cover.',
    statusLabel: requirementReady.value ? 'Ready' : 'Needs input',
    actionLabel: 'Open Forecast Need',
    stepId: forecastEntryStep.value
  },
  {
    id: 'staffing',
    title: 'Plan Staffing',
    description: 'Layer in starting position, hiring, training, and attrition against the frontline requirement.',
    statusLabel: staffingReady.value ? 'Ready' : staffingStarted.value ? 'In progress' : 'Not started',
    actionLabel: 'Open Plan Staffing'
  },
  {
    id: 'budget',
    title: 'Budget',
    description: 'Prepare this plan for future labor planning once budget features are added.',
    statusLabel: 'Coming soon',
    actionLabel: 'Open Budget'
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Check the complete yearly story before sharing or converting the plan into budget.',
    statusLabel: reviewAvailable.value ? 'Available' : 'Waiting',
    actionLabel: 'Open Review'
  }
])

const nextRecommendation = computed(() => {
  if (!availabilityReady.value) {
    return {
      title: 'Forecast Need: Agent Availability',
      description: 'Start by setting paid time, absence, and off-phone losses so the model knows how much scheduled time one FTE can actually deliver.',
      sectionId: 'forecast',
      stepId: 'availability',
      actionLabel: 'Open Agent Availability'
    }
  }

  if (!requirementReady.value) {
    return {
      title: 'Forecast Need: Required Frontline Headcount',
      description: 'Enter contacts and AHT so the planner can translate workload into the frontline headcount you need each month.',
      sectionId: 'forecast',
      stepId: 'requirement',
      actionLabel: 'Open Required Headcount'
    }
  }

  if (!staffingStarted.value) {
    return {
      title: 'Plan Staffing',
      description: 'Now turn that requirement into a hiring, training, attrition, and frontline supply plan.',
      sectionId: 'staffing',
      actionLabel: 'Open Plan Staffing'
    }
  }

  return {
    title: 'Review',
    description: 'Check the yearly picture and see where the staffing plan opens short or covered against required need.',
    sectionId: 'review',
    actionLabel: 'Open Review'
  }
})

const openWorkflowDestination = ({ sectionId, stepId } = {}) => {
  if (stepId) {
    builder.setActiveForecastStep(stepId)
    return
  }

  if (sectionId) {
    builder.setActiveSection(sectionId)
  }
}
</script>

<template>
  <section id="monthly-plan" class="calculator-section">
    <div class="app-frame">
      <div class="mb-1 flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-0.5">
          <a
            :href="props.centerDefaults?.centerId && props.centerDefaults?.groupId ? `#planning/center/${props.centerDefaults.centerId}/group/${props.centerDefaults.groupId}` : '#planning'"
            class="planning-breadcrumb-link"
          >
            {{ props.centerDefaults?.groupName || 'Staffing Group' }}
          </a>
          <h1 class="text-[clamp(1.35rem,1.8vw,1.75rem)] font-semibold tracking-[-0.04em] text-slate-950">
            {{ builder.displayPlanLabel }}
          </h1>
        </div>

        <div class="flex flex-wrap gap-2">
          <AppButton size="md" variant="primary" @click="builder.savePlan">Save Plan</AppButton>
        </div>
      </div>

      <AppPanel :padded="false" class="monthly-flow-card">
        <div class="monthly-flow-shell">
          <PlannerWorkspaceHeader
            v-model:selected-planning-year="builder.selectedPlanningYear"
            :year-options="builder.planningYearOptions"
            :year-action-href="builder.yearSwitchHref"
            :year-action-label="builder.yearSwitchLabel"
            :year-action-variant="builder.yearSwitchVariant"
            :autosave-status-message="builder.autosaveStatusMessage"
            :autosave-state="builder.autosaveState"
          />

          <div class="grid gap-2 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div class="grid gap-0.5">
                <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-sky-700">
                  Inherited From Staffing Group
                </span>
                <p class="text-sm leading-5 text-slate-600">
                  Operating defaults from {{ props.centerDefaults?.groupName || 'this staffing group' }} are applied to this plan by default.
                </p>
              </div>

              <AppButton
                v-if="props.centerDefaults?.centerId && props.centerDefaults?.groupId"
                size="sm"
                variant="secondary"
                :href="`#planning/center/${props.centerDefaults.centerId}/group/${props.centerDefaults.groupId}`"
              >
                Edit Staffing Group
              </AppButton>
            </div>

            <div class="flex flex-wrap gap-2">
              <div
                v-for="item in inheritedAssumptionChips"
                :key="item.label"
                class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
              >
                <span class="mr-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {{ item.label }}
                </span>
                <strong class="font-semibold text-slate-950">{{ item.value }}</strong>
              </div>
            </div>
          </div>

          <div class="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
            <div class="xl:sticky xl:top-4">
              <PlannerSectionNav
                v-model:active-id="builder.activeSection"
                :items="workflowSections"
              />
            </div>

            <div class="min-w-0">
              <PlannerOverviewPanel
                v-if="builder.activeSection === 'overview'"
                :plan-summary="builder.planSummary"
                :staffing-summary="builder.staffingSummary"
                :section-cards="overviewCards"
                :next-recommendation="nextRecommendation"
                :format-whole="builder.formatWhole"
                :format-number="builder.formatNumber"
                @open-section="openWorkflowDestination"
              />

              <section v-else-if="builder.activeSection === 'forecast'" class="grid gap-4">
                <AppSectionHeader
                  title="Forecast Need"
                  description="Build the requirement side of the plan in business order: agent availability first, then variability, then the required frontline headcount."
                />

                <PlannerForecastStepNav
                  v-model:active-id="builder.activeForecastStep"
                  :items="forecastSteps"
                />

                <PlannerPresenceTab
                  v-if="builder.activeForecastStep === 'availability'"
                  v-model:presence-months="builder.presenceMonths"
                  v-model:selected-month-index="builder.selectedMonthIndex"
                  :monthly-records="builder.monthlyRecords"
                  :summary="builder.presenceSummary"
                  :format-whole="builder.formatWhole"
                  :format-number="builder.formatNumber"
                  :format-percent="builder.formatPercent"
                  @copy-action="builder.handlePresenceCopyAction"
                  @continue="builder.setActiveForecastStep('variability')"
                />

                <PlannerRandomTab
                  v-else-if="builder.activeForecastStep === 'variability'"
                  v-model:random-defaults="builder.randomDefaults"
                  v-model:use-monthly-random-overrides="builder.useMonthlyRandomOverrides"
                  v-model:random-months="builder.randomMonths"
                  v-model:selected-month-index="builder.selectedMonthIndex"
                  :monthly-records="builder.monthlyRecords"
                  :summary="builder.randomSummary"
                  :format-percent="builder.formatPercent"
                  @copy-action="builder.handleRandomCopyAction"
                  @previous="builder.moveForecastStep(-1)"
                  @continue="builder.setActiveForecastStep('requirement')"
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
                  @previous="builder.moveForecastStep(-1)"
                  @save="builder.savePlan"
                />
              </section>

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

              <PlannerBudgetPanel
                v-else-if="builder.activeSection === 'budget'"
                :staffing-summary="builder.staffingSummary"
                :format-number="builder.formatNumber"
              />

              <PlannerReviewPanel
                v-else
                :plan-summary="builder.planSummary"
                :staffing-summary="builder.staffingSummary"
                :format-whole="builder.formatWhole"
                :format-number="builder.formatNumber"
              />
            </div>
          </div>
        </div>
      </AppPanel>
    </div>
  </section>
</template>
