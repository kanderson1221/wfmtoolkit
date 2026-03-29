<script setup>
import { computed } from 'vue'

import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

const props = defineProps({
  staffingSummary: {
    type: Object,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const budgetPrepItems = computed(() => [
  {
    label: 'Starting Roster Headcount',
    value: props.formatNumber(props.staffingSummary?.startingRosterHeadcount, 1),
    meta: 'Opening payroll population that a budget model will price'
  },
  {
    label: 'Total Hire Headcount',
    value: props.formatNumber(props.staffingSummary?.totalHireHeadcount, 1),
    meta: 'Hiring volume that can later drive recruiting and training cost'
  },
  {
    label: 'Peak In-Training Headcount',
    value: props.formatNumber(props.staffingSummary?.peakInTrainingHeadcount, 1),
    meta: 'Maximum training pipeline load for instructor and seat planning'
  }
])
</script>

<template>
  <section class="grid gap-4">
    <AppSectionHeader
      title="Budget"
      description="This section will turn the staffing plan into labor cost assumptions once budget features are added."
    />

    <AppStatStrip :items="budgetPrepItems" columns="md:grid-cols-3" />

    <AppWorkspaceSection
      title="Budget workspace coming next"
      description="When budget features are added, this page should convert roster, hires, training, attrition, overtime, and vendor assumptions into a monthly labor plan."
    >
      <div class="grid gap-2 text-sm leading-6 text-slate-600">
        <p>Use the current staffing plan to shape hiring and frontline supply now. Later, this same plan can layer on pay rates, recruiting cost, training cost, and overtime or vendor assumptions.</p>
        <p>The goal is for Budget to answer a different business question: not just “Can we staff it?” but also “What will it cost to staff it?”</p>
      </div>
    </AppWorkspaceSection>
  </section>
</template>
