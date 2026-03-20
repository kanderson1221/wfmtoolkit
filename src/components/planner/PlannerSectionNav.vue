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

const toneClasses = (tone, isActive) => {
  if (isActive) {
    return 'border-[#c3d2df] bg-[#e7eef4] text-[#15395f] shadow-sm'
  }

  if (tone === 'upcoming') {
    return 'border-slate-200 bg-slate-50/80 text-slate-600 hover:border-[#c3d2df] hover:bg-[#f4f7fa] hover:text-slate-800'
  }

  return 'border-slate-200 bg-white text-slate-900 hover:border-[#c3d2df] hover:bg-[#f4f7fa] hover:text-[#15395f]'
}
</script>

<template>
  <nav class="grid gap-1" aria-label="Staffing group workflow">
    <button
      v-for="item in props.items"
      :key="item.id"
      type="button"
      :data-section-id="item.id"
      :aria-current="activeId === item.id ? 'step' : undefined"
      class="rounded-[18px] border px-3 py-2.5 text-left transition"
      :class="toneClasses(item.tone, activeId === item.id)"
      @click="activeId = item.id"
    >
      <strong class="block min-w-0 text-sm font-semibold leading-5 tracking-[-0.02em] text-balance">
        {{ item.title }}
      </strong>
    </button>
  </nav>
</template>
