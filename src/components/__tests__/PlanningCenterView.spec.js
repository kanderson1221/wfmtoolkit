import { mount } from '@vue/test-utils'

import PlanningCenterView from '../planning/PlanningCenterView.vue'
import { buildForecastStorageScope, forecastingRepository } from '../../forecastingRepository'
import { buildPlanningGroupForecastsHash, buildPlanningGroupNewForecastHash } from '../../appRoutes'
import { createForecastProject } from '../../forecasting/shared'
import { clearLocalDataStore } from '../../storage/localDataStore'

const AppButtonStub = {
  name: 'AppButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)"><slot /></button>'
}

const AppPanelStub = {
  name: 'AppPanel',
  template: '<section><slot /></section>'
}

const AppStatusMessageStub = {
  name: 'AppStatusMessage',
  template: '<div><slot /></div>'
}

const AppMenuStub = {
  name: 'AppMenu',
  props: ['items', 'triggerLabel'],
  emits: ['select'],
  template: `
    <div>
      <button :aria-label="triggerLabel">Menu</button>
      <button
        v-for="item in items"
        :key="item.id"
        @click="$emit('select', item)"
      >
        {{ item.label }}
      </button>
    </div>
  `
}

const AppConfirmDialogStub = {
  name: 'AppConfirmDialog',
  props: ['visible', 'title', 'description', 'confirmLabel'],
  emits: ['confirm', 'update:visible'],
  methods: {
    handleConfirm() {
      this.$emit('confirm')
      this.$emit('update:visible', false)
    }
  },
  template: `
    <div v-if="visible">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <button @click="handleConfirm">
        {{ confirmLabel }}
      </button>
    </div>
  `
}

const PlanningForecastCreateModalStub = {
  name: 'PlanningForecastCreateModal',
  props: [
    'planningYear',
    'yearOptions',
    'canCreate'
  ],
  emits: ['cancel', 'create', 'update:planningYear'],
  template: `
    <div>
      <p>New Forecast</p>
      <p>Plan Year: {{ planningYear || 'empty' }}</p>
      <button @click="$emit('update:planningYear', 2027)">Set Year</button>
      <button @click="$emit('create')">Create Forecast</button>
    </div>
  `
}

const buildActualsRows = (count = 21, startDay = 1) =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(2025, 0, startDay + index, 12)
    const serviceDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-')

    return {
      serviceDate,
      contacts: 900 + index,
      ahtSeconds: 280 + (index % 10)
    }
  })

const buildWrapper = (props = {}) =>
  mount(PlanningCenterView, {
    props: {
      center: {
        id: 'center-1',
        name: 'North America Support',
        operatingWeekdays: [1, 2, 3, 4, 5],
        operatingOpenTime: '08:00',
        operatingCloseTime: '18:00',
        groups: [
          {
            id: 'group-1',
            name: 'Voice Support',
            operatingWeekdays: [1, 2, 3, 4, 5],
            defaultPaidHoursPerDay: 8,
            defaultOccupancyPercent: 85,
            defaultAdherencePercent: 95,
            actuals: {
              sourceMode: 'daily_upload',
              dailyRows: buildActualsRows()
            },
            plans: [
              {
                id: 'plan-1',
                planningYear: 2026,
                summary: {
                  annualContacts: 180000,
                  annualRequiredStaffHours: 31200,
                  averageRequiredHeadcount: 18.4,
                  peakRequiredHeadcount: 24.9,
                  averagePresencePercent: 82.4,
                  averageUtilizationPercent: 88.6
                }
              }
            ]
          }
        ]
      },
      selectedGroupId: '',
      selectedYear: 2026,
      storageScope: 'default',
      weekdayOptions: [
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' }
      ],
      ...props
    },
    global: {
      stubs: {
        AppButton: AppButtonStub,
        AppBreadcrumbs: true,
        AppConfirmDialog: AppConfirmDialogStub,
        AppEmptyState: true,
        AppIcon: true,
        AppMenu: AppMenuStub,
        AppPanel: AppPanelStub,
        AppStatStrip: true,
        AppStatusMessage: AppStatusMessageStub,
        CallCenterSettingsModal: true,
        PlanningGroupSettingsModal: true,
        PlanningForecastCreateModal: PlanningForecastCreateModalStub,
        PlannerSettingsModal: true
      }
    }
  })

const findSpanByText = (wrapper, label) =>
  wrapper.findAll('span').find((node) => node.text().trim() === label)

const findHeadingByText = (wrapper, label) =>
  wrapper.findAll('h2').find((node) => node.text().trim() === label)

const openTab = async (wrapper, label) => {
  const tab = wrapper.findAll('button').find((node) => node.text().trim() === label)
  expect(tab).toBeTruthy()
  await tab.trigger('click')
}

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => window.setTimeout(resolve, 0))
}

