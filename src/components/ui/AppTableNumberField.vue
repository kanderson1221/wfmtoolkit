<script setup>
import { computed, useAttrs } from 'vue'
import InputNumber from 'primevue/inputnumber'

import { tableFieldInputClass } from './primevuePresets'

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
  showButtons: {
    type: Boolean,
    default: false
  },
  buttonLayout: {
    type: String,
    default: 'stacked'
  }
})

const model = defineModel({
  type: Number,
  default: null
})

const attrs = useAttrs()
const syncLeadingDecimal = (input, nextValue, caretPosition) => {
  input.value = nextValue
  input.setSelectionRange(caretPosition, caretPosition)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

const handleLeadingDecimalKeydown = (event) => {
  const key = event.key

  if (key !== '.' && key !== ',') {
    return
  }

  const input = event.target

  if (!(input instanceof HTMLInputElement)) {
    return
  }

  const value = input.value ?? ''
  const selectionStart = input.selectionStart ?? value.length
  const selectionEnd = input.selectionEnd ?? value.length
  const replacingAll = selectionStart === 0 && selectionEnd === value.length

  if (value === '' || replacingAll) {
    event.preventDefault()
    syncLeadingDecimal(input, '0.', 2)
    return
  }

  if (value === '-') {
    event.preventDefault()
    syncLeadingDecimal(input, '-0.', 3)
  }
}

const pt = computed(() => ({
  root: {
    class: props.showButtons
      ? 'table-number-with-buttons flex w-full items-stretch overflow-hidden rounded-md border border-slate-200 bg-slate-50/70 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
      : 'w-full'
  },
  pcInputText: {
    root: {
      class: props.showButtons
        ? ['table-number-with-buttons-input', attrs.class]
        : ['table-number-input', tableFieldInputClass, attrs.class]
    }
  },
  buttonGroup: {
    class: 'table-number-with-buttons-group'
  },
  incrementButton: {
    class: 'table-number-with-buttons-btn table-number-with-buttons-btn-increment'
  },
  decrementButton: {
    class: 'table-number-with-buttons-btn table-number-with-buttons-btn-decrement'
  },
  incrementIcon: {
    class: 'h-3 w-3'
  },
  decrementIcon: {
    class: 'h-3 w-3'
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
    :show-buttons="props.showButtons"
    :button-layout="props.buttonLayout"
    :pt="pt"
    @keydown.capture="handleLeadingDecimalKeydown"
    v-bind="attrs"
  />
</template>
