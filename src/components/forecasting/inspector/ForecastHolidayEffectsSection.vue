<script setup>
import { mdiCalendarStar } from '@mdi/js'

import AppButton from '../../ui/AppButton.vue'
import AppInfoTooltip from '../../ui/AppInfoTooltip.vue'
import AppNumberField from '../../ui/AppNumberField.vue'
import AppSelect from '../../ui/AppSelect.vue'
import AppTextField from '../../ui/AppTextField.vue'
import AppWorkspaceSection from '../../ui/AppWorkspaceSection.vue'
import { HOLIDAY_CALENDAR_OPTIONS } from '../../../forecasting/shared'
import { inspectorHelp } from '../forecastInspectorHelp'

defineProps({
  holidaySummaryLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'add-custom-holiday',
  'remove-custom-holiday'
])

const project = defineModel('project', {
  type: Object,
  required: true
})
</script>

<template>
  <AppWorkspaceSection
    kicker="Calendar"
    title="Holiday Effects"
    :icon="mdiCalendarStar"
  >
    <template #actions>
      <span class="rounded-full border border-[#d5e0ea] bg-[#eef4f8] px-3 py-1 text-[0.72rem] font-semibold text-[#15395f]">
        {{ holidaySummaryLabel }}
      </span>
    </template>

    <div class="grid gap-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-holiday-country" class="text-sm font-medium text-slate-950">
              Holiday Calendar
            </label>
            <AppInfoTooltip label="Holiday Calendar" :content="inspectorHelp.holidayCalendar" />
          </div>
          <AppSelect
            id="forecast-holiday-country"
            v-model="project.modelConfig.builtInHolidayCountry"
            :options="HOLIDAY_CALENDAR_OPTIONS"
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>

        <div class="grid gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex items-center gap-1.5">
            <label for="forecast-holiday-prior" class="text-sm font-medium text-slate-950">
              Holiday Strength
            </label>
            <AppInfoTooltip label="Holiday Strength" :content="inspectorHelp.holidayStrength" />
          </div>
          <AppNumberField
            id="forecast-holiday-prior"
            v-model="project.modelConfig.holidaysPriorScale"
            :min="0.1"
            :step="0.5"
            class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      <div class="grid gap-2.5">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-sm font-semibold text-slate-950">Custom Holidays</h4>
          <AppButton
            size="sm"
            variant="quiet"
            @click="emit('add-custom-holiday')"
          >
            Add Holiday
          </AppButton>
        </div>

        <div
          v-if="!project.modelConfig.customHolidays.length"
          class="rounded-[20px] border border-dashed border-slate-200 bg-white px-4 py-3 text-[0.82rem] text-slate-500"
        >
          No custom holidays.
        </div>

        <div v-else class="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
          <div
            v-for="holiday in project.modelConfig.customHolidays"
            :key="holiday.id"
            class="grid gap-3 border-t border-slate-200 p-4 first:border-t-0"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-name-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Name
                  </label>
                  <AppInfoTooltip label="Custom Holiday Name" :content="inspectorHelp.customHolidayName" />
                </div>
                <AppTextField
                  :id="`holiday-name-${holiday.id}`"
                  v-model.trim="holiday.name"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-date-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Date
                  </label>
                  <AppInfoTooltip label="Custom Holiday Date" :content="inspectorHelp.customHolidayDate" />
                </div>
                <AppTextField
                  :id="`holiday-date-${holiday.id}`"
                  v-model="holiday.date"
                  type="date"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-lower-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Days Before
                  </label>
                  <AppInfoTooltip label="Days Before" :content="inspectorHelp.customHolidayLowerWindow" />
                </div>
                <AppNumberField
                  :id="`holiday-lower-${holiday.id}`"
                  v-model="holiday.lowerWindow"
                  :step="1"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-upper-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Days After
                  </label>
                  <AppInfoTooltip label="Days After" :content="inspectorHelp.customHolidayUpperWindow" />
                </div>
                <AppNumberField
                  :id="`holiday-upper-${holiday.id}`"
                  v-model="holiday.upperWindow"
                  :step="1"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
              <div class="grid gap-1.5 sm:col-span-2">
                <div class="flex items-center gap-1.5">
                  <label :for="`holiday-prior-${holiday.id}`" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Strength
                  </label>
                  <AppInfoTooltip label="Custom Holiday Strength" :content="inspectorHelp.customHolidayStrength" />
                </div>
                <AppNumberField
                  :id="`holiday-prior-${holiday.id}`"
                  v-model="holiday.priorScale"
                  :min="0.1"
                  :step="0.5"
                  compact
                  class="border-slate-200 bg-slate-50 shadow-none focus:bg-white focus:ring-2"
                />
              </div>
            </div>

            <div class="flex justify-end">
              <AppButton size="sm" variant="quiet" @click="emit('remove-custom-holiday', holiday.id)">
                Remove
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppWorkspaceSection>
</template>
