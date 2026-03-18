<script setup>
import AppButton from '../ui/AppButton.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'

const props = defineProps({
  errors: {
    type: Array,
    default: () => []
  },
  hasRowsTab: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['jump-to-row'])
</script>

<template>
  <section class="results-tab-panel">
    <div class="results-detail">
      <AppSectionHeader title="Row Errors" />
      <div class="detail-grid" role="table" aria-label="Batch validation errors table">
        <div class="detail-row detail-head detail-row-errors detail-row-errors-actions" role="row">
          <span role="columnheader">Row</span>
          <span role="columnheader">Issue</span>
          <span role="columnheader">Action</span>
        </div>
        <div
          v-for="(error, index) in props.errors"
          :key="`error-${error.rowIndex}-${index}`"
          class="detail-row detail-row-errors detail-row-errors-actions"
          role="row"
        >
          <span role="cell">{{ error.rowIndex }}</span>
          <span role="cell">{{ error.message }}</span>
          <span role="cell">
            <AppButton
              v-if="error.rowIndex > 0 && props.hasRowsTab"
              variant="secondary"
              size="sm"
              @click="emit('jump-to-row', error.rowIndex)"
            >
              Go To Row
            </AppButton>
            <span v-else class="helper-text">No row target</span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
