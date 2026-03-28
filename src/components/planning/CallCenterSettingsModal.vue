<script setup>
import { computed, ref, watch } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppConfirmDialog from '../ui/AppConfirmDialog.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppOptionPills from '../ui/AppOptionPills.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTextField from '../ui/AppTextField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import { createPlanningHolidayProfile } from '../../planningStorage'
import {
  HOLIDAY_CALENDAR_US_FEDERAL,
  createHolidayTemplateHolidays,
  createCustomHoliday,
  mergeHolidayRowsWithTemplate
} from '../../planner/holidayCalendars'

const DEFAULT_OPERATING_WEEKDAYS = [1, 2, 3, 4, 5]

const props = defineProps({
  weekdayOptions: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    default: 'Call Center Settings'
  },
  displayYear: {
    type: Number,
    default: () => new Date().getFullYear()
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

const holidayProfiles = defineModel('holidayProfiles', {
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

const normalizeHolidayYear = (value, fallback = new Date().getFullYear()) => {
  const parsedYear = Number(value)
  return Number.isInteger(parsedYear) && parsedYear > 0 ? parsedYear : fallback
}

const normalizeOperatingWeekdays = (selectedDays) => {
  if (!Array.isArray(selectedDays)) {
    return [...DEFAULT_OPERATING_WEEKDAYS]
  }

  return [...new Set(
    selectedDays
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
  )].sort((left, right) => left - right)
}

const sortHolidayProfiles = (profiles) =>
  [...profiles].sort((left, right) => normalizeHolidayYear(left?.year) - normalizeHolidayYear(right?.year))

const selectedHolidayYear = ref(normalizeHolidayYear(props.displayYear))
const {
  dialogVisible: copyPriorYearConfirmOpen,
  dialogTitle: copyPriorYearConfirmTitle,
  dialogDescription: copyPriorYearConfirmDescription,
  dialogConfirmLabel: copyPriorYearConfirmLabel,
  dialogConfirmVariant: copyPriorYearConfirmVariant,
  requestConfirmation: requestCopyPriorYearConfirmation,
  confirmPendingAction: confirmCopyPriorYear
} = useConfirmDialog()

watch(
  () => props.displayYear,
  (nextYear) => {
    selectedHolidayYear.value = normalizeHolidayYear(nextYear)
  },
  { immediate: true }
)

const normalizedHolidayProfiles = computed(() =>
  sortHolidayProfiles(
    Array.isArray(holidayProfiles.value)
      ? holidayProfiles.value.map((profile) =>
          createPlanningHolidayProfile(profile, normalizeHolidayYear(profile?.year, selectedHolidayYear.value))
        )
      : []
  )
)

const holidayYearOptions = computed(() => {
  const anchorYear = normalizeHolidayYear(props.displayYear)
  const years = new Set(normalizedHolidayProfiles.value.map((profile) => profile.year))

  for (let offset = -2; offset <= 5; offset += 1) {
    years.add(anchorYear + offset)
  }

  years.add(selectedHolidayYear.value)

  return [...years]
    .filter((year) => year > 0)
    .sort((left, right) => right - left)
    .map((year) => ({
      label: String(year),
      value: year
    }))
})

const selectedHolidayProfile = computed(() =>
  normalizedHolidayProfiles.value.find((profile) => profile.year === selectedHolidayYear.value) ||
  createPlanningHolidayProfile({ year: selectedHolidayYear.value }, selectedHolidayYear.value)
)

const hasSelectedHolidayProfile = computed(() =>
  normalizedHolidayProfiles.value.some((profile) => profile.year === selectedHolidayYear.value)
)

const customHolidayRows = computed(() => selectedHolidayProfile.value.customHolidays)

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
  get: () => normalizeOperatingWeekdays(operatingWeekdays.value),
  set: (selectedDays) => {
    operatingWeekdays.value = normalizeOperatingWeekdays(selectedDays)
  }
})

watch(
  operatingWeekdays,
  (nextValue) => {
    const normalizedSelection = normalizeOperatingWeekdays(nextValue)

    if (
      Array.isArray(nextValue) &&
      nextValue.length === normalizedSelection.length &&
      nextValue.every((value, index) => value === normalizedSelection[index])
    ) {
      return
    }

    operatingWeekdays.value = normalizedSelection
  },
  { immediate: true }
)

const selectedHolidayYearMinDate = computed(() => `${selectedHolidayYear.value}-01-01`)
const selectedHolidayYearMaxDate = computed(() => `${selectedHolidayYear.value}-12-31`)

const setHolidayProfilesForYear = (nextCustomHolidays) => {
  const nextProfile = createPlanningHolidayProfile(
    {
      ...selectedHolidayProfile.value,
      year: selectedHolidayYear.value,
      customHolidays: nextCustomHolidays
    },
    selectedHolidayYear.value
  )

  holidayProfiles.value = sortHolidayProfiles([
    ...normalizedHolidayProfiles.value.filter((profile) => profile.year !== selectedHolidayYear.value),
    nextProfile
  ])
}

const loadTemplateHolidays = () => {
  setHolidayProfilesForYear(
    mergeHolidayRowsWithTemplate(
      customHolidayRows.value,
      selectedHolidayYear.value
    )
  )
}

const addCustomHoliday = () => {
  setHolidayProfilesForYear([
    ...customHolidayRows.value,
    createCustomHoliday({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: '',
      date: ''
    })
  ])
}

const updateCustomHoliday = (holidayId, patch) => {
  setHolidayProfilesForYear(
    customHolidayRows.value.map((holiday) =>
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
  )
}

const removeCustomHoliday = (holidayId) => {
  setHolidayProfilesForYear(customHolidayRows.value.filter((holiday) => holiday.id !== holidayId))
}

const priorYearProfile = computed(() =>
  normalizedHolidayProfiles.value.find((profile) => profile.year === selectedHolidayYear.value - 1) || null
)

const copyPriorYearLabel = computed(() =>
  priorYearProfile.value ? `Copy ${priorYearProfile.value.year}` : 'Copy Prior Year'
)

const cloneHolidayRowsToYear = (holidayRows, targetYear) => {
  const projectedTemplateLookup = new Map(
    createHolidayTemplateHolidays(HOLIDAY_CALENDAR_US_FEDERAL, targetYear).map((holiday) => [holiday.sourceRuleId || holiday.id, holiday])
  )

  return holidayRows.map((holiday) => {
    const normalizedHoliday = createCustomHoliday(holiday)

    if (normalizedHoliday.sourceRuleId) {
      const projectedHoliday = projectedTemplateLookup.get(normalizedHoliday.sourceRuleId)

      return createCustomHoliday({
        ...normalizedHoliday,
        date: projectedHoliday?.date || normalizedHoliday.date
      })
    }

    return createCustomHoliday({
      ...normalizedHoliday,
      date: `${targetYear}-${String(normalizedHoliday.month).padStart(2, '0')}-${String(normalizedHoliday.day).padStart(2, '0')}`
    })
  })
}

const applyPriorYearCopy = () => {
  if (!priorYearProfile.value) {
    return
  }

  setHolidayProfilesForYear(cloneHolidayRowsToYear(priorYearProfile.value.customHolidays, selectedHolidayYear.value))
}

const copyPriorYear = () => {
  if (!priorYearProfile.value) {
    return
  }

  if (customHolidayRows.value.length) {
    requestCopyPriorYearConfirmation({
      title: `Replace ${selectedHolidayYear.value} Holiday Schedule?`,
      description: `This replaces the current ${selectedHolidayYear.value} closed dates with a projected copy of ${priorYearProfile.value.year}.`,
      confirmLabel: 'Replace Holiday Schedule',
      confirmVariant: 'primary',
      onConfirm: applyPriorYearCopy
    })
    return
  }

  applyPriorYearCopy()
}

const holidayYearStatusMessage = computed(() => {
  if (customHolidayRows.value.length) {
    return `${customHolidayRows.value.length} holiday row${customHolidayRows.value.length === 1 ? '' : 's'} configured for ${selectedHolidayYear.value}.`
  }

  if (hasSelectedHolidayProfile.value) {
    return `No closed dates are currently configured for ${selectedHolidayYear.value}. Load U.S. holidays, add holidays manually, or copy the prior year.`
  }

  return `No holiday schedule saved for ${selectedHolidayYear.value}. Load U.S. holidays, add holidays manually, or copy the prior year.`
})
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

      <AppWorkspaceSection
        title="Closed Dates"
        :description="`Year-specific holiday defaults for ${selectedHolidayYear}. Saved plans keep their own holiday snapshot.`"
      >
        <div class="grid gap-4">
          <div class="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[minmax(0,12rem)_1fr] lg:items-end">
            <AppFieldGroup label="Holiday Year" input-id="holiday-year">
              <AppSelect
                id="holiday-year"
                v-model="selectedHolidayYear"
                :options="holidayYearOptions"
                class="max-w-[12rem]"
              />
            </AppFieldGroup>

            <div class="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              <AppButton
                size="sm"
                variant="secondary"
                :disabled="!priorYearProfile"
                @click="copyPriorYear"
              >
                {{ copyPriorYearLabel }}
              </AppButton>
              <AppButton size="sm" variant="secondary" @click="loadTemplateHolidays">
                Load U.S. Holidays
              </AppButton>
              <AppButton size="sm" variant="secondary" @click="addCustomHoliday">
                Add Holiday
              </AppButton>
            </div>
          </div>

          <AppStatusMessage>
            {{ holidayYearStatusMessage }}
          </AppStatusMessage>

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
                  :min="selectedHolidayYearMinDate"
                  :max="selectedHolidayYearMaxDate"
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

          <AppStatusMessage v-if="hasHolidayValidationErrors" tone="error">
            Complete each holiday name and date before saving.
          </AppStatusMessage>
        </div>
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

  <AppConfirmDialog
    v-model:visible="copyPriorYearConfirmOpen"
    :title="copyPriorYearConfirmTitle"
    :description="copyPriorYearConfirmDescription"
    :confirm-label="copyPriorYearConfirmLabel"
    :confirm-variant="copyPriorYearConfirmVariant"
    @confirm="confirmCopyPriorYear"
  />
</template>
