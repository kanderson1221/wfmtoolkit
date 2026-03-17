<script setup>
import { computed, useAttrs } from 'vue'
import InputText from 'primevue/inputtext'

import { fieldInputClass } from './primevuePresets'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  type: {
    type: String,
    default: 'text'
  }
})

const [model, modifiers] = defineModel({
  type: [String, Number],
  default: ''
})

const attrs = useAttrs()
const inputClass = computed(() => [fieldInputClass, attrs.class])

const updateValue = (nextValue) => {
  model.value = modifiers.trim && typeof nextValue === 'string' ? nextValue.trim() : nextValue
}
</script>

<template>
  <InputText
    :model-value="model"
    :type="props.type"
    :class="inputClass"
    v-bind="attrs"
    @update:model-value="updateValue"
  />
</template>
