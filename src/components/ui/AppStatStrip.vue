<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  columns: {
    type: String,
    default: 'md:grid-cols-2 xl:grid-cols-4'
  }
})
</script>

<template>
  <div class="grid divide-y divide-slate-200 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm md:divide-y-0 md:divide-x" :class="props.columns">
    <article
      v-for="item in props.items"
      :key="item.label"
      class="grid gap-1 px-5 py-3.5"
    >
      <span class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {{ item.label }}
      </span>
      <strong class="text-lg font-semibold tracking-[-0.03em] text-slate-950">
        {{ item.value }}
      </strong>
      <small v-if="item.meta" class="text-[0.82rem] text-slate-500">
        {{ item.meta }}
      </small>
    </article>
  </div>
</template>
