import { mount } from '@vue/test-utils'

import AppButton from '../AppButton.vue'

describe('AppButton', () => {
  it('applies semantic variant styling', () => {
    const wrapper = mount(AppButton, {
      props: {
        variant: 'primary'
      },
      slots: {
        default: 'Save'
      }
    })

    expect(wrapper.text()).toContain('Save')
    expect(wrapper.classes()).toContain('bg-sky-700')
  })

  it('renders an anchor when href is provided', () => {
    const wrapper = mount(AppButton, {
      props: {
        href: '#planning'
      },
      slots: {
        default: 'Open'
      }
    })

    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('href')).toBe('#planning')
  })
})
