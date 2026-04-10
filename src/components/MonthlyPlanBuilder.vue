<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { FULL_MONTH_LABELS, toNumber } from '../plannerModel'

import PlannerActualsPanel from './planner/PlannerActualsPanel.vue'
import PlannerForecastPanel from './planner/PlannerForecastPanel.vue'
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
import AppStatusMessage from './ui/AppStatusMessage.vue'
import {
  buildPlanningCenterHash,
  buildPlanningGroupHash,
  buildPlanningHomeHash
} from '../appRoutes'
import { useMonthlyPlanBuilder } from '../composables/useMonthlyPlanBuilder'
import { DEMAND_SOURCE_FORECAST, DEMAND_SOURCE_MANUAL } from '../planner/demandSources'

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
  },
  storageScope: {
    type: String,
    default: 'default'
  },
  storageRefreshToken: {
    type: Number,
    default: 0
  },
  forecastSeed: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

const builder = reactive(useMonthlyPlanBuilder(props, emit))
const forecastEntryMode = ref(
  builder.demandSource.mode === DEMAND_SOURCE_FORECAST
    ? DEMAND_SOURCE_FORECAST
    : DEMAND_SOURCE_MANUAL
)

const handleForecastEntryModeChange = (mode) => {
  const nextMode = mode === DEMAND_SOURCE_FORECAST ? DEMAND_SOURCE_FORECAST : DEMAND_SOURCE_MANUAL
  forecastEntryMode.value = nextMode

  if (nextMode === DEMAND_SOURCE_MANUAL) {
    builder.setDemandSourceMode(DEMAND_SOURCE_MANUAL)
    return
  }

  void builder.reloadForecastProjects()
}

watch(
  () => builder.demandSource.mode,
  (mode) => {
    forecastEntryMode.value = mode === DEMAND_SOURCE_FORECAST
      ? DEMAND_SOURCE_FORECAST
      : DEMAND_SOURCE_MANUAL
  }
)

const TOTAL_PLAN_MONTHS = FULL_MONTH_LABELS.length
const reviewedSections = computed(() => new Set(builder.reviewedSections))

const formatMonthCoverage = (count) => `${count}/${TOTAL_PLAN_MONTHS} months`

const getFirstMissingMonthLabel = (items, predicate) => {
  const monthIndex = items.findIndex((item, index) => !predicate(item, index))
  return monthIndex === -1 ? '' : FULL_MONTH_LABELS[monthIndex]
}

const availabilityProgress = computed(() => {
  const configuredCount = builder.monthlyRecords.filter(
    (record) => record.openDays > 0 && record.paidHoursPerMonth > 0 && record.scheduledPercent > 0
  ).length
  const firstMissingMonthLabel = getFirstMissingMonthLabel(
    builder.monthlyRecords,
    (record) => record.openDays > 0 && record.paidHoursPerMonth > 0 && record.scheduledPercent > 0
  )
  const defaultsPendingReview = configuredCount === TOTAL_PLAN_MONTHS && !reviewedSections.value.has('availability')
  const isReady = configuredCount === TOTAL_PLAN_MONTHS && reviewedSections.value.has('availability')

  return {
    id: 'availability',
    title: 'Agent Availability',
    description: 'Set paid time, absence, and off-phone losses so one FTE has realistic scheduled capacity.',
    statusLabel: defaultsPendingReview ? 'Using defaults' : formatMonthCoverage(configuredCount),
    detail: isReady
      ? 'Scheduled capacity is modeled across the full year.'
      : defaultsPendingReview
        ? 'Monthly paid time and off-phone assumptions are still using the starting defaults.'
      : `Scheduled capacity is incomplete in ${firstMissingMonthLabel}.`,
    blocker: isReady
      ? ''
      : defaultsPendingReview
        ? 'Open Agent Availability and confirm the default paid time and loss assumptions.'
        : `Open days or scheduled capacity drop to zero in ${firstMissingMonthLabel}.`,
    tone: isReady ? 'ready' : defaultsPendingReview || configuredCount > 0 ? 'attention' : 'default',
    isReady,
    isStarted: reviewedSections.value.has('availability'),
    nextTitle: 'Agent Availability',
    nextDescription: defaultsPendingReview
      ? 'Review the default paid time and off-phone assumptions before treating the yearly capacity model as complete.'
      : 'Confirm monthly paid time and off-phone losses so the model knows how much scheduled time one FTE can deliver.'
  }
})

