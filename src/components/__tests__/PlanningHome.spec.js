import { mount } from '@vue/test-utils'

import PlanningHome from '../PlanningHome.vue'

const AppButtonStub = {
  name: 'AppButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)"><slot /></button>'
}

const AppEmptyStateStub = {
  name: 'AppEmptyState',
  props: ['title', 'description'],
  template: '<section><h2>{{ title }}</h2><p>{{ description }}</p><slot /></section>'
}

const AppPageHeaderStub = {
  name: 'AppPageHeader',
  props: ['kicker', 'title', 'description'],
  template: '<header><p>{{ kicker }}</p><h1>{{ title }}</h1><p>{{ description }}</p><slot /><slot name="actions" /></header>'
}

const AppSelectStub = {
  name: 'AppSelect',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select :value="modelValue"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>'
}

const passthroughStub = (name, tag = 'section') => ({
  name,
  template: `<${tag}><slot /></${tag}>`
})

const buildPlanMonths = (contacts, ahtSeconds = 360) =>
  Array.from({ length: 12 }, () => ({
    contacts,
    ahtSeconds,
    peakDayUpliftPercent: 0
  }))

const buildPresenceMonths = () =>
  Array.from({ length: 12 }, () => ({
    paidHoursPerDay: 8
  }))

const buildPlan = (overrides = {}) => ({
  id: 'budget-2026',
  name: '2026 Budget',
  planningYear: 2026,
  planType: 'budget',
  isCurrent: true,
  planMonths: buildPlanMonths(1000, 360),
  presenceMonths: buildPresenceMonths(),
  randomDefaults: {
    occupancyPercent: 100,
    adherencePercent: 100
  },
  startingHeadcount: 5,
  startingFrontlineHeadcount: 5,
  ...overrides
})

const buildCenter = (overrides = {}) => ({
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
          { serviceDate: '2026-01-02', contacts: 1200, ahtSeconds: 300 },
          { serviceDate: '2026-01-03', contacts: 800, ahtSeconds: 300 }
        ]
      },
      plans: [buildPlan()]
    }
  ],
  ...overrides
})

const buildWrapper = (props = {}) =>
  mount(PlanningHome, {
    props: {
      centers: [buildCenter()],
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
        AppConfirmDialog: passthroughStub('AppConfirmDialog'),
        AppEmptyState: AppEmptyStateStub,
        AppIcon: true,
        AppMenu: passthroughStub('AppMenu'),
        AppPageHeader: AppPageHeaderStub,
        AppPanel: passthroughStub('AppPanel'),
        AppSelect: AppSelectStub,
        CallCenterSettingsModal: true,
        PlanningPortfolioHeadcountChart: {
          name: 'PlanningPortfolioHeadcountChart',
          props: ['startingFrontlineTotals', 'frontlineAdditionTotals', 'hireTotals', 'attritionTotals', 'scopeDescription'],
          template: '<section>Monthly Staffing Waterfall</section>'
        }
      }
    }
  })

