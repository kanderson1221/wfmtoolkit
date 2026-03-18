<script setup>
import { reactive, ref } from 'vue'

import AppButton from './ui/AppButton.vue'
import AppEmptyState from './ui/AppEmptyState.vue'
import AppFieldGroup from './ui/AppFieldGroup.vue'
import AppNumberField from './ui/AppNumberField.vue'
import AppPageHeader from './ui/AppPageHeader.vue'
import AppPanel from './ui/AppPanel.vue'
import AppSectionHeader from './ui/AppSectionHeader.vue'
import AppSelect from './ui/AppSelect.vue'
import AppStatusMessage from './ui/AppStatusMessage.vue'

const modelOptions = [
  { label: 'Erlang C', value: 'erlang_c' },
  { label: 'Erlang A', value: 'erlang_a' }
]

const form = reactive({
  model: 'erlang_c',
  callsOffered: null,
  intervalLength: null,
  averageHandleTime: null,
  averageCustomerPatience: null,
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
  <section id="erlang-c" class="calculator-section workspace-section" aria-labelledby="erlang-c-heading">
    <div class="app-frame grid gap-4">
      <AppPageHeader
        kicker="Interval Calculator"
        title="Erlang C Calculator"
        description="Configure interval demand and service assumptions, then run a fast staffing estimate with a sensitivity view."
      />

      <div class="grid gap-4 xl:grid-cols-[0.94fr_1.06fr]">
        <AppPanel>
          <div class="grid gap-4">
            <form class="grid gap-4" @submit.prevent="handleSubmit">
              <AppPanel subtle>
                <div class="grid gap-4">
                  <AppSectionHeader
                    title="Model"
                    description="Choose the queuing model used for the interval staffing estimate."
                  />

                  <AppFieldGroup label="Staffing Model" input-id="staffingModel">
                    <AppSelect id="staffingModel" v-model="form.model" :options="modelOptions" />
                  </AppFieldGroup>
                </div>
              </AppPanel>

              <AppPanel subtle>
                <div class="grid gap-4">
                  <AppSectionHeader
                    title="Demand Profile"
                    description="Enter interval workload and caller patience assumptions."
                  />

                  <div class="grid gap-4 md:grid-cols-2">
                    <AppFieldGroup label="Calls Offered" input-id="callsOffered">
                      <AppNumberField
                        id="callsOffered"
                        v-model="form.callsOffered"
                        :min="0"
                        :step="1"
                        inputmode="numeric"
                        placeholder="e.g. 420"
                      />
                    </AppFieldGroup>

                    <AppFieldGroup label="Interval Length (min)" input-id="intervalLength">
                      <AppNumberField
                        id="intervalLength"
                        v-model="form.intervalLength"
                        :min="15"
                        :step="15"
                        inputmode="numeric"
                        placeholder="e.g. 30"
                      />
                    </AppFieldGroup>

                    <AppFieldGroup label="Average Handle Time" input-id="averageHandleTime">
                      <AppNumberField
                        id="averageHandleTime"
                        v-model="form.averageHandleTime"
                        :min="1"
                        :step="1"
                        inputmode="numeric"
                        placeholder="e.g. 360"
                      />
                    </AppFieldGroup>

                    <AppFieldGroup label="Average Patience" input-id="averageCustomerPatience">
                      <AppNumberField
                        id="averageCustomerPatience"
                        v-model="form.averageCustomerPatience"
                        :min="1"
                        :step="1"
                        inputmode="numeric"
                        placeholder="e.g. 180"
                      />
                    </AppFieldGroup>
                  </div>
                </div>
              </AppPanel>

              <div class="grid gap-4 md:grid-cols-2">
                <AppPanel subtle>
                  <div class="grid gap-4">
                    <AppSectionHeader
                      title="Service Targets"
                      description="Set the service objective used to evaluate the staffing recommendation."
                    />

                    <div class="grid gap-4">
                      <AppFieldGroup label="Service Level Goal (%)" input-id="serviceLevelGoal">
                        <AppNumberField
                          id="serviceLevelGoal"
                          v-model="form.serviceLevelGoal"
                          :min="1"
                          :max="100"
                          :step="1"
                          inputmode="numeric"
                          placeholder="e.g. 80"
                        />
                      </AppFieldGroup>

                      <AppFieldGroup label="Service Level Threshold (sec)" input-id="serviceLevelThreshold">
                        <AppNumberField
                          id="serviceLevelThreshold"
                          v-model="form.serviceLevelThreshold"
                          :min="1"
                          :step="1"
                          inputmode="numeric"
                          placeholder="e.g. 20"
                        />
                      </AppFieldGroup>
                    </div>
                  </div>
                </AppPanel>

                <AppPanel subtle>
                  <div class="grid gap-4">
                    <AppSectionHeader
                      title="Workforce Constraints"
                      description="Model occupancy and shrinkage against the recommended staffing target."
                    />

                    <div class="grid gap-4">
                      <AppFieldGroup label="Max Occupancy (%)" input-id="maxOccupancy">
                        <AppNumberField
                          id="maxOccupancy"
                          v-model="form.maxOccupancy"
                          :min="1"
                          :max="100"
                          :step="1"
                          inputmode="numeric"
                          placeholder="e.g. 85"
                        />
                      </AppFieldGroup>

                      <AppFieldGroup label="Shrinkage (%)" input-id="shrinkageAssumption">
                        <AppNumberField
                          id="shrinkageAssumption"
                          v-model="form.shrinkageAssumption"
                          :min="0"
                          :max="99.9"
                          :step="0.1"
                          :max-fraction-digits="1"
                          inputmode="decimal"
                          placeholder="e.g. 30"
                        />
                      </AppFieldGroup>
                    </div>
                  </div>
                </AppPanel>
              </div>

              <div class="flex justify-end">
                <AppButton type="submit" variant="primary" :disabled="isLoading">
                  {{ isLoading ? 'Calculating...' : 'Run Calculation' }}
                </AppButton>
              </div>
            </form>
          </div>
        </AppPanel>

        <AppPanel>
          <div class="grid gap-4" aria-live="polite">
            <AppSectionHeader
              title="Result Workspace"
              description="Live staffing recommendation, sensitivity table, and service outcome metrics."
            />

            <AppStatusMessage v-if="isLoading" tone="info">
              Calculating staffing results...
            </AppStatusMessage>

            <AppStatusMessage v-else-if="submitError" tone="error">
              {{ submitError }}
            </AppStatusMessage>

            <AppEmptyState
              v-else-if="!hasSubmitted"
              title="No staffing results yet"
              description="Enter interval assumptions and run the calculator to populate the recommendation workspace."
            />

            <section
              v-else
              class="grid gap-4"
              aria-label="Staffing results preview"
            >
              <div class="results-sticky-summary">
                <article class="answer-card answer-card-primary">
                  <p class="metric-label">Required Agents</p>
                  <p class="metric-value">{{ results.summary.requiredAgents }}</p>
                  <p class="metric-meta">frontline staffing target before shrinkage</p>
                </article>
                <article class="answer-card">
                  <p class="metric-label">Required Headcount</p>
                  <p class="metric-value">{{ results.summary.requiredHeadcount }}</p>
                  <p class="metric-meta">includes {{ submittedTargets.shrinkageAssumption }}% shrinkage</p>
                </article>
              </div>

              <div class="results-header">
                <h3>Service Outcome Metrics</h3>
                <p>Computed from your assumptions at recommended staffing.</p>
              </div>

              <div class="results-metrics">
                <article class="metric-card">
                  <p class="metric-label">Service Level</p>
                  <p class="metric-value">{{ results.summary.serviceLevel }}</p>
                  <p class="metric-meta">at recommended staffing</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Average Speed Of Answer</p>
                  <p class="metric-value">{{ results.summary.expectedAsa }}</p>
                  <p class="metric-meta">average answer delay</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Answered Immediately</p>
                  <p class="metric-value">{{ results.summary.percentAnsweredImmediately }}</p>
                  <p class="metric-meta">share answered with no wait</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Expected Occupancy</p>
                  <p class="metric-value">{{ results.summary.estimatedOccupancy }}</p>
                  <p class="metric-meta">at recommended staffing</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Caller Abandonment</p>
                  <p class="metric-value">{{ results.summary.abandonPercent }}</p>
                  <p class="metric-meta">estimated abandonment level</p>
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
        </AppPanel>
      </div>
    </div>
  </section>
</template>
