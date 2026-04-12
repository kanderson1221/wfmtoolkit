<script setup>
import { computed, ref, useAttrs } from 'vue'
import InputText from 'primevue/inputtext'

import { fieldInputClass, fieldInputCompactClass } from './primevuePresets'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  type: {
    type: String,
    default: 'text'
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const [model, modifiers] = defineModel({
  type: [String, Number],
  default: ''
})

const attrs = useAttrs()
const inputRef = ref(null)
const inputClass = computed(() => [props.compact ? fieldInputCompactClass : fieldInputClass, attrs.class])

const updateValue = (nextValue) => {
  model.value = modifiers.trim && typeof nextValue === 'string' ? nextValue.trim() : nextValue
}

const focus = () => {
  const inputElement = inputRef.value?.$el?.querySelector?.('input') || inputRef.value?.$el || inputRef.value
  inputElement?.focus?.()
}

defineExpose({
  focus
})
</script>

<template>
  <InputText
    ref="inputRef"
    :model-value="model"
    :type="props.type"
    :class="inputClass"
    v-bind="attrs"
    @update:model-value="updateValue"
  />
</template>