describe('PlanningHome', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the planning portfolio with portfolio stats', () => {
    const wrapper = buildWrapper()
    const text = wrapper.text()

    expect(text).toContain('Planning Portfolio')
    expect(text).toContain('Demand, actuals, staffing coverage')
    expect(text).not.toContain('Planning Command Center')
    expect(text).toContain('Call Centers')
    expect(text).toContain('Staffing Groups')
    expect(text).toContain('Plan Coverage')
    expect(text).toContain('Actuals Coverage')
    expect(text).toContain('Expected Contacts')
    expect(text).toContain('Actual Contacts')
    expect(text).toContain('Staffing Gap')
    expect(text).toContain('Peak Required HC')
    expect(text).toContain('12,000')
  })

  it('places the portfolio monthly operating table before the call-center command list', () => {
    const wrapper = buildWrapper()
    const text = wrapper.text()

    expect(text).toContain('Portfolio Monthly Operating Plan')
    expect(text).toContain('Call Center Command List')
    expect(text).toContain('Jan 2026')
    expect(text).toContain('Monthly Staffing Waterfall')
    expect(text.indexOf('Portfolio Monthly Operating Plan')).toBeLessThan(text.indexOf('Call Center Command List'))
  })

  it('downloads a selected-year current-plan portfolio CSV with monthly staffing measures', async () => {
    const csvBlobs = []
    vi.stubGlobal('Blob', vi.fn((parts, options) => ({ parts, options })))
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob) => {
        csvBlobs.push(blob)
        return 'blob:portfolio-csv'
      })
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => {})
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = buildWrapper()
    const downloadButton = wrapper.findAll('button').find((button) => button.text().includes('Download Portfolio CSV'))

    expect(downloadButton).toBeTruthy()
    expect(downloadButton.attributes('disabled')).toBeUndefined()
    await downloadButton.trigger('click')

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(csvBlobs).toHaveLength(1)
    expect(csvBlobs[0].options.type).toBe('text/csv;charset=utf-8')
    const csv = csvBlobs[0].parts.join('')
    expect(csv.split('\r\n')).toHaveLength(13)
    expect(csv).toContain('planning_year,plan_role,month_start,month')
    expect(csv).toContain('required_headcount,peak_required_headcount,actual_required_headcount')
    expect(csv).toContain('starting_frontline_headcount')
    expect(csv).toContain('ending_frontline_headcount,ending_roster_headcount')
    expect(csv).toContain('2026,current,2026-01-01,Jan 2026')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:portfolio-csv')
  })

  it('replaces an unmodeled portfolio report with an actionable plan-coverage state', async () => {
    const wrapper = buildWrapper({
      centers: [
        buildCenter({
          groups: [
            {
              id: 'group-1',
              name: 'Voice Support',
              actuals: {
                sourceMode: 'daily_upload',
                dailyRows: [
                  { serviceDate: '2026-01-02', contacts: 1200, ahtSeconds: 300 }
                ]
              },
              plans: []
            }
          ]
        })
      ]
    })
    const downloadButton = wrapper.findAll('button').find((button) => button.text().includes('Download Portfolio CSV'))
    const setupButton = wrapper.findAll('button').find((button) => button.text().includes('Open North America Support'))
    const text = wrapper.text()

    expect(text).toContain('2026 operating report needs plans')
    expect(text).toContain('Plan coverage is 0 of 1 staffing groups')
    expect(text).toContain('Actuals exist for 1 group')
    expect(text).toContain('staffing requirements remain unavailable without a plan')
    expect(text).toContain('Call Center Command List')
    expect(text).toContain('Plan required')
    expect(text).not.toContain('Expected Contacts')
    expect(text).not.toContain('Peak Required HC')
    expect(text).not.toContain('Portfolio Monthly Operating Plan')
    expect(text).not.toContain('Jan 2026')
    expect(text).not.toContain('Monthly Staffing Waterfall')
    expect(downloadButton).toBeUndefined()
    expect(setupButton).toBeTruthy()

    window.location.hash = ''
    await setupButton.trigger('click')
    expect(window.location.hash).toBe('#planning/center/center-1')
  })

  it('names excluded groups, scopes partial totals, and withholds mixed-scope variance', async () => {
    const plannedGroup = buildCenter().groups[0]
    const wrapper = buildWrapper({
      centers: [
        buildCenter({
          groups: [
            plannedGroup,
            {
              id: 'group-2',
              name: 'Email Support',
              actuals: {
                sourceMode: 'daily_upload',
                dailyRows: [{ serviceDate: '2026-01-05', contacts: 500, ahtSeconds: 420 }]
              },
              plans: []
            },
            {
              id: 'group-3',
              name: 'Chat Support',
              actuals: { sourceMode: 'daily_upload', dailyRows: [] },
              plans: [buildPlan({ id: 'budget-2025', planningYear: 2025 })]
            }
          ]
        })
      ]
    })
    const text = wrapper.text()

    expect(text).toContain('Partial current-plan coverage: 1 of 3 staffing groups')
    expect(text).toContain('Loaded actuals · 2 groups')
    expect(text).toContain('Review 2 excluded staffing groups')
    expect(text).toContain('Email Support — No plans saved for 2026 · Actuals loaded; requirement unavailable')
    expect(text).toContain('Chat Support — Only 2025 plan available')
    expect(text).toContain('Actual-versus-plan variance is withheld until every staffing group has a 2026 plan')
    expect(wrapper.get('[data-testid="portfolio-contact-variance-0"]').text()).toBe('-')
    expect(text).toContain('Full plan coverage required')
    expect(wrapper.findComponent({ name: 'PlanningPortfolioHeadcountChart' }).props('scopeDescription'))
      .toBe('Current-plan staffing totals include 1 of 3 staffing groups in 2026.')

    window.location.hash = ''
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Open Center').trigger('click')
    expect(window.location.hash).toBe('#planning/center/center-1')
  })

  it('passes staffing movement totals to the portfolio chart', () => {
    const wrapper = buildWrapper()
    const chart = wrapper.findComponent({ name: 'PlanningPortfolioHeadcountChart' })

    expect(chart.props('startingFrontlineTotals')).toHaveLength(12)
    expect(chart.props('frontlineAdditionTotals')).toHaveLength(12)
    expect(chart.props('hireTotals')).toHaveLength(12)
    expect(chart.props('attritionTotals')).toHaveLength(12)
  })

  it('shows call-center command rows with coverage, risk, and actions', () => {
    const wrapper = buildWrapper({
      centers: [
        buildCenter(),
        buildCenter({
          id: 'center-2',
          name: 'Back Office',
          groups: [
            {
              id: 'group-2',
              name: 'Cases',
              actuals: {
                sourceMode: 'daily_upload',
                dailyRows: []
              },
              plans: []
            }
          ]
        })
      ]
    })
    const text = wrapper.text()

    expect(text).toContain('North America Support')
    expect(text).toContain('Back Office')
    expect(text).toContain('Plan Gap')
    expect(text).toContain('1/1')
    expect(text).toContain('0/1')
    expect(text).toContain('Plan required')
    expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Open')).toBe(true)
  })

  it('does not render the removed attention panel', () => {
    const wrapper = buildWrapper({
      centers: [
        buildCenter({
          groups: [
            {
              id: 'group-1',
              name: 'Voice Support',
              actuals: {
                sourceMode: 'daily_upload',
                dailyRows: []
              },
              plans: []
            }
          ]
        })
      ]
    })

    expect(wrapper.text()).not.toContain('Attention')
    expect(wrapper.text()).not.toContain('Gaps and risks from existing portfolio data')
  })

  it('shows a practical empty state when no centers exist', () => {
    const wrapper = buildWrapper({
      centers: []
    })
    const text = wrapper.text()

    expect(text).toContain('Planning Portfolio')
    expect(text).toContain('Create the first call center')
    expect(text).toContain('Create a call center, add staffing groups')
    expect(text).not.toContain('Portfolio Monthly Operating Plan')
  })

  it('removes the old separate home sections', () => {
    const wrapper = buildWrapper()
    const text = wrapper.text()

    expect(text).not.toContain('All Call Centers')
    expect(text).not.toContain('Portfolio Annual Plan')
    expect(text).not.toContain('Planning Command Center')
  })
})
