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
    props: ['inheritedTrainingClasses', 'startingPositionInherited', 'startingPositionInheritedFromYear'],
    template: '<div data-test="staffing-tab">staffing {{ inheritedTrainingClasses.length }}|{{ startingPositionInherited ? startingPositionInheritedFromYear : "editable" }}</div>'
  },
  PlannerActualsPanel: {
    template: '<div data-test="actuals-tab">actuals</div>'
  }
}

const plannerBusinessDayStub = {
  props: ['monthlyRecords'],
  template: '<div data-test="plan-tab">{{ monthlyRecords[0]?.openDays ?? 0 }}</div>'
}

const centerDefaults = {
  centerId: 'center-1',
  groupId: 'group-1',
  groupName: 'Consumer Voice',
  planningYear: 2026,
  operatingWeekdays: [1, 2, 3, 4, 5],
  holidayCalendarId: 'us_federal',
  disabledHolidayRuleIds: [],
  customHolidays: [
    {
      id: 'new-years-day',
      label: "New Year's Day",
      date: '2026-01-01'
    }
  ],
  presenceMonths: Array.from({ length: 12 }, () => ({ paidHoursPerDay: 8 })),
  randomDefaults: {
    occupancyPercent: 90,
    adherencePercent: 95
  },
  startingHeadcount: 18,
  startingFrontlineHeadcount: 16
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

  it('surfaces prior-year carry-in classes in the next-year staffing tab without copying them into the plan', async () => {
    const wrapper = mountBuilder({
      draftKey: 'plan-2027',
      initialPlan: {
        id: 'plan-2027',
        name: '2027 Plan',
        planningYear: 2027
      },
      groupPlans: [
        {
          id: 'plan-2026',
          name: '2026 Plan',
          planningYear: 2026,
          trainingSettings: {
            trainingDurationWorkdays: 10,
            postTrainingNestingDays: 5,
            graduationYieldPercent: 90
          },
          trainingClasses: [
            {
              id: 'carry-in-1',
              hireDate: '2026-12-18',
              hireCount: 20,
              graduationDate: '2027-01-05',
              frontlineReadyDate: '2027-01-12',
              graduatingHeadcount: 20,
              projectedGraduatingHeadcount: 18,
              trainingFalloutHeadcount: 2
            }
          ]
        }
      ]
    })

    await wrapper.find('[data-section-id="staffing"]').trigger('click')

    expect(wrapper.find('[data-test="staffing-tab"]').text()).toContain('1|2026')
  })

  it('preserves saved plan values instead of re-defaulting them from the workspace seed', async () => {
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
      operatingWeekdays: [1],
      holidayCalendarId: 'none',
      customHolidays: []
    })
  })

  it('seeds new plans from the workspace defaults when no saved plan exists', async () => {
    const wrapper = mountBuilder({
      draftKey: 'new-plan',
      prefilledYear: 2026
    })

    await findButtonByText(wrapper, 'Save Plan').trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0]).toMatchObject({
      id: null,
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
      ],
      startingHeadcount: 18,
      startingFrontlineHeadcount: 16
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

  it('keeps unsaved draft business days aligned to current center holidays', async () => {
    plannerDraftRepository.persistDraft('new-plan', {
      plan: {
        planningYear: 2026,
        operatingWeekdays: [1, 2, 3, 4, 5],
        holidayCalendarId: 'none',
        disabledHolidayRuleIds: [],
        customHolidays: []
      },
      ui: {}
    })

    const wrapper = mount(MonthlyPlanBuilder, {
      props: {
        centerDefaults,
        draftKey: 'new-plan',
        prefilledYear: 2026
      },
      global: {
        stubs: {
          ...plannerStubs,
          PlannerMonthlyPlanTab: plannerBusinessDayStub
        }
      }
    })

    await wrapper.find('[data-section-id="requirement"]').trigger('click')

    expect(wrapper.get('[data-test="plan-tab"]').text()).toBe('21')

    await wrapper.setProps({
      centerDefaults: {
        ...centerDefaults,
        customHolidays: [
          ...centerDefaults.customHolidays,
          {
            id: 'company-closure',
            label: 'Company Closure',
            date: '2026-01-02'
          }
        ]
      }
    })

    expect(wrapper.get('[data-test="plan-tab"]').text()).toBe('20')
  })
})
