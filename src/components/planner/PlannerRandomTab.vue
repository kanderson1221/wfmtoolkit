<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppCheckbox from '../ui/AppCheckbox.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
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

const handleCopyAction = (monthIndex, action) => {
  emit('copy-action', {
    monthIndex,
    action
  })
}

const handleOverrideModeChange = (value) => {
  useMonthlyRandomOverrides.value = value
  emit('toggle-override-mode', value)
}

const summaryItems = computed(() => [
  {
    label: 'Occupancy',
    value: props.formatPercent(
      props.summary.usesMonthlyOverrides
        ? props.summary.averageOccupancyPercent
        : props.summary.globalOccupancyPercent,
      1
    )
  },
  {
    label: 'Adherence',
    value: props.formatPercent(
      props.summary.usesMonthlyOverrides
        ? props.summary.averageAdherencePercent
        : props.summary.globalAdherencePercent,
      1
    )
  },
  {
    label: 'Adherence Loss',
    value: props.formatPercent(props.summary.averageAdherenceLossPercent, 1)
  },
  {
    label: 'Occupancy Loss',
    value: props.formatPercent(props.summary.averageOccupancyLossPercent, 1)
  },
  {
    label: 'Total Random Loss',
    value: props.formatPercent(props.summary.averageRandomLossPercent, 1)
  }
])
</script>

<template>
  <section class="monthly-tab-panel">
    <AppSectionHeader title="Random/Variability" />

    <AppStatStrip :items="summaryItems" columns="md:grid-cols-2 xl:grid-cols-5" />

    <section class="grid gap-3">
      <AppSectionHeader title="Assumptions" />

      <div class="grid gap-3 xl:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_minmax(0,1fr)] xl:items-start">
        <AppFieldGroup
          :label="useMonthlyRandomOverrides ? 'Default Occupancy %' : 'Occupancy %'"
          input-id="global-occupancy"
          :help-text="
            useMonthlyRandomOverrides
              ? 'Seeds the monthly override table.'
              : 'Applies across the full plan year.'
          "
          class="xl:max-w-[12rem]"
        >
          <AppNumberField
            id="global-occupancy"
            v-model.number="randomDefaults.occupancyPercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            compact
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
          class="xl:max-w-[12rem]"
        >
          <AppNumberField
            id="global-adherence"
            v-model.number="randomDefaults.adherencePercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            compact
            aria-label="Global adherence percent"
          />
        </AppFieldGroup>

        <AppFieldGroup
          label="Monthly overrides"
          input-id="use-random-overrides"
          help-text="Off for one yearly assumption set. On for month-level edits."
          class="xl:self-end"
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
    </section>

    <section class="grid gap-3">
      <p v-if="!useMonthlyRandomOverrides" class="random-global-note">
        Global occupancy and adherence assumptions apply to every month in this plan year.
      </p>

      <div v-else class="grid gap-3">
        <AppSectionHeader title="Monthly Overrides" />

        <div class="assumption-table-shell">
          <table class="assumption-table assumption-table-random">
            <thead>
              <tr>
                <th title="Planning month for the worksheet row.">Month</th>
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
              >
                <td class="month-cell">
                  <div class="flex items-center justify-between gap-2">
                    <span class="inline-flex flex-1 items-center px-2 py-1 text-left font-semibold text-slate-800">
                      {{ record.fullLabel }}
                    </span>
                    <div @click.stop @keydown.stop>
                      <PlannerCopyMenu
                        :month-label="record.fullLabel"
                        @select="handleCopyAction(record.monthIndex, $event)"
                      />
                    </div>
                  </div>
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
      </div>
    </section>

    <div class="monthly-tab-actions">
      <AppButton variant="secondary" @click="emit('previous')">Back to Agent Availability</AppButton>
      <AppButton variant="primary" @click="emit('continue')">Continue to Demand Model</AppButton>
    </div>
  </section>
</template>
