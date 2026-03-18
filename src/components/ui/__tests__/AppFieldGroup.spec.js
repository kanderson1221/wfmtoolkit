import { mount } from '@vue/test-utils'

import AppFieldGroup from '../AppFieldGroup.vue'

describe('AppFieldGroup', () => {
  it('renders label, help text, error text, and action content', () => {
    const wrapper = mount(AppFieldGroup, {
      props: {
        label: 'Work email',
        inputId: 'email',
        helpText: 'Use your company address.',
        error: 'Email is required.'
      },
      slots: {
        default: '<input id="email" />',
        action: '<button type="button">Forgot?</button>'
      }
    })

    expect(wrapper.text()).toContain('Work email')
    expect(wrapper.text()).toContain('Use your company address.')
    expect(wrapper.text()).toContain('Email is required.')
    expect(wrapper.text()).toContain('Forgot?')
  })
})
