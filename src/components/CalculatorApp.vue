<script setup>
import { computed } from 'vue'

import CsvBatchCalculator from './CsvBatchCalculator.vue'
import ErlangCForm from './ErlangCForm.vue'
import AppOptionPills from './ui/AppOptionPills.vue'
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
    title: 'Erlang C Calculator',
    description: 'Use Erlang-based interval staffing and service assumptions.'
  },
  {
    id: 'batch',
    title: 'File Processor',
    description: 'Upload interval files and export enriched staffing results.'
  }
]

const activeToolTitle = computed(() =>
  calculatorTabs.find((tab) => tab.id === props.activeTool)?.title || 'Erlang Calculators'
)

const calculatorTabItems = computed(() =>
  calculatorTabs.map((tab) => ({
    id: tab.id,
    label: tab.title,
    href: `#calculators/${tab.id}`
  }))
)

const activeToolSelection = computed({
  get: () => props.activeTool,
  set: () => {}
})
</script>

<template>
  <section class="bg-slate-50/80 py-2">
    <div class="app-frame grid gap-3">
      <AppPageHeader
        :breadcrumbs="[
          { label: 'Home', href: '#home' },
          { label: 'Erlang Calculators', href: '#calculators' },
          { label: activeToolTitle }
        ]"
        title="Erlang Calculators"
      />

      <div class="rounded-[24px] border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <AppOptionPills
          v-model="activeToolSelection"
          aria-label="Erlang calculator tools"
          :items="calculatorTabItems"
        />
      </div>
    </div>
  </section>

  <ErlangCForm v-if="props.activeTool === 'interval'" />
  <CsvBatchCalculator v-else />
</template>
