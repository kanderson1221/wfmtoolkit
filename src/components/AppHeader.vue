<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'

defineProps({
  currentRoute: {
    type: String,
    default: 'erlang'
  }
})

import logoUrl from '../assets/logo.png'

const menuOpen = ref(false)

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

onMounted(() => {
  window.addEventListener('hashchange', closeMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', closeMenu)
})
</script>

<template>
  <header class="site-header">
    <div class="container header-content">
      <a href="#" class="brand-wrap" aria-label="WFMToolkit home">
        <img :src="logoUrl" alt="WFMToolkit logo" class="brand-logo" />
        <span class="brand-tagline">Built for practical workforce planning.</span>
      </a>
      <nav class="site-nav" aria-label="Main navigation">
        <button
          class="nav-toggle"
          type="button"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          aria-controls="main-nav-links"
          aria-label="Toggle navigation menu"
          @click="toggleMenu"
        >
          <span class="nav-toggle-bar"></span>
          <span class="nav-toggle-bar"></span>
          <span class="nav-toggle-bar"></span>
        </button>
        <div id="main-nav-links" class="nav-links" :class="{ open: menuOpen }">
          <a
            href="#erlang-c"
            class="nav-link"
            :class="{ active: currentRoute === 'erlang' }"
            @click="closeMenu"
          >
            Erlang C Calculator
          </a>
          <a
            href="#csv-batch"
            class="nav-link"
            :class="{ active: currentRoute === 'csv-batch' }"
            @click="closeMenu"
          >
            Bulk Staffing Planner
          </a>
        </div>
      </nav>
    </div>
  </header>
</template>
