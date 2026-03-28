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
    expect(wrapper.classes()).toContain('bg-[#15395f]')
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

  it('renders active tab buttons with the dark blue selected styling', () => {
    const wrapper = mount(AppButton, {
      props: {
        variant: 'tab',
        active: true
      },
      slots: {
        default: 'Selected'
      }
    })

    expect(wrapper.classes()).toContain('bg-[#15395f]')
    expect(wrapper.classes()).toContain('text-white')
  })
})
