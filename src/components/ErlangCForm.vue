<script setup>
import { computed, reactive, ref } from 'vue'
import {
  mdiAccountGroupOutline,
  mdiAccountMultipleOutline,
  mdiCalculatorVariantOutline,
  mdiChartLine,
  mdiClockOutline,
  mdiGauge,
  mdiPhoneOutline,
  mdiTarget,
  mdiTuneVariant
} from '@mdi/js'

import AppButton from './ui/AppButton.vue'
import AppFieldGroup from './ui/AppFieldGroup.vue'
import AppIcon from './ui/AppIcon.vue'
import AppNumberField from './ui/AppNumberField.vue'
import AppPanel from './ui/AppPanel.vue'
import AppStatusMessage from './ui/AppStatusMessage.vue'
import AppTableShell from './ui/AppTableShell.vue'

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

const activeModelLabel = computed(
  () => modelOptions.find((option) => option.value === form.model)?.label || 'Erlang C'
)

const outcomeCards = computed(() => [
  {
    label: 'Service Level',
    value: results.value.summary.serviceLevel,
    icon: mdiTarget
  },
  {
    label: 'ASA',
    value: results.value.summary.expectedAsa,
    icon: mdiClockOutline
  },
  {
    label: 'Immediate Answer',
    value: results.value.summary.percentAnsweredImmediately,
    icon: mdiPhoneOutline
  },
  {
    label: 'Occupancy',
    value: results.value.summary.estimatedOccupancy,
    icon: mdiGauge
  },
  {
    label: 'Abandonment',
    value: results.value.summary.abandonPercent,
    icon: mdiChartLine
  }
])

