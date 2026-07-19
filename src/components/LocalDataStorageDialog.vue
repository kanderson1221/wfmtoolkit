<script setup>
import { computed, ref, watch } from 'vue'

import AppButton from './ui/AppButton.vue'
import AppConfirmDialog from './ui/AppConfirmDialog.vue'
import AppDialog from './ui/AppDialog.vue'
import AppPanel from './ui/AppPanel.vue'
import AppStatStrip from './ui/AppStatStrip.vue'
import AppStatusMessage from './ui/AppStatusMessage.vue'
import { downloadTextFile } from '../fileDownload'
import {
  analyzeLocalDataBackup,
  clearLocalDataStore,
  downloadLocalDataBackup,
  getLocalDataStorageSummary,
  importLocalDataBackup
} from '../storage/localDataStore'

const emit = defineEmits(['cleared', 'imported'])

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

const importFileInput = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const summary = ref(null)
const importConfirmOpen = ref(false)
const clearConfirmOpen = ref(false)
const pendingImportEnvelope = ref(null)
const pendingImportSummary = ref(null)
const pendingImportFileName = ref('')

const formatDateTime = (value) => {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed)
}

const summaryItems = computed(() => [
  { label: 'Call Centers', value: String(summary.value?.callCenterCount || 0) },
  { label: 'Staffing Groups', value: String(summary.value?.staffingGroupCount || 0) },
  { label: 'Annual Plans', value: String(summary.value?.annualPlanCount || 0) },
  { label: 'Saved Forecasts', value: String(summary.value?.savedForecastCount || 0) },
  { label: 'Planner Drafts', value: String(summary.value?.plannerDraftCount || 0) }
])

const datasetSummaryItems = computed(() => [
  { label: 'Planning Updated', value: formatDateTime(summary.value?.planningUpdatedAt) },
  { label: 'Forecasts Updated', value: formatDateTime(summary.value?.forecastUpdatedAt) },
  { label: 'Drafts Updated', value: formatDateTime(summary.value?.draftUpdatedAt) },
  { label: 'Last Backup Export', value: formatDateTime(summary.value?.lastBackupExportAt) }
])

const importSummaryItems = computed(() => {
  if (!pendingImportSummary.value) {
    return []
  }

  return [
    { label: 'Call Centers', value: String(pendingImportSummary.value.callCenterCount || 0) },
    { label: 'Staffing Groups', value: String(pendingImportSummary.value.staffingGroupCount || 0) },
    { label: 'Annual Plans', value: String(pendingImportSummary.value.annualPlanCount || 0) },
    { label: 'Saved Forecasts', value: String(pendingImportSummary.value.savedForecastCount || 0) },
    { label: 'Planner Drafts', value: String(pendingImportSummary.value.plannerDraftCount || 0) }
  ]
})

const importRecoveryPointItems = computed(() => {
  if (!pendingImportSummary.value) {
    return []
  }

  return [
    { label: 'Backup Exported', value: formatDateTime(pendingImportSummary.value.exportedAt) },
    { label: 'Backup Format', value: pendingImportSummary.value.backupFormatLabel || 'WFM Toolkit backup' },
    { label: 'Schema', value: `Version ${pendingImportSummary.value.schemaVersion}` },
    { label: 'Record Scope', value: pendingImportSummary.value.recordScopeLabel || 'All local data' }
  ]
})

const clearScopeDescription = computed(() => {
  const counts = [
    `${summary.value?.callCenterCount || 0} call centers`,
    `${summary.value?.staffingGroupCount || 0} staffing groups`,
    `${summary.value?.annualPlanCount || 0} annual plans`,
    `${summary.value?.savedForecastCount || 0} saved forecasts`,
    `${summary.value?.plannerDraftCount || 0} planner drafts`
  ]

  return `${counts.slice(0, -1).join(', ')}, and ${counts.at(-1)}`
})

const refreshSummary = async () => {
  loading.value = true

  try {
    summary.value = await getLocalDataStorageSummary()
    errorMessage.value = ''
  } catch (error) {
    console.error('Unable to inspect local data storage.', error)
    errorMessage.value = error instanceof Error ? error.message : 'Unable to inspect local data storage.'
  } finally {
    loading.value = false
  }
}

