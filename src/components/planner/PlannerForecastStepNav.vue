<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const activeId = defineModel('activeId', {
  type: String,
  required: true
})

const stepClasses = (tone, isActive) => {
  if (isActive) {
    return 'border-sky-200 bg-sky-50 text-sky-900 shadow-sm'
  }

  if (tone === 'ready') {
    return 'border-emerald-200 bg-white text-slate-900 hover:border-emerald-300 hover:bg-emerald-50/60'
  }

  if (tone === 'attention') {
    return 'border-amber-200 bg-white text-slate-900 hover:border-amber-300 hover:bg-amber-50/60'
  }

  return 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
}
</script>

<template>
  <div class="grid gap-2 xl:grid-cols-3">
    <button
      v-for="(item, index) in props.items"
      :key="item.id"
      type="button"
      :data-step-id="item.id"
      class="grid gap-1 rounded-[22px] border px-4 py-3 text-left transition"
      :class="stepClasses(item.tone, activeId === item.id)"
      @click="activeId = item.id"
    >
      <span class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Step {{ index + 1 }}
      </span>
      <strong class="text-sm font-semibold tracking-[-0.02em]">
        {{ item.title }}
      </strong>
      <p class="text-sm leading-5 text-slate-600">
        {{ item.description }}
      </p>
    </button>
  </div>
</template>
