<script setup>
import { computed, useAttrs } from 'vue'
import InputText from 'primevue/inputtext'

import { tableFieldInputClass } from './primevuePresets'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  align: {
    type: String,
    default: 'left'
  }
})

const model = defineModel({
  type: String,
  default: ''
})

const attrs = useAttrs()

const inputClass = computed(() => [
  tableFieldInputClass,
  props.align === 'left' ? 'text-left' : 'text-center',
  attrs.class
])
</script>

<template>
  <InputText
    v-model="model"
    :class="inputClass"
    v-bind="attrs"
  />
</template>
