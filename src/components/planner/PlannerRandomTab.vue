<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppCheckbox from '../ui/AppCheckbox.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'
import PlannerCopyMenu from './PlannerCopyMenu.vue'

const props = defineProps({
  monthlyRecords: {
    type: Array,
    required: true
  },
  summary: {
    type: Object,
    required: true
  },
  formatPercent: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['copy-action', 'previous', 'continue', 'toggle-override-mode'])

const randomDefaults = defineModel('randomDefaults', {
  type: Object,
  default: null
})

const useMonthlyRandomOverrides = defineModel('useMonthlyRandomOverrides', {
  type: Boolean,
  default: false
})

const randomMonths = defineModel('randomMonths', {
  type: Array,
  default: null
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const selectedMonth = computed(
  () => props.monthlyRecords[selectedMonthIndex.value] ?? props.monthlyRecords[0] ?? { label: 'month' }
)

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}

const handleCopyAction = (action) => {
  emit('copy-action', action)
}

const handleOverrideModeChange = (value) => {
  emit('toggle-override-mode', value)
}

const summaryItems = computed(() => [
  {
    label: props.summary.usesMonthlyOverrides ? 'Average Occupancy' : 'Occupancy',
    value: props.formatPercent(
      props.summary.usesMonthlyOverrides
        ? props.summary.averageOccupancyPercent
        : props.summary.globalOccupancyPercent,
      1
    ),
    meta: props.summary.usesMonthlyOverrides
      ? 'Average monthly occupancy assumption'
      : 'Global occupancy assumption used across the full year'
  },
  {
    label: props.summary.usesMonthlyOverrides ? 'Average Adherence' : 'Adherence',
    value: props.formatPercent(
      props.summary.usesMonthlyOverrides
        ? props.summary.averageAdherencePercent
        : props.summary.globalAdherencePercent,
      1
    ),
    meta: props.summary.usesMonthlyOverrides
      ? 'Average monthly adherence assumption'
      : 'Global adherence assumption used across the full year'
  },
  {
    label: 'Avg Adherence Loss',
    value: props.formatPercent(props.summary.averageAdherenceLossPercent, 1),
    meta: 'Average monthly loss applied to scheduled percentage from adherence'
  },
  {
    label: 'Avg Occupancy Loss',
    value: props.formatPercent(props.summary.averageOccupancyLossPercent, 1),
    meta: 'Average monthly loss applied after adherence loss is removed'
  },
  {
    label: 'Avg Total Scheduled Random Loss',
    value: props.formatPercent(props.summary.averageRandomLossPercent, 1),
    meta: 'Adherence loss plus occupancy loss against scheduled percentage'
  }
])
</script>

<template>
  <section class="results-panel monthly-tab-panel">
    <AppSectionHeader
      title="Set occupancy and adherence assumptions"
      description="Use one global assumption set for the year, and only turn on monthly overrides if a few months need different values."
    />

    <AppStatStrip :items="summaryItems" columns="md:grid-cols-2 xl:grid-cols-5" />

    <AppWorkspaceSection
      class="random-global-panel"
      title="Random Assumptions"
      description="These assumptions create adherence and occupancy losses against scheduled percentage and flow into the final design factor."
    >
      <div class="monthly-global-grid random-global-grid">
        <AppFieldGroup
          :label="useMonthlyRandomOverrides ? 'Default Occupancy %' : 'Occupancy %'"
          input-id="global-occupancy"
          :help-text="
            useMonthlyRandomOverrides
              ? 'Seeds the monthly override table.'
              : 'Applies across the full plan year.'
          "
        >
          <AppNumberField
            id="global-occupancy"
            v-model.number="randomDefaults.occupancyPercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            aria-label="Global occupancy percent"
          />
        </AppFieldGroup>

        <AppFieldGroup
          :label="useMonthlyRandomOverrides ? 'Default Adherence %' : 'Adherence %'"
          input-id="global-adherence"
          :help-text="
            useMonthlyRandomOverrides
              ? 'Seeds the monthly override table.'
              : 'Applies across the full plan year.'
          "
        >
          <AppNumberField
            id="global-adherence"
            v-model.number="randomDefaults.adherencePercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            aria-label="Global adherence percent"
          />
        </AppFieldGroup>

        <AppFieldGroup
          label="Monthly overrides"
          input-id="use-random-overrides"
          help-text="Off for one yearly assumption set. On for month-level edits."
          class="random-override-field"
        >
          <AppCheckbox
            input-id="use-random-overrides"
            :model-value="useMonthlyRandomOverrides"
            @update:model-value="handleOverrideModeChange"
          >
            Use monthly overrides
          </AppCheckbox>
        </AppFieldGroup>
      </div>
    </AppWorkspaceSection>

    <AppWorkspaceSection
      class="random-overrides-panel"
      title="Monthly Random Overrides"
      description="Adjust only the months that need different occupancy or adherence assumptions. Losses are calculated from scheduled percentage from Step 1."
    >
      <PlannerCopyMenu
        v-if="useMonthlyRandomOverrides"
        input-id="random-copy-action"
        :label="selectedMonth.label"
        @select="handleCopyAction"
      />

      <div v-if="!useMonthlyRandomOverrides" class="answer-card random-global-note">
        <h4>Global mode is on</h4>
        <p>These occupancy and adherence assumptions apply to every month in the plan. Adherence and occupancy losses are calculated from each month’s scheduled % from Step 1.</p>
      </div>

      <div v-else class="assumption-table-shell">
        <table class="assumption-table assumption-table-random">
          <thead>
            <tr>
              <th title="Planning month. Click a month name to highlight that row.">Month</th>
              <th title="Scheduled percentage flowing in from Step 1.">Scheduled %</th>
              <th title="Expected monthly occupancy assumption used in the random loss build.">Occupancy %</th>
              <th title="Expected monthly adherence assumption used in the random loss build.">Adherence %</th>
              <th title="Adherence loss calculated as (1 - Adherence %) x Scheduled %.">Adherence Loss</th>
              <th title="Occupancy loss calculated as (1 - Occupancy %) x (Scheduled % - Adherence Loss).">Occupancy Loss</th>
              <th title="Total scheduled random loss calculated as Adherence Loss + Occupancy Loss.">Total Random Loss</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in props.monthlyRecords"
              :key="record.label"
              :class="{ selected: selectedMonthIndex === record.monthIndex }"
            >
              <td class="month-cell">
                <button
                  type="button"
                  class="assumption-month-btn"
                  @click="setSelectedMonth(record.monthIndex)"
                >
                  {{ record.fullLabel }}
                </button>
              </td>
              <td>{{ props.formatPercent(record.scheduledPercent, 1) }}</td>
              <td>
                <AppTableNumberField
                  v-model.number="randomMonths[record.monthIndex].occupancyPercent"
                  min="1"
                  max="100"
                  step="0.1"
                  :min-fraction-digits="1"
                  :max-fraction-digits="1"
                  aria-label="Occupancy percent"
                />
              </td>
              <td>
                <AppTableNumberField
                  v-model.number="randomMonths[record.monthIndex].adherencePercent"
                  min="1"
                  max="100"
                  step="0.1"
                  :min-fraction-digits="1"
                  :max-fraction-digits="1"
                  aria-label="Adherence percent"
                />
              </td>
              <td>{{ props.formatPercent(record.adherenceLossPercent, 1) }}</td>
              <td>{{ props.formatPercent(record.occupancyLossPercent, 1) }}</td>
              <td>{{ props.formatPercent(record.randomLossPercent, 1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppWorkspaceSection>

    <div class="monthly-tab-actions">
      <AppButton variant="secondary" @click="emit('previous')">Back to Presence / Utilization</AppButton>
      <AppButton variant="primary" @click="emit('continue')">Continue to Headcount Requirement</AppButton>
    </div>
  </section>
</template>
