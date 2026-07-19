<script setup>
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'

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
  confirmLabel: {
    type: String,
    default: 'Confirm'
  },
  cancelLabel: {
    type: String,
    default: 'Cancel'
  },
  confirmVariant: {
    type: String,
    default: 'danger'
  },
  allowBackdropClose: {
    type: Boolean,
    default: false
  },
  maxWidth: {
    type: String,
    default: 'max-w-2xl'
  }
})

const emit = defineEmits(['confirm'])

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

const closeDialog = () => {
  visible.value = false
}

const confirmDialog = () => {
  emit('confirm')
  visible.value = false
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    :title="props.title"
    :description="props.description"
    :kicker="props.kicker"
    :allow-backdrop-close="props.allowBackdropClose"
    :max-width="props.maxWidth"
  >
    <div v-if="$slots.default" class="grid gap-4">
      <slot />
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
        <AppButton variant="secondary" autofocus @click="closeDialog">
          {{ props.cancelLabel }}
        </AppButton>
        <AppButton :variant="props.confirmVariant" @click="confirmDialog">
          {{ props.confirmLabel }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
