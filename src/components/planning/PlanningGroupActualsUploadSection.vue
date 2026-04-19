<script setup>
import { computed } from 'vue'

import AppButton from '../ui/AppButton.vue'
import AppFileDropzone from '../ui/AppFileDropzone.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppTableShell from '../ui/AppTableShell.vue'

const props = defineProps({
  columnOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['file-select'])

const state = defineModel('state', {
  type: Object,
  required: true
})

const hasLoadedFile = computed(() => Boolean(state.value.uploadedFileName))

const definitionRows = computed(() => [
  {
    id: 'date',
    label: 'Date',
    required: 'Y',
    example: '2026-01-15',
    definition: 'Service date.',
    mappingKey: 'dateColumn'
  },
  {
    id: 'contacts',
    label: 'Contacts',
    required: 'Y',
    example: '1420',
    definition: 'Daily contact volume.',
    mappingKey: 'volumeColumn'
  },
  {
    id: 'aht',
    label: 'Avg AHT Sec',
    required: 'Y',
    example: '318',
    definition: 'Average handle time in seconds for that day.',
    mappingKey: 'ahtColumn'
  }
])
</script>

<template>
  <div class="grid gap-3">
    <AppFileDropzone
      input-id="planning-group-actuals-upload"
      title="Upload Daily Actuals"
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

    <AppTableShell>
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div class="grid gap-0.5">
          <p class="text-sm font-semibold text-slate-950">File Definition</p>
          <p class="text-sm text-slate-600">
            Map the service date, contacts, and average handle time columns. Other file columns are ignored.
          </p>
        </div>
        <AppButton
          size="sm"
          variant="primary"
          href="/planning_group_daily_actuals_template.csv"
          download
        >
          Download Sample Template
        </AppButton>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[920px] w-full table-fixed border-collapse text-sm text-slate-700">
          <colgroup>
            <col class="w-[8.5rem]" />
            <col class="w-[6rem]" />
            <col class="w-[8rem]" />
            <col />
            <col class="w-[12rem]" />
          </colgroup>
          <thead class="border-b border-slate-200 bg-[#edf3f8]">
            <tr>
              <th class="px-5 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">
                Column Name
              </th>
              <th class="px-4 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">
                Required
              </th>
              <th class="px-4 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">
                Example
              </th>
              <th class="px-4 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">
                Definition
              </th>
              <th class="px-5 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#15395f]">
                Mapped Column
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-200">
            <tr v-for="row in definitionRows" :key="row.id" class="bg-white align-middle">
              <td class="px-5 py-3 font-medium text-slate-950">{{ row.label }}</td>
              <td class="px-4 py-3 text-center font-medium" :class="row.required === 'Y' ? 'text-[#15395f]' : ''">
                {{ row.required }}
              </td>
              <td class="px-4 py-3 font-mono text-[0.82rem] whitespace-nowrap">{{ row.example }}</td>
              <td class="px-4 py-3 leading-5">{{ row.definition }}</td>
              <td class="px-5 py-3">
                <AppSelect
                  :id="`group-actuals-${row.id}-column`"
                  v-model="state.columnMapping[row.mappingKey]"
                  compact
                  class="w-full"
                  :options="props.columnOptions"
                  :disabled="!hasLoadedFile"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppTableShell>
  </div>
</template>
