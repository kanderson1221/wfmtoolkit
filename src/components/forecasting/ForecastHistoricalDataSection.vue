<script setup>
import { computed } from 'vue'

import ForecastHistoryPreviewChart from './ForecastHistoryPreviewChart.vue'
import AppButton from '../ui/AppButton.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppFileDropzone from '../ui/AppFileDropzone.vue'
import AppInsetPanel from '../ui/AppInsetPanel.vue'
import AppSelect from '../ui/AppSelect.vue'
import { formatDate } from '../../forecasting/shared'

const props = defineProps({
  columnOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['file-select'])

const project = defineModel('project', {
  type: Object,
  required: true
})

const hasLoadedFile = computed(() => Boolean(project.value.uploadedFileName))
const uploadedRowsCount = computed(() =>
  Array.isArray(project.value.uploadedRows) ? project.value.uploadedRows.length : 0
)
const historyRowCount = computed(() =>
  Array.isArray(project.value.historyRows) ? project.value.historyRows.length : 0
)

const totalContacts = computed(() =>
  (project.value.historyRows || []).reduce((sum, row) => sum + (Number(row?.y) || 0), 0)
)

const uploadedDateRange = computed(() => {
  if (!historyRowCount.value) {
    return {
      start: '—',
      end: '—'
    }
  }

  const firstRow = project.value.historyRows[0]
  const lastRow = project.value.historyRows[historyRowCount.value - 1]

  if (!firstRow?.ds || !lastRow?.ds) {
    return {
      start: '—',
      end: '—'
    }
  }

  return {
    start: formatDate(firstRow.ds),
    end: formatDate(lastRow.ds)
  }
})

const summaryItems = computed(() => [
  {
    label: 'Parsed Rows',
    value: uploadedRowsCount.value
  },
  {
    label: 'Total Contacts',
    value: new Intl.NumberFormat('en-US').format(totalContacts.value)
  },
  {
    label: 'Start Date',
    value: uploadedDateRange.value.start
  },
  {
    label: 'End Date',
    value: uploadedDateRange.value.end
  }
])

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
    label: 'Ceiling',
    required: 'N',
    example: '2500',
    definition: 'Upper bound for growth trends.',
    mappingKey: 'capColumn'
  },
  {
    id: 'floor',
    label: 'Floor',
    required: 'N',
    example: '0',
    definition: 'Lower bound for growth trends.',
    mappingKey: 'floorColumn'
  }
])
</script>

<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,44rem)_minmax(0,1fr)] xl:items-stretch">
    <div class="grid w-full max-w-[44rem] content-start gap-3">
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

    <AppInsetPanel tone="subtle" class="grid h-full min-h-0 grid-rows-[auto_1fr] gap-4 self-stretch">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-slate-950">File Summary</p>
        <span
          v-if="hasLoadedFile"
          class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
        >
          Loaded
        </span>
      </div>

      <template v-if="hasLoadedFile">
        <div class="grid min-h-0 grid-rows-[auto_1fr] gap-4">
          <div class="grid divide-y divide-[#1c446d] overflow-hidden rounded-[28px] border border-[#102f4f] bg-[#15395f] sm:grid-cols-2 sm:divide-x sm:divide-y-0 2xl:grid-cols-4">
            <article
              v-for="item in summaryItems"
              :key="item.label"
              class="grid gap-1.5 px-5 py-3.5"
            >
              <span class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-200">
                {{ item.label }}
              </span>
              <strong class="text-lg font-semibold tracking-[-0.03em] text-white">
                {{ item.value }}
              </strong>
            </article>
          </div>

          <AppInsetPanel class="grid min-h-[22rem] min-w-0 grid-rows-[auto_1fr] gap-3">
            <p class="text-sm font-semibold text-slate-950">Daily History</p>
            <div class="min-h-0">
              <ForecastHistoryPreviewChart v-if="historyRowCount" :rows="project.historyRows" />
              <AppEmptyState
                v-else
                title="No mapped history yet"
                description="Map the date and contacts columns to preview the daily history trend."
              />
            </div>
          </AppInsetPanel>
        </div>
      </template>

      <AppEmptyState
        v-else
        title="No file loaded"
        description="Upload a CSV to preview file details and the daily history trend."
      />
    </AppInsetPanel>
  </div>
</template>
