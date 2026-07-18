import { mount } from '@vue/test-utils'

import LocalDataStorageDialog from '../LocalDataStorageDialog.vue'
import {
  analyzeLocalDataBackup,
  clearLocalDataStore,
  getLocalDataStorageSummary,
  importLocalDataBackup
} from '../../storage/localDataStore'

const AppDialogStub = {
  name: 'AppDialog',
  props: ['visible', 'title', 'description', 'kicker'],
  template: '<div class="app-dialog-stub"><slot /><slot name="footer" /></div>'
}

const AppConfirmDialogStub = {
  name: 'AppConfirmDialog',
  props: ['visible', 'title', 'description', 'confirmLabel', 'cancelLabel'],
  emits: ['confirm', 'update:visible'],
  template: `
    <div v-if="visible" class="app-confirm-dialog-stub">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <slot />
      <button class="cancel-confirmation" @click="$emit('update:visible', false)">{{ cancelLabel }}</button>
      <button class="confirm-action" @click="$emit('confirm')">{{ confirmLabel }}</button>
    </div>
  `
}

vi.mock('../../storage/localDataStore', () => ({
  analyzeLocalDataBackup: vi.fn(() => ({
    backupFormat: 'workspace_snapshot_v2',
    backupFormatLabel: 'Current workspace backup',
    schemaVersion: 2,
    exportedAt: '2026-04-08T14:00:00.000Z',
    recordScopeLabel: 'All local data',
    callCenterCount: 2,
    staffingGroupCount: 3,
    annualPlanCount: 4,
    savedForecastCount: 5,
    plannerDraftCount: 6
  })),
  clearLocalDataStore: vi.fn(async () => {}),
  downloadLocalDataBackup: vi.fn(async () => JSON.stringify({ schemaVersion: 1, data: {} })),
  getLocalDataStorageSummary: vi.fn(async () => ({
    storageLocationLabel: 'Stored in this browser',
    migrationStatusLabel: 'Using Dexie local database',
    callCenterCount: 2,
    staffingGroupCount: 3,
    annualPlanCount: 4,
    savedForecastCount: 5,
    plannerDraftCount: 6,
    planningUpdatedAt: '2026-04-08T14:00:00.000Z',
    forecastUpdatedAt: '2026-04-08T15:00:00.000Z',
    draftUpdatedAt: '2026-04-08T16:00:00.000Z',
    lastBackupExportAt: '2026-04-08T17:00:00.000Z'
  })),
  importLocalDataBackup: vi.fn(async () => ({
    callCenterCount: 2,
    staffingGroupCount: 3,
    annualPlanCount: 4,
    savedForecastCount: 5,
    plannerDraftCount: 6
  }))
}))

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const selectBackupFile = async (wrapper, envelope = { schemaVersion: 2, data: { workspaces: [] } }) => {
  const fileInput = wrapper.find('input[type="file"]')
  const backupFile = {
    name: 'wfmtoolkit-backup-2026-04-08.json',
    text: vi.fn(async () => JSON.stringify(envelope))
  }

  Object.defineProperty(fileInput.element, 'files', {
    configurable: true,
    value: [backupFile]
  })
  await fileInput.trigger('change')
  await flushPromises()
}

