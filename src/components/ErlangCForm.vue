<script setup>
import { reactive, ref } from 'vue'

const form = reactive({
  callsOffered: '',
  intervalLength: '',
  averageHandleTime: '',
  averageCustomerPatience: '',
  serviceLevelGoal: 80,
  serviceLevelThreshold: 20,
  maxOccupancy: 85,
  shrinkageAssumption: 30
})

const hasSubmitted = ref(false)
const isLoading = ref(false)
const submitError = ref('')
const submittedTargets = ref({
  serviceLevelGoal: 80,
  serviceLevelThreshold: 20,
  shrinkageAssumption: 30
})
const results = ref({
  summary: {
    requiredAgents: '',
    requiredHeadcount: '',
    serviceLevel: '',
    expectedAsa: '',
    percentAnsweredImmediately: '',
    estimatedOccupancy: '',
    abandonPercent: ''
  },
  scenarios: []
})

const handleSubmit = async () => {
  hasSubmitted.value = false
  submitError.value = ''
  isLoading.value = true
  submittedTargets.value = {
    serviceLevelGoal: form.serviceLevelGoal,
    serviceLevelThreshold: form.serviceLevelThreshold,
    shrinkageAssumption: form.shrinkageAssumption
  }

  try {
    const response = await fetch('/api/erlang-c/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form)
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null)
      const detail = errorPayload?.detail
      const detailText = typeof detail === 'string' ? detail : 'Unable to calculate staffing results.'
      throw new Error(detailText)
    }

    results.value = await response.json()
    hasSubmitted.value = true
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Unable to calculate staffing results.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section id="erlang-c" class="calculator-section" aria-labelledby="erlang-c-heading">
    <div class="container">
      <div class="calculator-card">
        <h2 id="erlang-c-heading">Erlang C Calculator</h2>
        <p class="calculator-intro">
          Enter your interval assumptions below to estimate staffing using Erlang C / Erlang A metrics.
        </p>

        <form class="calculator-form" @submit.prevent="handleSubmit">
          <div class="field-grid">
            <div class="field-group">
              <label for="callsOffered">Calls Offered</label>
              <input
                id="callsOffered"
                v-model.number="form.callsOffered"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                placeholder="e.g. 420"
                required
              />
              <p class="helper-text">Total calls in the interval.</p>
            </div>

            <div class="field-group">
              <label for="intervalLength">Interval Length</label>
              <input
                id="intervalLength"
                v-model.number="form.intervalLength"
                type="number"
                min="15"
                step="15"
                inputmode="numeric"
                placeholder="e.g. 30"
                required
              />
              <p class="helper-text">Minutes.</p>
            </div>

            <div class="field-group">
              <label for="averageHandleTime">Average Handle Time</label>
              <input
                id="averageHandleTime"
                v-model.number="form.averageHandleTime"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                placeholder="e.g. 360"
                required
              />
              <p class="helper-text">Seconds.</p>
            </div>

            <div class="field-group">
              <label for="averageCustomerPatience">Average Customer Patience</label>
              <input
                id="averageCustomerPatience"
                v-model.number="form.averageCustomerPatience"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                placeholder="e.g. 180"
                required
              />
              <p class="helper-text">Seconds.</p>
            </div>

            <div class="field-group">
              <label for="serviceLevelGoal">Service Level Goal</label>
              <input
                id="serviceLevelGoal"
                v-model.number="form.serviceLevelGoal"
                type="number"
                min="1"
                max="100"
                step="1"
                inputmode="numeric"
                placeholder="e.g. 80"
                required
              />
              <p class="helper-text">Percent of calls answered within threshold.</p>
            </div>

            <div class="field-group">
              <label for="serviceLevelThreshold">Service Level Threshold</label>
              <input
                id="serviceLevelThreshold"
                v-model.number="form.serviceLevelThreshold"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                placeholder="e.g. 20"
                required
              />
              <p class="helper-text">Seconds.</p>
            </div>

            <div class="field-group">
              <label for="maxOccupancy">Max Occupancy</label>
              <input
                id="maxOccupancy"
                v-model.number="form.maxOccupancy"
                type="number"
                min="1"
                max="100"
                step="1"
                inputmode="numeric"
                placeholder="e.g. 85"
                required
              />
              <p class="helper-text">Maximum target occupancy percent.</p>
            </div>

            <div class="field-group">
              <label for="shrinkageAssumption">Shrinkage Assumption</label>
              <input
                id="shrinkageAssumption"
                v-model.number="form.shrinkageAssumption"
                type="number"
                min="0"
                max="99.9"
                step="0.1"
                inputmode="decimal"
                placeholder="e.g. 30"
                required
              />
              <p class="helper-text">Percent to convert staffed agents to required headcount.</p>
            </div>
          </div>

          <button type="submit" class="submit-btn" :disabled="isLoading">
            {{ isLoading ? 'Calculating...' : 'Calculate' }}
          </button>
        </form>

        <p v-if="isLoading" class="status-message">Calculating staffing results...</p>
        <p v-if="submitError" class="status-message error">{{ submitError }}</p>

        <section
          v-if="hasSubmitted"
          class="results-panel"
          aria-live="polite"
          aria-label="Erlang C results preview"
        >
          <div class="results-header">
            <h3>Calculation Results</h3>
            <p>Computed from your inputs with Erlang C staffing and abandonment estimates.</p>
          </div>

          <div class="results-metrics">
            <article class="metric-card">
              <p class="metric-label">Required<br />Agents</p>
              <p class="metric-value">{{ results.summary.requiredAgents }}</p>
              <p class="metric-meta">
                frontline staff needed after shrinkage/loss assumptions
              </p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Required<br />Headcount</p>
              <p class="metric-value">{{ results.summary.requiredHeadcount }}</p>
              <p class="metric-meta">
                with {{ submittedTargets.shrinkageAssumption }}% shrinkage
              </p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Service<br />Level</p>
              <p class="metric-value">{{ results.summary.serviceLevel }}</p>
              <p class="metric-meta">at recommended staffing</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Average<br />Speed of Answer</p>
              <p class="metric-value">{{ results.summary.expectedAsa }}</p>
              <p class="metric-meta">average speed of answer</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Answered<br />Immediately</p>
              <p class="metric-value">{{ results.summary.percentAnsweredImmediately }}</p>
              <p class="metric-meta">at recommended staffing</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Expected<br />Occupancy</p>
              <p class="metric-value">{{ results.summary.estimatedOccupancy }}</p>
              <p class="metric-meta">at recommended staffing</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Caller<br />Abandonment</p>
              <p class="metric-value">{{ results.summary.abandonPercent }}</p>
              <p class="metric-meta">estimated caller abandonment</p>
            </article>
          </div>

          <div class="results-detail">
            <h4>Staffing Sensitivity</h4>
            <div class="detail-grid" role="table" aria-label="Staffing scenario snapshot">
              <div class="detail-row detail-head" role="row">
                <span role="columnheader">Agents</span>
                <span role="columnheader">Headcount</span>
                <span role="columnheader">Service Level</span>
                <span role="columnheader">ASA</span>
                <span role="columnheader">Answered Immediately</span>
                <span role="columnheader">Expected Occupancy</span>
                <span role="columnheader">Abandonment</span>
              </div>
              <div
                v-for="scenario in results.scenarios"
                :key="scenario.agents"
                class="detail-row"
                :class="{ highlighted: scenario.isRecommended }"
                role="row"
              >
                <span role="cell">{{ scenario.agents }}</span>
                <span role="cell">{{ scenario.requiredHeadcount }}</span>
                <span role="cell">{{ scenario.serviceLevel }}</span>
                <span role="cell">{{ scenario.asa }}</span>
                <span role="cell">{{ scenario.percentAnsweredImmediately }}</span>
                <span role="cell">{{ scenario.expectedOccupancy }}</span>
                <span role="cell">{{ scenario.abandonment }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
