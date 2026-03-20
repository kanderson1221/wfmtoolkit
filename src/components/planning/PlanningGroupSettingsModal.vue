<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTextField from '../ui/AppTextField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

const props = defineProps({
  weekdayOptions: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    default: 'Staffing Group Details'
  },
  submitLabel: {
    type: String,
    default: 'Save Staffing Group'
  },
  allowBackdropClose: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'save'])

const groupName = defineModel('groupName', {
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

const dialogOpen = computed({
  get: () => true,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  }
})

const toggleWeekday = (weekdayValue) => {
  const activeDays = Array.isArray(operatingWeekdays.value) ? operatingWeekdays.value : []

  if (activeDays.includes(weekdayValue)) {
    operatingWeekdays.value = activeDays.filter((value) => value !== weekdayValue)
    return
  }

  operatingWeekdays.value = [...activeDays, weekdayValue].sort((left, right) => left - right)
}

const operatingDaySummary = computed(() =>
  props.weekdayOptions
    .filter((weekday) => operatingWeekdays.value.includes(weekday.value))
    .map((weekday) => weekday.label)
    .join(', ') || 'No operating days selected'
)
</script>

<template>
  <AppDialog
    v-model:visible="dialogOpen"
    :title="props.title"
    description="Create or rename the staffing group and define the operating defaults its yearly plans should follow."
    kicker="Staffing Group"
    :allow-backdrop-close="props.allowBackdropClose"
    max-width="max-w-5xl"
    @close="emit('close')"
  >
    <div class="grid gap-4 lg:grid-cols-[1.15fr_0.95fr]">
      <AppWorkspaceSection
        kicker="Group Setup"
        title="Staffing group identity"
        description="Use one staffing group for each team, queue, line of business, or support function you want to plan separately over time."
      >
        <AppFieldGroup label="Staffing Group Name" input-id="staffing-group-name">
          <AppTextField
            id="staffing-group-name"
            v-model.trim="groupName"
            maxlength="80"
            placeholder="Consumer Voice"
            autofocus
          />
        </AppFieldGroup>

        <AppFieldGroup
          label="Operating Days"
          help-text="These weekdays define which days count as open business days for plans created inside this staffing group."
        >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="weekday in props.weekdayOptions"
              :key="weekday.value"
              type="button"
              class="inline-flex min-w-14 items-center justify-center rounded-2xl border px-3 py-2 text-sm font-semibold transition"
              :class="
                operatingWeekdays.includes(weekday.value)
                  ? 'border-sky-700 bg-sky-700 text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'
              "
              @click="toggleWeekday(weekday.value)"
            >
              {{ weekday.label }}
            </button>
          </div>
        </AppFieldGroup>
      </AppWorkspaceSection>

      <AppWorkspaceSection
        :subtle="false"
        kicker="Defaults"
        title="Group planning defaults"
        description="These defaults feed new yearly plans created inside this staffing group."
      >
        <AppFieldGroup label="Default Paid Hours per Day" input-id="group-default-paid-hours">
          <AppNumberField
            input-id="group-default-paid-hours"
            v-model="defaultPaidHoursPerDay"
            min="0"
            max="24"
            step="0.25"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Default Occupancy (%)" input-id="group-default-occupancy">
          <AppNumberField
            input-id="group-default-occupancy"
            v-model="defaultOccupancyPercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="0"
            :max-fraction-digits="1"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Default Adherence (%)" input-id="group-default-adherence">
          <AppNumberField
            input-id="group-default-adherence"
            v-model="defaultAdherencePercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="0"
            :max-fraction-digits="1"
          />
        </AppFieldGroup>

        <AppStatusMessage>
          Staffing groups can now operate on different days and with different planning defaults than the broader call center.
        </AppStatusMessage>
      </AppWorkspaceSection>
    </div>

    <template #footer>
      <div class="flex flex-col gap-4 border-t border-slate-200 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Operating Days
          </span>
          <strong class="text-sm text-slate-900">{{ operatingDaySummary }}</strong>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <AppButton variant="secondary" @click="emit('close')">Cancel</AppButton>
          <AppButton variant="primary" :disabled="!groupName.trim()" @click="emit('save')">
            {{ props.submitLabel }}
          </AppButton>
        </div>
      </div>
    </template>
  </AppDialog>
</template>
