<script setup>
import { computed } from 'vue'

const props = defineProps({
  tone: {
    type: String,
    default: 'info'
  },
  role: {
    type: String,
    default: ''
  }
})

const messageClass = computed(() => {
  if (props.tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }

  if (props.tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  return 'border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]'
})

const resolvedRole = computed(() => props.role || (props.tone === 'error' ? 'alert' : 'status'))
</script>

<template>
  <div
    class="rounded-3xl border px-4 py-3 text-sm font-medium"
    :class="messageClass"
    :role="resolvedRole"
    aria-live="polite"
  >
    <slot />
  </div>
</template>
