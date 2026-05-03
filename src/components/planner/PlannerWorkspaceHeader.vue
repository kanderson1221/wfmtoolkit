<script setup>
import { computed } from 'vue'
import {
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiCloudSyncOutline,
  mdiContentSaveCheckOutline
} from '@mdi/js'
import AppIcon from '../ui/AppIcon.vue'

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
    return 'border-[#c3d2df] bg-[#edf4fa] text-[#15395f]'
  }

  if (props.autosaveState === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-800'
  }

  if (props.autosaveState === 'restored' || props.autosaveState === 'saved') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }

  return 'border-slate-200 bg-white text-slate-600'
})

const autosaveIconPath = computed(() => {
  if (props.autosaveState === 'saving') {
    return mdiCloudSyncOutline
  }

  if (props.autosaveState === 'error') {
    return mdiAlertCircleOutline
  }

  if (props.autosaveState === 'restored') {
    return mdiContentSaveCheckOutline
  }

  return mdiCheckCircleOutline
})
</script>

<template>
  <div
    v-if="props.autosaveStatusMessage"
    class="inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-[0.78rem] font-semibold leading-5 shadow-sm"
    :class="autosaveStatusClass"
    :role="props.autosaveState === 'error' ? 'alert' : 'status'"
    aria-live="polite"
  >
    <AppIcon :path="autosaveIconPath" size="16" class="shrink-0" />
    <span class="min-w-0">
      {{ props.autosaveStatusMessage }}
    </span>
  </div>
</template>
