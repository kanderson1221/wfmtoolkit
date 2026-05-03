<script setup>
import AppChart from './AppChart.vue'

const props = defineProps({
  ariaDescribedby: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  chartId: {
    type: String,
    default: ''
  },
  option: {
    type: Object,
    required: true
  },
  fallbackText: {
    type: String,
    default: 'Chart could not be loaded.'
  },
  heightClass: {
    type: String,
    default: 'h-[20rem]'
  },
  minWidthClass: {
    type: String,
    default: ''
  },
  surface: {
    type: Boolean,
    default: true
  },
  scrollable: {
    type: Boolean,
    default: true
  },
  updateOptions: {
    type: Object,
    default: () => ({
      notMerge: false
    })
  }
})
</script>

<template>
  <AppChart v-bind="props" />
</template>
