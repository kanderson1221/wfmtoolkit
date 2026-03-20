<script setup>
import AppPanel from '../ui/AppPanel.vue'

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
    return 'border-sky-200 bg-sky-50 text-sky-900 shadow-sm'
  }

  if (tone === 'ready') {
    return 'border-emerald-200 bg-white text-slate-900 hover:border-emerald-300 hover:bg-emerald-50/60'
  }

  if (tone === 'attention') {
    return 'border-amber-200 bg-white text-slate-900 hover:border-amber-300 hover:bg-amber-50/60'
  }

  if (tone === 'upcoming') {
    return 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white'
  }

  return 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
}

const badgeClasses = (tone, isActive) => {
  if (isActive) {
    return 'border-sky-200 bg-white text-sky-700'
  }

  if (tone === 'ready') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (tone === 'attention') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (tone === 'upcoming') {
    return 'border-slate-200 bg-slate-100 text-slate-600'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}
</script>

<template>
  <AppPanel :padded="false" subtle>
    <nav class="grid gap-1.5 p-2.5" aria-label="Staffing group workflow">
      <button
        v-for="item in props.items"
        :key="item.id"
        type="button"
        :data-section-id="item.id"
        class="grid gap-1.5 rounded-[20px] border px-3.5 py-3 text-left transition"
        :class="toneClasses(item.tone, activeId === item.id)"
        @click="activeId = item.id"
      >
        <div class="flex items-start justify-between gap-3">
          <strong class="text-sm font-semibold tracking-[-0.02em]">
            {{ item.title }}
          </strong>

          <span
            class="inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em]"
            :class="badgeClasses(item.tone, activeId === item.id)"
          >
            {{ activeId === item.id ? 'Current' : item.statusLabel }}
          </span>
        </div>

        <p class="text-sm leading-5 text-slate-600">
          {{ item.description }}
        </p>
      </button>
    </nav>
  </AppPanel>
</template>
