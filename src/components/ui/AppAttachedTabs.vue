<script setup>
import AppButton from './AppButton.vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    required: true
  },
  tabWidthClass: {
    type: String,
    default: ''
  }
})

const activeId = defineModel('activeId', {
  type: [String, Number],
  required: true
})

const resolveLabel = (item) => item.label || item.title || String(item.id)

const handleSelect = (item) => {
  if (item?.disabled) {
    return
  }

  activeId.value = item.id
}
</script>

<template>
  <nav class="border-b border-slate-200 bg-white" :aria-label="props.ariaLabel">
    <div class="flex h-14 w-fit items-stretch gap-0">
      <AppButton
        v-for="item in props.items"
        :key="item.id"
        variant="tab"
        :active="activeId === item.id"
        :disabled="item.disabled"
        :class="[
          'relative -mb-px h-full self-stretch rounded-none !border-t-0 !border-b-0 px-5 py-0 shadow-none',
          props.tabWidthClass,
          item.class
        ]"
        @click="handleSelect(item)"
      >
        <strong>{{ resolveLabel(item) }}</strong>
      </AppButton>
    </div>
  </nav>
</template>
