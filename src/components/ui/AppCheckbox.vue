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
        root: { class: 'mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white data-[p-checked=true]:border-sky-700 data-[p-checked=true]:bg-sky-700 data-[p-disabled=true]:opacity-60' },
        box: { class: 'flex h-full w-full items-center justify-center rounded-[3px]' },
        icon: { class: 'h-3 w-3 text-white' },
        input: { class: 'cursor-pointer' }
      }"
    />
    <span class="leading-6">
      <slot />
    </span>
  </label>
</template>