const handleDownloadBackup = async () => {
  loading.value = true

  try {
    const backupJson = await downloadLocalDataBackup()
    const exportedAt = new Date()
    const fileName = `wfmtoolkit-backup-${exportedAt.toISOString().slice(0, 10)}.json`
    downloadTextFile(fileName, backupJson, 'application/json')
    successMessage.value = 'Backup downloaded.'
    errorMessage.value = ''
    await refreshSummary()
  } catch (error) {
    console.error('Unable to download the local backup.', error)
    errorMessage.value = error instanceof Error ? error.message : 'Unable to download the local backup.'
  } finally {
    loading.value = false
  }
}

const triggerImportChooser = () => {
  importFileInput.value?.click?.()
}

const handleImportFileChange = async (event) => {
  const file = event?.target?.files?.[0]
  event.target.value = ''

  if (!file) {
    return
  }

  try {
    const rawText = await file.text()
    const parsedEnvelope = JSON.parse(rawText)
    pendingImportEnvelope.value = parsedEnvelope
    pendingImportSummary.value = analyzeLocalDataBackup(parsedEnvelope)
    pendingImportFileName.value = file.name || 'Selected backup'
    importConfirmOpen.value = true
    errorMessage.value = ''
  } catch (error) {
    console.error('Unable to prepare the selected backup file.', error)
    pendingImportEnvelope.value = null
    pendingImportSummary.value = null
    pendingImportFileName.value = ''
    errorMessage.value = error instanceof Error ? error.message : 'Unable to read the selected backup file.'
  }
}

const confirmImport = async () => {
  if (!pendingImportEnvelope.value) {
    importConfirmOpen.value = false
    return
  }

  loading.value = true

  try {
    await importLocalDataBackup(pendingImportEnvelope.value)
    successMessage.value = 'Local data backup imported.'
    errorMessage.value = ''
    importConfirmOpen.value = false
    pendingImportEnvelope.value = null
    pendingImportSummary.value = null
    pendingImportFileName.value = ''
    await refreshSummary()
    emit('imported')
  } catch (error) {
    console.error('Unable to import the selected backup file.', error)
    errorMessage.value = error instanceof Error ? error.message : 'Unable to import the selected backup file.'
  } finally {
    loading.value = false
  }
}

const confirmClear = async () => {
  loading.value = true

  try {
    await clearLocalDataStore()
    successMessage.value = 'All local planning data was cleared.'
    errorMessage.value = ''
    clearConfirmOpen.value = false
    await refreshSummary()
    emit('cleared')
  } catch (error) {
    console.error('Unable to clear local planning data.', error)
    errorMessage.value = error instanceof Error ? error.message : 'Unable to clear local planning data.'
  } finally {
    loading.value = false
  }
}

watch(
  visible,
  (isVisible) => {
    if (!isVisible) {
      return
    }

    successMessage.value = ''
    void refreshSummary()
  },
  { immediate: false }
)
</script>

