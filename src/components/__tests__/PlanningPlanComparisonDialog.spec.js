import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import PlanningPlanComparisonDialog from '../planning/PlanningPlanComparisonDialog.vue'

const AppDialogStub = {
  props: ['visible'],
  emits: ['update:visible', 'close'],
  template: '<section v-if="visible"><slot /><slot name="footer" /></section>'
}

const AppButtonStub = {
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
}

const buildPlan = (overrides = {}) => ({
  id: 'budget-2027',
  name: '2027 Budget',
  planningYear: 2027,
  planType: 'budget',
  requirementMethod: 'workload_ratio',
  operatingWeekdays: [1, 2, 3, 4, 5],
  presenceMonths: Array.from({ length: 12 }, () => ({ paidHoursPerDay: 8 })),
  randomDefaults: { occupancyPercent: 90, adherencePercent: 95 },
  planMonths: Array.from({ length: 12 }, () => ({
    contacts: 1000,
    ahtSeconds: 360,
    peakDayUpliftPercent: 0
  })),
  startingHeadcount: 10,
  startingFrontlineHeadcount: 10,
  staffingMonths: Array.from({ length: 12 }, () => ({ frontlineAttritionHeadcount: 0 })),
  trainingClasses: [],
  trainingSettings: {},
  ...overrides
})

const buildWrapper = (candidateOverrides = {}, budgetOverrides = {}) => {
  const budget = buildPlan(budgetOverrides)
  const update = buildPlan({
    id: 'update-2027-03',
    name: '2027 March Update',
    planType: 'update',
    isCurrent: true,
    actualsThroughMonth: '2027-02-01',
    decisionReason: 'February actuals and revised spring outlook',
    randomDefaults: { occupancyPercent: 85, adherencePercent: 95 },
    planMonths: Array.from({ length: 12 }, (_, index) => ({
      contacts: index === 2 ? 1250 : 1000,
      ahtSeconds: 360,
      peakDayUpliftPercent: 0
    })),
    ...candidateOverrides
  })

  return mount(PlanningPlanComparisonDialog, {
    props: {
      visible: true,
      center: {
        operatingWeekdays: [1, 2, 3, 4, 5],
        holidayCalendarId: 'none',
        customHolidays: []
      },
      groupName: 'Voice Support',
      section: {
        planningYear: 2027,
        rows: [budget, update]
      }
    },
    global: {
      stubs: {
        AppButton: AppButtonStub,
        AppDialog: AppDialogStub,
        AppEmptyState: {
          props: ['title', 'description'],
          template: '<div>{{ title }} {{ description }}</div>'
        },
        AppStatusMessage: {
          template: '<div role="status"><slot /></div>'
        },
        AppTableShell: {
          template: '<div><slot /></div>'
        }
      }
    }
  })
}

describe('PlanningPlanComparisonDialog', () => {
  it('defaults to Budget versus current Update and names changed assumptions and monthly exceptions', () => {
    const wrapper = buildWrapper()
    const selects = wrapper.findAll('select')

    expect(selects).toHaveLength(2)
    expect(selects[0].element.value).toBe('budget-2027')
    expect(selects[1].element.value).toBe('update-2027-03')
    expect(selects[0].attributes()).toHaveProperty('autofocus')
    expect(wrapper.text()).toContain('Annual outcomes')
    expect(wrapper.text()).toContain('Annual contacts')
    expect(wrapper.text()).toContain('+250')
    expect(wrapper.text()).not.toContain('Average occupancy')
    expect(wrapper.text()).toContain('Decision reason')
    expect(wrapper.text()).toContain('February actuals and revised spring outlook')
    expect(wrapper.text()).toContain('Changed')
    expect(wrapper.text()).toContain('Monthly exceptions')
    expect(wrapper.text()).toContain('March')
    expect(wrapper.text()).toContain('Contacts +250 contacts')
    expect(wrapper.text()).toContain('Occupancy -5.0 pts')
    expect(wrapper.text()).toContain('Peak-day required HC change')
    expect(wrapper.text()).toContain('Average opening staffing gap')
    expect(wrapper.text()).toContain('Average ending staffing gap')
    expect(wrapper.text()).toContain('Opening gap change')
    expect(wrapper.text()).toContain('Ending gap change')
  })

  it('surfaces offsetting monthly capacity changes that an annual average would hide', () => {
    const wrapper = buildWrapper({
      randomDefaults: { occupancyPercent: 90, adherencePercent: 95 },
      presenceMonths: Array.from({ length: 12 }, (_, index) => ({
        paidHoursPerDay: index === 0 ? 7 : index === 1 ? 9 : 8
      })),
      planMonths: Array.from({ length: 12 }, () => ({
        contacts: 1000,
        ahtSeconds: 360,
        peakDayUpliftPercent: 0
      }))
    })

    expect(wrapper.text()).toContain('January')
    expect(wrapper.text()).toContain('Shift paid hours -1.00 hr/day')
    expect(wrapper.text()).toContain('February')
    expect(wrapper.text()).toContain('Shift paid hours +1.00 hr/day')
  })

  it('explains incompatible methods instead of presenting false requirement deltas', () => {
    const wrapper = buildWrapper({ requirementMethod: 'intraday_erlang' })

    expect(wrapper.text()).toContain('Requirement methods differ')
    expect(wrapper.text()).toContain('Not comparable')
  })

  it('warns and withholds requirement comparisons when Erlang results need recalculation', () => {
    const erlangInputs = {
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
      demandSource: {
        mode: 'forecast',
        forecastDailySnapshot: [
          { serviceDate: '2027-01-04', monthIndex: 0, contacts: 100, ahtSeconds: 300 }
        ],
        forecastMonthSnapshot: [
          { monthIndex: 0, monthLabel: 'Jan 2027', contacts: 100, ahtSeconds: 300 }
        ]
      }
    }
    const wrapper = buildWrapper(erlangInputs, erlangInputs)

    expect(wrapper.text()).toContain('Requirement and staffing-gap values are unavailable')
    expect(wrapper.text()).toContain('Run staffing calculations')
    expect(wrapper.text()).toContain('Unavailable')
    expect(wrapper.text()).not.toContain('Not comparable')
  })

  it('downloads the exact 12-month comparison through the shared CSV utility', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:plan-comparison')
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = buildWrapper()

    await wrapper.findAll('button').find((button) => button.text().includes('Download Comparison CSV')).trigger('click')

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:plan-comparison')
    expect(clickSpy).toHaveBeenCalledOnce()
    clickSpy.mockRestore()
  })
})
