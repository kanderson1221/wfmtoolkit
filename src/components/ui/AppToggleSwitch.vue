<script setup>
import ToggleSwitch from 'primevue/toggleswitch'

const props = defineProps({
  inputId: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  ariaLabel: {
    type: String,
    default: ''
  }
})

const model = defineModel({
  type: Boolean,
  default: false
})
</script>

<template>
  <ToggleSwitch
    v-model="model"
    unstyled
    :input-id="props.inputId"
    :disabled="props.disabled"
    :aria-label="props.ariaLabel"
    :pt="{
      root: {
        class: 'relative inline-flex h-6 w-10 shrink-0 items-center data-[p-disabled=true]:opacity-60 data-[p-checked=true]:[&_.app-toggle-slider]:border-[#15395f] data-[p-checked=true]:[&_.app-toggle-slider]:bg-[#15395f] data-[p-checked=true]:[&_.app-toggle-handle]:translate-x-4'
      },
      input: { class: 'absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0' },
      slider: { class: 'app-toggle-slider block h-full w-full rounded-full border border-slate-300 bg-slate-200 transition-colors duration-200' },
      handle: { class: 'app-toggle-handle absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200' }
    }"
  />
</template>
