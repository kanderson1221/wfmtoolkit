<script setup>
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
</script>

<template>
  <section class="bg-slate-50/80 py-3">
    <div class="app-frame grid gap-4">
      <AppPageHeader
        kicker="Calculator Suite"
        title="Interval and batch workforce calculators"
        description="Keep fast Erlang staffing checks and bulk planning workflows together in one operational workspace, separate from the planning application."
      />

      <nav class="grid gap-3 md:grid-cols-2" aria-label="Calculator suite tools">
        <a
          v-for="tab in calculatorTabs"
          :key="tab.id"
          :href="`#calculators/${tab.id}`"
          :aria-current="props.activeTool === tab.id ? 'page' : undefined"
          class="grid gap-1 rounded-[28px] border bg-white px-5 py-4 shadow-sm transition"
          :class="
            props.activeTool === tab.id
              ? 'border-sky-200 bg-sky-50/70'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          "
        >
          <strong class="text-base font-semibold tracking-[-0.03em] text-slate-950">
            {{ tab.title }}
          </strong>
          <span class="text-sm leading-6 text-slate-600">
            {{ tab.description }}
          </span>
        </a>
      </nav>
    </div>
  </section>

  <ErlangCForm v-if="props.activeTool === 'interval'" />
  <CsvBatchCalculator v-else />
</template>
