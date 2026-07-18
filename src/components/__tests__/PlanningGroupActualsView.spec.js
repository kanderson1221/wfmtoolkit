import { mount } from '@vue/test-utils'

import PlanningGroupActualsView from '../planning/PlanningGroupActualsView.vue'

const PlanningGroupActualsImportModalStub = {
  name: 'PlanningGroupActualsImportModal',
  props: ['visible'],
  emits: ['apply', 'update:visible'],
  template: `
    <div v-if="visible">
      <button
        @click="$emit('apply', {
          sourceMode: 'daily_upload',
          uploadedFileName: 'actuals.csv',
          uploadedHeaders: ['service_date', 'contacts', 'average_handle_time_seconds'],
          columnMapping: {
            dateColumn: 'service_date',
            volumeColumn: 'contacts',
            ahtColumn: 'average_handle_time_seconds'
          },
          dailyRows: [
            { serviceDate: '2026-01-02', contacts: 110, ahtSeconds: 300 },
            { serviceDate: '2026-02-01', contacts: 120, ahtSeconds: 315 }
          ]
        })"
      >
        Apply Import
      </button>
    </div>
  `
}

const AppEmptyStateStub = {
  props: ['title', 'description'],
  template: `
    <div>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>
  `
}

const AppDialogStub = {
  props: ['visible', 'title', 'description'],
  emits: ['update:visible', 'close'],
  template: `
    <section v-if="visible" role="dialog" :aria-label="title">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <slot />
      <slot name="footer" />
    </section>
  `
}

const buildWrapper = (props = {}) =>
  mount(PlanningGroupActualsView, {
    props: {
      center: {
        id: 'center-1',
        holidayProfiles: [
          {
            year: 2025,
            holidayCalendarId: 'none'
          },
          {
            year: 2026,
            holidayCalendarId: 'none'
          }
        ]
      },
      group: {
        id: 'group-1',
        name: 'Voice Support',
        operatingWeekdays: [1, 2, 3, 4, 5],
        actuals: {
          sourceMode: 'daily_upload',
          uploadedFileName: 'existing.csv',
          dailyRows: [
            { serviceDate: '2025-12-31', contacts: 100, ahtSeconds: 290 },
            { serviceDate: '2026-01-01', contacts: 90, ahtSeconds: 280 },
            { serviceDate: '2026-01-05', contacts: 110, ahtSeconds: 300 }
          ]
        }
      },
      formatWhole: (value) => String(Math.round(Number(value ?? 0))),
      formatNumber: (value, digits = 1) =>
        Number(value ?? 0).toLocaleString('en-US', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }),
      ...props
    },
    global: {
      stubs: {
        AppDialog: AppDialogStub,
        AppEmptyState: AppEmptyStateStub,
        PlanningGroupActualsImportModal: PlanningGroupActualsImportModalStub
      }
    }
  })

