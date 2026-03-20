<script setup>
import { computed } from 'vue'
import Dialog from 'primevue/dialog'

import { buildDialogPt } from './primevuePresets'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  kicker: {
    type: String,
    default: ''
  },
  allowBackdropClose: {
    type: Boolean,
    default: false
  },
  maxWidth: {
    type: String,
    default: 'max-w-4xl'
  }
})

const emit = defineEmits(['close'])

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

const dialogPt = computed(() => buildDialogPt(props.maxWidth))
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :closable="false"
    :close-on-escape="props.allowBackdropClose"
    :dismissable-mask="props.allowBackdropClose"
    :draggable="false"
    :pt="dialogPt"
    @hide="emit('close')"
  >
    <template #header>
      <div class="grid gap-2">
        <span v-if="props.kicker" class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#15395f]">
          {{ props.kicker }}
        </span>
        <div class="grid gap-1">
          <h2 class="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {{ props.title }}
          </h2>
          <p v-if="props.description" class="max-w-3xl text-sm leading-6 text-slate-600">
            {{ props.description }}
          </p>
        </div>
        <slot name="header" />
      </div>
    </template>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Dialog>
</template>