describe('LocalDataStorageDialog', () => {
  beforeEach(() => {
    vi.mocked(analyzeLocalDataBackup).mockReturnValue({
      backupFormat: 'workspace_snapshot_v2',
      backupFormatLabel: 'Current workspace backup',
      schemaVersion: 2,
      exportedAt: '2026-04-08T14:00:00.000Z',
      recordScopeLabel: 'All local data',
      callCenterCount: 2,
      staffingGroupCount: 3,
      annualPlanCount: 4,
      savedForecastCount: 5,
      plannerDraftCount: 6
    })
    vi.mocked(clearLocalDataStore).mockResolvedValue(undefined)
    vi.mocked(importLocalDataBackup).mockResolvedValue({
      callCenterCount: 2,
      staffingGroupCount: 3,
      annualPlanCount: 4,
      savedForecastCount: 5,
      plannerDraftCount: 6
    })
    vi.mocked(getLocalDataStorageSummary).mockResolvedValue({
      storageLocationLabel: 'Stored in this browser',
      migrationStatusLabel: 'Using Dexie local database',
      callCenterCount: 2,
      staffingGroupCount: 3,
      annualPlanCount: 4,
      savedForecastCount: 5,
      plannerDraftCount: 6,
      planningUpdatedAt: '2026-04-08T14:00:00.000Z',
      forecastUpdatedAt: '2026-04-08T15:00:00.000Z',
      draftUpdatedAt: '2026-04-08T16:00:00.000Z',
      lastBackupExportAt: '2026-04-08T17:00:00.000Z'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows the local data summary when opened', async () => {
    const wrapper = mount(LocalDataStorageDialog, {
      props: {
        visible: false
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub,
          AppConfirmDialog: AppConfirmDialogStub
        }
      }
    })

    await wrapper.setProps({ visible: true })
    await flushPromises()

    expect(wrapper.text()).toContain('Stored in this browser')
    expect(wrapper.text()).toContain('Using Dexie local database')
    expect(wrapper.text()).toContain('Call Centers')
    expect(wrapper.text()).toContain('Staffing Groups')
    expect(wrapper.text()).toContain('Saved Forecasts')
    expect(wrapper.text()).toContain('Planner Drafts')
  })

  it('downloads a backup from the dialog actions', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:backup')
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => {})
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mount(LocalDataStorageDialog, {
      props: {
        visible: true
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub,
          AppConfirmDialog: AppConfirmDialogStub
        }
      }
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('Download Backup')).trigger('click')
    await flushPromises()

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup')
    clickSpy.mockRestore()
  })

  it('reviews the validated recovery point before replacement', async () => {
    const wrapper = mount(LocalDataStorageDialog, {
      props: {
        visible: true
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub,
          AppConfirmDialog: AppConfirmDialogStub
        }
      }
    })

    await flushPromises()
    await selectBackupFile(wrapper)

    expect(analyzeLocalDataBackup).toHaveBeenCalledWith({
      schemaVersion: 2,
      data: { workspaces: [] }
    })
    expect(wrapper.text()).toContain('wfmtoolkit-backup-2026-04-08.json passed validation')
    expect(wrapper.text()).toContain('Apr 8, 2026')
    expect(wrapper.text()).toContain('Current workspace backup')
    expect(wrapper.text()).toContain('Version 2')
    expect(wrapper.text()).toContain('All local data')
    expect(wrapper.text()).toContain('Records to restore')
    expect(wrapper.text()).toContain('If it fails, the current local data remains intact')
    expect(importLocalDataBackup).not.toHaveBeenCalled()

    await wrapper.find('.cancel-confirmation').trigger('click')

    expect(importLocalDataBackup).not.toHaveBeenCalled()
  })

  it('replaces data only after the recovery point is confirmed', async () => {
    const wrapper = mount(LocalDataStorageDialog, {
      props: {
        visible: true
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub,
          AppConfirmDialog: AppConfirmDialogStub
        }
      }
    })

    await flushPromises()
    await selectBackupFile(wrapper)
    await wrapper.find('.confirm-action').trigger('click')
    await flushPromises()

    expect(importLocalDataBackup).toHaveBeenCalledWith({
      schemaVersion: 2,
      data: { workspaces: [] }
    })
    expect(wrapper.emitted('imported')).toHaveLength(1)
    expect(wrapper.text()).toContain('Local data backup imported.')
  })

  it('requires scoped confirmation before clearing all local data', async () => {
    const wrapper = mount(LocalDataStorageDialog, {
      props: {
        visible: false
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub,
          AppConfirmDialog: AppConfirmDialogStub
        }
      }
    })

    await wrapper.setProps({ visible: true })
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('Clear All Local Data')).trigger('click')

    expect(wrapper.text()).toContain('Clear All Local Data?')
    expect(wrapper.text()).toContain('2 call centers, 3 staffing groups, 4 annual plans, 5 saved forecasts, and 6 planner drafts')
    expect(wrapper.text()).toContain('Saved plans and recoverable drafts are not protected')
    expect(clearLocalDataStore).not.toHaveBeenCalled()

    await wrapper.find('.cancel-confirmation').trigger('click')

    expect(clearLocalDataStore).not.toHaveBeenCalled()
  })

  it('clears local data after confirmation and tells the app to reload', async () => {
    const wrapper = mount(LocalDataStorageDialog, {
      props: {
        visible: false
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub,
          AppConfirmDialog: AppConfirmDialogStub
        }
      }
    })

    await wrapper.setProps({ visible: true })
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('Clear All Local Data')).trigger('click')
    await wrapper.find('.confirm-action').trigger('click')
    await flushPromises()

    expect(clearLocalDataStore).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('cleared')).toHaveLength(1)
    expect(wrapper.text()).toContain('All local planning data was cleared.')
  })

  it('reports a clear failure without telling the app that data changed', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(clearLocalDataStore).mockRejectedValueOnce(new Error('The local database could not be cleared.'))
    const wrapper = mount(LocalDataStorageDialog, {
      props: {
        visible: false
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub,
          AppConfirmDialog: AppConfirmDialogStub
        }
      }
    })

    await wrapper.setProps({ visible: true })
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('Clear All Local Data')).trigger('click')
    await wrapper.find('.confirm-action').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('cleared')).toBeUndefined()
    expect(wrapper.text()).toContain('The local database could not be cleared.')
    expect(wrapper.text()).not.toContain('All local planning data was cleared.')
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
