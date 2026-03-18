<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppPageHeader from '../ui/AppPageHeader.vue'
import AppPanel from '../ui/AppPanel.vue'
import AppStatStrip from '../ui/AppStatStrip.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  planningYear: {
    type: Number,
    required: true
  },
  operatingWeekdayLabel: {
    type: String,
    required: true
  },
  autosaveStatusMessage: {
    type: String,
    default: ''
  },
  autosaveState: {
    type: String,
    default: 'idle'
  },
  warningCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['open-settings', 'save', 'back'])

const statItems = computed(() => [
  {
    label: 'Year',
    value: String(props.planningYear),
    meta: 'Planning horizon'
  },
  {
    label: 'Operating Days',
    value: props.operatingWeekdayLabel,
    meta: 'Weekly operating pattern'
  }
])

const autosaveStatusClass = computed(() => {
  if (props.autosaveState === 'saving') {
    return 'text-sky-700'
  }

  if (props.autosaveState === 'restored') {
    return 'text-emerald-700'
  }

  return 'text-slate-500'
})

const description = computed(
  () => `${props.planningYear} staffing group using ${props.operatingWeekdayLabel} as the operating day pattern.`
)
</script>

<template>
  <AppPanel :padded="false">
    <div class="grid gap-4 p-5">
      <AppPageHeader
        kicker="Staffing Group Settings"
        :title="props.title"
        :description="description"
      >
        <template #actions>
          <AppButton variant="secondary" @click="emit('open-settings')">Edit Settings</AppButton>
          <AppButton variant="primary" @click="emit('save')">Save Staffing Group</AppButton>
          <AppButton variant="secondary" @click="emit('back')">Back to Staffing Groups</AppButton>
        </template>
      </AppPageHeader>

      <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <AppStatStrip :items="statItems" columns="sm:grid-cols-2" />
        <p class="text-sm font-medium xl:justify-self-end" :class="autosaveStatusClass">
          {{ props.autosaveStatusMessage }}
        </p>
      </div>

      <AppStatusMessage v-if="props.warningCount" tone="error">
        {{ props.warningCount }} monthly warning{{ props.warningCount === 1 ? '' : 's' }} detected.
        Review the demand model for missing or invalid monthly inputs before finalizing headcount.
      </AppStatusMessage>
    </div>
  </AppPanel>
</template>
