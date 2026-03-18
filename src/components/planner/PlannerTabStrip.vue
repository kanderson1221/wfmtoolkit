<script setup>
import AppButton from '../ui/AppButton.vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    required: true
  }
})

const activeId = defineModel('activeId', {
  type: String,
  required: true
})
</script>

<template>
  <nav class="flex flex-wrap gap-2" :aria-label="props.ariaLabel">
    <AppButton
      v-for="item in props.items"
      :key="item.id"
      variant="tab"
      :active="activeId === item.id"
      @click="activeId = item.id"
    >
      <strong>{{ item.title }}</strong>
    </AppButton>
  </nav>
</template>
