import { mount } from '@vue/test-utils'

import PublicLandingPage from '../PublicLandingPage.vue'

const mountLandingPage = (props = {}) =>
  mount(PublicLandingPage, {
    props
  })

describe('PublicLandingPage', () => {
  it('introduces the toolkit and available tools for search visitors', () => {
    const wrapper = mountLandingPage()

    const italicNotes = wrapper.findAll('p.italic')

    expect(wrapper.text()).toContain('Practical workforce planning tools, shared')
    expect(wrapper.text()).toContain('free.')
    expect(wrapper.text()).toContain('Built by a workforce manager, WFM Toolkit is an independent project')
    expect(wrapper.text()).toContain('WFMToolkit is provided for decision support and estimation only')
    expect(italicNotes).toHaveLength(3)
    expect(italicNotes[0].text()).toContain('Results are estimates and are not guaranteed')
    expect(italicNotes[0].text()).toContain('Review and validate outputs against your own requirements')
    expect(italicNotes[1].text()).toContain('WFMToolkit does not use accounts or store planning data on a server')
    expect(italicNotes[2].text()).toContain('WFMToolkit is a work in progress and changes frequently')
    expect(italicNotes[2].text()).toContain('Review key workflows and outputs after updates')
    expect(wrapper.find('a[href="/terms/index.html"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Planning Workspace')
    expect(wrapper.text()).toContain('Forecasting')
    expect(wrapper.text()).toContain('Erlang Calculators')
    expect(wrapper.text()).not.toContain('Sign In')
    expect(wrapper.text()).toContain('Open Planning Workspace')
    expect(wrapper.text()).toContain('Open Call Centers')
    expect(wrapper.text()).toContain('Open Erlang Calculators')
  })

  it('keeps the landing header free of sign-in actions', () => {
    const wrapper = mountLandingPage()

    expect(wrapper.text()).toContain('Practical workforce planning tools, shared')
    expect(wrapper.text()).toContain('free.')
    expect(wrapper.text()).not.toContain('Sign In')
  })
})
