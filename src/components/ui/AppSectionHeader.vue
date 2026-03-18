<script setup>
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
  }
})
</script>

<template>
  <div class="grid gap-1.5">
    <span
      v-if="props.kicker"
      class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
    >
      {{ props.kicker }}
    </span>
    <h3 class="text-base font-semibold tracking-[-0.03em] text-slate-950">
      {{ props.title }}
    </h3>
    <p v-if="props.description" class="text-sm leading-6 text-slate-600">
      {{ props.description }}
    </p>
  </div>
</template>
