<script setup>
import { computed } from 'vue'

import { createTrainingSettings } from '../../plannerModel'

const props = defineProps({
  formatNumber: {
    type: Function,
    required: true
  },
  allowBackdropClose: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])

const trainingSettings = defineModel('trainingSettings', {
  type: Object,
  required: true
})

const normalizedTrainingSettings = computed(() => createTrainingSettings(trainingSettings.value))
const concurrentTrainingCapacity = computed(
  () => normalizedTrainingSettings.value.availableTrainers * normalizedTrainingSettings.value.maxClassSize
)
</script>

<template>
  <div class="monthly-settings-modal-backdrop" @click.self="props.allowBackdropClose && emit('close')">
    <section
      class="input-group-card monthly-settings-modal training-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="training-settings-title"
    >
      <div class="monthly-settings-modal-header">
        <div>
          <p class="pane-kicker">Staffing Plan</p>
          <h3 id="training-settings-title">Training Settings</h3>
        </div>
      </div>

      <div class="training-settings-grid">
        <label class="settings-field">
          <span>Training Duration (Workdays)</span>
          <input
            v-model.number="trainingSettings.trainingDurationWorkdays"
            type="number"
            min="1"
            step="1"
            aria-label="Training duration in workdays"
          />
        </label>
        <label class="settings-field">
          <span>Graduation Yield %</span>
          <input
            v-model.number="trainingSettings.graduationYieldPercent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            aria-label="Graduation yield percent"
          />
        </label>
        <label class="settings-field">
          <span>Available Trainers</span>
          <input
            v-model.number="trainingSettings.availableTrainers"
            type="number"
            min="0"
            step="1"
            aria-label="Available trainers"
          />
        </label>
        <label class="settings-field">
          <span>Max Class Size</span>
          <input
            v-model.number="trainingSettings.maxClassSize"
            type="number"
            min="0"
            step="1"
            aria-label="Max class size"
          />
        </label>
        <label class="settings-field">
          <span>Post Training Nesting Days</span>
          <input
            v-model.number="trainingSettings.postTrainingNestingDays"
            type="number"
            min="0"
            step="1"
            aria-label="Post training nesting days"
          />
        </label>
        <div class="training-settings-capacity-card">
          <span>Concurrent Training Capacity</span>
          <strong>{{ props.formatNumber(concurrentTrainingCapacity, 0) }}</strong>
          <small>
            {{ props.formatNumber(normalizedTrainingSettings.availableTrainers, 0) }} trainer(s) x
            {{ props.formatNumber(normalizedTrainingSettings.maxClassSize, 0) }} seats
          </small>
        </div>
      </div>

      <div class="monthly-settings-modal-actions">
        <button type="button" class="submit-btn" @click="emit('close')">Done</button>
      </div>
    </section>
  </div>
</template>
