import { mount } from '@vue/test-utils'

import PlanningGroupForecastsView from '../planning/PlanningGroupForecastsView.vue'

const ForecastingWorkspaceStub = {
  name: 'ForecastingWorkspace',
  props: [
    'showLibraryActions',
    'showDuplicateAction',
    'showSourceActionButton',
    'replacementDependenciesByProjectId'
  ],
  emits: ['save-complete', 'cancel-create'],
  template: `
    <div>
      <span data-testid="show-library-actions">{{ String(showLibraryActions) }}</span>
      <span data-testid="show-duplicate-action">{{ String(showDuplicateAction) }}</span>
      <span data-testid="show-source-action-button">{{ String(showSourceActionButton) }}</span>
      <span data-testid="replacement-dependencies">{{ JSON.stringify(replacementDependenciesByProjectId) }}</span>
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

  it('keeps library actions compact but exposes source replacement with dependent plan context', () => {
    const wrapper = mount(PlanningGroupForecastsView, {
      props: {
        center: {
          id: 'center-1',
          name: 'North America'
        },
        group: {
          id: 'group-1',
          name: 'Consumer Voice',
          plans: [
            {
              id: 'budget-2026',
              name: '2026 Budget',
              planType: 'budget',
              status: 'draft',
              planningYear: 2026,
              demandSource: {
                mode: 'forecast',
                forecastProjectId: 'forecast-1'
              }
            },
            {
              id: 'update-2026',
              name: 'Spring Update',
              planType: 'update',
              planningYear: 2026,
              demandSource: {
                mode: 'forecast',
                forecastProjectId: 'forecast-1'
              }
            }
          ]
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
    expect(wrapper.get('[data-testid="show-source-action-button"]').text()).toBe('true')
    expect(JSON.parse(wrapper.get('[data-testid="replacement-dependencies"]').text())).toEqual({
      'forecast-1': [
        expect.objectContaining({ label: '2026 Budget', state: 'draft', isDraft: true }),
        expect.objectContaining({ label: 'Spring Update', state: 'finalized', isDraft: false })
      ]
    })
  })
})
