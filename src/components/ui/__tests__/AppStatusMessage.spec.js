import { mount } from '@vue/test-utils'

import AppStatusMessage from '../AppStatusMessage.vue'

describe('AppStatusMessage', () => {
  it('renders error styling and alert semantics', () => {
    const wrapper = mount(AppStatusMessage, {
      props: {
        tone: 'error'
      },
      slots: {
        default: 'Something went wrong'
      }
    })

    expect(wrapper.text()).toContain('Something went wrong')
    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.classes()).toContain('border-rose-200')
  })
})
