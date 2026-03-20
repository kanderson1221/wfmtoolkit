<script setup>
import Checkbox from 'primevue/checkbox'

const props = defineProps({
  inputId: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const model = defineModel({
  type: Boolean,
  default: false
})
</script>

<template>
  <label class="inline-flex items-start gap-3 text-sm text-slate-700">
    <Checkbox
      v-model="model"
      binary
      unstyled
      :input-id="props.inputId"
      :disabled="props.disabled"
      :pt="{
        root: { class: 'relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-slate-300 bg-white transition data-[p-checked=true]:border-[#15395f] data-[p-checked=true]:bg-[#15395f] data-[p-disabled=true]:opacity-60' },
        box: { class: 'flex h-full w-full items-center justify-center rounded-[4px]' },
        icon: { class: 'h-3 w-3 text-white' },
        input: { class: 'absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0' }
      }"
    />
    <span class="leading-6">
      <slot />
    </span>
  </label>
</template>