const variabilityProgress = computed(() => {
  if (builder.useMonthlyRandomOverrides) {
    const configuredCount = builder.randomMonths.filter(
      (month) => toNumber(month.occupancyPercent, 0) > 0 && toNumber(month.adherencePercent, 0) > 0
    ).length
    const firstMissingMonthLabel = getFirstMissingMonthLabel(
      builder.randomMonths,
      (month) => toNumber(month.occupancyPercent, 0) > 0 && toNumber(month.adherencePercent, 0) > 0
    )
    const isReady = configuredCount === TOTAL_PLAN_MONTHS

    return {
      id: 'variability',
      title: 'Random/Variability',
      description: 'Apply adherence and occupancy assumptions before the requirement is finalized.',
      statusLabel: formatMonthCoverage(configuredCount),
      detail: isReady
        ? 'Monthly occupancy and adherence overrides are set across the full year.'
        : `Occupancy or adherence is missing in ${firstMissingMonthLabel}.`,
      blocker: isReady ? '' : `Set occupancy and adherence assumptions for ${firstMissingMonthLabel}.`,
      tone: isReady ? 'ready' : configuredCount > 0 ? 'attention' : 'default',
      isReady,
      isStarted: configuredCount > 0,
      nextTitle: 'Random/Variability',
      nextDescription: 'Set the occupancy and adherence assumptions that convert scheduled time into a usable design factor.'
    }
  }

  const defaultsConfigured =
    toNumber(builder.randomDefaults.occupancyPercent, 0) > 0 &&
    toNumber(builder.randomDefaults.adherencePercent, 0) > 0
  const defaultsPendingReview = defaultsConfigured && !reviewedSections.value.has('variability')
  const isReady = defaultsConfigured && reviewedSections.value.has('variability')

  return {
    id: 'variability',
    title: 'Random/Variability',
    description: 'Apply adherence and occupancy assumptions before the requirement is finalized.',
    statusLabel: defaultsPendingReview ? 'Using defaults' : defaultsConfigured ? 'Defaults confirmed' : 'Needs review',
    detail: isReady
      ? `Shared occupancy and adherence defaults apply across all ${TOTAL_PLAN_MONTHS} months.`
      : defaultsPendingReview
        ? `Shared occupancy and adherence defaults are in place, but they still need review before the design factor is considered complete.`
      : 'Occupancy and adherence defaults are still missing.',
    blocker: isReady
      ? ''
      : defaultsPendingReview
        ? 'Open Random/Variability and confirm the default occupancy and adherence assumptions.'
        : 'Set occupancy and adherence defaults before finalizing requirement.',
    tone: isReady ? 'ready' : defaultsConfigured ? 'attention' : 'default',
    isReady,
    isStarted: reviewedSections.value.has('variability'),
    nextTitle: 'Random/Variability',
    nextDescription: defaultsPendingReview
      ? 'Review the default occupancy and adherence assumptions before locking in the design factor.'
      : 'Set the occupancy and adherence assumptions that convert scheduled time into a usable design factor.'
  }
})

const requirementProgress = computed(() => {
  const configuredCount = builder.planMonths.filter(
    (month) => toNumber(month.contacts, 0) > 0 && toNumber(month.ahtSeconds, 0) > 0
  ).length
  const firstMissingMonthLabel = getFirstMissingMonthLabel(
    builder.planMonths,
    (month) => toNumber(month.contacts, 0) > 0 && toNumber(month.ahtSeconds, 0) > 0
  )
  const isReady = configuredCount === TOTAL_PLAN_MONTHS

  return {
    id: 'requirement',
    title: 'Demand Model',
    description: 'Turn contacts and AHT into the required frontline headcount the staffing plan needs to cover.',
    statusLabel: formatMonthCoverage(configuredCount),
    detail: isReady
      ? builder.demandSource.mode === 'forecast' && builder.demandSourceSummary?.projectName
        ? `Contacts are populated from ${builder.demandSourceSummary.projectName} and AHT is set across the full year.`
        : 'Contacts and AHT are populated for every month.'
      : configuredCount > 0
        ? builder.demandSource.mode === 'forecast'
          ? `Forecast contacts are applied for ${configuredCount} months so far.`
          : `Demand inputs are modeled for ${configuredCount} months so far.`
        : 'Demand inputs are still blank across the plan.',
    blocker: isReady
      ? ''
      : builder.demandSource.mode === 'forecast'
        ? `Apply a forecast or enter contacts and AHT for ${firstMissingMonthLabel} to complete the requirement model.`
        : `Enter contacts and AHT for ${firstMissingMonthLabel} to complete the requirement model.`,
    tone: isReady ? 'ready' : configuredCount > 0 ? 'attention' : 'default',
    isReady,
    isStarted: configuredCount > 0,
    nextTitle: 'Demand Model',
    nextDescription: 'Enter monthly contacts and AHT so the planner can translate workload into required frontline headcount.'
  }
})

