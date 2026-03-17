<script setup>
defineProps({
  path: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 20
  },
  viewBox: {
    type: String,
    default: '0 0 24 24'
  }
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="viewBox"
    fill="currentColor"
    aria-hidden="true"
  >
    <path :d="path" />
  </svg>
</template>
