<script setup>
import CsvBatchCalculator from './CsvBatchCalculator.vue'
import ErlangCForm from './ErlangCForm.vue'

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
</script>

<template>
  <section class="bg-slate-50/80 py-3">
    <div class="app-frame grid gap-3">
      <header class="flex flex-col gap-2 border-b border-slate-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-1.5">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Calculator Suite
          </span>
          <h1 class="text-[clamp(1.55rem,2vw,2.1rem)] font-semibold tracking-[-0.04em] text-slate-950">
            Interval and batch workforce calculators
          </h1>
          <p class="max-w-3xl text-sm leading-6 text-slate-600">
            Keep fast Erlang staffing checks and bulk planning workflows together in one operational workspace, separate from the planning application.
          </p>
        </div>
      </header>

      <nav class="calculator-suite-nav" aria-label="Calculator suite tools">
        <a
          v-for="tab in calculatorTabs"
          :key="tab.id"
          :href="`#calculators/${tab.id}`"
          class="calculator-suite-link"
          :class="{ active: props.activeTool === tab.id }"
        >
          <strong>{{ tab.title }}</strong>
          <span>{{ tab.description }}</span>
        </a>
      </nav>
    </div>
  </section>

  <ErlangCForm v-if="props.activeTool === 'interval'" />
  <CsvBatchCalculator v-else />
</template>
