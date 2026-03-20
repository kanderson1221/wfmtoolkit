<script setup>
const props = defineProps({
  inputId: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['select'])

const handleChange = (event) => {
  const action = event.target.value
  if (!action) return

  emit('select', action)
  event.target.value = ''
}
</script>

<template>
  <label class="monthly-copy-toolbar" :for="props.inputId">
    <span class="monthly-copy-label">Copy {{ props.label }}</span>
    <select
      :id="props.inputId"
      class="monthly-copy-select-input"
      @change="handleChange"
    >
      <option value="">Choose action</option>
      <option value="all">To all months</option>
      <option value="forward">Forward</option>
      <option value="quarter">Through quarter</option>
    </select>
  </label>
</template>
