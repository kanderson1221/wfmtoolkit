<script setup>
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  centered: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <section
    class="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-7"
    :class="props.centered ? 'grid justify-items-center text-center' : 'grid gap-2'"
  >
    <div v-if="props.title || props.description" class="grid gap-2">
      <h3 v-if="props.title" class="text-lg font-semibold tracking-[-0.03em] text-slate-950">
        {{ props.title }}
      </h3>
      <p v-if="props.description" class="text-sm leading-6 text-slate-600">
        {{ props.description }}
      </p>
    </div>

    <slot />
  </section>
</template>
