import { mount } from '@vue/test-utils'

import PlanningHome from '../PlanningHome.vue'

const AppButtonStub = {
  name: 'AppButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)"><slot /></button>'
}

const AppEmptyStateStub = {
  name: 'AppEmptyState',
  props: ['title', 'description'],
  template: '<section><h2>{{ title }}</h2><p>{{ description }}</p><slot /></section>'
}

const AppPageHeaderStub = {
  name: 'AppPageHeader',
  props: ['title', 'description'],
  template: '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="actions" /></header>'
}

const passthroughStub = (name, tag = 'section') => ({
  name,
  template: `<${tag}><slot /></${tag}>`
})

const buildCenter = (overrides = {}) => ({
  id: 'center-1',
  name: 'North America Support',
  operatingWeekdays: [1, 2, 3, 4, 5],
  operatingOpenTime: '08:00',
  operatingCloseTime: '18:00',
  groups: [{ id: 'group-1', name: 'Voice Support', plans: [] }],
  ...overrides
})

const buildWrapper = (props = {}) =>
  mount(PlanningHome, {
    props: {
      centers: [buildCenter()],
      weekdayOptions: [
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' }
      ],
      ...props
    },
    global: {
      stubs: {
        AppButton: AppButtonStub,
        AppConfirmDialog: passthroughStub('AppConfirmDialog'),
        AppEmptyState: AppEmptyStateStub,
        AppIcon: true,
        AppMenu: passthroughStub('AppMenu'),
        AppPageHeader: AppPageHeaderStub,
        AppPanel: passthroughStub('AppPanel'),
        AppTableShell: passthroughStub('AppTableShell'),
        CallCenterSettingsModal: true
      }
    }
  })

describe('PlanningHome', () => {
  it('shows only the call-center directory and operational identity fields', () => {
    const text = buildWrapper().text()

    expect(text).toContain('Call Centers')
    expect(text).toContain('Call Center Directory')
    expect(text).toContain('North America Support')
    expect(text).toContain('Staffing Groups')
    expect(text).toContain('Mon, Tue, Wed, Thu, Fri')
    expect(text).toContain('08:00–18:00')
    expect(text).not.toContain('Planning Portfolio')
    expect(text).not.toContain('Planning Year')
    expect(text).not.toContain('Plan Coverage')
    expect(text).not.toContain('Actuals Coverage')
    expect(text).not.toContain('Portfolio Monthly Operating Plan')
    expect(text).not.toContain('Download Portfolio CSV')
    expect(text).not.toContain('Monthly Staffing Waterfall')
  })

  it('sorts call centers by name without risk-based reporting logic', () => {
    const wrapper = buildWrapper({
      centers: [
        buildCenter({ id: 'center-z', name: 'West Operations' }),
        buildCenter({ id: 'center-a', name: 'Back Office', groups: [] })
      ]
    })
    const rows = wrapper.findAll('tbody tr')

    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Back Office')
    expect(rows[0].text()).toContain('0')
    expect(rows[1].text()).toContain('West Operations')
  })

  it('opens the selected call center from its visible row action', async () => {
    const wrapper = buildWrapper()
    window.location.hash = ''

    await wrapper.findAll('button').find((button) => button.text().trim() === 'Open').trigger('click')

    expect(window.location.hash).toBe('#planning/center/center-1')
  })

  it('shows a direct first-center action without report placeholders', () => {
    const text = buildWrapper({ centers: [] }).text()

    expect(text).toContain('Create the first call center')
    expect(text).toContain('Call centers organize staffing groups and their planning data.')
    expect(text).toContain('New Center')
    expect(text).not.toContain('operating report needs plans')
  })
})
