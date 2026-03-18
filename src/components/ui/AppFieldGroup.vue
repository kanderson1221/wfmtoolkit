<script setup>
const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  inputId: {
    type: String,
    default: ''
  },
  helpText: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="grid gap-2">
    <div v-if="props.label || $slots.action" class="flex items-center justify-between gap-3">
      <label
        v-if="props.label"
        :for="props.inputId || undefined"
        class="text-sm font-medium text-slate-700"
      >
        {{ props.label }}
      </label>

      <div v-if="$slots.action" class="shrink-0">
        <slot name="action" />
      </div>
    </div>

    <slot />

    <p v-if="$slots.help" class="text-sm leading-6 text-slate-600">
      <slot name="help" />
    </p>
    <p v-else-if="props.helpText" class="text-sm leading-6 text-slate-600">
      {{ props.helpText }}
    </p>

    <p v-if="props.error" class="text-sm font-medium text-rose-700">
      {{ props.error }}
    </p>
  </div>
</template>
