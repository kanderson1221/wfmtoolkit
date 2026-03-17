<script setup>
import AppButton from './AppButton.vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    default: 'icon'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<template>
  <AppButton
    :icon="props.icon"
    :aria-label="props.label"
    :variant="props.variant"
    :disabled="props.disabled"
    @click="$emit('click', $event)"
  />
</template>
