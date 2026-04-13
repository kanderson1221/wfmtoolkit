<script setup>
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import {
  FORECAST_SOURCE_KIND_OPTIONS,
  getForecastSourceKindLabel
} from '../../forecasting/shared'

const props = defineProps({
  items: {
    type: Array,
    default: () => FORECAST_SOURCE_KIND_OPTIONS
  }
})

const emit = defineEmits(['select', 'close'])

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

const handleClose = () => {
  visible.value = false
  emit('close')
}

const handleSelect = (item) => {
  visible.value = false
  emit('select', item.id)
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    kicker="New Forecast"
    title="Choose Forecast Source"
    description="Create a staffing-group forecast from modeled history, an imported daily file, or monthly contacts."
    allow-backdrop-close
    max-width="max-w-3xl"
    @close="emit('close')"
  >
    <div class="grid gap-3">
      <button
        v-for="item in props.items"
        :key="item.id"
        type="button"
        class="grid gap-1 border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-[#c3d2df] hover:bg-slate-50"
        @click="handleSelect(item)"
      >
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-base font-semibold tracking-[-0.02em] text-slate-950">
            {{ item.label }}
          </h3>
          <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-600">
            {{ getForecastSourceKindLabel(item.id) }}
          </span>
        </div>
        <p class="text-sm leading-6 text-slate-600">
          {{ item.description }}
        </p>
      </button>
    </div>

    <template #footer>
      <div class="flex justify-end border-t border-slate-200 pt-5">
        <AppButton variant="secondary" @click="handleClose">Cancel</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
