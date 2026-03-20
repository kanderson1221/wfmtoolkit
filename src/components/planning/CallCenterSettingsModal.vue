<script setup>
import { computed } from 'vue'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppTextField from '../ui/AppTextField.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

const props = defineProps({
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

const timezone = defineModel('timezone', {
  type: String,
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
    description="Set the basic identity for this call center. Staffing groups inside it can now manage their own operating schedules and planning defaults."
    kicker="Planning App"
    :allow-backdrop-close="props.allowBackdropClose"
    max-width="max-w-3xl"
    @close="emit('close')"
  >

    <div class="grid gap-4">
      <AppWorkspaceSection
        kicker="Identity"
        title="Call center identity"
        description="Name the operation and set the planning time zone that staffing groups and plans inside this call center should follow."
      >
        <AppFieldGroup label="Call Center Name" input-id="call-center-name">
          <AppTextField
            id="call-center-name"
            v-model.trim="centerName"
            maxlength="80"
            placeholder="Enter a call center name"
          />
        </AppFieldGroup>

        <AppFieldGroup
          label="Time Zone"
          input-id="call-center-timezone"
          help-text="Use the IANA time zone that planners and reports should follow."
        >
          <AppTextField
            id="call-center-timezone"
            v-model.trim="timezone"
            placeholder="Enter an IANA time zone"
          />
        </AppFieldGroup>
      </AppWorkspaceSection>
    </div>

    <template #footer>
      <div class="flex flex-col gap-4 border-t border-slate-200 pt-5 lg:flex-row lg:items-center lg:justify-end">
        <AppButton variant="secondary" @click="emit('close')">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!centerName.trim()" @click="emit('save')">
          {{ props.submitLabel }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
