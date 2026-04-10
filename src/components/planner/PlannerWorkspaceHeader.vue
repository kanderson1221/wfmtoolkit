<script setup>
import { computed } from 'vue'

const props = defineProps({
  autosaveStatusMessage: {
    type: String,
    default: ''
  },
  autosaveState: {
    type: String,
    default: 'idle'
  }
})

const autosaveStatusClass = computed(() => {
  if (props.autosaveState === 'saving') {
    return 'text-[#15395f]'
  }

  if (props.autosaveState === 'error') {
    return 'text-rose-700'
  }

  if (props.autosaveState === 'restored' || props.autosaveState === 'saved') {
    return 'text-[#15395f]'
  }

  return 'text-slate-500'
})
</script>

<template>
  <p
    v-if="props.autosaveStatusMessage"
    class="text-[0.78rem] font-medium tracking-[0.01em] whitespace-nowrap"
    :class="autosaveStatusClass"
  >
    {{ props.autosaveStatusMessage }}
  </p>
</template>
