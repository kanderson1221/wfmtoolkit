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
  <section class="calculator-section calculator-app-intro">
    <div class="container">
      <div class="calculator-app-shell">
        <section class="calculator-app-hero input-group-card">
          <div class="workspace-output-header">
            <h3>Calculator Suite</h3>
            <p>Keep interval and batch calculators together in one application area, separate from the planning app.</p>
          </div>
        </section>

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
    </div>
  </section>

  <ErlangCForm v-if="props.activeTool === 'interval'" />
  <CsvBatchCalculator v-else />
</template>