const createDeferred = () => {
  let resolve
  let reject
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
}

describe('PlanningCenterView', () => {
  beforeEach(async () => {
    await clearLocalDataStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps annual-plan headers on a single line with dense headcount labels', async () => {
    const wrapper = buildWrapper()
    const plansTab = wrapper.findAll('button').find((node) => node.text().trim() === 'Plans')
    await plansTab.trigger('click')
    const peakHeader = findSpanByText(wrapper, 'Peak Req HC')
    const averageHeader = findSpanByText(wrapper, 'Avg Req HC')

    expect(peakHeader).toBeTruthy()
    expect(averageHeader).toBeTruthy()
    expect(peakHeader.attributes('title')).toBe('Peak Required Headcount')
    expect(peakHeader.classes()).toContain('whitespace-nowrap')
    expect(peakHeader.classes()).not.toContain('truncate')
    expect(averageHeader.attributes('title')).toBe('Average Required Headcount')
    expect(averageHeader.classes()).toContain('whitespace-nowrap')
    expect(averageHeader.classes()).not.toContain('truncate')
  })

  it('uses matching compact xl header heights for the group and plan panes', () => {
    const wrapper = buildWrapper()
    const staffingGroupsHeading = findHeadingByText(wrapper, 'Staffing Groups')
    const groupWorkspaceHeading = findHeadingByText(wrapper, 'Voice Support')
    const staffingGroupsHeader = staffingGroupsHeading.element.closest('.border-b')
    const groupWorkspaceHeader = groupWorkspaceHeading.element.closest('.border-b')

    expect(staffingGroupsHeader.className).toContain('xl:h-[6rem]')
    expect(groupWorkspaceHeader.className).toContain('xl:h-[6rem]')
  })

  it('shows the saved hours of operation in the group defaults summary', () => {
    const wrapper = buildWrapper()

    expect(wrapper.text()).toContain('Hours of Operation')
    expect(wrapper.text()).toContain('08:00 to 18:00')
  })

  it('shows data as the left-most staffing-group tab', async () => {
    const wrapper = buildWrapper()
    const tabButtons = wrapper
      .findAll('button')
      .map((node) => node.text().trim())
      .filter((label) => ['Data', 'Forecasts', 'Plans'].includes(label))

    expect(tabButtons).toEqual(['Data', 'Forecasts', 'Plans'])
    expect(wrapper.text()).toContain('Add Data')
    expect(wrapper.text()).not.toContain('New Forecast')
  })

  it('opens the staffing-group workspace on the requested route tab', async () => {
    const wrapper = buildWrapper({
      selectedGroupTab: 'forecasts'
    })

    expect(wrapper.text()).toContain('New Forecast')
    expect(wrapper.text()).not.toContain('Add Data')
  })

  it('opens a year-only create-forecast modal and routes new forecasts through shared history', async () => {
    window.location.hash = '#planning'

    const wrapper = buildWrapper()
    await openTab(wrapper, 'Forecasts')
    const newForecastButton = wrapper.findAll('button').find((node) => node.text().trim() === 'New Forecast')
    await newForecastButton.trigger('click')

    expect(wrapper.text()).toContain('New Forecast')
    expect(wrapper.text()).toContain('Plan Year: 2026')

    const setYearButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Set Year')
    const createForecastButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Create Forecast')

    await setYearButton.trigger('click')
    await createForecastButton.trigger('click')

    expect(window.location.hash).toBe(
      buildPlanningGroupNewForecastHash('center-1', 'group-1', 2027, { forecastType: 'budget' })
    )
  })

  it('shows a device-based error message when staffing-group forecasts cannot be read locally', async () => {
    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: [],
      error: new Error('blocked')
    })

    const wrapper = buildWrapper()
    const forecastTab = wrapper.findAll('button').find((node) => node.text().trim() === 'Forecasts')
    await forecastTab.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to read saved forecasts from this device.')
  })

  it('shows which saved plan is using a forecast on the staffing-group summary list', async () => {
    const forecastScope = buildForecastStorageScope('default', 'center-1', 'group-1')

    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: [
        createForecastProject({
          id: 'forecast-1',
          name: 'Voice Support 2026 Budget Forecast',
          centerId: 'center-1',
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planningYear: 2026,
            groupName: 'Voice Support'
          }
        })
      ],
      error: null
    })

    const wrapper = buildWrapper({
      center: {
        id: 'center-1',
        name: 'North America Support',
        operatingWeekdays: [1, 2, 3, 4, 5],
        operatingOpenTime: '08:00',
        operatingCloseTime: '18:00',
        groups: [
          {
            id: 'group-1',
            name: 'Voice Support',
            operatingWeekdays: [1, 2, 3, 4, 5],
            defaultPaidHoursPerDay: 8,
            defaultOccupancyPercent: 85,
            defaultAdherencePercent: 95,
            plans: [
              {
                id: 'plan-1',
                planningYear: 2026,
                demandSource: {
                  mode: 'forecast',
                  forecastProjectId: 'forecast-1'
                },
                summary: {
                  annualContacts: 180000,
                  annualRequiredStaffHours: 31200,
                  averageRequiredHeadcount: 18.4,
                  peakRequiredHeadcount: 24.9,
                  averagePresencePercent: 82.4,
                  averageUtilizationPercent: 88.6
                }
              }
            ]
          }
        ]
      }
    })

    await flushPromises()
    await flushPromises()
    await openTab(wrapper, 'Forecasts')

    expect(wrapper.text()).toContain('Used By')
    expect(wrapper.text()).toContain('2026 Plan')
    expect(wrapper.text()).not.toContain('Not used')
    expect(forecastingRepository.loadWorkspaceResult).toHaveBeenCalledWith(forecastScope)
  })

  it('lets forecast rows be selected and double-clicked to open the saved forecast workspace', async () => {
    const forecastScope = buildForecastStorageScope('default', 'center-1', 'group-1')

    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: [
        createForecastProject({
          id: 'forecast-1',
          name: 'Voice Support 2026 Budget Forecast',
          centerId: 'center-1',
          planningYear: 2026,
          forecastType: 'budget',
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planningYear: 2026,
            groupName: 'Voice Support'
          }
        })
      ],
      error: null
    })

    window.location.hash = '#planning/center/center-1/group/group-1/year/2026'

    const wrapper = buildWrapper()
    await flushPromises()
    await flushPromises()
    await openTab(wrapper, 'Forecasts')

    const forecastRow = wrapper.find('[aria-label="Select Budget Forecast for Voice Support"]')
    expect(forecastRow.exists()).toBe(true)

    await forecastRow.trigger('click')
    expect(forecastRow.classes()).toContain('bg-[#e7eef4]')

    await forecastRow.trigger('dblclick')

    expect(window.location.hash).toBe(
      buildPlanningGroupForecastsHash('center-1', 'group-1', 2026, 'forecast-1')
    )
    expect(forecastingRepository.loadWorkspaceResult).toHaveBeenCalledWith(forecastScope)
  })

  it('deletes a saved forecast from the selected staffing-group summary list', async () => {
    const forecastScope = buildForecastStorageScope('default', 'center-1', 'group-1')
    const centerFallbackScope = buildForecastStorageScope('default', 'center-1')
    let workspaceProjects = [
      createForecastProject({
        id: 'forecast-1',
        name: 'Voice Support 2026 Forecast',
        centerId: 'center-1',
        planningContext: {
          centerId: 'center-1',
          groupId: 'group-1',
          planningYear: 2026,
          groupName: 'Voice Support'
        },
        historyRows: [
          { ds: '2025-01-01', y: 100 }
        ],
        lastRun: {
          runAt: '2026-04-08T14:00:00.000Z',
          monthlyRollup: [
            { monthStart: '2026-01-01', monthLabel: 'Jan 2026', contacts: 3400, peakDailyVolume: 120 }
          ],
          summary: {
            projectedTotalContacts: 3400
          }
        }
      })
    ]
    let fallbackProjects = [
      createForecastProject({
        id: 'forecast-1',
        name: 'Voice Support 2026 Forecast',
        centerId: 'center-1',
        planningContext: {
          centerId: 'center-1',
          groupId: 'group-1',
          planningYear: 2026,
          groupName: 'Voice Support'
        }
      })
    ]

    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockImplementation(async (scope) => ({
      projects:
        String(scope) === forecastScope
          ? workspaceProjects
          : String(scope) === centerFallbackScope
            ? fallbackProjects
            : [],
      error: null
    }))
    vi.spyOn(forecastingRepository, 'loadWorkspace').mockImplementation(async (scope) =>
      String(scope) === forecastScope
        ? workspaceProjects
        : String(scope) === centerFallbackScope
          ? fallbackProjects
          : []
    )
    vi.spyOn(forecastingRepository, 'persistWorkspace').mockImplementation(async (projects, scope) => {
      if (String(scope) === forecastScope) {
        workspaceProjects = projects
      }
      if (String(scope) === centerFallbackScope) {
        fallbackProjects = projects
      }
      return projects
    })

    const wrapper = buildWrapper()
    await flushPromises()
    await flushPromises()
    await flushPromises()
    await openTab(wrapper, 'Forecasts')

    expect(wrapper.text()).toContain('Budget Forecast')

    const deleteButtons = wrapper.findAll('button').filter((node) => node.text().trim() === 'Delete')
    await deleteButtons[deleteButtons.length - 1].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Delete Forecast?')

    const confirmButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Delete Forecast')
    await confirmButton.trigger('click')
    await flushPromises()
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(workspaceProjects).toHaveLength(0)
    expect(fallbackProjects).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Voice Support 2026 Forecast')
  })

  it('keeps the forecast list visible while a forecast delete is still being written locally', async () => {
    const forecastScope = buildForecastStorageScope('default', 'center-1', 'group-1')
    const centerFallbackScope = buildForecastStorageScope('default', 'center-1')
    let workspaceProjects = [
      createForecastProject({
        id: 'forecast-1',
        name: 'Voice Support 2026 Forecast',
        centerId: 'center-1',
        planningContext: {
          centerId: 'center-1',
          groupId: 'group-1',
          planningYear: 2026,
          groupName: 'Voice Support'
        },
        historyRows: [
          { ds: '2025-01-01', y: 100 }
        ]
      })
    ]
    let fallbackProjects = [
      createForecastProject({
        id: 'forecast-1',
        name: 'Voice Support 2026 Forecast',
        centerId: 'center-1',
        planningContext: {
          centerId: 'center-1',
          groupId: 'group-1',
          planningYear: 2026,
          groupName: 'Voice Support'
        }
      })
    ]
    const persistDeferred = createDeferred()

    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockImplementation(async (scope) => ({
      projects:
        String(scope) === forecastScope
          ? workspaceProjects
          : String(scope) === centerFallbackScope
            ? fallbackProjects
            : [],
      error: null
    }))
    vi.spyOn(forecastingRepository, 'loadWorkspace').mockImplementation(async (scope) =>
      String(scope) === forecastScope
        ? workspaceProjects
        : String(scope) === centerFallbackScope
          ? fallbackProjects
          : []
    )
    vi.spyOn(forecastingRepository, 'persistWorkspace').mockImplementation(async (projects, scope) => {
      if (String(scope) === forecastScope) {
        workspaceProjects = projects
      }
      if (String(scope) === centerFallbackScope) {
        fallbackProjects = projects
      }

      await persistDeferred.promise
      return projects
    })

    const wrapper = buildWrapper()
    await flushPromises()
    await flushPromises()
    await flushPromises()
    await openTab(wrapper, 'Forecasts')

    const deleteButtons = wrapper.findAll('button').filter((node) => node.text().trim() === 'Delete')
    await deleteButtons[deleteButtons.length - 1].trigger('click')
    await flushPromises()

    const confirmButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Delete Forecast')
    await confirmButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Loading saved forecasts for Voice Support.')
    expect(wrapper.text()).not.toContain('Voice Support 2026 Forecast')

    persistDeferred.resolve()
    await flushPromises()
    await flushPromises()
  })

  it('does not offer reforecast creation actions in the staffing-group summary list', async () => {
    const forecastScope = buildForecastStorageScope('default', 'center-1', 'group-1')
    const centerFallbackScope = buildForecastStorageScope('default', 'center-1')
    let workspaceProjects = []
    let fallbackProjects = [
      createForecastProject({
        id: 'forecast-1',
        name: 'Voice Support 2026 Forecast',
        centerId: 'center-1',
        planningContext: {
          centerId: 'center-1',
          groupId: 'group-1',
          planningYear: 2026,
          groupName: 'Voice Support'
        },
        historyRows: [
          { ds: '2025-01-01', y: 100 }
        ],
        lastRun: {
          runAt: '2026-04-08T14:00:00.000Z',
          monthlyRollup: [
            { monthStart: '2026-01-01', monthLabel: 'Jan 2026', contacts: 3400, peakDailyVolume: 120 }
          ],
          summary: {
            projectedTotalContacts: 3400
          }
        }
      })
    ]

    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockImplementation(async (scope) => ({
      projects:
        String(scope) === forecastScope
          ? workspaceProjects
          : String(scope) === centerFallbackScope
            ? fallbackProjects
            : [],
      error: null
    }))
    vi.spyOn(forecastingRepository, 'loadWorkspace').mockImplementation(async (scope) =>
      String(scope) === forecastScope
        ? workspaceProjects
        : String(scope) === centerFallbackScope
          ? fallbackProjects
          : []
    )
    vi.spyOn(forecastingRepository, 'persistWorkspace').mockImplementation(async (projects, scope) => {
      if (String(scope) === forecastScope) {
        workspaceProjects = projects
      }
      return projects
    })

    const wrapper = buildWrapper()
    await flushPromises()
    await flushPromises()
    await flushPromises()
    await openTab(wrapper, 'Forecasts')

    expect(wrapper.text()).not.toContain('New Reforecast')
    expect(workspaceProjects).toHaveLength(0)
  })
})
