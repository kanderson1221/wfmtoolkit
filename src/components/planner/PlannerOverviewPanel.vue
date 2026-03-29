<script setup>
import { computed } from 'vue'
import {
  mdiAccountGroupOutline,
  mdiChartLine,
  mdiClockOutline,
  mdiPhoneOutline,
  mdiTarget,
  mdiTuneVariant
} from '@mdi/js'

import AppButton from '../ui/AppButton.vue'
import AppIcon from '../ui/AppIcon.vue'
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

const sectionIcons = {
  overview: mdiChartLine,
  availability: mdiClockOutline,
  variability: mdiTuneVariant,
  requirement: mdiTarget,
  staffing: mdiAccountGroupOutline
}

const readySectionCount = computed(() => props.sectionCards.filter((card) => card.isReady).length)
const blockerCount = computed(() => props.sectionCards.filter((card) => !card.isReady).length)

const overviewItems = computed(() => [
  {
    label: 'Core Sections Ready',
    value: `${readySectionCount.value}/${props.sectionCards.length || 0}`,
    meta: blockerCount.value > 0 ? `${blockerCount.value} still need attention` : 'All core sections are in place'
  },
  {
    label: 'Current Blockers',
    value: String(blockerCount.value),
    meta: props.nextRecommendation ? `Next: ${props.nextRecommendation.title}` : 'No blocking steps remain'
  },
  {
    label: 'Peak Required Headcount',
    value: props.formatNumber(props.planSummary?.peakMonth?.requiredHeadcount, 1),
    meta: props.planSummary?.peakMonth?.fullLabel || 'Highest monthly requirement'
  },
  {
    label: 'Average Gap to Requirement',
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
  },
  {
    label: 'Peak Day Required Headcount',
    value: props.formatNumber(props.planSummary?.peakDayMonth?.peakDayRequiredHeadcount, 1),
    meta: props.planSummary?.peakDayMonth?.fullLabel || 'Highest modeled peak-day requirement'
  }
])

const staffingItems = computed(() => [
  {
    label: 'Ending Frontline Headcount',
    value: props.formatNumber(props.staffingSummary?.endingFrontlineHeadcount, 1),
    meta: 'Projected productive frontline at year end'
  },
  {
    label: 'Graduating Headcount',
    value: props.formatNumber(props.staffingSummary?.totalGraduatingHeadcount, 1),
    meta: 'Training graduates delivered into frontline'
  },
  {
    label: 'Average Gap to Requirement',
    value: props.formatNumber(props.staffingSummary?.averageGapToRequirement, 1),
    meta: 'Average opening gap between staffing and need'
  }
])

const nextRecommendationIcon = computed(
  () => sectionIcons[props.nextRecommendation?.sectionId] || mdiChartLine
)

const guidanceTone = computed(() => {
  if (!props.planComplete) {
    return 'info'
  }

  return 'success'
})

const guidanceMessage = computed(() => {
  if (props.nextRecommendation) {
    return blockerCount.value === 1
      ? `1 core section still needs attention. Start with ${props.nextRecommendation.title}.`
      : `${blockerCount.value} core sections still need attention. Start with ${props.nextRecommendation.title}.`
  }

  return 'All core plan sections are in place. Use this page to reopen any section and review the final staffing outlook.'
})

const statusClass = (card) => {
  if (card.tone === 'ready') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (card.tone === 'attention') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

const openSection = (sectionId, stepId = '') => {
  emit('open-section', {
    sectionId,
    stepId
  })
}
</script>

<template>
  <section class="grid gap-4">
    <AppSectionHeader title="Plan Status" :icon="mdiChartLine" />

    <AppStatStrip :items="overviewItems" columns="md:grid-cols-2 xl:grid-cols-4" />

    <AppStatusMessage :tone="guidanceTone">
      {{ guidanceMessage }}
    </AppStatusMessage>

    <section
      v-if="props.nextRecommendation"
      class="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex items-start gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]">
          <AppIcon :path="nextRecommendationIcon" class="h-4.5 w-4.5" />
        </div>

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
      </div>

      <AppButton
        variant="primary"
        class="w-24 justify-center"
        @click="openSection(props.nextRecommendation.sectionId || 'availability', props.nextRecommendation.stepId || '')"
      >
        Open
      </AppButton>
    </section>

    <div class="grid divide-y divide-slate-200">
      <article
        v-for="card in props.sectionCards"
        :key="card.id"
        class="flex flex-col gap-3 py-4 xl:flex-row xl:items-center xl:justify-between"
      >
        <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:flex-1">
          <div class="grid gap-1.5">
            <strong class="text-base font-semibold tracking-[-0.03em] text-slate-950">
              {{ card.title }}
            </strong>
            <p class="text-sm leading-6 text-slate-600">
              {{ card.description }}
            </p>
            <p v-if="card.detail" class="text-[0.82rem] leading-6 text-slate-500">
              {{ card.detail }}
            </p>
            <p v-if="card.blocker" class="text-[0.82rem] leading-6 text-amber-700">
              {{ card.blocker }}
            </p>
          </div>

          <span
            class="inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em]"
            :class="statusClass(card)"
          >
            {{ card.statusLabel }}
          </span>
        </div>

        <div class="flex justify-start xl:min-w-[6rem] xl:justify-end">
          <AppButton class="w-24 justify-center" variant="secondary" @click="openSection(card.id, card.stepId)">
            Open
          </AppButton>
        </div>
      </article>
    </div>

    <section class="grid gap-3">
      <AppSectionHeader title="Forecast Need Summary" :icon="mdiPhoneOutline" />
      <AppStatStrip :items="demandItems" columns="md:grid-cols-2 xl:grid-cols-4" />
    </section>

    <section class="grid gap-3">
      <AppSectionHeader title="Staffing Supply Summary" :icon="mdiAccountGroupOutline" />
      <AppStatStrip :items="staffingItems" columns="md:grid-cols-3" />
    </section>
  </section>
</template>
