import { mount } from '@vue/test-utils'

import PlannerSectionNav from '../planner/PlannerSectionNav.vue'

describe('PlannerSectionNav', () => {
  it('shows decision-readable workflow status and preserves step selection semantics', async () => {
    const wrapper = mount(PlannerSectionNav, {
      props: {
        activeId: 'forecast',
        groups: [
          {
            id: 'plan',
            label: 'Plan',
            items: [
              { id: 'forecast', title: 'Forecasts', statusLabel: 'Applied', tone: 'ready' },
              { id: 'availability', title: 'Agent Availability', statusLabel: 'Using defaults', tone: 'attention' },
              { id: 'requirement', title: 'Demand Model', statusLabel: '0/12 months', tone: 'default' }
            ]
          }
        ]
      }
    })

    expect(wrapper.text()).toContain('Applied')
    expect(wrapper.text()).toContain('Using defaults')
    expect(wrapper.text()).toContain('0/12 months')
    expect(wrapper.get('[data-section-id="forecast"]').attributes('aria-current')).toBe('step')
    expect(wrapper.get('[data-section-id="forecast"]').attributes('data-status-tone')).toBe('ready')
    expect(wrapper.get('[data-section-id="availability"]').attributes('data-status-tone')).toBe('attention')
    expect(wrapper.get('[data-section-id="requirement"]').attributes('data-status-tone')).toBe('default')

    await wrapper.get('[data-section-id="availability"]').trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ id: 'availability' })
    expect(wrapper.emitted('update:activeId')?.[0]).toEqual(['availability'])
  })
})
