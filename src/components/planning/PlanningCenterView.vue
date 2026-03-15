<script setup>
import { computed, ref } from 'vue'

import CallCenterSettingsModal from './CallCenterSettingsModal.vue'
import { createPlanningCenterDraft } from '../../planningStorage'
import {
  getAnnualContacts,
  getAnnualRequiredStaffHours,
  getAnnualWorkloadHours,
  getAverageAhtSeconds,
  getAverageRequiredHeadcount,
  getMinRequiredHeadcount,
  getPeakRequiredHeadcount,
  summarizeCenter
} from '../../planningSummary'

const props = defineProps({
  center: {
    type: Object,
    required: true
  },
  weekdayOptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['save-center', 'delete-plan'])

const centerSettingsOpen = ref(false)
const centerDraft = ref(createPlanningCenterDraft(props.center))

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

const centerSummary = computed(() => summarizeCenter(props.center))
const operatingDayLabel = computed(() =>
  props.center.operatingWeekdays
    .map((value) => props.weekdayOptions.find((option) => option.value === value)?.label)
    .filter(Boolean)
    .join(', ')
)

const openCenterSettings = () => {
  centerDraft.value = createPlanningCenterDraft(props.center)
  centerSettingsOpen.value = true
}

const closeCenterSettings = () => {
  centerSettingsOpen.value = false
}

const toggleWeekday = (weekdayValue) => {
  const activeDays = centerDraft.value.operatingWeekdays

  if (activeDays.includes(weekdayValue)) {
    centerDraft.value.operatingWeekdays = activeDays.filter((value) => value !== weekdayValue)
    return
  }

  centerDraft.value.operatingWeekdays = [...activeDays, weekdayValue].sort((left, right) => left - right)
}

const saveCenter = () => {
  emit('save-center', {
    ...props.center,
    ...centerDraft.value
  })
  centerSettingsOpen.value = false
}

const confirmDeletePlan = (plan) => {
  const confirmed = window.confirm(
    `Delete "${plan.name}"? This removes the plan and its saved assumptions from this call center.`
  )

  if (!confirmed) {
    return
  }

  emit('delete-plan', {
    centerId: props.center.id,
    planId: plan.id
  })
}

</script>

<template>
  <section class="calculator-section planning-home-section">
    <div class="container">
      <div class="planning-center-shell">
        <section class="planning-center-hero calculator-card">
          <div class="planning-center-hero-copy">
            <p class="pane-kicker">Call Center</p>
            <h2>{{ props.center.name }}</h2>
            <p class="calculator-intro">
              Manage plans for this call center, using shared defaults for operating days, paid hours, and random assumptions.
            </p>
          </div>

          <div class="planning-center-hero-actions">
            <button type="button" class="secondary-btn" @click="openCenterSettings">Edit Center</button>
            <a :href="`#planning/center/${props.center.id}/new`" class="submit-btn">+ Create Plan</a>
          </div>
        </section>

        <section class="planning-center-overview">
          <section class="results-panel planning-center-summary">
            <div class="workspace-output-header">
              <h3>Center Portfolio</h3>
              <p>Roll-up metrics across all staffing plans saved inside this call center.</p>
            </div>

            <div class="results-metrics monthly-summary-grid">
              <article class="metric-card">
                <p class="metric-label">Plans</p>
                <p class="metric-value">{{ formatWhole(centerSummary.planCount) }}</p>
                <p class="metric-meta">Saved staffing plans in this call center</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Annual Contacts</p>
                <p class="metric-value">{{ formatWhole(centerSummary.annualContacts) }}</p>
                <p class="metric-meta">Combined annual contacts across this call center</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Needed Staff Hrs</p>
                <p class="metric-value">{{ formatWhole(centerSummary.totalNeededStaffHours) }}</p>
                <p class="metric-meta">Combined required staff hours across saved plans</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Total Required Headcount</p>
                <p class="metric-value">{{ formatNumber(centerSummary.totalAvgRequiredHeadcount, 1) }}</p>
                <p class="metric-meta">Combined required headcount across the saved plans in this call center</p>
              </article>
              <article class="metric-card">
                <p class="metric-label">Peak Req HC</p>
                <p class="metric-value">{{ formatNumber(centerSummary.totalPeakHeadcount, 1) }}</p>
                <p class="metric-meta">Combined peak required headcount across saved plans</p>
              </article>
            </div>
          </section>

          <section class="results-panel planning-center-defaults">
            <div class="workspace-output-header">
              <h3>Center Defaults</h3>
              <p>These defaults seed new plans created inside this call center.</p>
            </div>

            <div class="planning-center-setting-list">
              <div class="planning-center-setting-row">
                <strong>Time Zone</strong>
                <span>{{ props.center.timezone }}</span>
              </div>
              <div class="planning-center-setting-row">
                <strong>Operating Days</strong>
                <span>{{ operatingDayLabel }}</span>
              </div>
              <div class="planning-center-setting-row">
                <strong>Default Paid Hours</strong>
                <span>{{ formatNumber(props.center.defaultPaidHoursPerDay, 1) }}</span>
              </div>
              <div class="planning-center-setting-row">
                <strong>Default Occupancy</strong>
                <span>{{ formatNumber(props.center.defaultOccupancyPercent, 1) }}%</span>
              </div>
              <div class="planning-center-setting-row">
                <strong>Default Adherence</strong>
                <span>{{ formatNumber(props.center.defaultAdherencePercent, 1) }}%</span>
              </div>
            </div>
          </section>
        </section>

        <section class="results-panel planning-center-plan-list">
          <div class="workspace-output-header">
            <h3>Plans In This Call Center</h3>
            <p>Each plan belongs to this call center and inherits these defaults when it is created.</p>
          </div>

          <div v-if="!props.center.plans.length" class="empty-state planning-empty-state">
            No plans yet for this call center. Create the first plan to start building a staffing portfolio.
          </div>

          <div v-else class="planning-plan-list">
            <div class="planning-plan-list-head" aria-hidden="true">
              <span>Plan Name</span>
              <span>Year</span>
              <span>Annual Contacts</span>
              <span>AHT</span>
              <span>Annual Workload</span>
              <span>Needed Staff Hrs</span>
              <span>Min Req HC</span>
              <span>Avg Req HC</span>
              <span>Peak Req HC</span>
              <span>Action</span>
            </div>

            <article v-for="plan in props.center.plans" :key="plan.id" class="answer-card planning-plan-row">
              <div class="planning-plan-primary" data-label="Plan Name">
                <h4>{{ plan.name }}</h4>
              </div>
              <div class="planning-plan-stat" data-label="Year">
                <span>{{ plan.planningYear }}</span>
              </div>
              <div class="planning-plan-stat" data-label="Annual Contacts">
                <span>{{ formatWhole(getAnnualContacts(plan)) }}</span>
              </div>
              <div class="planning-plan-stat" data-label="AHT">
                <span>{{ formatWhole(getAverageAhtSeconds(plan)) }}</span>
              </div>
              <div class="planning-plan-stat" data-label="Annual Workload">
                <span>{{ formatWhole(getAnnualWorkloadHours(plan)) }}</span>
              </div>
              <div class="planning-plan-stat" data-label="Needed Staff Hrs">
                <span>{{ formatWhole(getAnnualRequiredStaffHours(plan)) }}</span>
              </div>
              <div class="planning-plan-stat" data-label="Min Req HC">
                <span>{{ formatNumber(getMinRequiredHeadcount(plan), 1) }}</span>
              </div>
              <div class="planning-plan-stat" data-label="Avg Req HC">
                <span>{{ formatNumber(getAverageRequiredHeadcount(plan), 1) }}</span>
              </div>
              <div class="planning-plan-stat" data-label="Peak Req HC">
                <span>{{ formatNumber(getPeakRequiredHeadcount(plan), 1) }}</span>
              </div>
              <div class="planning-plan-actions">
                <a :href="`#planning/center/${props.center.id}/plan/${plan.id}`" class="secondary-btn">Open Plan</a>
                <button type="button" class="urgent-btn" @click="confirmDeletePlan(plan)">Delete</button>
              </div>
            </article>
          </div>
        </section>

        <div class="planning-center-footer-actions">
          <a href="#planning" class="secondary-btn">Back to Call Centers</a>
        </div>
      </div>
    </div>

    <CallCenterSettingsModal
      v-if="centerSettingsOpen"
      v-model:center-name="centerDraft.name"
      v-model:timezone="centerDraft.timezone"
      v-model:operating-weekdays="centerDraft.operatingWeekdays"
      v-model:default-paid-hours-per-day="centerDraft.defaultPaidHoursPerDay"
      v-model:default-occupancy-percent="centerDraft.defaultOccupancyPercent"
      v-model:default-adherence-percent="centerDraft.defaultAdherencePercent"
      :weekday-options="props.weekdayOptions"
      title="Edit Call Center"
      submit-label="Save Call Center"
      @close="closeCenterSettings"
      @save="saveCenter"
      @toggle-weekday="toggleWeekday"
    />
  </section>
</template>
