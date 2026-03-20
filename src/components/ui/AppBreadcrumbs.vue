<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const isCurrentItem = (item, index) => item.current || index === props.items.length - 1
</script>

<template>
  <nav v-if="props.items.length" aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center gap-1.5 text-[0.78rem] font-medium leading-5 text-slate-500">
      <li
        v-for="(item, index) in props.items"
        :key="`${item.label}-${index}`"
        class="inline-flex items-center gap-1.5"
      >
        <a
          v-if="item.href && !isCurrentItem(item, index)"
          :href="item.href"
          class="text-[#15395f] transition hover:text-[#102f4f]"
        >
          {{ item.label }}
        </a>
        <span
          v-else
          :aria-current="isCurrentItem(item, index) ? 'page' : undefined"
          class="truncate"
          :class="isCurrentItem(item, index) ? 'font-semibold text-slate-700' : 'text-slate-500'"
        >
          {{ item.label }}
        </span>

        <span v-if="index < props.items.length - 1" class="select-none text-slate-300" aria-hidden="true">
          /
        </span>
      </li>
    </ol>
  </nav>
</template>
