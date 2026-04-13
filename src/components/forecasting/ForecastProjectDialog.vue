<script setup>
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'

const props = defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  currentProjectId: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: 'Saved forecasts stay separate from planning workspaces, but keep their monthly rollup ready for a later planner handoff.'
  }
})

const emit = defineEmits(['open', 'close'])

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

const handleClose = () => {
  visible.value = false
  emit('close')
}

const handleOpenProject = (projectId) => {
  visible.value = false
  emit('open', projectId)
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    title="Open Forecast"
    :description="props.description"
    allow-backdrop-close
    max-width="max-w-5xl"
    @close="emit('close')"
  >
    <div v-if="!props.projects.length" class="py-2">
      <AppEmptyState
        title="No saved forecasts"
        description="Use Save Forecast after loading history and configuring a model to save your first forecast."
      />
    </div>

    <div v-else class="grid gap-3">
      <div class="grid gap-2">
        <div
          v-for="project in props.projects"
          :key="project.id"
          class="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div class="grid gap-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base font-semibold tracking-[-0.03em] text-slate-950">
                {{ project.name }}
              </h3>
              <span
                class="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-600"
              >
                {{ project.sourceKindLabel }}
              </span>
              <span
                v-if="project.id === props.currentProjectId"
                class="inline-flex items-center rounded-full border border-[#d5e0ea] bg-[#eef4f8] px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#15395f]"
              >
                Current
              </span>
            </div>
            <p class="text-sm leading-6 text-slate-600">
              {{ project.summaryLine }} | {{ project.dateRangeLabel }}
            </p>
            <p class="text-[0.82rem] leading-5 text-slate-500">
              Updated {{ project.updatedAtLabel }} | Last run {{ project.runAtLabel }}
            </p>
          </div>

          <div class="flex items-center justify-start md:justify-end">
            <AppButton
              variant="primary"
              size="sm"
              @click="handleOpenProject(project.id)"
            >
              Open Forecast
            </AppButton>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
        <AppButton variant="secondary" @click="handleClose">Close</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
