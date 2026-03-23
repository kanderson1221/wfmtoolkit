<script setup>
import { computed, useAttrs } from 'vue'

import { fieldInputClass, fieldInputCompactClass } from './primevuePresets'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  options: {
    type: Array,
    default: () => []
  },
  optionLabel: {
    type: String,
    default: 'label'
  },
  optionValue: {
    type: String,
    default: 'value'
  },
  compact: {
    type: Boolean,
    default: false
  },
  plain: {
    type: Boolean,
    default: false
  }
})

const model = defineModel({
  required: true
})

const attrs = useAttrs()

const normalizedOptions = computed(() =>
  props.options.map((option) =>
    typeof option === 'object'
      ? option
      : {
          [props.optionLabel]: option,
          [props.optionValue]: option
        }
  )
)

const inputClass = computed(() => [
  props.plain ? null : props.compact ? fieldInputCompactClass : fieldInputClass,
  attrs.class
])
</script>

<template>
  <select
    v-model="model"
    :class="inputClass"
    v-bind="attrs"
  >
    <option
      v-for="option in normalizedOptions"
      :key="option[props.optionValue]"
      :value="option[props.optionValue]"
    >
      {{ option[props.optionLabel] }}
    </option>
  </select>
</template>
