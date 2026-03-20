<script setup>
import { mdiDotsVertical } from '@mdi/js'

import AppMenu from '../ui/AppMenu.vue'

const props = defineProps({
  monthLabel: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['select'])

const copyMenuItems = [
  {
    id: 'forward',
    label: 'Copy Forward'
  },
  {
    id: 'quarter',
    label: 'Copy Through Quarter'
  },
  {
    id: 'all',
    label: 'Copy to All Months'
  }
]
</script>

<template>
  <AppMenu
    :items="copyMenuItems"
    :trigger-icon="mdiDotsVertical"
    :trigger-label="`Copy values from ${props.monthLabel}`"
    compact
    trigger-variant="icon-quiet"
    @select="emit('select', $event.id)"
  />
</template>