const staffingProgress = computed(() => {
  const startingRosterSet = toNumber(builder.startingHeadcount, 0) > 0
  const startingFrontlineSet =
    toNumber(builder.startingFrontlineHeadcount, 0) > 0 &&
    toNumber(builder.startingFrontlineHeadcount, 0) <= toNumber(builder.startingHeadcount, 0)
  const movementStarted =
    builder.effectiveTrainingClasses.length > 0 ||
    builder.staffingMonths.some((month) => toNumber(month.frontlineAttritionHeadcount, 0) > 0)
  const requiredInputsComplete = [startingRosterSet, startingFrontlineSet].filter(Boolean).length
  const isReady = startingRosterSet && startingFrontlineSet

  return {
    id: 'staffing',
    title: 'Staffing Plan',
    description: 'Layer in starting position, hiring, training, and attrition against the requirement.',
    statusLabel: `${requiredInputsComplete}/2 required`,
    detail: !startingRosterSet
      ? 'Starting roster headcount is still missing.'
      : !startingFrontlineSet
        ? 'Starting frontline headcount is still missing.'
        : builder.hasNextYearStartingFrontlineTarget && movementStarted
          ? 'Opening position is set, staffing movement is in progress, and a next January opening frontline target is active.'
          : builder.hasNextYearStartingFrontlineTarget
            ? 'Opening position is set and a next January opening frontline target is active.'
            : movementStarted
              ? 'Opening position is set and staffing movement assumptions are in progress.'
              : 'Opening position is set. Add attrition or training assumptions if the plan needs movement.',
    blocker: !startingRosterSet
      ? 'Set starting roster headcount for January.'
      : !startingFrontlineSet
        ? 'Set starting frontline headcount for January.'
        : '',
    tone: isReady ? 'ready' : requiredInputsComplete > 0 || movementStarted ? 'attention' : 'default',
    isReady,
    isStarted: requiredInputsComplete > 0 || movementStarted,
    nextTitle: 'Staffing Plan',
    nextDescription: 'Set starting roster and frontline headcount, then add attrition or training assumptions as needed.'
  }
})

const coreSectionCards = computed(() => [
  availabilityProgress.value,
  variabilityProgress.value,
  requirementProgress.value,
  staffingProgress.value
])

const actualsStarted = computed(() => builder.actualsSummary.loadedMonthsCount > 0)

const planComplete = computed(() => coreSectionCards.value.every((section) => section.isReady))
const readyCoreSectionCount = computed(() => coreSectionCards.value.filter((section) => section.isReady).length)

