import { mount } from '@vue/test-utils'

import PlanningForecastCreateModal from '../planning/PlanningForecastCreateModal.vue'

const mountModal = (props = {}) =>
  mount(PlanningForecastCreateModal, {
    props: {
      planningYear: 2026,
      sourceKind: 'modeled_daily',
      periodMode: 'full_year',
      coverageStartMonth: '2026-01-01',
      coverageEndMonth: '2026-12-01',
      yearOptions: [
        { label: '2026', value: 2026 }
      ],
      monthOptions: [
        { label: 'Jan 2026', value: '2026-01-01' },
        { label: 'Dec 2026', value: '2026-12-01' }
      ],
      canCreate: true,
      modeledForecastUnavailableMessage: 'Add at least 14 daily history rows in Data before building a modeled forecast for Voice Support.',
      ...props
    },
    global: {
      stubs: {
        AppButton: {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        AppDialog: {
          template: '<section><slot /><slot name="footer" /></section>'
        },
        AppFieldGroup: {
          props: ['label', 'helpText'],
          template: '<label>{{ label }}<slot /><span v-if="helpText">{{ helpText }}</span></label>'
        },
        AppSelect: {
          inheritAttrs: false,
          props: ['id', 'modelValue', 'options'],
          template: '<select />'
        },
        AppStatusMessage: {
          template: '<div><slot /></div>'
        }
      }
    }
  })

describe('PlanningForecastCreateModal', () => {
  it('does not show the modeled history warning when modeled creation is available', () => {
    const wrapper = mountModal()

    expect(wrapper.text()).not.toContain('Add at least 14 daily history rows')
  })

  it('shows the modeled history warning only when modeled creation is blocked', () => {
    const wrapper = mountModal({
      canCreate: false
    })

    expect(wrapper.text()).toContain('Add at least 14 daily history rows')
  })

  it('hides the modeled history warning for imported forecast sources', () => {
    const wrapper = mountModal({
      canCreate: true,
      sourceKind: 'imported_daily'
    })

    expect(wrapper.text()).not.toContain('Add at least 14 daily history rows')
  })
})
