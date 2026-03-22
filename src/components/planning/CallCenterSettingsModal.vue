<script setup>
import { computed, watch } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppTextField from '../ui/AppTextField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'
import {
  HOLIDAY_CALENDAR_US_FEDERAL,
  createCustomHoliday,
  createHolidayTemplateHolidays,
  holidayCalendarOptions
} from '../../planner/holidayCalendars'

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
    default: false
  }
})

const emit = defineEmits(['close', 'save'])

const centerName = defineModel('centerName', {
  type: String,
  required: true
})

const defaultHolidayCalendarId = defineModel('defaultHolidayCalendarId', {
  type: String,
  required: true
})

const disabledHolidayRuleIds = defineModel('disabledHolidayRuleIds', {
  type: Array,
  required: true
})

const customHolidays = defineModel('customHolidays', {
  type: Array,
  required: true
})

const operatingWeekdays = defineModel('operatingWeekdays', {
  type: Array,
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

const customHolidayRows = computed(() =>
  Array.isArray(customHolidays.value) ? customHolidays.value : []
)

const holidayRowErrors = computed(() =>
  customHolidayRows.value.reduce((errors, holiday) => {
    errors[holiday.id] = {
      label: holiday.label?.trim() ? '' : 'Enter a holiday name.',
      date: holiday.date ? '' : 'Choose a date.'
    }
    return errors
  }, {})
)

const hasHolidayValidationErrors = computed(() =>
  Object.values(holidayRowErrors.value).some((error) => error.label || error.date)
)

const toggleWeekday = (weekdayValue) => {
  const activeDays = Array.isArray(operatingWeekdays.value) ? operatingWeekdays.value : []

  if (activeDays.includes(weekdayValue)) {
    operatingWeekdays.value = activeDays.filter((value) => value !== weekdayValue)
    return
  }

  operatingWeekdays.value = [...activeDays, weekdayValue].sort((left, right) => left - right)
}

const loadTemplateHolidays = () => {
  customHolidays.value = createHolidayTemplateHolidays(
    defaultHolidayCalendarId.value,
    new Date().getFullYear(),
    disabledHolidayRuleIds.value
  )
  disabledHolidayRuleIds.value = []
}

watch(
  defaultHolidayCalendarId,
  (nextValue, previousValue) => {
    if (nextValue !== HOLIDAY_CALENDAR_US_FEDERAL) {
      return
    }

    if (previousValue === HOLIDAY_CALENDAR_US_FEDERAL && customHolidayRows.value.length) {
      return
    }

    if (customHolidayRows.value.length) {
      return
    }

    loadTemplateHolidays()
  },
  { immediate: true }
)

const addCustomHoliday = () => {
  customHolidays.value = [
    ...customHolidayRows.value,
    createCustomHoliday({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: '',
      date: ''
    })
  ]
}

const updateCustomHoliday = (holidayId, patch) => {
  customHolidays.value = customHolidayRows.value.map((holiday) =>
    holiday.id === holidayId ? createCustomHoliday({ ...holiday, ...patch }) : holiday
  )
}

const removeCustomHoliday = (holidayId) => {
  customHolidays.value = customHolidayRows.value.filter((holiday) => holiday.id !== holidayId)
}
</script>

<template>
  <AppDialog
    v-model:visible="dialogOpen"
    :title="props.title"
    :allow-backdrop-close="props.allowBackdropClose"
    max-width="max-w-4xl"
    @close="emit('close')"
  >
    <div class="grid gap-4">
      <AppWorkspaceSection title="Call Center">
        <div class="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <AppFieldGroup label="Call Center Name" input-id="call-center-name">
            <AppTextField
              id="call-center-name"
              v-model.trim="centerName"
              maxlength="80"
              placeholder="United States"
              autofocus
            />
          </AppFieldGroup>

          <AppFieldGroup label="Holiday Calendar Template" input-id="call-center-holiday-calendar">
            <AppSelect
              id="call-center-holiday-calendar"
              v-model="defaultHolidayCalendarId"
              :options="holidayCalendarOptions"
            />
          </AppFieldGroup>
        </div>

        <AppFieldGroup label="Operating Days">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="weekday in props.weekdayOptions"
              :key="weekday.value"
              type="button"
              class="inline-flex min-w-14 items-center justify-center rounded-2xl border px-3 py-2 text-sm font-semibold transition"
              :class="
                operatingWeekdays.includes(weekday.value)
                  ? 'border-[#15395f] bg-[#15395f] text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-[#a7bbce] hover:text-[#15395f]'
              "
              @click="toggleWeekday(weekday.value)"
            >
              {{ weekday.label }}
            </button>
          </div>
        </AppFieldGroup>
      </AppWorkspaceSection>

      <AppWorkspaceSection title="Closed Dates">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Holiday Schedule
          </span>

          <div class="flex flex-wrap justify-end gap-2">
            <AppButton
              v-if="defaultHolidayCalendarId === HOLIDAY_CALENDAR_US_FEDERAL"
              size="sm"
              variant="secondary"
              @click="loadTemplateHolidays"
            >
              Load U.S. Holidays
            </AppButton>
            <AppButton size="sm" variant="secondary" @click="addCustomHoliday">
              Add Holiday
            </AppButton>
          </div>
        </div>

        <div v-if="customHolidayRows.length" class="grid gap-3">
          <div
            v-for="holiday in customHolidayRows"
            :key="holiday.id"
            class="grid gap-3 rounded-[20px] border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_12rem_auto]"
          >
            <AppFieldGroup
              :label="`Holiday Name`"
              :input-id="`custom-holiday-label-${holiday.id}`"
              :error="holidayRowErrors[holiday.id]?.label"
            >
              <AppTextField
                :id="`custom-holiday-label-${holiday.id}`"
                :model-value="holiday.label"
                maxlength="80"
                placeholder="Company holiday"
                @update:model-value="updateCustomHoliday(holiday.id, { label: $event })"
              />
            </AppFieldGroup>

            <AppFieldGroup
              :label="`Date`"
              :input-id="`custom-holiday-date-${holiday.id}`"
              :error="holidayRowErrors[holiday.id]?.date"
            >
              <AppTextField
                :id="`custom-holiday-date-${holiday.id}`"
                type="date"
                :model-value="holiday.date || ''"
                @update:model-value="updateCustomHoliday(holiday.id, { date: $event })"
              />
            </AppFieldGroup>

            <div class="flex items-end justify-end">
              <AppButton size="sm" variant="quiet" @click="removeCustomHoliday(holiday.id)">
                Delete
              </AppButton>
            </div>
          </div>
        </div>

        <p v-else class="text-sm leading-6 text-slate-500">
          No closed dates added.
        </p>

        <p v-if="hasHolidayValidationErrors" class="text-sm font-medium text-rose-700">
          Complete each holiday name and date before saving.
        </p>
      </AppWorkspaceSection>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
        <AppButton variant="secondary" @click="emit('close')">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!centerName.trim() || hasHolidayValidationErrors" @click="emit('save')">
          {{ props.submitLabel }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
