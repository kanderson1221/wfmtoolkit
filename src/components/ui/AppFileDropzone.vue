<script setup>
import { computed, ref, useAttrs } from 'vue'

import AppButton from './AppButton.vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  inputId: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: 'Drop a file here'
  },
  description: {
    type: String,
    default: ''
  },
  buttonLabel: {
    type: String,
    default: 'Choose File'
  },
  hintText: {
    type: String,
    default: 'Drag and drop a file anywhere in this area.'
  },
  formatBadges: {
    type: Array,
    default: () => []
  },
  accept: {
    type: String,
    default: ''
  },
  multiple: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  },
  centered: {
    type: Boolean,
    default: false
  },
  autofocus: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['file-select'])

const attrs = useAttrs()
const inputRef = ref(null)
const isDragActive = ref(false)

const forwardedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const isCompactCentered = computed(() => props.compact && props.centered)

const panelClass = computed(() => [
  'rounded-[24px] border-2 border-dashed bg-white transition',
  isCompactCentered.value ? 'p-2.5' : props.compact ? 'p-4' : 'p-5',
  isDragActive.value
    ? 'border-[#15395f] bg-[#eef4f8]'
    : 'border-slate-300 hover:border-[#c3d2df] hover:bg-slate-50/70',
  attrs.class
])

const openPicker = () => {
  inputRef.value?.click()
}

const handleDragOver = (event) => {
  event.preventDefault()
  isDragActive.value = true
}

const handleDragLeave = (event) => {
  event.preventDefault()
  if (!event.currentTarget?.contains?.(event.relatedTarget)) {
    isDragActive.value = false
  }
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragActive.value = false
  emit('file-select', event)
}

const handleChange = (event) => {
  emit('file-select', event)
}
</script>

<template>
  <section
    :class="panelClass"
    @dragenter.prevent="isDragActive = true"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    v-bind="forwardedAttrs"
  >
    <input
      :id="props.inputId || undefined"
      ref="inputRef"
      class="sr-only"
      type="file"
      :accept="props.accept || undefined"
      :multiple="props.multiple"
      @change="handleChange"
    />

    <div :class="[
      isCompactCentered ? 'grid gap-2' : props.compact ? 'grid gap-3' : 'grid gap-4',
      props.centered ? 'justify-items-center text-center' : ''
    ]">
      <div
        v-if="props.centered"
        :class="isCompactCentered
          ? 'flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eaf0f5] text-[#15395f]'
          : 'flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf0f5] text-[#15395f]'"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          :class="isCompactCentered ? 'h-[1.125rem] w-[1.125rem] fill-none stroke-current' : 'h-5 w-5 fill-none stroke-current'"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M7 17.5h9.5a3.5 3.5 0 0 0 .2-7A5.5 5.5 0 0 0 6 9.2 4 4 0 0 0 7 17.5Z" />
          <path d="M12 8.5v7" />
          <path d="m9.5 11 2.5-2.5L14.5 11" />
        </svg>
      </div>

      <div class="grid gap-1">
        <h3 :class="isCompactCentered ? 'text-[0.92rem] font-semibold tracking-[-0.02em] text-slate-950' : props.compact ? 'text-[0.95rem] font-semibold tracking-[-0.02em] text-slate-950' : 'text-base font-semibold tracking-[-0.02em] text-slate-950'">
          {{ props.title }}
        </h3>
        <p v-if="props.description" :class="isCompactCentered ? 'text-[0.82rem] leading-5 text-slate-600' : 'text-sm leading-6 text-slate-600'">
          {{ props.description }}
        </p>
      </div>

      <div
        v-if="props.formatBadges.length"
        :class="isCompactCentered ? 'flex flex-wrap items-center justify-center gap-1.5' : 'flex flex-wrap items-center justify-center gap-2'"
      >
        <span
          v-for="badge in props.formatBadges"
          :key="badge"
          :class="isCompactCentered
            ? 'rounded-full bg-[#edf3f8] px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]'
            : 'rounded-full bg-[#edf3f8] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]'"
        >
          {{ badge }}
        </span>
      </div>

      <div :class="props.centered ? 'flex flex-wrap items-center justify-center gap-2.5' : 'flex flex-wrap items-center gap-3'">
        <AppButton
          size="sm"
          variant="secondary"
          :autofocus="props.autofocus"
          @click="openPicker"
        >
          {{ props.buttonLabel }}
        </AppButton>
        <span v-if="props.hintText" :class="isCompactCentered ? 'text-[0.82rem] text-slate-500' : 'text-sm text-slate-500'">{{ props.hintText }}</span>
        <slot name="actions" />
      </div>

      <slot />
    </div>
  </section>
</template>
