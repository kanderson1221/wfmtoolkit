<script setup>
import { computed, watch } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppOptionPills from '../ui/AppOptionPills.vue'
import AppTextField from '../ui/AppTextField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'
import {
  HOLIDAY_CALENDAR_NONE,
  HOLIDAY_CALENDAR_US_FEDERAL,
  createCustomHoliday,
  mergeHolidayRowsWithTemplate
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

const weekdayPillItems = computed(() =>
  props.weekdayOptions.map((weekday) => ({
    id: weekday.value,
    label: weekday.label
  }))
)

const operatingWeekdaySelection = computed({
  get: () => (Array.isArray(operatingWeekdays.value) ? operatingWeekdays.value : []),
  set: (selectedDays) => {
    operatingWeekdays.value = [...selectedDays].sort((left, right) => left - right)
  }
})

const loadTemplateHolidays = () => {
  customHolidays.value = mergeHolidayRowsWithTemplate(
    customHolidayRows.value,
    new Date().getFullYear()
  )
  defaultHolidayCalendarId.value = HOLIDAY_CALENDAR_NONE
  disabledHolidayRuleIds.value = []
}

watch(
  defaultHolidayCalendarId,
  (nextValue) => {
    if (nextValue !== HOLIDAY_CALENDAR_US_FEDERAL) {
      return
    }

    customHolidays.value = mergeHolidayRowsWithTemplate(
      customHolidayRows.value,
      new Date().getFullYear(),
      disabledHolidayRuleIds.value
    )

    defaultHolidayCalendarId.value = HOLIDAY_CALENDAR_NONE
    disabledHolidayRuleIds.value = []
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
    holiday.id === holidayId
      ? createCustomHoliday({
          ...holiday,
          ...patch,
          sourceRuleId:
            Object.prototype.hasOwnProperty.call(patch, 'date') && patch.date !== holiday.date
              ? null
              : holiday.sourceRuleId
        })
      : holiday
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
        <AppFieldGroup label="Call Center Name" input-id="call-center-name">
          <AppTextField
            id="call-center-name"
            v-model.trim="centerName"
            maxlength="80"
            placeholder="United States"
            autofocus
          />
        </AppFieldGroup>

        <AppFieldGroup label="Operating Days">
          <AppOptionPills
            v-model="operatingWeekdaySelection"
            aria-label="Operating days"
            :items="weekdayPillItems"
            multiple
            item-class="min-w-14 justify-center"
          />
        </AppFieldGroup>
      </AppWorkspaceSection>

      <AppWorkspaceSection title="Closed Dates">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Holiday Schedule
          </span>

          <div class="flex flex-wrap justify-end gap-2">
            <AppButton size="sm" variant="secondary" @click="loadTemplateHolidays">
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
