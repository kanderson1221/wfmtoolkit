import { mount } from '@vue/test-utils'

import PlannerRandomTab from '../planner/PlannerRandomTab.vue'

const AppButtonStub = {
  name: 'AppButton',
  template: '<button><slot /></button>'
}

const AppSectionHeaderStub = {
  props: ['title'],
  template: '<h2>{{ title }}</h2>'
}

const AppTableNumberFieldStub = {
  props: ['modelValue'],
  template: '<input :value="modelValue" />'
}

const buildProps = (overrides = {}) => ({
  randomDefaults: {
    occupancyPercent: 90,
    adherencePercent: 95
  },
  randomMonths: [
    {
      occupancyPercent: 90,
      adherencePercent: 95
    }
  ],
  monthlyRecords: [
    {
      monthIndex: 0,
      label: 'Jan',
      fullLabel: 'January',
      scheduledPercent: 72.5,
      adherenceLossPercent: 3.6,
      occupancyLossPercent: 7.1,
      randomLossPercent: 10.7
    }
  ],
  summary: {
    usesMonthlyOverrides: false,
    globalOccupancyPercent: 90,
    globalAdherencePercent: 95,
    averageOccupancyPercent: 90,
    averageAdherencePercent: 95,
    averageAdherenceLossPercent: 3.6,
    averageOccupancyLossPercent: 7.1,
    averageRandomLossPercent: 10.7
  },
  formatPercent: (value) => `${Number(value ?? 0).toFixed(1)}%`,
  ...overrides
})

describe('PlannerRandomTab', () => {
  it('shows the updated assumptions heading and hides monthly overrides when override mode is off', () => {
    const wrapper = mount(PlannerRandomTab, {
      props: buildProps(),
      global: {
        stubs: {
          AppButton: AppButtonStub,
          AppCheckbox: true,
          AppFieldGroup: true,
          AppNumberField: true,
          AppSectionHeader: AppSectionHeaderStub,
          AppStatStrip: true,
          AppTableNumberField: AppTableNumberFieldStub,
          PlannerCopyMenu: true
        }
      }
    })

    expect(wrapper.text()).toContain('Random/Variability')
    expect(wrapper.text()).toContain('Assumptions')
    expect(wrapper.text()).not.toContain('Random/Variability Assumptions')
    expect(wrapper.text()).not.toContain('Monthly Overrides')
    expect(wrapper.text()).not.toContain('Variability Buffer')
    expect(wrapper.text()).toContain('Continue to Demand Model')
    expect(wrapper.text()).not.toContain('Continue to Required Headcount')
  })

  it('shows the monthly overrides heading when override mode is on', () => {
    const wrapper = mount(PlannerRandomTab, {
      props: buildProps({
        useMonthlyRandomOverrides: true,
        summary: {
          usesMonthlyOverrides: true,
          globalOccupancyPercent: 90,
          globalAdherencePercent: 95,
          averageOccupancyPercent: 90,
          averageAdherencePercent: 95,
          averageAdherenceLossPercent: 3.6,
          averageOccupancyLossPercent: 7.1,
          averageRandomLossPercent: 10.7
        }
      }),
      global: {
        stubs: {
          AppButton: AppButtonStub,
          AppCheckbox: true,
          AppFieldGroup: true,
          AppNumberField: true,
          AppSectionHeader: AppSectionHeaderStub,
          AppStatStrip: true,
          AppTableNumberField: AppTableNumberFieldStub,
          PlannerCopyMenu: true
        }
      }
    })

    expect(wrapper.text()).toContain('Monthly Overrides')
  })
})
