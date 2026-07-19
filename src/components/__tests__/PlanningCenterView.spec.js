import { mount } from '@vue/test-utils'

import PlanningCenterView from '../planning/PlanningCenterView.vue'
import { buildForecastStorageScope, forecastingRepository } from '../../forecastingRepository'
import { buildPlanningGroupForecastsHash, buildPlanningGroupNewForecastHash } from '../../appRoutes'
import { createForecastProject } from '../../forecasting/shared'
import { clearLocalDataStore } from '../../storage/localDataStore'

const AppButtonStub = {
  name: 'AppButton',
  props: ['disabled', 'title'],
  emits: ['click'],
  template: '<button :disabled="disabled" :title="title" @click="$emit(\'click\', $event)"><slot /></button>'
}

const AppPanelStub = {
  name: 'AppPanel',
  template: '<section><slot /></section>'
}

const AppStatusMessageStub = {
  name: 'AppStatusMessage',
  template: '<div><slot /></div>'
}

const AppTableShellStub = {
  name: 'AppTableShell',
  template: '<section><slot /></section>'
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
    'sourceKind',
    'yearOptions',
    'canCreate',
    'modeledForecastUnavailableMessage'
  ],
  emits: ['cancel', 'create', 'update:planningYear', 'update:sourceKind'],
  template: `
    <div>
      <p>New Forecast</p>
      <p>Plan Year: {{ planningYear || 'empty' }}</p>
      <p>Source: {{ sourceKind || 'empty' }}</p>
      <p v-if="modeledForecastUnavailableMessage">Modeled Blocked: {{ modeledForecastUnavailableMessage }}</p>
      <button @click="$emit('update:planningYear', 2027)">Set Year</button>
      <button @click="$emit('update:sourceKind', 'imported_daily')">Set Import Source</button>
      <button @click="$emit('create')">Create Forecast</button>
    </div>
  `
}

const PlanningPlanUpdateModalStub = {
  name: 'PlanningPlanUpdateModal',
  props: [
    'visible',
    'sourcePlan',
    'budgetPlan',
    'actualsThroughOptions',
    'actualsThroughBlocker',
    'actualsThroughMonth',
    'updateName',
    'decisionReason'
  ],
  emits: ['cancel', 'create', 'update:visible', 'update:actualsThroughMonth', 'update:updateName', 'update:decisionReason'],
  template: `
    <div v-if="visible" data-test="plan-update-modal">
      <p>Update Source: {{ sourcePlan?.name }}</p>
      <p>Budget Baseline: {{ budgetPlan?.name }}</p>
      <p>Actuals Options: {{ actualsThroughOptions.length }}</p>
      <p v-if="actualsThroughBlocker">Actuals Blocker: {{ actualsThroughBlocker }}</p>
      <p>Actuals Through: {{ actualsThroughMonth }}</p>
      <p>Update Name: {{ updateName }}</p>
      <p>Decision Reason: {{ decisionReason || 'empty' }}</p>
      <button @click="$emit('update:decisionReason', 'Approved outlook revision')">Set Decision Reason</button>
      <button @click="$emit('create')">Confirm Updated Plan</button>
    </div>
  `
}

const PlanningPlanComparisonDialogStub = {
  name: 'PlanningPlanComparisonDialog',
  props: ['visible', 'groupName', 'section'],
  emits: ['update:visible'],
  template: `
    <div v-if="visible" data-test="plan-comparison-dialog">
      <p>Compare {{ groupName }} {{ section.planningYear }}</p>
      <p>{{ section.rows.length }} saved plans</p>
    </div>
  `
}

const PlannerSettingsModalStub = {
  name: 'PlannerSettingsModal',
  props: [
    'planningYear',
    'yearOptions',
    'canClose',
    'statusMessage',
    'statusTone'
  ],
  emits: ['cancel', 'close', 'update:planningYear', 'update:requirementMethod'],
  template: `
    <div>
      <p>New Plan</p>
      <p data-test="plan-settings-year">{{ planningYear || 'empty' }}</p>
      <p data-test="plan-settings-can-close">{{ canClose ? 'open' : 'blocked' }}</p>
      <ul data-test="plan-settings-year-options">
        <li v-for="option in yearOptions" :key="option.value">{{ option.label }}</li>
      </ul>
      <p v-if="statusMessage" data-test="plan-settings-status">{{ statusMessage }}</p>
      <button @click="$emit('close')">Create Plan</button>
    </div>
  `
}

