<script setup>
const props = defineProps({
  padded: {
    type: Boolean,
    default: true
  },
  subtle: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <section
    class="overflow-hidden rounded-[28px] border border-slate-200 shadow-sm"
    :class="props.subtle ? 'bg-slate-50/70' : 'bg-white'"
  >
    <div :class="props.padded ? 'p-5' : ''">
      <slot />
    </div>
  </section>
</template>
