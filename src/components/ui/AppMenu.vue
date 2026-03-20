<script setup>
import { computed, ref } from 'vue'
import Menu from 'primevue/menu'

import AppIcon from './AppIcon.vue'
import AppIconButton from './AppIconButton.vue'
import { compactMenuPanelPt, menuPanelPt } from './primevuePresets'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  activeId: {
    type: String,
    default: ''
  },
  triggerIcon: {
    type: String,
    required: true
  },
  triggerLabel: {
    type: String,
    required: true
  },
  triggerVariant: {
    type: String,
    default: 'icon'
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

const menuRef = ref(null)

const panelPt = computed(() => (props.compact ? compactMenuPanelPt : menuPanelPt))
const itemClass = computed(() =>
  props.compact
    ? 'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-sm font-medium transition'
    : 'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition'
)

const toggleMenu = (event) => {
  menuRef.value?.toggle(event)
}

const closeMenu = () => {
  menuRef.value?.hide?.()
}

const handleSelect = (item) => {
  closeMenu()
  emit('select', item)
}
</script>

<template>
  <div class="relative">
    <AppIconButton
      :icon="props.triggerIcon"
      :label="props.triggerLabel"
      :variant="props.triggerVariant"
      @click="toggleMenu"
    />

    <Menu
      ref="menuRef"
      popup
      :model="props.items"
      :pt="panelPt"
    >
      <template #item="{ item, props: menuItemProps }">
        <button
          v-bind="menuItemProps.action"
          type="button"
          :class="[
            itemClass,
            item.tone === 'danger'
              ? 'border border-transparent text-rose-700 hover:border-rose-100 hover:bg-rose-50'
              : props.activeId === item.id
                ? 'border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]'
                : 'border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          ]"
          @click="handleSelect(item)"
        >
          <AppIcon v-if="item.icon" :path="item.icon" class="h-5 w-5 shrink-0" />
          <span class="flex-1">{{ item.label }}</span>
        </button>
      </template>
    </Menu>
  </div>
</template>
