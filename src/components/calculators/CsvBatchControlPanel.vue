<script setup>
import AppButton from '../ui/AppButton.vue'
import AppPanel from '../ui/AppPanel.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

const props = defineProps({
  workflow: {
    type: Object,
    required: true
  },
  selectedFileName: {
    type: String,
    default: ''
  },
  selectedFileSizeLabel: {
    type: String,
    default: ''
  },
  parseError: {
    type: String,
    default: ''
  },
  submitError: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['file-select', 'run-workflow'])
</script>

<template>
  <AppPanel :padded="false" class="grid content-start gap-5 p-5">
    <AppSectionHeader
      kicker="File Processor"
      title="CSV Staffing File Processor"
      description="Upload an interval CSV for server-side staffing processing and download the enriched result file when the run completes."
    />

    <AppWorkspaceSection
      title="Source File"
      description="Choose a CSV up to 50 MB. Large files are processed on the server instead of in the browser."
    >
      <div class="flex flex-wrap items-center gap-3">
        <label
          for="batchCsvFile"
          class="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 md:w-auto"
        >
          Choose CSV
        </label>
        <input
          id="batchCsvFile"
          class="sr-only"
          type="file"
          accept=".csv,text/csv"
          @change="emit('file-select', $event)"
        />
        <a
          :href="props.workflow.templateHref"
          download
          class="inline-flex items-center gap-1 text-sm font-semibold text-blue-900 hover:text-blue-950"
        >
          Download CSV template
        </a>
      </div>

      <AppStatusMessage v-if="props.selectedFileName">
        Loaded file:
        <strong>{{ props.selectedFileName }}</strong>
        <template v-if="props.selectedFileSizeLabel">({{ props.selectedFileSizeLabel }})</template>
      </AppStatusMessage>
    </AppWorkspaceSection>

    <AppWorkspaceSection
      title="Process File"
      description="Run the staffing processor to generate a summary plus a downloadable enriched file or error report."
    >
      <AppButton
        variant="primary"
        block
        :disabled="props.isLoading"
        data-test="run-batch-workflow"
        @click="emit('run-workflow')"
      >
        {{ props.isLoading ? 'Processing...' : props.workflow.runLabel }}
      </AppButton>
    </AppWorkspaceSection>

    <AppStatusMessage v-if="props.parseError" tone="error">
      {{ props.parseError }}
    </AppStatusMessage>

    <AppStatusMessage v-if="props.submitError" tone="error">
      {{ props.submitError }}
    </AppStatusMessage>
  </AppPanel>
</template>
