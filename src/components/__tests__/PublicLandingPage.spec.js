import { mount } from '@vue/test-utils'

import PublicLandingPage from '../PublicLandingPage.vue'

const mountLandingPage = (props = {}) =>
  mount(PublicLandingPage, {
    props,
    global: {
      stubs: {
        AppAccountDialog: {
          template: '<div class="account-dialog-stub" />'
        }
      }
    }
  })

describe('PublicLandingPage', () => {
  it('introduces the toolkit and available tools for search visitors', () => {
    const wrapper = mountLandingPage({
      authConfigured: true
    })

    expect(wrapper.text()).toContain('Practical workforce planning tools, shared free.')
    expect(wrapper.text()).toContain('Built by a workforce manager')
    expect(wrapper.text()).toContain('Outputs are intended for decision support')
    expect(wrapper.text()).toContain('Planning Workspace')
    expect(wrapper.text()).toContain('Erlang Tools')
    expect(wrapper.text()).toContain('Sign In')
    expect(wrapper.text()).toContain('Open Planning Workspace')
  })

  it('removes the sign-in action from the landing header when the visitor is already authenticated', () => {
    const wrapper = mountLandingPage({
      authConfigured: true,
      isAuthenticated: true,
      userEmail: 'planner@example.com'
    })

    expect(wrapper.text()).toContain('Practical workforce planning tools, shared free.')
    expect(wrapper.text()).not.toContain('Sign In')
  })
})
