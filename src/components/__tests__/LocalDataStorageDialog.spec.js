import { mount } from '@vue/test-utils'

import LocalDataStorageDialog from '../LocalDataStorageDialog.vue'

const AppDialogStub = {
  name: 'AppDialog',
  props: ['visible', 'title', 'description', 'kicker'],
  template: '<div class="app-dialog-stub"><slot /><slot name="footer" /></div>'
}

const AppConfirmDialogStub = {
  name: 'AppConfirmDialog',
  props: ['visible'],
  template: '<div class="app-confirm-dialog-stub"><slot /></div>'
}

vi.mock('../../storage/localDataStore', () => ({
  analyzeLocalDataBackup: vi.fn(() => ({
    callCenterCount: 2,
    staffingGroupCount: 3,
    annualPlanCount: 4,
    savedForecastCount: 5,
    plannerDraftCount: 6
  })),
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

describe('LocalDataStorageDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the local data summary when opened', async () => {
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
  })
})
