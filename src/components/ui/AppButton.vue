<script setup>
import { computed, useAttrs } from 'vue'
import PrimeButton from 'primevue/button'

import AppIcon from './AppIcon.vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  variant: {
    type: String,
    default: 'secondary'
  },
  size: {
    type: String,
    default: 'md'
  },
  type: {
    type: String,
    default: 'button'
  },
  href: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  iconPosition: {
    type: String,
    default: 'left'
  },
  active: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  },
  ariaLabel: {
    type: String,
    default: ''
  }
})

defineEmits(['click'])

const attrs = useAttrs()

const forwardedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const sizeClasses = {
  sm: 'rounded-2xl px-3 py-2 text-sm',
  md: 'rounded-2xl px-4 py-2.5 text-sm',
  lg: 'rounded-2xl px-5 py-3 text-sm'
}

const variantClasses = computed(() => {
  if (props.variant === 'primary') {
    return 'border border-[#102f4f] bg-[#15395f] text-white shadow-[0_10px_20px_rgba(16,47,79,0.18)] hover:border-[#0d2742] hover:bg-[#123153]'
  }

  if (props.variant === 'danger') {
    return 'border border-rose-200 bg-rose-50 text-rose-700 shadow-sm hover:border-rose-300 hover:bg-rose-100'
  }

  if (props.variant === 'secondary-inverse') {
    return 'border border-white/16 bg-white/8 text-white shadow-none hover:border-white/28 hover:bg-white/12'
  }

  if (props.variant === 'quiet') {
    return props.active
      ? 'border border-[#d5e0ea] bg-[#eef4f8] text-[#15395f]'
      : 'border border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
  }

  if (props.variant === 'tab') {
    return props.active
      ? 'border border-[#102f4f] bg-[#15395f] text-white shadow-[0_10px_20px_rgba(16,47,79,0.18)] hover:border-[#0d2742] hover:bg-[#123153]'
      : 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-[#a7bbce] hover:bg-slate-50 hover:text-[#15395f]'
  }

  if (props.variant === 'icon') {
    return 'h-10 w-10 rounded-2xl border border-slate-300 bg-slate-50 p-0 text-slate-700 shadow-sm hover:border-[#a7bbce] hover:bg-white hover:text-[#15395f]'
  }

  if (props.variant === 'icon-quiet') {
    return 'h-10 w-10 rounded-2xl border border-transparent bg-transparent p-0 text-slate-500 shadow-none hover:bg-slate-50 hover:text-slate-800'
  }

  if (props.variant === 'icon-inverse') {
    return 'h-10 w-10 rounded-2xl border border-white/12 bg-white/6 p-0 text-slate-100 shadow-none backdrop-blur-sm hover:border-[#9fb4c9]/40 hover:bg-white/10 hover:text-white'
  }

  return 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50'
})

const buttonClass = computed(() => [
  'inline-flex items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
  props.variant === 'icon' ? '' : sizeClasses[props.size] || sizeClasses.md,
  props.block ? 'w-full' : '',
  variantClasses.value,
  attrs.class
])

const mergedAttrs = computed(() => ({
  ...forwardedAttrs.value,
  'aria-label': props.ariaLabel || forwardedAttrs.value['aria-label'] || undefined
}))

const isAnchor = computed(() => Boolean(props.href))
</script>

<template>
  <a
    v-if="isAnchor"
    :href="props.href"
    :class="buttonClass"
    v-bind="mergedAttrs"
  >
    <AppIcon v-if="props.icon && props.iconPosition === 'left'" :path="props.icon" class="h-4 w-4 shrink-0" />
    <slot />
    <AppIcon v-if="props.icon && props.iconPosition === 'right'" :path="props.icon" class="h-4 w-4 shrink-0" />
  </a>

  <PrimeButton
    v-else
    unstyled
    :type="props.type"
    :disabled="props.disabled"
    :class="buttonClass"
    v-bind="mergedAttrs"
    @click="$emit('click', $event)"
  >
    <AppIcon v-if="props.icon && props.iconPosition === 'left'" :path="props.icon" class="h-4 w-4 shrink-0" />
    <slot />
    <AppIcon v-if="props.icon && props.iconPosition === 'right'" :path="props.icon" class="h-4 w-4 shrink-0" />
  </PrimeButton>
</template>
