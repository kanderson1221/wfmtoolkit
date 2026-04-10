<script setup>
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  framed: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <AppWorkspaceSection
    :title="props.title"
    :icon="props.icon"
    :description="props.description"
    :subtle="false"
    :framed="props.framed"
  >
    <div class="grid gap-4">
      <slot />
    </div>
  </AppWorkspaceSection>
</template>
