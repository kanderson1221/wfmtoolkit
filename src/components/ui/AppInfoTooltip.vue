<script setup>
import AppIcon from './AppIcon.vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  }
})

const infoIconPath = 'M11,17H13V11H11M12,9.5A1.25,1.25 0 0,0 13.25,8.25A1.25,1.25 0 0,0 12,7A1.25,1.25 0 0,0 10.75,8.25A1.25,1.25 0 0,0 12,9.5M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z'
</script>

<template>
  <button
    type="button"
    class="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:text-[#15395f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e3ec]"
    :title="props.content"
    :aria-label="`Explain ${props.label}`"
  >
    <AppIcon :path="infoIconPath" size="12" />
  </button>
</template>
