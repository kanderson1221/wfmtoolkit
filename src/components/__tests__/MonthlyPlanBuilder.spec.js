import { mount } from '@vue/test-utils'

import MonthlyPlanBuilder from '../MonthlyPlanBuilder.vue'
import { createPlanDemandSource } from '../../planner/demandSources'
import { forecastingRepository } from '../../forecastingRepository'
import { plannerDraftRepository } from '../../plannerDraftRepository'
import { BrowserStorageError } from '../../storage/browserStorage'
import { clearLocalDataStore } from '../../storage/localDataStore'

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
  PlannerForecastPanel: {
    props: ['forecastWorkspaceHref', 'entryMode'],
    template: '<div data-test="planner-forecast-panel">planner-forecast {{ entryMode }} {{ forecastWorkspaceHref }}</div>'
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
  forecastWorkspaceHref: '#planning/center/center-1/group/group-1/forecasts/year/2026',
  startingHeadcount: 18,
  startingFrontlineHeadcount: 16
}

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => window.setTimeout(resolve, 0))
}

const mountedWrappers = []

const mountBuilder = async (props = {}) => {
  const wrapper = mount(MonthlyPlanBuilder, {
    props: {
      centerDefaults,
      ...props
    },
    global: {
      stubs: plannerStubs
    }
  })
  await flushPromises()
  mountedWrappers.push(wrapper)
  return wrapper
}

const findButtonByText = (wrapper, label) =>
  wrapper.findAll('button').find((button) => button.text().trim() === label)

