<script setup>
import { computed } from 'vue'

import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
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
  formatWhole: {
    type: Function,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

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

const gapTone = computed(() => (props.staffingSummary?.averageGapToRequirement ?? 0) >= 0 ? 'success' : 'warning')
const gapMessage = computed(() =>
  (props.staffingSummary?.averageGapToRequirement ?? 0) >= 0
    ? 'Opening frontline supply is at or above required need on average across the year.'
    : 'Opening frontline supply is below required need on average. Review Forecast Need and Plan Staffing before finalizing.'
)
</script>

<template>
  <section class="grid gap-4">
    <AppSectionHeader
      title="Review"
      description="Use this page to check the full yearly picture before you export, socialize, or budget the plan."
    />

    <AppStatusMessage :tone="gapTone">
      {{ gapMessage }}
    </AppStatusMessage>

    <AppWorkspaceSection
      title="Forecast need summary"
      description="The demand side of the plan translated into yearly workload and peak frontline requirement."
    >
      <AppStatStrip :items="demandItems" columns="md:grid-cols-3" />
    </AppWorkspaceSection>

    <AppWorkspaceSection
      title="Staffing supply summary"
      description="The staffing side of the plan translated into hiring, graduation, and frontline supply."
    >
      <AppStatStrip :items="staffingItems" columns="md:grid-cols-3" />
    </AppWorkspaceSection>
  </section>
</template>
