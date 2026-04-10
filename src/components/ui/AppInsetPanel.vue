<script setup>
import { computed, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  tone: {
    type: String,
    default: 'default'
  },
  padded: {
    type: Boolean,
    default: true
  }
})

const attrs = useAttrs()

const forwardedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const toneClass = computed(() => {
  if (props.tone === 'subtle') {
    return 'border-slate-200 bg-slate-50/80'
  }

  if (props.tone === 'dashed') {
    return 'border-dashed border-slate-300 bg-white'
  }

  return 'border-slate-200 bg-white'
})

const panelClass = computed(() => [
  'rounded-[20px] border',
  props.padded ? 'p-4' : '',
  toneClass.value,
  attrs.class
])
</script>

<template>
  <section :class="panelClass" v-bind="forwardedAttrs">
    <slot />
  </section>
</template>
