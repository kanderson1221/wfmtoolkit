<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'

const props = defineProps({
  planSummary: {
    type: Object,
    required: true
  },
  staffingSummary: {
    type: Object,
    required: true
  },
  sectionCards: {
    type: Array,
    default: () => []
  },
  nextRecommendation: {
    type: Object,
    default: null
  },
  planComplete: {
    type: Boolean,
    default: false
  },
  formatWhole: {
    type: Function,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['open-section'])

const overviewItems = computed(() => [
  {
    label: 'Peak Required Headcount',
    value: props.formatNumber(props.planSummary?.peakMonth?.requiredHeadcount, 1),
    meta: props.planSummary?.peakMonth?.fullLabel || 'Highest monthly requirement'
  },
  {
    label: 'Average Required Headcount',
    value: props.formatNumber(props.planSummary?.averageRequiredHeadcount, 1),
    meta: 'Average monthly frontline requirement'
  },
  {
    label: 'Starting Frontline Headcount',
    value: props.formatNumber(props.staffingSummary?.startingFrontlineHeadcount, 1),
    meta: 'Opening productive headcount in the staffing plan'
  },
  {
    label: 'Average Frontline Gap',
    value: props.formatNumber(props.staffingSummary?.averageGapToRequirement, 1),
    meta: 'Average opening gap between frontline supply and need'
  }
])

const demandItems = computed(() => [
  {
    label: 'Annual Contacts',
    value: props.formatWhole(props.planSummary?.annualContacts),
    meta: 'Total yearly contact demand'
  },
  {
    label: 'Annual Workload Hours',
    value: props.formatWhole(props.planSummary?.annualWorkloadHours),
    meta: 'Total yearly workload built from contacts and AHT'
  },
  {
    label: 'Peak Required Headcount',
    value: props.formatNumber(props.planSummary?.peakMonth?.requiredHeadcount, 1),
    meta: props.planSummary?.peakMonth?.fullLabel || 'Highest monthly requirement'
  }
])

const staffingItems = computed(() => [
  {
    label: 'Ending Frontline Headcount',
    value: props.formatNumber(props.staffingSummary?.endingFrontlineHeadcount, 1),
    meta: 'Projected productive frontline at year end'
  },
  {
    label: 'Total Graduating',
    value: props.formatNumber(props.staffingSummary?.totalGraduatingHeadcount, 1),
    meta: 'Training graduates delivered into frontline'
  },
  {
    label: 'Average Frontline Gap',
    value: props.formatNumber(props.staffingSummary?.averageGapToRequirement, 1),
    meta: 'Average opening gap between staffing and need'
  }
])

const guidanceTone = computed(() => {
  if (props.nextRecommendation) {
    return 'info'
  }

  return (props.staffingSummary?.averageGapToRequirement ?? 0) >= 0 ? 'success' : 'info'
})

const guidanceMessage = computed(() => {
  if (props.nextRecommendation) {
    return 'Use this page to track progress across the plan and move through the next recommended step.'
  }

  return 'The core inputs are in place. Finish the staffing plan to turn this into the final annual dashboard.'
})

const openSection = (sectionId, stepId = '') => {
  emit('open-section', {
    sectionId,
    stepId
  })
}
</script>

<template>
  <section class="grid gap-4">
    <AppSectionHeader title="Overview" />

    <AppStatStrip :items="overviewItems" columns="md:grid-cols-2 xl:grid-cols-4" />

    <template v-if="!props.planComplete">
      <AppStatusMessage :tone="guidanceTone">
        {{ guidanceMessage }}
      </AppStatusMessage>

      <section
        v-if="props.nextRecommendation"
        class="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="grid gap-1">
          <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Next Step
          </span>
          <div class="grid gap-1">
            <strong class="text-base font-semibold tracking-[-0.03em] text-slate-950">
              {{ props.nextRecommendation.title }}
            </strong>
            <p class="text-sm leading-6 text-slate-600">
              {{ props.nextRecommendation.description }}
            </p>
          </div>
        </div>

        <AppButton
          variant="primary"
          @click="openSection(props.nextRecommendation.sectionId || 'availability', props.nextRecommendation.stepId || '')"
        >
          {{ props.nextRecommendation.actionLabel || 'Open Agent Availability' }}
        </AppButton>
      </section>

      <div class="grid divide-y divide-slate-200">
        <article
          v-for="card in props.sectionCards"
          :key="card.id"
          class="flex flex-col gap-3 py-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:flex-1">
            <div class="grid gap-1">
              <strong class="text-base font-semibold tracking-[-0.03em] text-slate-950">
                {{ card.title }}
              </strong>
              <p class="text-sm leading-6 text-slate-600">
                {{ card.description }}
              </p>
            </div>

            <span class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-600">
              {{ card.statusLabel }}
            </span>
          </div>

          <div class="flex justify-start xl:justify-end">
            <AppButton variant="secondary" @click="openSection(card.id, card.stepId)">
              {{ card.actionLabel }}
            </AppButton>
          </div>
        </article>
      </div>
    </template>

    <section class="grid gap-3">
      <AppSectionHeader title="Forecast Need Summary" />
      <AppStatStrip :items="demandItems" columns="md:grid-cols-3" />
    </section>

    <section class="grid gap-3">
      <AppSectionHeader title="Staffing Supply Summary" />
      <AppStatStrip :items="staffingItems" columns="md:grid-cols-3" />
    </section>
  </section>
</template>
