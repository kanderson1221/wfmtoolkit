<script setup>
const APP_VERSION = 'v0.9.0'
</script>

<template>
  <footer class="site-footer">
    <div class="app-frame flex flex-col gap-1 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
      <p>© {{ new Date().getFullYear() }} WFMToolkit · {{ APP_VERSION }}</p>
      <p>Built for practical workforce planning.</p>
    </div>
  </footer>
</template>
