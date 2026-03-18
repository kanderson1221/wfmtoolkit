import { mount } from '@vue/test-utils'

import MonthlyPlanBuilder from '../MonthlyPlanBuilder.vue'

const plannerStubs = {
  PlannerPresenceTab: {
    template: '<div data-test="presence-tab">presence</div>'
  },
  PlannerRandomTab: {
    template: '<div data-test="random-tab">random</div>'
  },
  PlannerMonthlyPlanTab: {
    template: '<div data-test="plan-tab">plan</div>'
  },
  PlannerStaffingPlanTab: {
    template: '<div data-test="staffing-tab">staffing</div>'
  },
  PlannerSettingsModal: {
    template: '<div data-test="settings-modal">settings</div>'
  }
}

const centerDefaults = {
  operatingWeekdays: [1, 2, 3, 4, 5],
  presenceMonths: [{ paidHoursPerDay: 8 }],
  randomDefaults: {
    occupancyPercent: 90,
    adherencePercent: 95
  }
}

const clearPlannerDrafts = () => {
  const storage = window.localStorage

  if (typeof storage?.removeItem === 'function') {
    storage.removeItem('wfmtoolkit.monthlyPlanDrafts.v1')
    return
  }

  if (storage && typeof storage === 'object') {
    delete storage['wfmtoolkit.monthlyPlanDrafts.v1']
  }
}

const mountBuilder = (props = {}) =>
  mount(MonthlyPlanBuilder, {
    props: {
      centerDefaults,
      ...props
    },
    global: {
      stubs: plannerStubs
    }
  })

const findButtonByText = (wrapper, label) =>
  wrapper.findAll('button').find((button) => button.text().trim() === label)

describe('MonthlyPlanBuilder', () => {
  beforeEach(() => {
    clearPlannerDrafts()
  })

  it('opens new staffing groups with the settings modal visible', () => {
    const wrapper = mountBuilder({
      draftKey: 'new-group'
    })

    expect(wrapper.find('[data-test="settings-modal"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Demand Model')
  })

  it('switches between demand model and staffing plan modes', async () => {
    const wrapper = mountBuilder({
      draftKey: 'plan-1',
      initialPlan: {
        id: 'plan-1',
        name: 'Consumer Voice',
        planningYear: 2026
      }
    })

    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(true)

    await findButtonByText(wrapper, 'Staffing Plan').trigger('click')

    expect(wrapper.find('[data-test="staffing-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(false)
  })

  it('emits a saved staffing group payload from the shell action', async () => {
    const wrapper = mountBuilder({
      draftKey: 'plan-1',
      initialPlan: {
        id: 'plan-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        name: 'Consumer Voice',
        planningYear: 2026
      }
    })

    await findButtonByText(wrapper, 'Save Staffing Group').trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0]).toMatchObject({
      id: 'plan-1',
      name: 'Consumer Voice',
      planningYear: 2026
    })
  })
})
