<script setup>
import { computed, useAttrs } from 'vue'
import InputNumber from 'primevue/inputnumber'

import { fieldInputClass, fieldInputCompactClass } from './primevuePresets'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  min: {
    type: Number,
    default: undefined
  },
  max: {
    type: Number,
    default: undefined
  },
  step: {
    type: Number,
    default: 1
  },
  minFractionDigits: {
    type: Number,
    default: undefined
  },
  maxFractionDigits: {
    type: Number,
    default: undefined
  },
  placeholder: {
    type: String,
    default: ''
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const model = defineModel({
  type: Number,
  default: null
})

const attrs = useAttrs()
const pt = computed(() => ({
  root: {
    class: 'block w-full'
  },
  pcInputText: {
    root: {
      class: [props.compact ? fieldInputCompactClass : fieldInputClass, attrs.class]
    }
  }
}))
</script>

<template>
  <InputNumber
    v-model="model"
    mode="decimal"
    :min="props.min"
    :max="props.max"
    :step="props.step"
    :min-fraction-digits="props.minFractionDigits"
    :max-fraction-digits="props.maxFractionDigits"
    :placeholder="props.placeholder"
    :use-grouping="false"
    :pt="pt"
    v-bind="attrs"
  />
</template>