const PlanningGroupIntradayViewStub = {
  name: 'PlanningGroupIntradayView',
  emits: ['save-intraday'],
  template: '<div>Intraday Setup</div>'
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

const buildCompleteWeekdayActuals = (year, monthIndex, overridesByDate = {}) => {
  const rows = []
  const lastDay = new Date(year, monthIndex + 1, 0, 12).getDate()

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, monthIndex, day, 12)
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue
    }

    const serviceDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    rows.push({
      serviceDate,
      contacts: 0,
      ahtSeconds: 0,
      ...overridesByDate[serviceDate]
    })
  }

  return rows
}

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
            serviceLevelPercent: 80,
            serviceLevelThresholdSeconds: 20,
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
      selectedGroupId: 'group-1',
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
        AppStatusMessage: AppStatusMessageStub,
        AppTableShell: AppTableShellStub,
        CallCenterSettingsModal: true,
        PlanningGroupSettingsModal: true,
        PlanningForecastCreateModal: PlanningForecastCreateModalStub,
        PlanningPlanComparisonDialog: PlanningPlanComparisonDialogStub,
        PlanningPlanUpdateModal: PlanningPlanUpdateModalStub,
        PlanningGroupIntradayView: PlanningGroupIntradayViewStub,
        PlannerSettingsModal: PlannerSettingsModalStub
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

const buildForecastMonthlyRollup = (planningYear, monthCount = 12) =>
  Array.from({ length: monthCount }, (_, index) => {
    const monthNumber = index + 1
    const monthStart = `${planningYear}-${String(monthNumber).padStart(2, '0')}-01`
    const monthLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric'
    }).format(new Date(`${monthStart}T00:00:00Z`))

    return {
      monthStart,
      monthLabel,
      contacts: 4000 + (index * 100),
      averageDailyVolume: 200 + index,
      peakDailyVolume: 260 + index,
      lowerBoundContacts: 3800 + (index * 100),
      upperBoundContacts: 4200 + (index * 100)
    }
  })

const buildPlanningReadyForecast = (planningYear, id) =>
  createForecastProject({
    id,
    name: `Voice Support ${planningYear} Budget Forecast`,
    centerId: 'center-1',
    planningYear,
    forecastType: 'budget',
    planningContext: {
      centerId: 'center-1',
      groupId: 'group-1',
      planningYear,
      groupName: 'Voice Support'
    },
    lastRun: {
      runAt: `${planningYear - 1}-12-15T12:00:00.000Z`,
      monthlyRollup: buildForecastMonthlyRollup(planningYear),
      summary: {
        projectedTotalContacts: 54000
      }
    }
  })

