import { mount } from '@vue/test-utils'

import MonthlyPlanBuilder from '../MonthlyPlanBuilder.vue'

const plannerStubs = {
  PlannerOverviewPanel: {
    template: '<div data-test="overview-panel">overview</div>'
  },
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
  }
}

const centerDefaults = {
  centerId: 'center-1',
  groupId: 'group-1',
  groupName: 'Consumer Voice',
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

  it('opens new plans directly in the editor workflow', () => {
    const wrapper = mountBuilder({
      draftKey: 'new-plan',
      prefilledYear: 2026
    })

    expect(wrapper.text()).toContain('Overview')
  })

  it('switches between overview, forecast need, and plan staffing', async () => {
    const wrapper = mountBuilder({
      draftKey: 'plan-1',
      initialPlan: {
        id: 'plan-1',
        name: 'Consumer Voice',
        planningYear: 2026
      }
    })

    expect(wrapper.find('[data-test="overview-panel"]').exists()).toBe(true)

    await wrapper.find('[data-section-id="forecast"]').trigger('click')

    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overview-panel"]').exists()).toBe(false)

    await wrapper.find('[data-section-id="staffing"]').trigger('click')

    expect(wrapper.find('[data-test="staffing-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(false)
  })

  it('emits a saved plan payload from the shell action', async () => {
    const wrapper = mountBuilder({
      draftKey: 'plan-1',
      initialPlan: {
        id: 'plan-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        name: '2026 Plan',
        planningYear: 2026
      }
    })

    await findButtonByText(wrapper, 'Save Plan').trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0]).toMatchObject({
      id: 'plan-1',
      name: '2026 Plan',
      planningYear: 2026
    })
  })
})
