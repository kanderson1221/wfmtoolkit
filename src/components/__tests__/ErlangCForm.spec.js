import { flushPromises, mount } from '@vue/test-utils'

import ErlangCForm from '../ErlangCForm.vue'

describe('ErlangCForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: {
          requiredAgents: '18',
          requiredHeadcount: '24',
          serviceLevel: '80%',
          expectedAsa: '00:18',
          percentAnsweredImmediately: '52%',
          estimatedOccupancy: '84%',
          abandonPercent: '3%'
        },
        scenarios: [
          {
            agents: 18,
            requiredHeadcount: 24,
            serviceLevel: '80%',
            asa: '00:18',
            percentAnsweredImmediately: '52%',
            expectedOccupancy: '84%',
            abandonment: '3%',
            isRecommended: true
          }
        ]
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders staffing results after a successful calculation', async () => {
    const wrapper = mount(ErlangCForm)

    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/erlang-c/calculate',
      expect.objectContaining({
        method: 'POST'
      })
    )
    expect(wrapper.text()).toContain('Required Headcount')
    expect(wrapper.text()).toContain('24')
    expect(wrapper.text()).toContain('Recommendation Workspace')
    expect(wrapper.text()).toContain('Agents')
  })
})
