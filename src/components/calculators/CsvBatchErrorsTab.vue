<script setup>
import AppSectionHeader from '../ui/AppSectionHeader.vue'

const props = defineProps({
  errors: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <section class="results-tab-panel">
    <div class="results-detail">
      <AppSectionHeader title="Row Errors" />
      <div class="detail-grid" role="table" aria-label="Batch validation errors table">
        <div class="detail-row detail-head detail-row-errors" role="row">
          <span role="columnheader">Row</span>
          <span role="columnheader">Issue</span>
        </div>
        <div
          v-for="(error, index) in props.errors"
          :key="`error-${error.rowIndex}-${index}`"
          class="detail-row detail-row-errors"
          role="row"
        >
          <span role="cell">{{ error.rowIndex }}</span>
          <span role="cell">{{ error.message }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