const displayedScenarios = computed(() => {
  const scenarios = Array.isArray(results.value.scenarios) ? results.value.scenarios : []

  if (scenarios.length <= 5) {
    return scenarios
  }

  const recommendedIndex = scenarios.findIndex((scenario) => Boolean(scenario.isRecommended))

  if (recommendedIndex === -1) {
    return scenarios.slice(0, 5)
  }

  const windowSize = 5
  const halfWindow = 2
  const startIndex = Math.max(0, Math.min(recommendedIndex - halfWindow, scenarios.length - windowSize))

  return scenarios.slice(startIndex, startIndex + windowSize)
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
  <section id="erlang-c" class="calculator-section workspace-section py-1" aria-labelledby="erlang-c-heading">
    <div class="app-frame">
      <div class="grid gap-3 xl:grid-cols-[22.5rem_minmax(0,1fr)] xl:h-[calc(100vh-18.5rem)]">
        <AppPanel :padded="false" class="h-full overflow-hidden">
          <div class="flex h-full flex-col">
            <div class="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-3">
              <div class="grid gap-3">
                <h2 id="erlang-c-heading" class="sr-only">Interval calculator inputs</h2>
                <div class="grid gap-2 sm:grid-cols-2">
                  <AppButton
                    type="button"
                    variant="tab"
                    size="sm"
                    block
                    :active="form.model === 'erlang_c'"
                    @click="form.model = 'erlang_c'"
                  >
                    Erlang C
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="tab"
                    size="sm"
                    block
                    :active="form.model === 'erlang_a'"
                    @click="form.model = 'erlang_a'"
                  >
                    Erlang A
                  </AppButton>
                </div>
              </div>
            </div>

            <form class="flex flex-1 min-h-0 flex-col" @submit.prevent="handleSubmit">
              <div class="grid gap-4 px-4 py-3">
                <section class="grid gap-3">
                  <div class="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#15395f]">
                    <AppIcon :path="mdiPhoneOutline" class="h-4 w-4" />
                    <span>Demand</span>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <AppFieldGroup label="Calls Offered" input-id="callsOffered" compact>
                      <AppNumberField
                        id="callsOffered"
                        v-model="form.callsOffered"
                        :min="0"
                        :step="1"
                        compact
                        inputmode="numeric"
                        placeholder="420"
                      />
                    </AppFieldGroup>

                    <AppFieldGroup label="Interval (min)" input-id="intervalLength" compact>
                      <AppNumberField
                        id="intervalLength"
                        v-model="form.intervalLength"
                        :min="15"
                        :step="15"
                        compact
                        inputmode="numeric"
                        placeholder="30"
                      />
                    </AppFieldGroup>

                    <AppFieldGroup label="AHT (sec)" input-id="averageHandleTime" compact>
                      <AppNumberField
                        id="averageHandleTime"
                        v-model="form.averageHandleTime"
                        :min="1"
                        :step="1"
                        compact
                        inputmode="numeric"
                        placeholder="360"
                      />
                    </AppFieldGroup>

                    <AppFieldGroup label="Patience (sec)" input-id="averageCustomerPatience" compact>
                      <AppNumberField
                        id="averageCustomerPatience"
                        v-model="form.averageCustomerPatience"
                        :min="1"
                        :step="1"
                        compact
                        inputmode="numeric"
                        placeholder="180"
                      />
                    </AppFieldGroup>
                  </div>
                </section>

                <section class="grid gap-3">
                  <div class="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#15395f]">
                    <AppIcon :path="mdiTuneVariant" class="h-4 w-4" />
                    <span>Targets & Constraints</span>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <AppFieldGroup label="Service Goal (%)" input-id="serviceLevelGoal" compact>
                      <AppNumberField
                        id="serviceLevelGoal"
                        v-model="form.serviceLevelGoal"
                        :min="1"
                        :max="100"
                        :step="1"
                        compact
                        inputmode="numeric"
                        placeholder="80"
                      />
                    </AppFieldGroup>

                    <AppFieldGroup label="Goal Sec" input-id="serviceLevelThreshold" compact>
                      <AppNumberField
                        id="serviceLevelThreshold"
                        v-model="form.serviceLevelThreshold"
                        :min="1"
                        :step="1"
                        compact
                        inputmode="numeric"
                        placeholder="20"
                      />
                    </AppFieldGroup>

                    <AppFieldGroup label="Max Occupancy (%)" input-id="maxOccupancy" compact>
                      <AppNumberField
                        id="maxOccupancy"
                        v-model="form.maxOccupancy"
                        :min="1"
                        :max="100"
                        :step="1"
                        compact
                        inputmode="numeric"
                        placeholder="85"
                      />
                    </AppFieldGroup>

                    <AppFieldGroup label="Shrinkage (%)" input-id="shrinkageAssumption" compact>
                      <AppNumberField
                        id="shrinkageAssumption"
                        v-model="form.shrinkageAssumption"
                        :min="0"
                        :max="99.9"
                        :step="0.1"
                        :max-fraction-digits="1"
                        compact
                        inputmode="decimal"
                        placeholder="30"
                      />
                    </AppFieldGroup>
                  </div>
                </section>
              </div>

              <div class="mt-auto border-t border-slate-200 bg-slate-50/70 px-4 py-3">
                <AppButton type="submit" variant="primary" block :disabled="isLoading">
                  {{ isLoading ? 'Calculating...' : 'Run Calculation' }}
                </AppButton>
              </div>
            </form>
          </div>
        </AppPanel>

        <AppPanel :padded="false" class="h-full overflow-hidden">
          <div class="flex h-full min-h-0 flex-col">
            <div class="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-2.5">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]">
                    <AppIcon :path="mdiChartLine" class="h-4.5 w-4.5" />
                  </div>
                  <div class="grid gap-0.5">
                    <span class="text-[0.98rem] font-semibold tracking-[-0.03em] text-slate-950">
                      Recommendation Workspace
                    </span>
                  </div>
                </div>

                <div class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {{ activeModelLabel }}
                </div>
              </div>
            </div>

            <div class="flex-1 min-h-0 p-4">
              <AppStatusMessage v-if="isLoading" tone="info">
                Calculating staffing results...
              </AppStatusMessage>

              <AppStatusMessage v-else-if="submitError" tone="error">
                {{ submitError }}
              </AppStatusMessage>

              <div
                v-else-if="!hasSubmitted"
                class="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8"
              >
                <div class="grid max-w-sm justify-items-center gap-3 text-center">
                  <div class="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#d5e0ea] bg-white text-[#15395f]">
                    <AppIcon :path="mdiCalculatorVariantOutline" class="h-6 w-6" />
                  </div>
                  <div class="grid gap-1">
                    <strong class="text-base font-semibold tracking-[-0.03em] text-slate-950">
                      Run the interval
                    </strong>
                    <p class="text-sm leading-6 text-slate-600">
                      Complete the setup on the left to generate the staffing recommendation and sensitivity table.
                    </p>
                  </div>
                </div>
              </div>

              <section
                v-else
                class="flex h-full min-h-0 flex-col gap-2"
                aria-label="Staffing results preview"
              >
                <div class="grid gap-2 lg:grid-cols-[1.08fr_0.92fr]">
                  <article class="grid gap-1.5 rounded-[20px] border border-[#102f4f] bg-[linear-gradient(160deg,#15395f,#0f2944)] px-4 py-2.5 text-white shadow-[0_18px_36px_rgba(16,47,79,0.2)]">
                    <div class="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#c9d7e4]">
                      <AppIcon :path="mdiAccountGroupOutline" class="h-3.5 w-3.5" />
                      <span>Recommended Staffing</span>
                    </div>

                    <div class="grid gap-2 sm:grid-cols-2">
                      <div class="grid gap-1">
                        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#c9d7e4]">
                          Required Agents
                        </span>
                        <strong class="text-[1.55rem] font-semibold tracking-[-0.05em] leading-none">
                          {{ results.summary.requiredAgents }}
                        </strong>
                        <span class="text-[0.72rem] leading-4 text-[#dce7f0]">
                          Frontline staffing target
                        </span>
                      </div>

                      <div class="grid gap-1">
                        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#c9d7e4]">
                          Required Headcount
                        </span>
                        <strong class="text-[1.55rem] font-semibold tracking-[-0.05em] leading-none">
                          {{ results.summary.requiredHeadcount }}
                        </strong>
                        <span class="text-[0.72rem] leading-4 text-[#dce7f0]">
                          Includes {{ submittedTargets.shrinkageAssumption }}% shrinkage
                        </span>
                      </div>
                    </div>
                  </article>

                  <article class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-2.5">
                    <div class="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#15395f]">
                      <AppIcon :path="mdiTarget" class="h-3.5 w-3.5" />
                      <span>Target Profile</span>
                    </div>

                    <div class="grid gap-2 sm:grid-cols-2">
                      <div class="grid gap-1">
                        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Service Goal
                        </span>
                        <strong class="text-[1.05rem] font-semibold tracking-[-0.04em] text-slate-950">
                          {{ submittedTargets.serviceLevelGoal }}%
                        </strong>
                      </div>
                      <div class="grid gap-1">
                        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Goal Threshold
                        </span>
                        <strong class="text-[1.05rem] font-semibold tracking-[-0.04em] text-slate-950">
                          {{ submittedTargets.serviceLevelThreshold }}s
                        </strong>
                      </div>
                      <div class="grid gap-1">
                        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Max Occupancy
                        </span>
                        <strong class="text-[1.05rem] font-semibold tracking-[-0.04em] text-slate-950">
                          {{ form.maxOccupancy }}%
                        </strong>
                      </div>
                      <div class="grid gap-1">
                        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Shrinkage
                        </span>
                        <strong class="text-[1.05rem] font-semibold tracking-[-0.04em] text-slate-950">
                          {{ submittedTargets.shrinkageAssumption }}%
                        </strong>
                      </div>
                    </div>
                  </article>
                </div>

                <div class="grid gap-2 xl:grid-cols-5">
                  <article
                    v-for="card in outcomeCards"
                    :key="card.label"
                    class="grid gap-1 rounded-[18px] border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  >
                    <div class="flex items-center gap-2">
                      <div class="flex h-6.5 w-6.5 items-center justify-center rounded-[11px] border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]">
                        <AppIcon :path="card.icon" class="h-3.5 w-3.5" />
                      </div>
                      <span class="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        {{ card.label }}
                      </span>
                    </div>
                    <strong class="text-[1.45rem] font-semibold tracking-[-0.04em] leading-none text-slate-950">
                      {{ card.value }}
                    </strong>
                  </article>
                </div>

                <section class="flex min-h-0 flex-1 flex-col">
                  <AppTableShell class="flex-1">
                    <div class="h-full max-h-[28rem] overflow-auto bg-slate-50/95 pt-1">
                      <table class="min-w-[760px] w-full border-separate border-spacing-0 text-sm text-slate-700">
                        <thead class="sticky top-0 z-10 backdrop-blur-sm">
                          <tr>
                            <th class="rounded-tl-[28px] border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                              Agents
                            </th>
                            <th class="border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                              Headcount
                            </th>
                            <th class="border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                              Service Level
                            </th>
                            <th class="border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                              ASA
                            </th>
                            <th class="border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                              Immediate
                            </th>
                            <th class="border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                              Occupancy
                            </th>
                            <th class="rounded-tr-[28px] border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                              Abandon
                            </th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                          <tr
                            v-for="scenario in displayedScenarios"
                            :key="scenario.agents"
                            :class="scenario.isRecommended ? 'bg-[#e7eef4]' : 'bg-white hover:bg-slate-50/60'"
                          >
                            <td class="px-4 py-2.5 font-medium text-slate-950">{{ scenario.agents }}</td>
                            <td class="px-4 py-2.5 text-right tabular-nums">{{ scenario.requiredHeadcount }}</td>
                            <td class="px-4 py-2.5 text-right tabular-nums">{{ scenario.serviceLevel }}</td>
                            <td class="px-4 py-2.5 text-right tabular-nums">{{ scenario.asa }}</td>
                            <td class="px-4 py-2.5 text-right tabular-nums">{{ scenario.percentAnsweredImmediately }}</td>
                            <td class="px-4 py-2.5 text-right tabular-nums">{{ scenario.expectedOccupancy }}</td>
                            <td class="px-4 py-2.5 text-right tabular-nums">{{ scenario.abandonment }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </AppTableShell>
                </section>
              </section>
            </div>
          </div>
        </AppPanel>
      </div>
    </div>
  </section>
</template>
