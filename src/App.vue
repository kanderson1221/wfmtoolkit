<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import AppHeader from './components/AppHeader.vue'
import ErlangCForm from './components/ErlangCForm.vue'
import CsvBatchCalculator from './components/CsvBatchCalculator.vue'
import MonthlyPlanBuilder from './components/MonthlyPlanBuilder.vue'
import AppFooter from './components/AppFooter.vue'

const currentRoute = ref('erlang')

const syncRouteFromHash = () => {
  if (window.location.hash === '#csv-batch') {
    currentRoute.value = 'csv-batch'
    return
  }

  if (window.location.hash === '#monthly-plan') {
    currentRoute.value = 'monthly-plan'
    return
  }

  currentRoute.value = 'erlang'
}

onMounted(() => {
  syncRouteFromHash()
  window.addEventListener('hashchange', syncRouteFromHash)
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncRouteFromHash)
})
</script>

<template>
  <div class="app-shell">
    <AppHeader :current-route="currentRoute" />
    <main class="app-main">
      <ErlangCForm v-if="currentRoute === 'erlang'" />
      <MonthlyPlanBuilder v-else-if="currentRoute === 'monthly-plan'" />
      <CsvBatchCalculator v-else />
    </main>
    <AppFooter />
  </div>
</template>
