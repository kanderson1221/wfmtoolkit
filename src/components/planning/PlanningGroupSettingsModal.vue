<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppTextField from '../ui/AppTextField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

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
    :allow-backdrop-close="props.allowBackdropClose"
    max-width="max-w-4xl"
    @close="emit('close')"
  >
    <div class="grid items-start gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <AppWorkspaceSection title="Staffing Group" class="self-start">
        <AppFieldGroup label="Staffing Group Name" input-id="staffing-group-name">
          <AppTextField
            id="staffing-group-name"
            v-model.trim="groupName"
            maxlength="80"
            placeholder="Service"
            autofocus
          />
        </AppFieldGroup>
      </AppWorkspaceSection>

      <AppWorkspaceSection
        title="Planning Defaults"
        description="Defaults new yearly plans inherit."
        :subtle="false"
        class="self-start"
      >
        <div class="grid gap-3">
          <div class="rounded-[20px] border border-slate-200 bg-slate-50/60 p-3">
            <AppFieldGroup
              compact
              label="Paid Hours per Day"
              input-id="group-default-paid-hours"
              help-text="Base paid shift hours per agent."
            >
              <div class="planning-default-control max-w-[14rem]">
                <AppNumberField
                  input-id="group-default-paid-hours"
                  v-model="defaultPaidHoursPerDay"
                  min="0"
                  max="24"
                  step="0.25"
                  :min-fraction-digits="0"
                  :max-fraction-digits="2"
                  placeholder="8"
                  compact
                />
              </div>
            </AppFieldGroup>
          </div>

          <div class="rounded-[20px] border border-slate-200 bg-slate-50/60 p-3">
            <AppFieldGroup
              compact
              label="Occupancy (%)"
              input-id="group-default-occupancy"
              help-text="Target scheduled time spent handling workload."
            >
              <div class="planning-default-control max-w-[14rem]">
                <AppNumberField
                  input-id="group-default-occupancy"
                  v-model="defaultOccupancyPercent"
                  min="1"
                  max="100"
                  step="0.1"
                  :min-fraction-digits="0"
                  :max-fraction-digits="1"
                  placeholder="90"
                  compact
                />
              </div>
            </AppFieldGroup>
          </div>

          <div class="rounded-[20px] border border-slate-200 bg-slate-50/60 p-3">
            <AppFieldGroup
              compact
              label="Adherence (%)"
              input-id="group-default-adherence"
              help-text="Expected scheduled time spent in planned activities."
            >
              <div class="planning-default-control max-w-[14rem]">
                <AppNumberField
                  input-id="group-default-adherence"
                  v-model="defaultAdherencePercent"
                  min="1"
                  max="100"
                  step="0.1"
                  :min-fraction-digits="0"
                  :max-fraction-digits="1"
                  placeholder="95"
                  compact
                />
              </div>
            </AppFieldGroup>
          </div>
        </div>
      </AppWorkspaceSection>
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

<style scoped>
.planning-default-control :deep(.p-inputnumber) {
  display: block;
  width: 100%;
}

.planning-default-control :deep(.p-inputnumber-input) {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 1rem;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.planning-default-control :deep(.p-inputnumber-input:hover) {
  border-color: #b8c7d6;
}

.planning-default-control :deep(.p-inputnumber-input:focus) {
  border-color: #15395f;
  box-shadow: 0 0 0 4px #d7e3ec;
  outline: none;
}
</style>
