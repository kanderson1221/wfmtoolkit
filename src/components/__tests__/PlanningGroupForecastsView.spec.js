import { mount } from '@vue/test-utils'

import PlanningGroupForecastsView from '../planning/PlanningGroupForecastsView.vue'

const ForecastingWorkspaceStub = {
  name: 'ForecastingWorkspace',
  props: ['showLibraryActions', 'showDuplicateAction', 'showSourceActionButton'],
  emits: ['save-complete', 'cancel-create'],
  template: `
    <div>
      <span data-testid="show-library-actions">{{ String(showLibraryActions) }}</span>
      <span data-testid="show-duplicate-action">{{ String(showDuplicateAction) }}</span>
      <span data-testid="show-source-action-button">{{ String(showSourceActionButton) }}</span>
      <button type="button" @click="$emit('save-complete')">Save Complete</button>
      <button type="button" @click="$emit('cancel-create')">Cancel Create</button>
    </div>
  `
}

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
          ForecastingWorkspace: ForecastingWorkspaceStub
        }
      }
    })

    await wrapper.findAll('button').find((node) => node.text() === 'Save Complete').trigger('click')

    expect(window.location.hash).toBe('#planning/center/center-1/group/group-1/year/2026/tab/forecasts')

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
          ForecastingWorkspace: ForecastingWorkspaceStub
        }
      }
    })

    await wrapper.findAll('button').find((node) => node.text() === 'Cancel Create').trigger('click')

    expect(window.location.hash).toBe('#planning/center/center-1/group/group-1/year/2026/tab/forecasts')

    window.location.hash = originalHash
  })

  it('hides forecast-library and source actions inside the staffing-group forecast workspace', () => {
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
          ForecastingWorkspace: ForecastingWorkspaceStub
        }
      }
    })

    expect(wrapper.get('[data-testid="show-library-actions"]').text()).toBe('false')
    expect(wrapper.get('[data-testid="show-duplicate-action"]').text()).toBe('false')
    expect(wrapper.get('[data-testid="show-source-action-button"]').text()).toBe('false')
  })
})
