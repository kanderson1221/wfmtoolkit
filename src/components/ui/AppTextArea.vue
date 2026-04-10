<script setup>
import { computed, useAttrs } from 'vue'

import { fieldInputClass, fieldInputCompactClass } from './primevuePresets'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  rows: {
    type: [Number, String],
    default: 4
  },
  compact: {
    type: Boolean,
    default: false
  },
  resize: {
    type: String,
    default: 'vertical'
  }
})

const model = defineModel({
  type: String,
  default: ''
})

const attrs = useAttrs()

const resizeClass = computed(() => {
  if (props.resize === 'none') {
    return 'resize-none'
  }

  if (props.resize === 'horizontal') {
    return 'resize-x'
  }

  if (props.resize === 'both') {
    return 'resize'
  }

  return 'resize-y'
})

const inputClass = computed(() => [
  props.compact ? fieldInputCompactClass : fieldInputClass,
  'leading-6',
  resizeClass.value,
  attrs.class
])
</script>

<template>
  <textarea
    v-model="model"
    :rows="props.rows"
    :class="inputClass"
    v-bind="attrs"
  />
</template>