describe('PlanningCenterView', () => {
  beforeEach(async () => {
    await clearLocalDataStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a call-center summary before drilling into a staffing group', () => {
    const wrapper = buildWrapper({
      selectedGroupId: ''
    })

    expect(wrapper.text()).toContain('Call Center Plan')
    expect(wrapper.text()).toContain('Expected vs actuals across staffing groups.')
    expect(wrapper.text()).toContain('Total / Avg')
    expect(wrapper.text()).toContain('Gap vs Actual Req HC')
    expect(wrapper.text()).toContain('Voice Support')
    expect(wrapper.text()).toContain('Actual Contacts')
    expect(wrapper.text()).not.toContain('Monthly Actuals From Data')
    expect(wrapper.text()).not.toContain('Plan Coverage')
    expect(wrapper.text()).not.toContain('Actuals Coverage')
    expect(wrapper.text()).not.toContain('Expected Contacts')
    expect(wrapper.text()).not.toContain('Staffing Group Summary')
    expect(wrapper.text()).not.toContain('Add Data')
  })

  it('names unavailable Intraday Erlang contributors and links to recalculation', () => {
    const wrapper = buildWrapper({
      selectedGroupId: '',
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
            serviceLevelPercent: 80,
            serviceLevelThresholdSeconds: 20,
            plans: [
              {
                id: 'plan-1',
                name: '2026 Erlang Plan',
                planningYear: 2026,
                planType: 'budget',
                isCurrent: true,
                requirementMethod: 'intraday_erlang',
                operatingOpenTime: '08:00',
                operatingCloseTime: '09:00',
                serviceLevelPercent: 80,
                serviceLevelThresholdSeconds: 20,
                intraday: {
                  intervalLengthMinutes: 30,
                  intervalRatios: [
                    { startTime: '08:00', ratioPercent: 50 },
                    { startTime: '08:30', ratioPercent: 50 }
                  ]
                },
                presenceMonths: Array.from({ length: 12 }, () => ({ paidHoursPerDay: 8 })),
                randomDefaults: {
                  occupancyPercent: 90,
                  adherencePercent: 95
                }
              }
            ]
          }
        ]
      }
    })

    expect(wrapper.text()).toContain('Intraday Erlang report scope')
    expect(wrapper.text()).toContain('Voice Support · 2026 Erlang Plan')
    expect(wrapper.text()).toContain('Planned requirement values are withheld')
    expect(wrapper.text()).toContain('Actual requirement values are withheld')
    expect(wrapper.text()).toContain('Recalculate Plan')
    expect(wrapper.get('button[aria-label="Recalculate Plan for Voice Support"]')).toBeTruthy()
  })

  it('keeps call-center actuals month details collapsed by default', () => {
    const wrapper = buildWrapper({
      selectedGroupId: ''
    })

    const monthToggles = wrapper.findAll('button[aria-expanded]')

    expect(monthToggles.length).toBeGreaterThan(0)
    expect(monthToggles.every((button) => button.attributes('aria-expanded') === 'false')).toBe(true)
    expect(monthToggles.some((button) => button.attributes('aria-label')?.startsWith('Expand Jan'))).toBe(true)
    expect(monthToggles.some((button) => button.attributes('aria-label')?.startsWith('Collapse'))).toBe(false)
  })

  it('keeps report columns and expanded-month context inside one keyboard scroll region', async () => {
    const wrapper = buildWrapper({
      selectedGroupId: ''
    })

    const scrollRegion = wrapper.get('[role="region"][aria-label="Call center monthly plan and actuals"]')
    const tableHeader = scrollRegion.get('thead')
    const monthHeader = tableHeader.get('th[scope="col"]')
    const firstMonthToggle = scrollRegion.findAll('button[aria-expanded]')[0]
    const firstMonthRow = scrollRegion.get('tr[data-month-start="2026-01-01"]')

    expect(scrollRegion.attributes('tabindex')).toBe('0')
    expect(scrollRegion.classes()).toContain('overflow-auto')
    expect(tableHeader.classes()).toContain('sticky')
    expect(tableHeader.classes()).toContain('top-0')
    expect(monthHeader.classes()).toContain('sticky')
    expect(monthHeader.classes()).toContain('left-0')
    expect(firstMonthRow.classes()).not.toContain('sticky')

    await firstMonthToggle.trigger('click')

    expect(firstMonthRow.classes()).toContain('sticky')
    expect(firstMonthRow.classes()).toContain('top-[4.7rem]')
    expect(firstMonthRow.get('th[scope="row"]').classes()).toContain('left-0')
    expect(firstMonthRow.get('th[scope="row"]').classes()).toContain('bg-[#eef4f8]')
  })

  it('visually separates expanded month totals from staffing-group detail rows', async () => {
    const wrapper = buildWrapper({
      selectedGroupId: ''
    })

    const firstMonthToggle = wrapper.findAll('button[aria-expanded]')[0]
    await firstMonthToggle.trigger('click')

    const bodyRows = wrapper.findAll('tbody tr')

    expect(bodyRows[0].classes()).toContain('bg-[#eef4f8]')
    expect(bodyRows[0].findAll('td')[0].classes()).toContain('font-semibold')
    expect(bodyRows[1].classes()).toContain('bg-[#f8fbfd]')
    expect(bodyRows[1].find('.border-l-2').exists()).toBe(true)
  })

  it('does not show workload variance percentages for months without actuals', () => {
    const wrapper = buildWrapper({
      selectedGroupId: '',
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
            serviceLevelPercent: 80,
            serviceLevelThresholdSeconds: 20,
            actuals: {
              sourceMode: 'daily_upload',
              dailyRows: [
                { serviceDate: '2026-01-05', contacts: 100, ahtSeconds: 360 }
              ]
            },
            plans: [
              {
                id: 'budget-2026',
                planningYear: 2026,
                planType: 'budget',
                planMonths: Array.from({ length: 12 }, () => ({
                  contacts: 1000,
                  ahtSeconds: 360,
                  peakDayUpliftPercent: 0
                })),
                presenceMonths: Array.from({ length: 12 }, () => ({
                  paidHoursPerDay: 8
                })),
                randomDefaults: {
                  occupancyPercent: 100,
                  adherencePercent: 100
                },
                startingHeadcount: 10,
                startingFrontlineHeadcount: 10
              }
            ]
          }
        ]
      }
    })

    expect(wrapper.text()).toContain('-90.0%')
    expect(wrapper.text()).not.toContain('-100.0%')
  })

  it('keeps versioned plan headers on a single line with compact labels', async () => {
    const wrapper = buildWrapper()
    const plansTab = wrapper.findAll('button').find((node) => node.text().trim() === 'Plans')
    await plansTab.trigger('click')
    const hoursHeader = findSpanByText(wrapper, 'Total Req Hrs')
    const averageHeader = findSpanByText(wrapper, 'Avg Req HC')

    expect(hoursHeader).toBeTruthy()
    expect(averageHeader).toBeTruthy()
    expect(hoursHeader.classes()).toContain('whitespace-nowrap')
    expect(hoursHeader.classes()).not.toContain('truncate')
    expect(averageHeader.classes()).toContain('whitespace-nowrap')
    expect(averageHeader.classes()).not.toContain('truncate')
  })

  it('derives plan summary rows from saved plan inputs when persisted summary demand metrics are stale', async () => {
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
            serviceLevelPercent: 80,
            serviceLevelThresholdSeconds: 20,
            plans: [
              {
                id: 'plan-1',
                planningYear: 2026,
                planMonths: Array.from({ length: 12 }, () => ({
                  contacts: 1000,
                  ahtSeconds: 360,
                  peakDayUpliftPercent: 0
                })),
                presenceMonths: Array.from({ length: 12 }, () => ({
                  paidHoursPerDay: 8
                })),
                randomDefaults: {
                  occupancyPercent: 100,
                  adherencePercent: 100
                },
                startingHeadcount: 10,
                startingFrontlineHeadcount: 10,
                summary: {
                  annualContacts: 12000,
                  annualWorkloadHours: 0,
                  annualRequiredStaffHours: 0,
                  averageRequiredHeadcount: 0,
                  peakRequiredHeadcount: 0,
                  endingFrontlineHeadcount: 0,
                  averageGapToRequirement: 0
                }
              }
            ]
          }
        ]
      }
    })

    await openTab(wrapper, 'Plans')

    expect(wrapper.text()).toContain('Workload Ratio')
    expect(wrapper.text()).toContain('12,000')
    expect(wrapper.text()).toContain('1,200')
    expect(wrapper.text()).not.toContain('Presence %')
    expect(wrapper.text()).not.toContain('Utilization %')
  })

  it('groups Budget and Update plans by year with current badges, comparison, and update actions', async () => {
    window.location.hash = '#planning'

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
            serviceLevelPercent: 80,
            serviceLevelThresholdSeconds: 20,
            actuals: {
              sourceMode: 'daily_upload',
              dailyRows: buildCompleteWeekdayActuals(2026, 0, {
                '2026-01-02': { contacts: 900, ahtSeconds: 300 }
              })
            },
            plans: [
              {
                id: 'budget-2026',
                name: '2026 Budget',
                planningYear: 2026,
                planType: 'budget',
                isCurrent: false,
                summary: {
                  annualContacts: 180000,
                  annualRequiredStaffHours: 31200,
                  averageRequiredHeadcount: 18.4,
                  averageGapToRequirement: -1.2
                },
                updatedAt: '2026-01-01T00:00:00.000Z'
              },
              {
                id: 'update-current',
                name: '2026 Apr Update',
                planningYear: 2026,
                planType: 'update',
                isCurrent: true,
                budgetPlanId: 'budget-2026',
                sourcePlanId: 'budget-2026',
                actualsThroughMonth: '2026-03-01',
                decisionReason: 'Approved spring outlook',
                summary: {
                  annualContacts: 190000,
                  annualRequiredStaffHours: 33000,
                  averageRequiredHeadcount: 19.2,
                  averageGapToRequirement: -2.4
                },
                updatedAt: '2026-04-01T00:00:00.000Z'
              },
              {
                id: 'update-old',
                name: '2026 Feb Update',
                planningYear: 2026,
                planType: 'update',
                isCurrent: false,
                budgetPlanId: 'budget-2026',
                sourcePlanId: 'budget-2026',
                actualsThroughMonth: '2026-01-01',
                summary: {
                  annualContacts: 184000,
                  annualRequiredStaffHours: 31800,
                  averageRequiredHeadcount: 18.7,
                  averageGapToRequirement: -1.5
                },
                updatedAt: '2026-02-01T00:00:00.000Z'
              }
            ]
          }
        ]
      }
    })

    await openTab(wrapper, 'Plans')

    expect(wrapper.text()).toContain('Current: 2026 Apr Update')
    expect(wrapper.text()).toContain('Budget')
    expect(wrapper.text()).toContain('Update')
    expect(wrapper.text()).toContain('Current')
    expect(wrapper.text()).toContain('Actuals through Mar 2026')
    expect(wrapper.text()).toContain('Approved spring outlook')
    expect(wrapper.text()).toContain('Decision reason not recorded (legacy plan)')
    expect(wrapper.text()).toContain('Compare Plans')
    expect(wrapper.text()).not.toContain('Vs Budget')

    await wrapper.findAll('button').find((node) => node.text().trim() === 'Compare Plans').trigger('click')
    expect(wrapper.get('[data-test="plan-comparison-dialog"]').text()).toContain('Compare Voice Support 2026')
    expect(wrapper.get('[data-test="plan-comparison-dialog"]').text()).toContain('3 saved plans')

    const setCurrentButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Set Current')
    await setCurrentButton.trigger('click')

    expect(wrapper.emitted('set-current-plan')?.[0]?.[0]).toEqual({
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'update-old',
      planningYear: 2026
    })

    const createUpdateButton = wrapper
      .findAll('button')
      .find((node) => node.text().trim() === 'Create Updated Plan')
    await createUpdateButton.trigger('click')

    expect(wrapper.get('[data-test="plan-update-modal"]').text()).toContain('Update Source: 2026 Apr Update')
    expect(wrapper.get('[data-test="plan-update-modal"]').text()).toContain('Budget Baseline: 2026 Budget')
    expect(wrapper.get('[data-test="plan-update-modal"]').text()).toContain('Actuals Options: 1')
    expect(wrapper.get('[data-test="plan-update-modal"]').text()).toContain('Decision Reason: empty')

    await wrapper.findAll('button').find((node) => node.text().trim() === 'Set Decision Reason').trigger('click')
    await wrapper.findAll('button').find((node) => node.text().trim() === 'Confirm Updated Plan').trigger('click')

    expect(window.location.hash).toContain('/reason/Approved%20outlook%20revision')
  })

  it('blocks updated-plan creation when a loaded month is missing expected open dates', async () => {
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
            actuals: {
              sourceMode: 'daily_upload',
              dailyRows: [
                { serviceDate: '2026-01-02', contacts: 900, ahtSeconds: 300 }
              ]
            },
            plans: [
              {
                id: 'budget-2026',
                name: '2026 Budget',
                planningYear: 2026,
                planType: 'budget',
                isCurrent: true,
                status: 'finalized'
              }
            ]
          }
        ]
      }
    })

    await openTab(wrapper, 'Plans')

    const blocker = 'Jan 2026 actuals are missing 21 expected open days, starting with Jan 1, 2026.'
    expect(wrapper.text()).toContain(blocker)

    const createUpdateButton = wrapper
      .findAll('button')
      .find((node) => node.text().trim() === 'Create Updated Plan')
    expect(createUpdateButton.attributes('disabled')).toBeDefined()
    expect(createUpdateButton.attributes('title')).toContain(blocker)
  })

  it('limits updated-plan cutoffs before the first positive-contact month with zero AHT', async () => {
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
            actuals: {
              sourceMode: 'daily_upload',
              dailyRows: [
                ...buildCompleteWeekdayActuals(2026, 0, {
                  '2026-01-02': { contacts: 900, ahtSeconds: 300 }
                }),
                ...buildCompleteWeekdayActuals(2026, 1, {
                  '2026-02-02': { contacts: 850, ahtSeconds: 0 }
                }),
                ...buildCompleteWeekdayActuals(2026, 2, {
                  '2026-03-02': { contacts: 920, ahtSeconds: 310 }
                })
              ]
            },
            plans: [
              {
                id: 'budget-2026',
                name: '2026 Budget',
                planningYear: 2026,
                planType: 'budget',
                isCurrent: true,
                status: 'finalized'
              }
            ]
          }
        ]
      }
    })

    await openTab(wrapper, 'Plans')

    const blocker = 'Feb 2026 actuals have positive contacts but zero weighted AHT.'
    expect(wrapper.text()).toContain(blocker)

    const createUpdateButton = wrapper
      .findAll('button')
      .find((node) => node.text().trim() === 'Create Updated Plan')
    expect(createUpdateButton.attributes('title')).toContain(blocker)
    expect(createUpdateButton.attributes()).not.toHaveProperty('disabled')

    await createUpdateButton.trigger('click')

    const modal = wrapper.get('[data-test="plan-update-modal"]')
    expect(modal.text()).toContain('Actuals Options: 1')
    expect(modal.text()).toContain(`Actuals Blocker: ${blocker}`)
    expect(modal.text()).toContain('Actuals Through: 2026-01-01')
  })

  it('labels draft budgets and does not offer update creation until finalized', async () => {
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
            plans: [
              {
                id: 'budget-draft-2026',
                name: '2026 Budget',
                planningYear: 2026,
                planType: 'budget',
                status: 'draft',
                isCurrent: true,
                updatedAt: '2026-01-01T00:00:00.000Z'
              }
            ]
          }
        ]
      }
    })

    await openTab(wrapper, 'Plans')

    expect(wrapper.text()).toContain('Draft Budget')
    expect(wrapper.text()).not.toContain('Create Updated Plan')
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
      .filter((label) => ['Data', 'Forecasts', 'Intraday', 'Plans'].includes(label))

    expect(tabButtons).toEqual(['Data', 'Forecasts', 'Intraday', 'Plans'])
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

  it('opens the intraday workspace tab when requested by the route', () => {
    const wrapper = buildWrapper({
      selectedGroupTab: 'intraday'
    })

    expect(wrapper.text()).toContain('Intraday Setup')
    expect(wrapper.text()).not.toContain('Add Data')
    expect(wrapper.text()).not.toContain('New Forecast')
  })

  it('opens a source-aware create-forecast modal and routes modeled forecasts through shared history', async () => {
    window.location.hash = '#planning'

    const wrapper = buildWrapper()
    await openTab(wrapper, 'Forecasts')
    const newForecastButton = wrapper.findAll('button').find((node) => node.text().trim() === 'New Forecast')
    await newForecastButton.trigger('click')

    expect(wrapper.text()).toContain('New Forecast')
    expect(wrapper.text()).toContain('Plan Year: 2026')
    expect(wrapper.text()).toContain('Source: modeled_daily')

    const setYearButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Set Year')
    const createForecastButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Create Forecast')

    await setYearButton.trigger('click')
    await createForecastButton.trigger('click')

    expect(window.location.hash).toBe(
      buildPlanningGroupNewForecastHash('center-1', 'group-1', 2027, {
        forecastType: 'budget',
        coverageStartDate: '2027-01-01',
        coverageEndDate: '2027-12-31'
      })
    )
  })

  it('routes imported forecast creation from the staffing-group forecast tab without shared history', async () => {
    window.location.hash = '#planning'

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
            serviceLevelPercent: 80,
            serviceLevelThresholdSeconds: 20,
            actuals: {
              sourceMode: 'daily_upload',
              dailyRows: []
            },
            plans: []
          }
        ]
      }
    })
    await openTab(wrapper, 'Forecasts')
    const newForecastButton = wrapper.findAll('button').find((node) => node.text().trim() === 'New Forecast')
    await newForecastButton.trigger('click')

    expect(wrapper.text()).toContain('Modeled Blocked: Add at least 14 daily history rows in Data before building a modeled forecast for Voice Support.')

    const setImportSourceButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Set Import Source')
    const createForecastButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Create Forecast')

    await setImportSourceButton.trigger('click')
    await createForecastButton.trigger('click')

    expect(window.location.hash).toBe(
      buildPlanningGroupNewForecastHash('center-1', 'group-1', 2026, {
        sourceKind: 'imported_daily',
        forecastType: 'budget',
        coverageStartDate: '2026-01-01',
        coverageEndDate: '2026-12-31'
      })
    )
  })

  it('limits new plan years to unused staffing-group forecast years that are ready for planning', async () => {
    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: [
        buildPlanningReadyForecast(2026, 'forecast-2026'),
        buildPlanningReadyForecast(2028, 'forecast-2028'),
        createForecastProject({
          id: 'forecast-2027-incomplete',
          name: 'Voice Support 2027 Incomplete Forecast',
          centerId: 'center-1',
          planningYear: 2027,
          forecastType: 'budget',
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planningYear: 2027,
            groupName: 'Voice Support'
          },
          lastRun: {
            runAt: '2026-12-15T12:00:00.000Z',
            monthlyRollup: buildForecastMonthlyRollup(2027, 1)
          }
        })
      ],
      error: null
    })

    const wrapper = buildWrapper()
    await flushPromises()
    await flushPromises()
    await openTab(wrapper, 'Plans')

    const newPlanButton = wrapper.findAll('button').find((node) => node.text().trim() === 'New Plan')
    await newPlanButton.trigger('click')
    await flushPromises()

    const yearOptions = wrapper.find('[data-test="plan-settings-year-options"]').text()

    expect(wrapper.text()).toContain('New Plan')
    expect(wrapper.get('[data-test="plan-settings-year"]').text()).toBe('2028')
    expect(yearOptions).toContain('2028')
    expect(yearOptions).not.toContain('2026')
    expect(yearOptions).not.toContain('2027')
    expect(wrapper.get('[data-test="plan-settings-can-close"]').text()).toBe('open')
  })

  it('blocks new plan creation when the staffing group has no planning-ready saved forecasts', async () => {
    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: [],
      error: null
    })

    const wrapper = buildWrapper()
    await flushPromises()
    await flushPromises()
    await openTab(wrapper, 'Plans')

    const newPlanButton = wrapper.findAll('button').find((node) => node.text().trim() === 'New Plan')
    await newPlanButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('New Plan')
    expect(wrapper.get('[data-test="plan-settings-year-options"]').text()).toBe('')
    expect(wrapper.get('[data-test="plan-settings-can-close"]').text()).toBe('blocked')
    expect(wrapper.get('[data-test="plan-settings-status"]').text()).toContain('Create and save a staffing-group forecast for Voice Support before creating a plan.')
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

  it('shows forecast usage and dependent plan protection before deletion', async () => {
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
            serviceLevelPercent: 80,
            serviceLevelThresholdSeconds: 20,
            plans: [
              {
                id: 'plan-1',
                name: '2026 Budget',
                planType: 'budget',
                isCurrent: true,
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
    expect(wrapper.text()).toContain('2026 Budget')
    expect(wrapper.text()).not.toContain('Not used')
    expect(forecastingRepository.loadWorkspaceResult).toHaveBeenCalledWith(forecastScope)

    const deleteButtons = wrapper.findAll('button').filter((node) => node.text().trim() === 'Delete')
    await deleteButtons.at(-1).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('This forecast is used by 1 saved plan: 2026 Budget (finalized).')
    expect(wrapper.text()).toContain('does not delete this plan or change its saved demand values and snapshot')
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

    const forecastRow = wrapper.find('[aria-label="Select Voice Support 2026 Budget Forecast for Voice Support"]')
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

    expect(wrapper.text()).toContain('Voice Support 2026 Forecast')

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
