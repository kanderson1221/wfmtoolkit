<script setup>
import AppHeader from './components/AppHeader.vue'
import HeroSection from './components/HeroSection.vue'
import ErlangCForm from './components/ErlangCForm.vue'
import AppFooter from './components/AppFooter.vue'
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main>
      <HeroSection />
      <ErlangCForm />
    </main>
    <AppFooter />
  </div>
</template>
