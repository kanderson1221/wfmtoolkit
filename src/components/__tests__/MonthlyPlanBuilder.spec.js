import { mount } from '@vue/test-utils'

import MonthlyPlanBuilder from '../MonthlyPlanBuilder.vue'
import { createPlanDemandSource } from '../../planner/demandSources'
import { forecastingRepository } from '../../forecastingRepository'
import { plannerDraftRepository } from '../../plannerDraftRepository'
import { BrowserStorageError } from '../../storage/browserStorage'
import { clearLocalDataStore } from '../../storage/localDataStore'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../plannerModel'
import { PLAN_TYPE_BUDGET, PLAN_TYPE_UPDATE } from '../../planningStorage'

const plannerStubs = {
  PlannerForecastPanel: {
    props: ['hasLegacyManualDemandSource', 'currentDemandSourceSummary'],
    template: '<div data-test="planner-forecast-panel">planner-forecast {{ hasLegacyManualDemandSource ? "legacy" : "saved" }}</div>'
  },
  PlannerPresenceTab: {
    template: '<div data-test="presence-tab">presence</div>'
  },
  PlannerRandomTab: {
    props: ['requirementMethod'],
    template: '<div data-test="random-tab">{{ requirementMethod }}</div>'
  },
  PlannerMonthlyPlanTab: {
    props: ['requirementMethod'],
    template: '<div data-test="plan-tab">{{ requirementMethod }}</div>'
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

const clonePlain = (value) => JSON.parse(JSON.stringify(value))

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

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

const mountedWrappers = []
let plannerDraftStore = new Map()

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
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await flushPromises()

    if (
      wrapper.find('[data-test="presence-tab"]').exists() ||
      wrapper.find('[data-test="planner-forecast-panel"]').exists() ||
      wrapper.find('[data-test="random-tab"]').exists() ||
      wrapper.find('[data-test="plan-tab"]').exists()
    ) {
      break
    }
  }
  mountedWrappers.push(wrapper)
  return wrapper
}

const findButtonByText = (wrapper, label) =>
  wrapper.findAll('button').find((button) => button.text().trim() === label)

