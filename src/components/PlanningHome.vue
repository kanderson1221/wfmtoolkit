<script setup>
import { computed } from 'vue'
import {
  getAnnualContacts,
  getAnnualRequiredStaffHours,
  getAnnualWorkloadHours,
  getAverageAhtSeconds,
  getAverageRequiredHeadcount,
  getMinRequiredHeadcount,
  getPeakRequiredHeadcount,
  summarizePlanPortfolio
} from '../planningSummary'

const props = defineProps({
  plans: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['delete-plan'])

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value || 0)

const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0)

const confirmDelete = (plan) => {
  const confirmed = window.confirm(
    `Delete "${plan.name}"? This removes the plan and its saved assumptions from this device.`
  )

  if (!confirmed) {
    return
  }

  emit('delete-plan', plan.id)
}

const dashboardSummary = computed(() => summarizePlanPortfolio(props.plans))
</script>

<template>
  <section class="calculator-section planning-home-section">
    <div class="container">
      <div class="planning-home-shell">
        <section class="planning-home-hero calculator-card">
          <div class="planning-home-hero-copy">
            <p class="pane-kicker">Planning App</p>
            <h2>Manage monthly staffing plans</h2>
            <p class="calculator-intro">
              Create a plan, save it, and come back later to update assumptions, inputs, and monthly staffing outputs.
            </p>
          </div>

          <div class="planning-home-hero-actions">
            <a href="#planning/new" class="submit-btn">+ Create Plan</a>
          </div>
        </section>

        <section class="results-panel planning-home-summary">
          <div class="results-metrics monthly-summary-grid">
            <article class="metric-card">
              <p class="metric-label">Annual Contacts</p>
              <p class="metric-value">{{ formatWhole(dashboardSummary.annualContacts) }}</p>
              <p class="metric-meta">Combined annual contacts across saved plans</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">AHT</p>
              <p class="metric-value">{{ formatWhole(dashboardSummary.averageAhtSeconds) }}</p>
              <p class="metric-meta">Weighted AHT across saved plans</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Annual Workload</p>
              <p class="metric-value">{{ formatWhole(dashboardSummary.annualWorkloadHours) }}</p>
              <p class="metric-meta">Combined annual workload hours across saved plans</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Needed Staff Hrs</p>
              <p class="metric-value">{{ formatWhole(dashboardSummary.totalNeededStaffHours) }}</p>
              <p class="metric-meta">Combined needed staff hours across saved plans</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Min Req HC</p>
              <p class="metric-value">{{ formatNumber(dashboardSummary.totalMinRequiredHeadcount, 1) }}</p>
              <p class="metric-meta">Combined minimum required headcount across saved plans</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Avg Req HC</p>
              <p class="metric-value">{{ formatNumber(dashboardSummary.totalAvgRequiredHeadcount, 1) }}</p>
              <p class="metric-meta">Combined average required headcount across saved plans</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Peak Req HC</p>
              <p class="metric-value">{{ formatNumber(dashboardSummary.totalPeakHeadcount, 1) }}</p>
              <p class="metric-meta">Combined peak required headcount across saved plans</p>
            </article>
          </div>
        </section>

        <section class="results-panel planning-home-list">
          <div class="workspace-output-header">
            <h3>Saved Plans</h3>
            <p>Each plan keeps its own assumptions, monthly inputs, and staffing outputs.</p>
          </div>

          <div v-if="!props.plans.length" class="empty-state planning-empty-state">
            No saved plans yet. Create your first monthly staffing plan to start building a planning library.
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

            <article v-for="plan in props.plans" :key="plan.id" class="answer-card planning-plan-row">
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
                <a :href="`#planning/plan/${plan.id}`" class="secondary-btn">Open Plan</a>
                <button type="button" class="urgent-btn" @click="confirmDelete(plan)">Delete</button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
