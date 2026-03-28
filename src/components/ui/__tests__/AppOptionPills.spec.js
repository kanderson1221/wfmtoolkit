import { mount } from '@vue/test-utils'

import AppOptionPills from '../AppOptionPills.vue'

describe('AppOptionPills', () => {
  it('updates a single selection', async () => {
    const wrapper = mount(AppOptionPills, {
      props: {
        modelValue: 'planning',
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
        ariaLabel: 'Tools',
        items: [
          { id: 'planning', label: 'Planning Workspace' },
          { id: 'calculators', label: 'Erlang Tools' }
        ]
      }
    })

    await wrapper.get('button:nth-of-type(2)').trigger('click')

    expect(wrapper.get('button:nth-of-type(2)').attributes('class')).toContain('bg-[#eef4f8]')
  })

  it('toggles multiple selections', async () => {
    const wrapper = mount(AppOptionPills, {
      props: {
        modelValue: [1, 3],
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
        ariaLabel: 'Operating days',
        multiple: true,
        items: [
          { id: 1, label: 'Mon' },
          { id: 2, label: 'Tue' },
          { id: 3, label: 'Wed' }
        ]
      }
    })

    await wrapper.findAll('button')[1].trigger('click')

    expect(wrapper.findAll('button')[1].attributes('aria-pressed')).toBe('true')
  })
})
