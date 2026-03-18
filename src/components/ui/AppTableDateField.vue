<script setup>
import { computed, useAttrs } from 'vue'

import { tableFieldInputClass } from './primevuePresets'

defineOptions({
  inheritAttrs: false
})

const model = defineModel({
  type: String,
  default: ''
})

const attrs = useAttrs()
const inputClass = computed(() => [tableFieldInputClass, attrs.class])
</script>

<template>
  <input
    v-model="model"
    type="date"
    :class="inputClass"
    v-bind="attrs"
  />
</template>
