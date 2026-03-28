<script setup>
import { computed } from 'vue'

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
  multiple: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'sm'
  },
  containerClass: {
    type: String,
    default: ''
  },
  itemClass: {
    type: String,
    default: ''
  }
})

const selection = defineModel({
  type: [String, Number, Array],
  required: true
})

const resolvedContainerClass = computed(() => props.containerClass || 'flex flex-wrap gap-2')
const multipleSelection = computed(() => (Array.isArray(selection.value) ? selection.value : []))

const itemLabel = (item) => item.label || item.title || String(item.id)
const isSameItemId = (left, right) => {
  if (left == null || right == null) {
    return left === right
  }

  return String(left) === String(right)
}

const isActive = (itemId) => (
  props.multiple
    ? multipleSelection.value.some((value) => isSameItemId(value, itemId))
    : isSameItemId(selection.value, itemId)
)

const handleSelect = (item, event) => {
  event?.preventDefault?.()

  if (item.disabled) {
    return
  }

  if (props.multiple) {
    selection.value = isActive(item.id)
      ? multipleSelection.value.filter((value) => !isSameItemId(value, item.id))
      : [...multipleSelection.value, item.id]
    return
  }

  selection.value = item.id
}
</script>

<template>
  <div :class="resolvedContainerClass" :aria-label="props.ariaLabel">
    <AppButton
      v-for="item in props.items"
      :key="item.id"
      variant="tab"
      :size="props.size"
      :active="isActive(item.id)"
      :href="!props.multiple ? item.href || '' : ''"
      :disabled="item.disabled"
      :aria-current="!props.multiple && isActive(item.id) && item.href ? 'page' : undefined"
      :aria-pressed="props.multiple ? String(isActive(item.id)) : undefined"
      :class="[props.itemClass, item.class]"
      @click="handleSelect(item, $event)"
    >
      <strong>{{ itemLabel(item) }}</strong>
    </AppButton>
  </div>
</template>
