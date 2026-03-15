<script setup>
const props = defineProps({
  yearOptions: {
    type: Array,
    required: true
  },
  canClose: {
    type: Boolean,
    default: true
  },
  allowBackdropClose: {
    type: Boolean,
    default: true
  },
  statusMessage: {
    type: String,
    default: ''
  },
  statusTone: {
    type: String,
    default: 'success'
  }
})

const emit = defineEmits(['cancel', 'close', 'load-example', 'reset'])

const planName = defineModel('planName', {
  type: String,
  required: true
})

const planningYear = defineModel('planningYear', {
  type: Number,
  required: true
})

</script>

<template>
  <div class="monthly-settings-modal-backdrop" @click.self="props.allowBackdropClose && emit('close')">
    <section
      class="input-group-card monthly-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-settings-title"
    >
      <div class="monthly-settings-modal-header">
        <div>
          <p class="pane-kicker">Plan Settings</p>
          <h3 id="plan-settings-title">Configure this plan</h3>
        </div>
      </div>

      <div class="monthly-global-grid monthly-settings-grid planner-settings-grid">
        <div class="field-group monthly-name-field monthly-setup-card">
          <label for="plan-name">Plan name</label>
          <input
            id="plan-name"
            v-model.trim="planName"
            type="text"
            maxlength="80"
            placeholder="Enter a plan name"
          />
        </div>

        <div class="field-group monthly-setup-card">
          <label for="planning-year">Planning year</label>
          <select id="planning-year" v-model.number="planningYear">
            <option v-for="year in props.yearOptions" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
      </div>

      <p
        v-if="props.statusMessage"
        class="status-message"
        :class="{ error: props.statusTone === 'error' }"
      >
        {{ props.statusMessage }}
      </p>

      <div class="monthly-settings-modal-actions">
        <button type="button" class="secondary-btn" @click="emit('cancel')">Cancel</button>
        <button type="button" class="secondary-btn" @click="emit('load-example')">Load Example</button>
        <button type="button" class="secondary-btn" @click="emit('reset')">Reset</button>
        <button type="button" class="submit-btn" :disabled="!props.canClose" @click="emit('close')">Done</button>
      </div>
    </section>
  </div>
</template>
