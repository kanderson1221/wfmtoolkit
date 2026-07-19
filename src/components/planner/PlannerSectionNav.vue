<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  groups: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select'])

const activeId = defineModel('activeId', {
  type: String,
  required: true
})

const handleItemClick = (item) => {
  emit('select', item)

  if (!item?.href) {
    activeId.value = item.id
  }
}

const toneClasses = (tone, isActive) => {
  if (isActive) {
    return 'border-[#c3d2df] bg-[#e7eef4] text-[#15395f] shadow-sm'
  }

  if (tone === 'ready') {
    return 'border-emerald-200 bg-emerald-50/60 text-slate-900 hover:border-emerald-300 hover:bg-emerald-50'
  }

  if (tone === 'attention') {
    return 'border-amber-200 bg-amber-50/60 text-slate-900 hover:border-amber-300 hover:bg-amber-50'
  }

  return 'border-slate-200 bg-white text-slate-900 hover:border-[#c3d2df] hover:bg-[#f4f7fa] hover:text-[#15395f]'
}

const statusToneClasses = (tone, isActive) => {
  if (isActive) {
    return 'text-[#365b7f]'
  }

  if (tone === 'ready') {
    return 'text-emerald-700'
  }

  if (tone === 'attention') {
    return 'text-amber-700'
  }

  return 'text-slate-500'
}
</script>

<template>
  <nav class="grid gap-1" aria-label="Staffing group workflow">
    <div
      v-for="(group, groupIndex) in (props.groups.length ? props.groups : [{ id: 'default', label: '', items: props.items }])"
      :key="group.id || group.label || groupIndex"
      class="grid gap-1"
      :class="groupIndex > 0 ? 'mt-2 border-t border-slate-200 pt-2' : ''"
    >
      <span
        v-if="group.label"
        :data-nav-group-label="group.label.toLowerCase()"
        class="px-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
      >
        {{ group.label }}
      </span>

      <button
        v-for="item in group.items"
        :key="item.id"
        type="button"
        :data-section-id="item.id"
        :data-status-tone="item.tone || 'default'"
        :aria-current="activeId === item.id ? 'step' : undefined"
        class="rounded-[18px] border px-3 py-2.5 text-left transition"
        :class="toneClasses(item.tone, activeId === item.id)"
        @click="handleItemClick(item)"
      >
        <strong class="block min-w-0 text-sm font-semibold leading-5 tracking-[-0.02em] text-balance">
          {{ item.title }}
        </strong>
        <span
          v-if="item.statusLabel"
          class="mt-0.5 block text-[0.7rem] font-medium leading-4 tabular-nums"
          :class="statusToneClasses(item.tone, activeId === item.id)"
        >
          {{ item.statusLabel }}
        </span>
      </button>
    </div>
  </nav>
</template>
