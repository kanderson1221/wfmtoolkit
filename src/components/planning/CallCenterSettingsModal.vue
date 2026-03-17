<script setup>
import { computed } from 'vue'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppTextField from '../ui/AppTextField.vue'

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

const emit = defineEmits(['close', 'save'])

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
    description="Set the shared operating defaults that new staffing groups should inherit inside this call center."
    kicker="Planning App"
    :allow-backdrop-close="props.allowBackdropClose"
    max-width="max-w-5xl"
    @close="emit('close')"
  >

    <div class="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
      <section class="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Identity
          </span>
          <p class="text-sm text-slate-600">
            Name the operation and set the time zone used for planning.
          </p>
        </div>

        <label class="grid gap-2">
          <span class="text-sm font-medium text-slate-700">Call Center Name</span>
          <AppTextField
            v-model.trim="centerName"
            maxlength="80"
            placeholder="Enter a call center name"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-medium text-slate-700">Time Zone</span>
          <AppTextField
            v-model.trim="timezone"
            placeholder="Enter an IANA time zone"
          />
        </label>

        <div class="grid gap-3">
          <div class="grid gap-1">
            <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Operating Days
            </span>
            <p class="text-sm text-slate-600">
              These days determine open business days in new staffing groups unless the calendar is adjusted later.
            </p>
          </div>

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
        </div>
      </section>

      <section class="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5">
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Default Modeling Assumptions
          </span>
          <p class="text-sm text-slate-600">
            New staffing groups start from these values unless a planner changes them later.
          </p>
        </div>

        <label class="grid gap-2">
          <span class="text-sm font-medium text-slate-700">Default Paid Hours per Day</span>
          <AppNumberField
            v-model="defaultPaidHoursPerDay"
            min="0"
            max="24"
            step="0.25"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-medium text-slate-700">Default Occupancy (%)</span>
          <AppNumberField
            v-model="defaultOccupancyPercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="0"
            :max-fraction-digits="1"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-medium text-slate-700">Default Adherence (%)</span>
          <AppNumberField
            v-model="defaultAdherencePercent"
            min="1"
            max="100"
            step="0.1"
            :min-fraction-digits="0"
            :max-fraction-digits="1"
          />
        </label>

        <div class="rounded-3xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900">
          Choose values that represent the standard operating pattern for this call center. New staffing groups inherit these defaults on creation.
        </div>
      </section>
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
          <AppButton variant="primary" :disabled="!centerName.trim()" @click="emit('save')">
            {{ props.submitLabel }}
          </AppButton>
        </div>
      </div>
    </template>
  </AppDialog>
</template>
