<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppTextField from '../ui/AppTextField.vue'
import { STAFFING_CHANNEL_OPTIONS, isEmailChannel } from '../../planner/channels'

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
  },
  channelLocked: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save'])

const groupName = defineModel('groupName', {
  type: String,
  required: true
})

const channelType = defineModel('channelType', {
  type: String,
  required: true
})

const serviceGoalPercent = defineModel('serviceGoalPercent', {
  type: Number,
  required: true
})

const serviceGoalThreshold = defineModel('serviceGoalThreshold', {
  type: Number,
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

const emailChannel = computed(() => isEmailChannel(channelType.value))

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
    max-width="max-w-4xl"
    @close="emit('close')"
  >
    <div class="grid gap-4">
      <section class="grid gap-5 rounded-[24px] border border-[#15395f]/18 bg-[#15395f] p-5 shadow-[0_14px_34px_rgba(21,57,95,0.16)] sm:p-6">
          <div class="grid gap-1">
            <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-white/65">
              Staffing Group
            </span>
            <h3 class="text-xl font-semibold tracking-[-0.035em] text-white">
              Shared staffing defaults
            </h3>
            <p class="max-w-2xl text-sm leading-5 text-slate-200">
              Set the contact channel and shared targets this staffing group will use across forecasting and annual plans.
            </p>
          </div>

          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.9fr)]">
            <div class="grid gap-4 rounded-[18px] border border-white/12 bg-white/[0.08] p-4">
              <div class="grid gap-2">
                <label for="staffing-group-name" class="text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-white/70">
                Staffing Group Name
                </label>
                <AppTextField
                  id="staffing-group-name"
                  v-model.trim="groupName"
                  aria-label="Staffing Group Name"
                  class="border-white/15 bg-white text-slate-950 shadow-sm focus:border-white focus:ring-white/20"
                  maxlength="80"
                  placeholder="e.g. Customer Email Support"
                  autofocus
                />
              </div>

              <div class="grid gap-2">
                <label for="staffing-group-channel" class="text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-white/70">
                  Contact Channel
                </label>
                <AppSelect
                  id="staffing-group-channel"
                  v-model="channelType"
                  :options="STAFFING_CHANNEL_OPTIONS"
                  :disabled="props.channelLocked"
                  aria-label="Staffing group contact channel"
                />
                <span v-if="props.channelLocked" class="text-xs leading-4 text-white/65">
                  Channel is fixed after the staffing group is created.
                </span>
              </div>
            </div>

            <div class="grid content-start gap-4 rounded-[18px] border border-white/12 bg-white/[0.08] p-4">
              <div class="grid gap-1">
                <span class="text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-white/70">
                {{ emailChannel ? 'Response Target' : 'Service Level' }}
                </span>
                <p class="text-xs leading-5 text-white/65">
                  {{ emailChannel ? 'Define the email response objective for this group.' : 'Define the answer objective for this group.' }}
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="grid gap-2">
                  <label for="group-service-level-percent" class="text-xs font-medium text-white/85">
                    {{ emailChannel ? 'Emails responded to (%)' : 'Contacts answered (%)' }}
                  </label>
                    <AppNumberField
                      input-id="group-service-level-percent"
                      v-model="serviceGoalPercent"
                      :aria-label="emailChannel ? 'Email response target percent' : 'Service level goal percent'"
                      class="border-white/15 bg-white text-slate-950 shadow-sm focus:border-white focus:ring-white/20"
                      :min="1"
                      :max="100"
                      :step="0.1"
                      :min-fraction-digits="0"
                      :max-fraction-digits="1"
                      placeholder="80"
                    />
                </div>

                <div class="grid gap-2">
                  <label for="group-service-goal-threshold" class="text-xs font-medium text-white/85">
                    Within ({{ emailChannel ? 'business hours' : 'seconds' }})
                  </label>
                    <AppNumberField
                      input-id="group-service-goal-threshold"
                      v-model="serviceGoalThreshold"
                      :aria-label="emailChannel ? 'Email response target business hours' : 'Service level goal seconds'"
                      class="border-white/15 bg-white text-slate-950 shadow-sm focus:border-white focus:ring-white/20"
                      :min="1"
                      :max="emailChannel ? 744 : 3600"
                      :step="emailChannel ? 0.5 : 1"
                      :min-fraction-digits="0"
                      :max-fraction-digits="emailChannel ? 1 : 0"
                      :placeholder="emailChannel ? '24' : '20'"
                    />
                </div>
              </div>
            </div>
          </div>
      </section>

      <section class="grid gap-4 rounded-[22px] border border-slate-200 bg-[#f5f8fb] p-5 sm:p-6">
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#15395f]">
            Planning Defaults
          </span>
          <p class="text-sm leading-5 text-slate-600">Defaults that new yearly plans inherit before local overrides are applied.</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          <AppFieldGroup :label="emailChannel ? 'Productive Utilization (%)' : 'Occupancy (%)'" input-id="group-default-occupancy">
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

      </section>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <AppButton variant="secondary" @click="emit('close')">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!groupName.trim()" @click="emit('save')">
          {{ props.submitLabel }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
