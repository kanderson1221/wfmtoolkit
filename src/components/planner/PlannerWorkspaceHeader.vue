<script setup>
import { computed } from 'vue'
import AppButton from '../ui/AppButton.vue'
import AppSelect from '../ui/AppSelect.vue'

const props = defineProps({
  autosaveStatusMessage: {
    type: String,
    default: ''
  },
  autosaveState: {
    type: String,
    default: 'idle'
  },
  yearOptions: {
    type: Array,
    default: () => []
  },
  selectedPlanningYear: {
    type: Number,
    required: true
  },
  yearActionHref: {
    type: String,
    default: ''
  },
  yearActionLabel: {
    type: String,
    default: ''
  },
  yearActionVariant: {
    type: String,
    default: 'secondary'
  }
})

const emit = defineEmits(['update:selectedPlanningYear'])

const autosaveStatusClass = computed(() => {
  if (props.autosaveState === 'saving') {
    return 'text-sky-700'
  }

  if (props.autosaveState === 'restored') {
    return 'text-emerald-700'
  }

  return 'text-slate-500'
})
</script>

<template>
  <div class="grid gap-2.5 px-1">
    <div class="flex flex-col gap-2 border-b border-slate-200/90 pb-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="grid gap-1">
        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Planning Year</span>
        <div class="flex flex-wrap items-center gap-2">
          <AppSelect
            :model-value="props.selectedPlanningYear"
            :options="props.yearOptions"
            class="min-w-[132px] text-sm"
            aria-label="Planning year"
            @update:model-value="emit('update:selectedPlanningYear', $event)"
          />
          <AppButton
            v-if="props.yearActionHref && props.yearActionLabel"
            size="sm"
            :href="props.yearActionHref"
            :variant="props.yearActionVariant"
          >
            {{ props.yearActionLabel }}
          </AppButton>
        </div>
      </div>

      <p v-if="props.autosaveStatusMessage" class="text-sm font-medium" :class="autosaveStatusClass">
        {{ props.autosaveStatusMessage }}
      </p>
    </div>
  </div>
</template>
