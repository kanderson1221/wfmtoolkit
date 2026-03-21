<script setup>
import { computed } from 'vue'

import CsvBatchCalculator from './CsvBatchCalculator.vue'
import ErlangCForm from './ErlangCForm.vue'
import AppPageHeader from './ui/AppPageHeader.vue'

const props = defineProps({
  activeTool: {
    type: String,
    default: 'interval'
  }
})

const calculatorTabs = [
  {
    id: 'interval',
    title: 'Interval Calculator',
    description: 'Use Erlang-based interval staffing and service assumptions.'
  },
  {
    id: 'batch',
    title: 'Batch Planner',
    description: 'Run scenario-based staffing and batch planning workflows.'
  }
]

const activeToolTitle = computed(() =>
  calculatorTabs.find((tab) => tab.id === props.activeTool)?.title || 'Calculators'
)
</script>

<template>
  <section class="bg-slate-50/80 py-2">
    <div class="app-frame grid gap-3">
      <AppPageHeader
        :breadcrumbs="[
          { label: 'Home', href: '#home' },
          { label: 'Calculators', href: '#calculators' },
          { label: activeToolTitle }
        ]"
        title="Workforce Calculators"
      />

      <nav
        class="flex flex-wrap items-center gap-2 rounded-[24px] border border-slate-200 bg-white px-3 py-2 shadow-sm"
        aria-label="Calculator suite tools"
      >
        <a
          v-for="tab in calculatorTabs"
          :key="tab.id"
          :href="`#calculators/${tab.id}`"
          :aria-current="props.activeTool === tab.id ? 'page' : undefined"
          class="inline-flex items-center justify-center rounded-[18px] border px-3 py-2 text-sm font-semibold tracking-[-0.02em] transition"
          :class="
            props.activeTool === tab.id
              ? 'border-[#cddae7] bg-[#e7eef4] text-[#15395f]'
              : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          "
        >
          {{ tab.title }}
        </a>
      </nav>
    </div>
  </section>

  <ErlangCForm v-if="props.activeTool === 'interval'" />
  <CsvBatchCalculator v-else />
</template>
