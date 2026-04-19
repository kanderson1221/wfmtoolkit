<script setup>
import AppIcon from './AppIcon.vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  columns: {
    type: String,
    default: 'md:grid-cols-2 xl:grid-cols-4'
  },
  compact: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="grid divide-y divide-slate-200 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm md:divide-y-0 md:divide-x" :class="props.columns">
    <article
      v-for="item in props.items"
      :key="item.label"
      class="grid"
      :class="props.compact ? 'gap-1 px-4 py-2.5' : 'gap-1.5 px-5 py-3.5'"
    >
      <div v-if="item.icon" class="flex items-center gap-2">
        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[12px] border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]">
          <AppIcon :path="item.icon" class="h-3.5 w-3.5" />
        </div>
        <span
          class="font-semibold uppercase text-slate-500"
          :class="props.compact ? 'text-[0.66rem] tracking-[0.1em]' : 'text-[0.7rem] tracking-[0.12em]'"
        >
          {{ item.label }}
        </span>
      </div>
      <span
        v-else
        class="font-semibold uppercase text-slate-500"
        :class="props.compact ? 'text-[0.66rem] tracking-[0.1em]' : 'text-[0.7rem] tracking-[0.12em]'"
      >
        {{ item.label }}
      </span>
      <strong
        class="font-semibold tracking-[-0.03em] text-slate-950"
        :class="props.compact ? 'text-[1.05rem] leading-tight' : 'text-lg'"
      >
        {{ item.value }}
      </strong>
      <small
        v-if="item.meta"
        class="text-slate-500"
        :class="props.compact ? 'text-[0.76rem] leading-4' : 'text-[0.82rem]'"
      >
        {{ item.meta }}
      </small>
    </article>
  </div>
</template>
