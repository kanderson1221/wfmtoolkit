import { mount } from '@vue/test-utils'

import MonthlyPlanBuilder from '../MonthlyPlanBuilder.vue'
import { plannerDraftRepository } from '../../plannerDraftRepository'

const plannerStubs = {
  PlannerOverviewPanel: {
    props: ['sectionCards', 'nextRecommendation'],
    template: `
      <div data-test="overview-panel">
        <div data-test="next-recommendation">{{ nextRecommendation?.title || '' }}</div>
        <div
          v-for="card in sectionCards"
          :key="card.id"
          :data-card-id="card.id"
        >
          {{ card.statusLabel }}
        </div>
      </div>
    `
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
  },
  PlannerActualsPanel: {
    template: '<div data-test="actuals-tab">actuals</div>'
  }
}

const centerDefaults = {
  centerId: 'center-1',
  groupId: 'group-1',
  groupName: 'Consumer Voice',
  operatingWeekdays: [1, 2, 3, 4, 5],
  defaultHolidayCalendarId: 'us_federal',
  disabledHolidayRuleIds: [],
  customHolidays: [
    {
      id: 'new-years-day',
      label: "New Year's Day",
      date: '2026-01-01'
    }
  ],
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

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens new plans directly in the editor workflow', () => {
    const wrapper = mountBuilder({
      draftKey: 'new-plan',
      prefilledYear: 2026
    })

    expect(wrapper.text()).toContain('Plan Status')
  })

  it('treats inherited defaults as pending review until the section is opened', async () => {
    const wrapper = mountBuilder({
      draftKey: 'new-plan',
      prefilledYear: 2026
    })

    expect(wrapper.find('[data-test="next-recommendation"]').text()).toBe('Agent Availability')
    expect(wrapper.find('[data-card-id="availability"]').text()).toBe('Using defaults')
    expect(wrapper.find('[data-card-id="variability"]').text()).toBe('Using defaults')

    await wrapper.find('[data-section-id="availability"]').trigger('click')
    await wrapper.find('[data-section-id="overview"]').trigger('click')

    expect(wrapper.find('[data-card-id="availability"]').text()).toBe('12/12 months')
  })

  it('switches between overview, direct forecast steps, staffing plan, and actuals', async () => {
    const wrapper = mountBuilder({
      draftKey: 'plan-1',
      initialPlan: {
        id: 'plan-1',
        name: 'Consumer Voice',
        planningYear: 2026
      }
    })

    expect(wrapper.find('[data-test="overview-panel"]').exists()).toBe(true)

    await wrapper.find('[data-section-id="availability"]').trigger('click')

    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overview-panel"]').exists()).toBe(false)

    await wrapper.find('[data-section-id="staffing"]').trigger('click')

    expect(wrapper.find('[data-test="staffing-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(false)

    await wrapper.find('[data-section-id="actuals"]').trigger('click')

    expect(wrapper.find('[data-test="actuals-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="staffing-tab"]').exists()).toBe(false)
  })

  it('emits a saved plan payload from the shell action', async () => {
    const wrapper = mountBuilder({
      draftKey: 'plan-1',
      initialPlan: {
        id: 'plan-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        name: '2026 Plan',
        planningYear: 2026,
        operatingWeekdays: [1],
        holidayCalendarId: 'none',
        customHolidays: []
      }
    })

    await findButtonByText(wrapper, 'Save Plan').trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0]).toMatchObject({
      id: 'plan-1',
      name: '2026 Plan',
      planningYear: 2026,
      operatingWeekdays: [1, 2, 3, 4, 5],
      holidayCalendarId: 'us_federal',
      customHolidays: [
        {
          id: 'new-years-day',
          label: "New Year's Day",
          date: '2026-01-01'
        }
      ]
    })
  })

  it('moves autosave drafts into the active draft scope when the scope changes mid-edit', async () => {
    const persistDraftSpy = vi.spyOn(plannerDraftRepository, 'persistDraft').mockReturnValue({
      autosavedAt: '2026-01-01T00:00:00.000Z'
    })
    const wrapper = mountBuilder({
      draftKey: 'guest:plan:new',
      prefilledYear: 2026
    })

    await wrapper.setProps({
      draftKey: 'user-1:plan:new'
    })

    expect(persistDraftSpy).toHaveBeenCalledWith('user-1:plan:new', expect.any(Object))
  })
})
