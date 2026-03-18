<script setup>
import AppSectionHeader from './AppSectionHeader.vue'

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
  subtle: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <section
    class="grid gap-4 rounded-[24px] border border-slate-200 p-4"
    :class="props.subtle ? 'bg-slate-50/70' : 'bg-white'"
  >
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <AppSectionHeader
        :kicker="props.kicker"
        :title="props.title"
        :description="props.description"
      />

      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2 self-start">
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </section>
</template>
