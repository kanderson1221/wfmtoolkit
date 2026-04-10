<script setup>
import { computed } from 'vue'

import CsvBatchCalculator from './CsvBatchCalculator.vue'
import ErlangCForm from './ErlangCForm.vue'
import ForecastingWorkspace from './ForecastingWorkspace.vue'
import AppOptionPills from './ui/AppOptionPills.vue'
import AppPanel from './ui/AppPanel.vue'
import AppPageHeader from './ui/AppPageHeader.vue'
import AppSectionHeader from './ui/AppSectionHeader.vue'

const props = defineProps({
  activeTool: {
    type: String,
    default: 'interval'
  },
  storageScope: {
    type: String,
    default: 'default'
  }
})

const erlangTools = [
  {
    id: 'interval',
    title: 'Erlang C Calculator',
    description: 'Check staffing and service levels for a single scenario.'
  },
  {
    id: 'batch',
    title: 'File Processor',
    description: 'Upload a file to process multiple staffing scenarios at once.'
  }
]

const activeToolTitle = computed(() =>
  erlangTools.find((tab) => tab.id === props.activeTool)?.title || 'Erlang Calculators'
)

const showErlangWorkspace = computed(() => props.activeTool !== 'forecasting')

const erlangToolItems = computed(() =>
  erlangTools.map((tab) => ({
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
  <ForecastingWorkspace v-if="!showErlangWorkspace" :storage-scope="props.storageScope" />

  <template v-else>
  <section class="bg-slate-50/80 py-2">
    <div class="app-frame grid gap-3">
      <AppPageHeader
        :breadcrumbs="[
          { label: 'Home', href: '#home' },
          { label: 'Erlang Calculators', href: '#calculators/interval' },
          { label: activeToolTitle }
        ]"
        title="Erlang Calculators"
      />

      <AppPanel subtle>
        <div class="grid gap-4">
          <AppSectionHeader
            title="Erlang Calculators"
            description="Choose a calculator to run a staffing check or process a file."
          />

          <AppOptionPills
            v-model="activeToolSelection"
            aria-label="Erlang calculators"
            :items="erlangToolItems"
          />
        </div>
      </AppPanel>
    </div>
  </section>

  <ErlangCForm v-if="props.activeTool === 'interval'" />
  <CsvBatchCalculator v-else-if="props.activeTool === 'batch'" />
  </template>
</template>
