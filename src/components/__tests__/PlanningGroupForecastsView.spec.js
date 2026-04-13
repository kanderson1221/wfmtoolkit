import { mount } from '@vue/test-utils'

import PlanningGroupForecastsView from '../planning/PlanningGroupForecastsView.vue'

describe('PlanningGroupForecastsView', () => {
  it('returns to the staffing group page after the forecast workspace saves', async () => {
    const originalHash = window.location.hash
    window.location.hash = '#planning/center/center-1/group/group-1/forecasts/year/2026/project/forecast-1'

    const wrapper = mount(PlanningGroupForecastsView, {
      props: {
        center: {
          id: 'center-1',
          name: 'North America'
        },
        group: {
          id: 'group-1',
          name: 'Consumer Voice'
        },
        planningYear: 2026
      },
      global: {
        stubs: {
          ForecastingWorkspace: {
            template: '<button type="button" @click="$emit(\'save-complete\')">Save Complete</button>'
          }
        }
      }
    })

    await wrapper.get('button').trigger('click')

    expect(window.location.hash).toBe('#planning/center/center-1/group/group-1/year/2026')

    window.location.hash = originalHash
  })

  it('returns to the staffing group page when forecast creation is cancelled', async () => {
    const originalHash = window.location.hash
    window.location.hash = '#planning/center/center-1/group/group-1/forecasts/year/2026/new/source/manual_monthly/type/budget'

    const wrapper = mount(PlanningGroupForecastsView, {
      props: {
        center: {
          id: 'center-1',
          name: 'North America'
        },
        group: {
          id: 'group-1',
          name: 'Consumer Voice'
        },
        planningYear: 2026
      },
      global: {
        stubs: {
          ForecastingWorkspace: {
            template: '<button type="button" @click="$emit(\'cancel-create\')">Cancel Create</button>'
          }
        }
      }
    })

    await wrapper.get('button').trigger('click')

    expect(window.location.hash).toBe('#planning/center/center-1/group/group-1/year/2026')

    window.location.hash = originalHash
  })
})
