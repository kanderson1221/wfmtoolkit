<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import AppHeader from './components/AppHeader.vue'
import ErlangCForm from './components/ErlangCForm.vue'
import CsvBatchCalculator from './components/CsvBatchCalculator.vue'
import AppFooter from './components/AppFooter.vue'

const currentRoute = ref('erlang')

const syncRouteFromHash = () => {
  currentRoute.value = window.location.hash === '#csv-batch' ? 'csv-batch' : 'erlang'
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
      <CsvBatchCalculator v-else />
    </main>
    <AppFooter />
  </div>
</template>