describe('MonthlyPlanBuilder', () => {
  beforeEach(async () => {
    await clearLocalDataStore()
    plannerDraftStore = new Map()
    vi.spyOn(plannerDraftRepository, 'loadDraft').mockImplementation(async (draftKey) => {
      const draft = plannerDraftStore.get(String(draftKey || 'new'))
      return draft ? clonePlain(draft) : null
    })
    vi.spyOn(plannerDraftRepository, 'persistDraft').mockImplementation(async (draftKey, draftValue) => {
      const nextDraft = {
        ...clonePlain(draftValue),
        autosavedAt: new Date().toISOString()
      }
      plannerDraftStore.set(String(draftKey || 'new'), nextDraft)
      return clonePlain(nextDraft)
    })
    vi.spyOn(plannerDraftRepository, 'clearDraft').mockImplementation(async (draftKey) => {
      plannerDraftStore.delete(String(draftKey || 'new'))
    })
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

    expect(wrapper.find('[data-test="planner-forecast-panel"]').exists()).toBe(true)
    expect(wrapper.vm.builder.activeSection).toBe('forecast')
    expect(wrapper.vm.builder.demandSource.mode).toBe('manual')
    expect(wrapper.vm.builder.demandSourceSummary).toBeNull()
    expect(wrapper.vm.builder.selectedForecastProjectId).toBe('')
    expect(wrapper.get('[data-section-id="forecast"]').text()).toContain('Forecasts')
    expect(wrapper.get('[data-section-id="variability"]').text()).toContain('Random/Variability')
    expect(wrapper.get('[data-section-id="requirement"]').text()).toContain('Demand Model')
  })

  it('orders the planner nav with forecasts first under the plan section', async () => {
    const wrapper = await mountBuilder({
      draftKey: 'new-plan',
      prefilledYear: 2026
    })

    expect(
      wrapper.findAll('[data-nav-group-label]').map((node) => node.text())
    ).toEqual(['Plan', 'Actuals'])

    expect(
      wrapper.findAll('[data-section-id]').map((node) => node.attributes('data-section-id'))
    ).toEqual(['forecast', 'availability', 'variability', 'requirement', 'staffing', 'actuals'])
  })

  it('starts a fresh new intraday Erlang plan even when a scoped draft exists', async () => {
    plannerDraftStore.set('user-1:group-1:plan:new:2026:intraday_erlang', {
      plan: {
        planningYear: 2026,
        requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
        demandSource: createPlanDemandSource({
          mode: 'forecast',
          forecastProjectId: 'forecast-1',
          forecastProjectName: 'SG1 2025 Budget Forecast 2'
        })
      },
      ui: {
        activeSection: 'requirement',
        selectedForecastProjectId: 'forecast-1'
      }
    })

    const loadDraftSpy = vi.spyOn(plannerDraftRepository, 'loadDraft')
    const wrapper = await mountBuilder({
      draftKey: 'user-1:group-1:plan:new:2026:intraday_erlang',
      prefilledYear: 2026,
      centerDefaults: {
        ...centerDefaults,
        requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
      }
    })

    expect(loadDraftSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="planner-forecast-panel"]').exists()).toBe(true)
    expect(wrapper.vm.builder.activeSection).toBe('forecast')
    expect(wrapper.vm.builder.demandSource.mode).toBe('manual')
    expect(wrapper.vm.builder.demandSourceSummary).toBeNull()
    expect(wrapper.vm.builder.selectedForecastProjectId).toBe('')
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

    expect(wrapper.find('[data-test="planner-forecast-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="planner-forecast-panel"]').text()).toContain('legacy')

    await wrapper.find('[data-section-id="availability"]').trigger('click')

    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(true)

    await wrapper.find('[data-section-id="staffing"]').trigger('click')

    expect(wrapper.find('[data-test="staffing-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="presence-tab"]').exists()).toBe(false)

    await wrapper.find('[data-section-id="actuals"]').trigger('click')

    expect(wrapper.find('[data-test="actuals-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="staffing-tab"]').exists()).toBe(false)
  })

  it('opens saved Budget plans read-only and blocks saving', async () => {
    const wrapper = await mountBuilder({
      initialPlan: {
        id: 'budget-2026',
        name: '2026 Budget',
        planType: PLAN_TYPE_BUDGET,
        planningYear: 2026,
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    })

    expect(wrapper.text()).toContain('Budget plan is locked. Create an updated plan to change future assumptions.')
    expect(findButtonByText(wrapper, 'Save Plan')).toBeUndefined()
    expect(wrapper.findAll('a').some((link) => link.text().trim() === 'Create Updated Plan')).toBe(true)
    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()

    await wrapper.vm.builder.savePlan()

    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('saves update drafts as current update versions with budget metadata', async () => {
    const wrapper = await mountBuilder({
      initialPlan: {
        id: null,
        name: '2026 Apr Update',
        planType: PLAN_TYPE_UPDATE,
        isCurrent: true,
        planningYear: 2026,
        sourcePlanId: 'budget-2026',
        budgetPlanId: 'budget-2026',
        actualsThroughMonth: '2026-03-01',
        actualizedAt: '2026-04-01T12:00:00.000Z'
      },
      groupPlans: [
        {
          id: 'budget-2026',
          name: '2026 Budget',
          planType: PLAN_TYPE_BUDGET,
          planningYear: 2026
        }
      ]
    })

    await findButtonByText(wrapper, 'Save Plan').trigger('click')

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      id: null,
      name: '2026 Apr Update',
      planType: PLAN_TYPE_UPDATE,
      isCurrent: true,
      planningYear: 2026,
      sourcePlanId: 'budget-2026',
      budgetPlanId: 'budget-2026',
      actualsThroughMonth: '2026-03-01',
      actualizedAt: '2026-04-01T12:00:00.000Z'
    })
  })

  it('starts new plans in the intraday Erlang shell when that requirement method is seeded', async () => {
    const wrapper = await mountBuilder({
      draftKey: 'new-erlang-plan',
      prefilledYear: 2026,
      centerDefaults: {
        ...centerDefaults,
        requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
      }
    })

    expect(wrapper.get('[data-section-id="variability"]').text()).toContain('Erlang Inputs')
    expect(wrapper.get('[data-section-id="requirement"]').text()).toContain('Demand Model')

    await wrapper.find('[data-section-id="variability"]').trigger('click')
    expect(wrapper.find('[data-test="random-tab"]').text()).toContain(PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG)

    await wrapper.find('[data-section-id="requirement"]').trigger('click')
    expect(wrapper.find('[data-test="plan-tab"]').text()).toContain(PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG)

    await findButtonByText(wrapper, 'Save Plan').trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0]).toMatchObject({
      requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
      summary: {
        requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
      }
    })
  })

  it('keeps workload-ratio new plans on the original planner workflow even when an Erlang draft exists for the same year', async () => {
    await plannerDraftRepository.persistDraft('user-1:group-1:plan:new:2026:intraday_erlang', {
      plan: {
        planningYear: 2026,
        requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
      },
      ui: {
        activeSection: 'variability'
      }
    })

    const wrapper = await mountBuilder({
      draftKey: 'user-1:group-1:plan:new:2026:workload_ratio',
      prefilledYear: 2026
    })

    expect(wrapper.get('[data-section-id="variability"]').text()).toContain('Random/Variability')
    expect(wrapper.get('[data-section-id="requirement"]').text()).toContain('Demand Model')
    expect(wrapper.get('[data-section-id="variability"]').text()).not.toContain('Erlang Inputs')
    expect(wrapper.get('[data-section-id="requirement"]').text()).not.toContain('Intraday')
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
        planType: PLAN_TYPE_UPDATE,
        budgetPlanId: 'budget-2026',
        sourcePlanId: 'budget-2026',
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
      name: '2026 Budget',
      planType: PLAN_TYPE_BUDGET,
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
    expect(wrapper.text()).toContain('A 2026 Budget already exists for Consumer Voice.')
  })

  it('waits for a real autosave event before persisting into a new draft scope', async () => {
    vi.useFakeTimers()
    const persistDraftSpy = vi.spyOn(plannerDraftRepository, 'persistDraft').mockResolvedValue({
      autosavedAt: '2026-01-01T00:00:00.000Z'
    })

    try {
      const wrapper = await mountBuilder({
        draftKey: 'guest:plan:new',
        prefilledYear: 2026
      })

      persistDraftSpy.mockClear()

      await wrapper.setProps({
        draftKey: 'user-1:plan:new'
      })
      await flushPromises()

      expect(persistDraftSpy).not.toHaveBeenCalled()

      wrapper.vm.builder.planningYear = 2027
      await flushPromises()
      await vi.advanceTimersByTimeAsync(701)
      await flushPromises()

      expect(persistDraftSpy).toHaveBeenCalledWith('user-1:plan:new', expect.any(Object))
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not hydrate a generic draft bucket when a new plan has no scoped draft key yet', async () => {
    const loadDraftSpy = vi.spyOn(plannerDraftRepository, 'loadDraft')
    plannerDraftStore.set('new', {
      plan: {
        planningYear: 2026,
        demandSource: createPlanDemandSource({
          mode: 'forecast',
          forecastProjectId: 'forecast-1',
          forecastProjectName: 'Leaked Forecast'
        })
      },
      ui: {
        selectedForecastProjectId: 'forecast-1'
      },
      autosavedAt: '2026-01-01T00:00:00.000Z'
    })

    const wrapper = await mountBuilder({
      draftKey: '',
      prefilledYear: 2026
    })

    expect(loadDraftSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="planner-forecast-panel"]').exists()).toBe(true)
  })

  it('clears the scoped new-plan draft before emitting save for a new intraday Erlang plan', async () => {
    let resolveClearDraft
    const clearDraftSpy = vi.spyOn(plannerDraftRepository, 'clearDraft').mockImplementation(
      async () => new Promise((resolve) => {
        resolveClearDraft = resolve
      })
    )

    const wrapper = await mountBuilder({
      draftKey: 'user-1:group-1:plan:new:2026:intraday_erlang',
      prefilledYear: 2026,
      centerDefaults: {
        ...centerDefaults,
        requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG
      }
    })

    const savePromise = wrapper.vm.builder.savePlan()
    await flushPromises()

    expect(clearDraftSpy).toHaveBeenCalledWith('user-1:group-1:plan:new:2026:intraday_erlang')
    expect(wrapper.emitted('save')).toBeFalsy()

    resolveClearDraft()
    await savePromise

    expect(wrapper.emitted('save')).toBeTruthy()
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

    await flushPromises()
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

    await flushPromises()
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
        planningYear: 2026,
        forecastType: 'budget',
        planningContext: {
          groupId: 'group-1',
          planningYear: 2026
        },
        lastRun: {
          runAt: '2026-01-10T12:00:00.000Z',
          monthlyRollup: [
            {
              monthStart: '2026-01-01',
              monthLabel: 'Jan 2026',
              contacts: 14000,
              averageDailyVolume: 700,
              peakDailyVolume: 910,
              lowerBoundContacts: 13200,
              upperBoundContacts: 14800
            },
            {
              monthStart: '2026-02-01',
              monthLabel: 'Feb 2026',
              contacts: 15500,
              averageDailyVolume: 775,
              peakDailyVolume: 930,
              lowerBoundContacts: 14900,
              upperBoundContacts: 16200
            },
            ...Array.from({ length: 10 }, (_, index) => {
              const monthNumber = index + 3
              const monthStart = `2026-${String(monthNumber).padStart(2, '0')}-01`
              const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${monthStart}T00:00:00Z`))

              return {
                monthStart,
                monthLabel,
                contacts: 16000 + (index * 100),
                averageDailyVolume: 800 + (index * 5),
                peakDailyVolume: 960 + (index * 5),
                lowerBoundContacts: 15400 + (index * 100),
                upperBoundContacts: 16600 + (index * 100)
              }
            })
          ],
          components: {},
          diagnostics: {},
          summary: {
            forecastDateRange: '2026-01-01 to 2026-12-31'
          }
        }
      },
      {
        id: 'forecast-2',
        name: '2026 Incomplete Forecast',
        planningYear: 2026,
        forecastType: 'budget',
        lastRun: {
          runAt: '2026-04-10T12:00:00.000Z',
          monthlyRollup: [
            {
              monthStart: '2026-04-01',
              monthLabel: 'Apr 2026',
              contacts: 18000,
              averageDailyVolume: 900,
              peakDailyVolume: 1100,
              lowerBoundContacts: 17100,
              upperBoundContacts: 18900
            }
          ],
          components: {},
          diagnostics: {},
          summary: {
            forecastDateRange: '2026-04-01 to 2026-04-30'
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
          planType: PLAN_TYPE_UPDATE,
          budgetPlanId: 'budget-2026',
          sourcePlanId: 'budget-2026',
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
          PlannerForecastPanel: plannerStubs.PlannerForecastPanel,
          PlannerPresenceTab: plannerStubs.PlannerPresenceTab,
          PlannerRandomTab: plannerStubs.PlannerRandomTab,
          PlannerMonthlyPlanTab: plannerStubs.PlannerMonthlyPlanTab,
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
    expect(wrapper.vm.builder.forecastSelectOptions.some((option) => option.value === 'forecast-2')).toBe(false)
    expect(wrapper.vm.builder.selectedForecastProjectId).toBe('')

    wrapper.vm.builder.selectedForecastProjectId = 'forecast-1'
    await flushPromises()

    expect(wrapper.vm.builder.applyForecastToDemand()).toBe(true)
    await flushPromises()

    expect(wrapper.vm.builder.forecastApplyMessage).toContain('Applied 2026 Demand Forecast')

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
      contacts: 14000,
      peakDayUpliftPercent: 30
    })
    expect(wrapper.emitted('save')[0][0].planMonths[1]).toMatchObject({
      contacts: 15500,
      peakDayUpliftPercent: 20
    })
  })

  it('keeps a single eligible saved forecast unselected until the user explicitly picks it', async () => {
    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: [
        {
          id: 'forecast-1',
          name: '2026 Demand Forecast',
          planningYear: 2026,
          forecastType: 'budget',
          planningContext: {
            groupId: 'group-1',
            planningYear: 2026
          },
          lastRun: {
            runAt: '2026-01-10T12:00:00.000Z',
            monthlyRollup: [
              {
                monthStart: '2026-01-01',
                monthLabel: 'Jan 2026',
                contacts: 14000,
                averageDailyVolume: 700,
                peakDailyVolume: 910,
                lowerBoundContacts: 13200,
                upperBoundContacts: 14800
              },
              ...Array.from({ length: 11 }, (_, index) => {
                const monthNumber = index + 2
                const monthStart = `2026-${String(monthNumber).padStart(2, '0')}-01`
                const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${monthStart}T00:00:00Z`))

                return {
                  monthStart,
                  monthLabel,
                  contacts: 14500 + (index * 100),
                  averageDailyVolume: 720 + (index * 5),
                  peakDailyVolume: 930 + (index * 5),
                  lowerBoundContacts: 13700 + (index * 100),
                  upperBoundContacts: 15300 + (index * 100)
                }
              })
            ],
            components: {},
            diagnostics: {},
            summary: {
              forecastDateRange: '2026-01-01 to 2026-12-31'
            }
          }
        }
      ],
      error: null
    })

    const wrapper = await mountBuilder({
      draftKey: 'single-forecast-plan',
      prefilledYear: 2026,
      storageScope: 'single-forecast-plan-spec'
    })

    await wrapper.find('[data-section-id="forecast"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.builder.forecastSelectOptions.some((option) => option.value === 'forecast-1')).toBe(true)
    expect(wrapper.vm.builder.selectedForecastProjectId).toBe('')
    expect(wrapper.vm.builder.forecastCanApply).toBe(false)
  })

  it('reselects the applied forecast when reopening a saved forecast-sourced plan', async () => {
    const monthlyRollup = Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1
      const monthStart = `2026-${String(monthNumber).padStart(2, '0')}-01`
      const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${monthStart}T00:00:00Z`))

      return {
        monthStart,
        monthLabel,
        contacts: 14000 + (index * 100),
        averageDailyVolume: 700 + (index * 5),
        peakDailyVolume: 900 + (index * 5),
        lowerBoundContacts: 13200 + (index * 100),
        upperBoundContacts: 14800 + (index * 100)
      }
    })

    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: [
        {
          id: 'forecast-1',
          name: '2026 Demand Forecast',
          planningYear: 2026,
          forecastType: 'budget',
          planningContext: {
            groupId: 'group-1',
            planningYear: 2026
          },
          lastRun: {
            runAt: '2026-01-10T12:00:00.000Z',
            monthlyRollup,
            components: {},
            diagnostics: {},
            summary: {
              forecastDateRange: '2026-01-01 to 2026-12-31'
            }
          }
        }
      ],
      error: null
    })

    const wrapper = await mountBuilder({
      draftKey: 'saved-forecast-plan',
      prefilledYear: 2026,
      storageScope: 'saved-forecast-plan-spec',
      initialPlan: {
        id: 'saved-forecast-plan',
        name: '2026 Plan',
        planType: PLAN_TYPE_UPDATE,
        budgetPlanId: 'budget-2026',
        sourcePlanId: 'budget-2026',
        planningYear: 2026,
        demandSource: createPlanDemandSource({
          mode: 'forecast',
          forecastProjectId: 'forecast-1',
          forecastProjectName: '2026 Demand Forecast',
          importedAt: '2026-02-01T12:00:00.000Z',
          forecastMonthSnapshot: monthlyRollup.map((row, index) => ({
            monthIndex: index,
            monthLabel: row.monthLabel,
            monthStart: row.monthStart,
            contacts: row.contacts
          }))
        })
      }
    })

    await wrapper.find('[data-section-id="forecast"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.builder.forecastSelectOptions.some((option) => option.value === 'forecast-1')).toBe(true)
    expect(wrapper.vm.builder.selectedForecastProjectId).toBe('forecast-1')
    expect(wrapper.vm.builder.forecastCanApply).toBe(true)

    expect(wrapper.vm.builder.applyForecastToDemand()).toBe(true)
    expect(wrapper.vm.builder.forecastApplyMessage).toContain('Reapplied 2026 Demand Forecast')
  })

  it('shows a subtle warning when the plan references a deleted forecast source', async () => {
    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: [],
      error: null
    })

    const wrapper = await mountBuilder({
      draftKey: 'deleted-forecast-plan',
      prefilledYear: 2026,
      storageScope: 'deleted-forecast-plan-spec',
      initialPlan: {
        id: 'deleted-forecast-plan',
        name: '2026 Plan',
        planningYear: 2026,
        demandSource: createPlanDemandSource({
          mode: 'forecast',
          forecastProjectId: 'forecast-deleted',
          forecastProjectName: 'Deleted Staffing Forecast',
          importedAt: '2026-04-12T15:00:00.000Z',
          forecastMonthSnapshot: [
            {
              monthIndex: 0,
              monthLabel: 'Jan 2026',
              monthStart: '2026-01-01',
              contacts: 14000
            }
          ]
        })
      }
    })

    await wrapper.find('[data-section-id="forecast"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.builder.demandSourceSummary).toMatchObject({
      sourceMissing: true,
      projectName: 'Deleted Staffing Forecast'
    })
  })
})
