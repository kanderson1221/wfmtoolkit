<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTextField from '../ui/AppTextField.vue'

const props = defineProps({
  sourcePlan: {
    type: Object,
    required: true
  },
  budgetPlan: {
    type: Object,
    default: null
  },
  actualsThroughOptions: {
    type: Array,
    default: () => []
  },
  actualsThroughBlocker: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['cancel', 'create'])

const visible = defineModel('visible', {
  type: Boolean,
  default: true
})
const actualsThroughMonth = defineModel('actualsThroughMonth', {
  type: String,
  default: ''
})
const updateName = defineModel('updateName', {
  type: String,
  default: ''
})

const canCreate = computed(() =>
  props.actualsThroughOptions.some((option) => option.value === actualsThroughMonth.value) &&
  Boolean(String(updateName.value || '').trim())
)
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    title="Create Updated Plan"
    description="Copy the selected plan, actualize closed months through the selected cutoff, and open the update as an editable draft."
    max-width="max-w-2xl"
    @close="emit('cancel')"
  >
    <div class="grid gap-4">
      <div class="grid gap-3 border border-slate-200 bg-slate-50 px-4 py-3">
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Source Plan</span>
          <strong class="text-sm text-slate-950">{{ props.sourcePlan.name || `${props.sourcePlan.planningYear} Plan` }}</strong>
        </div>
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Budget Baseline</span>
          <strong class="text-sm text-slate-950">{{ props.budgetPlan?.name || `${props.sourcePlan.planningYear} Budget` }}</strong>
        </div>
      </div>

      <AppStatusMessage v-if="!props.actualsThroughOptions.length" tone="warning">
        {{ props.actualsThroughBlocker || `Load actuals for ${props.sourcePlan.planningYear} before creating an updated plan.` }}
      </AppStatusMessage>

      <AppStatusMessage v-else-if="props.actualsThroughBlocker" tone="warning">
        {{ props.actualsThroughBlocker }}
      </AppStatusMessage>

      <AppFieldGroup
        label="Actuals Through"
        input-id="plan-update-actuals-through"
      >
        <AppSelect
          id="plan-update-actuals-through"
          v-model="actualsThroughMonth"
          :options="props.actualsThroughOptions"
          :disabled="!props.actualsThroughOptions.length"
        />
      </AppFieldGroup>

      <AppFieldGroup
        label="Update Name"
        input-id="plan-update-name"
      >
        <AppTextField id="plan-update-name" v-model.trim="updateName" />
      </AppFieldGroup>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AppButton variant="secondary" @click="emit('cancel')">
          Cancel
        </AppButton>
        <AppButton
          variant="primary"
          :disabled="!canCreate"
          @click="emit('create')"
        >
          Create Updated Plan
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
