<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppTextField from '../ui/AppTextField.vue'

const props = defineProps({
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
    default: false
  }
})

const emit = defineEmits(['close', 'save'])

const groupName = defineModel('groupName', {
  type: String,
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

const serviceLevelPercent = defineModel('serviceLevelPercent', {
  type: Number,
  required: true
})

const serviceLevelThresholdSeconds = defineModel('serviceLevelThresholdSeconds', {
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
</script>

<template>
  <AppDialog
    v-model:visible="dialogOpen"
    :title="props.title"
    description=""
    :allow-backdrop-close="props.allowBackdropClose"
    max-width="max-w-5xl"
    @close="emit('close')"
  >
    <div class="grid gap-6">
      <div class="overflow-hidden rounded-[28px] border border-[#15395f]/18 bg-[#15395f] shadow-[0_18px_44px_rgba(21,57,95,0.18)]">
        <div class="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:px-6 lg:py-6">
          <div class="grid gap-1 lg:col-span-2">
            <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-white/65">
              Staffing Group
            </span>
            <h3 class="text-[1.45rem] font-semibold tracking-[-0.04em] text-white">
              Shared staffing defaults
            </h3>
            <p class="text-sm leading-6 text-slate-200">
              Set the shared planning targets this staffing group will use across forecasting, intraday setup, and annual plans.
            </p>
          </div>

          <div class="flex min-h-[8.75rem] flex-col justify-end rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm lg:p-5">
            <div class="grid gap-3">
              <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-white/65">
                Staffing Group Name
              </span>

              <div class="rounded-[20px] border border-white/12 bg-[#0f2f4d]/55 px-4 py-3">
                <AppTextField
                  id="staffing-group-name"
                  v-model.trim="groupName"
                  aria-label="Staffing Group Name"
                  class="border-white/15 bg-white text-slate-950 shadow-none focus:border-white focus:ring-white/20"
                  maxlength="80"
                  placeholder="Service"
                  autofocus
                />
              </div>
            </div>
          </div>

          <div class="flex min-h-[8.75rem] flex-col justify-end rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm lg:p-5">
            <div class="grid gap-3">
              <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-white/65">
                Service Level
              </span>

              <div class="overflow-x-auto rounded-[20px] border border-white/12 bg-[#0f2f4d]/55 px-4 py-3">
                <div class="flex min-w-max items-center gap-2 whitespace-nowrap">
                  <span class="text-sm font-medium text-white/90">Answer</span>
                  <div class="w-[5.5rem] shrink-0">
                    <AppNumberField
                      input-id="group-service-level-percent"
                      v-model="serviceLevelPercent"
                      aria-label="Service level goal percent"
                      class="border-white/15 bg-white text-slate-950 shadow-none focus:border-white focus:ring-white/20"
                      :min="1"
                      :max="100"
                      :step="0.1"
                      :min-fraction-digits="0"
                      :max-fraction-digits="1"
                      placeholder="80"
                    />
                  </div>
                  <span class="text-sm font-medium text-white/90">% of contacts within</span>
                  <div class="w-[5.5rem] shrink-0">
                    <AppNumberField
                      input-id="group-service-level-seconds"
                      v-model="serviceLevelThresholdSeconds"
                      aria-label="Service level goal seconds"
                      class="border-white/15 bg-white text-slate-950 shadow-none focus:border-white focus:ring-white/20"
                      :min="1"
                      :max="3600"
                      :step="1"
                      :min-fraction-digits="0"
                      :max-fraction-digits="0"
                      placeholder="20"
                    />
                  </div>
                  <span class="text-sm font-medium text-white/90">seconds</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-5 rounded-[26px] border border-slate-200 bg-[#f3f7fb] px-5 py-5 lg:px-6">
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#15395f]">
            Planning Defaults
          </span>
          <p class="text-sm leading-6 text-slate-600">Defaults that new yearly plans inherit before local overrides are applied.</p>
        </div>

        <div class="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <AppFieldGroup label="Paid Hours per Day" input-id="group-default-paid-hours">
            <AppNumberField
              input-id="group-default-paid-hours"
              v-model="defaultPaidHoursPerDay"
              :min="0"
              :max="24"
              :step="0.25"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              placeholder="8"
            />
          </AppFieldGroup>

          <AppFieldGroup label="Occupancy (%)" input-id="group-default-occupancy">
            <AppNumberField
              input-id="group-default-occupancy"
              v-model="defaultOccupancyPercent"
              :min="1"
              :max="100"
              :step="0.1"
              :min-fraction-digits="0"
              :max-fraction-digits="1"
              placeholder="90"
            />
          </AppFieldGroup>

          <AppFieldGroup label="Adherence (%)" input-id="group-default-adherence">
            <AppNumberField
              input-id="group-default-adherence"
              v-model="defaultAdherencePercent"
              :min="1"
              :max="100"
              :step="0.1"
              :min-fraction-digits="0"
              :max-fraction-digits="1"
              placeholder="95"
            />
          </AppFieldGroup>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
        <AppButton variant="secondary" @click="emit('close')">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!groupName.trim()" @click="emit('save')">
          {{ props.submitLabel }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
