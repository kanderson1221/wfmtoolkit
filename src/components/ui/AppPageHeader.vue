<script setup>
import AppBreadcrumbs from './AppBreadcrumbs.vue'

const props = defineProps({
  breadcrumbs: {
    type: Array,
    default: () => []
  },
  kicker: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <header class="flex flex-col gap-2 border-b border-slate-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
    <div class="grid gap-1.5">
      <AppBreadcrumbs :items="props.breadcrumbs" />
      <span v-if="props.kicker" class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#15395f]">
        {{ props.kicker }}
      </span>
      <h1 class="text-[clamp(1.55rem,2vw,2.2rem)] font-semibold tracking-[-0.04em] text-slate-950">
        {{ props.title }}
      </h1>
      <p v-if="props.description" class="max-w-3xl text-sm leading-6 text-slate-600">
        {{ props.description }}
      </p>
      <slot />
    </div>

    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2 self-start lg:self-auto">
      <slot name="actions" />
    </div>
  </header>
</template>