describe('MonthlyPlanBuilder', () => {
  beforeEach(async () => {
    await clearLocalDataStore()
  })

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.restoreAllMocks()
  })

  it('opens new plans directly in the editor workflow', async () => {
    const wrapper = await mountBuilder({
      draftKey: 'new-plan',
      prefilledYear: 2026
    })

    expect(wrapper.text()).toContain('Plan Status')
    expect(wrapper.text()).toContain('Forecasts')
    expect(wrapper.text()).toContain('Random/Variability')
    expect(wrapper.text()).not.toContain('Variability Buffer')
    expect(wrapper.text()).toContain('Demand Model')
    expect(wrapper.text()).not.toContain('Required Headcount')
  })

  it('treats inherited defaults as pending review until the section is opened', async () => {
    const wrapper = await mountBuilder({
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

  it('shows only the import-focused forecast panel inside the plan workflow', async () => {
    const wrapper = await mountBuilder({
      draftKey: 'plan-1',
      initialPlan: {
        id: 'plan-1',
        name: 'Consumer Voice',
        planningYear: 2026
      }
    })

    expect(wrapper.find('[data-test="overview-panel"]').exists()).toBe(true)

    await wrapper.find('[data-section-id="forecast"]').trigger('click')

    expect(wrapper.find('[data-test="planner-forecast-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="planner-forecast-panel"]').text()).toContain('manual')
    expect(wrapper.find('[data-test="planner-forecast-panel"]').text()).toContain('#planning/center/center-1/group/group-1/forecasts/year/2026')
    expect(wrapper.find('[data-test="overview-panel"]').exists()).toBe(false)

    await wrapper.find('[data-section-id="availability"]').trigger('click')

    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(true)

    await wrapper.find('[data-section-id="staffing"]').trigger('click')

    expect(wrapper.find('[data-test="staffing-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(false)

    await wrapper.find('[data-section-id="actuals"]').trigger('click')

    expect(wrapper.find('[data-test="actuals-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="staffing-tab"]').exists()).toBe(false)
  })

  it('surfaces prior-year carry-in classes in the next-year staffing tab without copying them into the plan', async () => {
    const wrapper = await mountBuilder({
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

  it('uses the current center schedule when reopening a saved plan', async () => {
    const wrapper = await mountBuilder({
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

  it('seeds new plans from the workspace defaults when no saved plan exists', async () => {
    const wrapper = await mountBuilder({
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

  it('shows an in-app validation message instead of alerting when a duplicate plan year is saved', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const wrapper = await mountBuilder({
      draftKey: 'new-plan',
      prefilledYear: 2026,
      groupPlans: [
        {
          id: 'existing-2026-plan',
          planningYear: 2026,
          name: 'Existing 2026 Plan'
        }
      ]
    })

    await findButtonByText(wrapper, 'Save Plan').trigger('click')

    expect(alertSpy).not.toHaveBeenCalled()
    expect(wrapper.emitted('save')).toBeFalsy()
    expect(wrapper.text()).toContain('A 2026 plan already exists for Consumer Voice.')
  })

  it('moves autosave drafts into the active draft scope when the scope changes mid-edit', async () => {
    const persistDraftSpy = vi.spyOn(plannerDraftRepository, 'persistDraft').mockResolvedValue({
      autosavedAt: '2026-01-01T00:00:00.000Z'
    })
    const wrapper = await mountBuilder({
      draftKey: 'guest:plan:new',
      prefilledYear: 2026
    })

    await wrapper.setProps({
      draftKey: 'user-1:plan:new'
    })

    expect(persistDraftSpy).toHaveBeenCalledWith('user-1:plan:new', expect.any(Object))
  })

  it('shows an autosave error when the local draft cannot be persisted', async () => {
    vi.useFakeTimers()
    vi.spyOn(plannerDraftRepository, 'persistDraft').mockImplementation(async () => {
      throw new BrowserStorageError('Local storage is full.', {
        code: 'storage_quota_exceeded',
        storageKey: 'wfmtoolkit.monthlyPlanDrafts.v1'
      })
    })

    try {
      const wrapper = await mountBuilder({
        draftKey: 'new-plan',
        prefilledYear: 2026
      })

      await flushPromises()
      wrapper.vm.builder.planningYear = 2027
      await flushPromises()

      vi.advanceTimersByTime(701)
      await flushPromises()

      expect(wrapper.text()).toContain('Autosave is unavailable.')
      expect(wrapper.text()).toContain('out of local data storage space')
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps unsaved draft business days aligned to current center holidays', async () => {
    await plannerDraftRepository.persistDraft('new-plan', {
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
    mountedWrappers.push(wrapper)

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

  it('keeps saved plan business days aligned to current center holidays', async () => {
    const wrapper = mount(MonthlyPlanBuilder, {
      props: {
        centerDefaults,
        draftKey: 'plan-1',
        initialPlan: {
          id: 'plan-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          name: '2026 Plan',
          planningYear: 2026,
          holidayCalendarId: 'none',
          customHolidays: []
        }
      },
      global: {
        stubs: {
          ...plannerStubs,
          PlannerMonthlyPlanTab: plannerBusinessDayStub
        }
      }
    })
    mountedWrappers.push(wrapper)

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

  it('applies a saved forecast into plan contacts and persists the forecast source on save', async () => {
    const forecastProjects = [
      {
        id: 'forecast-1',
        name: '2026 Demand Forecast',
        lastRun: {
          runAt: '2026-01-10T12:00:00.000Z',
          monthlyRollup: [
            {
              monthStart: '2026-01-01',
              monthLabel: 'Jan 2026',
              contacts: 14000,
              lowerBoundContacts: 13200,
              upperBoundContacts: 14800
            },
            {
              monthStart: '2026-02-01',
              monthLabel: 'Feb 2026',
              contacts: 15500,
              lowerBoundContacts: 14900,
              upperBoundContacts: 16200
            }
          ],
          components: {},
          diagnostics: {},
          summary: {
            forecastDateRange: '2026-01-01 to 2026-02-28'
          }
        }
      }
    ]

    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: forecastProjects,
      error: null
    })

    const wrapper = mount(MonthlyPlanBuilder, {
      props: {
        centerDefaults,
        draftKey: 'planner-forecast-demand',
        prefilledYear: 2026,
        storageScope: 'planner-forecast-save-spec',
        initialPlan: {
          id: 'planner-forecast-demand',
          name: '2026 Plan',
          planningYear: 2026,
          demandSource: createPlanDemandSource(),
          planMonths: Array.from({ length: 12 }, () => ({
            contacts: 0,
            ahtSeconds: 300,
            peakDayUpliftPercent: 0
          }))
        }
      },
      global: {
        stubs: {
          PlannerOverviewPanel: plannerStubs.PlannerOverviewPanel,
          PlannerPresenceTab: plannerStubs.PlannerPresenceTab,
          PlannerRandomTab: plannerStubs.PlannerRandomTab,
          PlannerStaffingPlanTab: plannerStubs.PlannerStaffingPlanTab,
          PlannerActualsPanel: plannerStubs.PlannerActualsPanel
        }
      }
    })
    mountedWrappers.push(wrapper)

    await flushPromises()
    await wrapper.find('[data-section-id="requirement"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.builder.forecastSelectOptions.some((option) => option.value === 'forecast-1')).toBe(true)

    wrapper.vm.builder.setDemandSourceMode('forecast')
    wrapper.vm.builder.selectedForecastProjectId = 'forecast-1'
    await flushPromises()

    wrapper.vm.builder.applyForecastToDemand()
    await flushPromises()

    await findButtonByText(wrapper, 'Save Plan').trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0]).toMatchObject({
      demandSource: {
        mode: 'forecast',
        forecastProjectId: 'forecast-1',
        forecastProjectName: '2026 Demand Forecast'
      }
    })
    expect(wrapper.emitted('save')[0][0].planMonths[0]).toMatchObject({
      contacts: 14000
    })
    expect(wrapper.emitted('save')[0][0].planMonths[1]).toMatchObject({
      contacts: 15500
    })
  })
})
