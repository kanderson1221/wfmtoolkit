<script setup>
import { computed } from 'vue'

import AppIcon from './AppIcon.vue'

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
  icon: {
    type: String,
    default: ''
  }
})

const hasSupportingCopy = computed(() => Boolean(props.kicker || props.description))
</script>

<template>
  <div class="flex gap-3" :class="hasSupportingCopy ? 'items-start' : 'items-center'">
    <div
      v-if="props.icon"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]"
    >
      <AppIcon :path="props.icon" class="h-4.5 w-4.5" />
    </div>

    <div class="grid" :class="hasSupportingCopy ? 'gap-1.5' : 'gap-0'">
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
  </div>
</template>