<template>
  <AppDialog
    v-if="visible"
    v-model:visible="visible"
    title="Local Data Storage"
    description="Review what is stored in this browser, download a backup, or replace the current local data with an imported backup."
    kicker="Local Recovery"
    allow-backdrop-close
    max-width="max-w-5xl"
  >
    <div class="grid gap-4">
      <AppStatusMessage v-if="loading">
        Reading the local data summary from this browser.
      </AppStatusMessage>

      <AppStatusMessage v-if="errorMessage" tone="error">
        {{ errorMessage }}
      </AppStatusMessage>

      <AppStatusMessage v-if="successMessage" tone="success">
        {{ successMessage }}
      </AppStatusMessage>

      <AppPanel subtle>
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Storage Status
          </span>
          <strong class="text-lg font-semibold tracking-[-0.03em] text-slate-950">
            {{ summary?.storageLocationLabel || 'Stored in this browser' }}
          </strong>
          <p class="text-sm text-slate-600">
            {{ summary?.migrationStatusLabel || 'Using Dexie local database' }}
          </p>
        </div>
      </AppPanel>

      <AppStatStrip :items="summaryItems" columns="md:grid-cols-3 xl:grid-cols-5" />

      <AppStatStrip :items="datasetSummaryItems" columns="md:grid-cols-2 xl:grid-cols-4" />

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <AppPanel>
          <div class="grid gap-3">
            <div class="grid gap-1">
              <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Backup and Restore
              </span>
              <h3 class="text-lg font-semibold tracking-[-0.03em] text-slate-950">
                Protect this browser against data loss
              </h3>
              <p class="text-sm leading-6 text-slate-600">
                Download a single backup file containing call centers, staffing groups, plans, forecasts, and planner drafts.
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <AppButton variant="primary" @click="handleDownloadBackup">
                Download Backup
              </AppButton>
              <AppButton variant="secondary" @click="triggerImportChooser">
                Import Backup
              </AppButton>
            </div>
          </div>
        </AppPanel>

        <AppPanel subtle>
          <div class="grid gap-2">
            <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Import Mode
            </span>
            <strong class="text-sm font-semibold text-slate-950">
              Replace all local data
            </strong>
            <p class="text-sm leading-6 text-slate-600">
              Import replaces the current local database in one step. If the file is invalid, nothing is changed.
            </p>
          </div>
        </AppPanel>
      </div>

      <AppPanel subtle>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="grid max-w-2xl gap-1">
            <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Data Removal
            </span>
            <h3 class="text-lg font-semibold tracking-[-0.03em] text-slate-950">
              Clear this browser's planning data
            </h3>
            <p class="text-sm leading-6 text-slate-600">
              Permanently remove call centers, staffing groups, annual plans, saved forecasts, and recoverable drafts from this browser.
            </p>
          </div>

          <AppButton variant="danger" @click="clearConfirmOpen = true">
            Clear All Local Data
          </AppButton>
        </div>
      </AppPanel>
    </div>

    <template #footer>
      <div class="flex justify-end border-t border-slate-200 pt-5">
        <AppButton variant="secondary" @click="visible = false">
          Close
        </AppButton>
      </div>
    </template>

    <input
      ref="importFileInput"
      type="file"
      class="hidden"
      accept="application/json,.json"
      aria-label="Import local data backup"
      @change="handleImportFileChange"
    />

    <AppConfirmDialog
      v-model:visible="importConfirmOpen"
      title="Replace Local Data?"
      description="Importing this backup will replace the current local data stored in this browser."
      kicker="Backup Import"
      confirm-label="Replace Local Data"
      cancel-label="Cancel"
      confirm-variant="danger"
      allow-backdrop-close
      max-width="max-w-4xl"
      @confirm="confirmImport"
    >
      <div class="grid gap-4">
        <AppStatusMessage tone="success">
          <strong>{{ pendingImportFileName }}</strong> passed validation. Review the recovery point before replacing current data.
        </AppStatusMessage>
        <AppStatStrip
          :items="importRecoveryPointItems"
          columns="md:grid-cols-2 xl:grid-cols-4"
          compact
        />
        <div class="grid gap-2">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Records to restore
          </span>
          <AppStatStrip :items="importSummaryItems" columns="md:grid-cols-3 xl:grid-cols-5" compact />
        </div>
        <AppStatusMessage>
          Replacement runs as one operation. If it fails, the current local data remains intact.
        </AppStatusMessage>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      v-model:visible="clearConfirmOpen"
      title="Clear All Local Data?"
      description="Permanently delete all WFM Toolkit planning data stored in this browser. This cannot be undone."
      kicker="Data Removal"
      confirm-label="Clear All Local Data"
      cancel-label="Cancel"
      confirm-variant="danger"
      @confirm="confirmClear"
    >
      <div class="grid gap-3">
        <AppStatusMessage tone="error">
          This will delete {{ clearScopeDescription }}. Saved plans and recoverable drafts are not protected from this action.
        </AppStatusMessage>
        <AppStatusMessage>
          Download a backup first if you may need to restore this workspace later.
        </AppStatusMessage>
      </div>
    </AppConfirmDialog>
  </AppDialog>
</template>
