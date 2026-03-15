<script setup>
const props = defineProps({
  weekdayOptions: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    default: 'Call Center Settings'
  },
  submitLabel: {
    type: String,
    default: 'Save Call Center'
  },
  allowBackdropClose: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'save', 'toggle-weekday'])

const centerName = defineModel('centerName', {
  type: String,
  required: true
})

const timezone = defineModel('timezone', {
  type: String,
  required: true
})

const operatingWeekdays = defineModel('operatingWeekdays', {
  type: Array,
  required: true
})

const defaultPaidHoursPerDay = defineModel('defaultPaidHoursPerDay', {
  type: Number,
  required: true
})

const defaultOccupancyPercent = defineModel('defaultOccupancyPercent', {
  type: Number,
  required: true
})

const defaultAdherencePercent = defineModel('defaultAdherencePercent', {
  type: Number,
  required: true
})
</script>

<template>
  <div class="monthly-settings-modal-backdrop" @click.self="props.allowBackdropClose && emit('close')">
    <section
      class="input-group-card monthly-settings-modal planning-center-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-center-settings-title"
    >
      <div class="monthly-settings-modal-header">
        <div>
          <p class="pane-kicker">Planning App</p>
          <h3 id="call-center-settings-title">{{ props.title }}</h3>
        </div>
      </div>

      <div class="planning-center-grid">
        <div class="field-group monthly-setup-card">
          <label for="call-center-name">Call center name</label>
          <input
            id="call-center-name"
            v-model.trim="centerName"
            type="text"
            maxlength="80"
            placeholder="Enter a call center name"
          />
        </div>

        <div class="field-group monthly-setup-card">
          <label for="call-center-timezone">Time zone</label>
          <input
            id="call-center-timezone"
            v-model.trim="timezone"
            type="text"
            placeholder="America/New_York"
          />
        </div>

        <div class="field-group monthly-weekday-field monthly-setup-card">
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

        <div class="field-group monthly-setup-card">
          <label for="center-paid-hours">Default paid hours / day</label>
          <input
            id="center-paid-hours"
            v-model.number="defaultPaidHoursPerDay"
            type="number"
            min="0"
            max="24"
            step="0.25"
          />
        </div>

        <div class="field-group monthly-setup-card">
          <label for="center-occupancy">Default occupancy %</label>
          <input
            id="center-occupancy"
            v-model.number="defaultOccupancyPercent"
            type="number"
            min="1"
            max="100"
            step="0.1"
          />
        </div>

        <div class="field-group monthly-setup-card">
          <label for="center-adherence">Default adherence %</label>
          <input
            id="center-adherence"
            v-model.number="defaultAdherencePercent"
            type="number"
            min="1"
            max="100"
            step="0.1"
          />
        </div>
      </div>

      <div class="monthly-settings-modal-actions">
        <button type="button" class="secondary-btn" @click="emit('close')">Cancel</button>
        <button type="button" class="submit-btn" :disabled="!centerName.trim()" @click="emit('save')">
          {{ props.submitLabel }}
        </button>
      </div>
    </section>
  </div>
</template>
