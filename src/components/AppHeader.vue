<script setup>
import logoUrl from '../assets/logo.png'
</script>

<template>
  <header class="site-header">
    <div class="container header-content">
      <a href="#" class="brand-wrap" aria-label="WFMToolkit home">
        <img :src="logoUrl" alt="WFMToolkit logo" class="brand-logo" />
        <span class="brand-tagline">Built for practical workforce planning.</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="#erlang-c" class="nav-link">Erlang C Calculator</a>
      </nav>
    </div>
  </header>
</template>
