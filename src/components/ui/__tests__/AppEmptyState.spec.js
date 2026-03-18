import { mount } from '@vue/test-utils'

import AppEmptyState from '../AppEmptyState.vue'

describe('AppEmptyState', () => {
  it('renders title and description content', () => {
    const wrapper = mount(AppEmptyState, {
      props: {
        title: 'No results yet',
        description: 'Run the calculator to populate the workspace.'
      }
    })

    expect(wrapper.text()).toContain('No results yet')
    expect(wrapper.text()).toContain('Run the calculator to populate the workspace.')
  })
})