describe('PlanningGroupActualsView', () => {
  it('renders a year-first scorecard with expandable month rows', async () => {
    const wrapper = buildWrapper()

    expect(wrapper.text()).toContain('Period')
    expect(wrapper.text()).toContain('Min Date')
    expect(wrapper.text()).toContain('Max Date')
    expect(wrapper.text()).toContain('Contacts')
    expect(wrapper.text()).toContain('Weighted Avg AHT')
    expect(wrapper.text()).toContain('Coverage')
    expect(wrapper.text()).toContain('Loaded / Expected Days')
    expect(wrapper.text()).not.toContain('Open Days')
    expect(wrapper.text()).not.toContain('Status')
    expect(wrapper.text()).toContain('2026')
    expect(wrapper.text()).toContain('2025')
    expect(wrapper.text()).not.toContain('Jan 2026')
    expect(wrapper.text()).not.toContain('Dec 2025')
    expect(wrapper.text()).toContain('200')
    expect(wrapper.text()).toContain('291.0 sec')
    expect(wrapper.text()).toContain('9.1%')
    expect(wrapper.text()).toContain('2 / 22')
    expect(wrapper.text()).toContain('Jan 1, 2026')
    expect(wrapper.text()).toContain('Jan 5, 2026')
    expect(wrapper.text()).toContain('Dec 31, 2025')
    expect(wrapper.text()).not.toContain('Forecast Readiness')
    expect(wrapper.text()).not.toContain('Loaded from')
    expect(wrapper.text()).not.toContain('existing.csv')

    const currentYearToggle = wrapper.findAll('button').find((node) => node.text().includes('2026'))
    await currentYearToggle.trigger('click')

    expect(wrapper.text()).toContain('Jan 2026')

    const priorYearToggle = wrapper.findAll('button').find((node) => node.text().includes('2025'))
    await priorYearToggle.trigger('click')

    expect(wrapper.text()).toContain('Dec 2025')
  })

  it('reviews and downloads exact missing open dates for an incomplete month', async () => {
    const csvBlobs = []
    vi.stubGlobal('Blob', vi.fn((parts, options) => ({ parts, options })))
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob) => {
        csvBlobs.push(blob)
        return 'blob:actuals-gaps'
      })
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => {})
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = buildWrapper()

    const currentYearToggle = wrapper.findAll('button').find((node) => node.text().includes('2026'))
    await currentYearToggle.trigger('click')
    const reviewButton = wrapper.findAll('button').find((node) => node.text().includes('Review 20 gaps'))

    expect(reviewButton).toBeTruthy()
    await reviewButton.trigger('click')

    expect(wrapper.get('[role="dialog"]').text()).toContain('Missing Open Dates — Jan 2026')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Jan 2, 2026')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Jan 30, 2026')
    expect(wrapper.get('[role="dialog"]').text()).not.toContain('Jan 1, 2026')
    expect(wrapper.get('[role="dialog"]').text()).not.toContain('Jan 5, 2026')

    const downloadButton = wrapper.findAll('button').find((node) => node.text().includes('Download Gap Template'))
    await downloadButton.trigger('click')

    expect(csvBlobs).toHaveLength(1)
    expect(csvBlobs[0].options.type).toBe('text/csv;charset=utf-8')
    expect(csvBlobs[0].parts[0]).toContain('service_date,contacts,average_handle_time_seconds')
    expect(csvBlobs[0].parts[0]).toContain('2026-01-02,,')
    expect(csvBlobs[0].parts[0]).not.toContain('2026-01-01,,')
    expect(clickSpy).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:actuals-gaps')

    clickSpy.mockRestore()
  })

  it('shows an empty state when no shared data has been loaded', () => {
    const wrapper = buildWrapper({
      group: {
        id: 'group-1',
        name: 'Voice Support',
        operatingWeekdays: [1, 2, 3, 4, 5],
        actuals: {
          sourceMode: 'daily_upload',
          uploadedFileName: '',
          dailyRows: []
        }
      }
    })

    expect(wrapper.text()).toContain('No data loaded')
    expect(wrapper.text()).toContain('Use Add Data to upload a daily CSV')
  })

  it('merges uploaded daily actuals into the shared history when the import modal is submitted', async () => {
    const wrapper = buildWrapper()
    wrapper.vm.openImportModal()
    await wrapper.vm.$nextTick()

    const applyImportButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Apply Import')
    await applyImportButton.trigger('click')

    expect(wrapper.emitted('save-actuals')).toHaveLength(1)
    expect(wrapper.emitted('save-actuals')[0][0]).toMatchObject({
      sourceMode: 'daily_upload',
      uploadedFileName: 'actuals.csv'
    })
    expect(wrapper.emitted('save-actuals')[0][0].dailyRows).toEqual([
      {
        serviceDate: '2025-12-31',
        contacts: 100,
        ahtSeconds: 290
      },
      {
        serviceDate: '2026-01-01',
        contacts: 90,
        ahtSeconds: 280
      },
      {
        serviceDate: '2026-01-02',
        contacts: 110,
        ahtSeconds: 300
      },
      {
        serviceDate: '2026-01-05',
        contacts: 110,
        ahtSeconds: 300
      },
      {
        serviceDate: '2026-02-01',
        contacts: 120,
        ahtSeconds: 315
      }
    ])
  })

  it('emits selection changes and can delete the selected scope from the local draft', async () => {
    const wrapper = buildWrapper()

    const currentYearRow = wrapper.find('[aria-label="Select 2026 data"]')
    await currentYearRow.trigger('click')

    expect(wrapper.emitted('selection-change')[0][0]).toMatchObject({
      type: 'year',
      year: '2026',
      label: '2026'
    })

    wrapper.vm.deleteSelectedScope()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('save-actuals')).toHaveLength(1)
    expect(wrapper.emitted('save-actuals')[0][0].dailyRows).toEqual([
      {
        serviceDate: '2025-12-31',
        contacts: 100,
        ahtSeconds: 290
      }
    ])
  })

  it('clears the current selection when the user clicks outside the table', async () => {
    const wrapper = buildWrapper()

    const currentYearRow = wrapper.find('[aria-label="Select 2026 data"]')
    await currentYearRow.trigger('click')

    const tableContainer = wrapper.find('.overflow-x-auto')
    await tableContainer.trigger('click')

    expect(wrapper.emitted('selection-change')).toHaveLength(2)
    expect(wrapper.emitted('selection-change')[1][0]).toBeNull()
  })

  it('toggles a selected row off when the user clicks it again', async () => {
    const wrapper = buildWrapper()

    const currentYearRow = wrapper.find('[aria-label="Select 2026 data"]')
    await currentYearRow.trigger('click')
    await currentYearRow.trigger('click')

    expect(wrapper.emitted('selection-change')).toHaveLength(2)
    expect(wrapper.emitted('selection-change')[1][0]).toBeNull()
  })
})
