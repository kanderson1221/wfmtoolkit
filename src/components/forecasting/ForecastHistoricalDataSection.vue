<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppFileDropzone from '../ui/AppFileDropzone.vue'
import AppInsetPanel from '../ui/AppInsetPanel.vue'
import AppSelect from '../ui/AppSelect.vue'

const props = defineProps({
  columnOptions: {
    type: Array,
    default: () => []
  },
  showSummaryPane: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['file-select'])

const project = defineModel('project', {
  type: Object,
  required: true
})

const hasLoadedFile = computed(() => Boolean(project.value.uploadedFileName))

const definitionRows = computed(() => [
  {
    id: 'date',
    label: 'Date',
    required: 'Y',
    example: '2025-01-01',
    definition: 'Service date.',
    mappingKey: 'dateColumn'
  },
  {
    id: 'contacts',
    label: 'Contacts',
    required: 'Y',
    example: '1420',
    definition: 'Offered contact volume.',
    mappingKey: 'volumeColumn'
  },
  {
    id: 'ceiling',
    label: 'Daily Ceiling',
    required: 'N',
    example: '2500',
    definition: 'Optional per-day ceiling override for logistic growth. If blank, the global upper forecast limit is used.',
    mappingKey: 'capColumn'
  },
  {
    id: 'floor',
    label: 'Daily Floor',
    required: 'N',
    example: '0',
    definition: 'Optional per-day floor override for logistic growth. If blank, the global lower forecast limit is used.',
    mappingKey: 'floorColumn'
  }
])
</script>

<template>
  <div
    class="grid gap-5"
    :class="props.showSummaryPane ? 'xl:grid-cols-[minmax(0,44rem)_minmax(0,1fr)] xl:items-stretch' : ''"
  >
    <div class="grid w-full content-start gap-3" :class="props.showSummaryPane ? 'max-w-[44rem]' : ''">
      <AppFileDropzone
        input-id="forecast-history-upload"
        title="Upload Daily History"
        button-label="Choose CSV"
        description="Drag and drop a CSV here."
        hint-text=""
        :format-badges="['.CSV']"
        compact
        centered
        class="w-full"
        accept=".csv,text/csv"
        @file-select="emit('file-select', $event)"
      />

      <AppInsetPanel class="grid gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm font-semibold text-slate-950">File Definition</p>
          <AppButton
            size="sm"
            variant="primary"
            href="/forecasting_daily_volume_sample_2022_2024.csv"
            download
          >
            Download Sample Template
          </AppButton>
        </div>

        <div>
          <div class="w-full">
            <div class="grid grid-cols-[7rem_4.5rem_5.5rem_minmax(10rem,1fr)_11rem] gap-x-2.5 border-b border-slate-200 bg-[#edf3f8] px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">
              <div>Column Name</div>
              <div class="text-center">Required</div>
              <div>Example</div>
              <div>Definition</div>
              <div>Mapped Column</div>
            </div>

            <div
              v-for="row in definitionRows"
              :key="row.id"
              class="grid grid-cols-[7rem_4.5rem_5.5rem_minmax(10rem,1fr)_11rem] items-center gap-x-2.5 border-b border-slate-200 px-4 py-2.5 text-sm text-slate-600 last:border-b-0"
            >
              <div class="font-medium text-slate-950">{{ row.label }}</div>
              <div class="text-center font-medium" :class="row.required === 'Y' ? 'text-[#15395f]' : ''">{{ row.required }}</div>
              <div class="font-mono text-[0.82rem] whitespace-nowrap">{{ row.example }}</div>
              <div class="leading-5">{{ row.definition }}</div>
              <div class="min-w-0">
                <AppSelect
                  :id="`forecast-${row.id}-column`"
                  v-model="project.columnMapping[row.mappingKey]"
                  compact
                  class="w-full min-w-0"
                  :options="props.columnOptions"
                  :disabled="!hasLoadedFile"
                />
              </div>
            </div>
          </div>
        </div>
      </AppInsetPanel>
    </div>
  </div>
</template>