const workflowSections = computed(() => [
  {
    id: 'forecast',
    label: 'Forecast',
    items: [
      {
        id: 'forecast',
        title: 'Forecasts',
        tone: 'default'
      }
    ]
  },
  {
    id: 'plan',
    label: 'Plan',
    items: [
      {
        id: 'overview',
        title: 'Plan Status',
        statusLabel: planComplete.value ? 'All core sections ready' : `${readyCoreSectionCount.value}/${coreSectionCards.value.length} ready`,
        tone: planComplete.value ? 'ready' : 'default'
      },
      {
        id: 'availability',
        title: 'Agent Availability',
        statusLabel: availabilityProgress.value.statusLabel,
        tone: availabilityProgress.value.tone
      },
      {
        id: 'variability',
        title: variabilityProgress.value.title,
        statusLabel: variabilityProgress.value.statusLabel,
        tone: variabilityProgress.value.tone
      },
      {
        id: 'requirement',
        title: requirementProgress.value.title,
        statusLabel: requirementProgress.value.statusLabel,
        tone: requirementProgress.value.tone
      },
      {
        id: 'staffing',
        title: 'Staffing Plan',
        statusLabel: staffingProgress.value.statusLabel,
        tone: staffingProgress.value.tone
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

const overviewCards = computed(() => coreSectionCards.value)

const nextRecommendation = computed(() => {
  const nextSection = coreSectionCards.value.find((section) => !section.isReady)

  return nextSection
    ? {
        title: nextSection.nextTitle || nextSection.title,
        description: nextSection.nextDescription || nextSection.blocker || nextSection.detail || nextSection.description,
        sectionId: nextSection.id
      }
    : null
})

const openWorkflowDestination = ({ sectionId, stepId } = {}) => {
  if (stepId) {
    builder.setActiveSection(stepId)
    return
  }

  if (sectionId) {
    builder.setActiveSection(sectionId)
  }
}

const handleWorkflowItemSelect = (item) => {
  if (item?.id) {
    builder.setActiveSection(item.id)
  }
}

const breadcrumbItems = computed(() => {
  const centerId = props.centerDefaults?.centerId
  const groupId = props.centerDefaults?.groupId
  const centerName = props.centerDefaults?.centerName || 'Call Center'
  const groupName = props.centerDefaults?.groupName || 'Staffing Group'

  return [
    { label: 'Home', href: '#home' },
    { label: 'Call Centers', href: buildPlanningHomeHash() },
    ...(centerId ? [{ label: centerName, href: buildPlanningCenterHash(centerId) }] : []),
    ...(centerId && groupId
      ? [{ label: groupName, href: buildPlanningGroupHash(centerId, groupId) }]
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

      <AppStatusMessage v-if="builder.plannerBootstrapping" class="mb-3">
        Restoring the latest planner draft from this browser.
      </AppStatusMessage>

      <AppStatusMessage v-else-if="builder.validationMessage" tone="error" class="mb-3">
        {{ builder.validationMessage }}
      </AppStatusMessage>

      <AppPanel :padded="false" class="monthly-flow-card">
        <div v-if="builder.plannerBootstrapping" class="grid gap-3 p-6">
          <AppStatusMessage>
            The planner will become editable as soon as the saved draft is restored.
          </AppStatusMessage>
        </div>

        <div v-else class="grid xl:grid-cols-[188px_minmax(0,1fr)] xl:items-start">
          <section class="border-b border-slate-200 p-3 xl:sticky xl:top-4 xl:border-b-0 xl:border-r">
            <div class="grid gap-2">
              <PlannerSectionNav
                v-model:active-id="builder.activeSection"
                :groups="workflowSections"
                @select="handleWorkflowItemSelect"
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

              <div
                v-else-if="builder.activeSection === 'forecast'"
                class="grid gap-3"
              >
                <PlannerForecastPanel
                  :entry-mode="forecastEntryMode"
                  v-model:plan-months="builder.planMonths"
                  v-model:demand-source="builder.demandSource"
                  v-model:selected-forecast-project-id="builder.selectedForecastProjectId"
                  v-model:selected-month-index="builder.selectedMonthIndex"
                  :monthly-records="builder.monthlyRecords"
                  :saved-forecast-project-count="builder.savedForecastProjectCount"
                  :forecast-select-options="builder.forecastSelectOptions"
                  :forecasts-loading="builder.forecastsLoading"
                  :forecasts-error="builder.forecastsError"
                  :selected-forecast-preview-summary="builder.selectedForecastPreviewSummary"
                  :current-demand-source-summary="builder.demandSourceSummary"
                  :forecast-can-apply="builder.forecastCanApply"
                  :forecast-workspace-href="props.forecastSeed?.forecastWorkspaceHref || props.centerDefaults?.forecastWorkspaceHref || ''"
                  :format-whole="builder.formatWhole"
                  :format-number="builder.formatNumber"
                  @update:entry-mode="handleForecastEntryModeChange"
                  @apply-forecast="builder.applyForecastToDemand"
                />
              </div>

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
                :demand-source="builder.demandSource"
                :current-demand-source-summary="builder.demandSourceSummary"
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
                v-model:next-year-opening="builder.nextYearOpening"
                v-model:staffing-months="builder.staffingMonths"
                v-model:training-classes="builder.trainingClasses"
                v-model:selected-month-index="builder.selectedMonthIndex"
                :starting-position-inherited="builder.startingPositionInherited"
                :starting-position-inherited-from-year="builder.startingPositionInheritedFromYear"
                :inherited-training-classes="builder.inheritedTrainingClasses"
                :staffing-records="builder.staffingRecords"
                :format-number="builder.formatNumber"
                :year-end-target-defaults="{
                  frontlineHeadcount: builder.staffingSummary.endingFrontlineHeadcount,
                }"
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
