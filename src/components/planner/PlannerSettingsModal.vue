<script setup>
const props = defineProps({
  yearOptions: {
    type: Array,
    required: true
  },
  weekdayOptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close', 'load-example', 'reset', 'toggle-weekday'])

const planName = defineModel('planName', {
  type: String,
  required: true
})

const planningYear = defineModel('planningYear', {
  type: Number,
  required: true
})

const operatingWeekdays = defineModel('operatingWeekdays', {
  type: Array,
  required: true
})
</script>

<template>
  <div class="monthly-settings-modal-backdrop" @click.self="emit('close')">
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
        <button type="button" class="secondary-btn" @click="emit('close')">Done</button>
      </div>

      <div class="monthly-global-grid monthly-settings-grid">
        <div class="field-group monthly-name-field monthly-setup-card">
          <label for="plan-name">Plan name</label>
          <input
            id="plan-name"
            v-model.trim="planName"
            type="text"
            maxlength="80"
            placeholder="2026 Staffing Plan"
          />
        </div>

        <div class="field-group monthly-setup-card">
          <label for="planning-year">Planning year</label>
          <select id="planning-year" v-model.number="planningYear">
            <option v-for="year in props.yearOptions" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>

        <div class="field-group monthly-weekday-field monthly-setup-card monthly-settings-weekdays">
          <label>Operating days</label>
          <div class="weekday-toggle-group">
            <button
              v-for="weekday in props.weekdayOptions"
              :key="weekday.value"
              type="button"
              class="weekday-toggle"
              :class="{ active: operatingWeekdays.includes(weekday.value) }"
              @click="emit('toggle-weekday', weekday.value)"
            >
              {{ weekday.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="monthly-settings-modal-actions">
        <button type="button" class="secondary-btn" @click="emit('load-example')">Load Example</button>
        <button type="button" class="secondary-btn" @click="emit('reset')">Reset</button>
        <button type="button" class="submit-btn" @click="emit('close')">Done</button>
      </div>
    </section>
  </div>
</template>
