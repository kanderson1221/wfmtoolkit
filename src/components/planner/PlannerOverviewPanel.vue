<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

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

const openSection = (sectionId, stepId = '') => {
  emit('open-section', {
    sectionId,
    stepId
  })
}
</script>

<template>
  <section class="grid gap-4">
    <AppSectionHeader
      title="Overview"
      description="Use this page to see where the plan stands, what still needs attention, and which step should come next."
    />

    <AppStatStrip :items="overviewItems" columns="md:grid-cols-2 xl:grid-cols-4" />

    <AppWorkspaceSection
      title="Recommended next step"
      description="Move through the workflow in business order. Forecast need first, then turn that requirement into a staffing plan."
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="grid gap-1">
          <strong class="text-base font-semibold tracking-[-0.03em] text-slate-950">
            {{ props.nextRecommendation?.title || 'Forecast need' }}
          </strong>
          <p class="text-sm leading-6 text-slate-600">
            {{ props.nextRecommendation?.description || 'Start with the forecast so the staffing plan has a requirement to solve against.' }}
          </p>
        </div>

        <AppButton
          variant="primary"
          @click="openSection(props.nextRecommendation?.sectionId || 'forecast', props.nextRecommendation?.stepId || '')"
        >
          {{ props.nextRecommendation?.actionLabel || 'Open Forecast Need' }}
        </AppButton>
      </div>
    </AppWorkspaceSection>

    <div class="grid gap-4 xl:grid-cols-2">
      <article
        v-for="card in props.sectionCards"
        :key="card.id"
        class="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
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

        <div class="flex justify-start">
          <AppButton variant="secondary" @click="openSection(card.id, card.stepId)">
            {{ card.actionLabel }}
          </AppButton>
        </div>
      </article>
    </div>
  </section>
</template>
