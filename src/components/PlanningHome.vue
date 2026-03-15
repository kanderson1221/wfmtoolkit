<script setup>
import { computed, ref } from 'vue'

import CallCenterSettingsModal from './planning/CallCenterSettingsModal.vue'
import { createPlanningCenterDraft } from '../planningStorage'
import { summarizeCenter, summarizeCenterPortfolio } from '../planningSummary'

const props = defineProps({
  centers: {
    type: Array,
    default: () => []
  },
  weekdayOptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['save-center', 'delete-center'])

const centerSettingsOpen = ref(false)
const centerDraft = ref(createPlanningCenterDraft())

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

const dashboardSummary = computed(() => summarizeCenterPortfolio(props.centers))
const centerRows = computed(() =>
  props.centers.map((center) => ({
    ...center,
    summary: summarizeCenter(center)
  }))
)

const openCreateCenter = () => {
  centerDraft.value = createPlanningCenterDraft()
  centerSettingsOpen.value = true
}

const closeCreateCenter = () => {
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
  emit('save-center', centerDraft.value)
  centerSettingsOpen.value = false
}

const confirmDeleteCenter = (center) => {
  const confirmed = window.confirm(
    `Delete "${center.name}"? This removes the call center and all ${center.summary.planCount} plan${center.summary.planCount === 1 ? '' : 's'} inside it.`
  )

  if (!confirmed) {
    return
  }

  emit('delete-center', center.id)
}
</script>

<template>
  <section class="calculator-section planning-home-section">
    <div class="container">
      <div class="planning-home-shell">
        <section class="planning-home-hero calculator-card">
          <div class="planning-home-hero-copy">
            <p class="pane-kicker">Planning App</p>
            <h2>Manage call centers and their plans</h2>
            <p class="calculator-intro">
              Set up each call center once, then build and manage the monthly staffing plans that belong inside it.
            </p>
          </div>

          <div class="planning-home-hero-actions">
            <button type="button" class="submit-btn" @click="openCreateCenter">+ Create Call Center</button>
          </div>
        </section>

        <section class="results-panel planning-home-summary">
          <div class="results-metrics monthly-summary-grid">
            <article class="metric-card">
              <p class="metric-label">Call Centers</p>
              <p class="metric-value">{{ formatWhole(dashboardSummary.callCenterCount) }}</p>
              <p class="metric-meta">Configured call center groups in the planning app</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Plans</p>
              <p class="metric-value">{{ formatWhole(dashboardSummary.totalPlanCount) }}</p>
              <p class="metric-meta">Monthly staffing plans saved across all call centers</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Annual Contacts</p>
              <p class="metric-value">{{ formatWhole(dashboardSummary.annualContacts) }}</p>
              <p class="metric-meta">Combined annual contacts across every saved plan</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Needed Staff Hrs</p>
              <p class="metric-value">{{ formatWhole(dashboardSummary.totalNeededStaffHours) }}</p>
              <p class="metric-meta">Combined required staff hours across every saved plan</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Avg Req HC</p>
              <p class="metric-value">{{ formatNumber(dashboardSummary.totalAvgRequiredHeadcount, 1) }}</p>
              <p class="metric-meta">Combined average required headcount across all call centers</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Peak Req HC</p>
              <p class="metric-value">{{ formatNumber(dashboardSummary.totalPeakHeadcount, 1) }}</p>
              <p class="metric-meta">Combined peak required headcount across all call centers</p>
            </article>
          </div>
        </section>

        <section class="results-panel planning-home-list">
          <div class="workspace-output-header">
            <h3>Call Centers</h3>
            <p>Each call center holds its own defaults and the staffing plans that belong to it.</p>
          </div>

          <div v-if="!props.centers.length" class="empty-state planning-empty-state">
            No call centers yet. Create your first one to start grouping staffing plans.
          </div>

          <div v-else class="planning-center-list">
            <div class="planning-center-list-head" aria-hidden="true">
              <span>Call Center</span>
              <span>Time Zone</span>
              <span>Plans</span>
              <span>Annual Contacts</span>
              <span>Needed Staff Hrs</span>
              <span>Avg Req HC</span>
              <span>Peak Req HC</span>
              <span>Action</span>
            </div>

            <article v-for="center in centerRows" :key="center.id" class="answer-card planning-center-row">
              <div class="planning-center-primary" data-label="Call Center">
                <h4>{{ center.name }}</h4>
              </div>
              <div class="planning-center-stat" data-label="Time Zone">
                <span>{{ center.timezone }}</span>
              </div>
              <div class="planning-center-stat" data-label="Plans">
                <span>{{ formatWhole(center.summary.planCount) }}</span>
              </div>
              <div class="planning-center-stat" data-label="Annual Contacts">
                <span>{{ formatWhole(center.summary.annualContacts) }}</span>
              </div>
              <div class="planning-center-stat" data-label="Needed Staff Hrs">
                <span>{{ formatWhole(center.summary.totalNeededStaffHours) }}</span>
              </div>
              <div class="planning-center-stat" data-label="Avg Req HC">
                <span>{{ formatNumber(center.summary.totalAvgRequiredHeadcount, 1) }}</span>
              </div>
              <div class="planning-center-stat" data-label="Peak Req HC">
                <span>{{ formatNumber(center.summary.totalPeakHeadcount, 1) }}</span>
              </div>
              <div class="planning-center-actions">
                <a :href="`#planning/center/${center.id}`" class="secondary-btn">Open Center</a>
                <button type="button" class="urgent-btn" @click="confirmDeleteCenter(center)">Delete</button>
              </div>
            </article>
          </div>
        </section>
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
      :allow-backdrop-close="false"
      :weekday-options="props.weekdayOptions"
      title="Create Call Center"
      submit-label="Create Call Center"
      @close="closeCreateCenter"
      @save="saveCenter"
      @toggle-weekday="toggleWeekday"
    />
  </section>
</template>
